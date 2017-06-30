let chai = require('chai');
let chaiHttp = require('chai-http');
let Siq = require('../src/client/siq');
let DB = require('../src/server/db');
let should = chai.should();
let nconf = require('nconf');
let expect = chai.expect;
let assert = chai.assert;

nconf.argv().env().file('serverConfig.development.json');
chai.use(chaiHttp);

describe('client', () => {
	
	var siqConnection = Siq.connect('ws://localhost:' + nconf.get('ws:port'));

	after((done) => {
		siqConnection.then((siq) => {
			siq.disconnect();
			DB.deleteQueue('q1', () => {
				done();
			});
		});
	});

	describe('connect', () => {
		it("should throw error in case of falsy url", () => {
			var siq = Siq.connect(null);
			assert.equal(null);

			siq = Siq.connect(undefined);
			assert.equal(null);

			siq = Siq.connect("");
			assert.equal(null);

			siq = Siq.connect([]);
			assert.equal(null);

			siq = Siq.connect({});
			assert.equal(null);
		});

		it("should connect to siq", () => {
			siqConnection.then((siq) => {
				expect(siq).to.have.property('url');
				expect(siq).to.have.property('put');
				expect(siq).to.have.property('get');
				expect(siq).to.have.property('error');
				assert.isNull(siq.error, "error should be null");	
			});
		});
	});

	describe('producer', () => {
		var siqConnection;
		var persistedMessageId = null;
		before(() => {
			siqConnection = Siq.connect('ws://localhost:' + nconf.get('ws:port'));
		});

		after(() => {
			siqConnection.then((siq) => {
				siq.disconnect();
			});
		});

		it("should get a correlation id after enqueue", (done) => {
			siqConnection.then((siq) => {
				var producer = siq.createProducer();
				var callback = (id) => {
					assert.isNotNull(id);
					persistedMessageId = id;
					done();	
				}
				producer.produce('q1', 'message1', callback);
			});
		});

		it("should persist messages to disk", (done) => {
			assert.isNotNull(persistedMessageId);
			DB.selectMessage(persistedMessageId, (error, row) => {
				assert.isNull(error);
				assert.isNotNull(row);
				done();	
			})

		});

		// it("should block if queue is full", (done) => {
		// 	siqConnection.then((siq) => {
		// 		var producer = siq.createProducer();
		// 		var id;

		// 		//fill up a queue
		// 		// -1 since we had already enqued a message in the previous test
		// 		for(var i=0; i<nconf.get("defaultBufferSize") - 1; i++){
		// 			producer.produce('q1', 'message');
		// 		}

		// 		var errCallback = (error) => {
		// 			done();
		// 		};

		// 		//the last message would cause an overflow, and it would throw an error
		// 		producer.produce('q1', 'overflow message', null, errCallback);
		// 	});
		// });

		it("should create a new instance of queue if queue is full", (done) => {
			siqConnection.then((siq) => {
				var producer = siq.createProducer();
				var id;

				//fill up a queue
				// -1 since we had already enqued a message in the previous test
				for(var i=0; i<nconf.get("defaultBufferSize") - 1; i++){
					producer.produce('q1', 'message');
				}

				var errCallback = (error) => {
					assert.fail("Did not expect errCallback to execute", "errCallback executed", error);
				};

				var successCallback = (id) => {
					assert.isNotNull(id);
					done();
				};

				//the last message would cause an overflow, and it would throw an error
				producer.produce('q1', 'overflow message', successCallback, errCallback);
			});
		});
	});

	describe("consumer", () => {
		var siqConnection;

		before(() => {
			siqConnection = Siq.connect('ws://localhost:' + nconf.get('ws:port'));
		});

		after(() => {
			siqConnection.then((siq) => {
				siq.disconnect();
			});

		});

		it("should flush when the queue is full and a first consumer connects", (done) => {
			siqConnection.then((siq) => {
				var callback = function(messageList){
					assert.equal(messageList.length, nconf.get("defaultBufferSize"));
					messageList.forEach(function(messageItem, index){
						messageItem = JSON.parse(messageItem);
						var index = messageItem.message.indexOf("message");
						assert.notEqual(messageItem.message, -1);
					});
					done();
				}
				var consumerConnection = siq.createConsumer('q1', callback);
			});
		});

		it("should delete persisted messages when queue flushes", (done) => {
			//q1 would have flushed in the previous test
			DB.selectAllFrom('q1', (err, rows) => {
				assert.equal(rows.length, 0);
				done();
			})
			
		});

		it("should flush all instances of the queue to the consumer(s)", (done) => {
			var flushCount = 0;
			var callback = (messageList) => {
				flushCount++;
				console.log("Flushing a queue of length: " + messageList.length);
				messageList.forEach(function(messageItem, index){
					messageItem = JSON.parse(messageItem);
					console.log(messageItem.message);
				});
				if(flushCount === 3){
					done();
				}
			};

			siqConnection.then((siq) => {
				var producer = siq.createProducer();

				//would have created 4 instances of bufferedQueue, provided bufferSize is 5
				for(var i=0; i<18; i++){
					producer.produce('bufferedQueue', 'message');
				}

				var consumerConnection = siq.createConsumer('bufferedQueue', callback);
			});
		});

		it("should have deleted the data in queue on flush", (done) => {
			//if queue was flushed, we would be able to push more data into queue 'q1'
			siqConnection.then((siq) => {
				var producer = siq.createProducer();
				var callback = (id) => {
					assert.isString(id)
					done();
				}
				producer.produce('q1', 'after flush', callback);
			})
		});
	});

	// describe("queues", () => {
	// 	var siqConnection;

	// 	before(() => {
	// 		siqConnection = Siq.connect('ws://localhost:' + nconf.get('ws:port'));
	// 	});

	// 	after(() => {
	// 		siqConnection.then((siq) => {
	// 			siq.disconnect();
	// 		});
	// 	});

	// 	it("should be able to create queue of custom length", (done) => {
	// 		siqConnection.then((siq) => {
	// 			siq.createQueue('newQueue', 20, (name) => {
	// 				assert.equal(name, 'newQueue');
	// 				done();
	// 			});
	// 		});
	// 	});
	// })
})