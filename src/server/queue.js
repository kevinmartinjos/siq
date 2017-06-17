let Utils = require('../utils');

var serialize = Utils.serialize;
var isNullOrEmpty = Utils.isNullOrEmpty;
var logger = Utils.logger;
var Exception = Utils.Exception;

var Queue = function(name, bufferSize){
	this.name = name;
	this.bufferSize = bufferSize;
	this.data = [];
	this.subscribers = [];
	//acknowledgements
	this.acks = [];
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
		if(_isFull())
			_flush()
		return consumerId;
	};

	function _flush(){
		logger.info("flushing queue: " + self.name);
		logger.info("subscribers: " + self.subscribers.length);
		self.subscribers.forEach((subscriber) => {
			var payload = {
				topic: "SUBSCRIPTION_MSG",
				consumerId: subscriber.consumerId,
				messageList: self.data
			};
			subscriber.connection.send(serialize(payload));
		});
	};

	function _clear(){
		console.log("clearing");
		self.data = [];
		self.acks = [];
	}

	function _acknowledgeMessage(consumerId){
		self.acks.push(consumerId);
		if(self.acks.length === self.subscribers.length && self.acks.length > 0){
			_clear();
		}
	}
	return {
		name: this.name,
		bufferSize: this.bufferSize,
		length: this.data.length,
		add: _add,
		getData: _getData,
		subscribe: _subscribe,
		acknowledgeMessage: _acknowledgeMessage
	}
};

module.exports = Queue;