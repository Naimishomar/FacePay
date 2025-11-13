// controllers/otp.controller.js
import { customAlphabet } from 'nanoid';
import { sendOTPViaSMS } from '../utils/sms.js';

const nanoid = customAlphabet('1234567890', 6);
const otpStore = new Map();

export const sendOtpController = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone is required' });

    const otp = nanoid();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min
    otpStore.set(phone, { otp, expiresAt });

    // try to send SMS but don't let it block the response
    try {
      await sendOTPViaSMS(phone, otp);
    } catch (smsErr) {
      console.error('Twilio send failed:', smsErr?.message || smsErr);
    }
    const payload = { success: true, message: 'OTP sent' };
    if (process.env.NODE_ENV !== 'production') payload.otp = otp; // dev helper
    return res.json(payload);
  } catch (err) {
    console.error('sendOtpController error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }};
export const verifyOtp = (phone, otp) => {
  const entry = otpStore.get(phone);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return false;
  }
  const match = entry.otp === String(otp);
  if (match) otpStore.delete(phone);
  return match;
};
