let chai = require('chai');
let chaiHttp = require('chai-http');
let WebSocketClient = require('ws');
let nconf = require('nconf');
let server = require('../src/server/server');
let should = chai.should();
let expect = chai.expect;
let assert = chai.assert;

chai.use(chaiHttp);

describe('Server', () => {
	var client;

	beforeEach((done) => {
		//clean up all the code
		done();
	});

	describe('/GET', () => {
		it("should load queue map", (done) => {
			chai.request(server).get('/').end((err, res) => {
				res.should.have.status(200);
				res.body.should.be.a('array');
				done();
			})
		});
	});

	describe('Websockets', () => {
		it("server should be up and running", (done) => {		
			client =  new WebSocketClient("ws://localhost:" + nconf.get("ws:port"));
			
			client.on('error', (error) => {
				assert.fail("error in connecting", "websocket connection", error);
			})
			client.on('open', () => {
				done();
			});
		});
	});
})