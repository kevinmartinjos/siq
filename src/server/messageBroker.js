let uuid = require('uuid/v4');
let nconf = require('nconf');
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
		if(!isNullOrEmpty(qMap[name])){
			return qMap[name];
		}
		else
			return _createQueue(name);
	}

	function _createQueue(name, bufferSize=nconf.get("defaultBufferSize")){
		logger.debug("Create new queue: " + name);
		qMap[name] = new Queue(name, bufferSize);
		return qMap[name];
	}

	return {
		add: function(qName, message){
			var queue = _getQFromName(qName);
			var id = uuid();
			var payload = {
				id: id,
				message: message
			}

			return queue.add(payload);
			
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
		}
	};

})();

module.exports = MessageBroker;