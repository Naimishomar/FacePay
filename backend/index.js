import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './db/db.js';
import { v2 as cloudinary } from 'cloudinary'; // Updated Cloudinary import
import fs from 'fs';
import path from 'path';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import url from 'url';

// Import our new route files
import authRoute from './routes/auth.route.js';
import imageRoute from './routes/image.route.js'; 
import paymentRoute from './routes/payment.route.js';

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
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/stream' });

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

app.use('/api/payment', paymentRoute);

// Simple health check route
app.get('/', (req, res) => {
    res.send('FacePay Backend Running!');
});

wss.on('connection', (ws, req) => {
  console.log('Client connected');

  // Optionally parse token from query for basic auth
  const q = url.parse(req.url, true).query;
  if (q && q.token) {
    // verify JWT here if desired
    console.log('Client token present');
  }

  // We'll keep lastMeta per connection to associate with the next binary frame
  ws.lastMeta = null;

  ws.on('message', (message, isBinary) => {
    try {
      if (!isBinary) {
        // expect JSON metadata
        let text = message.toString();
        try {
          const obj = JSON.parse(text);
          if (obj && obj.type && obj.type.startsWith('frame')) {
            ws.lastMeta = obj;
            // optional: acknowledge
            ws.send(JSON.stringify({ type: 'ack-meta', ts: Date.now() }));
          } else {
            // handle other text messages
            console.log('Text msg', obj);
          }
        } catch (err) {
          console.warn('Non-JSON text message', text);
        }
      } else {
        // Binary: treat as JPEG bytes; pair with lastMeta
        const buffer = Buffer.from(message);
        const meta = ws.lastMeta || {};
        const userId = meta.userId || 'anon';
        const ts = meta.ts || Date.now();
        const width = meta.width || 0;
        const height = meta.height || 0;

        // Build filename and save to disk (demo)
        const outDir = path.join(process.cwd(), 'received_frames');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

        const filename = `${userId}_${ts}.jpg`;
        const filepath = path.join(outDir, filename);
        fs.writeFile(filepath, buffer, (err) => {
          if (err) {
            console.error('Error saving frame', err);
            ws.send(JSON.stringify({ type: 'save-error', message: err.message }));
            return;
          }
          console.log(`Saved frame ${filename} (${(buffer.length/1024).toFixed(1)} KB)`);
          ws.send(JSON.stringify({ type: 'frame-saved', filename, size: buffer.length }));
        });

        // Clear lastMeta (if each meta corresponds to one frame)
        ws.lastMeta = null;
      }
    } catch (err) {
      console.error('ws message handler error', err);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDB();
});