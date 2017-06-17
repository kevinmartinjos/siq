/*
	To be run on a nodejs env.
	siq.js need to be browserified to use from a browser
*/

var Siq = require('../src/client/siq');

//change port as required
var siqConnection = Siq.connect('ws://localhost:8888');

siqConnection.then((siq) => {
	var producer = siq.createProducer();

	var callback = function(messageList){
		/*Gets invoked when queue is full*/
		console.log("flushing queue: consumerTest");
		console.log(messageList);
		/*Add another message to consumerTest queue*/
		producer.produce('consumerTest', 'After flush');
		console.log('http://localhost:port/ should now show a single message in \'consumerTest\' queue');
	};

	var consumerConnection = siq.createConsumer('consumerTest', callback);
	
	producer.produce('consumerTest', 'message1');
	producer.produce('consumerTest', 'message2');
	producer.produce('consumerTest', 'message3');
	producer.produce('consumerTest', 'message4');
	producer.produce('consumerTest', 'message5');

	console.log("enqueued 5 messages");

	
});
