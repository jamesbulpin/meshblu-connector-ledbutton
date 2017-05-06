_              = require 'lodash'
{EventEmitter} = require 'events'
tinycolor      = require 'tinycolor2'
SerialPort     = require 'serialport'
debug          = require('debug')('meshblu-connector-ledbutton:button-manager')
_              = require 'lodash'

class ButtonManager extends EventEmitter
  constructor: ->
    @stateInterval = setInterval @_reconnect, 3600000
    
  connectIfNotAlready: (callback) =>
    return callback() if @serport?
    @_findSerialPort (port) =>
      @_connectSerialPort port, (error) =>
        debug 'Serial port connected!'
        return callback()    
  
  _reconnect: =>
    debug 'Forcing serial port reconnect'
    @close (error) =>
      @connectIfNotAlready (error) =>
        null
  
  _findSerialPort: (callback) =>
    SerialPort.list (error, ports) =>
      ports.forEach (port) =>
        debug '_findSerialPort checking', port.comName, port.vendorId
        if port.vendorId == '1B4F' or port.vendorId == '0x1b4f'
          return callback port

  _connectSerialPort: (port, callback) =>
    debug '_connectSerialPort', port.comName
    @serport = new SerialPort(port.comName, {
      baudrate: 9600,
      parser: SerialPort.parsers.readline('\n'),
      autoOpen: false
    })
    @serport.open (error) =>
      return callback error if error
      return callback()
      
    @serport.on 'data', (data) =>
      @_handleSerial(data)
        
  _handleSerial: (data) =>
    debug '_handleSerial', data
    if data.trim() == "BUTTON"
      debug 'Button push detected'
      data =
        action: "click"
      @emit 'message', {devices: ['*'], data}
      
  close: (callback) =>
    if @serport?
      @serport.close (error) =>
        @serport = null
        return callback()
    callback()

  changeLight: (data, callback) =>
    debug 'changeLight called with ', data
    return callback() if _.isEmpty data
    return callback() if not @serport?
    return callback() if not @serport.isOpen()
    {
      color
    } = data
    c = null
    if ("on" in data) and !data.on
      c = "#000000"
    else if color == "OCTOBLU"
      c = color
    else
      c = tinycolor(color).toHexString();
    if c
      debug 'changeLight', c
      @serport.write("COLOR " + c + "\n") if @serport?
    return callback()

module.exports = ButtonManager
