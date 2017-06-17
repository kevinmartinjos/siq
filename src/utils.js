var winston = require('winston');

var Exception = function(message){
	return {
		errorMessage: message
	};
};

var Utils = (function(){
	return {
		/*
			Helper function to check for falsy values
		*/
		isNullOrEmpty: function(value){
			if(value === undefined || value === null)
				return true;
			if(typeof value === "string" && value.length === 0)
				return true;
			if(typeof value === "object" && Object.keys(value).length === 0)
				return true;
			if(typeof value === "array" && value.length === 0)
				return true;
			return false;
		},
		logger: winston,
		serialize: function(value){
			var serial;
			if(typeof value === "object")
				serial = JSON.stringify(value);
			else if(typeof value === "string")
				serial = value;
			return serial;
		},
		Exception: Exception
	}
})();

module.exports = Utils;