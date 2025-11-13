import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './db/db.js';
import { v2 as cloudinary } from 'cloudinary'; // Updated Cloudinary import

// Import our new route files
import authRoute from './routes/auth.route.js';
import imageRoute from './routes/image.route.js'; 

dotenv.config();

// --- Configuration ---
const PORT = process.env.PORT || 8000;

// Configure Cloudinary using environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true // Use "https" URLs
});

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json()); // Essential: To parse JSON payloads (for final /register)
app.use(express.urlencoded({ extended: true })); // Good practice for general forms
app.use(cookieParser());

// --- Routes ---
// Maps to /api/auth/register
app.use('/api/auth', authRoute); 

// Maps to /api/image/upload
app.use("/api/image", imageRoute);

// Simple health check route
app.get('/', (req, res) => {
    res.send('FacePay Backend Running!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDB();
});