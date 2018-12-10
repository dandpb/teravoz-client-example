
require('dotenv').config();
var nforce = require('nforce');

// Salesforce API
var salesforceApi = module.exports = {};

var org = nforce.createConnection({
  clientId: process.env.SALESFORCE_CLIENT_ID,
  clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
  redirectUri: process.env.SALESFORCE_CALLBACK_URL,
  apiVersion: process.env.SALESFORCE_API_VERSION,  // optional, defaults to current salesforce API version
  environment: process.env.SALESFORCE_ENVIRONMENT,  // optional, salesforce 'sandbox' or 'production', production default
  mode: 'single' // optional, 'single' or 'multi' user mode, multi default
});


salesforceApi.createCase = function(callId, phone, group) {
  // single user mode
  org.authenticate({ username: process.env.SALESFORCE_USERNAME, password: process.env.SALESFORCE_PASSWORD+process.env.SALESFORCE_SECURITY_TOKEN}, function(err, resp){
    // the oauth object was stored in the connection object
    if(!err) console.log('Cached Token: ' + org.oauth.access_token)

    var caseTeravoz = nforce.createSObject('Case');
    caseTeravoz.set('Subject', '[' + phone +'] Ticket by teravoz: ' + new Date().toLocaleString("pt-BR", {timeZone: "America/Sao_Paulo"}));
    caseTeravoz.set('SuppliedEmail', 'no-reply@gradus-softwares.com.br');
    caseTeravoz.set('Origin', 'Phone');
    caseTeravoz.set('SuppliedPhone', phone);
    caseTeravoz.set('call_id__c', callId);
    caseTeravoz.set('Grupo__c', group);

    org.insert({ sobject: caseTeravoz }, function(err, resp){
      if(err) console.log(err);
    });

  });
};


salesforceApi.updateCase = function(callId, caseProps) {
  console.log('update case:', callId, caseProps);
  // single user mode
  org.authenticate({ username: process.env.SALESFORCE_USERNAME, password: process.env.SALESFORCE_PASSWORD+process.env.SALESFORCE_SECURITY_TOKEN}, function(err, resp){
    // the oauth object was stored in the connection object
    if(!err) {
      var q = "SELECT Id, Subject, CreatedDate FROM Case WHERE call_id__c = '" + callId.toString() + "' ORDER BY CreatedDate DESC LIMIT 1";
      org.query({ query: q }, function(err, resp){
        if(resp.records) {
          var caseTeravoz = resp.records[0];
          for(var propertyName in caseProps) {
            caseTeravoz.set(propertyName, caseProps[propertyName]);
          }

          org.update({ sobject: caseTeravoz}, function(err, resp){
            if(err) console.log(err);
          });
        }
      });
    }  else {
      console.log(err);
    }
  });
};

salesforceApi.searchAccount = function(contactNumber) {
  org.authenticate({ username: process.env.SALESFORCE_USERNAME, password: process.env.SALESFORCE_PASSWORD+process.env.SALESFORCE_SECURITY_TOKEN}, function(err, resp){
    // the oauth object was stored in the connection object
    if(!err) console.log('Cached Token: ' + org.oauth.access_token);

    var q = "SELECT Id, Subject FROM Case WHERE call_id__c = " + callId + " LIMIT 1";

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


