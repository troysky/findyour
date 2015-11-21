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
	}else if(mail.subject.indexOf("Re submission") >= 0){
		this.processExistingJob(mail);
	}else if(mail.subject.indexOf("New Registration") >= 0){
		this.processNewRegistration(mail);
	}else{
		console.log("mail subject does not match: (New submission|New Registration)*");		
	}
}

exports.processNewJob = function(mail){
	console.log("start processing new job: " + mail.subject);
	this.extractCriteria(mail.html)	
	//.then(this.saveRequest, this.handleError)
	.then(this.findNearByPostCodes, this.handleError)
	.then(this.findPros, this.handleError)
	.then(this.createJobs.bind(this), this.handleError)
	.then(this.saveJobs, this.handleError)
	.then(this.distribute.bind(this), this.handleError);
}

exports.processExistingJob = function(mail){
	console.log("start processing existing job: " + mail.subject);
	this.extractCriteria(mail.html, mail.subject)	
	.then(this.findNearByPostCodes, this.handleError)
	.then(this.findPros, this.handleError)
	.then(this.createUnprocessedJobs.bind(this), this.handleError)
	.then(this.saveJobs, this.handleError)
	.then(this.distribute.bind(this), this.handleError);
}

exports.processNewRegistration = function(mail){
	console.log("start processing new registration: " + mail.subject);
	this.extractDetails(mail.html)
	.then(this.saveRegistration, this.handleError)
	.then(function(doc){console.log("details saved", doc)}, this.handleError);
}

exports.extractCriteria = function(html, subject){
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
				urgency: self.grepValue(window, "When would you like this professional to start"),
				postCode: self.grepValue(window, "Post Code").substring(0,4)
			}
			if(subject){
				criteria.id = self.extractJobId(subject);
			}else{
				criteria.id = self.generateId();
			}
			console.log("Job ID =", criteria.id);
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

exports.generateId = function(){
	return (new Date()).getTime().toString();
}

exports.extractJobId = function(subject){
	var arry = subject.split(" ");
	return arry[arry.length - 1].trim();
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
			var contactName = self.grepValue(window, "Name", 2);
			var email = self.grepValue(window, "Email");
			var streetAddress = self.grepValue(window, "Street Address");			
			var city = self.grepValue(window, "City");
			var state = self.grepValue(window, "State");
			var postCode = self.grepValue(window, "Post Code");
			var category = self.grepValue(window, "Category");
			var proBusinessPhone = self.grepValue(window, "Business Phone");
			var proMobilePhone = self.grepValue(window, "Mobile Number");
			var category = self.grepValue(window, "Category");
			var description = self.grepValue(window, "Business Description");
			var logo = self.grepValue(window, "Logo");
			var website = self.grepValue(window, "Your Website");
			var license = self.grepValue(window, "Are you Licensed?");
			var insurance = self.grepValue(window, "Do you have Insurance?");
			var abn = self.grepValue(window, "Please provide a copy of your ABN");
			var workBasePostCode = self.grepValue(window, "What suburb do you work around in NSW?");
			var facebook = self.grepValue(window, "facebook");
			var twitter = self.grepValue(window,"Twitter");
			var instagram = self.grepValue(window,"Instagram");
			var linkedin = self.grepValue(window,"Linkedin");
			var youtube = self.grepValue(window,"youtube");
			var radius = self.grepValue(window,"What distance do you want to cover for work?");
			var inclusions = self.listParser(window,"Inclusions of your service");
			var insurance = self.insuranceParser(window,"Do you have Insurance?","Please select which Insurances you are covered with");
			var license = self.licenseParser(window,"Are you Licensed?","Please provide your License number and send a copy to the findyour team");
			var awards = self.tableParser(window,"Awards you have received");
			var details = {				
				_id: email,
				companyName: companyName,
				contactName: contactName,
				category: category,
				businessPhone: proBusinessPhone,
				mobilePhone: proMobilePhone,
				profile: companyName.toLowerCase().replace(/\s/g, "-"),
				email: email,
				streetAddress: streetAddress,
				city: city,
				state: state,
				postCode: postCode,
				description: description,
				logoURL: logo,
				website: website,
				license: "To be verified",
				insurance: "To be verified",
				abn: abn,
				rating: 0,
				customerRating: 0,
				customerRatingCounter: 0,
				workBasePostCode: workBasePostCode,
				radius: radius,
				facebook: facebook,
				twitter: twitter,
				instagram: instagram,
				linkedin: linkedin,
				youtube: youtube,
				inclusions: inclusions,
				license: license,
				insurance: insurance,
				awards: awards

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
	var query = {category: criteria.category};
	if(criteria.postCode){
		query.$or = [
				{ postCodesToCover: { $exists: false } },
				{ postCodesToCover: criteria.postCode}
			];
	}
	return dbm.find(constants.PROS_COL, query, criteria);
}


exports.findExistingJob = function(id, pro){
	console.log("searching existing job for ", id, pro.profile);
	return dbm.find(constants.JOBS_COL, {_id: id + "-" + pro.profile});
}

exports.createJobs = function(criteria){
	var self = this;
	if(!self.validateId(criteria.id)){
		console.log("id validation failed, no jobs will be created");	
		return [];
	}
	console.log("creating jobs");		
	var jobs = [];
	for(var i = criteria.results.length -1; i >= 0; i--){
		var pro = criteria.results[i];
		if(criteria.customerEmail === constants.CUSTOMER_TEST && pro.email.indexOf("fypro") < 0){
			console.log("testing customer - skipping", pro.email);
			continue;
		}
		var job = self.createJob(criteria, pro);
		jobs.push(job);
	}	
	return jobs;
}

exports.createUnprocessedJobs = function(criteria){
	var self = this;
	if(!self.validateId(criteria.id)){
		console.log("id validation failed, no jobs will be created");	
		return [];
	}
	console.log("creating unprocessed jobs");	
	var deferred = q.defer();	
	var jobs = [];
	var processed = 0;
	for(var i = criteria.results.length - 1; i >= 0; i--){
		var pro = criteria.results[i];
		self.findExistingJob(criteria.id, pro).then(function(pro, docs){
			processed++;
			var skip = false;
			if(docs && docs.length > 0){
				console.log("found existing job - skipping");
				skip = true;
			}
			if(criteria.customerEmail === constants.CUSTOMER_TEST && pro.email.indexOf("fypro") < 0){
				console.log("testing customer - skipping", pro.email);
				skip = true;
			}
			if(!skip){
				var job = self.createJob(criteria, pro);
				jobs.push(job);
			}
			if(processed === criteria.results.length){
				deferred.resolve(jobs);
			}
		}.bind(self, pro), function(err){
			console.log("error checking for exiting job");
			deferred.resolve([]);
		});		
	}

	return deferred.promise; 
}

exports.validateId = function(id){
	if(id && !isNaN(id) && id.length === 13){
		return true;
	}
	return false;
}

exports.createJob = function(criteria, pro){
	return {
		_id: criteria.id + "-" + pro.profile,
		category: criteria.category,
		customerName: criteria.customerName,
		customerEmail: criteria.customerEmail,	
		customerPhone: criteria.customerPhone,
		customerRequest: criteria.customerRequest,	
		pro: pro,
		urgency: criteria.urgency ? criteria.urgency.indexOf("URGENTLY") >= 0 : false
	};
}

exports.saveJobs = function(jobs){
	if(!jobs || jobs.length === 0){
		console.log("no jobs to save");
		return [];
	}
	console.log("saving " + jobs.length + " jobs");
	return dbm.insert(constants.JOBS_COL, jobs, jobs);
}

exports.handleError = function(err){
	console.log("error: ", err);
}

exports.grepValue = function(win, key, pos){
	return win.$('tr:has(td:contains(' + key + '))').eq(pos || 1).next().find('td').text().trim();
}
exports.listParser = function(win, key, pos){
	var return_array = []
	win.$('tr:has(td:contains(' + key + '))').eq(pos || 1).next().find('td ul li').each(function(){
		return_array.push( win.$(this).text());
	});
	return return_array.join(", ");
}
exports.tableParser = function(win, key, pos){
	var return_array = []
	var rows = win.$('tr:has(td:contains('+ key +'))').eq(1).next().find('td tr td');

	for (var i = 0; i < rows.length; i=i+3){
		return_array.push([
			win.$(rows[i]).text().trim(),
			win.$(rows[i+1]).text().trim(),
			win.$(rows[i+2]).text().trim()
		].join(" - "));
	}
	return return_array.join(", ");
}
exports.insuranceParser = function(win, key1, key2, pos){
	var confirmation = this.grepValue(win,key1);
	var companies = [];
	var status = "";
	if (confirmation == "Yes"){
		companies = this.listParser(win,key2);
		status="To be verified";
		return [companies, status].join(" - ")
	}
	else
		return "N/A";
	

	

}
exports.licenseParser = function(win, key1, key2, pos){
	var confirmation = this.grepValue(win,key1);
	var license_no = "";
	var status = "";
	if (confirmation == "Yes"){
		license_no = this.grepValue(win,key2);
		status="To be verified";
		return [license_no, status].join(" - ")
	}
	else
		return "N/A";
	

}
exports.removeRows = function(win, key){
	var label = win.$('tr:has(td:contains(' + key + '))').eq(1);
	var value = label.next();
	label.remove();
	value.remove();
}

exports.distribute = function(jobs){	
	for(var i = jobs.length -1; i >= 0; i--){
		var job = jobs[i];
		var pro = job.pro;		
		var recipient = pro.email;	
		var subject = constants.JOB_SUBJECT + " - " + job.category + " - " + job._id + (job.urgency ? " - URGENT" : "");	
		var template = "templates/job_notif_to_pro.html";
		var requireContact = (job.category === "Cleaner" || job.category === "Moving Services" || job.category === "Mortgage Broker");
		var config = {
			jobId: job._id,
			customerName: job.customerName,
			customerRequest: job.customerRequest,
			requireContact: requireContact,
			pro: pro
		};
		var html = mg.getRender(template, config);
		var message = mg.generate(constants.SYSTEM_EMAIL, subject, recipient, html);
		
		console.log("sending email '" + subject + "' to " + recipient);
		ms.send(message);		
	}
}



