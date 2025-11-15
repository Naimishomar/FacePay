// backend/controllers/image.controller.js
import path from "path";

/**
 * Controller for /api/image/upload
 * Assumes multer-storage-cloudinary has already uploaded files to Cloudinary,
 * so req.files contains objects with secure_url / path / url / location fields.
 */
export const uploadFaceImages = async (req, res) => {
  try {
    console.log("DEBUG: req.files:", Array.isArray(req.files) ? req.files.map(f => ({
      originalname: f.originalname,
      fieldname: f.fieldname,
      size: f.size,
      secure_url: f.secure_url || f.path || f.location || f.url || null
    })) : req.files);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No image files uploaded." });
    }

    const uploadedUrls = {};

    for (const file of req.files) {
      // Determine a side key from originalname or fieldname
      const rawName = file.originalname || file.fieldname || `face_${Date.now()}`;
      const sideName = path.basename(rawName, path.extname(rawName)).toUpperCase().replace(/\s+/g, "_");

      // multer-storage-cloudinary usually populates one of these fields:
      const url = file.secure_url || file.path || file.location || file.url || null;

      if (!url) {
        console.warn(`Warning: no remote URL found for file ${rawName}. Inspect req.files.`);
        // still include null so client gets mapping
      }

      uploadedUrls[sideName] = url;
    }

    return res.status(200).json({
      success: true,
      message: "Images already uploaded by multer-storage-cloudinary.",
      uploadedUrls
    });
  } catch (err) {
    console.error("uploadFaceImages error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while processing uploaded images.",
      error: err.message || String(err)
    });
  }
};
