var mongojs = require('mongojs');
var config = {
    dbConnStr: 'jndsol:jndsolpass@kahana.mongohq.com:10040/app26850333'
}
var db = mongojs(config.dbConnStr);
var q = require('q');

exports.getDb = function(name){
	return db;
}

exports.getConfig = function(){
	return config;
}

exports.find = function(col, criteria, returnObj){
	var deferred = q.defer();
	var col = db.collection(col);
	col.find(criteria, function(err, docs) { 
		if (err) {
			deferred.reject(new Error("Error: ", err));
		}
		if(returnObj){
			returnObj.results = docs;
			deferred.resolve(returnObj);
		}else{
			deferred.resolve(docs);
		}
	});
	return deferred.promise;
}

exports.save = function(col, obj, returnObj){
	var deferred = q.defer();
	var col = db.collection(col);
	col.save(obj, function(err, doc, lastErrorObject) { 
		if (err) {
			deferred.reject(new Error("Error: ", err));
		}
		if (returnObj){
			deferred.resolve(returnObj);
		}else{
			deferred.resolve(doc);
		}
	});
	return deferred.promise;
}

exports.insert = function(col, obj, returnObj){
	var deferred = q.defer();
	var col = db.collection(col);
	col.insert(obj, function(err, doc, lastErrorObject) { 
		if (err) {
			deferred.reject(new Error("Error: ", err));
		}
		if (returnObj){
			deferred.resolve(returnObj);
		}else{
			deferred.resolve(doc);
		}
	});
	return deferred.promise;
}

	