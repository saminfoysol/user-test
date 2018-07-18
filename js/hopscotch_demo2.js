/* globals hopscotch: false */

/* ============ */
/* EXAMPLE TOUR */
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
      title: 'After you select a class drag over the region you want to label',
      placement: 'top',
      xOffset: 650,
      arrowOffset: 240
    }
  ],
  showPrevButton: true,
  
},

/* ========== */
/* TOUR SETUP */
/* ========== */
/*addClickListener = function(el, fn) {
  if (el.addEventListener) {
    el.addEventListener('click', fn, false);
  }
  else {
    el.attachEvent('onclick', fn);
  }
},*/

init = function() {

  if (sessionStorage.getItem("hop") == null){

  //var startBtnId = 'image_init',
      //calloutId = 'startTourCallout',
      //mgr = hopscotch.getCalloutManager(),
      //state = hopscotch.getState();

  //if (state && state.indexOf('hello-hopscotch:') === 0) {
    // Already started the tour at some point!
    hopscotch.startTour(tour);
    sessionStorage.setItem("hop",true);
  }

  //}
  /*else {
    // Looking at the page for the first(?) time.
    setTimeout(function() {
      mgr.createCallout({
        id: calloutId,
        target: startBtnId,
        placement: 'right',
        title: 'Take an example tour',
        content: 'Start by taking an example tour to see Hopscotch in action!',
        yOffset: -25,
        arrowOffset: 20,
        width: 240
      });
    }, 100);
  }*/
  /*addClickListener(document.getElementById(startBtnId), function() {
    console.log("anything");
    //if (!hopscotch.isActive) {
      //mgr.removeAllCallouts();
      hopscotch.endTour(tour);
      hopscotch.startTour(stour2);
    //}
  });*/


};

init();


