var Siq = require('../src/client/siq');

//change port as required
var siqConnection = Siq.connect('ws://localhost:8888');

siqConnection.then((siq) => {
	var producer = siq.createProducer();
	for(var i=0; i<18; i++){
		producer.produce('bufqueue', 'message');
	}

	console.log("Messages produced");
	var callback = (messageList) => {
		console.log(messageList.length);
	};

	var consumerConnection = siq.createConsumer('bufqueue', callback);
	
});