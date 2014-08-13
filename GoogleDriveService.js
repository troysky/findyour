const CLIENT_ID = '1069254921408-r188hgc69n33541aut3vblqsiovq79do.apps.googleusercontent.com';
const CLIENT_SECRET = 'hEhBxoeLWvC9nCC9thcnl62P';
const REDIRECT_URL = 'https://developers.google.com/oauthplayground';
//auth token: 4/r2MpSlSfTtjJL4ZdxyJQLamjVGpe.om32IJozDXIYBrG_bnfDxpJ-k0mKjwI
const REFRESH_TOKEN = '1/kYYmYCeOhrfyqYCLmXdjFTYazYRJQVAErq7g7DoDQ40';
const ACCESS_TOKEN = 'ya29.XgCG6ewhVvdWrCEAAACk1HdVulXIhwmMgDrmE2UPVrBEhT8_cXlYNradqMMzFHMOhit2tdyiRf5RyLTNoB4';
const ENDPOINT_OF_GDRIVE = 'https://www.googleapis.com/drive/v2';
const FOLDER_ID = '0B5sNMec6GsH-aDIzSkNwdF90c2M';

var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
oauth2Client.setCredentials({
  access_token: ACCESS_TOKEN,
  refresh_token: REFRESH_TOKEN
});
var drive = google.drive({ version: 'v2', auth: oauth2Client });
var q = require('q');

exports.insert = function(q, filename, contents){
  var deferred = q.defer();
  drive.files.insert({
    resource: {
      title: filename,
      mimeType: 'text/plain',
      parents: [{id: FOLDER_ID}]
    },
    media: {
      mimeType: 'text/plain',
      body: contents
    }
  }, function(err, result){
    if(err){
      deferred.reject("failed to insert file to googledrive: " + err);
    }else{
  	  console.log("saved in googledrive", result);
      deferred.resolve(result);
    }
  });
  return deferred;
}

exports.get = function(id){
  var request = drive.files.get({
    'fileId': id
  });
  request.execute(function(resp) {
    console.log('Title: ' + resp.title);
    console.log('Description: ' + resp.description);
    console.log('MIME type: ' + resp.mimeType);
  });
}

exports.update = function(id){
  
}

