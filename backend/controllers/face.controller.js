import express from 'express';
import multer from 'multer';
import FaceCapture from '../models/face.model.js';

export const faceDetect = async(req,res)=>{
  try {
    const files = req.files || {};
    // Normalize keys to the format your DB expects (e.g. SMILE_TILT)
    const captures = {
      FRONT: files.FRONT?.[0]?.path || '',
      LEFT: files.LEFT?.[0]?.path || '',
      RIGHT: files.RIGHT?.[0]?.path || '',
      UP: files.UP?.[0]?.path || '',
      DOWN: files.DOWN?.[0]?.path || '',
      SMILE_TILT: files.SMILE_TILT?.[0]?.path || '',
    };

    const newRecord = await FaceCapture.create({
      userId: req.body.userId || 'anonymous',
      captures,
    });

    return res.status(200).json({ success: true, data: newRecord });
  } catch (err) {
    console.error('Upload error', err);
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success:false, message: err.message });
    }
    return res.status(500).json({ success:false, message: 'Server error' });
  }
}