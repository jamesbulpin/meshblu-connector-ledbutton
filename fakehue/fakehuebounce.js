var MeshbluSocketIO = require('meshblu');
var tinycolor = require('tinycolor2');

var cfg_light = require('./meshblu-light.json');
var cfg_button = require('./meshblu-button.json');
var cfg_bounce = require('./meshblu-bounce.json');

var meshblu_light = null;
var meshblu_button = null;
var meshblu_bounce = null;
var meshblu_device_button = null;

meshblu_light = new MeshbluSocketIO(cfg_light);
meshblu_light.on('ready', function(){
  console.log('Light is ready to rock');
});
meshblu_light.connect();

meshblu_button = new MeshbluSocketIO(cfg_button);
meshblu_button.on('ready', function(){
  console.log('Button is ready to rock');
});
meshblu_button.connect();

meshblu_bounce = new MeshbluSocketIO(cfg_bounce);
meshblu_bounce.on('ready', function(){
  console.log('Bounce is ready to rock');
});
meshblu_bounce.connect();

meshblu_light.on('config', function(device){
  console.log('Light on config');
  //console.log(JSON.stringify(device, null, 2));

  if (("desiredState" in device) && device.desiredState) {
    var ison = true;
    if ("on" in device.desiredState) {
      ison = device.desiredState.on;
    }
    var color;
    if (ison && ("color" in device.desiredState) && device.desiredState.color) {
      if (device.desiredState.color === "OCTOBLU") {
        color = device.desiredState.color;
      }
      else {
        color = tinycolor(device.desiredState.color).toHexString();
      }
    }
    else {
      color = tinycolor("#000000").toHexString();
    }
    if (meshblu_bounce) {
      var data = {color:color, device:device};
      var msg = {devices:['*'], data:data};
      meshblu_bounce.message(msg);
    }
  }
});

meshblu_button.on('config', function(device){
  console.log('Button on config');
  meshblu_device_button = device;
});

meshblu_bounce.on('message', function(data){
  console.log('Octoblu message received');
  console.log(data);

  if (("action" in data) && (data.action == "button")) {
    if (meshblu_button) {
      var state = {"buttonevent": 34, "lastupdated": (new Date()).toISOString()};
      var data = {action:"click", button:"1", state:state, device:meshblu_device_button};
      var msg = {devices:['*'], data:data};
    
      meshblu_button.message(msg);
    }
  }
});

