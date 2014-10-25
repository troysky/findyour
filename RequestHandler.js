var constants = require('./Constants');
var mustache = require("mustache");
var dbm = require('./MongoDBManager');
var mg = require('./MailGenerator');
var ms = require('./MailSender');
var fs = require('fs');
var q = require('q');

exports.init = function(app){	
	var self = this;

	app.get('/', function(req,res){ 
		res.sendfile(__dirname + '/public/index.html'); 
	});

	app.get('/submit_profile', function(req,res){ 		
		var config = {jobId: req.query.jobId};
		res.send(mg.getRender("templates/quote_form.html", config)); 
	});

	app.post('/submit_profile', function(req,res){ 				
		var jobId = req.body.jobId;
		var quote = req.body.quote;
		var comment = req.body.comment;
		
		self.getJob(jobId)
		.then(self.updateJobWithQuote.bind(this, quote, comment), self.handleError.bind(this, res))
		.then(self.notifyCustomerWithQuote, self.handleError.bind(this, res))
		.then(self.showSubmitted.bind(this, res), self.handleError.bind(this, res));
	});

	app.get('/accept_job', function(req,res){ 
		var jobId = req.query.jobId;	

		self.getJob(jobId)
		.then(self.updateJobWithAccept, self.handleError.bind(this, res))
		.then(self.notifyProWithWin, self.handleError.bind(this, res))
		.then(self.notifyCustomerWithWin, self.handleError.bind(this, res))
		.then(self.showAccepted.bind(this, res), self.handleError.bind(this, res));
	});

	app.get('/reply_comment_job', function(req,res){ 
		var config = {jobId: req.query.jobId};
		res.send(mg.getRender("templates/customer_reply_form.html", config)); 
	});

	app.post('/submit_reply', function(req,res){ 
		var jobId = req.body.jobId;
		var comment = req.body.comment;
		
		self.getJob(jobId)
		.then(self.updateJobWithComment.bind(this, comment), self.handleError.bind(this, res))
		.then(self.notifyProWithComment, self.handleError.bind(this, res))
		.then(self.showCommentSubmitted.bind(this, res), self.handleError.bind(this, res));
	});

	app.get("/profile/:pro", function(req, res) {
	  	var prodId = req.params.pro;

	  	self.getPro(prodId)
		.then(self.showProfile.bind(self, res), self.handleError.bind(this, res))
	});
}

exports.getJob = function(jobId){
	console.log("getting job", jobId);
	return dbm.find(constants.JOBS_COL, {_id: jobId});
}

exports.getPro = function(prodId){
	console.log("getting pro", prodId);
	return dbm.find(constants.PROS_COL, {profile: prodId});
}

exports.updateJobWithQuote = function(quote, comment, job){	
	if(job && job.length === 1){
		var job = job[0];
		//save quote in job
		job.quote = job.quote || [];
		var cmt = comment ? comment.replace(/(?:\r\n|\r|\n)/g, '<br />') : "";
		var quote = {
			quote: quote,
			comment: cmt,
			dateTime: new Date()
		};
		job.quote.unshift(quote);

		console.log("adding quote to job", quote);
		return dbm.save(constants.JOBS_COL, job);
	}

	q.defer().reject("job not found");
}

exports.updateJobWithAccept = function(job){	
	if(job && job.length === 1){
		var job = job[0];
		job.accepted = new Date();
		console.log("adding accepted time to job", job.accepted);
		return dbm.save(constants.JOBS_COL, job);
	}

	q.defer().reject("job not found");
}

exports.updateJobWithComment = function(comment, job){	
	if(job && job.length === 1){
		var job = job[0];
		//save quote in job
		job.comment = job.comment || [];
		var cmt = comment ? comment.replace(/(?:\r\n|\r|\n)/g, '<br />') : "";
		var comment = {
			comment: cmt,
			dateTime: new Date()
		};
		job.comment.unshift(comment);

		console.log("adding comment to job", comment);
		return dbm.save(constants.JOBS_COL, job);
	}

	q.defer().reject("job not found");
}

exports.notifyCustomerWithQuote = function(job){
	//generate customer email
	var recipient = job.customerEmail;	
	var template = "templates/quote_to_customer.html"
	var subject = constants.QUOTE_SUBJECT + " - " + job.category + " - " + job._id;	
	if(job.quote.length > 1){
		template = "templates/requote_to_customer.html";
		subject = constants.REQUOTE_SUBJECT + " - " + job.category + " - " + job._id;	
	}

	var html = mg.getRender(template, job);
	var message = mg.generate(constants.SYSTEM_EMAIL, subject, recipient, html);
	
	console.log("sending email to customer", recipient);
	ms.send(message)
	return job;	
}

exports.notifyProWithComment = function(job){
	//generate pro email
	var template = "templates/comment_to_pro.html"
	var recipient = job.pro.email;	
	var subject = constants.COMMENT_SUBJECT + " - " + job.category + " - " + job._id;	
	var html = mg.getRender(template, job);
	var message = mg.generate(constants.SYSTEM_EMAIL, subject, recipient, html);
	
	console.log("sending email to pro", recipient);
	ms.send(message)
	return job;	
}

exports.notifyProWithWin = function(job){
	//generate pro email
	var template = "templates/win_to_pro.html"
	var recipient = job.pro.email;	
	var subject = constants.PRO_WIN_SUBJECT + " - " + job.category + " - " + job._id;	
	var html = mg.getRender(template, job);
	var message = mg.generate(constants.SYSTEM_EMAIL, subject, recipient, html);
	
	console.log("sending win email to pro", recipient);
	ms.send(message)
	return job;	
}

exports.notifyCustomerWithWin = function(job){
	//generate customer email
	var template = "templates/win_to_customer.html"
	var recipient = job.customerEmail;	
	var subject = constants.CUST_WIN_SUBJECT + " - " + job.category + " - " + job._id;	
	var html = mg.getRender(template, job);
	var message = mg.generate(constants.SYSTEM_EMAIL, subject, recipient, html);
	
	console.log("sending win email to customer", recipient);
	ms.send(message)
	return job;	
}

exports.showSubmitted = function(res, job){
	//show landing	
	var page = fs.readFileSync("templates/quote_submit.html", "utf8"); // bring in the HTML file
	var html = mustache.to_html(page, job); // replace all of the data
	res.send(html); 
}

exports.showCommentSubmitted = function(res, job){
	//show landing	
	var page = fs.readFileSync("templates/comment_submit.html", "utf8"); // bring in the HTML file
	var html = mustache.to_html(page, job); // replace all of the data
	res.send(html); 
}

exports.showAccepted = function(res, job){
	//show landing	
	var page = fs.readFileSync("templates/accep_job_confirm.html", "utf8"); // bring in the HTML file
	var html = mustache.to_html(page, job); // replace all of the data
	res.send(html); 
}

exports.showProfile = function(res, pros){
	if(!pros || pros.length === 0){
		this.handleError(res, "Profile not found");
		return;
	}
	var page = fs.readFileSync("templates/profile.html", "utf8"); // bring in the HTML file
	pros[0].description = pros[0].description.replace(/\n/g, '<br />');
	pros[0].abnNo = pros[0].abn ? pros[0].abn.split(" ")[0] : null;	
	var html = mustache.to_html(page, pros[0]); // replace all of the data
	res.send(html); 
}

exports.handleError = function(res, err){
	console.log(err);
	res.sendfile(__dirname + '/public/error.html'); 
}


