var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill('K5PMmRLm9JJ6z56JemR9UA');

exports.send = function(message){	
	mandrill_client.messages.send({
		"message": message, 
		"async": false},
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

