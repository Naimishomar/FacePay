import express from 'express';
import { getProfile, login, register } from '../controllers/auth.controller.js';
const router = express.Router();
router.post('/register', register);
router.post('/login', login);
router.get('/profile/:id', getProfile);
export default router;