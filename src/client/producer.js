let WebSocketClient = require('ws');
let Utils = require('../utils');
var logger = Utils.logger;
var isNullOrEmpty = Utils.isNullOrEmpty;
var serialize = Utils.serialize;

function Producer(connection){
	var self = this;
	this.messageCount = 0;
	this.pendingAcknowledgement = {};

	function Transaction(ackId, connection){
		var transactionSelf = this;
		this.ackId = ackId;
		this.connection = connection;
		return new Promise((resolve, reject) => {
			connection.on('message', (data) => {
				data = JSON.parse(data);

				if(data.topic === "ID"){
					var ackId = data.ackId;
					if(ackId === transactionSelf.ackId){
						resolve(data.id);
					}
				}
				else if(data.topic === "ERROR"){
					logger.debug("Transaction:" + serialize(data.error));
					if(data.ackId === transactionSelf.ackId){
						reject(data.error);
					}
				}
			});	
		});
	}

	return {
		produce: function(queue, message){
			var ackId = self.messageCount++;
			var payload = {
				topic: 'ADD',
				queue: queue,
				message: message,
				ackId: ackId
			};

			connection.send(JSON.stringify(payload));
			var transaction = new Transaction(ackId, connection);
			/*
				We have 'produced' the message. Now we need to handle whatever
				acknowledgement the server sends us back
			*/
			return transaction;
			
		}

	}

}

module.exports = Producer;