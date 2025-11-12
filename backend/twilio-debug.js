// twilio-debug.js
import dotenv from 'dotenv';
dotenv.config();
import twilio from 'twilio';

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
if (!sid || !token) {
  console.error('Missing TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN');
  process.exit(1);
}

const client = twilio(sid, token);

async function inspectMessages() {
  try {
    const msgs = await client.messages.list({limit: 20});
    msgs.forEach(m => {
      console.log('----');
      console.log('SID:', m.sid);
      console.log('From:', m.from);
      console.log('To:', m.to);
      console.log('Status:', m.status);
      console.log('Error code:', m.errorCode);
      console.log('Error message:', m.errorMessage);
      console.log('Price:', m.price, m.priceUnit);
      console.log('Date updated:', m.dateUpdated);
      console.log('Body:', m.body);
    });
  } catch (err) {
    console.error('Twilio list error:', err.message || err);
  }
}

inspectMessages();
