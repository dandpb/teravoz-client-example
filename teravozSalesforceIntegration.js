require('dotenv').config();
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const bodyParser = require('body-parser');
const fs = require('fs');
const download = require('./download');
const salesforce = require('./salesforce');


const TERAVOZ_EVENTS = {
  CALL_NEW : 'call.new',
  PEER_RINGING: 'peer.ringing',
  CALL_ON_GOING : 'call.on-going',
  CALL_FINISHED : 'call.finished',
  CALL_RECORDING_AVAILABLE : 'call.recording-available',
  CALL_DATA_PROVIDED : 'call.data-provided',
  CALL_QUEUE_ABANDON : 'call.queue-abandon',
  ACTOR_RINGING : 'actor.ringing',
  ACTOR_ENTERED : 'actor.entered',
  ACTOR_NO_ANSWER : 'actor.noanswer'
}


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


  switch (event.type) {
    case TERAVOZ_EVENTS.CALL_NEW:
      // criar novo ticket
      // colocar o call_id
      // direction: 'inbound' --> externa ..... direction: 'internal' --> internal
      // caso seja uma ligação externa pro suporte --> atribuir para o grupo correto seguindo um DexPara configuravel
      salesforce.createCase(event.call_id);

      break;
    case TERAVOZ_EVENTS.CALL_FINISHED:
      // Atulizar a duração do chamado
      salesforce.updateCase(event.call_id, {Horas_de_atendimento__c: 666});

      break;
    case TERAVOZ_EVENTS.CALL_DATA_PROVIDED:
      // Caso transfer, atualiza responsavel do chamado
      // Caso nps, Atulizar nps

      break;
    case TERAVOZ_EVENTS.CALL_RECORDING_AVAILABLE:
        // Coloca link da gravação no CallLog do Chamado, junto com usuario e senha para baixa-los
        var props = {
          call_link__c: 'link da ligação:' + event.url + '\n user: ' + process.env.SALESFORCE_TERAVOZ_LOGIN + '\n password: ' + process.env.SALESFORCE_TERAVOZ_PASSWORD
        };
        salesforce.updateCase(event.call_id, props);

        download(TERAVOZ_CREDENTIALS, event.url, (err, fileName) => {
          if (err) {
            console.error('Não foi possível efetuar o download.', err);
          } else {
            console.info('Download da gravação efetuado com sucesso. Arquivo:', fileName);
          }
        });

      break;
    case TERAVOZ_EVENTS.PEER_RINGING:
      //atualiza responsavel do chamado

      break;
    case TERAVOZ_EVENTS.CALL_QUEUE_ABANDON:
      // atualiza responsavel do chamado como abandono

      break;
    case TERAVOZ_EVENTS.ACTOR_ENTERED:
      //atualiza responsavel do chamado

      break;
    case TERAVOZ_EVENTS.ACTOR_NO_ANSWER:
      // atualiza responsavel do chamado como abandono

      break;
  }

});

http.listen(3333, function(){
  console.info('Escutando na porta *:3333');
});
