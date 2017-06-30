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

/*
	TODO:`
	Page the queue, instead of having everything in memory - or you will run out of memory
*/
//In-memory queue
qMap = {};

/*
	qMap data structure:
	qMap = {
		q1: [{id: 'abc', 'isFull': true, bufferSize: 5}, {id: 'def', 'isFull': false, bufferSize: '6'}],
		q2: [{id: 'ghi', 'isFull': false, bufferSize: 5}],
	}
*/
var MessageBroker = (function(){
	
	function _getQFromName(name){
		if(qMap[name] !== undefined){
			var len = qMap[name].length;
			var queue = qMap[name][len - 1];
			if(queue.isFull()){
				return _createQueue(name);
			}
			return qMap[name][len - 1];
		}
		else
			return _createQueue(name);
	};

	function _createQueue(name, bufferSize=nconf.get("defaultBufferSize")){
		logger.debug("Create new queue: " + name);
		var qId = uuid();
		if(qMap[name] === undefined){
			qMap[name] = [new Queue(name, bufferSize, qId)];
		}
		else{
			qMap[name].push(new Queue(name, bufferSize, qId));
		}

		DB.createQueue(qId, name, bufferSize);
		var len = qMap[name].length;

		/*
			return the last element of the queue array. Queue array acts as a stack.
			An element is pushed to the queue stack only if the previous buffered queue is 
			full.
		*/
		return qMap[name][len - 1];
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

			/*	TODO:
				Ideally we should return some sort of ID from queue.js
				Forgoing this necessary resilience feature for the sake of simplicity.
				Right now, we return the consumerId even if queue.subscribe() throws an error
			*/
			qMap[qName].forEach((queue) => {
				queue.subscribe(ws, consumerId);
			});

			return consumerId;
		},
		getState: function(){
			return Object.keys(qMap).map(function(key){
				return {
					name: key,
					data: Object.keys(qMap[key]).map(function(index){
						return qMap[key][index].getData();
					})
				}
			});
		},
		acknowledgeMessage: function(qName, consumerId){
			qMap[qName].forEach((queue) => {
				queue.acknowledgeMessage(consumerId);
			});

			qMap[qName].forEach((queue, index) => {
				if(queue.isCleared()){
					qMap[qName].splice(index, 1);
				}
			});
		},
		load: _loadPersisted,
		createQueue: _createQueue,
		deleteQueue: _deleteQueue
	};

})();

module.exports = MessageBroker;