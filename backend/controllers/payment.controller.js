import express from 'express';
import User from '../models/user.model.js';
import bcrypt from 'bcrypt';

export const sendPayment = async (req, res) => {
    try {
        const { account_number, amount, pin } = req.body;
        if (!account_number || !amount || !pin) {
            return res.status(400).json({ success: false, message: 'Please fill all the fields' });
        }

        const receiver = await User.findOne({ account_number });
        const senderId = req.user && (req.user.id || req.user._id);
        if (!senderId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const sender = await User.findById(senderId);
        if (!sender) {
            return res.status(400).json({ success: false, message: 'Invalid sender' });
        }
        if (!receiver) {
            return res.status(400).json({ success: false, message: 'Invalid account number' });
        }

        const comparePin = await bcrypt.compare(pin, sender.pin);
        if (!comparePin) {
            return res.status(400).json({ success: false, message: 'Invalid pin' });
        }

        const numericAmount = Number(amount);
        if (!numericAmount || numericAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        if (sender.balance < numericAmount) {
            return res.status(400).json({ success: false, message: 'Insufficient balance' });
        }

        receiver.balance += numericAmount;
        sender.balance -= numericAmount;
        await receiver.save();
        await sender.save();
        return res.status(200).json({ success: true, message: 'Payment successful' });
    } catch (error) {
        console.log('Internal server error', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
