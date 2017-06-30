var sqlite3 = require('sqlite3').verbose();
var Utils = require('../utils');

var logger = Utils.logger;
var db = new sqlite3.Database("./siq_persist");

function _init(){
	db.run("CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, queue TEXT, message TEXT);", [], (err) => {
			if(err !== null){
				logger.error(err);
			}
			db.run("CREATE TABLE IF NOT EXISTS queues (id TEXT PRIMARY KEY, name TEXT, bufferSize INT);", [], (err) => {
				if(err !== null)
					logger.error(err);
			});
	});
};

_init();

var Db = (function(){
	var self = this;
	this.initialized = false;

	function _selectAll(callback){
		db.all("SELECT * FROM messages;", [], (err, rows) => {
			if(err != null){
				logger.error(err);
			}
			else{
				callback(err, rows);
			}
		});
	};

	function _selectAllQueues(callback){
		db.all("SELECT * FROM queues;", [], (err, rows) => {
			if(err != null){
				logger.error(err);
			}
			else{
				callback(err, rows);
			}
		});
	};

	function _insertMessage(id, qName, message, callback){
		var stmt = "INSERT INTO messages VALUES (\'" + id + "\',\'" + qName + "\',\'" + message + "\');"
		db.run(stmt, [], (err) => {
			if(typeof callback === "function"){
				callback(err);
			}
		});
	};

	function _selectMessage(id, callback){
		var stmt = "SELECT * FROM messages where id=\'" + id +"\';";
		db.all(stmt, [], (err, rows) => {
			if(err != null){
				logger.error(err);
			}
			else{
				callback(err, rows);
			}
		});
	};

	function _selectAllFrom(qName, callback){
		var stmt = "SELECT * FROM messages where queue=\'" + qName +"\';";
		db.all(stmt, [], (err, rows) => {
			if(err != null){
				logger.error(err);
			}
			else{
				callback(err, rows);
			}
		});
	};

	function _deleteAllFrom(qName, callback){
		var stmt = "DELETE FROM messages where queue=\'" + qName +"\';";
		db.run(stmt, [], (err) => {
			if(err != null){
				logger.error(err);
			}
			callback(err);
		});
	};

	function _purge(callback){
		var stmt = "DELETE FROM messages;";
		db.run(stmt, [], (err) => {
			if(err != null){
				logger.error(err);
			}
			callback(err);
		});
	};

	function _deleteMessage(id, qName, callback){
		var stmt = "DELETE FROM messages where id=\'" + id + "\' and queue=\'" + qName + "\';";
		db.run(stmt, [], (err) => {
			if(err != null){
				logger.error(err);
			}
			if(typeof callback === "function")
				callback(err);
		});
	};

	function _createQueue(id, name, bufferSize, callback){
		var stmt = "INSERT INTO queues values (\'" + id + "\',\'" + name + "\',\'" + bufferSize + "\')";
		db.run(stmt, [], (err) => {
			if(err !== null)
				logger.error(err);
			
			if(typeof callback === "function")
				callback(err);
		});
	};

	function _deleteQueue(name, callback){
		var stmt = "DELETE FROM queues where name=\'" + name + "\'";
		db.run(stmt, [], (err) => {
			if(err !== null){
				logger.error(err);
			}
			else{
				var stmt = "DELETE FROM messages where queue=\'" + name + "\'";
				db.run(stmt, [], (err) => {
					if(err !== null)
						logger.error(err);
					if(typeof callback === "function")
						callback(err);
				});
			}
		});
	};

	return {
		init: _init,
		selectAllMessages: _selectAll,
		selectAllQueues: _selectAllQueues,
		insertMessage: _insertMessage,
		selectMessage: _selectMessage,
		deleteMessage: _deleteMessage,
		initialized: this.initialized,
		selectAllFrom: _selectAllFrom,
		deleteAllFrom: _deleteAllFrom,
		createQueue: _createQueue,
		deleteQueue: _deleteQueue,
		purge: _purge
	}
})();


module.exports = Db;
