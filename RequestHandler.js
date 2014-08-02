var mustache = require("mustache");
var dbm = require('./MongoDBManager');

exports.init = function(app){	

	app.get('/', function(req,res){ 
		res.sendfile(__dirname + '/public/index.html'); 
	});

	app.get('/submit_profile', function(req,res){ 		
		var jobId = req.query.jobId;
		dbm.find(constants.JOBS_COL, {_id: jobId}).then(
			function(job){
				var template = "templates/quote_form.html";				
				var page = fs.readFileSync(template, "utf8"); // bring in the HTML file
				var html = mustache.to_html(page, job); // replace all of the data
				res.send(html); 
			},
			function(){
				res.sendfile(__dirname + '/public/error.html'); 
			}
		);
	});
}
