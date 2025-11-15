// backend/controllers/auth.controller.js (register portion)
import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config();

export const register = async (req, res) => {
  try {
    const { name, email, phone, password, pin, account_number, scannedImage } = req.body;

    if (!name || !email || !phone || !password || !pin || !account_number ||
        !scannedImage || Object.keys(scannedImage).length !== 6) {
      return res.status(400).json({ message: 'Missing required registration data or face scans.', success: false });
    }

    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
      return res.status(400).json({ message: 'User already exists', success: false });
    }

    // Create user with plain password & pin — schema pre('save') will hash them
    const user = await User.create({
      name,
      email,
      phone,
      password,      // plain text here -> hashed by pre-save
      account_number,
      pin,           // plain text here -> hashed by pre-save
      scannedImage
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Build safe user object (don't return password/pin)
    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      account_number: user.account_number,
      scannedImage: user.scannedImage
    };

    return res.status(201).json({ message: 'User created successfully', success: true, token, user: safeUser });
  } catch (error) {
    console.error('register error:', error);
    return res.status(500).json({ message: 'Internal server error', success: false });
  }
};

export const login = async (req, res) => {
  try {
    const { email, pin } = req.body;
    if (!email || !pin) {
      return res.status(400).json({ message: 'Please provide email and pin', success: false });
    }

    // fetch user and include hashed pin (and password if needed)
    const user = await User.findOne({ email }).select('+pin'); // pin is select:false by default

    if (!user) {
      return res.status(400).json({ message: 'User not found', success: false });
    }

    const isMatch = await bcrypt.compare(pin, user.pin);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or pin', success: false });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      account_number: user.account_number,
    };

    return res.status(200).json({ message: 'Login successful', success: true, token, user: safeUser });
  } catch (error) {
    console.error('login error:', error);
    return res.status(500).json({ message: 'Internal server error', success: false });
  }
};

export const getProfile = async (req, res) => {
  try {
    const { id } = req.params;
    if(!id) {
      return res.status(400).json({ message: 'Please provide user id', success: false });
    }
    const user = await User.findById(id);
    if (!user) {
      return res.status(400).json({ message: 'User not found', success: false });
    }
    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      balance: user.balance,
      account_number: user.account_number,
      scannedImage: user.scannedImage
    };
    return res.status(200).json({ message: 'Profile fetched successfully', success: true, user: safeUser });
  } catch (error) {
    console.error('getProfile error:', error);
    return res.status(500).json({ message: 'Internal server error', success: false });
  }
};