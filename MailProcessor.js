var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill('K5PMmRLm9JJ6z56JemR9UA');
var jsdom = require('jsdom').jsdom;
var jquery = require('jquery');

exports.process = function(mail){
	if(!mail.html){
		console.log("failed to process mail: no HTML contents found");
	}

	console.log("start processing mail: " + mail.subject);
	this.extractPostCode("<html><body>" + mail.html + "</body></html>", 
		function(postcode, e){
			console.log("postcode extracted: " + postcode);
		}
	);

	
	//this.distribute(["skybluezone@gmail.com"], mail);
}

exports.extractPostCode = function(html, callback){
	console.log("extracting postcode");
	try{
		var window = jsdom(html, null, {
		        // standard options:  disable loading other assets
		        // or executing script tags
		        FetchExternalResources: false,
		        ProcessExternalResources: false,
		        MutationEvents: false,
		        QuerySelector: false
		}).parentWindow;
		jsdom.jQueryify(window, jquery, function () {
			callback(window.$('tr:has(td:contains("Postcode"))').next().find('td').text().trim());
		});
	}catch(e){
		console.log("failed to extract postcode: " + e);
		callback(null, e);
	}
}

exports.distribute = function(recipients, mail){
	console.log("sending email");
	var htmlReply = "<p>customer email contents</p><div>" + mail.text + "</div>";
	for(var i = recipients.length -1; i >= 0; i--){
		var recipient = recipients[i];
		var message = this.createMessage("system@findyour.com.au", "customer quote request", recipient, htmlReply);

		var async = false;
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
	        }]
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
	    "bcc_address": "message.bcc_address@example.com",
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



