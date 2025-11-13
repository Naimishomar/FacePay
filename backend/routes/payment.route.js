import express from 'express';
import { sendPayment } from '../controllers/payment.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/send', authMiddleware, sendPayment);

export default router;
