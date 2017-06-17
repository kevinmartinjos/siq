/*
	To be run on a nodejs env.
	siq.js need to be browserified to use from a browser
*/

var Siq = require('../src/client/siq');

//change port as required
var siqConnection = Siq.connect('ws://localhost:8888');

siqConnection.then((siq) => {
	function producerCallback(id){
		console.log(id);
	};

	var producer = siq.createProducer(producerCallback);

	var mordorCallback = function(messageList){
		/*Gets invoked when queue is full*/
		console.log("flushing queue: gondor");
		console.log(messageList);
		/*Add another message to consumerTest queue*/
	};

	var gondorCallback = function(messageList){
		console.log("flushing queue: gondor");
		console.log(messageList);
	}

	var mordorConsumer = siq.createConsumer('mordor', mordorCallback);
	var gondorConsumer = siq.createConsumer('gondor', gondorCallback);

	mordorConsumer.then(() => {
		console.log("mordor created");
	});

	gondorConsumer.then(() => {
		console.log("gondor created");
	});

	producer.produce('mordor', 'message1');
	producer.produce('mordor', 'message2');
	producer.produce('mordor', 'message3');
	producer.produce('mordor', 'message4');
	producer.produce('mordor', 'message5');

	producer.produce('gondor', 'message1');
	producer.produce('gondor', 'message2');
	producer.produce('gondor', 'message3');
	producer.produce('gondor', 'message4');
	producer.produce('gondor', 'message5');

	console.log("enqueued 5 messages to each queue");

	
});
