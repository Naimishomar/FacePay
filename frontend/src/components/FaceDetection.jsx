import React, { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";
import "./component.css";

const SIDES = ["FRONT", "LEFT", "RIGHT", "UP", "DOWN", "SMILE_TILT"];
const HORIZONTAL_THRESHOLD = 0.12;
const VERTICAL_THRESHOLD = 0.1;
const AUTO_CAPTURE_DELAY_MS = 800;

// Yono Model API endpoint (dummy endpoint - replace with actual endpoint)
const YONO_MODEL_API_ENDPOINT = "http://localhost:3000/api/yono-model/predict"; // Replace with actual Yono model endpoint

export default function FaceDetection() {
  const [countdown, setCountdown] = useState(null);
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const modelRef = useRef(null);
  const rafRef = useRef(null);

  const [loadingModel, setLoadingModel] = useState(true);
  const [hasCamera, setHasCamera] = useState(null);
  const [detectedFace, setDetectedFace] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [captured, setCaptured] = useState({});
  const [allowed, setAllowed] = useState(false);

  const autoCaptureTimerRef = useRef(null);
  const autoCapturingRef = useRef(false);

  // ✅ load BlazeFace model
  useEffect(() => {
    let mounted = true;
    (async () => {
      await tf.ready();
      const model = await blazeface.load();
      if (mounted) {
        modelRef.current = model;
        setLoadingModel(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ✅ start camera
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setHasCamera(true);
      } catch (err) {
        console.error("Camera error:", err);
        setHasCamera(false);
      }
    })();
    return () => {
      mounted = false;
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ✅ continuous detection
  useEffect(() => {
    let mounted = true;

    const runDetection = async () => {
      const video = videoRef.current;
      const canvas = overlayRef.current;
      if (!video || !canvas || !modelRef.current) return;

      const ctx = canvas.getContext("2d");

      const step = async () => {
        if (!mounted) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        try {
          const predictions = await modelRef.current.estimateFaces(
            video,
            false
          );

          if (predictions.length > 0) {
            const p = predictions[0];
            setDetectedFace(p);

            // Draw box
            const [x, y] = p.topLeft;
            const [x2, y2] = p.bottomRight;
            const w = x2 - x;
            const h = y2 - y;
            ctx.strokeStyle = "lime";
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, w, h);

            // Draw nose point
            if (p.landmarks?.length >= 3) {
              const nose = p.landmarks[2];
              ctx.fillStyle = "red";
              ctx.beginPath();
              ctx.arc(nose[0], nose[1], 4, 0, Math.PI * 2);
              ctx.fill();
            }

            // ✅ check orientation
            const ok = checkOrientationForSide(p, SIDES[currentIndex]);
            setAllowed(ok);
          } else {
            setDetectedFace(null);
            setAllowed(false);
          }
        } catch (err) {
          console.error("Detection error:", err);
        }

        rafRef.current = requestAnimationFrame(step);
      };

      step();
    };

    if (modelRef.current && hasCamera) runDetection();

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [hasCamera, loadingModel, currentIndex]);

  // ✅ orientation check
  function checkOrientationForSide(prediction, side) {
    const [x, y] = prediction.topLeft;
    const [x2, y2] = prediction.bottomRight;
    const w = x2 - x;
    const h = y2 - y;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const nose = prediction.landmarks?.[2];
    if (!nose) return false;
    const [nx, ny] = nose;
    const dx = (nx - cx) / w;
    const dy = (ny - cy) / h;

    switch (side) {
      case "FRONT":
        return (
          Math.abs(dx) < HORIZONTAL_THRESHOLD &&
          Math.abs(dy) < VERTICAL_THRESHOLD
        );
      case "LEFT":
        return dx > HORIZONTAL_THRESHOLD;
      case "RIGHT":
        return dx < -HORIZONTAL_THRESHOLD;
      case "UP":
        return dy < -VERTICAL_THRESHOLD;
      case "DOWN":
        return dy > VERTICAL_THRESHOLD;
      case "SMILE_TILT":
        return Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05;
      default:
        return false;
    }
  }

  // ✅ capture frame
  async function captureCurrent() {
    const video = videoRef.current;
    if (!video) return null;
    const c = document.createElement("canvas");
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    const ctx = c.getContext("2d");
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, c.width, c.height);
    return new Promise((resolve) => {
      c.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
    });
  }

  // ✅ core capture logic
  async function doCaptureAndAdvance(sideLabel) {
    if (captured[sideLabel] || autoCapturingRef.current) return;
    autoCapturingRef.current = true;
    try {
      const blob = await captureCurrent();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setCaptured((prev) => ({ ...prev, [sideLabel]: url }));

      if (currentIndex < SIDES.length - 1) {
        setTimeout(() => setCurrentIndex((i) => i + 1), 1000);
      } else {
        console.log("✅ All sides captured!");
        alert("✅ All sides captured! Uploading...");
        handleFinishUpload({ ...captured, [sideLabel]: url });
      }
    } finally {
      setTimeout(() => (autoCapturingRef.current = false), 600);
    }
  }

  // ✅ fixed auto-capture effect (correct timing)
  useEffect(() => {
    const side = SIDES[currentIndex];

    if (autoCaptureTimerRef.current) {
      clearTimeout(autoCaptureTimerRef.current);
      autoCaptureTimerRef.current = null;
    }

    // skip already captured sides
    if (captured[side]) return;

    if (allowed && detectedFace && !autoCapturingRef.current) {
      autoCaptureTimerRef.current = setTimeout(() => {
        // capture only if still aligned
        if (allowed && detectedFace && !captured[side]) {
          doCaptureAndAdvance(side);
        }
      }, AUTO_CAPTURE_DELAY_MS);
    }

    return () => {
      if (autoCaptureTimerRef.current) {
        clearTimeout(autoCaptureTimerRef.current);
        autoCaptureTimerRef.current = null;
      }
    };
  }, [allowed, detectedFace, currentIndex, captured]);

  // ✅ manual continue (fallback)
  async function handleContinue() {
    const sideLabel = SIDES[currentIndex];
    if (autoCapturingRef.current) return;
    if (!allowed) return alert("Align your face properly!");
    await doCaptureAndAdvance(sideLabel);
  }

  function handleRetake(side) {
    setCaptured((prev) => {
      const copy = { ...prev };
      if (copy[side]) {
        URL.revokeObjectURL(copy[side]);
        delete copy[side];
      }
      return copy;
    });
    const idx = SIDES.indexOf(side);
    if (idx >= 0) setCurrentIndex(idx);
  }

  // ✅ Convert Cloudinary URLs to binary blobs
  async function convertUrlsToBlobs(cloudinaryUrls) {
    const blobs = {};
    try {
      for (const [side, url] of Object.entries(cloudinaryUrls)) {
        if (url) {
          console.log(`Fetching image from Cloudinary URL for ${side}:`, url);
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to fetch image for ${side}: ${response.statusText}`);
          }
          const blob = await response.blob();
          blobs[side] = blob;
          console.log(`✅ Converted ${side} URL to blob (${blob.size} bytes)`);
        }
      }
      return blobs;
    } catch (error) {
      console.error("Error converting URLs to blobs:", error);
      throw error;
    }
  }

  // ✅ Send images to Yono Model API as multipart/form-data
  async function sendToYonoModel(imageBlobs) {
    try {
      const formData = new FormData();
      
      // Append each image blob to FormData
      for (const [side, blob] of Object.entries(imageBlobs)) {
        // Create a File object from the blob with proper filename
        const file = new File([blob], `${side}.jpg`, { type: blob.type || 'image/jpeg' });
        formData.append(side, file);
        console.log(`Added ${side} to FormData:`, file.name, file.size, 'bytes');
      }

      console.log("Sending images to Yono Model API:", YONO_MODEL_API_ENDPOINT);
      
      const response = await fetch(YONO_MODEL_API_ENDPOINT, {
        method: "POST",
        body: formData, // multipart/form-data is set automatically by browser
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Yono Model API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("✅ Yono Model API Response:", result);
      return result;
    } catch (error) {
      console.error("Error sending to Yono Model API:", error);
      throw error;
    }
  }

  // ✅ upload to backend and then send to Yono Model
  async function handleFinishUpload(captures = captured) {
    try {
      // Step 1: Upload to your backend (get Cloudinary URLs)
      console.log("Step 1: Uploading to backend...");
      const formData = new FormData();
      formData.append("userId", "12345");
      for (const side of Object.keys(captures)) {
        const blob = await fetch(captures[side]).then((r) => r.blob());
        formData.append(side, blob, `${side}.jpg`);
      }

      const res = await fetch("http://localhost:3000/api/faces/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      if (!data.success) {
        alert("❌ Upload Failed");
        return;
      }

      // Step 2: Get Cloudinary URLs from response
      const cloudinaryUrls = data.uploadedUrls || data.data?.scannedImage || {};
      console.log("✅ Received Cloudinary URLs:", cloudinaryUrls);

      if (Object.keys(cloudinaryUrls).length === 0) {
        alert("❌ No Cloudinary URLs received from backend");
        return;
      }

      // Step 3: Convert Cloudinary URLs to binary blobs
      console.log("Step 2: Converting Cloudinary URLs to binary blobs...");
      const imageBlobs = await convertUrlsToBlobs(cloudinaryUrls);
      console.log("✅ Converted all URLs to blobs:", Object.keys(imageBlobs));

      // Step 4: Send binary blobs to Yono Model API
      console.log("Step 3: Sending images to Yono Model API...");
      const yonoResult = await sendToYonoModel(imageBlobs);
      
      alert(`✅ Upload Successful!\n✅ Images sent to Yono Model API\nResponse: ${JSON.stringify(yonoResult)}`);
      
    } catch (err) {
      console.error("Upload error:", err);
      alert(`❌ Upload Failed: ${err.message}`);
    }
  }

  return (
    <div className="face-capture-wrapper">
      <h2 className="main-header">Face Capture — {SIDES[currentIndex]}</h2>

      {loadingModel && <div className="status-loading">Loading model...</div>}
      {hasCamera === false && (
        <div className="status-error">Camera access denied.</div>
      )}

      <div className="content-layout">
        {/* Video and Canvas */}
        <div className="video-container">
          <video
            ref={videoRef}
            className="webcam-video"
            playsInline
            muted
            autoPlay
          />
          <canvas ref={overlayRef} className="webcam-overlay" />
        </div>

        {/* Controls */}
        <div className="controls-panel">
          <div className="prompt-box card">
            <h4>Current Prompt</h4>
            <p>
              <strong>Position:</strong> **{SIDES[currentIndex]}**
            </p>
            <p className="prompt-instruction">
              {SIDES[currentIndex] === "FRONT" &&
                "Look straight at the camera."}
              {SIDES[currentIndex] === "LEFT" && "Turn your face LEFT."}
              {SIDES[currentIndex] === "RIGHT" && "Turn your face RIGHT."}
              {SIDES[currentIndex] === "UP" && "Tilt your face UP."}
              {SIDES[currentIndex] === "DOWN" && "Tilt your face DOWN."}
              {SIDES[currentIndex] === "SMILE_TILT" &&
                "Smile and tilt your head slightly."}
            </p>
          </div>

          <div className="status-checks card">
            <h4>Status</h4>
            <p>Face detected: {detectedFace ? "✅ Yes" : "❌ No"}</p>
            <p>Alignment Check: {allowed ? "✅ Passed" : "❌ Failed"}</p>
          </div>

          <button
            onClick={handleContinue}
            disabled={!detectedFace || !allowed}
            className="action-button primary"
          >
            {currentIndex === SIDES.length - 1
              ? "Finish Capture"
              : "Continue to Next"}
          </button>

          <div className="captured-images-section card">
            <h4>
              Captured Images ({Object.keys(captured).length}/{SIDES.length})
            </h4>
            <div className="captured-grid">
              {SIDES.map((s) => (
                <div key={s} className="captured-item">
                  <div className="image-preview">
                    {captured[s] ? (
                      <img src={captured[s]} alt={s} className="captured-img" />
                    ) : (
                      <div className="placeholder-text">{s}</div>
                    )}
                  </div>
                  {captured[s] && (
                    <div className="image-actions">
                      <a
                        href={captured[s]}
                        download={`${s}.jpg`}
                        className="link-button download"
                      >
                        Download
                      </a>
                      <button
                        onClick={() => handleRetake(s)}
                        className="link-button retake"
                      >
                        Retake
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
