var sqlite3 = require('sqlite3').verbose();
var Utils = require('../utils');

var logger = Utils.logger;
var db = new sqlite3.Database("./siq_persist");

var Db = (function(){
	var self = this;
	this.initialized = false;

	function _init(callback){
		db.run("CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, queue TEXT, message TEXT);", [], (err) => {
			if(typeof callback === "function"){
				if(err == null){
					self.initialized = true;
				}
				callback(err);
			}
		});
	};

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

	return {
		init: _init,
		selectAll: _selectAll,
		insertMessage: _insertMessage,
		selectMessage: _selectMessage,
		initialized: this.initialized,
		selectAllFrom: _selectAllFrom,
		deleteAllFrom: _deleteAllFrom
	}
})();


module.exports = Db;
