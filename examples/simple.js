/*
	To be run on a nodejs env.
	siq.js need to be browserified to use from a browser
*/

var Siq = require('../src/client/siq');

//change port as required
var siqConnection = Siq.connect('ws://localhost:8888');

siqConnection.then((siq) => {
	var producer = siq.createProducer();
	var callback = (id) => {
		console.log("Message enqueued. Generated id: " + id);
		console.log("Open http://localhost:8000 to view the queue");
	};
	
	producer.produce('q1', 'message1', callback);
	producer.produce('q1', 'message2', callback);
	producer.produce('q1', 'message3', callback);
	producer.produce('q1', 'message4', callback);
	producer.produce('q1', 'message5', callback);
	producer.produce('q1', 'message6', callback);
	producer.produce('q1', 'message7', callback);
	producer.produce('q1', 'message8', callback);
	
});
