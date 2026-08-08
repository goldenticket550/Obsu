import { createHmac, randomUUID } from "node:crypto";

const url = process.env.CORE_INGEST_URL;
const apiKey = process.env.CORE_ANON_KEY;
const keyId = process.env.CORE_SCRATCH_KEY_ID;
const secret = process.env.CORE_SCRATCH_HMAC_KEY;
if (![url, apiKey, keyId, secret].every(Boolean)) throw new Error("Missing Stage A test environment");

const makeEnvelope = (overrides = {}) => {
  const now = new Date().toISOString();
  return { schemaVersion:"1", kind:"event", signalId:randomUUID(), dedupKey:`scratch:${randomUUID()}`, occurredAt:now, sentAt:now, source:{application:"trader-scratch",environment:"staging"}, payload:{category:"trader.alert",severity:"warning",alertType:"score_threshold",symbol:"TEST",timeframe:"5m",message:"Stage A scratch event"}, ...overrides };
};
const send = async (body, timestamp = Math.floor(Date.now()/1000), digestOverride) => {
  const digest = digestOverride ?? createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return fetch(url,{method:"POST",headers:{authorization:`Bearer ${apiKey}`,apikey:apiKey,"content-type":"application/json","x-obsidian-key-id":keyId,"x-obsidian-signature":`v=${timestamp},d=${digest}`},body});
};

const body = JSON.stringify(makeEnvelope());
const valid = await send(body);
const duplicate = await send(body);
const tamperedTs = Math.floor(Date.now()/1000);
const tampered = await send(body.replace("TEST","TAMPERED"), tamperedTs, createHmac("sha256",secret).update(`${tamperedTs}.${body}`).digest("hex"));
const staleTs = Math.floor(Date.now()/1000)-301;
const stale = await send(JSON.stringify(makeEnvelope()),staleTs);
const oversized = await send(JSON.stringify(makeEnvelope({payload:{category:"trader.alert",severity:"warning",padding:"x".repeat(33000)}})));
const mismatch = await send(JSON.stringify(makeEnvelope({source:{application:"wrong-app",environment:"staging"}})));
let rateLimited;
for(let i=0;i<65;i++){ const r=await send(JSON.stringify(makeEnvelope())); if(r.status===429){rateLimited=r;break;} }
const results={valid:valid.status,duplicate:duplicate.status,tampered:tampered.status,stale:stale.status,oversized:oversized.status,appMismatch:mismatch.status,rateLimited:rateLimited?.status??null};
console.log(JSON.stringify(results));
if(JSON.stringify(results)!==JSON.stringify({valid:202,duplicate:200,tampered:401,stale:401,oversized:413,appMismatch:400,rateLimited:429})) process.exit(1);
