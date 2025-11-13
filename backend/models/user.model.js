import mongoose from 'mongoose';

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
  balance:{
    type: String,
    default: 1000,
  },
  scannedImage: { type: scannedImageSchema, default: () => ({}) },
  imageEmbeddings: {
    type: [[Number]],
    default: [],
  },
},{ timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
