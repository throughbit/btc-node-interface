/*
HYFERx Project
Digibyte Tx Parser
*/
//-o_O==========================================================~|
'use strict';
//-o_o===modules=================================================|
var request = require('request');
var errorSet = require('./errors.js');
var express = require('express');
var helmet = require('helmet');
var bodyParser = require('body-parser');
var rp = require ('request-promise-native');
var slack = require('./SlackNode.js');
//-o_O===init===================================================~|
const UPD_PORT = process.env.W_UPD;
//Server created to respond to wallet_notify
const S_PORT = process.env.SERV;
//Primary node interface Server called to aquire tx_detail
const server_url = `http://localhost:${S_PORT}`;
var app = express();

app.use(helmet());
app.use(helmet.noCache());
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}));

var rec_set = {
 "txid":'',
 "address":[],
 "amount":'',
 "confirmations":''
}
//-o_o===node-update======================================================|
app.post('/node-update', async (req,res)=>{
 try{
  tx_detail(req.body.txid)
  .then(data=>{
   let response = errorSet.errorFunc('success',data);
  // console.log(response);
  slack.update_slack(JSON.stringify(data),'Receive Notifier');
   res.send(response);
  })
 }
 catch(e){
   let response = errorSet.errorFunc("fail",e);
  // console.log(response);
   res.send(response);
 }
});
//-o_o===tx-detail================================================|
function tx_detail(txid){
return new Promise((resolve,reject)=>{
 try{
   request.post({
    "headers":{ "content-type": "application/json" },
    "url": `${server_url}/tx_detail_local`,
    "body": JSON.stringify({"txid":txid})
   },(error, response, body)=>{
    if(error){
    let respo = errorSet.errorFunc('fail',error);
    reject(respo);
    }
//    console.log("BODY",body);
  //  console.log("RESPONSE",response);
    tx_parse(JSON.parse(body))
    .then(responso=>{
     resolve(responso);
    })
    .catch(err=>{
     console.log(err);
     reject(err);
     })
  });
 }
 catch(e){
  let response = errorSet.errorFunc('fail', e);
  reject(response);
 }
});
}

//-o_o===tx-parse================================================|

function tx_parse(data){
 return new Promise((resolve,reject)=>{
  try{
   if(data.details[0].category=='receive'){
    rec_set.txid = data.txid;
    rec_set.address = data.details[0].address;
    rec_set.amount = data.amount;
    rec_set.confirmations = data.confirmations;
    resolve(rec_set);
   }
   else{
    reject("Not a receive");
   }
  } 
  catch(e){
   reject(e);
  }
 });
}
//-o_o===CONNECT===================================================|
app.listen(UPD_PORT,()=>
 console.log(`Wallet Update Server running on port ${UPD_PORT}`)
);
//-o_o===fin==================================================|
