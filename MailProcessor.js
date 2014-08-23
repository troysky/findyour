var jsdom = require('jsdom').jsdom;
var jquery = require('jquery');
var request = require('request');
var dbm = require('./MongoDBManager');
var mg = require('./MailGenerator');
var ms = require('./MailSender');
var constants = require('./Constants');
//var gd = require('./GoogleDriveService');
var q = require('q');

exports.process = function(mail){
	if(!mail.html){
		console.log("failed to process mail: no HTML contents found");
	}

	if(mail.subject.indexOf("New submission") >= 0){
		this.processNewJob(mail);
	}else if(mail.subject.indexOf("New Registration") >= 0){
		this.processNewRegistration(mail);
	}else{
		console.log("mail subject does not match: (New submission|New Registration)*");		
	}
}

exports.processNewJob = function(mail){
	console.log("start processing new job: " + mail.subject);
	this.extractCriteria(mail.html)	
	.then(this.createId, this.handleError)
	//.then(this.saveRequest, this.handleError)
	.then(this.findNearByPostCodes, this.handleError)
	.then(this.findPros, this.handleError)
	.then(this.saveJobs, this.handleError)
	.then(this.distribute.bind(this), this.handleError);
}

exports.processNewRegistration = function(mail){
	console.log("start processing new registration: " + mail.subject);
	this.extractDetails(mail.html)
	.then(this.saveRegistration, this.handleError)
	.then(function(doc){console.log("details saved", doc)}, this.handleError);
}


exports.extractCriteria = function(html){
	var self = this;
	var deferred = q.defer();
	console.log("extracting criteria");
	var window = jsdom("<html><body>" + html + "</body></html>", null, {
	        FetchExternalResources: false,
	        ProcessExternalResources: false,
	        MutationEvents: false,
	        QuerySelector: false
	}).parentWindow;
	jsdom.jQueryify(window, jquery, function () {
		try{
			var criteria = {				
				customerName: self.grepValue(window, "Name"),
				customerEmail: self.grepValue(window, "Email"),
				customerPhone: self.grepValue(window, "Mobile Number"),
				category: self.grepValue(window, "Category"),				
				postCode: self.grepValue(window, "Post Code").substring(0,4)
			}
			self.removeRows(window, "Email");
			self.removeRows(window, "Mobile Number");

			criteria.customerRequest = window.document.body.innerHTML;
			
			deferred.resolve(criteria);
		}catch(e){
			deferred.reject("failed to extract criteria: " + e);
		}
	});	

	return deferred.promise;
}

exports.createId = function(criteria){
	var timeInMillis = (new Date()).getTime();
	console.log("assinging id", timeInMillis);
	criteria.id = timeInMillis;
	return criteria;
}


/*exports.saveRequest = function(criteria){
	console.log("saving request to googledrive");
	return gd.insert(q, criteria.id, criteria.customerRequest);
}*/

exports.extractDetails = function(html){
	var self = this;
	var deferred = q.defer();
	console.log("extracting pros detail");
	var window = jsdom("<html><body>" + html + "</body></html>", null, {
	        FetchExternalResources: false,
	        ProcessExternalResources: false,
	        MutationEvents: false,
	        QuerySelector: false
	}).parentWindow;
	jsdom.jQueryify(window, jquery, function () {
		try{
			var companyName = self.grepValue(window, "Company Name");
			var email = self.grepValue(window, "Email");
			var category =self.grepValue(window, "Category");
			var proBusinessPhone =self.grepValue(window, "Business Phone");
			var proMobilePhone = self.grepValue(window, "Mobile Number");
			var category =self.grepValue(window, "Category");

			var details = {				
				_id: email,
				companyName: companyName,
				category: category,
				businessPhone: proBusinessPhone,
				mobilePhone: proMobilePhone,
				profile: companyName.toLowerCase().replace(/\s/g, "-"),
				email: email
			}
			deferred.resolve(details);
		}catch(e){
			deferred.reject("failed to parse contents: " + e);
		}
	});

	return deferred.promise;
}

exports.saveRegistration = function(details){
	console.log("saving pros detail", details);
	return dbm.save(constants.PROS_COL, details);
}

exports.findNearByPostCodes = function(criteria){	
	var deferred = q.defer();
	if(criteria.postCode && constants.POSTCODE_SEARCH_CATEGORIES.indexOf(criteria.category) >= 0){
		console.log("searching nearby postcodes for " + criteria.postCode);
		request('http://api.geonames.org/findNearbyPostalCodesJSON?postalcode=' + criteria.postCode + '&country=AU&radius=5&username=jndsolution&maxRows=500', function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var jsonBody = JSON.parse(body);
				var array = jsonBody.postalCodes;
				var postCodes = [];
				for(var i = array.length-1; i >= 0; i--){
					var pc = array[i].postalCode;
					if(pc.slice(0, 1) !== "1"){
						postCodes.push(pc);
					}
				}
				criteria.postCodes = postCodes;
				deferred.resolve(criteria);
			}else{
				deferred.reject("failed to extract nearby postcodes: " + error);
			}
		});
	}else{
		deferred.resolve(criteria);
	}
	return deferred.promise;
}

exports.findPros = function(criteria){
	console.log("searching pros for ", criteria.category);	
	return dbm.find(constants.PROS_COL, {category: criteria.category}, criteria);
}

exports.saveJobs = function(criteria){
	console.log("saving jobs");	
	var jobs = [];
	for(var i = criteria.results.length -1; i >= 0; i--){
		var pro = criteria.results[i];
		var job = {
			_id: criteria.id,
			category: criteria.category,
			customerName: criteria.customerName,
			customerEmail: criteria.customerEmail,	
			customerPhone: criteria.customerPhone,
			customerRequest: criteria.customerRequest,	
			pro: pro
		}
		jobs.push(job);
	}
	
	return dbm.insert(constants.JOBS_COL, jobs, criteria);
}

exports.handleError = function(reason){
	console.log("error: " + reason);
}

exports.grepValue = function(win, key){
	return win.$('tr:has(td:contains(' + key + '))').eq(1).next().find('td').text().trim();
}

exports.removeRows = function(win, key){
	var label = win.$('tr:has(td:contains(' + key + '))').eq(1);
	var value = label.next();
	label.remove();
	value.remove();
}

exports.distribute = function(details){	
	for(var i = details.results.length -1; i >= 0; i--){
		var pro = details.results[i];
		var recipient = pro.email;	
		var subject = constants.JOB_SUBJECT + " - " + details.category + " - " + details.id;	
		var html = mg.getJobNotificationToPro(details, pro);
		var message = mg.generate(constants.SYSTEM_EMAIL, subject, recipient, html);
		
		console.log("sending email to " + recipient);
		ms.send(message);		
	}
}



