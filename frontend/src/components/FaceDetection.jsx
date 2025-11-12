import React, { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";

const SIDES = ["FRONT", "LEFT", "RIGHT", "UP", "DOWN", "SMILE_TILT"];
const HORIZONTAL_THRESHOLD = 0.12;
const VERTICAL_THRESHOLD = 0.10;
// how long face must remain aligned before auto-capture (ms)
const AUTO_CAPTURE_DELAY_MS = 800;

export default function FaceDetection() {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const modelRef = useRef(null);
  const rafRef = useRef(null);

  const [loadingModel, setLoadingModel] = useState(true);
  const [hasCamera, setHasCamera] = useState(null);
  const [detectedFace, setDetectedFace] = useState(null); // detection object
  const [currentIndex, setCurrentIndex] = useState(0);
  const [captured, setCaptured] = useState({}); // { FRONT: blobUrl, ... }
  const [allowed, setAllowed] = useState(false); // is Continue enabled?

  // refs used for auto-capture control
  const autoCaptureTimerRef = useRef(null);
  const autoCapturingRef = useRef(false); // prevents duplicate captures

  // load model
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingModel(true);
      await tf.ready();
      const model = await blazeface.load();
      modelRef.current = model;
      if (mounted) setLoadingModel(false);
    })();
    return () => { mounted = false; };
  }, []);

  // start camera
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setHasCamera(true);
      } catch (err) {
        console.error("Camera error:", err);
        setHasCamera(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // detection loop
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
          const returnTensors = false;
          const predictions = await modelRef.current.estimateFaces(video, returnTensors);

          if (predictions && predictions.length > 0) {
            // pick largest face (first is fine)
            const p = predictions[0];
            setDetectedFace(p);
            // draw box
            const [x, y] = p.topLeft;
            const [x2, y2] = p.bottomRight;
            const w = x2 - x;
            const h = y2 - y;

            ctx.strokeStyle = "lime";
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, w, h);

            // draw nose point if available (blazeface landmarks: [rightEye,leftEye,nose, ...])
            if (p.landmarks && p.landmarks.length >= 3) {
              const nose = p.landmarks[2];
              ctx.fillStyle = "red";
              ctx.beginPath();
              ctx.arc(nose[0], nose[1], 4, 0, Math.PI * 2);
              ctx.fill();
            }

            // check orientation heuristics
            const ok = checkOrientationForSide(p, SIDES[currentIndex]);
            setAllowed(ok);
          } else {
            setDetectedFace(null);
            setAllowed(false);
          }

        } catch (err) {
          console.error("detect err", err);
          setDetectedFace(null);
          setAllowed(false);
        }
        rafRef.current = requestAnimationFrame(step);
      };

      step();
    };

    if (modelRef.current && videoRef.current && hasCamera) {
      runDetection();
    }

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [hasCamera, loadingModel, currentIndex]);

  // orientation heuristic function
  function checkOrientationForSide(prediction, side) {
    // prediction.topLeft, bottomRight, landmarks
    const [x, y] = prediction.topLeft;
    const [x2, y2] = prediction.bottomRight;
    const w = x2 - x;
    const h = y2 - y;
    // center of face box
    const cx = x + w / 2;
    const cy = y + h / 2;

    // try get nose
    const nose = (prediction.landmarks && prediction.landmarks[2]) ? prediction.landmarks[2] : null;
    if (!nose) return false;
    const [nx, ny] = nose;

    const dx = (nx - cx) / w; // normalized horizontal offset
    const dy = (ny - cy) / h; // normalized vertical offset

    switch (side) {
      case "FRONT":
        // nose roughly centered both axes
        return Math.abs(dx) < HORIZONTAL_THRESHOLD && Math.abs(dy) < VERTICAL_THRESHOLD;
      case "LEFT":
        // nose shifted right relative to face center (user's left is camera RIGHT) — depends on camera mirroring
        return dx > HORIZONTAL_THRESHOLD; // nose to right of center -> user's left
      case "RIGHT":
        return dx < -HORIZONTAL_THRESHOLD; // nose to left of center -> user's right
      case "UP":
        return dy < -VERTICAL_THRESHOLD;
      case "DOWN":
        return dy > VERTICAL_THRESHOLD;
      case "SMILE_TILT":
        // fallback — accept any detection (or require small tilt using eyes heights)
        return Math.abs(dx) > HORIZONTAL_THRESHOLD || Math.abs(dy) > VERTICAL_THRESHOLD || Math.abs(dx) < HORIZONTAL_THRESHOLD;
      default:
        return false;
    }
  }

  // capture current frame (draw video frame to hidden canvas and export jpg)
  async function captureCurrent() {
    const video = videoRef.current;
    if (!video) return null;
    const w = video.videoWidth;
    const h = video.videoHeight;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    // draw mirrored so front camera capture looks like what user expects
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);

    return new Promise((resolve) => {
      c.toBlob((blob) => {
        resolve(blob);
      }, "image/jpeg", 0.9);
    });
  }

  // shared logic for advancing (used by manual and auto capture)
  async function doCaptureAndAdvance(sideLabel) {
    // avoid duplicate captures for the same side
    if (captured[sideLabel] || autoCapturingRef.current) return;
    autoCapturingRef.current = true;
    try {
      const blob = await captureCurrent();
      if (!blob) {
        console.warn("capture failed");
        return;
      }
      const url = URL.createObjectURL(blob);
      setCaptured((prev) => ({ ...prev, [sideLabel]: url }));

      // advance index (if not last)
      if (currentIndex < SIDES.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        // finished all sides -> upload
        console.log("All sides captured:", { ...captured, [sideLabel]: url });
        alert("All sides captured! Uploading to server...");
        // small delay to let state settle
        setTimeout(() => handleFinishUpload({ ...captured, [sideLabel]: url }), 200);
      }
    } finally {
      // allow next auto-capture after a small cooldown
      setTimeout(() => { autoCapturingRef.current = false; }, 600);
    }
  }

  // auto-capture effect: when allowed becomes true for the current side,
  // start a short timer and capture if still allowed after delay
  useEffect(() => {
    const side = SIDES[currentIndex];
    // clear any existing timer
    if (autoCaptureTimerRef.current) {
      clearTimeout(autoCaptureTimerRef.current);
      autoCaptureTimerRef.current = null;
    }

    // if already captured for this side, do nothing
    if (captured[side]) return;

    if (allowed && detectedFace) {
      // start timer
      autoCaptureTimerRef.current = setTimeout(async () => {
        // re-check allowed & face before capturing
        if (allowed && detectedFace && !captured[side]) {
          await doCaptureAndAdvance(side);
        }
      }, AUTO_CAPTURE_DELAY_MS);
    }

    return () => {
      if (autoCaptureTimerRef.current) {
        clearTimeout(autoCaptureTimerRef.current);
        autoCaptureTimerRef.current = null;
      }
    };
    // we intentionally listen to allowed, detectedFace, currentIndex, captured[side]
  }, [allowed, detectedFace, currentIndex, captured]);

  async function handleContinue() {
    if (!allowed) {
      alert("Face not aligned for this side. Please adjust position according to the prompt.");
      return;
    }
    const sideLabel = SIDES[currentIndex];
    // If auto-capture is already in progress, let it handle it
    if (autoCapturingRef.current) return;
    await doCaptureAndAdvance(sideLabel);
  }

  function handleRetake(side) {
    // remove that side and set index to it
    setCaptured(prev => {
      const copy = { ...prev };
      if (copy[side]) {
        // revoke object URL to avoid leaks
        try { URL.revokeObjectURL(copy[side]); } catch {
          console.log("error");
        }
        delete copy[side];
      }
      return copy;
    });
    const idx = SIDES.indexOf(side);
    if (idx >= 0) setCurrentIndex(idx);
  }

  const handleFinishUpload = async (captures = captured) => {
    const formData = new FormData();
    formData.append("userId", "12345"); // replace with real userId if you have auth

    for (const side of Object.keys(captures)) {
      const blob = await fetch(captures[side]).then((r) => r.blob());
      formData.append(side, blob, `${side}.jpg`);
    }

    try {
      const res = await fetch("http://localhost:3000/api/faces/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ Upload Successful");
        console.log("Saved to MongoDB:", data.data);
      } else {
        alert("❌ Upload Failed");
        console.error(data);
      }
    } catch (err) {
      console.error("upload error", err);
      alert("❌ Upload Failed (network error)");
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Face capture — {SIDES[currentIndex]}</h2>

      {loadingModel && <div>Loading model...</div>}
      {hasCamera === false && <div>Camera access denied. Allow camera permission and reload.</div>}

      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ position: "relative", width: 640, height: 480, background: "#000" }}>
          <video
            ref={videoRef}
            style={{ width: "640px", height: "480px", transform: "scaleX(-1)" }} // mirror
            playsInline
            muted
            autoPlay
          />
          <canvas
            ref={overlayRef}
            style={{ position: "absolute", left: 0, top: 0, width: 640, height: 480, pointerEvents: "none" }}
          />
        </div>

        <div style={{ maxWidth: 320 }}>
          <p>
            Prompt: <strong>{SIDES[currentIndex]}</strong>
          </p>
          <p>
            Instruction:
            {SIDES[currentIndex] === "FRONT" && " Keep your face centered and look straight."}
            {SIDES[currentIndex] === "LEFT" && " Turn your face LEFT (your left) ~20°."}
            {SIDES[currentIndex] === "RIGHT" && " Turn your face RIGHT ~20°."}
            {SIDES[currentIndex] === "UP" && " Tilt your face UP."}
            {SIDES[currentIndex] === "DOWN" && " Tilt your face DOWN."}
            {SIDES[currentIndex] === "SMILE_TILT" && " Smile and tilt your head slightly."}
          </p>

          <p>Face detected: {detectedFace ? "Yes" : "No"}</p>
          <p>Aligned for this side: {allowed ? "Yes ✔" : "No ✖"}</p>

          <button onClick={handleContinue} disabled={!detectedFace || !allowed} style={{ marginTop: 8, padding: "8px 12px" }}>
            {currentIndex === SIDES.length - 1 ? "Finish" : "Continue"}
          </button>

          <div style={{ marginTop: 16 }}>
            <h4>Captured thumbnails</h4>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SIDES.map(s => (
                <div key={s} style={{ textAlign: "center", width: 100 }}>
                  <div style={{ width: 100, height: 75, background: "#eee", borderRadius: 6, overflow: "hidden" }}>
                    {captured[s] ? (
                      <img src={captured[s]} alt={s} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
                        {s}
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    {captured[s] ? (
                      <>
                        <a href={captured[s]} download={`${s.toLowerCase()}.jpg`} style={{ fontSize: 12 }}>Download</a>
                        <button onClick={() => handleRetake(s)} style={{ marginLeft: 6 }}>Retake</button>
                      </>
                    ) : (
                      <span style={{ fontSize: 12, color: "#888" }}>—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
