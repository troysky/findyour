var mustache = require("mustache");
var fs = require('fs');

exports.getJobNotificationToPro = function(details, pro){
	/*
	var category = details.category.replace(" ", "").toLowerCase();
	var template = 'templates/' + category + "_jobpost.html";
	console.log("template: " + template);
	*/
	var template = "templates/job_notif_to_pro.html"
	var config = {
		jobId: details.id,
		customerRequest: details.customerRequest,
		pro: pro
	};
	var fileContents = fs.readFileSync(template).toString();
	var html = mustache.render(fileContents, config);
	console.log("mail contents: " + html);
	return html;
}

exports.getQuoteToCustomer = function(job){
	var template = "templates/quote_to_customer.html"
	var fileContents = fs.readFileSync(template).toString();
	var html = mustache.render(fileContents, job);
	console.log("mail contents: " + html);
	return html;
}

exports.getWinToPro = function(job){
	var template = "templates/win_to_pro.html"
	var fileContents = fs.readFileSync(template).toString();
	var html = mustache.render(fileContents, job);
	console.log("mail contents: " + html);
	return html;
}

exports.getWinToCustomer = function(job){
	var template = "templates/win_to_customer.html"
	var fileContents = fs.readFileSync(template).toString();
	var html = mustache.render(fileContents, job);
	console.log("mail contents: " + html);
	return html;
}

exports.generate = function(from, subject, to, html){		
	return {
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
        /*"bcc_address": "support@findyour.com.au"
	    "headers": {
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
}

