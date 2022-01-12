/* eslint-disable no-unused-vars */
import { templates, select, settings, classNames } from './../settings.js';
import AmountWidget from './AmountWidget.js';
import utils from '../utils.js';
import DatePicker from './DatePicker.js';
import HourPicker from './HourPicker.js';

class Booking {
  constructor(bookingWidget) {
    const thisBooking = this;

    thisBooking.selectedTable = null;

    thisBooking.render(bookingWidget);
    thisBooking.initWidgets();
    thisBooking.getData();
  }


  render(bookingWidget) {
    const thisBooking = this;
    const generatedHTML = templates.bookingWidget();

    thisBooking.dom = {};
    thisBooking.dom.wrapper =bookingWidget;

    thisBooking.dom.wrapper.innerHTML = generatedHTML;
    thisBooking.dom.peopleAmount = thisBooking.dom.wrapper.querySelector(select.booking.peopleAmount);
    thisBooking.dom.hoursAmount = thisBooking.dom.wrapper.querySelector(select.booking.hoursAmount);
    thisBooking.dom.datePicker = thisBooking.dom.wrapper.querySelector(select.widgets.datePicker.wrapper);
    thisBooking.dom.hourPicker = thisBooking.dom.wrapper.querySelector(select.widgets.hourPicker.wrapper);
  
    thisBooking.dom.tables = thisBooking.dom.wrapper.querySelectorAll(select.booking.tables);
    thisBooking.dom.floorPlan = thisBooking.dom.wrapper.querySelector(select.booking.floorPlan);
    thisBooking.dom.form = thisBooking.dom.wrapper.querySelector(select.booking.form);
    thisBooking.dom.phone = thisBooking.dom.wrapper.querySelector(select.booking.phone);
    thisBooking.dom.address = thisBooking.dom.wrapper.querySelector(select.booking.address);
    thisBooking.dom.starters = thisBooking.dom.wrapper.querySelectorAll(select.booking.starters);
  
  }

  initTables(table){
    const thisBooking = this;

    const isTable = table.classList.contains('table');
    const isTableBooked = table.classList.contains(classNames.booking.tableBooked);
    const isTableSelected = table.classList.contains(classNames.booking.tableSelected);

    if(isTable && !isTableBooked){

      if(!isTableSelected){
        thisBooking.resetTables();
        thisBooking.selectedTable = null;
        table.classList.add(classNames.booking.tableSelected);
        thisBooking.selectedTable = parseInt(table.getAttribute('data-table'));
      } else {
        table.classList.remove(classNames.booking.tableSelected);
        thisBooking.selectedTable = null;
      }
      
    } else if(isTableBooked){
      window.alert('This table is already booked');
    }

  }
  resetTables(){
    const selectedTables = document.querySelectorAll(select.all.selectedTables);

    for(let table of selectedTables){
      table.classList.remove(classNames.booking.tableSelected);
    }

  }

  sendBooking(){
    const thisBooking = this;

    const url = settings.db.url + '/' + settings.db.booking;
  
    const payload = {
      date: thisBooking.datePicker.value ,
      hour: thisBooking.hourPicker.value,
      table: thisBooking.selectedTable,
      duration: thisBooking.hoursAmount.value,
      ppl: thisBooking.peopleAmount.value,
      starters: [],
      phone: thisBooking.dom.phone.value,
      address: thisBooking.dom.address.value,
    };

    for(let starter of thisBooking.dom.starters){
      if(starter.checked){
        payload.starters.push(starter.value);
      }
    }
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    fetch(url, options)
      .then(function(response){
        thisBooking.makeBooked(thisBooking.datePicker.value, thisBooking.hourPicker.value, thisBooking.hoursAmount.value, thisBooking.selectedTable);
        return response.json();
      });
  
  }



  initWidgets() {
    const thisBooking = this;

    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);

    thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
    thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);
  

    thisBooking.dom.wrapper.addEventListener('updated', function(){
      thisBooking.updateDOM();
    });
    thisBooking.dom.floorPlan.addEventListener('click', function(event){
      event.preventDefault();

      const table = event.target;
      thisBooking.initTables(table);
    });

    thisBooking.dom.form.addEventListener('submit', function(event){
      event.preventDefault();

      thisBooking.sendBooking();
    });
  }


  getData() {
    const thisBooking = this;

    const startDateParam = settings.db.dateStartParamKey + '=' + utils.dateToStr(thisBooking.datePicker.minDate);
    const endDateParam = settings.db.dateEndParamKey + '=' + utils.dateToStr(thisBooking.datePicker.maxDate);

    const params = {
      booking: [
        startDateParam,
        endDateParam,
      ],
      eventsCurrent:[
        settings.db.notRepeatParam,
        startDateParam,
        endDateParam,
      ],
      eventsRepeat:[
        settings.db.repeatParam,
        endDateParam,
      ],
    };
  
    //console.log('getData params:' , params);

    const urls = {
      booking:      settings.db.url + '/' + settings.db.booking 
                                    + '?' +  params.booking.join('&'),
      eventsCurrent:settings.db.url + '/' + settings.db.event
                                    + '?' +  params.eventsCurrent.join('&'),
      eventsRepeat: settings.db.url + '/' + settings.db.event 
                                    + '?' +   params.eventsRepeat.join('&'),
    };  // console.log('urls:', urls);

    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
      
    ])
      .then(function(allResponses){
        const bookingsResponse = allResponses[0];
        const eventsCurrentResponse = allResponses[1];
        const eventsRepeatResponse = allResponses[2];
        
        return Promise.all([
          bookingsResponse.json(),
          eventsCurrentResponse.json(),
          eventsRepeatResponse.json(),
        ]);
      })

      .then(function([bookings, eventsCurrent, eventsRepeat]){
        //console.log(bookings);
        //console.log( eventsCurrent);
        //console.log(eventsRepeat);
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });     
  }

  parseData(bookings, eventsCurrent, eventsRepeat){
    const thisBooking = this;

    thisBooking.booked = {};

    for(let item of bookings){
      thisBooking.makedBooked(item.date, item.hour, item.duration, item.table);
    }
    for(let item of eventsCurrent){
      thisBooking.makedBooked(item.date, item.hour, item.duration, item.table);
    }

    const minDate = thisBooking.datePicker.minDate;
    const maxDate = thisBooking.datePicker.maxDate;

    for(let item of eventsRepeat){
      if(item.repeat == 'daily'){
        for(let loopDate = minDate; loopDate <= maxDate; loopDate = utils.addDays(loopDate, 1))

          thisBooking.makedBooked(utils.dateToStr(loopDate), item.hour, item.duration, item.table);       
      }
    }
    //console.log('thisBooking.booked:', thisBooking.booked);
    thisBooking.updateDOM();
  }

  makedBooked(date, hour, duration, table){
    const thisBooking = this;

    if(typeof thisBooking.booked[date] === 'undefined' ){
      thisBooking.booked[date] = {};
    }

    const startHour = utils.hourToNumber(hour);

    
    for(let hourBlock = startHour; hourBlock < startHour + duration; hourBlock += 0.5){
      //console.log('loop:', hourBlock);
    
      if(typeof thisBooking.booked[date][hourBlock] === 'undefined' ){
        thisBooking.booked[date][hourBlock] = [];
      }

      thisBooking.booked[date][hourBlock].push(table);
    }
  }


  updateDOM(){
    const thisBooking = this;

    thisBooking.date = thisBooking.datePicker.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);

    let allAvailable = false;

    if(
      typeof thisBooking.booked[thisBooking.date] === 'undefined'
      ||
      typeof thisBooking.booked[thisBooking.date][thisBooking.hour] === 'undefined'
    ){
      allAvailable = true;
    }

    for (let table of thisBooking.dom.tables){
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);
      if(!isNaN(tableId)){
        tableId = parseInt(tableId);
      }

      if(
        !allAvailable
        &&
        thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId)
      ){
        table.classList.add(classNames.booking.tableBooked);
      } else {
        table.classList.remove(classNames.booking.tableBooked);
      }
    }
  }



}



export default Booking;