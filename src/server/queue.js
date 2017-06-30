let Utils = require('../utils');
let DB = require('./db');
let uuid = require('uuid/v4');

var serialize = Utils.serialize;
var isNullOrEmpty = Utils.isNullOrEmpty;
var logger = Utils.logger;
var Exception = Utils.Exception;

var Queue = function(name, bufferSize, id=uuid()){
	this.name = name;
	this.id = id;
	this.bufferSize = bufferSize;
	this.data = [];
	this.subscribers = [];
	//acknowledgements
	this.acks = [];
	this.isCleared = false;

	var self = this;

	function _add(payload){
		if(self.data.length >= this.bufferSize){
			logger.error("Queue:_add " + self.name + ": Buffer overflow. Current size: "+ self.data.length);
			throw new Exception("Buffer overflow on inserting " + payload.message);
		}
		else if(isNullOrEmpty(payload.id)){
			throw new Exception("Message does not have an id");
		}
		else{
			self.data.push(serialize(payload));
			if(_isFull()){
				_flush();
			}
			return payload.id;
		}
	};

	function _isFull(){
		return self.data.length === self.bufferSize;
	}

	function _getData(){
		return self.data;
	};

	function _subscribe(ws, consumerId){
		self.subscribers.push({
			consumerId: consumerId,
			connection: ws
		});

		/*When queue is full and the first subscriber connects*/
		if(_isFull()){
			_flush()
		}
		return consumerId;
	};

	function _flush(){
		/*
			TODO:

			Move the subscriber.connection.send to MessageBroker through a callback.
			The queue should not be responsible for sending messages to websocket connections
			The queue should inform the MessageBroker that it is ready to be flushed and the 
			MessageBroker should be handlng all the subsequent logic.
		*/
		logger.info("flushing queue: " + self.name);
		
		//clean dead subscribers
		var aliveSubscribers = self.subscribers.filter((subscriber) => {
			return subscriber.connection.readyState === 1;
		});

		self.subscribers = aliveSubscribers;

		self.subscribers.forEach((subscriber) => {
			var payload = {
				topic: "SUBSCRIPTION_MSG",
				consumerId: subscriber.consumerId,
				messageList: self.data
			};
			if(subscriber.connection.readyState === 1){
				subscriber.connection.send(serialize(payload));
			}
		});
	};

	function _clear(){
		//make a copy
		var toDelete = self.data.slice();

		/*TODO: This DB call should be moved to MessageBroker.js*/
		toDelete.forEach((messageJson) => {
			var messageObject = JSON.parse(messageJson);
			var id = messageObject.id;
			DB.deleteMessage(id, self.name);
		});

		self.data = [];
		self.acks = [];
		self.isCleared = true;
	}

	function _acknowledgeMessage(consumerId){
		self.acks.push(consumerId);
		if(self.acks.length === self.subscribers.length && _isFull()){
			_clear();
		}
	}

	function _isCleared(){
		return self.isCleared;
	}
	
	return {
		name: this.name,
		id: this.id,
		bufferSize: this.bufferSize,
		length: this.data.length,
		add: _add,
		getData: _getData,
		subscribe: _subscribe,
		acknowledgeMessage: _acknowledgeMessage,
		isFull: _isFull,
		isCleared: _isCleared
	}
};

module.exports = Queue;