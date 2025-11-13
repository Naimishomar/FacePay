import mongoose from "mongoose";

const faceCaptureSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  captures: {
    FRONT: String,
    LEFT: String,
    RIGHT: String,
    UP: String,
    DOWN: String,
    SMILE_TILT: String,
  },
  createdAt: { type: Date, default: Date.now },
});

const FaceCapture = mongoose.model("FaceCapture", faceCaptureSchema);
export default FaceCapture;
