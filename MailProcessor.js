var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill('K5PMmRLm9JJ6z56JemR9UA');
var jsdom = require('jsdom').jsdom;
var jquery = require('jquery');
var request = require('request');
var q = require('q');

exports.process = function(mail){
	if(mail.subject.indexOf("New submission") < 0){
		console.log("mail subject does not match: New submission*");
		return;
	}

	if(!mail.html){
		console.log("failed to process mail: no HTML contents found");
		return;
	}

	console.log("start processing mail: " + mail.subject);

	this.extractCriteria(mail.html)
	.then(this.findNearByPostCodes, this.handleError)
	.then(this.findPros, this.handleError)
	.then(this.distribute.bind(this), this.handleError);
}

exports.extractCriteria = function(html){
	var deferred = q.defer();
	console.log("extracting service type and postcode");
	try{
		var window = jsdom("<html><body>" + html + "</body></html>", null, {
		        // standard options:  disable loading other assets
		        // or executing script tags
		        FetchExternalResources: false,
		        ProcessExternalResources: false,
		        MutationEvents: false,
		        QuerySelector: false
		}).parentWindow;
		jsdom.jQueryify(window, jquery, function () {
			var criteria = {
				customerRequest: html,
				//serviceType: window.$('tr:has(td:contains("Choose your service"))').next().find('td').text().trim(),
				postCode: window.$('tr:has(td:contains("Post Code"))').next().find('td').text().trim().substring(0,4)
			}
			deferred.resolve(criteria);
		});
	}catch(e){
		deferred.reject("failed to extract criteria: " + e);
	}

	return deferred.promise;
}

exports.findNearByPostCodes = function(criteria){	
	var deferred = q.defer();
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
	})
	return deferred.promise;
}

exports.findPros = function(criteria){
	//console.log("searching pros for " + criteria.serviceType + " in " + criteria.postCodes);
	console.log("searching pros in " + criteria.postCodes);
	criteria.pros = ["jndsolutiontest@gmail.com"];
	return criteria;
}

exports.handleError = function(reason){
	console.log("error: " + reason);
}

exports.distribute = function(details){	
	var htmlReply = "<p>nearby postcodes</p><div>" + details.postCodes + "</div><p>customer original request</p><div> " + details.customerRequest + " </div>";
	for(var i = details.pros.length -1; i >= 0; i--){
		var recipient = details.pros[i];		
		var message = this.createMessage("system@findyour.com.au", "customer quote request -test", recipient, htmlReply);
		var async = false;

		console.log("sending email to " + recipient);
		mandrill_client.messages.send({
			"message": message, 
			"async": async},
			/*"ip_pool": ip_pool, 
			"send_at": send_at}, */
			function(result) {
			    console.log(JSON.stringify(result));
			}, 
			function(e) {
			    // Mandrill returns the error as an object with name and message keys
			    console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
			    // A mandrill error occurred: Unknown_Subaccount - No subaccount exists with the id 'customer-123'
			}
		);
	}
}

exports.createMessage = function(from, subject, to, html){
	var message = {
	    "html": html,
	    //"text": "Example text content",
	    "subject": subject,
	    "from_email": from,
	    //"from_name": "Example Name",
	    "to": [{
	            "email": to,
	            //"name": "Recipient Name",
	            "type": "to"
	        }],
        "bcc_address": "support@findyour.com.au"
	    /*"headers": {
	        "Reply-To": "message.reply@example.com"
	    },
	    "important": false,
	    "track_opens": null,
	    "track_clicks": null,
	    "auto_text": null,
	    "auto_html": null,
	    "inline_css": null,
	    "url_strip_qs": null,
	    "preserve_recipients": null,
	    "view_content_link": null,	    
	    "tracking_domain": null,
	    "signing_domain": null,
	    "return_path_domain": null,
	    "merge": true,
	    "global_merge_vars": [{
	            "name": "merge1",
	            "content": "merge1 content"
	        }],
	    "merge_vars": [{
	            "rcpt": "recipient.email@example.com",
	            "vars": [{
	                    "name": "merge2",
	                    "content": "merge2 content"
	                }]
	        }],
	    "tags": [
	        "password-resets"
	    ],
	    "subaccount": "customer-123",
	    "google_analytics_domains": [
	        "example.com"
	    ],
	    "google_analytics_campaign": "message.from_email@example.com",
	    "metadata": {
	        "website": "www.example.com"
	    },
	    "recipient_metadata": [{
	            "rcpt": "recipient.email@example.com",
	            "values": {
	                "user_id": 123456
	            }
	        }],
	    "attachments": [{
	            "type": "text/plain",
	            "name": "myfile.txt",
	            "content": "ZXhhbXBsZSBmaWxl"
	        }],
	    "images": [{
	            "type": "image/png",
	            "name": "IMAGECID",
	            "content": "ZXhhbXBsZSBmaWxl"
	        }]*/
	};
	return message;
}



