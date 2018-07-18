 //check for global variable here
if (sessionStorage.getItem("global_index") != null) {
  console.log("work");
    document.getElementById("image_panel1").style.visibility = "visible";
    document.getElementById("image_panel2").style.visibility = "visible";
    document.getElementById("image_panel3").style.visibility = "visible";
  }
 document.getElementById("button-image").addEventListener("click", function(){
 	//console.log(document.getElementById("image_panel1").style.display);
    document.getElementById("image_panel1").style.visibility = "visible";
    document.getElementById("image_panel2").style.visibility = "visible";
    document.getElementById("image_panel3").style.visibility = "visible";
  });
  document.getElementById("file_select").addEventListener("click", function(){
 	//console.log(document.getElementById("image_panel1").style.display);
    document.getElementById("button-image").style.visibility = "visible";
    //console.log(document.getElementById("image_panel1").style.display);
  });

  document.getElementById("image_panel1").addEventListener("click", function(){
  	sessionStorage.setItem("global_index", 0);
  });

  document.getElementById("image_panel2").addEventListener("click", function(){
  	sessionStorage.setItem("global_index", 1);
  });

  document.getElementById("image_panel3").addEventListener("click", function(){
    sessionStorage.setItem("global_index", 2);
  });