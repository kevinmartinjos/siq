/*
	To be run on a nodejs env.
	siq.js need to be browserified to use from a browser
*/

var Siq = require('../src/client/siq');

//change port as required
var siqConnection = Siq.connect('ws://localhost:8888');

siqConnection.then((siq) => {
	var bufferSize = 20;
	siq.createQueue('customQueue', bufferSize, () => {
		var consumer = siq.createConsumer('customQueue', (messageList) => {
			console.log("flushing customQueue");
			console.log(messageList);
		});

		var producer = siq.createProducer();
		for(var i=0; i<=bufferSize; i++)
			producer.produce('customQueue', 'custom');
		
	});
});
