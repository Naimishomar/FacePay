import multer from 'multer';
import path from 'path';
import { cloudinary } from '../utils/cloudinary.js';

// Multer storage configuration: Use memory storage to process files before Cloudinary
// This allows us to manually upload to Cloudinary with custom parameters
const storage = multer.memoryStorage();
export const upload = multer({ storage: storage });

/**
 * Controller for /api/image/upload
 * Handles multi-part form data and returns image URLs.
 */
export const uploadFaceImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: "No image files received." });
        }

        // Frontend sends 6 files with the field name 'faces'
        const files = req.files;
        const uploadedUrls = {};

        // Upload each file to Cloudinary
        for (const file of files) {
            // Extract side name (FRONT, LEFT, etc.) from filename
            const sideName = path.basename(file.originalname, path.extname(file.originalname)).toUpperCase();
            
            // Upload to Cloudinary using buffer (from memory storage)
            const result = await cloudinary.uploader.upload(file.buffer, {
                resource_type: "auto",
                folder: "facepay_faces",
                // Use side name as public_id for easier management
                public_id: sideName,
                format: "jpg" // Ensure consistent format
            });

            uploadedUrls[sideName] = result.secure_url;
            console.log(`✅ Uploaded ${sideName} to Cloudinary: ${result.secure_url}`);
        }

        return res.status(200).json({
            success: true,
            message: "Images successfully uploaded to Cloudinary.",
            uploadedUrls: uploadedUrls
        });

    } catch (error) {
        console.error("Cloudinary upload failed:", error);
        res.status(500).json({ success: false, message: "Image upload failed on server side." });
    }
};