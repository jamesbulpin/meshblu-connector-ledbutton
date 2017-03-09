{EventEmitter}  = require 'events'
debug           = require('debug')('meshblu-connector-ledbutton:index')
ButtonManager   = require './button-manager'
_               = require 'lodash'

class Connector extends EventEmitter
  constructor: ->
    @button = new ButtonManager
    @button.on 'update', (data) =>
      @emit 'update', data
    @button.on 'error', (error) =>
      @emit 'error', error
    @button.on 'message', (message) =>
      @emit 'message', message

  isOnline: (callback) =>
    callback null, running: true

  close: (callback) =>
    debug 'on close'
    @button.close callback

  onConfig: (device={}, callback=->) =>
    { desiredState } = device
    debug 'on config', desiredState
    @button.connectIfNotAlready (error) =>
      return callback error if error?
      @button.changeLight desiredState, (error) =>
        return callback error if error?
        @connected = true
        callback()

  start: (device, callback) =>
    debug 'started'
    @onConfig device, callback

module.exports = Connector
