// controllers/auth.controller.js
import User from '../models/user.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { verifyOtp } from './otp.controller.js';

export const register = async (req, res) => {
  try {
    const { name, email, phone, password, otp } = req.body;
    if (!name || !email || !phone || !password || !otp) {
      return res.status(400).json({ message: 'Please fill all the fields', success: false });
    }
    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) return res.status(400).json({ message: 'User already exists', success: false });

    const isValidOTP = verifyOtp(phone, otp); // check stored OTP
    if (!isValidOTP) return res.status(400).json({ message: 'Invalid or expired OTP', success: false });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, phone, password: hashedPassword });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({ message: 'User created successfully', success: true, token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error', success: false });
  }
};
