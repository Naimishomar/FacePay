// utils/sms.js
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

export const sendOTPViaSMS = async (phoneNumber, otp) => {
  if (process.env.NODE_ENV !== 'production' && process.env.SKIP_SMS === 'true') {
    console.log('[DEV] Skipping SMS send. OTP:', otp);
    return true;
  }
  try {
    const sendPromise = client.messages.create({
      body: `OTP for FacenPay: ${otp}. Don't share this with anyone.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
    // Add a safety timeout (10s) so Twilio slowness doesn't hang the server.
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Twilio timeout')), 10000));
    await Promise.race([sendPromise, timeout]);

    console.log('Twilio message created for', phoneNumber);
    return true;
  } catch (error) {
    console.error('sendOTPViaSMS error:', error?.message || error);
    throw error; // caller will catch but server will still respond (see controller)
  }
};
