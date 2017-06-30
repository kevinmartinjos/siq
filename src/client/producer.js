let WebSocketClient = require('ws');
let uuid = require('uuid/v4');
let Utils = require('../utils');
var logger = Utils.logger;
var isNullOrEmpty = Utils.isNullOrEmpty;
var serialize = Utils.serialize;

function Producer(connection){
	var self = this;
	this.messageCount = 0;
	this.pendingAcknowledgement = {};
	this.callbacks = {};
	this.errCallbacks = {};
	this.producerId = uuid();

	/*
		TODO:
		Have a 'disconnect' event
	*/
	connection.on('message', (data) => {
		data = JSON.parse(data);
		if(data.topic === "ID"){
			var ackId = data.ackId;
			var callback;

			if(!isNullOrEmpty(self.callbacks[ackId]))
				callback = self.callbacks[ackId].callback;
			if(typeof callback === "function" && data.producerId === self.producerId)
				callback(data.id);
			
		}
		else if(data.topic === "ERROR"){
			logger.debug("ERROR:" + serialize(data));

			var errCallback;
			if(self.errCallbacks[data.ackId] !== undefined)
				errCallback = self.errCallbacks[data.ackId].errCallback;
			if(typeof errCallback === "function" && data.producerId === self.producerId){
				errCallback(data);
			}
		}
	});	


	return {
		produce: function(queue, message, callback, errCallback){
			var ackId = self.messageCount++;
			var payload = {
				topic: 'ADD',
				queue: queue,
				message: message,
				ackId: ackId,
				producerId: self.producerId
			};

			/*
				Save both callbacks to be invoked on a message reception
			*/
			self.callbacks[ackId] = {
				ackId: ackId,
				callback: callback
			};

			self.errCallbacks[ackId] = {
				ackId: ackId,
				errCallback: errCallback
			};

			/*
				TODO:
				Retry if not successful. Disconnect after a certain number of attempts
			*/
			connection.send(JSON.stringify(payload));
		}

	}

}

module.exports = Producer;