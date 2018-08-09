/* ============ */
/* HOPSCOTCH TOUR */
/* ============ */

var tour = {
  id: 'f',
  steps: [
    {
      target: 'leftsidebar',
      title: 'Create and select a class',
      placement: 'bottom',
      arrowOffset: 50
    },

      {target: 'main_container',
      title: 'After you select a class and draw a box over the region you want to label',
      placement: 'top',
      xOffset: 450,
      arrowOffset: 240
    }
  ],
  showPrevButton: true,
  
},

/* ========== */
/* TOUR SETUP */
/* ========== */

init = function() {

  if (sessionStorage.getItem("hop") == null){
    hopscotch.startTour(tour);
    sessionStorage.setItem("hop",true);
  }
};

init();


