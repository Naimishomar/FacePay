import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoute from './routes/user.route.js';
import faceRoutes from './routes/face.route.js';
import connectDB from './db/db.js';
dotenv.config();
const PORT = process.env.PORT || 8000;

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use('/api/user', userRoute);
app.use("/api/faces", faceRoutes);


app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(PORT, () => {
  console.log('Server is running on port 3000');
  connectDB();
});