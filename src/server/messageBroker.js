let uuid = require('uuid/v4');
let nconf = require('nconf');
let DB = require('./db');
let Queue = require('./queue');
let Utils = require('../utils');

var logger = Utils.logger;
var isNullOrEmpty = Utils.isNullOrEmpty;

nconf.argv().env().file('serverConfig.development.json');

/*
	TODO: load qMap from a persistent storage
	TODO: create queues from a config file
*/

//In-memory queue
qMap = {};

var MessageBroker = (function(){
	
	function _getQFromName(name){
		if(qMap[name] !== undefined){
			return qMap[name];
		}
		else
			return _createQueue(name);
	};

	function _createQueue(name, bufferSize=nconf.get("defaultBufferSize")){
		logger.debug("Create new queue: " + name);
		if(qMap[name] === undefined)
			qMap[name] = new Queue(name, bufferSize);
		DB.createQueue(name, bufferSize);
		return qMap[name];
	};

	function _deleteQueue(name){
		delete qMap[name];
		DB.deleteQueue(name);
	}

	function _loadPersisted(callback){
		DB.selectAllQueues((err, rows) => {
			if(err !== null)
				logger.error(err);

			rows.forEach((row) => {
				_createQueue(row.name, row.bufferSize)
			});

			DB.selectAllMessages((err, rows) => {
				if(err !== null){
					logger.error(err);
				}
				else{
					rows.forEach((row) => {
						var queue = _getQFromName(row.queue);
						var payload = {
							id: row.id,
							message: row.message
						};

						queue.add(payload);
					});
					callback();
				}
			});
		});
		
	}

	function _persistMessage(id, qName, message){
		DB.insertMessage(id, qName, message);
	};

	return {
		add: function(qName, message){
			var queue = _getQFromName(qName);
			var id = uuid();
			var payload = {
				id: id,
				message: message
			}

			var returnedId = queue.add(payload);
			

			//control will reach here if queue.add does not throw any errors
			_persistMessage(returnedId, qName, message);

			return returnedId;
			
		},
		subscribe: function(ws, qName, consumerId){
			var queue = _getQFromName(qName);
			return queue.subscribe(ws, consumerId);
		},
		getState: function(){
			return Object.keys(qMap).map(function(key){
				return {
					name: key,
					data: qMap[key].getData()
				}
			});
		},
		acknowledgeMessage: function(qName, consumerId){
			var queue = _getQFromName(qName);
			queue.acknowledgeMessage(consumerId);
		},
		load: _loadPersisted,
		createQueue: _createQueue,
		deleteQueue: _deleteQueue
	};

})();

module.exports = MessageBroker;