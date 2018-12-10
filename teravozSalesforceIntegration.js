require('dotenv').config();
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const bodyParser = require('body-parser');
const fs = require('fs');
const teravozApi = require('./teravozApi');
const salesforceApi = require('./salesforceApi');

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
};

const OUR_NUMBERS = {
  551131672542 : process.env.TERAVOZ_LINE_551131672542,
  551141184002 : process.env.TERAVOZ_LINE_551141184002
};

const INTERNAL_AGENTS = {
  100 : 'Danilo Silva',
  101 : 'Emerson',
  102 : 'Daniella',
  103 : 'Felipe',
  104 : 'Rodrigo',
  105 : 'OM / Mauricio',
  106 : 'OBZ',
  107 : 'Consultor',
  108 : 'Consultor',
  109 : 'Carina'
};


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
      // caso numero não é interno
      // criar novo ticket
      // colocar o call_id
      // direction: 'inbound' --> externa ..... direction: 'internal' --> internal
      // caso seja uma ligação externa pro suporte --> atribuir para o grupo correto seguindo um DexPara configuravel

      if(!INTERNAL_AGENTS[event.their_number]){
        var group = OUR_NUMBERS[event.out_number] ? OUR_NUMBERS[event.out_number] : "Suporte";
        salesforceApi.createCase(event.call_id, event.their_number, group);
      }

      break;
    case TERAVOZ_EVENTS.CALL_FINISHED:
      // Atulizar a duração do chamado
      teravozApi.callInfo(TERAVOZ_CREDENTIALS, event.call_id).then(function (callInfo) {
        var hours = (callInfo.talk_time/60/60).toPrecision(3);
        salesforceApi.updateCase(event.call_id, {Horas_de_atendimento__c: hours});
      });
      break;
    case TERAVOZ_EVENTS.CALL_DATA_PROVIDED:
      // Caso transfer, atualiza responsavel do chamado
      // Caso nps, Atulizar nps

      break;
    case TERAVOZ_EVENTS.CALL_RECORDING_AVAILABLE:
        // Coloca link da gravação no CallLog do Chamado, junto com usuario e senha para baixa-los
        var props = {
          Description: 'link da ligação: ' + event.url + '\n user: ' + process.env.TERAVOZ_LOGIN + '\n password: ' + process.env.TERAVOZ_PASSWORD,
          call_link__c: event.url + '\n user: ' + process.env.TERAVOZ_LOGIN + '\n password: ' + process.env.TERAVOZ_PASSWORD
        };
        salesforceApi.updateCase(event.call_id, props);

        // download da ligação para o container
      teravozApi.download(TERAVOZ_CREDENTIALS, event.url, (err, fileName) => {
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
