import express from 'express';
import { sendOtpController } from '../controllers/otp.controller.js';
import { register } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/send-otp', sendOtpController);
router.post('/register', register);

export default router;
