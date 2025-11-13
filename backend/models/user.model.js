import mongoose from 'mongoose';

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
  Pin:{
    type:Number,
    required:true
  },
  Image:{
    type:Array,
    required:false
  }
});
const User = mongoose.model('User', userSchema);
export default User;
