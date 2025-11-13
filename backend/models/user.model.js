import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const scannedImageSchema = new mongoose.Schema(
  {
    FRONT: { type: String, default: '' },
    LEFT: { type: String, default: '' },
    RIGHT: { type: String, default: '' },
    UP: { type: String, default: '' },
    DOWN: { type: String, default: '' },
    SMILE_TILT: { type: String, default: '' },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    maxlength: 10,
  },
  password: {
    type: String,
    required: true,
  },
  account_number:{
    type: String,
    required: true,
    unique: true,
    minLength: 10,
    maxLength: 10,
  },
  pin:{
    type: String,
    required: true,
    minLength: 6,
    maxLength: 6,
  },
  // Changed balance to Number for financial safety
  balance:{
    type: Number, 
    default: 1000,
  },
  scannedImage: { type: scannedImageSchema, default: () => ({}) },
  imageEmbeddings: {
    type: [[Number]],
    default: [],
  },
}, { timestamps: true });

// --- Mongoose Middleware for Hashing Credentials ---
userSchema.pre('save', async function(next) {
    if (!this.isModified('password') && !this.isModified('pin')) {
        return next();
    }
    
    // Hash Password
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }

    // Hash PIN
    if (this.isModified('pin')) {
        const salt = await bcrypt.genSalt(10);
        this.pin = await bcrypt.hash(this.pin, salt);
    }
    
    next();
});

const User = mongoose.model('User', userSchema);
export default User;