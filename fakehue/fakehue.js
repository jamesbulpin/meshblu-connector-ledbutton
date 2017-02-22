var MeshbluSocketIO = require('meshblu');
var SerialPort = require('serialport');
var tinycolor = require('tinycolor2');

var cfg_light = require('./meshblu-light.json');
var cfg_button = require('./meshblu-button.json');

var serport = null;
var meshblu_light = null;
var meshblu_button = null;
var meshblu_device_button = null;

SerialPort.list(function (err, ports) {
  ports.forEach(function(port) {
    if (port.vendorId == '1B4F') {
      console.log("Found device on port " + port.comName);
      
      serport = new SerialPort(port.comName, {
        baudrate: 9600,
        parser: SerialPort.parsers.readline('\n')
      });
      
      serport.on('data', function(data) {
        handleSerial(data);
      });
    }
  });
});

function handleSerial(data) {
  //console.log(data.toString().trim());
  if (data.toString().trim() == "BUTTON") {
    if (meshblu_button) {
      var state = {"buttonevent": 34, "lastupdated": (new Date()).toISOString()};
      var data = {action:"click", button:"1", state:state, device:meshblu_device_button};
      var msg = {devices:['*'], data:data};
    
      meshblu_button.message(msg);
    }
  }
}

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

meshblu_light.on('config', function(device){
  console.log('Light on config');
  //console.log(JSON.stringify(device, null, 2));

  if ("desiredState" in device) {
    var ison = true;
    if (device.desiredState && ("on" in device.desiredState)) {
      ison = device.desiredState.on;
    }
    var color;
    if (ison && ("color" in device.desiredState)) {
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
    if (serport && serport.isOpen()) {
      serport.write("COLOR " + color + "\n");
    }
  }
});

meshblu_button.on('config', function(device){
  console.log('Button on config');
  meshblu_device_button = device;
});
