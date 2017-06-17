let WebSocketClient = require('ws');
var Utils = require('../utils');
var Producer = require('./producer');
var Consumer = require('./consumer');

var isNullOrEmpty = Utils.isNullOrEmpty;
var logger = Utils.logger;

var Siq = (function(){
	var self = this;
	this.connection = null;
	return {
		connect: function(url){
			self.connection = new SiqConnection(url);
			return self.connection;
		},
		disconnect: function(){
			if(!isNullOrEmpty){
				self.connection.close();
			}
		}
	}	
})();


var SiqConnection = function(url){
	if(isNullOrEmpty(url)){
		logger.debug("Connection url is empty/null: " + url);
		return null;
	}

	var connection = new WebSocketClient(url);

	var exposed  = {
		url: url,
		get: function(){},
		put: function(){},
		disconnect: function(){},
		createProducer: function(){
			return new Producer(connection);
		},
		createConsumer: function(qName, callback){
			return new Consumer(connection, qName, callback);
		},
		error: null,
		disconnect: function(){
			connection.close();
		}
	}

	return new Promise((resolve, reject) => {
		connection.on('open', () => {
			resolve(exposed);
		});

		connection.on('error', (error) => {
			reject(error);
		});
	});
	

	
}

module.exports = Siq;