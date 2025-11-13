import express from 'express';
import { upload, uploadFaceImages } from '../controllers/image.controller.js';
const router = express.Router();
router.post('/upload', upload.array('faces', 6), uploadFaceImages);
export default router;