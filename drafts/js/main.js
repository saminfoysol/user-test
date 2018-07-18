 document.getElementById("button-image").addEventListener("click", function(){
 	//console.log(document.getElementById("image_panel1").style.display);
    document.getElementById("image_panel1").style.visibility = "visible";
    document.getElementById("image_panel2").style.visibility = "visible";
    //console.log(document.getElementById("image_panel1").style.display);
  });
  document.getElementById("file_select").addEventListener("click", function(){
 	//console.log(document.getElementById("image_panel1").style.display);
    document.getElementById("button-image").style.visibility = "visible";
    //console.log(document.getElementById("image_panel1").style.display);
  });