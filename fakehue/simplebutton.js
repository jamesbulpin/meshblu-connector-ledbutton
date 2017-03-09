var MeshbluSocketIO = require('meshblu');
var SerialPort = require('serialport');
var tinycolor = require('tinycolor2');

var cfg = require('./meshblu.json');

var serport = null;
var meshblu = null;

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
    console.log("Button!");
    if (meshblu) {
      var state = {"buttonevent": 34, "lastupdated": (new Date()).toISOString()};
      var data = {action:"click", button:"1", state:state};
      var msg = {devices:['*'], data:data};
    
      meshblu.message(msg);
    }
  }
}

meshblu = new MeshbluSocketIO(cfg);
meshblu.on('ready', function(){
  console.log('Meshblu is ready to rock');
});
meshblu.connect();


meshblu.on('message', function(msg){
  console.log('Message in');
  console.log(JSON.stringify(msg, null, 2));

  if (("data" in msg) && (msg.data) && ("color" in msg.data) && msg.data.color) {
    console.log(":" + msg.data.color);
    var color;
    if (msg.data.color === "OCTOBLU") {
      color = msg.data.color;
    }
    else {
      color = tinycolor(msg.data.color).toHexString();
    }
    if (serport && serport.isOpen()) {
      serport.write("COLOR " + color + "\n");
    }
  }
});

