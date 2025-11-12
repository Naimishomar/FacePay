import express from 'express';
import { upload } from '../utils/cloudinary.js';
import { faceDetect } from '../controllers/face.controller.js';
const router = express.Router();

const expectedFields = [
  { name: 'FRONT', maxCount: 1 },
  { name: 'LEFT', maxCount: 1 },
  { name: 'RIGHT', maxCount: 1 },
  { name: 'UP', maxCount: 1 },
  { name: 'DOWN', maxCount: 1 },
  { name: 'SMILE_TILT', maxCount: 1 },
];

router.post('/upload', upload.fields(expectedFields), faceDetect);

export default router;