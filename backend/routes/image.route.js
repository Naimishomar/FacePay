import express from 'express';
import { uploadFaceImages } from '../controllers/image.controller.js';
import { upload } from '../utils/cloudinary.js';
const router = express.Router();
router.post('/upload', upload.array('faces', 6), uploadFaceImages);
export default router;