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
