import express from 'express';
import multer from 'multer';
import User from '../models/user.model.js';

export const faceDetect = async(req,res)=>{
  try {
    const files = req.files || {};
    
    // Extract Cloudinary URLs from uploaded files
    // With CloudinaryStorage, file.path contains the Cloudinary secure_url
    const captures = {
      FRONT: files.FRONT?.[0]?.path || '',
      LEFT: files.LEFT?.[0]?.path || '',
      RIGHT: files.RIGHT?.[0]?.path || '',
      UP: files.UP?.[0]?.path || '',
      DOWN: files.DOWN?.[0]?.path || '',
      SMILE_TILT: files.SMILE_TILT?.[0]?.path || '',
    };
    
    const userId = req.user?.id || req.user?._id || req.body?.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Missing user identifier' });
    }
    
    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { scannedImage: captures } },
      { new: true, runValidators: true }
    ).select('-password -pin');
    
    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Return success with both the updated user data and the Cloudinary URLs
    return res.status(200).json({ 
      success: true, 
      data: updated,
      uploadedUrls: captures // Explicitly return the Cloudinary URLs
    });
  } catch (err) {
    console.error('Upload error', err);
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success:false, message: err.message });
    }
    return res.status(500).json({ success:false, message: 'Server error' });
  }
}