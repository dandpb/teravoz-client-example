


require('dotenv').config();
var nforce = require('nforce');

// Salesforce Integration
var salesforceService = module.exports = {};

var org = nforce.createConnection({
  clientId: process.env.SALESFORCE_CLIENT_ID,
  clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
  redirectUri: process.env.SALESFORCE_CALLBACK_URL,
  apiVersion: process.env.SALESFORCE_API_VERSION,  // optional, defaults to current salesforce API version
  environment: process.env.SALESFORCE_ENVIRONMENT,  // optional, salesforce 'sandbox' or 'production', production default
  mode: 'single' // optional, 'single' or 'multi' user mode, multi default
});


salesforceService.createCase = function(callId) {
  // single user mode
  org.authenticate({ username: process.env.SALESFORCE_USERNAME, password: process.env.SALESFORCE_PASSWORD+process.env.SALESFORCE_SECURITY_TOKEN}, function(err, resp){
    // the oauth object was stored in the connection object
    if(!err) console.log('Cached Token: ' + org.oauth.access_token)

    var caseTeravoz = nforce.createSObject('Case');
    caseTeravoz.set('Subject', 'Ticket criado pela ligação teravoz: ' + new Date().toISOString());
    caseTeravoz.set('SuppliedEmail', 'daniel.barreto@gradus-softwares.com.br');
    caseTeravoz.set('call_id__c', callId);

    org.insert({ sobject: caseTeravoz }, function(err, resp){
      if(!err) {
        console.log(resp);
        console.log('It worked!')
      }else {
        console.log(err);
      };
    });

  });
};


salesforceService.updateCase = function(callId, caseProps) {
  // single user mode
  org.authenticate({ username: process.env.SALESFORCE_USERNAME, password: process.env.SALESFORCE_PASSWORD+process.env.SALESFORCE_SECURITY_TOKEN}, function(err, resp){
    // the oauth object was stored in the connection object
    if(!err) console.log('Cached Token: ' + org.oauth.access_token);

    var q = 'SELECT Id, Subject FROM Case WHERE call_id = ' + callId + ' LIMIT 1';

    org.query({ query: q }, function(err, resp){

      if(!err && resp.records) {

        var caseTeravoz = resp.records[0];
        for(var propertyName in caseProps) {
          // propertyName is what you want
          // you can get the value like this: myObject[propertyName]
          caseTeravoz.set(propertyName, caseProps[propertyName]);
        }

        org.update({ sobject: caseTeravoz}, function(err, resp){
          if(!err) console.log('It worked!');
        });

      }
    });
  });
};

salesforceService.searchAccount = function(contactNumber) {
  org.authenticate({ username: process.env.SALESFORCE_USERNAME, password: process.env.SALESFORCE_PASSWORD+process.env.SALESFORCE_SECURITY_TOKEN}, function(err, resp){
    // the oauth object was stored in the connection object
    if(!err) console.log('Cached Token: ' + org.oauth.access_token);

    var q = 'SELECT Id, Subject FROM Case WHERE call_id__c = ' + callId + ' LIMIT 1';

    org.query({ query: q }, function(err, resp){

      if(!err && resp.records) {

        var caseTeravoz = resp.records[0];
        for(var propertyName in caseProps) {
          // propertyName is what you want
          // you can get the value like this: myObject[propertyName]
          caseTeravoz.set(propertyName, caseProps[propertyName]);
        }

        org.update({ sobject: caseTeravoz}, function(err, resp){
          if(!err) console.log('It worked!');
        });

      }
    });
  });
};


