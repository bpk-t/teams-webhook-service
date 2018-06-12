'use strict';

const uuidv4 = require('uuid/v4');
const crypto = require('crypto');
const rp = require('request-promise');

const sharedSecret = process.env.SHARED_SECRET;
const bufSecret = Buffer(sharedSecret, "base64");

const commands = [
  {
    'command': 'uuidv4',
    'function': genUUIDv4
  },
  {
    'command': 'usdjp',
    'function': usdjp
  },
  {
    'command': 'exchange',
    'function': exchange
  },
  {
    'command': 'image',
    'function': imageTest
  },
  {
    'command': 'debug',
    'function': debug
  },
  {
    'command': 'commands',
    'function': getCommands
  }
];

module.exports.hello = async (event, context, callback) => {
  console.log(`body = ${event.body}`);
  //console.log(`header = ${JSON.stringify(event.headers)}`);

  const auth = event.headers['Authorization'];

  if (checkValid(auth, event.body)) {
    console.log(`success !!!`);
    const bodyObj = JSON.parse(event.body);

    const replacedReqText = bodyObj.text.replace('&nbsp;', ' ')
    const splits = replacedReqText.split(' ');
    const command = splits[1].split('\n')[0];
    console.log(`command = ${command}, splits = ${splits}`);
    
    let responseBody;
    const selected = selectCommand(command)
    if (selected.length == 0) {
      responseBody = {
        "type": "message",
        "text": 'no match',
      }
    } else {
      responseBody = await selected[0].function(bodyObj);
    }

    // success
    const response = {
      statusCode: 200,
      body: JSON.stringify(responseBody),
    };
    callback(null, response);
  } else {
    console.log(`failure !!!`);
    // failure
    const response = {
      statusCode: 401,
      body: JSON.stringify({
        type: "message",
        text: `auth error`
      }),
    };
    callback(null, response);
  }
};

function checkValid(auth, body) {
  const msgBuf = Buffer.from(body, 'utf8');
  const msgHash = "HMAC " + crypto.createHmac('sha256', bufSecret).update(msgBuf).digest("base64");

  console.log(`msgBuf = ${msgBuf}`);
  console.log(`msgHash = ${msgHash}`);

  return msgHash === auth;
}

function selectCommand(command) {
  return commands.filter(x => x.command === command);
}

// command ---------------------------
function genUUIDv4(requestBody) {
  return new Promise((resolve, reject) => {
    console.log(`command: genUUIDv4`)
    resolve(
      {
        "type": "message",
        "text": uuidv4()
      }
    );
  });
}

function usdjp(requestBody) {
  return rp('https://www.gaitameonline.com/rateaj/getrate').then((result) => {
    const resultObj = JSON.parse(result);
    const udjpy = resultObj.quotes
      .filter(x => x.currencyPairCode == 'USDJPY')
      .map(x => `bid: ${x.bid}, ask: ${x.ask}`);
    
      return {
        "type": "message",
        "text": udjpy[0]
      };
  });
}

function exchange(requestBody) {
  return rp('https://www.gaitameonline.com/rateaj/getrate').then((result) => {
    const replacedReqText = requestBody.text.replace('&nbsp;', ' ')
    const splits = replacedReqText.split(' ');
    const currencyPairCode = splits[2].split('\n')[0];

    const resultObj = JSON.parse(result);
    const rate = resultObj.quotes
      .filter(x => x.currencyPairCode.toUpperCase() == currencyPairCode.toUpperCase())
      .map(x => `bid: ${x.bid}, ask: ${x.ask}`);
    
      return {
        "type": "message",
        "text": rate[0]
      };
  });
}

function imageTest(requestBody) {
  return new Promise((resolve, reject) => {
    resolve(
      {
        "type": "message",
        "text": "https://pbs.twimg.com/media/DcZFlI-U0AASCL5.jpg",
        "attachments": [{
          "contentType": "image/jpg",
          "contentUrl": "https://pbs.twimg.com/media/DcZFlI-U0AASCL5.jpg",
        }]
      }
    );
  });
}

function debug(body) {
  return new Promise((resolve, reject) => {
    resolve(
      {
        "type": "message",
        "text": JSON.stringify(body),
      }
    );
  });
}

function getCommands(body) {
  return new Promise((resolve, reject) => {
    resolve(
      {
        "type": "message",
        "text": JSON.stringify(commands.map((x) => x.command)),
      }
    );
  });
}
