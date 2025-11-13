import express from 'express';
import jwt from 'jsonwebtoken';

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
    if (!token) return res.status(401).json({ message: 'Unauthorized', success: false });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if(!decoded) return res.status(401).json({ message: 'Unauthorized', success: false });
    req.user = decoded;
    next();
  } catch (err) {
    console.error('authMiddleware error:', err);
    return res.status(401).json({ message: 'Unauthorized', success: false });
  }
};