/*
  VGG Image Annotator (via)
  www.robots.ox.ac.uk/~vgg/software/via/

  Copyright (c) 2016, Abhishek Dutta.
  All rights reserved.

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

  Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.
  Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.
  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
  LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
  CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
  SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
  INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
  CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
  POSSIBILITY OF SUCH DAMAGE.
*/

//SAMIN there's a lot of unobtrusive javascript in this tool in general. At the end I'd like to 
//attempt to get rid of this. It seems kind of tedious but probably not very difficult.


function _via_load_submodules() {
    start_demo_session();
}

function start_demo_session() {
    var demo_img_base64_data = [];
    demo_img_base64_data[0] = new ImageMetadata('', 'cars.png', 62201);
    demo_img_base64_data[1] = new ImageMetadata('', 'lot.jpeg', 71862);
    demo_img_base64_data[2] = new ImageMetadata('', 'outside.jpeg', 21513);

    var img_order = [0,1,2];
    //alter the order depending on our global index
    //7/5
    if (sessionStorage.getItem("global_index") == 0){
      img_order = [0,1,2];
    }
    if (sessionStorage.getItem("global_index") == 1){
      img_order = [1,0,2];
    }
    if (sessionStorage.getItem("global_index") == 2){
      img_order = [2,0,1];
    }

    
  for (var i=0; i<demo_img_base64_data.length; ++i) {
  //7/5 we can set the image id here from a local browser element from the previous page
  var idx = img_order[i];
  demo_img_base64_data[idx].base64_img_data = demo_images[idx];
  var filename = demo_img_base64_data[idx].filename;
  var size = demo_img_base64_data[idx].size;
  var img_id = _via_get_image_id(filename, size);

  _via_img_metadata[img_id] = demo_img_base64_data[idx];
  _via_image_id_list.push(img_id);
  _via_img_count += 1;
  _via_reload_img_table = true;
    }

    _via_image_index = 0;
    import_annotations_from_json(demo_region_data);
}


var demo_images = [];

var demo_region_data = '{"cars.png62201":{"fileref":"","size":62201,"filename":"cars.png","base64_img_data":"","file_attributes":{"regions":{"region_attributes":{}}}},"lot.jpeg71862":{"fileref":"","size":71862,"filename":"lot.jpeg","base64_img_data":"","file_attributes":{"regions":{"region_attributes":{}}}},"outside.jpeg21513":{"fileref":"","size":21513,"filename":"outside.jpeg","base64_img_data":"","file_attributes":{"regions":{"region_attributes":{}}}}}';

demo_images.push('cars.png');
demo_images.push('lot.jpeg');
demo_images.push('outside.jpeg');