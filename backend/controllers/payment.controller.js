import express from 'express';
import User from '../models/user.model.js';

export const sendPayment = async(req,res)=>{
    try {
        const { account_number, amount, pin } = req.body;
        if(!account_number || !amount || !pin){
            return res.status(400).json({ success: false, message: 'Please fill all the fields', success: false });
        }
        const receiver = await User.findOne({account_number});
        const senderId = req.user && (req.user.id || req.user._id);
        if (!senderId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const sender = await User.findById(senderId);
        if(!sender){
            return res.status(400).json({ success: false, message: 'Invalid sender', success: false });
        }
        if(!receiver){
            return res.status(400).json({ success: false, message: 'Invalid account number', success: false });
        }
        const comparePin = await bcrypt.compare(pin, sender.pin);
        if(!comparePin){
            return res.status(400).json({ success: false, message: 'Invalid pin', success: false });
        }
        receiver.balance += amount;
        sender.balance -= amount;
        await receiver.save();
        await sender.save();
        return res.status(200).json({ success: true, message: 'Payment successful', success: true });
    } catch (error) {
        console.log("Internal server error", error);
    }
}
