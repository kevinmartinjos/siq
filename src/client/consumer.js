let uuid = require('uuid/v4');
let Utils = require('../utils');

var serialize = Utils.serialize;

function Consumer(connection, qName, callback){
	var self = this;
	this.qName = qName;
	this.connection = connection;
	this.consumerId = uuid();
	this.callback = callback;

	this.connection.on('message', (data) => {
		data = JSON.parse(data);
		var payload = {
			topic: "MSG_ACK",
			consumerId: self.consumerId,
			queue: self.qName
		};

		if(data.topic === 'SUBSCRIPTION_MSG' && data.consumerId === self.consumerId){
			self.connection.send(serialize(payload));
			if(typeof self.callback === "function"){
				self.callback(data.messageList);
			}
		}
	});

	var publicMembers = {
		consumerId: this.consumerId
	};

	/*
		TODO:
		A heartbeat cheack (ping check) at regular intervals to see if the connection
		is still alive
	*/
	return subscribe(connection, this.qName, this.consumerId, publicMembers);
}

function subscribe(connection, qName, consumerId, publicMembers){
	var payload = {
		topic: 'SUBSCRIBE',
		queue: qName,
		consumerId: consumerId
	};

	connection.send(serialize(payload));
	return new Promise((resolve, reject) => {
		/*
			TODO:
			Potential memory leak. Creating many consumers would result in many 'message' event
			listeners on the same 'connection' object
		*/
		connection.on('message', (data) => {
			data = JSON.parse(data);

			if(data.topic === 'SUBSCRIPTION_ACK' && data.consumerId === consumerId){
				resolve(publicMembers);
			}
		});
		connection.on('error', (error) => {
			if(data.topic === 'SUBSCRIPTION_ERROR' && data.consumerId === consumerId){
				reject(error);
			}
		});
	});
}

module.exports = Consumer;
