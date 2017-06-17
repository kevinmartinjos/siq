let http = require('http');
let express = require('express');
let app = express();
let bodyParser = require('body-parser');
let nconf = require('nconf');
let WebSocketServer = require('ws').Server;
let Util = require('../utils');
let MessageBroker = require('./messageBroker');

var logger = Util.logger;
var serialize = Util.serialize;

nconf.argv().env().file('serverConfig.development.json');
nconf.defaults({
	'http': {
		'port': 4000
	},
	'ws': {
		'port': 4444
	}
});

/*
	Set up the HTTP server
*/

var httpServer = http.createServer((request, response) => {
	response.setHeader('Content-Type', 'application/json');
	response.writeHead(200);
	response.write(serialize(MessageBroker.getState()));
	response.end();
});

httpServer.listen(nconf.get("http:port"), () => {
	logger.info('HTTP server running at ' + nconf.get('http:port'));
});

/*
	Initialize the web socket server
*/
var wsServer = new WebSocketServer({
	port: nconf.get("ws:port")
});

function addMessage(ws, data){
	try{
				
		var id = MessageBroker.add(data.queue, data.message);
		var payload = {
			topic: "ID",
			id: id,
			ackId: data.ackId
		};
		ws.send(serialize(payload));
	}
	catch(e){
		var payload = {
			topic: "ERROR",
			ackId: data.ackId,
			error: e
		};
		logger.error(e);
		ws.send(serialize(payload));
	}
};

function subscribe(ws, data){
	try{
		var id = MessageBroker.subscribe(ws, data.queue, data.consumerId);
		var payload = {
			topic: "SUBSCRIPTION_ACK",
			consumerId: id
		};
		ws.send(serialize(payload));
	}
	catch(e){
		var payload = {
			topic: "SUBSCRIPTION_ERROR",
			ackId: data.ackId,
			error: e
		};
		logger.error(e);
		ws.send(serialize(payload));
	}
};

function acknowledgeMessage(ws, data){
	MessageBroker.acknowledgeMessage(data.queue, data.consumerId);
};

wsServer.on('connection', (ws) => {
	logger.debug('websocket connection accepted');
	ws.on('message', (data) => {
		data = JSON.parse(data);
		/*TODO: Enumerate all the topics somewhere in a file*/
		switch(data.topic){
			case 'ADD':
				addMessage(ws, data);			
				break;
			case 'SUBSCRIBE':
				subscribe(ws, data);
				break;
			case 'MSG_ACK':
				acknowledgeMessage(ws, data);
				break;
		}
	})
});

logger.info('Websocket server running at ' + nconf.get('ws:port'));


/*
	Initialize the message broker
*/
module.exports = app;