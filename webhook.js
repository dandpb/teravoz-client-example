require('dotenv').config();
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const bodyParser = require('body-parser');
const fs = require('fs');
const download = require('./download');


/**
 Credenciais de acesso à API da Teravoz, no formato USUÁRIO:SENHA.
 Altere para as suas próprias credenciais.
 */
const TERAVOZ_CREDENTIALS = process.env.TERAVOZ_LOGIN+":"+process.env.TERAVOZ_PASSWORD;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/**
 GET http://localhost:3333/events
 Monitora eventos em tempo real
 */
app.get('/events', function(req, res) {
  console.info(`Cliente conectado`);
  fs.readFile(`${__dirname}/webhook.html`, 'utf8', function (err, content) {
    if (err) {
      res.statusCode(500);
    } else {
      // renderiza conteúdo HTML
      res.end(content);
    }
  });
});

app.get('/oauth/_callback', function(req, res) {
  console.info(`get oauth autorizado`);
  console.info('res', res);

  res.json({ status: 'ok' });
});

app.post('/oauth/_callback', function(req, res) {
  console.info(`post oauth autorizado`);
  console.info('res', res);

  res.json({ status: 'ok' });
});

/**
 POST http://localhost:3333/webhook
 Webhook para receber eventos.
 Caso o evento recebido seja `call.recording-available`, realiza o download
 da gravação na pasta `./recordings`.
 */
app.post('/webhook', (req, res) => {
  // Evento está no body do request
  const event = req.body;
  console.info('Recebeu o evento', event);
  io.emit(`teravoz-event`, require('util').inspect(event));
  // Response sempre é { status: ok }
  res.json({ status: 'ok' });

  // Verifica se o evento é do tipo `call.recording-available`
  if (event.type === 'call.recording-available') {
    download(TERAVOZ_CREDENTIALS, event.url, (err, fileName) => {
      if (err) {
        console.error('Não foi possível efetuar o download.', err);
      } else {
        console.info('Download da gravação efetuado com sucesso. Arquivo:', fileName);
      }
    });



    // Salesforce Integration
    var nforce = require('nforce');
    var org = nforce.createConnection({
      clientId: process.env.SALESFORCE_CLIENT_ID,
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
      redirectUri: process.env.SALESFORCE_CALLBACK_URL,
      apiVersion: process.env.SALESFORCE_API_VERSION,  // optional, defaults to current salesforce API version
      environment: process.env.SALESFORCE_ENVIRONMENT,  // optional, salesforce 'sandbox' or 'production', production default
      mode: 'single' // optional, 'single' or 'multi' user mode, multi default
    });


    // single user mode
    org.authenticate({ username: process.env.SALESFORCE_USERNAME, password: process.env.SALESFORCE_PASSWORD+process.env.SALESFORCE_SECURITY_TOKEN}, function(err, resp){
      // the oauth object was stored in the connection object
      if(!err) console.log('Cached Token: ' + org.oauth.access_token)

      var caseTeravoz = nforce.createSObject('Case');
      caseTeravoz.set('Subject', 'Ticket criado pela ligação teravoz: ' + new Date().toISOString());
      caseTeravoz.set('Description', 'link da ligação:' + event.url + '\n user: ' + process.env.SALESFORCE_TERAVOZ_LOGIN + '\n password: ' + process.env.SALESFORCE_TERAVOZ_PASSWORD);
      caseTeravoz.set('SuppliedEmail', 'daniel.barreto@gradus-softwares.com.br');

      org.insert({ sobject: caseTeravoz }, function(err, resp){
        if(!err) {
          console.log(resp);
          console.log('It worked!')
        }else {
          console.log(err);
        };
      });

    });







  }
});

http.listen(3333, function(){
  console.info('Escutando na porta *:3333');
});
