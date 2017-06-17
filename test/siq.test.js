let chai = require('chai');
let chaiHttp = require('chai-http');
let Siq = require('../src/client/siq');
let should = chai.should();
let nconf = require('nconf');
let expect = chai.expect;
let assert = chai.assert;

nconf.argv().env().file('serverConfig.development.json');
chai.use(chaiHttp);

describe('client', () => {
	

	before((done) => {
		//clean up all the code
		done();
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
			var siqConnection = Siq.connect('ws://localhost:' + nconf.get('ws:port'));
			siqConnection.then((siq) => {
				expect(siq).to.have.property('url');
				expect(siq).to.have.property('put');
				expect(siq).to.have.property('get');
				expect(siq).to.have.property('error');
				assert.isNull(siq.error, "error should be null");	
				siq.disconnect();
			});
		});
	});

	describe('producer', () => {
		var siqConnection;

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
				var correlationPromise = producer.produce('q1', 'message1');
				correlationPromise.then((id) => {
					assert.isNotNull(id);
					done();	
				});	
			});
		});

		it("should block if queue is full", (done) => {
			siqConnection.then((siq) => {
				var producer = siq.createProducer();
				var id;

				//fill up a queue
				producer.produce('q1', 'message2');
				producer.produce('q1', 'message3');
				producer.produce('q1', 'message4');
				producer.produce('q1', 'message5');


				//the last message would cause an overflow, and no id would be returned
				producer.produce('q1', 'overflow message').then(() => {
					done(new Error("expected method to reject"));
				}).catch((e) => {
					done();
				}).catch(done);
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
					console.log("on callback");
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

		it("should have deleted the data in queue on flush", (done) => {
			siqConnection.then((siq) => {
				var producer = siq.createProducer();
				producer.produce('q1', 'after flush').then((id) => {
					assert.isString(id)
					done();
				});
			})
		});
	});
})