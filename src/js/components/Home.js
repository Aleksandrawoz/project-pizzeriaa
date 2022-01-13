import { templates } from './../settings.js';

class Home {
  constructor(homeWrapper){
    const thisHome = this;

    thisHome.render(homeWrapper);
    thisHome.initCarousel();
  }

  render(homeWrapper){
    const thisHome = this;
    

    thisHome.dom = {};
    thisHome.dom.wrapper= homeWrapper;

    const generatedHTML = templates.homePage();
    thisHome.dom.wrapper.innerHTML = generatedHTML;
  }

  initCarousel(){
    const elem = document.querySelector('.main-carousel');

    // eslint-disable-next-line no-undef
    new Flickity( elem, {

      // options
      cellAlign :'left',
      contain: true,
      
     

    });

  } 

}
export default Home;