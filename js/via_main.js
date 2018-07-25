/*
  VGG Image Annotator (via)
  www.robots.ox.ac.uk/~vgg/software/via/

  Copyright (c) 2016-2018, Abhishek Dutta, Visual Geometry Group, Oxford University.
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

/*
  See Contributors.md file for a list of developers who have contributed code 
  to VIA codebase.
/*

  This source code is organized in the following groups:

  - Data structure for annotations
  - Initialization routine
  - Handlers for top navigation bar
  - Local file uploaders
  - Data Importer
  - Data Exporter
  - Maintainers of user interface
  - Image click handlers
  - Canvas update routines
  - Region collision routines
  - Shortcut key handlers
  - Persistence of annotation data in browser cache (i.e. localStorage)
  - Handlers for attributes input panel (spreadsheet like user input panel)

  See [Source code documentation](https://gitlab.com/vgg/via/blob/develop/CodeDoc.md)
  and [Contributing Guidelines](https://gitlab.com/vgg/via/blob/develop/CONTRIBUTING.md)
  for more details.

*/

"use strict";

var info;
var VIA_VERSION      = '1.0.5';
var VIA_NAME         = 'VGG Image Annotator';
var VIA_SHORT_NAME   = 'VIA';

//SAMIN added a none class
var VIA_REGION_SHAPE = { NONE:'none',
                         RECT:'rect',
                         CIRCLE:'circle',
                         ELLIPSE:'ellipse',
                         POLYGON:'polygon',
                         POINT:'point'};

var VIA_REGION_EDGE_TOL           = 5;   // pixel
var VIA_REGION_CONTROL_POINT_SIZE = 2;
var VIA_REGION_POINT_RADIUS       = 3;
var VIA_POLYGON_VERTEX_MATCH_TOL  = 5;
var VIA_REGION_MIN_DIM            = 3;
var VIA_MOUSE_CLICK_TOL           = 2;
var VIA_ELLIPSE_EDGE_TOL          = 0.2; // euclidean distance
var VIA_THETA_TOL                 = Math.PI/18; // 10 degrees
var VIA_POLYGON_RESIZE_VERTEX_OFFSET    = 100;
var VIA_CANVAS_DEFAULT_ZOOM_LEVEL_INDEX = 3;
var VIA_CANVAS_ZOOM_LEVELS = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 4, 5];

var VIA_THEME_REGION_BOUNDARY_WIDTH = 9;
var VIA_THEME_BOUNDARY_LINE_COLOR   = "#3FD4BA";
var VIA_THEME_BOUNDARY_FILL_COLOR   = "#3FD4BA";
var VIA_THEME_SEL_REGION_FILL_COLOR = "transparent";
var VIA_THEME_SEL_REGION_FILL_BOUNDARY_COLOR = "#F21890";
var VIA_THEME_SEL_REGION_OPACITY    = 0.5;
var VIA_THEME_MESSAGE_TIMEOUT_MS    = 2500;
var VIA_THEME_ATTRIBUTE_VALUE_FONT  = '10pt Sans';
var VIA_THEME_CONTROL_POINT_COLOR   = 'black';

var VIA_CSV_SEP        = ',';
var VIA_CSV_QUOTE_CHAR = '"';
var VIA_CSV_KEYVAL_SEP = ':';
var VIA_IMPORT_CSV_COMMENT_CHAR = '#';

var _via_img_metadata = {};   // data structure to store loaded images metadata
var _via_img_count    = 0;    // count of the loaded images
var _via_canvas_regions = []; // image regions spec. in canvas space
var _via_canvas_scale   = 1.0;// current scale of canvas image

var _via_image_id_list  = []; // array of image id (in original order)
var _via_image_id       = ''; // id={filename+length} of current image
var _via_image_index    = -1; // index

var _via_current_image_filename;
var _via_current_image;
var _via_current_image_width;
var _via_current_image_height;

// image canvas
var _via_img_canvas = document.getElementById("image_canvas");
var _via_img_ctx    = _via_img_canvas.getContext("2d");
var _via_reg_canvas = document.getElementById("region_canvas");
var _via_reg_ctx    = _via_reg_canvas.getContext("2d");
var _via_canvas_width, _via_canvas_height;

// canvas zoom
var _via_canvas_zoom_level_index   = VIA_CANVAS_DEFAULT_ZOOM_LEVEL_INDEX; // 1.0
var _via_canvas_scale_without_zoom = 1.0;

// state of the application
var _via_is_user_drawing_region  = false;
var _via_current_image_loaded    = false;
var _via_is_window_resized       = false;
var _via_is_user_resizing_region = false;
var _via_is_user_moving_region   = false;
var _via_is_user_drawing_polygon = false;
var _via_is_region_selected      = false;
var _via_is_all_region_selected  = false;
var _via_is_user_updating_attribute_name  = false;
var _via_is_user_updating_attribute_value = false;
var _via_is_user_adding_attribute_name    = false;
var _via_is_loaded_img_list_visible  = false;
//SAMIN 7/18 color array for rotation
var _via_color_array = ["#3FD4BA","#fd00ff","#6dd8dd","#ff0202","#f67c00","#ffb7d5"];
//SAMIN trying to get rid of panel
//var _via_is_attributes_panel_visible = false;
//var _via_is_reg_attr_panel_visible   = false;
//var _via_is_file_attr_panel_visible  = false;
var _via_is_canvas_zoomed            = false;
var _via_is_loading_current_image    = false;
var _via_is_region_id_visible        = false;
var _via_is_region_boundary_visible  = true;
var _via_is_ctrl_pressed             = false;

// region
//SAMIN initialized start shape as none so user can't draw until they pick a class
//SAMIN 7/9 back to rect so we can better deal with debugging
var _via_current_shape             = VIA_REGION_SHAPE.RECT;
var _via_current_polygon_region_id = -1;
var _via_user_sel_region_id        = -1;
var _via_click_x0 = 0; var _via_click_y0 = 0;
var _via_click_x1 = 0; var _via_click_y1 = 0;
var _via_region_click_x, _via_region_click_y;
var _via_copied_image_regions = [];
var _via_region_edge          = [-1, -1];
var _via_current_x = 0; var _via_current_y = 0;

var _via_changing_class = false;
var _via_names_shown = false;


// message
var _via_message_clear_timer;

//7/2 SAMIN to save data
//7/6 ZOOM edge cases
var _via_first_load = true;

// attributes
//SAMIN added set of the class names
//7/23
var _via_enter_key = false;
var _via_class_names = new Map();
var _via_region_attributes             = {};
var _via_current_update_attribute_name = "";
var _via_current_update_region_id      = -1;
var _via_file_attributes               = {};
var _via_visible_attr_name             = '';

// persistence to local storage
var _via_is_local_storage_available = false;
var _via_is_save_ongoing = false;

// image list
var _via_reload_img_table = true;
var _via_loaded_img_fn_list = [];
var _via_loaded_img_region_attr_miss_count = [];
var _via_loaded_img_file_attr_miss_count = [];
var _via_loaded_img_table_html = [];


// UI html elements
var invisible_file_input = document.getElementById("invisible_file_input");
var image_panel  = document.getElementById("image_panel");
var ui_top_panel = document.getElementById("ui_top_panel");
var canvas_panel = document.getElementById("canvas_panel");

var annotation_list_snippet = document.getElementById("annotation_list_snippet");
var annotation_textarea     = document.getElementById("annotation_textarea");

var loaded_img_list_panel = document.getElementById('loaded_img_list_panel');
//var attributes_panel      = document.getElementById('attributes_panel');
var annotation_data_window;

var BBOX_LINE_WIDTH       = 4;
var BBOX_SELECTED_OPACITY = 0.3;
var BBOX_BOUNDARY_FILL_COLOR_ANNOTATED = "#f2f2f2";
var BBOX_BOUNDARY_FILL_COLOR_NEW       = "#aaeeff";
var BBOX_BOUNDARY_LINE_COLOR           = "#1a1a1a";
var BBOX_SELECTED_FILL_COLOR           = "#ffffff";

//
// Data structure for annotations
//
function ImageMetadata(fileref, filename, size) {
  this.filename = filename;
  this.size     = size;
  this.fileref  = fileref;          // image url or local file ref.
  this.regions  = [];
  this.file_attributes = {};        // image attributes
  this.base64_img_data = '';        // image data stored as base 64
}

function ImageRegion() {
  this.is_user_selected  = false;
  this.shape_attributes  = {}; // region shape attributes
  this.region_attributes = {}; // region attributes
}


//
// Initialization routine
//
function _via_init() {
  
  show_home_panel();
  //SAMIN place event handlers here to avoid inline js
  document.getElementById("sel_local_images").addEventListener("click", function(){
    sel_local_images();

  });
  document.getElementById("prev_button").addEventListener("click", function(){
    move_to_prev_image();
    if (_via_image_id == "cars.png62201"){
      document.getElementById("image_name").innerHTML = "outside.jpeg";
    }
    if (_via_image_id == "lot.jpeg71862"){
      document.getElementById("image_name").innerHTML = "cars.png";
    }
    if (_via_image_id == "outside.jpeg21513"){
      document.getElementById("image_name").innerHTML = "lot.jpeg";
    }
    
    //code for showing the names of the images
  });
  document.getElementById("next_button").addEventListener("click", function(){
    move_to_next_image();
    console.log(_via_image_id);
    console.log(document.getElementById("image_name").innerHTML);
    if (_via_image_id == "cars.png62201"){
      document.getElementById("image_name").innerHTML = "lot.jpeg";
    }
    if (_via_image_id == "lot.jpeg71862"){
      document.getElementById("image_name").innerHTML = "outside.jpeg";
    }
    if (_via_image_id == "outside.jpeg21513"){
      document.getElementById("image_name").innerHTML = "cars.png";
    }
    //code for showing the name of the images
  });
  document.getElementById("toolbar_zoom_out").addEventListener("click", function(){
    zoom_out();
    if (document.getElementById("toolbar_zoom_out").style.backgroundColor != "#e5e5e5"){
      document.getElementById("toolbar_zoom_out").style.backgroundColor = "#e5e5e5";
      document.getElementById("toolbar_zoom_in").style.backgroundColor = "transparent";
    }
  });
  document.getElementById("toolbar_zoom_in").addEventListener("click", function(){
    zoom_in();
    if (document.getElementById("toolbar_zoom_in").style.backgroundColor != "#e5e5e5"){
      document.getElementById("toolbar_zoom_in").style.backgroundColor = "#e5e5e5";
      document.getElementById("toolbar_zoom_out").style.backgroundColor = "transparent";
    }
  });

  document.getElementById("toolbar_name_all_region").addEventListener("click", function(){
    toggle_region_id_visibility();
    if (_via_names_shown){
      _via_names_shown = false;
      document.getElementById("toolbar_name_all_region").style.backgroundColor = "transparent";

    }
    else{
      _via_names_shown = true;
      document.getElementById("toolbar_name_all_region").style.backgroundColor = "#e5e5e5";
    }  
  });

  document.getElementById("toolbar_download_csv").addEventListener("click", function(){
    download_all_region_data('csv');
  });

  document.getElementById("toolbar_deletion").addEventListener("click", function(){
    del_sel_regions();
  });

  //7/23
  document.getElementById("add_class").addEventListener("blur", function(){
    turnOnShortcuts();
    _via_enter_key = false;
  });

  document.getElementById("add_class").addEventListener("focus", function(){
    _via_enter_key = true;
    _via_is_user_updating_attribute_value=true;
  });

  document.getElementById("submit_add").addEventListener("click", function(){
    addClass(document.getElementById('add_class').value);
  });

  document.getElementById("save_button").addEventListener("click", function(){
    //7/5 Samin edit the metadata to reflect accurate color changes
    for (var x in _via_img_metadata){
      for (var i = 0; i < _via_img_metadata[x].regions.length; i++){
        _via_img_metadata[x].regions[i].region_attributes["color"] = _via_class_names.get(_via_img_metadata[x].regions[i].region_attributes["name"])[1];
    //add metadata info to map
    
      }
    }
    sessionStorage.setItem("page_data", JSON.stringify(_via_img_metadata));
  });

  document.getElementById("modal-closer-1").addEventListener("click", function(){
    document.getElementById("modal-1").classList.remove("is-visible");
  });

  document.getElementById("modal-closer-2").addEventListener("click", function(){
    document.getElementById("modal-1").classList.remove("is-visible");
  });

  _via_is_local_storage_available = check_local_storage();
  if (_via_is_local_storage_available) {
    if (is_via_data_in_localStorage()) {
      show_localStorage_recovery_options();
    }
  }

  // run attached sub-modules (if any)
  if (typeof _via_load_submodules === 'function') {
    setTimeout(function() {
      _via_load_submodules();
    }, 100);
  }
}
//
// Handlers for top navigation bar
//
function show_home_panel() {
  if (_via_current_image_loaded) {
    show_all_canvas();
    set_all_text_panel_display('none');
  } 
}

function sel_local_images() {
  // source: https://developer.mozilla.org/en-US/docs/Using_files_from_web_applications
  if (invisible_file_input) {
    console.log(invisible_file_input);
    invisible_file_input.accept   = '.jpg,.jpeg,.png,.bmp';
    invisible_file_input.onchange = store_local_img_ref;
    invisible_file_input.click();

  }
}
function download_all_region_data(type) {
  // Javascript strings (DOMString) is automatically converted to utf-8
  // see: https://developer.mozilla.org/en-US/docs/Web/API/Blob/Blob
  var all_region_data = pack_via_metadata(type);
  var blob_attr = {type: 'text/'+type+';charset=utf-8'};
  var all_region_data_blob = new Blob(all_region_data, blob_attr);

  if ( all_region_data_blob.size > (2*1024*1024) &&
       type === 'csv' ) {

  } else {
    save_data_to_local_file(all_region_data_blob, 'via_region_data.'+type);
  }
}

function sel_local_data_file(type) {
  if (invisible_file_input) {
    invisible_file_input.accept='.csv,.json';
    switch(type) {
    case 'annotations':
      invisible_file_input.onchange = import_annotations_from_file;
      break;

    case 'attributes':
      invisible_file_input.onchange = import_attributes_from_file;
      break;

    default:
      return;
    }
    invisible_file_input.click();
  }
}
function import_attributes() {
  if (_via_current_image_loaded) {
    if (invisible_file_input) {
      invisible_file_input.accept   = '.csv,.json';
      invisible_file_input.onchange = import_region_attributes_from_file;
      invisible_file_input.click();
    }
  } else {
    show_message("Please load some images first");
  }
}
function show_about_panel() {
  set_all_text_panel_display('none');
  document.getElementById("about_panel").style.display = "block";
  canvas_panel.style.display = "none";
}
function show_getting_started_panel() {
  set_all_text_panel_display('none');
  document.getElementById("getting_started_panel").style.display = "block";
  canvas_panel.style.display = "none";
}
function show_license_panel() {
  set_all_text_panel_display('none');
  document.getElementById("license_panel").style.display = 'block';
  canvas_panel.style.display = "none";
}
function set_all_text_panel_display(style_display) {
  var tp = document.getElementsByClassName('text_panel');
  for ( var i = 0; i < tp.length; ++i ) {
    tp[i].style.display = style_display;
  }
}
function clear_image_display_area() {
  hide_all_canvas();
  set_all_text_panel_display('none');
}

//
// Local file uploaders
//
function store_local_img_ref(event) {
  var user_selected_images = event.target.files;
  var original_image_count = _via_img_count;

  // clear browser cache if user chooses to load new images
  if (original_image_count === 0) {
    localStorage.clear();
  }

  var discarded_file_count = 0;
  for ( var i = 0; i < user_selected_images.length; ++i ) {
    var filetype = user_selected_images[i].type.substr(0, 5);
    if ( filetype === 'image' ) {
      var filename = user_selected_images[i].name;
      var size     = user_selected_images[i].size;
      var img_id   = _via_get_image_id(filename, size);

      if ( _via_img_metadata.hasOwnProperty(img_id) ) {
        if ( _via_img_metadata[img_id].fileref ) {
          show_message('Image ' + filename + ' already loaded. Skipping!');
        } else {
          _via_img_metadata[img_id].fileref = user_selected_images[i];
          show_message('Regions already exist for file ' + filename + ' !');
        }
      } else {
        _via_img_metadata[img_id] = new ImageMetadata(user_selected_images[i],
                                                      filename,
                                                      size);
        _via_image_id_list.push(img_id);
        _via_img_count += 1;
        _via_reload_img_table = true;
      }
    } else {
      discarded_file_count += 1;
    }
  }

  if ( _via_img_metadata ) {
    var status_msg = 'Loaded ' + (_via_img_count - original_image_count) + ' images.';
    if ( discarded_file_count ) {
      status_msg += ' ( Discarded ' + discarded_file_count + ' non-image files! )';
    }
    show_message(status_msg);

    if ( _via_image_index === -1 ) {
      show_image(0);
    } else {
      show_image( original_image_count );
    }
    //SAMIN toggle_img_list();
  } else {
    show_message("Please upload some image files!");
  }
}

//
// Data Importer
//

function import_region_attributes_from_file(event) {
  var selected_files = event.target.files;
  for ( var i=0 ; i < selected_files.length; ++i ) {
    var file = selected_files[i];
    switch(file.type) {
    case 'text/csv':
      load_text_file(file, import_region_attributes_from_csv);
      break;

    default:
      show_message('Region attributes cannot be imported from file of type ' + file.type);
      break;
    }
  }
}

function import_region_attributes_from_csv(data) {
  data = data.replace(/\n/g, ''); // discard newline \n
  var csvdata = data.split(',');
  var attributes_import_count = 0;
  for ( var i = 0; i < csvdata.length; ++i ) {
    if ( !_via_region_attributes.hasOwnProperty(csvdata[i]) ) {
      _via_region_attributes[csvdata[i]] = true;
      attributes_import_count += 1;
    }
  }

  _via_reload_img_table = true;
  show_message('Imported ' + attributes_import_count + ' attributes from CSV file');
  save_current_data_to_browser_cache();
}

function import_annotations_from_file(event) {
  var selected_files = event.target.files;
  for ( var i = 0; i < selected_files.length; ++i ) {
    var file = selected_files[i];
    switch(file.type) {
    case '': // Fall-through // Windows 10: Firefox and Chrome do not report filetype
      show_message('File type for ' + file.name + ' cannot be determined! Assuming text/plain.');
    case 'text/plain': // Fall-through
    case 'application/vnd.ms-excel': // Fall-through // @todo: filetype of VIA csv annotations in Windows 10 , fix this (reported by @Eli Walker)
    case 'text/csv':
      load_text_file(file, import_annotations_from_csv);
      break;

    case 'text/json': // Fall-through
    case 'application/json':
      load_text_file(file, import_annotations_from_json);
      break;

    default:
      show_message('Annotations cannot be imported from file of type ' + file.type);
      break;
    }
  }
}
function import_annotations_from_csv(data) {
  //SAMIN 6/21 fix import to update map
  if ( data === '' || typeof(data) === 'undefined') {
    return;
  }

  // csv header format
  // #filename,file_size,file_attributes,region_count,region_id,region_shape_attributes,region_attributes
  var filename_index = 0;
  var size_index = 1;
  var file_attr_index = 2;
  var region_shape_attr_index = 5;
  var region_attr_index = 6;
  var csv_column_count = 7;

  var region_import_count = 0;
  var malformed_csv_lines_count = 0;

  var line_split_regex = new RegExp('\n|\r|\r\n', 'g');
  var csvdata = data.split(line_split_regex);

  for ( var i=0; i < csvdata.length; ++i ) {
    // ignore blank lines
    if (csvdata[i].charAt(0) === '\n' || csvdata[i].charAt(0) === '') {
      continue;
    }

    if (csvdata[i].charAt(0) === VIA_IMPORT_CSV_COMMENT_CHAR) {
      // parse header
      var h = csvdata[i].substring(1, csvdata[i].length); // remove #
      h = h.split(',');
      for ( var j = 0; j < h.length; ++j ) {
        switch ( h[j] ) {
        case 'filename':
          filename_index = j;
          break;

        case 'file_size':
          size_index = j;
          break;

        case 'file_attributes':
          file_attr_index = j;
          break;

        case 'region_shape_attributes':
          region_shape_attr_index = j;
          break;

        case 'region_attributes':
          region_attr_index = j;
          break;
        }
      }
      csv_column_count = h.length;
    } else {
      var d = parse_csv_line(csvdata[i]);

      // check if csv line was malformed
      if ( d.length !== csv_column_count ) {
        malformed_csv_lines_count += 1;
        continue;
      }

      var filename = d[filename_index];
      var size     = d[size_index];
      var image_id = _via_get_image_id(filename, size);

      if ( _via_img_metadata.hasOwnProperty(image_id) ) {
        // copy file attributes
        if ( d[file_attr_index] !== '"{}"') {
          var fattr = d[file_attr_index];
          fattr     = remove_prefix_suffix_quotes( fattr );
          fattr     = unescape_from_csv( fattr );

          var m = json_str_to_map( fattr );
          for( var key in m ) {
            _via_img_metadata[image_id].file_attributes[key] = m[key];

            if (!_via_file_attributes.hasOwnProperty(key)) {
              _via_file_attributes[key] = true;
            }
          }
        }

        var region_i = new ImageRegion();
        // copy regions shape attributes
        if ( d[region_shape_attr_index] !== '"{}"' ) {
          var sattr = d[region_shape_attr_index];
          sattr     = remove_prefix_suffix_quotes( sattr );
          sattr     = unescape_from_csv( sattr );

          var m = json_str_to_map( sattr );
          for ( var key in m ) {
            region_i.shape_attributes[key] = m[key];
          }
        }

        // copy region attributes
        if ( d[region_attr_index] !== '"{}"' ) {
          var rattr = d[region_attr_index];
          rattr     = remove_prefix_suffix_quotes( rattr );
          rattr     = unescape_from_csv( rattr );

          var m = json_str_to_map( rattr );
          for ( var key in m ) {
            region_i.region_attributes[key] = m[key];

            if (!_via_region_attributes.hasOwnProperty(key)) {
              _via_region_attributes[key] = true;
            }
          }
        }

        // add regions only if they are present
        if (Object.keys(region_i.shape_attributes).length > 0 ||
            Object.keys(region_i.region_attributes).length > 0 ) {
          _via_img_metadata[image_id].regions.push(region_i);
          region_import_count += 1;
        }
      }
    }
  }
  //SAMIN 6/21 insert function call to repopulate map, appropriate constants, as well as the side navbar
  repopulate();
  show_message('Import Summary : [' + region_import_count + '] regions, ' +
               '[' + malformed_csv_lines_count  + '] malformed csv lines.');

  _via_reload_img_table = true;
  show_image(_via_image_index);
  save_current_data_to_browser_cache();
}

function import_annotations_from_json(data) {
  if (data === '' || typeof(data) === 'undefined') {
    return;
  }

  var d = JSON.parse(data);

  var region_import_count = 0;
  for (var image_id in d) {
    if ( _via_img_metadata.hasOwnProperty(image_id) ) {

      // copy image attributes
      for (var key in d[image_id].file_attributes) {
        if ( !_via_img_metadata[image_id].file_attributes[key] ) {
          _via_img_metadata[image_id].file_attributes[key] = d[image_id].file_attributes[key];
        }
        if ( !_via_file_attributes.hasOwnProperty(key) ) {
          _via_file_attributes[key] = true;
        }
      }

      // copy regions
      var regions = d[image_id].regions;
      for ( var i in regions ) {
        var region_i = new ImageRegion();
        for ( var key in regions[i].shape_attributes ) {
          region_i.shape_attributes[key] = regions[i].shape_attributes[key];
        }
        for ( var key in regions[i].region_attributes ) {
          region_i.region_attributes[key] = regions[i].region_attributes[key];

          if ( !_via_region_attributes.hasOwnProperty(key) ) {
            _via_region_attributes[key] = true;
          }
        }

        // add regions only if they are present
        if ( Object.keys(region_i.shape_attributes).length > 0 ||
             Object.keys(region_i.region_attributes).length > 0 ) {
          _via_img_metadata[image_id].regions.push(region_i);
          region_import_count += 1;
        }
      }
    }
  }
  show_message('Import Summary : [' + region_import_count + '] regions');

  _via_reload_img_table = true;
  show_image(_via_image_index);
}

// assumes that csv line follows the RFC 4180 standard
// see: https://en.wikipedia.org/wiki/Comma-separated_values
function parse_csv_line(s, field_separator) {
  if (typeof(s) === 'undefined' || s.length === 0 ) {
    return [];
  }

  if (typeof(field_separator) === 'undefined') {
    field_separator = ',';
  }
  var double_quote_seen = false;
  var start = 0;
  var d = [];

  var i = 0;
  while ( i < s.length) {
    if (s.charAt(i) === field_separator) {
      if (double_quote_seen) {
        // field separator inside double quote is ignored
        i = i + 1;
      } else {
        //var part = s.substr(start, i - start);
        d.push( s.substr(start, i - start) );
        start = i + 1;
        i = i + 1;
      }
    } else {
      if (s.charAt(i) === '"') {
        if (double_quote_seen) {
          if (s.charAt(i+1) === '"') {
            // ignore escaped double quotes
            i = i + 2;
          } else {
            // closing of double quote
            double_quote_seen = false;
            i = i + 1;
          }
        } else {
          double_quote_seen = true;
          start = i;
          i = i + 1;
        }
      } else {
        i = i + 1;
      }
    }

  }
  // extract the last field (csv rows have no trailing comma)
  d.push( s.substr(start) );
  return d;
}

// s = '{"name":"rect","x":188,"y":90,"width":243,"height":233}'
function json_str_to_map(s) {
  if (typeof(s) === 'undefined' || s.length === 0 ) {
    return {};
  }

  return JSON.parse(s);
}

// ensure the exported json string conforms to RFC 4180
// see: https://en.wikipedia.org/wiki/Comma-separated_values
function map_to_json(m) {
  var s = [];
  for ( var key in m ) {
    var v   = m[key];
    var si  = JSON.stringify(key);
    si += VIA_CSV_KEYVAL_SEP;
    si += JSON.stringify(v);
    s.push( si );
  }
  return '{' + s.join(VIA_CSV_SEP) + '}';
}

function escape_for_csv(s) {
  return s.replace(/["]/g, '""');
}

function unescape_from_csv(s) {
  return s.replace(/""/g, '"');
}

function remove_prefix_suffix_quotes(s) {
  if ( s.charAt(0) === '"' && s.charAt(s.length-1) === '"' ) {
    return s.substr(1, s.length-2);
  } else {
    return s;
  }
}

function clone_image_region(r0) {
  var r1 = new ImageRegion();
  r1.is_user_selected = r0.is_user_selected;

  // copy shape attributes
  for ( var key in r0.shape_attributes ) {
    r1.shape_attributes[key] = clone_value(r0.shape_attributes[key]);
  }

  // copy region attributes
  for ( var key in r0.region_attributes ) {
    r1.region_attributes[key] = clone_value(r0.region_attributes[key]);
  }
  return r1;
}

function clone_value(value) {
  if ( typeof(value) === 'object' ) {
    if ( Array.isArray(value) ) {
      return value.slice(0);
    } else {
      var copy = {};
      for ( var p in value ) {
        if ( value.hasOwnProperty(p) ) {
          copy[p] = clone_value(value[p]);
        }
      }
      return copy;
    }
  }
  return value;
}

function _via_get_image_id(filename, size) {
  if ( typeof(size) === 'undefined' ) {
    return filename;
  } else {
    return filename + size;
  }
}

function load_text_file(text_file, callback_function) {
  if (text_file) {
    var text_reader = new FileReader();
    text_reader.addEventListener( 'progress', function(e) {
      show_message('Loading data from text file : ' + text_file.name + ' ... ');
    }, false);

    text_reader.addEventListener( 'error', function() {
      show_message('Error loading data from text file :  ' + text_file.name + ' !');
      callback_function('');
    }, false);

    text_reader.addEventListener( 'load', function() {
      callback_function(text_reader.result);
    }, false);
    text_reader.readAsText(text_file, 'utf-8');
  }
}

//
// Data Exporter
//
function pack_via_metadata(return_type) {
  if( return_type === 'csv' ) {
    var csvdata = [];
    var csvheader = '#filename,file_size,file_attributes,region_count,region_id,region_shape_attributes,region_attributes';
    csvdata.push(csvheader);

    for ( var image_id in _via_img_metadata ) {
      var fattr = map_to_json( _via_img_metadata[image_id].file_attributes );
      fattr = escape_for_csv( fattr );

      var prefix = '\n' + _via_img_metadata[image_id].filename;
      prefix += ',' + _via_img_metadata[image_id].size;
      prefix += ',"' + fattr + '"';

      var r = _via_img_metadata[image_id].regions;

      if ( r.length !==0 ) {
        for ( var i = 0; i < r.length; ++i ) {
          var csvline = [];
          csvline.push(prefix);
          csvline.push(r.length);
          csvline.push(i);

          var sattr = map_to_json( r[i].shape_attributes );
          sattr = '"' +  escape_for_csv( sattr ) + '"';
          csvline.push(sattr);

          var rattr = map_to_json( r[i].region_attributes );
          rattr = '"' +  escape_for_csv( rattr ) + '"';
          csvline.push(rattr);
          csvdata.push( csvline.join(VIA_CSV_SEP) );
        }
      } else {
        // @todo: reconsider this practice of adding an empty entry
        csvdata.push(prefix + ',0,0,"{}","{}"');
      }
    }
    return csvdata;
  } else {
    // JSON.stringify() does not work with Map()
    // hence, we cast everything as objects
    var _via_img_metadata_as_obj = {};
    for ( var image_id in _via_img_metadata ) {
      var image_data = {};
      //image_data.fileref = _via_img_metadata[image_id].fileref;
      image_data.fileref = '';
      image_data.size = _via_img_metadata[image_id].size;
      image_data.filename = _via_img_metadata[image_id].filename;
      image_data.base64_img_data = '';
      //image_data.base64_img_data = _via_img_metadata[image_id].base64_img_data;

      // copy file attributes
      image_data.file_attributes = {};
      for ( var key in _via_img_metadata[image_id].file_attributes ) {
        image_data.file_attributes[key] = _via_img_metadata[image_id].file_attributes[key];
      }

      // copy all region shape_attributes
      image_data.regions = {};
      for ( var i = 0; i < _via_img_metadata[image_id].regions.length; ++i ) {
        image_data.regions[i] = {};
        image_data.regions[i].shape_attributes = {};
        image_data.regions[i].region_attributes = {};
        // copy region shape_attributes
        for ( var key in _via_img_metadata[image_id].regions[i].shape_attributes ) {
          image_data.regions[i].shape_attributes[key] = _via_img_metadata[image_id].regions[i].shape_attributes[key];
        }
        // copy region_attributes
        for ( var key in _via_img_metadata[image_id].regions[i].region_attributes ) {
          image_data.regions[i].region_attributes[key] = _via_img_metadata[image_id].regions[i].region_attributes[key];
        }
      }
      _via_img_metadata_as_obj[image_id] = image_data;
    }
    return [JSON.stringify(_via_img_metadata_as_obj)];
  }
}

function save_data_to_local_file(data, filename) {
  var a      = document.createElement('a');
  a.href     = URL.createObjectURL(data);
  a.target   = '_blank';
  a.download = filename;

  // simulate a mouse click event
  var event = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true
  });

  a.dispatchEvent(event);
}

//
// Maintainers of user interface
//

function show_message(msg, t) {
  if ( _via_message_clear_timer ) {
    clearTimeout(_via_message_clear_timer); // stop any previous timeouts
  }
  var timeout = t;
  if ( typeof t === 'undefined' ) {
    timeout = VIA_THEME_MESSAGE_TIMEOUT_MS;
  }
  document.getElementById('message_panel').innerHTML = msg;
  _via_message_clear_timer = setTimeout( function() {
    document.getElementById('message_panel').innerHTML = ' ';
  }, timeout);
}

function show_image(image_index) {
  if (_via_is_loading_current_image) {
    return;
  }
  //7/13 update show image appropriately
  var img_id = _via_image_id_list[image_index];
  if ( !_via_img_metadata.hasOwnProperty(img_id)) {
    return;
  }

  var img_filename = _via_img_metadata[img_id].filename;
  var img_reader = new FileReader();
  _via_is_loading_current_image = true;

  /*
  SAMIN
  img_reader.addEventListener( "loadstart", function(e) {
    img_loading_spinbar(true);
  }, false);*/

  img_reader.addEventListener( "progress", function(e) {
  }, false);

  img_reader.addEventListener( "error", function() {
    _via_is_loading_current_image = false;
    img_loading_spinbar(false);
    //show_message("Error loading image " + img_filename + " !");
  }, false);

  img_reader.addEventListener( "abort", function() {
    _via_is_loading_current_image = false;
    img_loading_spinbar(false);
    //show_message("Aborted loading image " + img_filename + " !");
  }, false);

  img_reader.addEventListener( "load", function() {
    _via_current_image = new Image();

    _via_current_image.addEventListener( "error", function() {
      _via_is_loading_current_image = false;
      img_loading_spinbar(false);
      //show_message("Error loading image " + img_filename + " !");
    }, false);

    _via_current_image.addEventListener( "abort", function() {
      _via_is_loading_current_image = false;
      img_loading_spinbar(false);
      //show_message("Aborted loading image " + img_filename + " !");
    }, false);

    _via_current_image.addEventListener( "load", function() {

      // update the current state of application
      _via_image_id = img_id;
      _via_image_index = image_index;
      _via_current_image_filename = img_filename;
      _via_current_image_loaded = true;
      _via_is_loading_current_image = false;
      _via_click_x0 = 0; _via_click_y0 = 0;
      _via_click_x1 = 0; _via_click_y1 = 0;
      _via_is_user_drawing_region = false;
      _via_is_window_resized = false;
      _via_is_user_resizing_region = false;
      _via_is_user_moving_region = false;
      _via_is_user_drawing_polygon = false;
      _via_is_region_selected = false;
      _via_user_sel_region_id = -1;
      _via_current_image_width = _via_current_image.naturalWidth;
      _via_current_image_height = _via_current_image.naturalHeight;

      // set the size of canvas
      // based on the current dimension of browser window
      var de = document.documentElement;
      var canvas_panel_width = de.clientWidth - 230;
      var canvas_panel_height = de.clientHeight - 2*ui_top_panel.offsetHeight;
      _via_canvas_width = _via_current_image_width;
      _via_canvas_height = _via_current_image_height;
      if ( _via_canvas_width > canvas_panel_width ) {
        // resize image to match the panel width
        var scale_width = canvas_panel_width / _via_current_image.naturalWidth;
        _via_canvas_width = canvas_panel_width;
        _via_canvas_height = _via_current_image.naturalHeight * scale_width;
      }
      if ( _via_canvas_height > canvas_panel_height ) {
        // resize further image if its height is larger than the image panel
        var scale_height = canvas_panel_height / _via_canvas_height;
        _via_canvas_height = canvas_panel_height;
        _via_canvas_width = _via_canvas_width * scale_height;
      }
      _via_canvas_width = Math.round(_via_canvas_width);
      _via_canvas_height = Math.round(_via_canvas_height);
      _via_canvas_scale = _via_current_image.naturalWidth / _via_canvas_width;
      _via_canvas_scale_without_zoom = _via_canvas_scale;
      set_all_canvas_size(_via_canvas_width, _via_canvas_height);
      //set_all_canvas_scale(_via_canvas_scale_without_zoom);

      // ensure that all the canvas are visible
      clear_image_display_area();
      show_all_canvas();

      // we only need to draw the image once in the image_canvas
      _via_img_ctx.clearRect(0, 0, _via_canvas_width, _via_canvas_height);
      _via_img_ctx.drawImage(_via_current_image, 0, 0,
                             _via_canvas_width, _via_canvas_height);

      // refresh the attributes panel
      //Samin
      //update_attributes_panel();

      _via_load_canvas_regions(); // image to canvas space transform
      _via_redraw_reg_canvas();
      _via_reg_canvas.focus();

      //SAMIN img_loading_spinbar(false);


      // update the UI components to reflect newly loaded image
      // refresh the image list
      // @todo: let the height of image list match that of window
      _via_reload_img_table = true;
      var img_list_height = document.documentElement.clientHeight/3 + 'px';
      //img_list_panel.setAttribute('style', 'height: ' + img_list_height);
      if (_via_is_loaded_img_list_visible) {
        show_img_list();
      }
    });
    _via_current_image.src = img_reader.result;
  }, false);

  if (_via_img_metadata[img_id].base64_img_data === '') {
    // load image from file
    img_reader.readAsDataURL( _via_img_metadata[img_id].fileref );
  } else {
    // load image from base64 data or URL
    img_reader.readAsText( new Blob([_via_img_metadata[img_id].base64_img_data]) );
  }

}

// transform regions in image space to canvas space
function _via_load_canvas_regions() {
  // load all existing annotations into _via_canvas_regions
  var regions = _via_img_metadata[_via_image_id].regions;
  _via_canvas_regions  = [];
  for ( var i = 0; i < regions.length; ++i ) {
    var region_i = new ImageRegion();
    for ( var key in regions[i].shape_attributes ) {
      region_i.shape_attributes[key] = regions[i].shape_attributes[key];
    }
    _via_canvas_regions.push(region_i);

    switch(_via_canvas_regions[i].shape_attributes['name']) {
    case VIA_REGION_SHAPE.RECT:
      var x      = regions[i].shape_attributes['x'] / _via_canvas_scale;
      var y      = regions[i].shape_attributes['y'] / _via_canvas_scale;
      var width  = regions[i].shape_attributes['width']  / _via_canvas_scale;
      var height = regions[i].shape_attributes['height'] / _via_canvas_scale;
      var name = regions[i].region_attributes['name'];
      var color = _via_class_names.get(name)[1];

      _via_canvas_regions[i].shape_attributes['x'] = Math.round(x);
      _via_canvas_regions[i].shape_attributes['y'] = Math.round(y);
      _via_canvas_regions[i].shape_attributes['width'] = Math.round(width);
      _via_canvas_regions[i].shape_attributes['height'] = Math.round(height);
      _via_canvas_regions[i].region_attributes['name'] = name;
      _via_canvas_regions[i].region_attributes['color'] = color;
      break;

    case VIA_REGION_SHAPE.CIRCLE:
      var cx = regions[i].shape_attributes['cx'] / _via_canvas_scale;
      var cy = regions[i].shape_attributes['cy'] / _via_canvas_scale;
      var r  = regions[i].shape_attributes['r']  / _via_canvas_scale;
      _via_canvas_regions[i].shape_attributes['cx'] = Math.round(cx);
      _via_canvas_regions[i].shape_attributes['cy'] = Math.round(cy);
      _via_canvas_regions[i].shape_attributes['r'] = Math.round(r);
      break;

    case VIA_REGION_SHAPE.ELLIPSE:
      var cx = regions[i].shape_attributes['cx'] / _via_canvas_scale;
      var cy = regions[i].shape_attributes['cy'] / _via_canvas_scale;
      var rx = regions[i].shape_attributes['rx'] / _via_canvas_scale;
      var ry = regions[i].shape_attributes['ry'] / _via_canvas_scale;
      _via_canvas_regions[i].shape_attributes['cx'] = Math.round(cx);
      _via_canvas_regions[i].shape_attributes['cy'] = Math.round(cy);
      _via_canvas_regions[i].shape_attributes['rx'] = Math.round(rx);
      _via_canvas_regions[i].shape_attributes['ry'] = Math.round(ry);
      break;

    case VIA_REGION_SHAPE.POLYGON:
      var all_points_x = regions[i].shape_attributes['all_points_x'].slice(0);
      var all_points_y = regions[i].shape_attributes['all_points_y'].slice(0);
      for (var j=0; j<all_points_x.length; ++j) {
        all_points_x[j] = Math.round(all_points_x[j] / _via_canvas_scale);
        all_points_y[j] = Math.round(all_points_y[j] / _via_canvas_scale);
      }
      _via_canvas_regions[i].shape_attributes['all_points_x'] = all_points_x;
      _via_canvas_regions[i].shape_attributes['all_points_y'] = all_points_y;
      break;

    case VIA_REGION_SHAPE.POINT:
      var cx = regions[i].shape_attributes['cx'] / _via_canvas_scale;
      var cy = regions[i].shape_attributes['cy'] / _via_canvas_scale;

      _via_canvas_regions[i].shape_attributes['cx'] = Math.round(cx);
      _via_canvas_regions[i].shape_attributes['cy'] = Math.round(cy);
      break;
    }
  }
  //SAMIN call toggle reg_attr_panel after loading the regions instead of at the on click. Goal is to change this function from toggle to just appearing on the side.
  //SAMIN attr remove
  //toggle_reg_attr_panel();
  //7/2 this is where we load our saved data
  //7/6 debugging
  if (sessionStorage.getItem("page_data") == null) {
    _via_first_load = false;
  }
  if (_via_first_load){
    info = JSON.parse(sessionStorage.getItem("page_data"));
    //manually add the metadata into what we have
    var new_metadata = new ImageMetadata;
    new_metadata["filename"] = "cars.png";
    new_metadata["fileref"] = "cars.png";
    new_metadata["base64_img_data"] = "cars.png";
    new_metadata["file_attributes"] = info["cars.png62201"]["file_attributes"];
    new_metadata["size"] = info["cars.png62201"]["size"];

    //sessionStorage.setItem("global_index", 0);
    for (var i = 0; i < info["cars.png62201"]["regions"].length; i++){
      var new_region = new ImageRegion;
      new_region["is_user_selected"] = info["cars.png62201"]["regions"][i]["is_user_selected"];
      new_region["region_attributes"] = info["cars.png62201"]["regions"][i]["region_attributes"];
      new_region["shape_attributes"] = info["cars.png62201"]["regions"][i]["shape_attributes"];
      new_metadata["regions"].push(new_region);
      //canvas region should be updated based on the image that we load on 7/13
      if(sessionStorage.getItem("global_index") == 0){
        _via_canvas_regions.push(new_region);
      }
      //_via_canvas_regions.push(new_region);
    }

    _via_img_metadata["cars.png62201"] = new_metadata;

    var new_metadata = new ImageMetadata;
    new_metadata["filename"] = "lot.jpeg";
    new_metadata["fileref"] = "lot.jpeg";
    new_metadata["base64_img_data"] = "lot.jpeg";
    new_metadata["file_attributes"] = info["lot.jpeg71862"]["file_attributes"];
    new_metadata["size"] = info["lot.jpeg71862"]["size"];


    for (var i = 0; i < info["lot.jpeg71862"]["regions"].length; i++){
      var new_region = new ImageRegion;
      new_region["is_user_selected"] = info["lot.jpeg71862"]["regions"][i]["is_user_selected"];
      new_region["region_attributes"] = info["lot.jpeg71862"]["regions"][i]["region_attributes"];
      new_region["shape_attributes"] = info["lot.jpeg71862"]["regions"][i]["shape_attributes"];
      new_metadata["regions"].push(new_region);
      //_via_canvas_regions.push(new_region);

      if(sessionStorage.getItem("global_index") == 1){
        
        _via_canvas_regions.push(new_region);
      }


    }

    _via_img_metadata["lot.jpeg71862"] = new_metadata;

    var new_metadata = new ImageMetadata;
    new_metadata["filename"] = "outside.jpeg";
    new_metadata["fileref"] = "outside.jpeg";
    new_metadata["base64_img_data"] = "outside.jpeg";
    new_metadata["file_attributes"] = info["outside.jpeg21513"]["file_attributes"];
    new_metadata["size"] = info["outside.jpeg21513"]["size"];


    for (var i = 0; i < info["outside.jpeg21513"]["regions"].length; i++){
      var new_region = new ImageRegion;
      new_region["is_user_selected"] = info["outside.jpeg21513"]["regions"][i]["is_user_selected"];
      new_region["region_attributes"] = info["outside.jpeg21513"]["regions"][i]["region_attributes"];
      new_region["shape_attributes"] = info["outside.jpeg21513"]["regions"][i]["shape_attributes"];
      new_metadata["regions"].push(new_region);
      //_via_canvas_regions.push(new_region);

      if(sessionStorage.getItem("global_index") == 2){
        
        _via_canvas_regions.push(new_region);
      }
    }

    _via_img_metadata["outside.jpeg21513"] = new_metadata;


    repopulate();
    _via_redraw_reg_canvas();
    show_all_canvas();

    _via_is_window_resized = true;
    show_image(_via_image_index);
    _via_first_load = false;
  }
}

// updates currently selected region shape
function select_region_shape(sel_shape_name) {
  for ( var shape_name in VIA_REGION_SHAPE ) {
    var ui_element = document.getElementById('region_shape_' + VIA_REGION_SHAPE[shape_name]);
    //Samin debugging, commenting out this line. 
    //ui_element.classList.remove('selected');
  }

  _via_current_shape = sel_shape_name;
  var ui_element = document.getElementById('region_shape_' + _via_current_shape);
  ui_element.classList.add('selected');

  switch(_via_current_shape) {
  case VIA_REGION_SHAPE.RECT: // Fall-through
  case VIA_REGION_SHAPE.CIRCLE: // Fall-through
  case VIA_REGION_SHAPE.ELLIPSE:
    //show_message('Press single click and drag mouse to draw ' +
                 //_via_current_shape + ' region');
    break;

  case VIA_REGION_SHAPE.POLYGON:
    _via_is_user_drawing_polygon = false;
    _via_current_polygon_region_id = -1;

    //show_message('Press single click to define polygon vertices and ' +
                 //'click first vertex to close path');
    break;

  case VIA_REGION_SHAPE.POINT:
    //show_message('Press single click to define points (or landmarks)');
    break;

  default:
    //show_message('Unknown shape selected!');
    break;
  }
}

function set_all_canvas_size(w, h) {
  _via_img_canvas.height = h;
  _via_img_canvas.width  = w;

  _via_reg_canvas.height = h;
  _via_reg_canvas.width = w;

  canvas_panel.style.height = h + 'px';
  canvas_panel.style.width  = w + 'px';
}

function set_all_canvas_scale(s) {
  _via_img_ctx.scale(s, s);
  _via_reg_ctx.scale(s, s);
}

function show_all_canvas() {
  canvas_panel.style.display = 'inline-block';
}

function hide_all_canvas() {
  canvas_panel.style.display = 'none';
}


function reload_img_table() {
  _via_loaded_img_fn_list = [];
  _via_loaded_img_region_attr_miss_count = [];

  for ( var i=0; i < _via_img_count; ++i ) {
    var img_id = _via_image_id_list[i];
    _via_loaded_img_fn_list[i] = _via_img_metadata[img_id].filename;
    _via_loaded_img_region_attr_miss_count[i] = count_missing_region_attr(img_id);
  }

  _via_loaded_img_table_html = [];
  _via_loaded_img_table_html.push('<ul>');
  for ( var i=0; i < _via_img_count; ++i ) {
    var fni = '';
    if ( i === _via_image_index ) {
      // highlight the current entry
      fni += '<li id="flist'+i+'" style="cursor: default;" title="' + _via_loaded_img_fn_list[i] + '">';
      fni += '<b>[' + (i+1) + '] ' + _via_loaded_img_fn_list[i] + '</b>';
    } else {
      fni += '<li id="flist'+i+'" onclick="jump_to_image(' + (i) + ')" title="' + _via_loaded_img_fn_list[i] + '">';
      fni += '[' + (i+1) + '] ' + _via_loaded_img_fn_list[i];
    }

    if ( _via_loaded_img_region_attr_miss_count[i] ) {
      fni += ' (' + '<span style="color: red;">';
      fni += _via_loaded_img_region_attr_miss_count[i] + '</span>' + ')';
    }

    fni += '</li>';
    _via_loaded_img_table_html.push(fni);
  }
  _via_loaded_img_table_html.push('</ul>');
}

function jump_to_image(image_index) {
  if ( _via_img_count <= 0 ) {
    return;
  }

  // reset zoom
  if ( _via_is_canvas_zoomed ) {
    _via_is_canvas_zoomed = false;
    _via_canvas_zoom_level_index = VIA_CANVAS_DEFAULT_ZOOM_LEVEL_INDEX;
    var zoom_scale = VIA_CANVAS_ZOOM_LEVELS[_via_canvas_zoom_level_index];
    set_all_canvas_scale(zoom_scale);
    set_all_canvas_size(_via_canvas_width, _via_canvas_height);
    _via_canvas_scale = _via_canvas_scale_without_zoom;
  }

  if ( image_index >= 0 && image_index < _via_img_count) {
    show_image(image_index);
  }
}

function count_missing_region_attr(img_id) {
  var miss_region_attr_count = 0;
  var attr_count = Object.keys(_via_region_attributes).length;
  for( var i=0; i < _via_img_metadata[img_id].regions.length; ++i ) {
    var set_attr_count = Object.keys(_via_img_metadata[img_id].regions[i].region_attributes).length;
    miss_region_attr_count += ( attr_count - set_attr_count );
  }
  return miss_region_attr_count;
}

function count_missing_file_attr(img_id) {
  return Object.keys(_via_file_attributes).length - Object.keys(_via_img_metadata[img_id].file_attributes).length;
}

function toggle_all_regions_selection(is_selected) {
  for (var i=0; i<_via_canvas_regions.length; ++i) {
    _via_canvas_regions[i].is_user_selected = is_selected;
    _via_img_metadata[_via_image_id].regions[i].is_user_selected = is_selected;
  }
  _via_is_all_region_selected = is_selected;
}

//7/24 perhaps we can use this for hover
function select_only_region(region_id) {
  toggle_all_regions_selection(false);
  set_region_select_state(region_id, true);
  _via_is_region_selected = true;
  _via_user_sel_region_id = region_id;

}
function set_region_select_state(region_id, is_selected) {
  _via_canvas_regions[region_id].is_user_selected = is_selected;
  _via_img_metadata[_via_image_id].regions[region_id].is_user_selected = is_selected;
}

function toggle_leftsidebar() {
  var leftsidebar = document.getElementById('leftsidebar');
  if ( leftsidebar.style.display === 'none' ) {
    leftsidebar.style.display = 'table-cell';
    document.getElementById('leftsidebar_collapse_button').innerHTML ='&ltrif;';
  } else {
    leftsidebar.style.display = 'none';
    document.getElementById('leftsidebar_collapse_button').innerHTML ='&rtrif;';
  }
}

function show_annotation_data() {
  var hstr = '<pre>' + pack_via_metadata('csv').join('') + '</pre>';
  if ( typeof annotation_data_window === 'undefined' ) {
    var window_features = 'toolbar=no,menubar=no,location=no,resizable=yes,scrollbars=yes,status=no';
    window_features += ',width=800,height=600';
    annotation_data_window = window.open('', 'Image Metadata ', window_features);
  }
  annotation_data_window.document.body.innerHTML = hstr;
}

//
// Image click handlers
//

// enter annotation mode on double click
_via_reg_canvas.addEventListener('dblclick', function(e) {
  _via_click_x0 = e.offsetX; _via_click_y0 = e.offsetY;
  var region_id = is_inside_region(_via_click_x0, _via_click_y0);

  if (region_id !== -1) {
    // user clicked inside a region, show attribute panel
  }

}, false);

// user clicks on the canvas
//7/23
_via_reg_canvas.addEventListener('mousedown', function(e) {
  
  if (_via_current_shape == VIA_REGION_SHAPE.NONE){
    return;
  }

  _via_click_x0 = e.offsetX; _via_click_y0 = e.offsetY;
  _via_region_edge = is_on_region_corner(_via_click_x0, _via_click_y0);
  var region_id = is_inside_region(_via_click_x0, _via_click_y0);

  if ( _via_is_region_selected ) {
    
    // check if user clicked on the region boundary
    if ( _via_region_edge[1] > 0 ) {
      //

      if ( !_via_is_user_resizing_region ) {
        // resize region
        if ( _via_region_edge[0] !== _via_user_sel_region_id ) {
          _via_user_sel_region_id = _via_region_edge[0];
        }
        _via_is_user_resizing_region = true;
      }
    } else {
      //7/9
      if (_via_current_update_attribute_name == ""){
        //7/10
          //document.getElementById("modal-1").classList.add("is-visible");
          var yes = true;
      }
      else{
      var yes = is_inside_this_region(_via_click_x0,
                                      _via_click_y0,
                                      _via_user_sel_region_id);
    }
      if (yes) {
        if( !_via_is_user_moving_region ) {
          _via_is_user_moving_region = true;
          _via_region_click_x = _via_click_x0;
          _via_region_click_y = _via_click_y0;
        }
      }
      if ( region_id === -1 ) {
        // mousedown on outside any region
        _via_is_user_drawing_region = true;
        // unselect all regions
        _via_is_region_selected = false;
        _via_user_sel_region_id = -1;
        toggle_all_regions_selection(false);
      }
    }
  } else {
    if ( region_id === -1 ) {
      // mousedown outside a region
      if (_via_current_shape !== VIA_REGION_SHAPE.POLYGON &&
          _via_current_shape !== VIA_REGION_SHAPE.POINT) {
        // this is a bounding box drawing event
        _via_is_user_drawing_region = true;
      }
    } else {
      // mousedown inside a region
      // this could lead to (1) region selection or (2) region drawing
      _via_is_user_drawing_region = true;
    }
  }
  e.preventDefault();
}, false);

// implements the following functionalities:
//  - new region drawing (including polygon)
//  - moving/resizing/select/unselect existing region
_via_reg_canvas.addEventListener('mouseup', function(e) {
  if (_via_current_shape == VIA_REGION_SHAPE.NONE){
    return;
  }

  _via_click_x1 = e.offsetX; _via_click_y1 = e.offsetY;

  var click_dx = Math.abs(_via_click_x1 - _via_click_x0);
  var click_dy = Math.abs(_via_click_y1 - _via_click_y0);

  // indicates that user has finished moving a region
  if ( _via_is_user_moving_region ) {
    _via_is_user_moving_region = false;
    _via_reg_canvas.style.cursor = "default";

    var move_x = Math.round(_via_click_x1 - _via_region_click_x);
    var move_y = Math.round(_via_click_y1 - _via_region_click_y);

    if (Math.abs(move_x) > VIA_MOUSE_CLICK_TOL ||
        Math.abs(move_y) > VIA_MOUSE_CLICK_TOL) {

      if (_via_img_metadata[_via_image_id].regions[_via_user_sel_region_id] == undefined){
        return;
      }

      var image_attr = _via_img_metadata[_via_image_id].regions[_via_user_sel_region_id].shape_attributes;

      var canvas_attr = _via_canvas_regions[_via_user_sel_region_id].shape_attributes;

      switch( canvas_attr['name'] ) {
      case VIA_REGION_SHAPE.RECT:
        var xnew = image_attr['x'] + Math.round(move_x * _via_canvas_scale);
        var ynew = image_attr['y'] + Math.round(move_y * _via_canvas_scale);
        image_attr['x'] = xnew;
        image_attr['y'] = ynew;
        canvas_attr['x'] = Math.round( image_attr['x'] / _via_canvas_scale);
        canvas_attr['y'] = Math.round( image_attr['y'] / _via_canvas_scale);

        
        break;

      case VIA_REGION_SHAPE.CIRCLE: // Fall-through
      case VIA_REGION_SHAPE.ELLIPSE: // Fall-through
      case VIA_REGION_SHAPE.POINT:
        var cxnew = image_attr['cx'] + Math.round(move_x * _via_canvas_scale);
        var cynew = image_attr['cy'] + Math.round(move_y * _via_canvas_scale);
        image_attr['cx'] = cxnew;
        image_attr['cy'] = cynew;

        canvas_attr['cx'] = Math.round( image_attr['cx'] / _via_canvas_scale);
        canvas_attr['cy'] = Math.round( image_attr['cy'] / _via_canvas_scale);
        break;

      case VIA_REGION_SHAPE.POLYGON:
        var img_px = image_attr['all_points_x'];
        var img_py = image_attr['all_points_y'];
        for (var i=0; i<img_px.length; ++i) {
          img_px[i] = img_px[i] + Math.round(move_x * _via_canvas_scale);
          img_py[i] = img_py[i] + Math.round(move_y * _via_canvas_scale);
        }

        var canvas_px = canvas_attr['all_points_x'];
        var canvas_py = canvas_attr['all_points_y'];
        for (var i=0; i<canvas_px.length; ++i) {
          canvas_px[i] = Math.round( img_px[i] / _via_canvas_scale );
          canvas_py[i] = Math.round( img_py[i] / _via_canvas_scale );
        }
        break;
      }
    } else {
      // indicates a user click on an already selected region
      // this could indicate a user's intention to select another
      // nested region within this region

      // traverse the canvas regions in alternating ascending
      // and descending order to solve the issue of nested regions
      var nested_region_id = is_inside_region(_via_click_x0, _via_click_y0, true);
      if (nested_region_id >= 0 &&
          nested_region_id !== _via_user_sel_region_id) {
        _via_user_sel_region_id = nested_region_id;
        _via_is_region_selected = true;
        _via_is_user_moving_region = false;

        // de-select all other regions if the user has not pressed Shift
        if ( !e.shiftKey ) {
          toggle_all_regions_selection(false);
        }
        set_region_select_state(nested_region_id, true);
      }
    }
    _via_redraw_reg_canvas();
    _via_reg_canvas.focus();
    save_current_data_to_browser_cache();
    return;
  }

  // indicates that user has finished resizing a region
  if ( _via_is_user_resizing_region ) {
    // _via_click(x0,y0) to _via_click(x1,y1)
    _via_is_user_resizing_region = false;
    _via_reg_canvas.style.cursor = "default";

    // update the region
    var region_id = _via_region_edge[0];
    var image_attr = _via_img_metadata[_via_image_id].regions[region_id].shape_attributes;
    var canvas_attr = _via_canvas_regions[region_id].shape_attributes;

    switch (canvas_attr['name']) {
    case VIA_REGION_SHAPE.RECT:
      var d = [canvas_attr['x'], canvas_attr['y'], 0, 0];
      d[2] = d[0] + canvas_attr['width'];
      d[3] = d[1] + canvas_attr['height'];

      var mx = _via_current_x;
      var my = _via_current_y;
      var preserve_aspect_ratio = false;

      // constrain (mx,my) to lie on a line connecting a diagonal of rectangle
      if ( _via_is_ctrl_pressed ) {
        preserve_aspect_ratio = true;
      }

      rect_update_corner(_via_region_edge[1], d, mx, my, preserve_aspect_ratio);
      rect_standardize_coordinates(d);

      var w = Math.abs(d[2] - d[0]);
      var h = Math.abs(d[3] - d[1]);

      image_attr['x'] = Math.round(d[0] * _via_canvas_scale);
      image_attr['y'] = Math.round(d[1] * _via_canvas_scale);
      image_attr['width'] = Math.round(w * _via_canvas_scale);
      image_attr['height'] = Math.round(h * _via_canvas_scale);

      canvas_attr['x'] = Math.round( image_attr['x'] / _via_canvas_scale);
      canvas_attr['y'] = Math.round( image_attr['y'] / _via_canvas_scale);
      canvas_attr['width'] = Math.round( image_attr['width'] / _via_canvas_scale);
      canvas_attr['height'] = Math.round( image_attr['height'] / _via_canvas_scale);
      break;

    case VIA_REGION_SHAPE.CIRCLE:
      var dx = Math.abs(canvas_attr['cx'] - _via_current_x);
      var dy = Math.abs(canvas_attr['cy'] - _via_current_y);
      var new_r = Math.sqrt( dx*dx + dy*dy );

      image_attr['r'] = Math.round(new_r * _via_canvas_scale);
      canvas_attr['r'] = Math.round( image_attr['r'] / _via_canvas_scale);
      break;

    case VIA_REGION_SHAPE.ELLIPSE:
      var new_rx = canvas_attr['rx'];
      var new_ry = canvas_attr['ry'];
      var dx = Math.abs(canvas_attr['cx'] - _via_current_x);
      var dy = Math.abs(canvas_attr['cy'] - _via_current_y);

      switch(_via_region_edge[1]) {
      case 5:
        new_ry = dy;
        break;

      case 6:
        new_rx = dx;
        break;

      default:
        new_rx = dx;
        new_ry = dy;
        break;
      }

      image_attr['rx'] = Math.round(new_rx * _via_canvas_scale);
      image_attr['ry'] = Math.round(new_ry * _via_canvas_scale);

      canvas_attr['rx'] = Math.round(image_attr['rx'] / _via_canvas_scale);
      canvas_attr['ry'] = Math.round(image_attr['ry'] / _via_canvas_scale);
      break;

    case VIA_REGION_SHAPE.POLYGON:
      var moved_vertex_id = _via_region_edge[1] - VIA_POLYGON_RESIZE_VERTEX_OFFSET;

      var imx = Math.round(_via_current_x * _via_canvas_scale);
      var imy = Math.round(_via_current_y * _via_canvas_scale);
      image_attr['all_points_x'][moved_vertex_id] = imx;
      image_attr['all_points_y'][moved_vertex_id] = imy;
      canvas_attr['all_points_x'][moved_vertex_id] = Math.round( imx / _via_canvas_scale );
      canvas_attr['all_points_y'][moved_vertex_id] = Math.round( imy / _via_canvas_scale );

      if (moved_vertex_id === 0) {
        // move both first and last vertex because we
        // the initial point at the end to close path
        var n = canvas_attr['all_points_x'].length;
        image_attr['all_points_x'][n-1] = imx;
        image_attr['all_points_y'][n-1] = imy;
        canvas_attr['all_points_x'][n-1] = Math.round( imx / _via_canvas_scale );
        canvas_attr['all_points_y'][n-1] = Math.round( imy / _via_canvas_scale );
      }
      break;
    }

    _via_redraw_reg_canvas();
    _via_reg_canvas.focus();
    save_current_data_to_browser_cache();
    return;
  }

  // denotes a single click (= mouse down + mouse up)
  if ( click_dx < VIA_MOUSE_CLICK_TOL ||
       click_dy < VIA_MOUSE_CLICK_TOL ) {

    // if user is already drawing polygon, then each click adds a new point
    if ( _via_is_user_drawing_polygon ) {
      var canvas_x0 = Math.round(_via_click_x0);
      var canvas_y0 = Math.round(_via_click_y0);

      // check if the clicked point is close to the first point
      var fx0 = _via_canvas_regions[_via_current_polygon_region_id].shape_attributes['all_points_x'][0];
      var fy0 = _via_canvas_regions[_via_current_polygon_region_id].shape_attributes['all_points_y'][0];
      var  dx = (fx0 - canvas_x0);
      var  dy = (fy0 - canvas_y0);
      if ( Math.sqrt(dx*dx + dy*dy) <= VIA_POLYGON_VERTEX_MATCH_TOL ) {
        // user clicked on the first polygon point to close the path
        _via_is_user_drawing_polygon = false;

        // add all polygon points stored in _via_canvas_regions[]
        var all_points_x = _via_canvas_regions[_via_current_polygon_region_id].shape_attributes['all_points_x'].slice(0);
        var all_points_y = _via_canvas_regions[_via_current_polygon_region_id].shape_attributes['all_points_y'].slice(0);
        // close path
        all_points_x.push(all_points_x[0]);
        all_points_y.push(all_points_y[0]);

        var canvas_all_points_x = [];
        var canvas_all_points_y = [];

        //var points_str = '';
        for ( var i=0; i<all_points_x.length; ++i ) {
          all_points_x[i] = Math.round( all_points_x[i] * _via_canvas_scale );
          all_points_y[i] = Math.round( all_points_y[i] * _via_canvas_scale );

          canvas_all_points_x[i] = Math.round( all_points_x[i] / _via_canvas_scale );
          canvas_all_points_y[i] = Math.round( all_points_y[i] / _via_canvas_scale );

          //points_str += all_points_x[i] + ' ' + all_points_y[i] + ',';
        }
        //points_str = points_str.substring(0, points_str.length-1); // remove last comma

        var polygon_region = new ImageRegion();
        polygon_region.shape_attributes['name'] = 'polygon';
        //polygon_region.shape_attributes['points'] = points_str;
        polygon_region.shape_attributes['all_points_x'] = all_points_x;
        polygon_region.shape_attributes['all_points_y'] = all_points_y;
        _via_current_polygon_region_id = _via_img_metadata[_via_image_id].regions.length;
        _via_img_metadata[_via_image_id].regions.push(polygon_region);

        // update canvas
        _via_canvas_regions[_via_current_polygon_region_id].shape_attributes['all_points_x'] = canvas_all_points_x;
        _via_canvas_regions[_via_current_polygon_region_id].shape_attributes['all_points_y'] = canvas_all_points_y;

        // newly drawn region is automatically selected
        select_only_region(_via_current_polygon_region_id);

        _via_current_polygon_region_id = -1;
        save_current_data_to_browser_cache();
      } else {
        // user clicked on a new polygon point
        _via_canvas_regions[_via_current_polygon_region_id].shape_attributes['all_points_x'].push(canvas_x0);
        _via_canvas_regions[_via_current_polygon_region_id].shape_attributes['all_points_y'].push(canvas_y0);
      }
    } else {
      var region_id = is_inside_region(_via_click_x0, _via_click_y0);
      if ( region_id >= 0 ) {
        // first click selects region
        _via_user_sel_region_id     = region_id;
        _via_is_region_selected     = true;
        _via_is_user_moving_region  = false;
        _via_is_user_drawing_region = false;

        // de-select all other regions if the user has not pressed Shift
        if ( !e.shiftKey ) {
          toggle_all_regions_selection(false);
        }
        set_region_select_state(region_id, true);

      } else {
        if ( _via_is_user_drawing_region ) {
          // clear all region selection
          _via_is_user_drawing_region = false;
          _via_is_region_selected     = false;
          toggle_all_regions_selection(false);
        } else {
          switch (_via_current_shape) {
          case VIA_REGION_SHAPE.POLYGON:
            // user has clicked on the first point in a new polygon
            _via_is_user_drawing_polygon = true;

            var canvas_polygon_region = new ImageRegion();
            canvas_polygon_region.shape_attributes['name'] = VIA_REGION_SHAPE.POLYGON;
            canvas_polygon_region.shape_attributes['all_points_x'] = [Math.round(_via_click_x0)];
            canvas_polygon_region.shape_attributes['all_points_y'] = [Math.round(_via_click_y0)];
            _via_canvas_regions.push(canvas_polygon_region);
            _via_current_polygon_region_id =_via_canvas_regions.length - 1;
            break;

          case VIA_REGION_SHAPE.POINT:
            // user has marked a landmark point
            var point_region = new ImageRegion();
            point_region.shape_attributes['name'] = VIA_REGION_SHAPE.POINT;
            point_region.shape_attributes['cx'] = Math.round(_via_click_x0 * _via_canvas_scale);
            point_region.shape_attributes['cy'] = Math.round(_via_click_y0 * _via_canvas_scale);
            _via_img_metadata[_via_image_id].regions.push(point_region);

            var canvas_point_region = new ImageRegion();
            canvas_point_region.shape_attributes['name'] = VIA_REGION_SHAPE.POINT;
            canvas_point_region.shape_attributes['cx'] = Math.round(_via_click_x0);
            canvas_point_region.shape_attributes['cy'] = Math.round(_via_click_y0);
            _via_canvas_regions.push(canvas_point_region);
            save_current_data_to_browser_cache();
            break;
          }
        }
      }
    }
    _via_redraw_reg_canvas();
    _via_reg_canvas.focus();
    return;
  }

  // indicates that user has finished drawing a new region
  if ( _via_is_user_drawing_region ) {
    _via_is_user_drawing_region = false;

    var region_x0, region_y0, region_x1, region_y1;
    // ensure that (x0,y0) is top-left and (x1,y1) is bottom-right
    if ( _via_click_x0 < _via_click_x1 ) {
      region_x0 = _via_click_x0;
      region_x1 = _via_click_x1;
    } else {
      region_x0 = _via_click_x1;
      region_x1 = _via_click_x0;
    }

    if ( _via_click_y0 < _via_click_y1 ) {
      region_y0 = _via_click_y0;
      region_y1 = _via_click_y1;
    } else {
      region_y0 = _via_click_y1;
      region_y1 = _via_click_y0;
    }

    var original_img_region = new ImageRegion();
    var canvas_img_region = new ImageRegion();
    var region_dx = Math.abs(region_x1 - region_x0);
    var region_dy = Math.abs(region_y1 - region_y0);

    // newly drawn region is automatically selected
    toggle_all_regions_selection(false);
    original_img_region.is_user_selected = true;
    canvas_img_region.is_user_selected = true;
    _via_is_region_selected = true;
    _via_user_sel_region_id = _via_canvas_regions.length; // new region's id

    if ( region_dx > VIA_REGION_MIN_DIM ||
         region_dy > VIA_REGION_MIN_DIM ) { // avoid regions with 0 dim
        switch(_via_current_shape) {
        case VIA_REGION_SHAPE.RECT:
          if (_via_current_update_attribute_name == ""){
            //7/10
            document.getElementById("modal-1").classList.add("is-visible");
          break;
      }
          var x = Math.round(region_x0 * _via_canvas_scale);
          var y = Math.round(region_y0 * _via_canvas_scale);
          var width  = Math.round(region_dx * _via_canvas_scale);
          var height = Math.round(region_dy * _via_canvas_scale);
          original_img_region.shape_attributes['name'] = 'rect';
          original_img_region.shape_attributes['x'] = x;
          original_img_region.shape_attributes['y'] = y;
          original_img_region.shape_attributes['width'] = width;
          original_img_region.shape_attributes['height'] = height;

          //SAMIN added to pick the name after clicking a button
          original_img_region.region_attributes['name'] = _via_current_update_attribute_name;
          original_img_region.region_attributes['color'] = _via_class_names.get(_via_current_update_attribute_name)[1];
          //add count in the class names map
          var class_value_count = (_via_class_names.get(_via_current_update_attribute_name))[0];
          var class_value_color = (_via_class_names.get(_via_current_update_attribute_name))[1];

          _via_class_names.set(_via_current_update_attribute_name, [class_value_count+1, class_value_color]);

          //SAMIN update count
          //console.log(_via_current_update_attribute_name + "_num");

         update_count(_via_current_update_attribute_name);
          //document.getElementById(_via_current_update_attribute_name + "_num").innerHTML = getElementById(_via_current_update_attribute_name + "_num").value;
          

          canvas_img_region.shape_attributes['name'] = 'rect';
          canvas_img_region.shape_attributes['x'] = Math.round( x / _via_canvas_scale );
          canvas_img_region.shape_attributes['y'] = Math.round( y / _via_canvas_scale );
          canvas_img_region.shape_attributes['width'] = Math.round( width / _via_canvas_scale );
          canvas_img_region.shape_attributes['height'] = Math.round( height / _via_canvas_scale );
          canvas_img_region.region_attributes['name'] = _via_current_update_attribute_name;
          canvas_img_region.region_attributes['color'] = _via_class_names.get(_via_current_update_attribute_name)[1];
          //SAMIN come back here

          _via_img_metadata[_via_image_id].regions.push(original_img_region);
          _via_canvas_regions.push(canvas_img_region);
          break;

        case VIA_REGION_SHAPE.CIRCLE:
          var cx = Math.round(region_x0 * _via_canvas_scale);
          var cy = Math.round(region_y0 * _via_canvas_scale);
          var r  = Math.round( Math.sqrt(region_dx*region_dx + region_dy*region_dy) * _via_canvas_scale );

          original_img_region.shape_attributes['name'] = 'circle';
          original_img_region.shape_attributes['cx'] = cx;
          original_img_region.shape_attributes['cy'] = cy;
          original_img_region.shape_attributes['r'] = r;

          canvas_img_region.shape_attributes['name'] = 'circle';
          canvas_img_region.shape_attributes['cx'] = Math.round( cx / _via_canvas_scale );
          canvas_img_region.shape_attributes['cy'] = Math.round( cy / _via_canvas_scale );
          canvas_img_region.shape_attributes['r'] = Math.round( r / _via_canvas_scale );

          _via_img_metadata[_via_image_id].regions.push(original_img_region);
          _via_canvas_regions.push(canvas_img_region);
          break;

        case VIA_REGION_SHAPE.ELLIPSE:
          var cx = Math.round(region_x0 * _via_canvas_scale);
          var cy = Math.round(region_y0 * _via_canvas_scale);
          var rx = Math.round(region_dx * _via_canvas_scale);
          var ry = Math.round(region_dy * _via_canvas_scale);

          original_img_region.shape_attributes['name'] = 'ellipse';
          original_img_region.shape_attributes['cx'] = cx;
          original_img_region.shape_attributes['cy'] = cy;
          original_img_region.shape_attributes['rx'] = rx;
          original_img_region.shape_attributes['ry'] = ry;

          canvas_img_region.shape_attributes['name'] = 'ellipse';
          canvas_img_region.shape_attributes['cx'] = Math.round( cx / _via_canvas_scale );
          canvas_img_region.shape_attributes['cy'] = Math.round( cy / _via_canvas_scale );
          canvas_img_region.shape_attributes['rx'] = Math.round( rx / _via_canvas_scale );
          canvas_img_region.shape_attributes['ry'] = Math.round( ry / _via_canvas_scale );

          _via_img_metadata[_via_image_id].regions.push(original_img_region);
          _via_canvas_regions.push(canvas_img_region);
          break;

        case VIA_REGION_SHAPE.POLYGON:
          // handled by _via_is_user_drawing polygon
          break;
        }
    } else {
      show_message('Cannot add such a small region');
    }
    /*
    SAMIN
    update_attributes_panel();*/
    _via_redraw_reg_canvas();
    _via_reg_canvas.focus();

    save_current_data_to_browser_cache();
    return;
  }

});

_via_reg_canvas.addEventListener("mouseover", function(e) {
  // change the mouse cursor icon
  _via_redraw_reg_canvas();
  _via_reg_canvas.focus();

});

_via_reg_canvas.addEventListener("mouseout", function(e) {
  // change the mouse cursor icon
  //7/23
  if (_via_is_user_drawing_region){
    if (_via_current_shape == VIA_REGION_SHAPE.NONE){
    return;
  }

  _via_click_x1 = e.offsetX; _via_click_y1 = e.offsetY;

  var click_dx = Math.abs(_via_click_x1 - _via_click_x0);
  var click_dy = Math.abs(_via_click_y1 - _via_click_y0);

  // indicates that user has finished moving a region
  if ( _via_is_user_moving_region ) {
    _via_is_user_moving_region = false;
    _via_reg_canvas.style.cursor = "default";

    var move_x = Math.round(_via_click_x1 - _via_region_click_x);
    var move_y = Math.round(_via_click_y1 - _via_region_click_y);

    if (Math.abs(move_x) > VIA_MOUSE_CLICK_TOL ||
        Math.abs(move_y) > VIA_MOUSE_CLICK_TOL) {

      if (_via_img_metadata[_via_image_id].regions[_via_user_sel_region_id] == undefined){
        return;
      }

      var image_attr = _via_img_metadata[_via_image_id].regions[_via_user_sel_region_id].shape_attributes;

      var canvas_attr = _via_canvas_regions[_via_user_sel_region_id].shape_attributes;

      switch( canvas_attr['name'] ) {
      case VIA_REGION_SHAPE.RECT:
        var xnew = image_attr['x'] + Math.round(move_x * _via_canvas_scale);
        var ynew = image_attr['y'] + Math.round(move_y * _via_canvas_scale);
        image_attr['x'] = xnew;
        image_attr['y'] = ynew;
        canvas_attr['x'] = Math.round( image_attr['x'] / _via_canvas_scale);
        canvas_attr['y'] = Math.round( image_attr['y'] / _via_canvas_scale);

        
        break;

      case VIA_REGION_SHAPE.CIRCLE: // Fall-through
      case VIA_REGION_SHAPE.ELLIPSE: // Fall-through
      case VIA_REGION_SHAPE.POINT:
        var cxnew = image_attr['cx'] + Math.round(move_x * _via_canvas_scale);
        var cynew = image_attr['cy'] + Math.round(move_y * _via_canvas_scale);
        image_attr['cx'] = cxnew;
        image_attr['cy'] = cynew;

        canvas_attr['cx'] = Math.round( image_attr['cx'] / _via_canvas_scale);
        canvas_attr['cy'] = Math.round( image_attr['cy'] / _via_canvas_scale);
        break;

      case VIA_REGION_SHAPE.POLYGON:
        var img_px = image_attr['all_points_x'];
        var img_py = image_attr['all_points_y'];
        for (var i=0; i<img_px.length; ++i) {
          img_px[i] = img_px[i] + Math.round(move_x * _via_canvas_scale);
          img_py[i] = img_py[i] + Math.round(move_y * _via_canvas_scale);
        }

        var canvas_px = canvas_attr['all_points_x'];
        var canvas_py = canvas_attr['all_points_y'];
        for (var i=0; i<canvas_px.length; ++i) {
          canvas_px[i] = Math.round( img_px[i] / _via_canvas_scale );
          canvas_py[i] = Math.round( img_py[i] / _via_canvas_scale );
        }
        break;
      }
    } else {
      // indicates a user click on an already selected region
      // this could indicate a user's intention to select another
      // nested region within this region

      // traverse the canvas regions in alternating ascending
      // and descending order to solve the issue of nested regions
      var nested_region_id = is_inside_region(_via_click_x0, _via_click_y0, true);
      if (nested_region_id >= 0 &&
          nested_region_id !== _via_user_sel_region_id) {
        _via_user_sel_region_id = nested_region_id;
        _via_is_region_selected = true;
        _via_is_user_moving_region = false;

        // de-select all other regions if the user has not pressed Shift
        if ( !e.shiftKey ) {
          toggle_all_regions_selection(false);
        }
        set_region_select_state(nested_region_id, true);
      }
    }
    _via_redraw_reg_canvas();
    _via_reg_canvas.focus();
    save_current_data_to_browser_cache();
    return;
  }

  // indicates that user has finished resizing a region
  if ( _via_is_user_resizing_region ) {
    // _via_click(x0,y0) to _via_click(x1,y1)
    _via_is_user_resizing_region = false;
    _via_reg_canvas.style.cursor = "default";

    // update the region
    var region_id = _via_region_edge[0];
    var image_attr = _via_img_metadata[_via_image_id].regions[region_id].shape_attributes;
    var canvas_attr = _via_canvas_regions[region_id].shape_attributes;

    switch (canvas_attr['name']) {
    case VIA_REGION_SHAPE.RECT:
      var d = [canvas_attr['x'], canvas_attr['y'], 0, 0];
      d[2] = d[0] + canvas_attr['width'];
      d[3] = d[1] + canvas_attr['height'];

      var mx = _via_current_x;
      var my = _via_current_y;
      var preserve_aspect_ratio = false;

      // constrain (mx,my) to lie on a line connecting a diagonal of rectangle
      if ( _via_is_ctrl_pressed ) {
        preserve_aspect_ratio = true;
      }

      rect_update_corner(_via_region_edge[1], d, mx, my, preserve_aspect_ratio);
      rect_standardize_coordinates(d);

      var w = Math.abs(d[2] - d[0]);
      var h = Math.abs(d[3] - d[1]);

      image_attr['x'] = Math.round(d[0] * _via_canvas_scale);
      image_attr['y'] = Math.round(d[1] * _via_canvas_scale);
      image_attr['width'] = Math.round(w * _via_canvas_scale);
      image_attr['height'] = Math.round(h * _via_canvas_scale);

      canvas_attr['x'] = Math.round( image_attr['x'] / _via_canvas_scale);
      canvas_attr['y'] = Math.round( image_attr['y'] / _via_canvas_scale);
      canvas_attr['width'] = Math.round( image_attr['width'] / _via_canvas_scale);
      canvas_attr['height'] = Math.round( image_attr['height'] / _via_canvas_scale);
      break;

    case VIA_REGION_SHAPE.CIRCLE:
      var dx = Math.abs(canvas_attr['cx'] - _via_current_x);
      var dy = Math.abs(canvas_attr['cy'] - _via_current_y);
      var new_r = Math.sqrt( dx*dx + dy*dy );

      image_attr['r'] = Math.round(new_r * _via_canvas_scale);
      canvas_attr['r'] = Math.round( image_attr['r'] / _via_canvas_scale);
      break;

    case VIA_REGION_SHAPE.ELLIPSE:
      var new_rx = canvas_attr['rx'];
      var new_ry = canvas_attr['ry'];
      var dx = Math.abs(canvas_attr['cx'] - _via_current_x);
      var dy = Math.abs(canvas_attr['cy'] - _via_current_y);

      switch(_via_region_edge[1]) {
      case 5:
        new_ry = dy;
        break;

      case 6:
        new_rx = dx;
        break;

      default:
        new_rx = dx;
        new_ry = dy;
        break;
      }

      image_attr['rx'] = Math.round(new_rx * _via_canvas_scale);
      image_attr['ry'] = Math.round(new_ry * _via_canvas_scale);

      canvas_attr['rx'] = Math.round(image_attr['rx'] / _via_canvas_scale);
      canvas_attr['ry'] = Math.round(image_attr['ry'] / _via_canvas_scale);
      break;

    case VIA_REGION_SHAPE.POLYGON:
      var moved_vertex_id = _via_region_edge[1] - VIA_POLYGON_RESIZE_VERTEX_OFFSET;

      var imx = Math.round(_via_current_x * _via_canvas_scale);
      var imy = Math.round(_via_current_y * _via_canvas_scale);
      image_attr['all_points_x'][moved_vertex_id] = imx;
      image_attr['all_points_y'][moved_vertex_id] = imy;
      canvas_attr['all_points_x'][moved_vertex_id] = Math.round( imx / _via_canvas_scale );
      canvas_attr['all_points_y'][moved_vertex_id] = Math.round( imy / _via_canvas_scale );

      if (moved_vertex_id === 0) {
        // move both first and last vertex because we
        // the initial point at the end to close path
        var n = canvas_attr['all_points_x'].length;
        image_attr['all_points_x'][n-1] = imx;
        image_attr['all_points_y'][n-1] = imy;
        canvas_attr['all_points_x'][n-1] = Math.round( imx / _via_canvas_scale );
        canvas_attr['all_points_y'][n-1] = Math.round( imy / _via_canvas_scale );
      }
      break;
    }

    _via_redraw_reg_canvas();
    _via_reg_canvas.focus();
    save_current_data_to_browser_cache();
    return;
  }

  // denotes a single click (= mouse down + mouse up)
  if ( click_dx < VIA_MOUSE_CLICK_TOL ||
       click_dy < VIA_MOUSE_CLICK_TOL ) {

    // if user is already drawing polygon, then each click adds a new point
    if ( _via_is_user_drawing_polygon ) {
      var canvas_x0 = Math.round(_via_click_x0);
      var canvas_y0 = Math.round(_via_click_y0);

      // check if the clicked point is close to the first point
      var fx0 = _via_canvas_regions[_via_current_polygon_region_id].shape_attributes['all_points_x'][0];
      var fy0 = _via_canvas_regions[_via_current_polygon_region_id].shape_attributes['all_points_y'][0];
      var  dx = (fx0 - canvas_x0);
      var  dy = (fy0 - canvas_y0);
      if ( Math.sqrt(dx*dx + dy*dy) <= VIA_POLYGON_VERTEX_MATCH_TOL ) {
        // user clicked on the first polygon point to close the path
        _via_is_user_drawing_polygon = false;

        // add all polygon points stored in _via_canvas_regions[]
        var all_points_x = _via_canvas_regions[_via_current_polygon_region_id].shape_attributes['all_points_x'].slice(0);
        var all_points_y = _via_canvas_regions[_via_current_polygon_region_id].shape_attributes['all_points_y'].slice(0);
        // close path
        all_points_x.push(all_points_x[0]);
        all_points_y.push(all_points_y[0]);

        var canvas_all_points_x = [];
        var canvas_all_points_y = [];

        //var points_str = '';
        for ( var i=0; i<all_points_x.length; ++i ) {
          all_points_x[i] = Math.round( all_points_x[i] * _via_canvas_scale );
          all_points_y[i] = Math.round( all_points_y[i] * _via_canvas_scale );

          canvas_all_points_x[i] = Math.round( all_points_x[i] / _via_canvas_scale );
          canvas_all_points_y[i] = Math.round( all_points_y[i] / _via_canvas_scale );

          //points_str += all_points_x[i] + ' ' + all_points_y[i] + ',';
        }
        //points_str = points_str.substring(0, points_str.length-1); // remove last comma

        var polygon_region = new ImageRegion();
        polygon_region.shape_attributes['name'] = 'polygon';
        //polygon_region.shape_attributes['points'] = points_str;
        polygon_region.shape_attributes['all_points_x'] = all_points_x;
        polygon_region.shape_attributes['all_points_y'] = all_points_y;
        _via_current_polygon_region_id = _via_img_metadata[_via_image_id].regions.length;
        _via_img_metadata[_via_image_id].regions.push(polygon_region);

        // update canvas
        _via_canvas_regions[_via_current_polygon_region_id].shape_attributes['all_points_x'] = canvas_all_points_x;
        _via_canvas_regions[_via_current_polygon_region_id].shape_attributes['all_points_y'] = canvas_all_points_y;

        // newly drawn region is automatically selected
        select_only_region(_via_current_polygon_region_id);

        _via_current_polygon_region_id = -1;
        save_current_data_to_browser_cache();
      } else {
        // user clicked on a new polygon point
        _via_canvas_regions[_via_current_polygon_region_id].shape_attributes['all_points_x'].push(canvas_x0);
        _via_canvas_regions[_via_current_polygon_region_id].shape_attributes['all_points_y'].push(canvas_y0);
      }
    } else {
      var region_id = is_inside_region(_via_click_x0, _via_click_y0);
      if ( region_id >= 0 ) {
        // first click selects region
        _via_user_sel_region_id     = region_id;
        _via_is_region_selected     = true;
        _via_is_user_moving_region  = false;
        _via_is_user_drawing_region = false;

        // de-select all other regions if the user has not pressed Shift
        if ( !e.shiftKey ) {
          toggle_all_regions_selection(false);
        }
        set_region_select_state(region_id, true);

      } else {
        if ( _via_is_user_drawing_region ) {
          // clear all region selection
          _via_is_user_drawing_region = false;
          _via_is_region_selected     = false;
          toggle_all_regions_selection(false);
        } else {
          switch (_via_current_shape) {
          case VIA_REGION_SHAPE.POLYGON:
            // user has clicked on the first point in a new polygon
            _via_is_user_drawing_polygon = true;

            var canvas_polygon_region = new ImageRegion();
            canvas_polygon_region.shape_attributes['name'] = VIA_REGION_SHAPE.POLYGON;
            canvas_polygon_region.shape_attributes['all_points_x'] = [Math.round(_via_click_x0)];
            canvas_polygon_region.shape_attributes['all_points_y'] = [Math.round(_via_click_y0)];
            _via_canvas_regions.push(canvas_polygon_region);
            _via_current_polygon_region_id =_via_canvas_regions.length - 1;
            break;

          case VIA_REGION_SHAPE.POINT:
            // user has marked a landmark point
            var point_region = new ImageRegion();
            point_region.shape_attributes['name'] = VIA_REGION_SHAPE.POINT;
            point_region.shape_attributes['cx'] = Math.round(_via_click_x0 * _via_canvas_scale);
            point_region.shape_attributes['cy'] = Math.round(_via_click_y0 * _via_canvas_scale);
            _via_img_metadata[_via_image_id].regions.push(point_region);

            var canvas_point_region = new ImageRegion();
            canvas_point_region.shape_attributes['name'] = VIA_REGION_SHAPE.POINT;
            canvas_point_region.shape_attributes['cx'] = Math.round(_via_click_x0);
            canvas_point_region.shape_attributes['cy'] = Math.round(_via_click_y0);
            _via_canvas_regions.push(canvas_point_region);
            save_current_data_to_browser_cache();
            break;
          }
        }
      }
    }
    _via_redraw_reg_canvas();
    _via_reg_canvas.focus();
    return;
  }

  // indicates that user has finished drawing a new region
  if ( _via_is_user_drawing_region ) {
    _via_is_user_drawing_region = false;

    var region_x0, region_y0, region_x1, region_y1;
    // ensure that (x0,y0) is top-left and (x1,y1) is bottom-right
    if ( _via_click_x0 < _via_click_x1 ) {
      region_x0 = _via_click_x0;
      region_x1 = _via_click_x1;
    } else {
      region_x0 = _via_click_x1;
      region_x1 = _via_click_x0;
    }

    if ( _via_click_y0 < _via_click_y1 ) {
      region_y0 = _via_click_y0;
      region_y1 = _via_click_y1;
    } else {
      region_y0 = _via_click_y1;
      region_y1 = _via_click_y0;
    }

    var original_img_region = new ImageRegion();
    var canvas_img_region = new ImageRegion();
    var region_dx = Math.abs(region_x1 - region_x0);
    var region_dy = Math.abs(region_y1 - region_y0);

    // newly drawn region is automatically selected
    toggle_all_regions_selection(false);
    original_img_region.is_user_selected = true;
    canvas_img_region.is_user_selected = true;
    _via_is_region_selected = true;
    _via_user_sel_region_id = _via_canvas_regions.length; // new region's id

    if ( region_dx > VIA_REGION_MIN_DIM ||
         region_dy > VIA_REGION_MIN_DIM ) { // avoid regions with 0 dim
        switch(_via_current_shape) {
        case VIA_REGION_SHAPE.RECT:
          if (_via_current_update_attribute_name == ""){
            //7/10
            document.getElementById("modal-1").classList.add("is-visible");
          break;
      }
          var x = Math.round(region_x0 * _via_canvas_scale);
          var y = Math.round(region_y0 * _via_canvas_scale);
          var width  = Math.round(region_dx * _via_canvas_scale);
          var height = Math.round(region_dy * _via_canvas_scale);
          original_img_region.shape_attributes['name'] = 'rect';
          original_img_region.shape_attributes['x'] = x;
          original_img_region.shape_attributes['y'] = y;
          original_img_region.shape_attributes['width'] = width;
          original_img_region.shape_attributes['height'] = height;

          //SAMIN added to pick the name after clicking a button
          original_img_region.region_attributes['name'] = _via_current_update_attribute_name;
          original_img_region.region_attributes['color'] = _via_class_names.get(_via_current_update_attribute_name)[1];
          //add count in the class names map
          var class_value_count = (_via_class_names.get(_via_current_update_attribute_name))[0];
          var class_value_color = (_via_class_names.get(_via_current_update_attribute_name))[1];

          _via_class_names.set(_via_current_update_attribute_name, [class_value_count+1, class_value_color]);

          //SAMIN update count
          //console.log(_via_current_update_attribute_name + "_num");

         update_count(_via_current_update_attribute_name);
          //document.getElementById(_via_current_update_attribute_name + "_num").innerHTML = getElementById(_via_current_update_attribute_name + "_num").value;
          

          canvas_img_region.shape_attributes['name'] = 'rect';
          canvas_img_region.shape_attributes['x'] = Math.round( x / _via_canvas_scale );
          canvas_img_region.shape_attributes['y'] = Math.round( y / _via_canvas_scale );
          canvas_img_region.shape_attributes['width'] = Math.round( width / _via_canvas_scale );
          canvas_img_region.shape_attributes['height'] = Math.round( height / _via_canvas_scale );
          canvas_img_region.region_attributes['name'] = _via_current_update_attribute_name;
          canvas_img_region.region_attributes['color'] = _via_class_names.get(_via_current_update_attribute_name)[1];
          //SAMIN come back here

          _via_img_metadata[_via_image_id].regions.push(original_img_region);
          _via_canvas_regions.push(canvas_img_region);
          break;

        case VIA_REGION_SHAPE.CIRCLE:
          var cx = Math.round(region_x0 * _via_canvas_scale);
          var cy = Math.round(region_y0 * _via_canvas_scale);
          var r  = Math.round( Math.sqrt(region_dx*region_dx + region_dy*region_dy) * _via_canvas_scale );

          original_img_region.shape_attributes['name'] = 'circle';
          original_img_region.shape_attributes['cx'] = cx;
          original_img_region.shape_attributes['cy'] = cy;
          original_img_region.shape_attributes['r'] = r;

          canvas_img_region.shape_attributes['name'] = 'circle';
          canvas_img_region.shape_attributes['cx'] = Math.round( cx / _via_canvas_scale );
          canvas_img_region.shape_attributes['cy'] = Math.round( cy / _via_canvas_scale );
          canvas_img_region.shape_attributes['r'] = Math.round( r / _via_canvas_scale );

          _via_img_metadata[_via_image_id].regions.push(original_img_region);
          _via_canvas_regions.push(canvas_img_region);
          break;

        case VIA_REGION_SHAPE.ELLIPSE:
          var cx = Math.round(region_x0 * _via_canvas_scale);
          var cy = Math.round(region_y0 * _via_canvas_scale);
          var rx = Math.round(region_dx * _via_canvas_scale);
          var ry = Math.round(region_dy * _via_canvas_scale);

          original_img_region.shape_attributes['name'] = 'ellipse';
          original_img_region.shape_attributes['cx'] = cx;
          original_img_region.shape_attributes['cy'] = cy;
          original_img_region.shape_attributes['rx'] = rx;
          original_img_region.shape_attributes['ry'] = ry;

          canvas_img_region.shape_attributes['name'] = 'ellipse';
          canvas_img_region.shape_attributes['cx'] = Math.round( cx / _via_canvas_scale );
          canvas_img_region.shape_attributes['cy'] = Math.round( cy / _via_canvas_scale );
          canvas_img_region.shape_attributes['rx'] = Math.round( rx / _via_canvas_scale );
          canvas_img_region.shape_attributes['ry'] = Math.round( ry / _via_canvas_scale );

          _via_img_metadata[_via_image_id].regions.push(original_img_region);
          _via_canvas_regions.push(canvas_img_region);
          break;

        case VIA_REGION_SHAPE.POLYGON:
          // handled by _via_is_user_drawing polygon
          break;
        }
    } else {
      show_message('Cannot add such a small region');
    }
    /*
    SAMIN
    update_attributes_panel();*/
    _via_redraw_reg_canvas();
    _via_reg_canvas.focus();

    save_current_data_to_browser_cache();
    return;
  }
  }
  console.log(_via_is_user_drawing_region);
  return;
  
});

_via_reg_canvas.addEventListener('mousemove', function(e) {

  if ( !_via_current_image_loaded ) {
    return;
  }
  
  _via_current_x = e.offsetX; _via_current_y = e.offsetY;

  if ( _via_is_region_selected ) {
    if ( !_via_is_user_resizing_region ) {
      // check if user moved mouse cursor to region boundary
      // which indicates an intention to resize the region

      _via_region_edge = is_on_region_corner(_via_current_x, _via_current_y);

      if ( _via_region_edge[0] === _via_user_sel_region_id ) {
        switch(_via_region_edge[1]) {
          // rect
        case 1: // Fall-through // top-left corner of rect
        case 3: // bottom-right corner of rect
          _via_reg_canvas.style.cursor = "nwse-resize";
          break;
        case 2: // Fall-through // top-right corner of rect
        case 4: // bottom-left corner of rect
          _via_reg_canvas.style.cursor = "nesw-resize";
          break;

          // circle and ellipse
        case 5:
          _via_reg_canvas.style.cursor = "n-resize";
          break;
        case 6:
          _via_reg_canvas.style.cursor = "e-resize";
          break;

        default:
          _via_reg_canvas.style.cursor = "default";
          break;
        }

        if (_via_region_edge[1] >= VIA_POLYGON_RESIZE_VERTEX_OFFSET) {
          // indicates mouse over polygon vertex
          _via_reg_canvas.style.cursor = "crosshair";
        }
      } else {
        //7/9
        if (_via_current_update_attribute_name == ""){
          //7/10
          var yes = false;
        }
        else{
        var yes = is_inside_this_region(_via_current_x,
                                        _via_current_y,
                                        _via_user_sel_region_id);
      }
        if (yes) {
          _via_reg_canvas.style.cursor = "move";

        } else {
          _via_reg_canvas.style.cursor = "default";
        }
      }
    }
  }

  if(_via_is_user_drawing_region) {
    // draw region as the user drags the mouse cursor
    if (_via_canvas_regions.length) {
      _via_redraw_reg_canvas(); // clear old intermediate rectangle
    } else {
      // first region being drawn, just clear the full region canvas
      _via_reg_ctx.clearRect(0, 0, _via_reg_canvas.width, _via_reg_canvas.height);
    }

    var region_x0, region_y0;

    if ( _via_click_x0 < _via_current_x ) {
      if ( _via_click_y0 < _via_current_y ) {
        region_x0 = _via_click_x0;
        region_y0 = _via_click_y0;
      } else {
        region_x0 = _via_click_x0;
        region_y0 = _via_current_y;
      }
    } else {
      if ( _via_click_y0 < _via_current_y ) {
        region_x0 = _via_current_x;
        region_y0 = _via_click_y0;
      } else {
        region_x0 = _via_current_x;
        region_y0 = _via_current_y;
      }
    }
    var dx = Math.round(Math.abs(_via_current_x - _via_click_x0));
    var dy = Math.round(Math.abs(_via_current_y - _via_click_y0));

    switch (_via_current_shape ) {
    case VIA_REGION_SHAPE.RECT:
    //Samin color palette fix?
      if (_via_current_update_attribute_name == ""){
        //7/10
        break;
      }
      VIA_THEME_BOUNDARY_FILL_COLOR = _via_class_names.get(_via_current_update_attribute_name)[1];
      VIA_THEME_BOUNDARY_LINE_COLOR   = _via_class_names.get(_via_current_update_attribute_name)[1];
      _via_draw_rect_region(region_x0, region_y0, dx, dy, false);
      break;

    case VIA_REGION_SHAPE.CIRCLE:
      var circle_radius = Math.round(Math.sqrt( dx*dx + dy*dy ));
      _via_draw_circle_region(region_x0, region_y0, circle_radius, false);
      break;

    case VIA_REGION_SHAPE.ELLIPSE:
      _via_draw_ellipse_region(region_x0, region_y0, dx, dy, false);
      break;

    case VIA_REGION_SHAPE.POLYGON:
      // this is handled by the if ( _via_is_user_drawing_polygon ) { ... }
      // see below
      break;
    }
    _via_reg_canvas.focus();
  }

  if ( _via_is_user_resizing_region ) {
    // user has clicked mouse on bounding box edge and is now moving it
    // draw region as the user drags the mouse coursor
    if (_via_canvas_regions.length) {
      _via_redraw_reg_canvas(); // clear old intermediate rectangle
    } else {
      // first region being drawn, just clear the full region canvas
      _via_reg_ctx.clearRect(0, 0, _via_reg_canvas.width, _via_reg_canvas.height);
    }

    var region_id = _via_region_edge[0];
    var attr = _via_canvas_regions[region_id].shape_attributes;
    //7/11 lets get the color right when transitioning
    VIA_THEME_BOUNDARY_LINE_COLOR = _via_canvas_regions[region_id].region_attributes.color;
    switch (attr['name']) {
    case VIA_REGION_SHAPE.RECT:
      // original rectangle
      var d = [attr['x'], attr['y'], 0, 0];
      d[2] = d[0] + attr['width'];
      d[3] = d[1] + attr['height'];

      var mx = _via_current_x;
      var my = _via_current_y;
      var preserve_aspect_ratio = false;

      // constrain (mx,my) to lie on a line connecting a diagonal of rectangle
      if ( _via_is_ctrl_pressed ) {
        preserve_aspect_ratio = true;
      }

      rect_update_corner(_via_region_edge[1], d, mx, my, preserve_aspect_ratio);
      rect_standardize_coordinates(d);

      var w = Math.abs(d[2] - d[0]);
      var h = Math.abs(d[3] - d[1]);
      _via_draw_rect_region(d[0], d[1], w, h, true);
      break;

    case VIA_REGION_SHAPE.CIRCLE:
      var dx = Math.abs(attr['cx'] - _via_current_x);
      var dy = Math.abs(attr['cy'] - _via_current_y);
      var new_r = Math.sqrt( dx*dx + dy*dy );
      _via_draw_circle_region(attr['cx'],
                              attr['cy'],
                              new_r,
                              true);
      break;

    case VIA_REGION_SHAPE.ELLIPSE:
      var new_rx = attr['rx'];
      var new_ry = attr['ry'];
      var dx = Math.abs(attr['cx'] - _via_current_x);
      var dy = Math.abs(attr['cy'] - _via_current_y);
      switch(_via_region_edge[1]) {
      case 5:
        new_ry = dy;
        break;

      case 6:
        new_rx = dx;
        break;

      default:
        new_rx = dx;
        new_ry = dy;
        break;
      }
      _via_draw_ellipse_region(attr['cx'],
                               attr['cy'],
                               new_rx,
                               new_ry,
                               true);
      break;

    case VIA_REGION_SHAPE.POLYGON:
      var moved_all_points_x = attr['all_points_x'].slice(0);
      var moved_all_points_y = attr['all_points_y'].slice(0);
      var moved_vertex_id = _via_region_edge[1] - VIA_POLYGON_RESIZE_VERTEX_OFFSET;

      moved_all_points_x[moved_vertex_id] = _via_current_x;
      moved_all_points_y[moved_vertex_id] = _via_current_y;

      if (moved_vertex_id === 0) {
        // move both first and last vertex because we
        // the initial point at the end to close path
        moved_all_points_x[moved_all_points_x.length-1] = _via_current_x;
        moved_all_points_y[moved_all_points_y.length-1] = _via_current_y;
      }

      _via_draw_polygon_region(moved_all_points_x,
                               moved_all_points_y,
                               true);
      break;
    }
    _via_reg_canvas.focus();
  }

  if ( _via_is_user_moving_region ) {
    // draw region as the user drags the mouse coursor

    if (_via_canvas_regions.length) {
      _via_redraw_reg_canvas(); // clear old intermediate rectangle
    } else {
      // first region being drawn, just clear the full region canvas
      _via_reg_ctx.clearRect(0, 0, _via_reg_canvas.width, _via_reg_canvas.height);
    }

    var move_x = (_via_current_x - _via_region_click_x);
    var move_y = (_via_current_y - _via_region_click_y);
    //7/9
    if (_via_canvas_regions[_via_user_sel_region_id] == undefined){
      return;
    }
    var attr = _via_canvas_regions[_via_user_sel_region_id].shape_attributes;
    VIA_THEME_BOUNDARY_LINE_COLOR = _via_canvas_regions[_via_user_sel_region_id].region_attributes.color;

    switch (attr['name']) {
    case VIA_REGION_SHAPE.RECT:
      _via_draw_rect_region(attr['x'] + move_x,
                            attr['y'] + move_y,
                            attr['width'],
                            attr['height'],
                            true);
      break;

    case VIA_REGION_SHAPE.CIRCLE:
      _via_draw_circle_region(attr['cx'] + move_x,
                              attr['cy'] + move_y,
                              attr['r'],
                              true);
      break;

    case VIA_REGION_SHAPE.ELLIPSE:
      _via_draw_ellipse_region(attr['cx'] + move_x,
                               attr['cy'] + move_y,
                               attr['rx'],
                               attr['ry'],
                               true);
      break;

    case VIA_REGION_SHAPE.POLYGON:
      var moved_all_points_x = attr['all_points_x'].slice(0);
      var moved_all_points_y = attr['all_points_y'].slice(0);
      for (var i=0; i<moved_all_points_x.length; ++i) {
        moved_all_points_x[i] += move_x;
        moved_all_points_y[i] += move_y;
      }
      _via_draw_polygon_region(moved_all_points_x,
                               moved_all_points_y,
                               true);
      break;

    case VIA_REGION_SHAPE.POINT:
      _via_draw_point_region(attr['cx'] + move_x,
                             attr['cy'] + move_y,
                             true);
      break;
    }
    _via_reg_canvas.focus();
    return;
  }

  if ( _via_is_user_drawing_polygon ) {
    _via_redraw_reg_canvas();
    var attr = _via_canvas_regions[_via_current_polygon_region_id].shape_attributes;
    var all_points_x = attr['all_points_x'];
    var all_points_y = attr['all_points_y'];
    var npts = all_points_x.length;

    var line_x = [all_points_x.slice(npts-1), _via_current_x];
    var line_y = [all_points_y.slice(npts-1), _via_current_y];
    _via_draw_polygon_region(line_x, line_y, false);
  }
});


//
// Canvas update routines
//
function _via_redraw_img_canvas() {
  if (_via_current_image_loaded) {
    _via_img_ctx.clearRect(0, 0, _via_img_canvas.width, _via_img_canvas.height);
    _via_img_ctx.drawImage(_via_current_image, 0, 0,
                           _via_img_canvas.width, _via_img_canvas.height);
  }
}

function _via_redraw_reg_canvas() {
  if (_via_current_image_loaded) {
    if ( _via_canvas_regions.length > 0 ) {
      _via_reg_ctx.clearRect(0, 0, _via_reg_canvas.width, _via_reg_canvas.height);
      if (_via_is_region_boundary_visible) {
        //VIA_THEME_BOUNDARY_FILL_COLOR = _via_class_names.get(_via_current_update_attribute_name)[1];
        draw_all_regions();
      }

      if (_via_is_region_id_visible) {
        //SAMIN names are on this function 6/20
        draw_all_region_id();
      }
    }
  }
}

function _via_clear_reg_canvas() {
  _via_reg_ctx.clearRect(0, 0, _via_reg_canvas.width, _via_reg_canvas.height);
}

//7/20 find out how to name only
function draw_all_regions() {
  for (var i=0; i < _via_canvas_regions.length; ++i) {
    var attr = _via_canvas_regions[i].shape_attributes;
    var is_selected = _via_canvas_regions[i].is_user_selected;
    var region_name = _via_canvas_regions[i].region_attributes["name"];
    //6/21
    //var colorattr = _via_class_names.get(region_name)[1];
    //SAMIN work on color palette here
    switch( attr['name'] ) {
    case VIA_REGION_SHAPE.RECT:
    //6/21
    //maybe change the global variable here?
    //7/16
    //console.log(_via_class_names);
    //console.log(_via_class_names.get(region_name)[1]);
    if (_via_class_names.get(region_name) == undefined){
      break;
    }
    VIA_THEME_BOUNDARY_FILL_COLOR = _via_class_names.get(region_name)[1];
    VIA_THEME_BOUNDARY_LINE_COLOR = _via_class_names.get(region_name)[1];
      _via_draw_rect_region(attr['x'],
                            attr['y'],
                            attr['width'],
                            attr['height'],
                            is_selected);

      //7/20
      if (is_selected){
    var canvas_reg = _via_canvas_regions[i];

    var bbox = get_region_bounding_box(canvas_reg);
    var x = bbox[0];
    var y = bbox[1];
    var w = Math.abs(bbox[2] - bbox[0]);
    _via_reg_ctx.font = VIA_THEME_ATTRIBUTE_VALUE_FONT;

    var annotation_str  = (i+1).toString();
    var bgnd_rect_width = _via_reg_ctx.measureText(annotation_str).width * 2;

    var char_width  = _via_reg_ctx.measureText('M').width;
    var char_height = 1.8 * char_width;

    var r = _via_img_metadata[_via_image_id].regions[i].region_attributes;
    if ( true ) {
      // show the attribute value
      //for (var key in r) {
        annotation_str = r["name"];
      //}
      var strw = _via_reg_ctx.measureText(annotation_str).width;

      if ( false ) {
        // if text overflows, crop it
        var str_max     = Math.floor((w * annotation_str.length) / strw);
        annotation_str  = annotation_str.substr(0, str_max-1) + '.';
        bgnd_rect_width = w;
      } else {
        bgnd_rect_width = strw + char_width;
      }
    }

    if (canvas_reg.shape_attributes['name'] === VIA_REGION_SHAPE.POLYGON) {
      // put label near the first vertex
      x = canvas_reg.shape_attributes['all_points_x'][0];
      y = canvas_reg.shape_attributes['all_points_y'][0];
    } else {
      // center the label
      x = x - (bgnd_rect_width/2 - w/2);
    }

    // first, draw a background rectangle first
    _via_reg_ctx.fillStyle = 'black';
    _via_reg_ctx.globalAlpha = 0.8;
    _via_reg_ctx.fillRect(Math.floor(x),
                          Math.floor(y - 1.1*char_height),
                          Math.floor(bgnd_rect_width),
                          Math.floor(char_height));

    // then, draw text over this background rectangle
    _via_reg_ctx.globalAlpha = 1.0;
    _via_reg_ctx.fillStyle = 'yellow';
    _via_reg_ctx.fillText(annotation_str,
                          Math.floor(x + 0.4*char_width),
                          Math.floor(y - 0.35*char_height));
  }
      break;

    case VIA_REGION_SHAPE.CIRCLE:
      _via_draw_circle_region(attr['cx'],
                              attr['cy'],
                              attr['r'],
                              is_selected);
      break;

    case VIA_REGION_SHAPE.ELLIPSE:
      _via_draw_ellipse_region(attr['cx'],
                               attr['cy'],
                               attr['rx'],
                               attr['ry'],
                               is_selected);
      break;

    case VIA_REGION_SHAPE.POLYGON:
      _via_draw_polygon_region(attr['all_points_x'],
                               attr['all_points_y'],
                               is_selected);
      break;

    case VIA_REGION_SHAPE.POINT:
      _via_draw_point_region(attr['cx'],
                             attr['cy'],
                             is_selected);
      break;
    }
  }
}

// control point for resize of region boundaries
function _via_draw_control_point(cx, cy) {
  _via_reg_ctx.beginPath();
  _via_reg_ctx.arc(cx, cy, VIA_REGION_POINT_RADIUS, 0, 2*Math.PI, false);
  _via_reg_ctx.closePath();

  _via_reg_ctx.fillStyle = "white";
  //_via_reg_ctx.globalAlpha = 1.0;
  _via_reg_ctx.fill();
}

function _via_draw_rect_region(x, y, w, h, is_selected) {
  //7/9 opacity is determined by globalalpha
  if (is_selected) {
    _via_draw_rect(x, y, w, h);
    //SAMIN rect colors may be manipulated here
    //7/10
    _via_reg_ctx.strokeStyle = VIA_THEME_BOUNDARY_LINE_COLOR;
    _via_reg_ctx.lineWidth   = VIA_THEME_REGION_BOUNDARY_WIDTH;
    _via_reg_ctx.stroke();

    //7/20 perhaps we can work in the name here

    _via_reg_ctx.fillStyle   = VIA_THEME_SEL_REGION_FILL_COLOR;
    _via_reg_ctx.globalAlpha = VIA_THEME_SEL_REGION_OPACITY;
    _via_reg_ctx.fill();
    _via_reg_ctx.globalAlpha = 1.0;

    _via_draw_control_point(x  ,   y);
    _via_draw_control_point(x+w, y+h);
    _via_draw_control_point(x  , y+h);
    _via_draw_control_point(x+w,   y);

  } else {
    // draw a fill line
    _via_reg_ctx.strokeStyle = VIA_THEME_BOUNDARY_FILL_COLOR;
    _via_reg_ctx.lineWidth   = VIA_THEME_REGION_BOUNDARY_WIDTH/4;
    _via_draw_rect(x, y, w, h);
    _via_reg_ctx.stroke();

    if ( w > VIA_THEME_REGION_BOUNDARY_WIDTH &&
         h > VIA_THEME_REGION_BOUNDARY_WIDTH ) {

      // draw a boundary line on both sides of the fill line
      _via_reg_ctx.strokeStyle = VIA_THEME_BOUNDARY_LINE_COLOR;
      _via_reg_ctx.lineWidth   = VIA_THEME_REGION_BOUNDARY_WIDTH/16;
      _via_draw_rect(x,
                     y,
                     w,
                     h);
      _via_reg_ctx.stroke();

      _via_draw_rect(x,
                     y,
                     w,
                     h);
      _via_reg_ctx.stroke();
    }

  }
}

function _via_draw_rect(x, y, w, h) {
  _via_reg_ctx.beginPath();
  _via_reg_ctx.moveTo(x  , y);
  _via_reg_ctx.lineTo(x+w, y);
  _via_reg_ctx.lineTo(x+w, y+h);
  _via_reg_ctx.lineTo(x  , y+h);
  _via_reg_ctx.closePath();
}

function _via_draw_circle_region(cx, cy, r, is_selected) {
  if (is_selected) {
    _via_draw_circle(cx, cy, r);

    _via_reg_ctx.strokeStyle = VIA_THEME_SEL_REGION_FILL_BOUNDARY_COLOR;
    _via_reg_ctx.lineWidth   = VIA_THEME_REGION_BOUNDARY_WIDTH/2;
    _via_reg_ctx.stroke();

    _via_reg_ctx.fillStyle   = VIA_THEME_SEL_REGION_FILL_COLOR;
    _via_reg_ctx.globalAlpha = VIA_THEME_SEL_REGION_OPACITY;
    _via_reg_ctx.fill();
    _via_reg_ctx.globalAlpha = 1.0;

    _via_draw_control_point(cx + r, cy);
  } else {
    // draw a fill line
    _via_reg_ctx.strokeStyle = VIA_THEME_BOUNDARY_FILL_COLOR;
    _via_reg_ctx.lineWidth   = VIA_THEME_REGION_BOUNDARY_WIDTH/2;
    _via_draw_circle(cx, cy, r);
    _via_reg_ctx.stroke();

    if ( r > VIA_THEME_REGION_BOUNDARY_WIDTH ) {
      // draw a boundary line on both sides of the fill line
      _via_reg_ctx.strokeStyle = VIA_THEME_BOUNDARY_LINE_COLOR;
      _via_reg_ctx.lineWidth   = VIA_THEME_REGION_BOUNDARY_WIDTH/4;
      _via_draw_circle(cx, cy,
                       r - VIA_THEME_REGION_BOUNDARY_WIDTH/2);
      _via_reg_ctx.stroke();
      _via_draw_circle(cx, cy,
                       r + VIA_THEME_REGION_BOUNDARY_WIDTH/2);
      _via_reg_ctx.stroke();
    }
  }
}

function _via_draw_circle(cx, cy, r) {
  _via_reg_ctx.beginPath();
  _via_reg_ctx.arc(cx, cy, r, 0, 2*Math.PI, false);
  _via_reg_ctx.closePath();
}

function _via_draw_ellipse_region(cx, cy, rx, ry, is_selected) {
  if (is_selected) {
    _via_draw_ellipse(cx, cy, rx, ry);

    _via_reg_ctx.strokeStyle = VIA_THEME_SEL_REGION_FILL_BOUNDARY_COLOR;
    _via_reg_ctx.lineWidth   = VIA_THEME_REGION_BOUNDARY_WIDTH/2;
    _via_reg_ctx.stroke();

    _via_reg_ctx.fillStyle   = VIA_THEME_SEL_REGION_FILL_COLOR;
    _via_reg_ctx.globalAlpha = VIA_THEME_SEL_REGION_OPACITY;
    _via_reg_ctx.fill();
    _via_reg_ctx.globalAlpha = 1.0;

    _via_draw_control_point(cx + rx, cy);
    _via_draw_control_point(cx     , cy - ry);
  } else {
    // draw a fill line
    _via_reg_ctx.strokeStyle = VIA_THEME_BOUNDARY_FILL_COLOR;
    _via_reg_ctx.lineWidth   = VIA_THEME_REGION_BOUNDARY_WIDTH/2;
    _via_draw_ellipse(cx, cy, rx, ry);
    _via_reg_ctx.stroke();

    if ( rx > VIA_THEME_REGION_BOUNDARY_WIDTH &&
         ry > VIA_THEME_REGION_BOUNDARY_WIDTH ) {
      // draw a boundary line on both sides of the fill line
      _via_reg_ctx.strokeStyle = VIA_THEME_BOUNDARY_LINE_COLOR;
      _via_reg_ctx.lineWidth   = VIA_THEME_REGION_BOUNDARY_WIDTH/4;
      _via_draw_ellipse(cx, cy,
                        rx + VIA_THEME_REGION_BOUNDARY_WIDTH/2,
                        ry + VIA_THEME_REGION_BOUNDARY_WIDTH/2);
      _via_reg_ctx.stroke();
      _via_draw_ellipse(cx, cy,
                        rx - VIA_THEME_REGION_BOUNDARY_WIDTH/2,
                        ry - VIA_THEME_REGION_BOUNDARY_WIDTH/2);
      _via_reg_ctx.stroke();
    }
  }
}

function _via_draw_ellipse(cx, cy, rx, ry) {
  _via_reg_ctx.save();

  _via_reg_ctx.beginPath();
  _via_reg_ctx.translate(cx-rx, cy-ry);
  _via_reg_ctx.scale(rx, ry);
  _via_reg_ctx.arc(1, 1, 1, 0, 2 * Math.PI, false);

  _via_reg_ctx.restore(); // restore to original state
  _via_reg_ctx.closePath();

}

function _via_draw_polygon_region(all_points_x, all_points_y, is_selected) {
  if ( is_selected ) {
    _via_reg_ctx.beginPath();
    _via_reg_ctx.moveTo(all_points_x[0], all_points_y[0]);
    for ( var i=1; i < all_points_x.length; ++i ) {
      _via_reg_ctx.lineTo(all_points_x[i], all_points_y[i]);
    }
    _via_reg_ctx.strokeStyle = VIA_THEME_SEL_REGION_FILL_BOUNDARY_COLOR;
    _via_reg_ctx.lineWidth   = VIA_THEME_REGION_BOUNDARY_WIDTH/2;
    _via_reg_ctx.stroke();

    _via_reg_ctx.fillStyle   = VIA_THEME_SEL_REGION_FILL_COLOR;
    _via_reg_ctx.globalAlpha = VIA_THEME_SEL_REGION_OPACITY;
    _via_reg_ctx.fill();
    _via_reg_ctx.globalAlpha = 1.0;

    for ( var i=1; i < all_points_x.length; ++i ) {
      _via_draw_control_point(all_points_x[i], all_points_y[i]);
    }
  } else {
    for ( var i=1; i < all_points_x.length; ++i ) {
      // draw a fill line
      _via_reg_ctx.strokeStyle = VIA_THEME_BOUNDARY_FILL_COLOR;
      _via_reg_ctx.lineWidth   = VIA_THEME_REGION_BOUNDARY_WIDTH/2;
      _via_reg_ctx.beginPath();
      _via_reg_ctx.moveTo(all_points_x[i-1], all_points_y[i-1]);
      _via_reg_ctx.lineTo(all_points_x[i]  , all_points_y[i]);
      _via_reg_ctx.stroke();

      var slope_i = (all_points_y[i] - all_points_y[i-1]) / (all_points_x[i] - all_points_x[i-1]);
      if ( slope_i > 0 ) {
        // draw a boundary line on both sides
        _via_reg_ctx.strokeStyle = VIA_THEME_BOUNDARY_LINE_COLOR;
        _via_reg_ctx.lineWidth   = VIA_THEME_REGION_BOUNDARY_WIDTH/4;
        _via_reg_ctx.beginPath();
        _via_reg_ctx.moveTo(parseInt(all_points_x[i-1]) - parseInt(VIA_THEME_REGION_BOUNDARY_WIDTH/4),
                            parseInt(all_points_y[i-1]) + parseInt(VIA_THEME_REGION_BOUNDARY_WIDTH/4));
        _via_reg_ctx.lineTo(parseInt(all_points_x[i]) - parseInt(VIA_THEME_REGION_BOUNDARY_WIDTH/4),
                            parseInt(all_points_y[i]) + parseInt(VIA_THEME_REGION_BOUNDARY_WIDTH/4));
        _via_reg_ctx.stroke();
        _via_reg_ctx.beginPath();
        _via_reg_ctx.moveTo(parseInt(all_points_x[i-1]) + parseInt(VIA_THEME_REGION_BOUNDARY_WIDTH/4),
                            parseInt(all_points_y[i-1]) - parseInt(VIA_THEME_REGION_BOUNDARY_WIDTH/4));
        _via_reg_ctx.lineTo(parseInt(all_points_x[i]) + parseInt(VIA_THEME_REGION_BOUNDARY_WIDTH/4),
                            parseInt(all_points_y[i]) - parseInt(VIA_THEME_REGION_BOUNDARY_WIDTH/4));
        _via_reg_ctx.stroke();
      } else {
        // draw a boundary line on both sides
        _via_reg_ctx.strokeStyle = VIA_THEME_BOUNDARY_LINE_COLOR;
        _via_reg_ctx.lineWidth   = VIA_THEME_REGION_BOUNDARY_WIDTH/4;
        _via_reg_ctx.beginPath();
        _via_reg_ctx.moveTo(parseInt(all_points_x[i-1]) + parseInt(VIA_THEME_REGION_BOUNDARY_WIDTH/4),
                            parseInt(all_points_y[i-1]) + parseInt(VIA_THEME_REGION_BOUNDARY_WIDTH/4));
        _via_reg_ctx.lineTo(parseInt(all_points_x[i]) + parseInt(VIA_THEME_REGION_BOUNDARY_WIDTH/4),
                            parseInt(all_points_y[i]) + parseInt(VIA_THEME_REGION_BOUNDARY_WIDTH/4));
        _via_reg_ctx.stroke();
        _via_reg_ctx.beginPath();
        _via_reg_ctx.moveTo(parseInt(all_points_x[i-1]) - parseInt(VIA_THEME_REGION_BOUNDARY_WIDTH/4),
                            parseInt(all_points_y[i-1]) - parseInt(VIA_THEME_REGION_BOUNDARY_WIDTH/4));
        _via_reg_ctx.lineTo(parseInt(all_points_x[i]) - parseInt(VIA_THEME_REGION_BOUNDARY_WIDTH/4),
                            parseInt(all_points_y[i]) - parseInt(VIA_THEME_REGION_BOUNDARY_WIDTH/4));
        _via_reg_ctx.stroke();
      }
    }
  }
}

function _via_draw_point_region(cx, cy, is_selected) {
  if (is_selected) {
    _via_draw_point(cx, cy, VIA_REGION_POINT_RADIUS);

    _via_reg_ctx.strokeStyle = VIA_THEME_SEL_REGION_FILL_BOUNDARY_COLOR;
    _via_reg_ctx.lineWidth   = VIA_THEME_REGION_BOUNDARY_WIDTH/2;
    _via_reg_ctx.stroke();

    _via_reg_ctx.fillStyle   = VIA_THEME_SEL_REGION_FILL_COLOR;
    _via_reg_ctx.globalAlpha = VIA_THEME_SEL_REGION_OPACITY;
    _via_reg_ctx.fill();
    _via_reg_ctx.globalAlpha = 1.0;
  } else {
    // draw a fill line
    _via_reg_ctx.strokeStyle = VIA_THEME_BOUNDARY_FILL_COLOR;
    _via_reg_ctx.lineWidth   = VIA_THEME_REGION_BOUNDARY_WIDTH/2;
    _via_draw_point(cx, cy, VIA_REGION_POINT_RADIUS);
    _via_reg_ctx.stroke();

    // draw a boundary line on both sides of the fill line
    _via_reg_ctx.strokeStyle = VIA_THEME_BOUNDARY_LINE_COLOR;
    _via_reg_ctx.lineWidth   = VIA_THEME_REGION_BOUNDARY_WIDTH/4;
    _via_draw_point(cx, cy,
                    VIA_REGION_POINT_RADIUS - VIA_THEME_REGION_BOUNDARY_WIDTH/2);
    _via_reg_ctx.stroke();
    _via_draw_point(cx, cy,
                    VIA_REGION_POINT_RADIUS + VIA_THEME_REGION_BOUNDARY_WIDTH/2);
    _via_reg_ctx.stroke();
  }
}

function _via_draw_point(cx, cy, r) {
  _via_reg_ctx.beginPath();
  _via_reg_ctx.arc(cx, cy, r, 0, 2*Math.PI, false);
  _via_reg_ctx.closePath();
}

//7/20 lets make this work for a single region
function draw_all_region_id() {
  _via_reg_ctx.shadowColor = "transparent";
  for ( var i = 0; i < _via_img_metadata[_via_image_id].regions.length; ++i ) {
    var canvas_reg = _via_canvas_regions[i];

    var bbox = get_region_bounding_box(canvas_reg);
    var x = bbox[0];
    var y = bbox[1];
    var w = Math.abs(bbox[2] - bbox[0]);
    _via_reg_ctx.font = VIA_THEME_ATTRIBUTE_VALUE_FONT;

    var annotation_str  = (i+1).toString();
    var bgnd_rect_width = _via_reg_ctx.measureText(annotation_str).width * 2;

    var char_width  = _via_reg_ctx.measureText('M').width;
    var char_height = 1.8 * char_width;

    var r = _via_img_metadata[_via_image_id].regions[i].region_attributes;
    if ( true ) {
      // show the attribute value
      //for (var key in r) {
        annotation_str = r["name"];
      //}
      var strw = _via_reg_ctx.measureText(annotation_str).width;

      if ( false ) {
        // if text overflows, crop it
        var str_max     = Math.floor((w * annotation_str.length) / strw);
        annotation_str  = annotation_str.substr(0, str_max-1) + '.';
        bgnd_rect_width = w;
      } else {
        bgnd_rect_width = strw + char_width;
      }
    }

    if (canvas_reg.shape_attributes['name'] === VIA_REGION_SHAPE.POLYGON) {
      // put label near the first vertex
      x = canvas_reg.shape_attributes['all_points_x'][0];
      y = canvas_reg.shape_attributes['all_points_y'][0];
    } else {
      // center the label
      x = x - (bgnd_rect_width/2 - w/2);
    }

    // first, draw a background rectangle first
    _via_reg_ctx.fillStyle = 'black';
    _via_reg_ctx.globalAlpha = 0.8;
    _via_reg_ctx.fillRect(Math.floor(x),
                          Math.floor(y - 1.1*char_height),
                          Math.floor(bgnd_rect_width),
                          Math.floor(char_height));

    // then, draw text over this background rectangle
    _via_reg_ctx.globalAlpha = 1.0;
    _via_reg_ctx.fillStyle = 'yellow';
    _via_reg_ctx.fillText(annotation_str,
                          Math.floor(x + 0.4*char_width),
                          Math.floor(y - 0.35*char_height));

  }
}

function get_region_bounding_box(region) {
  var d = region.shape_attributes;
  var bbox = new Array(4);

  switch( d['name'] ) {
  case 'rect':
    bbox[0] = d['x'];
    bbox[1] = d['y'];
    bbox[2] = d['x'] + d['width'];
    bbox[3] = d['y'] + d['height'];
    break;

  case 'circle':
    bbox[0] = d['cx'] - d['r'];
    bbox[1] = d['cy'] - d['r'];
    bbox[2] = d['cx'] + d['r'];
    bbox[3] = d['cy'] + d['r'];
    break;

  case 'ellipse':
    bbox[0] = d['cx'] - d['rx'];
    bbox[1] = d['cy'] - d['ry'];
    bbox[2] = d['cx'] + d['rx'];
    bbox[3] = d['cy'] + d['ry'];
    break;

  case 'polygon':
    var all_points_x = d['all_points_x'];
    var all_points_y = d['all_points_y'];

    var minx = Number.MAX_SAFE_INTEGER;
    var miny = Number.MAX_SAFE_INTEGER;
    var maxx = 0;
    var maxy = 0;
    for ( var i=0; i < all_points_x.length; ++i ) {
      if ( all_points_x[i] < minx ) {
        minx = all_points_x[i];
      }
      if ( all_points_x[i] > maxx ) {
        maxx = all_points_x[i];
      }
      if ( all_points_y[i] < miny ) {
        miny = all_points_y[i];
      }
      if ( all_points_y[i] > maxy ) {
        maxy = all_points_y[i];
      }
    }
    bbox[0] = minx;
    bbox[1] = miny;
    bbox[2] = maxx;
    bbox[3] = maxy;
    break;

  case 'point':
    bbox[0] = d['cx'] - VIA_REGION_POINT_RADIUS;
    bbox[1] = d['cy'] - VIA_REGION_POINT_RADIUS;
    bbox[2] = d['cx'] + VIA_REGION_POINT_RADIUS;
    bbox[3] = d['cy'] + VIA_REGION_POINT_RADIUS;
    break;
  }
  return bbox;
}

//
// Region collision routines
//
function is_inside_region(px, py, descending_order) {
  var N = _via_canvas_regions.length;
  if ( N === 0 ) {
    return -1;
  }
  var start, end, del;
  // traverse the canvas regions in alternating ascending
  // and descending order to solve the issue of nested regions
  if ( descending_order ) {
    start = N - 1;
    end   = -1;
    del   = -1;
  } else {
    start = 0;
    end   = N;
    del   = 1;
  }

  var i = start;
  while ( i !== end ) {
    var yes = is_inside_this_region(px, py, i);
    if (yes) {
      return i;
    }
    i = i + del;
  }
  return -1;
}

function is_inside_this_region(px, py, region_id) {
  if (_via_current_shape == VIA_REGION_SHAPE.NONE){
    return;
  }
  //7/9
  if (_via_canvas_regions[region_id] == undefined){
    return;
  }
  var attr   = _via_canvas_regions[region_id].shape_attributes;
  var result = false;
  switch ( attr['name'] ) {
  case VIA_REGION_SHAPE.RECT:
    result = is_inside_rect(attr['x'],
                            attr['y'],
                            attr['width'],
                            attr['height'],
                            px, py);
    break;

  case VIA_REGION_SHAPE.CIRCLE:
    result = is_inside_circle(attr['cx'],
                              attr['cy'],
                              attr['r'],
                              px, py);
    break;

  case VIA_REGION_SHAPE.ELLIPSE:
    result = is_inside_ellipse(attr['cx'],
                               attr['cy'],
                               attr['rx'],
                               attr['ry'],
                               px, py);
    break;

  case VIA_REGION_SHAPE.POLYGON:
    result = is_inside_polygon(attr['all_points_x'],
                               attr['all_points_y'],
                               px, py);
    break;

  case VIA_REGION_SHAPE.POINT:
    result = is_inside_point(attr['cx'],
                             attr['cy'],
                             px, py);
    break;
  }
  return result;
}

function is_inside_circle(cx, cy, r, px, py) {
  var dx = px - cx;
  var dy = py - cy;
  return (dx * dx + dy * dy) < r * r;
}

function is_inside_rect(x, y, w, h, px, py) {
  return px > x &&
    px < (x + w) &&
    py > y &&
    py < (y + h);
}

function is_inside_ellipse(cx, cy, rx, ry, px, py) {
  var dx = (cx - px);
  var dy = (cy - py);
  return ((dx * dx) / (rx * rx)) + ((dy * dy) / (ry * ry)) < 1;
}

// returns 0 when (px,py) is outside the polygon
// source: http://geomalgorithms.com/a03-_inclusion.html
function is_inside_polygon(all_points_x, all_points_y, px, py) {
  var wn = 0;    // the  winding number counter

  // loop through all edges of the polygon
  for ( var i = 0; i < all_points_x.length-1; ++i ) {   // edge from V[i] to  V[i+1]
    var is_left_value = is_left( all_points_x[i], all_points_y[i],
                                 all_points_x[i+1], all_points_y[i+1],
                                 px, py);

    if (all_points_y[i] <= py) {
      if (all_points_y[i+1]  > py && is_left_value > 0) {
        ++wn;
      }
    }
    else {
      if (all_points_y[i+1]  <= py && is_left_value < 0) {
        --wn;
      }
    }
  }
  if ( wn === 0 ) {
    return 0;
  }
  else {
    return 1;
  }
}

function is_inside_point(cx, cy, px, py) {
  var dx = px - cx;
  var dy = py - cy;
  var r2 = VIA_POLYGON_VERTEX_MATCH_TOL * VIA_POLYGON_VERTEX_MATCH_TOL;
  return (dx * dx + dy * dy) < r2;
}

// returns
// >0 if (x2,y2) lies on the left side of line joining (x0,y0) and (x1,y1)
// =0 if (x2,y2) lies on the line joining (x0,y0) and (x1,y1)
// >0 if (x2,y2) lies on the right side of line joining (x0,y0) and (x1,y1)
// source: http://geomalgorithms.com/a03-_inclusion.html
function is_left(x0, y0, x1, y1, x2, y2) {
  return ( ((x1 - x0) * (y2 - y0))  - ((x2 -  x0) * (y1 - y0)) );
}

function is_on_region_corner(px, py) {
  var _via_region_edge = [-1, -1]; // region_id, corner_id [top-left=1,top-right=2,bottom-right=3,bottom-left=4]

  for ( var i = 0; i < _via_canvas_regions.length; ++i ) {
    var attr = _via_canvas_regions[i].shape_attributes;
    var result = false;
    _via_region_edge[0] = i;

    switch ( attr['name'] ) {
    case VIA_REGION_SHAPE.RECT:
      result = is_on_rect_edge(attr['x'],
                               attr['y'],
                               attr['width'],
                               attr['height'],
                               px, py);
      break;

    case VIA_REGION_SHAPE.CIRCLE:
      result = is_on_circle_edge(attr['cx'],
                                 attr['cy'],
                                 attr['r'],
                                 px, py);
      break;

    case VIA_REGION_SHAPE.ELLIPSE:
      result = is_on_ellipse_edge(attr['cx'],
                                  attr['cy'],
                                  attr['rx'],
                                  attr['ry'],
                                  px, py);
      break;

    case VIA_REGION_SHAPE.POLYGON:
      result = is_on_polygon_vertex(attr['all_points_x'],
                                    attr['all_points_y'],
                                    px, py);
      break;

    case VIA_REGION_SHAPE.POINT:
      // since there are no edges of a point
      result = 0;
      break;
    }

    if (result > 0) {
      _via_region_edge[1] = result;
      return _via_region_edge;
    }
  }
  _via_region_edge[0] = -1;
  return _via_region_edge;
}

function is_on_rect_edge(x, y, w, h, px, py) {
  var dx0 = Math.abs(x - px);
  var dy0 = Math.abs(y - py);
  var dx1 = Math.abs(x + w - px);
  var dy1 = Math.abs(y + h - py);

  //[top-left=1,top-right=2,bottom-right=3,bottom-left=4]
  if ( dx0 < VIA_REGION_EDGE_TOL &&
       dy0 < VIA_REGION_EDGE_TOL ) {
    return 1;
  }
  if ( dx1 < VIA_REGION_EDGE_TOL &&
       dy0 < VIA_REGION_EDGE_TOL ) {
    return 2;
  }
  if ( dx1 < VIA_REGION_EDGE_TOL &&
       dy1 < VIA_REGION_EDGE_TOL ) {
    return 3;
  }

  if ( dx0 < VIA_REGION_EDGE_TOL &&
       dy1 < VIA_REGION_EDGE_TOL ) {
    return 4;
  }
  return 0;
}

function is_on_circle_edge(cx, cy, r, px, py) {
  var dx = cx - px;
  var dy = cy - py;
  if ( Math.abs(Math.sqrt( dx*dx + dy*dy ) - r) < VIA_REGION_EDGE_TOL ) {
    var theta = Math.atan2( py - cy, px - cx );
    if ( Math.abs(theta - (Math.PI/2)) < VIA_THETA_TOL ||
         Math.abs(theta + (Math.PI/2)) < VIA_THETA_TOL) {
      return 5;
    }
    if ( Math.abs(theta) < VIA_THETA_TOL ||
         Math.abs(Math.abs(theta) - Math.PI) < VIA_THETA_TOL) {
      return 6;
    }

    if ( theta > 0 && theta < (Math.PI/2) ) {
      return 1;
    }
    if ( theta > (Math.PI/2) && theta < (Math.PI) ) {
      return 4;
    }
    if ( theta < 0 && theta > -(Math.PI/2) ) {
      return 2;
    }
    if ( theta < -(Math.PI/2) && theta > -Math.PI ) {
      return 3;
    }
  } else {
    return 0;
  }
}

function is_on_ellipse_edge(cx, cy, rx, ry, px, py) {
  var dx = (cx - px)/rx;
  var dy = (cy - py)/ry;

  if ( Math.abs(Math.sqrt( dx*dx + dy*dy ) - 1) < VIA_ELLIPSE_EDGE_TOL ) {
    var theta = Math.atan2( py - cy, px - cx );
    if ( Math.abs(theta - (Math.PI/2)) < VIA_THETA_TOL ||
         Math.abs(theta + (Math.PI/2)) < VIA_THETA_TOL) {
      return 5;
    }
    if ( Math.abs(theta) < VIA_THETA_TOL ||
         Math.abs(Math.abs(theta) - Math.PI) < VIA_THETA_TOL) {
      return 6;
    }
  } else {
    return 0;
  }
}

function is_on_polygon_vertex(all_points_x, all_points_y, px, py) {
  var n = all_points_x.length;
  for (var i=0; i<n; ++i) {
    if ( Math.abs(all_points_x[i] - px) < VIA_POLYGON_VERTEX_MATCH_TOL &&
         Math.abs(all_points_y[i] - py) < VIA_POLYGON_VERTEX_MATCH_TOL ) {
      return (VIA_POLYGON_RESIZE_VERTEX_OFFSET+i);
    }
  }
  return 0;
}

function rect_standardize_coordinates(d) {
  // d[x0,y0,x1,y1]
  // ensures that (d[0],d[1]) is top-left corner while
  // (d[2],d[3]) is bottom-right corner
  if ( d[0] > d[2] ) {
    // swap
    var t = d[0];
    d[0] = d[2];
    d[2] = t;
  }

  if ( d[1] > d[3] ) {
    // swap
    var t = d[1];
    d[1] = d[3];
    d[3] = t;
  }
}

function rect_update_corner(corner_id, d, x, y, preserve_aspect_ratio) {
  // pre-condition : d[x0,y0,x1,y1] is standardized
  // post-condition : corner is moved ( d may not stay standardized )
  if (preserve_aspect_ratio) {
    switch(corner_id) {
    case 1: // Fall-through // top-left
    case 3: // bottom-right
      var dx = d[2] - d[0];
      var dy = d[3] - d[1];
      var norm = Math.sqrt( dx*dx + dy*dy );
      var nx = dx / norm; // x component of unit vector along the diagonal of rect
      var ny = dy / norm; // y component
      var proj = (x - d[0]) * nx + (y - d[1]) * ny;
      var proj_x = nx * proj;
      var proj_y = ny * proj;
      // constrain (mx,my) to lie on a line connecting (x0,y0) and (x1,y1)
      x = Math.round( d[0] + proj_x );
      y = Math.round( d[1] + proj_y );
      break;

    case 2: // Fall-through // top-right
    case 4: // bottom-left
      var dx = d[2] - d[0];
      var dy = d[1] - d[3];
      var norm = Math.sqrt( dx*dx + dy*dy );
      var nx = dx / norm; // x component of unit vector along the diagonal of rect
      var ny = dy / norm; // y component
      var proj = (x - d[0]) * nx + (y - d[3]) * ny;
      var proj_x = nx * proj;
      var proj_y = ny * proj;
      // constrain (mx,my) to lie on a line connecting (x0,y0) and (x1,y1)
      x = Math.round( d[0] + proj_x );
      y = Math.round( d[3] + proj_y );
      break;
    }
  }

  switch(corner_id) {
  case 1: // top-left
    d[0] = x;
    d[1] = y;
    break;

  case 3: // bottom-right
    d[2] = x;
    d[3] = y;
    break;

  case 2: // top-right
    d[2] = x;
    d[1] = y;
    break;

  case 4: // bottom-left
    d[0] = x;
    d[3] = y;
    break;
  }
}

function _via_update_ui_components() {
  if ( !_via_is_window_resized && _via_current_image_loaded ) {
    //show_message('Resizing window ...');
    set_all_text_panel_display('none');
    show_all_canvas();

    _via_is_window_resized = true;
    show_image(_via_image_index);

    if (_via_is_canvas_zoomed) {
      reset_zoom_level();
    }
  }
}

//
// Shortcut key handlers
//

window.addEventListener('keyup', function(e) {

  //7/23 exception for the enter button
  //lets also make this blur the box
  if (_via_enter_key){
    if (event.keyCode === 13) {
        addClass(document.getElementById('add_class').value);
        document.getElementById("add_class").blur();
    }
  }

  if (_via_is_user_updating_attribute_value ||
      _via_is_user_updating_attribute_name  ||
      _via_is_user_adding_attribute_name) {

    return;
  }

  if ( e.which === 17 ) { // Ctrl key
    _via_is_ctrl_pressed = false;
  }
});

window.addEventListener('keydown', function(e) {
  if (_via_is_user_updating_attribute_value ||
      _via_is_user_updating_attribute_name  ||
      _via_is_user_adding_attribute_name) {

    return;
  }

  // user commands
  if ( e.ctrlKey ) {
    _via_is_ctrl_pressed = true;
    if ( e.which === 83 ) { // Ctrl + s
      download_all_region_data('csv');
      e.preventDefault();
      return;
    }

    if ( e.which === 65 ) { // Ctrl + a
      sel_all_regions();
      e.preventDefault();
      return;
    }

    if ( e.which === 67 ) { // Ctrl + c
      if (_via_is_region_selected ||
          _via_is_all_region_selected) {
        copy_sel_regions();
        e.preventDefault();
      }
      return;
    }

    if ( e.which === 86 ) { // Ctrl + v
      paste_sel_regions();
      e.preventDefault();
      return;
    }
  }

  if( e.which === 46 || e.which === 8) { // Del or Backspace
    del_sel_regions();
    e.preventDefault();
  }
  if (e.which === 78 || e.which === 39) { // n or right arrow
    move_to_next_image();
    if (_via_image_id == "cars.png62201"){
      document.getElementById("image_name").innerHTML = "lot.jpeg";
    }
    if (_via_image_id == "lot.jpeg71862"){
      document.getElementById("image_name").innerHTML = "outside.jpeg";
    }
    if (_via_image_id == "outside.jpeg21513"){
      document.getElementById("image_name").innerHTML = "cars.png";
    }

    e.preventDefault();
    return;
  }
  if (e.which === 80 || e.which === 37) { // n or right arrow
    move_to_prev_image();
    if (_via_image_id == "cars.png62201"){
      document.getElementById("image_name").innerHTML = "outside.jpeg";
    }
    if (_via_image_id == "lot.jpeg71862"){
      document.getElementById("image_name").innerHTML = "cars.png";
    }
    if (_via_image_id == "outside.jpeg21513"){
      document.getElementById("image_name").innerHTML = "lot.jpeg";
    }
    e.preventDefault();
    return;
  }
  if (e.which === 32 && _via_current_image_loaded) { // Space
    //SAMIN toggle_img_list();
    e.preventDefault();
    return;
  }

  // zoom
  if (_via_current_image_loaded) {
    // see: http://www.javascripter.net/faq/keycodes.htm
    if (e.which === 61 || e.which === 187) { // + for zoom in
      if (e.shiftKey) {
        zoom_in();
      } else {  // = for zoom reset
        reset_zoom_level();
      }
      return;
    }

    if (e.which === 173 || e.which === 189) { // - for zoom out
      zoom_out();
      return;
    }
  }

  if ( e.which === 27 ) { // Esc
    if (_via_is_user_updating_attribute_value ||
        _via_is_user_updating_attribute_name ||
        _via_is_user_adding_attribute_name) {

      _via_is_user_updating_attribute_value = false;
      _via_is_user_updating_attribute_name = false;
      _via_is_user_adding_attribute_name = false;
      /*
      SAMIN
      update_attributes_panel();*/
    }

    if ( _via_is_user_resizing_region ) {
      // cancel region resizing action
      _via_is_user_resizing_region = false;
    }

    if ( _via_is_region_selected ) {
      // clear all region selections
      _via_is_region_selected = false;
      _via_user_sel_region_id = -1;
      toggle_all_regions_selection(false);
    }

    if ( _via_is_user_drawing_polygon ) {
      _via_is_user_drawing_polygon = false;
      _via_canvas_regions.splice(_via_current_polygon_region_id, 1);
    }

    if ( _via_is_user_drawing_region ) {
      _via_is_user_drawing_region = false;
    }

    if ( _via_is_user_resizing_region ) {
      _via_is_user_resizing_region = false
    }

    if ( _via_is_user_updating_attribute_name ||
         _via_is_user_updating_attribute_value) {
      _via_is_user_updating_attribute_name = false;
      _via_is_user_updating_attribute_value = false;

    }

    if ( _via_is_user_moving_region ) {
      _via_is_user_moving_region = false
    }

    e.preventDefault();
    _via_redraw_reg_canvas();
    return;
  }
  if (e.which === 112) { // F1 for help
    show_getting_started_panel();
    e.preventDefault();
    return;
  }
  if (e.which === 113) { // F2 for about
    show_about_panel();
    e.preventDefault();
    return;
  }
});

//
// Mouse wheel event listener
//
window.addEventListener('wheel', function(e) {
  if (!_via_current_image_loaded) {
    return;
  }

  if (e.ctrlKey) {
    if (e.deltaY < 0) {
      zoom_in();
    } else {
      zoom_out();
    }
    e.preventDefault();
  }
});

//this count should probably only reflect the class objects in the current canvas
//7/16
function update_count(className){
  document.getElementById(className + "_num").innerHTML = " (" + _via_class_names.get(className)[0] + ")";
}

//SAMIN our goal here should be to try to update our map when he delete items
function del_sel_regions() {
  if ( !_via_current_image_loaded ) {
    show_message('First load some images!');
    return;
  }

  var del_region_count = 0;
  if ( _via_is_all_region_selected ) {
    del_region_count = _via_canvas_regions.length;
    _via_canvas_regions.splice(0);
    _via_img_metadata[_via_image_id].regions.splice(0);
  } else {
    var sorted_sel_reg_id = [];
    var selected_class
    for ( var i = 0; i < _via_canvas_regions.length; ++i ) {
      if ( _via_canvas_regions[i].is_user_selected ) {
        //whilst going through these indices lets also look at the map entries
       // console.log(_via_img_metdata[_via_image_id].regions);
       selected_class = _via_canvas_regions[i].region_attributes["name"];
        _via_class_names.set(selected_class, 
          [(_via_class_names.get(selected_class)[0]-1),
          _via_class_names.get(selected_class)[1]]);

        update_count(selected_class);

        sorted_sel_reg_id.push(i);

      }
    }

    sorted_sel_reg_id.sort( function(a,b) {
      return (b-a);
    });
    for ( var i = 0; i < sorted_sel_reg_id.length; ++i ) {
      _via_canvas_regions.splice( sorted_sel_reg_id[i], 1);
      _via_img_metadata[_via_image_id].regions.splice( sorted_sel_reg_id[i], 1);
      del_region_count += 1;
    }
  }

  _via_is_all_region_selected = false;
  _via_is_region_selected     = false;
  _via_user_sel_region_id     = -1;

  if ( _via_canvas_regions.length === 0 ) {
    // all regions were deleted, hence clear region canvas
    _via_clear_reg_canvas();
  } else {
    _via_redraw_reg_canvas();
  }
  _via_reg_canvas.focus();
  /*
  SAMIN
  update_attributes_panel();*/
  save_current_data_to_browser_cache();

  show_message('Deleted ' + del_region_count + ' selected regions');
}

function sel_all_regions() {
  if (!_via_current_image_loaded) {
    show_message('First load some images!');
    return;
  }

  toggle_all_regions_selection(true);
  _via_is_all_region_selected = true;
  _via_redraw_reg_canvas();
}

function copy_sel_regions() {
  if (!_via_current_image_loaded) {
    show_message('First load some images!');
    return;
  }

  if (_via_is_region_selected ||
      _via_is_all_region_selected) {
    _via_copied_image_regions.splice(0);
    for ( var i = 0; i < _via_img_metadata[_via_image_id].regions.length; ++i ) {
      var img_region = _via_img_metadata[_via_image_id].regions[i];
      var canvas_region = _via_canvas_regions[i];
      if ( canvas_region.is_user_selected ) {
        _via_copied_image_regions.push( clone_image_region(img_region) );
      }
    }
    show_message('Copied ' + _via_copied_image_regions.length +
                 ' selected regions. Press Ctrl + v to paste');
  } else {
    show_message('Select a region first!');
  }
}

function paste_sel_regions() {
  if ( !_via_current_image_loaded ) {
    show_message('First load some images!');
    return;
  }

  if ( _via_copied_image_regions.length ) {
    var pasted_reg_count = 0;
    for ( var i = 0; i < _via_copied_image_regions.length; ++i ) {
      // ensure copied the regions are within this image's boundaries
      var bbox = get_region_bounding_box( _via_copied_image_regions[i] );
      if (bbox[2] < _via_current_image_width &&
          bbox[3] < _via_current_image_height) {
        var r = clone_image_region(_via_copied_image_regions[i]);
        _via_img_metadata[_via_image_id].regions.push(r);

        pasted_reg_count += 1;
      }
    }
    _via_load_canvas_regions();
    var discarded_reg_count = _via_copied_image_regions.length - pasted_reg_count;
    show_message('Pasted ' + pasted_reg_count + ' regions. ' +
                 'Discarded ' + discarded_reg_count + ' regions exceeding image boundary.');
    _via_redraw_reg_canvas();
    _via_reg_canvas.focus();
  } else {
    show_message('To paste a region, you first need to select a region and copy it!');
  }
}

function move_to_prev_image() {
  if (_via_img_count > 0) {
    _via_is_region_selected = false;
    _via_user_sel_region_id = -1;

    if (_via_is_canvas_zoomed) {
      _via_is_canvas_zoomed = false;
      _via_canvas_zoom_level_index = VIA_CANVAS_DEFAULT_ZOOM_LEVEL_INDEX;
      var zoom_scale = VIA_CANVAS_ZOOM_LEVELS[_via_canvas_zoom_level_index];
      set_all_canvas_scale(zoom_scale);
      set_all_canvas_size(_via_canvas_width, _via_canvas_height);
      _via_canvas_scale = _via_canvas_scale_without_zoom;
    }

    var current_img_index = _via_image_index;
    if ( _via_image_index === 0 ) {
      show_image(_via_img_count - 1);
    } else {
      show_image(_via_image_index - 1);
    }

    if (typeof _via_hook_prev_image === 'function') {
      _via_hook_prev_image(current_img_index);
    }
  }
}

function move_to_next_image() {
  if (_via_img_count > 0) {
    _via_is_region_selected = false;
    _via_user_sel_region_id = -1;

    if (_via_is_canvas_zoomed) {
      _via_is_canvas_zoomed = false;
      _via_canvas_zoom_level_index = VIA_CANVAS_DEFAULT_ZOOM_LEVEL_INDEX;
      var zoom_scale = VIA_CANVAS_ZOOM_LEVELS[_via_canvas_zoom_level_index];
      set_all_canvas_scale(zoom_scale);
      set_all_canvas_size(_via_canvas_width, _via_canvas_height);
      _via_canvas_scale = _via_canvas_scale_without_zoom;
    }

    var current_img_index = _via_image_index;
    if ( _via_image_index === (_via_img_count-1) ) {
      show_image(0);
    } else {
      show_image(_via_image_index + 1);
    }

    if (typeof _via_hook_next_image === 'function') {
      _via_hook_next_image(current_img_index);
    }
  }
}

function reset_zoom_level() {
  if (!_via_current_image_loaded) {
    show_message('First load some images!');
    return;
  }
  if (_via_is_canvas_zoomed) {
    _via_is_canvas_zoomed = false;
    _via_canvas_zoom_level_index = VIA_CANVAS_DEFAULT_ZOOM_LEVEL_INDEX;

    var zoom_scale = VIA_CANVAS_ZOOM_LEVELS[_via_canvas_zoom_level_index];
    set_all_canvas_scale(zoom_scale);
    set_all_canvas_size(_via_canvas_width, _via_canvas_height);
    _via_canvas_scale = _via_canvas_scale_without_zoom;

    _via_load_canvas_regions(); // image to canvas space transform
    _via_redraw_img_canvas();
    _via_redraw_reg_canvas();
    _via_reg_canvas.focus();
    show_message('Zoom reset');
  } else {
    show_message('Cannot reset zoom because image zoom has not been applied!');
  }
}

function zoom_in() {
  if (!_via_current_image_loaded) {
    show_message('First load some images!');
    return;
  }

  if (_via_canvas_zoom_level_index === (VIA_CANVAS_ZOOM_LEVELS.length-1)) {
    show_message('Further zoom-in not possible');
  } else {
    _via_canvas_zoom_level_index += 1;

    _via_is_canvas_zoomed = true;
    var zoom_scale = VIA_CANVAS_ZOOM_LEVELS[_via_canvas_zoom_level_index];
    set_all_canvas_scale(zoom_scale);
    set_all_canvas_size(_via_canvas_width  * zoom_scale,
                        _via_canvas_height * zoom_scale);
    _via_canvas_scale = _via_canvas_scale_without_zoom / zoom_scale;

    _via_load_canvas_regions(); // image to canvas space transform
    _via_redraw_img_canvas();
    _via_redraw_reg_canvas();
    _via_reg_canvas.focus();
    show_message('Zoomed in to level ' + zoom_scale + 'X');
  }
}

function zoom_out() {
  if (!_via_current_image_loaded) {
    show_message('First load some images!');
    return;
  }

  if (_via_canvas_zoom_level_index === 0) {
    show_message('Further zoom-out not possible');
  } else {
    _via_canvas_zoom_level_index -= 1;

    _via_is_canvas_zoomed = true;
    var zoom_scale = VIA_CANVAS_ZOOM_LEVELS[_via_canvas_zoom_level_index];
    set_all_canvas_scale(zoom_scale);
    set_all_canvas_size(_via_canvas_width  * zoom_scale,
                        _via_canvas_height * zoom_scale);
    _via_canvas_scale = _via_canvas_scale_without_zoom / zoom_scale;

    _via_load_canvas_regions(); // image to canvas space transform
    _via_redraw_img_canvas();
    _via_redraw_reg_canvas();
    _via_reg_canvas.focus();
    show_message('Zoomed out to level ' + zoom_scale + 'X');
  }
}

function toggle_region_boundary_visibility() {
  _via_is_region_boundary_visible = !_via_is_region_boundary_visible;
  _via_redraw_reg_canvas();
  _via_reg_canvas.focus();
}

function toggle_region_id_visibility() {
  _via_is_region_id_visible = !_via_is_region_id_visible;
  _via_redraw_reg_canvas();
  _via_reg_canvas.focus();
}

//
// Persistence of annotation data in browser cache (i.e. localStorage)
//

function check_local_storage() {
  // https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
  try {
    var x = '__storage_test__';
    localStorage.setItem(x, x);
    localStorage.removeItem(x);
    return true;
  }
  catch(e) {
    return false;
  }
}

function save_current_data_to_browser_cache() {
  setTimeout(function() {
    if ( _via_is_local_storage_available &&
         ! _via_is_save_ongoing) {
      try {
        _via_is_save_ongoing = true;
        var img_metadata = pack_via_metadata('json');
        var timenow = new Date().toUTCString();
        localStorage.setItem('_via_timestamp', timenow);
        localStorage.setItem('_via_img_metadata', img_metadata[0]);
        // save attributes
        var attr = [];
        for (var attribute in _via_region_attributes) {
          attr.push(attribute);
        }
        localStorage.setItem('_via_region_attributes', JSON.stringify(attr));
        _via_is_save_ongoing = false;
      } catch(err) {
        _via_is_save_ongoing = false;
        _via_is_local_storage_available = false;
        show_message('Failed to save annotation data to browser cache.');
        alert('Failed to save annotation data to browser cache.');
        console.log('Failed to save annotation data to browser cache');
        console.log(err.message);
      }
    }
  }, 1000);
}

function is_via_data_in_localStorage() {
  return localStorage.getItem('_via_timestamp') &&
    localStorage.getItem('_via_img_metadata');
}

function remove_via_data_from_localStorage() {
  if( check_local_storage() && is_via_data_in_localStorage() ) {
    localStorage.removeItem('_via_timestamp');
    localStorage.removeItem('_via_img_metadata');
  }
}

function show_localStorage_recovery_options() {
  try {
    var hstr = [];
    var saved_date = localStorage.getItem('_via_timestamp');
    var saved_data_size = localStorage.getItem('_via_img_metadata').length / 1024; // in Kb


    hstr.push('<div style="padding: 1em; border: 1px solid #cccccc;">');
    hstr.push('<h3 style="border-bottom: 1px solid #5599FF">Data Recovery from Browser Cache</h3>');
    hstr.push('<p>Annotation data from your previous session exists in this browser\'s cache :</h3>');
    hstr.push('<ul><li>Saved on : ' + saved_date + '</li>');
    hstr.push('<li>Size : ' + Math.round(saved_data_size) + ' KB</li>');
    hstr.push('</ul>');
    hstr.push('<a title="Save as JSON" style="cursor: pointer; color: blue;" onclick="download_localStorage_data(\'json\')" title="Recover annotation data">Save</a>');
    hstr.push('<a style="padding-left:2em; cursor: pointer; color: blue;" onclick="remove_via_data_from_localStorage(); show_home_panel();" title="Discard annotation data">Discard</a>');

    hstr.push('<p style="clear: left;"><b>If you continue, the cached data will be discarded!</b></p></div>');
    via_start_info_panel.innerHTML += hstr.join('');
  } catch(err) {
    show_message('Failed to recover annotation data saved in browser cache.');
    console.log('Failed to recover annotation data saved in browser cache.');
    console.log(err.message);
  }
}

function download_localStorage_data(type) {
  var saved_date = new Date( localStorage.getItem('_via_timestamp') );

  var localStorage_data_blob = new Blob( [localStorage.getItem('_via_img_metadata')],
                                         {type: 'text/json;charset=utf-8'});

  save_data_to_local_file(localStorage_data_blob, 'VIA_browser_cache_' + saved_date + '.json');
}

//
// Handlers for attributes input panel (spreadsheet like user input panel)
// SAMIN will edit this function so that when you click a name it selects everything with that name
function attr_input_focus(name) {
  select_regions(name)
  //select_only_region(id);
  _via_redraw_reg_canvas();
  _via_is_user_updating_attribute_value=true;
}

//SAMIN making helper function. Eventually we should reconsider VIA's use of an array rather 
//than a map or something for data. This should help with efficiency if this can be done.
function select_regions(name){
  toggle_all_regions_selection(false);
  //make an array of region id's based on the name
  var all_regions = _via_img_metadata[_via_image_id].regions;
  var region_class = [];
  //iterate through the array to find entries with matching name. With map's this can be done in 
  //constant time rather than linear time if this can be done. Will look at documentation later to
  //see if there are any drawbacks to such a possible optimization. 
  for (var i = 0; i < all_regions.length; i++){
    if (all_regions[i].region_attributes.name == name){
      region_class.push(i);
     }
  }

  for (var j = 0; j <region_class.length; j++){
    set_region_select_state(region_class[j], true);
    _via_is_region_selected = true;
    _via_user_sel_region_id = region_class[j];
  }

}



function attr_input_blur(i) {
  //SAMIN
  //if ( _via_is_reg_attr_panel_visible ) {
    set_region_select_state(i, false);
    _via_redraw_reg_canvas();
  //}
  _via_is_user_updating_attribute_value=false;
}

// header is a Set()
// data is an array of Map() objects
function init_spreadsheet_input(type, col_headers, data, row_names) {

  if ( typeof row_names === 'undefined' ) {
    var row_names = [];
    for ( var i = 0; i < data.length; ++i ) {
      row_names[i] = i+1;
    }
  }
  var attrname = '';
  switch(type) {
  case 'region_attributes':
    attrname = 'Region Attributes';
    break;

  case 'file_attributes':
    attrname = 'File Attributes';
    break;
  }

  var attrtable = document.createElement('table');
  attrtable.setAttribute('id', 'attributes_panel_table');
  var firstrow = attrtable.insertRow(0);

  // top-left cell
  var topleft_cell = firstrow.insertCell(0);
  topleft_cell.innerHTML = '';
  topleft_cell.style.border = 'none';

  for (var col_header in col_headers) {
    firstrow.insertCell(-1).innerHTML = '<b>' + col_header + '</b>';
  }

  // allow adding new attributes
  firstrow.insertCell(-1).innerHTML = '<input type="text"' +
    ' onchange="add_new_attribute(\'' + type[0] + '\', this.value)"' +
    ' value = "[ Add New ]"' +
    ' onblur="_via_is_user_adding_attribute_name=false; this.value = \'\';"' +
    ' onfocus="_via_is_user_adding_attribute_name=true; this.value = \'\';" />';

  // if multiple regions are selected, show the selected regions first
  var sel_reg_list       = [];
  var remaining_reg_list = [];
  var all_reg_list       = [];
  var region_traversal_order = [];
  if (type === 'region_attributes') {
    // count number of selected regions
    for ( var i = 0; i < data.length; ++i ) {
      all_reg_list.push(i);
      if ( data[i].is_user_selected ) {
        sel_reg_list.push(i);
      } else {
        remaining_reg_list.push(i);
      }
    }
    if ( sel_reg_list.length > 1 ) {
      region_traversal_order = sel_reg_list.concat(remaining_reg_list);
    } else {
      region_traversal_order = all_reg_list;
    }
  }

  var sel_rows = [];
  for ( var i=0; i < data.length; ++i ) {
    var row_i = i;

    // if multiple regions are selected, show the selected regions first
    var di;
    if ( type === 'region_attributes' ) {
      if ( sel_reg_list.length ) {
        row_i = region_traversal_order[row_i];
      }
      di = data[row_i].region_attributes;
    } else {
      di = data[row_i];
    }

    var row = attrtable.insertRow(-1);
    var region_id_cell              = row.insertCell(0);
    region_id_cell.innerHTML        = '' + row_names[row_i] + '';
    region_id_cell.style.fontWeight = 'bold';
    region_id_cell.style.width      = '2em';

    if (data[row_i].is_user_selected) {
      region_id_cell.style.backgroundColor = '#5599FF';
      row.style.backgroundColor = '#f2f2f2';
      sel_rows.push(row);
    }


 
    for ( var key in col_headers ) {
      var input_id = type[0] + '#' + key + '#' + row_i;

      if ( di.hasOwnProperty(key) ) {
        var ip_val = di[key];
        // escape all single and double quotes
        ip_val = ip_val.replace(/'/g, '\'');
        ip_val = ip_val.replace(/"/g, '&quot;');
        //console.log(ip_val);


        //SAMIN trying to change the onfocus to correspond to name rather than the row number (ip_val)
        if ( ip_val.length > 30 ) {
          row.insertCell(-1).innerHTML = '<textarea ' +
            ' rows="' + (Math.floor(ip_val.length/30)-1) + '"' +
            ' cols="30"' +
            ' id="' +   input_id + '"' +
            ' autocomplete="on"' +
            ' onchange="update_attribute_value(\'' + input_id + '\', this.value)"' +
            ' onblur="attr_input_blur(' + row_i + ')"' +
            ' onfocus="attr_input_focus(\'' + ip_val + '\');"' +
            ' >' + ip_val + '</textarea>';

        } else {
          row.insertCell(-1).innerHTML = '<input type="text"' +
            ' id="' +   input_id + '"' +
            ' value="' + ip_val + '"' +
            ' autocomplete="on"' +
            ' onchange="update_attribute_value(\'' + input_id + '\', this.value)"' +
            ' onblur="attr_input_blur(' + row_i + ')"' +
            ' onfocus="attr_input_focus(\'' + ip_val + '\');" />';
        }
      } else {
        row.insertCell(-1).innerHTML = '<input type="text"' +
          ' id="' + input_id + '"' +
          ' onchange="update_attribute_value(\'' + input_id + '\', this.value)" ' +
          ' onblur="attr_input_blur(' + row_i + ')"' +
          ' onfocus="attr_input_focus(\'' + ip_val + '\');" />';
      }
    }
  }
}


// this vertical spacer is needed to allow scrollbar to show
// items like Keyboard Shortcut hidden under the attributes panel
function update_vertical_space() {
  var panel = document.getElementById('vertical_space');
  panel.style.height = attributes_panel.offsetHeight+'px';
}

function update_attribute_value(attr_id, value) {
  var attr_id_split = attr_id.split('#');
  var type = attr_id_split[0];
  var attribute_name = attr_id_split[1];
  var region_id = attr_id_split[2];

  switch(type) {
  case 'r': // region attribute
    _via_img_metadata[_via_image_id].regions[region_id].region_attributes[attribute_name] = value;
    //
    //SAMIN update_region_attributes_input_panel();
    break;

  case 'f': // file attribute
    _via_img_metadata[_via_image_id].file_attributes[attribute_name] = value;
    //SAMIN update_file_attributes_input_panel();
    break;
  }
  //if (_via_is_reg_attr_panel_visible) {
    set_region_select_state(region_id, false);
  //}
  _via_redraw_reg_canvas();
  _via_is_user_updating_attribute_value = false;
  save_current_data_to_browser_cache();
}

function add_new_attribute(type, attribute_name) {
  switch(type) {
  case 'r': // region attribute
    if ( !_via_region_attributes.hasOwnProperty(attribute_name) ) {
      _via_region_attributes[attribute_name] = true;
    }
    //SAMIN update_region_attributes_input_panel();
    break;

  case 'f': // file attribute
    if ( !_via_file_attributes.hasOwnProperty(attribute_name) ) {
      _via_file_attributes[attribute_name] = true;
    }
    //SAMIN update_file_attributes_input_panel();
    break;
  }
  _via_is_user_adding_attribute_name = false;
}

//SAMIN plan to add functions that eliminate the overlap of the markdown and js


//SAMIN added function to help with adding classes to the sidebar
//7/18 make the color a rotating array
function addClass(className, classColor = _via_color_array[_via_class_names.size % 6]){
  
  if (_via_class_names.has(className)){
    return;
  }
  if (className == ""){
    return;
  }
  else{
      _via_class_names.set(className,[0, classColor]);
  

  }
  document.getElementById("classes_label").innerHTML = "Classes " + " (" + _via_class_names.size + ")";
  var button = document.createElement("input");
  var count = document.createElement("p");
  var trash = document.createElementNS ('http://www.w3.org/2000/svg', "svg");
  var edit = document.createElementNS ('http://www.w3.org/2000/svg', "svg");
  var name_input = document.createElement("input");
  var name_submit = document.createElement("input");
  var dummy = document.createElement("p");

  //SAMIN colorswitch will replace colorswatch so it has functionality on each 
  var colorswitch = document.createElement("div");
  var colorpicker = document.createElement("div");
  var colorwrapper = document.createElement("div");
  colorwrapper.className = "color-wrapper";



  //SAMIN come back and make these strings constants initialized at the start
  //we want to make the id's of the buttons for the classes unique

  /*SAMIN dummy to make sure every class starts on a separate line*/
  dummy.className = "dummy";
  colorswitch.className = "class-color-holder";
  colorswitch.id = className + "_colorswitch";
  colorpicker.id = className + "_colorpicker";
  colorpicker.className = "color-picker";

  colorswitch.style.background = _via_class_names.get(className)[1];

  var colorList = [ '#000000', '#993300', '#333300', '#003300', '#003366', '#000066', '#333399', '#333333', 
'#660000', '#FF6633', '#666633', '#336633', '#336666', '#0066FF', '#666699', '#666666', '#CC3333', '#FF9933', '#99CC33', 
'#669966', '#66CCCC', '#3366FF', '#663366', '#999999', '#CC66FF', '#FFCC33', '#FFFF66', '#99FF66', '#99CCCC', '#66CCFF', 
'#993366', '#CCCCCC', '#FF99CC', '#FFCC99', '#FFFF99', '#CCffCC', '#CCFFff', '#99CCFF', '#CC99FF', '#FFFFFF' ];

  var div_array = [];

  


    for (var i = 0; i < colorList.length; i++ ) {
      var li = document.createElement("li");
      div_array.push(li);
      li.className = "color-item";
      li.style.backgroundColor = colorList[i];
      colorpicker.appendChild(li);

      //we have to make another array of objects now
    }

    for (var j = 0; j < div_array.length; j++){
        div_array[j].addEventListener("click",function(){
        var click_count = _via_class_names.get(className)[0];
        var click_color = _via_class_names.get(className)[1];
        _via_class_names.set(className, [click_count, this.style.backgroundColor]);
        //7/5 SAMIN lets change up the metadata now
        //iterate through image metadata of current image and see where the region has an id that matches w the selected class
        //for ()
        colorswitch.style.fill = this.style.backgroundColor;
        colorswitch.style.background = this.style.backgroundColor;
        colorpicker.style.display = "none";
        draw_all_regions();

      });
    }


    colorswitch.addEventListener("click", function(){
    if (colorpicker.style.display == "inline-block"){
      colorpicker.style.display = "none";
    }
    else{
      colorpicker.style.display = "inline-block";
    }
  });
    colorpicker.style.display = "none";

  button.type = "textbox";
  button.readOnly = true;
  button.value = className;
  button.id = className + "_via_btn";
  button.className = "bx--link _via_btn";

  //have it so class names can't include underscores so this can be unique
  count.id = className + "_num";
  count.value=0;
  count.innerHTML = "(0)";
  count.className = "bx--link count_button";

  trash.setAttribute('width','12');
  trash.setAttribute('height','16');
  trash.id = className + "_del";

  edit.setAttribute('width','40');
  edit.setAttribute('height','16');
  edit.id = className + "_edit";


  name_input.type = "text";
  name_input.id = className + "_text";
  name_input.className = "name_changer";

  name_submit.type = "button";
  name_submit.value = "confirm change";
  name_submit.id = className + "_submit";
  name_submit.className = "name_changer";

  //document.getElementById(className).addEventListener("click", myScript);

  var leftDiv = document.createElement("div");


  var rightDiv = document.createElement("div");
  leftDiv.className = "left_labels";
  rightDiv.className = "right_labels";
  var mainDiv = document.createElement("div");
  mainDiv.className = "mainDivs";
  document.getElementById("classes_info").appendChild(mainDiv);
  mainDiv.appendChild(leftDiv);
  mainDiv.appendChild(rightDiv);


  colorwrapper.appendChild(colorswitch);
  //We have to get this moved over to next to the colorswitch
  colorwrapper.appendChild(colorpicker);
  leftDiv.appendChild(colorwrapper);
  leftDiv.appendChild(button);
  rightDiv.appendChild(count);

  rightDiv.appendChild(edit);
  var path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  path1.setAttribute('d','M2.032 10.924l7.99-7.99 2.97 2.97-7.99 7.99zm9.014-8.91l1.98-1.98 2.97 2.97-1.98 1.98zM0 16l3-1-2-2z');
  path1.setAttribute('fill','#3D6FB1');
  edit.appendChild(path1);

  

  rightDiv.appendChild(trash);
  path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  var path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  //<svg width="16" height="16" viewBox="0 0 16 16"><path d="M2.032 10.924l7.99-7.99 2.97 2.97-7.99 7.99zm9.014-8.91l1.98-1.98 2.97 2.97-1.98 1.98zM0 16l3-1-2-2z"></path></svg>

  path1.setAttribute('d','M11 4v11c0 .6-.4 1-1 1H2c-.6 0-1-.4-1-1V4H0V3h12v1h-1zM2 4v11h8V4H2z');
  path1.setAttribute('fill','#3D6FB1');
  trash.appendChild(path1);

  path2.setAttribute('d','M4 6h1v7H4zm3 0h1v7H7zM3 1V0h6v1z');
  path2.setAttribute('fill','#3D6FB1');
  trash.appendChild(path2);


  rightDiv.appendChild(name_input);
  rightDiv.appendChild(name_submit);
  rightDiv.appendChild(dummy);
  mainDiv.style.zIndex = 1;
  colorpicker.style.zIndex = 1000;


  //change color of draw label 7/12
  document.getElementById("draw_path_1").style.fill = "#3D70B2";
  document.getElementById("draw_path_2").style.stroke = "#3D70B2";
  document.getElementById("toolbar_draw").style.backgroundColor = "#e5e5e5";


  attr_input_focus(className);
    if (_via_class_names.has(className)){
      _via_current_update_attribute_name = className;
      _via_current_shape = VIA_REGION_SHAPE.RECT;
    }
    else{
      _via_current_update_attribute_name = '';
      //_via_current_shape = VIA_REGION_SHAPE.NONE;
    }
    var active_div = document.querySelector('.mainDivs.active');
    var active_btn = document.querySelector('._via_btn.active');
    //VIA_THEME_BOUNDARY_FILL_COLOR = _via_class_names.get(className)[1];
    //if any active btn
    if(active_div){
      //remove active class from it 

      active_div.classList.remove('active');
      active_btn.classList.remove('active');
      active_div.style.backgroundColor = "transparent";
      active_btn.style.backgroundColor = "transparent";

    }

    mainDiv.classList.add('active');
    button.classList.add('active');
    mainDiv.style.backgroundColor = "#dbe4f0";
    button.style.backgroundColor = "#dbe4f0";
    turnOnShortcuts();



  mainDiv.addEventListener("mouseover", function(){
    if (mainDiv.classList.contains('active')){
      return;
    
      
    }
    mainDiv.style.backgroundColor = "#ECF1F7";
    button.style.backgroundColor = "#ECF1F7";

  });

  mainDiv.addEventListener("mouseout", function(){
    if (mainDiv.classList.contains('active')){
      return;
    
      
    }
    mainDiv.style.backgroundColor = "transparent";
    button.style.backgroundColor = "transparent";
  });
  
  mainDiv.addEventListener("click", function(){
    //7/12 turn on draw label
    attr_input_focus(className);
    if (_via_class_names.has(className)){
      _via_current_update_attribute_name = className;
      _via_current_shape = VIA_REGION_SHAPE.RECT;
    }
    else{
      _via_current_update_attribute_name = '';
      //_via_current_shape = VIA_REGION_SHAPE.NONE;
    }
    var active_div = document.querySelector('.mainDivs.active');
    var active_btn = document.querySelector('._via_btn.active');
    //VIA_THEME_BOUNDARY_FILL_COLOR = _via_class_names.get(className)[1];
    //if any active btn
    if(active_div){
      //remove active class from it 

      active_div.classList.remove('active');
      active_btn.classList.remove('active');
      active_div.style.backgroundColor = "transparent";
      active_btn.style.backgroundColor = "transparent";


    }

    mainDiv.classList.add('active');
    button.classList.add('active');
    mainDiv.style.backgroundColor = "#dbe4f0";
    button.style.backgroundColor = "#dbe4f0";
    document.getElementById("draw_path_1").style.fill = "#3D70B2";
    document.getElementById("draw_path_2").style.stroke = "#3D70B2";
    turnOnShortcuts();
  });

  //removal of class
    trash.addEventListener("click", function(){
      //6/26 if the one being trashed is the current class
      var isActive = false;
      if (mainDiv.classList.contains('active')){
        mainDiv.classList.remove('active');
        isActive = true;
        _via_current_update_attribute_name = '';
        //7/12 turn off draw label 
          document.getElementById("draw_path_1").style.fill = "#9EB7D8";
          document.getElementById("draw_path_2").style.stroke = "#9EB7D8";

      }
      //7/5 SAMIN
      //lets try a different function altogether for this one
      //go through the metadata and delete all of that as well as w the classes
      select_regions(className);
      del_sel_regions();
      //we have to make sure we account for the metadata too and the images in other pictures
      for (var x in _via_img_metadata){
        for (var i = 0; i < _via_img_metadata[x].regions.length; i++){
          if(_via_img_metadata[x].regions[i].region_attributes["name"] == className){
            _via_img_metadata[x].regions.splice(i,1);
            i--;
          }

        }
      }

      trash.remove();
      button.remove();
      count.remove();
      edit.remove();
      name_input.remove();
      name_submit.remove();
      leftDiv.remove();
      rightDiv.remove();
      mainDiv.remove();

      _via_class_names.delete(className);
      document.getElementById("classes_label").innerHTML = "Classes " + " (" + _via_class_names.size + ")";

      if (isActive){
        _via_current_update_attribute_name = '';
        document.getElementById("draw_path_1").style.fill = "#9EB7D8";
          document.getElementById("draw_path_2").style.stroke = "#9EB7D8";
      }

    });

    edit.addEventListener("click", function(){

      button.readOnly = false;
      button.focus();
      _via_changing_class = true;

      

    });

    button.addEventListener("focus", function(){
      _via_is_user_adding_attribute_name = true;
      _via_is_user_updating_attribute_value = true;
      _via_is_user_updating_attribute_name = true;
    });

    button.addEventListener("blur", function(){
      turnOnShortcuts();
    });

    //SAMIN add event listener on the submit button for editing the name
    button.addEventListener("change", function(){


      if (_via_class_names.has(button.value)){
        show_message("name already exists");
        button.value = className;
        //find out we disabled the character keys before
        return;
      }
      var classCount = _via_class_names.get(className)[0];
      var oldClassName = className;
      _via_class_names.set(button.value, [classCount, _via_class_names.get(className)[1]]);
      _via_class_names.delete(className);

      className = button.value;

      //next lets change up the metadata and the canvas region data and update the canvas

      //canvas region
      for (var i = 0; i < _via_canvas_regions.length; i++){
        
        if (_via_canvas_regions[i].region_attributes["name"] == oldClassName){
          _via_canvas_regions[i].region_attributes["name"] = className;
        }
      }

      //metadata
      //7/16
      //change this for all images?

      for (var i = 0; i < _via_img_metadata["cars.png62201"].regions.length; i++){
        
        if (_via_img_metadata["cars.png62201"].regions[i].region_attributes["name"] == oldClassName){
          _via_img_metadata["cars.png62201"].regions[i].region_attributes["name"] = className;
        }
      }

      for (var i = 0; i < _via_img_metadata["lot.jpeg71862"].regions.length; i++){
        
        if (_via_img_metadata["lot.jpeg71862"].regions[i].region_attributes["name"] == oldClassName){
          _via_img_metadata["lot.jpeg71862"].regions[i].region_attributes["name"] = className;
        }
      }

      for (var i = 0; i < _via_img_metadata["outside.jpeg21513"].regions.length; i++){
        
        if (_via_img_metadata["outside.jpeg21513"].regions[i].region_attributes["name"] == oldClassName){
          _via_img_metadata["outside.jpeg21513"].regions[i].region_attributes["name"] = className;
        }
      }

      //we have to update labels as well as the canvas
      //6/27 SAMIN remember this
      button.value = className;
      button.id = className + "_via_btn";
      count.id = className + "_num";
      trash.id = className + "_del";
      edit.id = className + "_edit";
      name_input.id = className + "_text";
      name_submit.id = className + "_submit";
      button.readOnly = true;

      
      //lets make this the new active class and the selected region

      var active_btn = document.querySelector('.class_button.active');
    
    //if any active btn
    if(active_btn){
      //remove active class from it 
      active_btn.classList.remove('active');
    }

    button.classList.add('active');
    attr_input_focus(className);
    _via_changing_class = false;


    turnOnShortcuts();

    });

}

function turnOnShortcuts(){
  if (_via_changing_class){
    return;
  }
  _via_is_user_adding_attribute_name = false;
  _via_is_user_updating_attribute_value = false;
  _via_is_user_updating_attribute_name = false;
}

function repopulate(){
  var imported_name;
  var imported_color;
  //iterate through metadata
  for (var x in _via_img_metadata){
  for (var i = 0; i < _via_img_metadata[x].regions.length; i++){
    imported_name = _via_img_metadata[x].regions[i].region_attributes["name"];
    imported_color = _via_img_metadata[x].regions[i].region_attributes["color"];
    //add metadata info to map
    if (_via_class_names.has(imported_name)){
      _via_class_names.set(imported_name, [_via_class_names.get(imported_name)[0]+1, _via_class_names.get(imported_name)[1]]);
    }
    else{
      //7/5 maybe we can have another argument for color here. edit the addclass function
      addClass(imported_name, imported_color);
      _via_class_names.set(imported_name, [1, imported_color]);
    }

    update_count(imported_name);
  }
}
}

//SAMIN changed body onload to addEventListener
window.addEventListener('load', 
  _via_init(), false);

window.addEventListener('resize', 
  _via_update_ui_components, false);