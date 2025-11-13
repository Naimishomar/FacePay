import User from '../models/user.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
// import { verifyOtp } from './otp.controller.js'; // OTP verification is now done on frontend submit stage
import { customAlphabet } from 'nanoid';

export const register = async (req, res) => {
  try {
    // UPDATED: Now expecting scannedImage and account_number from the final payload.
    const { 
        name, 
        email, 
        phone, 
        password, 
        pin, 
        account_number, 
        scannedImage 
    } = req.body;

    // UPDATED: Validation now checks for all user data fields and the 6 face scans.
    if (!name || !email || !phone || !password || !pin || !account_number || 
        !scannedImage || Object.keys(scannedImage).length !== 6) {
      return res.status(400).json({ message: 'Missing required registration data or face scans.', success: false });
    }

    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing){
      return res.status(400).json({ message: 'User already exists', success: false });
    }
    
    // NOTE: OTP verification step is removed here as it is assumed to be verified
    // before the final payload is sent to this endpoint.

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPin = await bcrypt.hash(pin, 10);
    
    // account_number is now received from the frontend instead of being generated here.
    
    // UPDATED: Including the scannedImage URLs in the user creation.
    const user = await User.create({ 
        name, 
        email, 
        phone, 
        password: hashedPassword, 
        account_number, 
        pin: hashedPin,
        scannedImage // This saves the Cloudinary URLs {FRONT: url, LEFT: url, ...}
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({ message: 'User created successfully', success: true, token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error', success: false });
  }
};