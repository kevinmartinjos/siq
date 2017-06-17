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
	
});
