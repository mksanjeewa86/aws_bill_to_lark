var CostExplorer = require('aws-cost-explorer');
var axios = require('axios');

/* process.env ~
  create following variables from Environment variables of the configuration tab

  AWS account details
  -------------------
  ACCESS_KEY:	access key of your aws account
  SECRET_ACCESS_KEY:	secret access key of your aws account

  LARK chat group details
  -----------------------
  APP_ID:	app id of your lark app
  APP_SECRET:	app secret of your lark app
  CHAT_ID:	chat id of your lark chat app
*/

var ce = CostExplorer({
  "apiVersion": "2017-10-25",
  "accessKeyId": process.env.ACCESS_KEY,
  "secretAccessKey": process.env.SECRET_ACCESS_KEY,
  "region": "us-east-1"
});
var opts = {
  granularity: "DAILY",
  metrics: "UnblendedCost",
  groupBy: [
    {
      "Type": "DIMENSION",
      "Key": "SERVICE"
    }
  ]
}
exports.handler = async () => {
  ce.getTodayCosts(opts, async (err, data) => {
    if (err) {
      console.log(err);
    } else {
      const token = await getTenantToken();
      await sendMessageToLark(token, data);
      console.dir(data, { depth: null });
    }
  });
};

async function getTenantToken() {
  const request = {
    "params": { "headers": { "Content-Type": "application/json" } },
    "body": {
      "app_id": process.env.APP_ID,
      "app_secret": process.env.APP_SECRET,
    }
  };
  return await axios.post('https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal/', request.body, request.params)
    .then(response => {
      return response.data.tenant_access_token;
    }).catch(error => {
      console.log(error);
    });
}

async function sendMessageToLark(tenantAccessToken, data) {
  try {
    const request = {
      "params": {
        "headers": {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + tenantAccessToken,
        }
      },
      "body": {
        "chat_id": process.env.CHAT_ID,
        "msg_type": "interactive",
        "card": {
          "config": {
            "wide_screen_mode": true
          },
          "header": {
            "template": "orange",
            "title": {
              "tag": "plain_text",
              "content": `${data.ResultsByTime[0].TimePeriod.Start}~${data.ResultsByTime[0].TimePeriod.End}`,
            }
          },
          "elements": [{
            "tag": "div",
            "text": {
              "tag": "plain_text",
              "content": `${data.Total.Amount}${data.Total.Unit}`,
            }
          }
          ]
        }
      }
    };

    await axios.post('https://open.larksuite.com/open-apis/message/v4/send/', request.body, request.params)
      .then(response => {
        console.log(response);
        return;
      })
      .catch(error => {
        console.log(error);
      });
  } catch (error) {
    return console.log(error);
  }
}
