import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// Note: Assuming these external libraries are resolved in your build environment
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";

// --- Configuration Constants ---
const SIDES = ["FRONT", "LEFT", "RIGHT", "UP", "DOWN", "SMILE_TILT"];
const HORIZONTAL_THRESHOLD = 0.12;
const VERTICAL_THRESHOLD = 0.1;
const AUTO_CAPTURE_DELAY_MS = 800;
const UPLOAD_API_ENDPOINT = "http://localhost:3000/api/image/upload"; // Backend endpoint for Cloudinary upload
const REGISTER_API_ENDPOINT = "http://localhost:3000/api/auth/register"; // Final registration endpoint

// Custom Modal Message Component (replaces alert())
const ModalMessage = ({ message, isError, onClose }) => {
    if (!message) return null;

    const bgColor = isError ? "bg-red-500" : "bg-green-500";
    const title = isError ? "Error" : "Success";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className={`p-6 rounded-lg shadow-2xl max-w-sm w-full ${bgColor} text-white`}>
                <h4 className="text-xl font-bold mb-3">{title}</h4>
                <p className="mb-4">{message}</p>
                <button
                    onClick={onClose}
                    className="w-full py-2 bg-white text-gray-800 font-semibold rounded hover:bg-gray-100 transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    );
};


export default function FaceRegistration() {
    const navigate = useNavigate();
    const location = useLocation();

    // Retrieve user data (name, email, pin, etc.) passed from Signup page
    const userData = location.state?.userData || {}; 

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
    const [isUploading, setIsUploading] = useState(false); // State for upload status

    // Modal state
    const [modalMessage, setModalMessage] = useState(null);
    const [isModalError, setIsModalError] = useState(false);

    const autoCaptureTimerRef = useRef(null);
    const autoCapturingRef = useRef(false);

    const showMessage = (message, isError = false) => {
        setIsModalError(isError);
        setModalMessage(message);
    };

    // --- EFFECT: Load BlazeFace model ---
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

    // --- EFFECT: Start Camera ---
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

    // --- EFFECT: Continuous Detection ---
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

    // ✅ Orientation check (corrected for mirrored video)
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
            // Swapped dx directions for mirrored video stream
            case "LEFT":
                return dx < -HORIZONTAL_THRESHOLD; 
            case "RIGHT":
                return dx > HORIZONTAL_THRESHOLD; 
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
        
        // Apply mirror transform to capture image as seen by user
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
                console.log("✅ All sides captured! Starting final registration...");
                showMessage("✅ All face scans complete. Finalizing registration...", false);
                
                await handleFinishUpload({ ...captured, [sideLabel]: url });
            }
        } finally {
            setTimeout(() => (autoCapturingRef.current = false), 600);
        }
    }

    // --- EFFECT: Fixed auto-capture effect ---
    useEffect(() => {
        const side = SIDES[currentIndex];

        if (autoCaptureTimerRef.current) {
            clearTimeout(autoCaptureTimerRef.current);
            autoCaptureTimerRef.current = null;
        }

        if (captured[side]) return;

        if (allowed && detectedFace && !autoCapturingRef.current) {
            autoCaptureTimerRef.current = setTimeout(() => {
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

    // --- Manual continue (fallback) ---
    async function handleContinue() {
        const sideLabel = SIDES[currentIndex];
        if (autoCapturingRef.current || isUploading) return;
        if (!allowed) return showMessage("Align your face properly to continue.", true);
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

    // --- NEW: Upload Images to Cloudinary via Backend ---
    async function uploadImagesToCloudinary(captures) {
        const formData = new FormData();
        
        for (const side of Object.keys(captures)) {
            const blob = await fetch(captures[side]).then((r) => r.blob());
            formData.append('faces', blob, `${side}.jpg`); 
        }
        
        try {
            const res = await fetch(UPLOAD_API_ENDPOINT, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                throw new Error("Failed to upload images to Cloudinary via backend.");
            }

            const data = await res.json();
            
            // Expected return format: { uploadedUrls: { FRONT: url, LEFT: url, ... } }
            if (data.uploadedUrls) { 
                return data.uploadedUrls;
            } else {
                throw new Error("Backend did not return image URLs.");
            }
        } catch (err) {
            console.error("Cloudinary Upload Error:", err);
            throw new Error("Image upload failed during Cloudinary process.");
        }
    }

    // --- Final Submission and Registration ---
    async function handleFinishUpload(captures = captured) {
        setIsUploading(true);
        try {
            // STEP 1: Upload images to Cloudinary and get URLs
            showMessage("Step 1/2: Uploading images to Cloudinary...", false);
            const uploadedUrls = await uploadImagesToCloudinary(captures);

            // STEP 2: Submit final registration data (User Data + Image URLs)
            showMessage("Step 2/2: Finalizing registration...", false);
            
            const finalPayload = {
                ...userData,
                scannedImage: uploadedUrls, // Send the URLs back to the final registration endpoint
            };
            
            const res = await fetch(REGISTER_API_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" }, // Sending JSON now!
                body: JSON.stringify(finalPayload),
            });

            if (res.ok) {
                showMessage("✅ Registration Successful! Please log in.", false);
                // Redirect to login page after successful registration
                setTimeout(() => navigate('/login'), 2000); 
            } else {
                const errorData = await res.json();
                showMessage(`❌ Registration Failed: ${errorData.message || 'Server error during registration.'}`, true);
            }
        } catch (err) {
            console.error("Final registration error:", err);
            showMessage(`❌ Registration Failed: ${err.message || "An unexpected error occurred."}`, true);
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto bg-gray-50 min-h-screen">
            <ModalMessage 
                message={modalMessage} 
                isError={isModalError} 
                onClose={() => setModalMessage(null)} 
            />

            <h2 className="text-3xl font-semibold mb-6 text-indigo-600 border-b pb-2">
                Face Registration — {SIDES[currentIndex]}
            </h2>

            {loadingModel && <div className="p-3 bg-yellow-100 text-yellow-800 rounded-lg mb-4 shadow-sm">Loading Face Model...</div>}
            {hasCamera === false && (
                <div className="p-3 bg-red-100 text-red-800 rounded-lg mb-4 shadow-sm">Camera access denied.</div>
            )}
            
            {isUploading && (
                <div className="p-3 bg-indigo-100 text-indigo-800 rounded-lg mb-4 shadow-sm">
                    Finalizing registration and saving biometric data... Please wait.
                </div>
            )}

            {/* Content Layout: Flex on desktop, stacked on mobile */}
            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Video and Canvas Container */}
                <div className="w-full max-w-xl lg:max-w-3xl flex-shrink-0">
                    {/* Video Container (Aspect Ratio Fix) */}
                    <div className="relative w-full pb-[75%] h-0 overflow-hidden rounded-xl shadow-xl bg-black">
                        <video
                            ref={videoRef}
                            className="absolute top-0 left-0 w-full h-full object-cover transform scale-x-[-1]"
                            playsInline
                            muted
                            autoPlay
                        />
                        <canvas ref={overlayRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
                    </div>
                </div>

                {/* Controls Panel */}
                <div className="w-full lg:w-96 flex flex-col gap-5">

                    {/* Current User Data Summary */}
                    <div className="p-4 bg-gray-100 rounded-lg shadow-inner border border-gray-200">
                         <h4 className="text-lg font-semibold border-b pb-2 mb-3 text-indigo-700">Account Details</h4>
                         <p className="text-sm">Name: **{userData.name || 'N/A'}**</p>
                         <p className="text-sm">Email: **{userData.email || 'N/A'}**</p>
                    </div>

                    {/* Prompt Box Card */}
                    <div className="p-4 bg-white rounded-lg shadow-md border border-gray-100">
                        <h4 className="text-lg font-semibold border-b pb-2 mb-3 text-indigo-700">Current Prompt</h4>
                        <p className="mb-2">
                            <strong className="font-bold">Position:</strong> **{SIDES[currentIndex]}**
                        </p>
                        <p className="text-gray-600 italic text-sm">
                            {SIDES[currentIndex] === "FRONT" && "Look straight at the camera."}
                            {SIDES[currentIndex] === "LEFT" && "Turn your face LEFT."}
                            {SIDES[currentIndex] === "RIGHT" && "Turn your face RIGHT."}
                            {SIDES[currentIndex] === "UP" && "Tilt your face UP."}
                            {SIDES[currentIndex] === "DOWN" && "Tilt your face DOWN."}
                            {SIDES[currentIndex] === "SMILE_TILT" && "Smile and tilt your head slightly."}
                        </p>
                    </div>

                    {/* Status Checks Card */}
                    <div className="p-4 bg-white rounded-lg shadow-md border border-gray-100">
                        <h4 className="text-lg font-semibold border-b pb-2 mb-3 text-indigo-700">Status</h4>
                        <p>Face detected: {detectedFace ? "✅ Yes" : "❌ No"}</p>
                        <p>Alignment Check: {allowed ? "✅ Passed" : "❌ Failed"}</p>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleContinue}
                        disabled={!detectedFace || !allowed || isUploading}
                        className="w-full py-3 text-xl font-bold rounded-lg transition-colors 
                                   bg-indigo-600 text-white hover:bg-indigo-700 
                                   disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                    >
                        {isUploading ? "Uploading..." : currentIndex === SIDES.length - 1 ? "Finish Registration" : "Continue to Next"}
                    </button>

                    {/* Captured Images Section Card */}
                    <div className="p-4 bg-white rounded-lg shadow-md border border-gray-100">
                        <h4 className="text-lg font-semibold border-b pb-2 mb-3 text-indigo-700">
                            Captured Images ({Object.keys(captured).length}/{SIDES.length})
                        </h4>
                        <div className="flex flex-wrap gap-3 justify-start">
                            {SIDES.map((s) => (
                                <div key={s} className="w-24 text-center">
                                    <div className="w-full h-16 bg-gray-200 rounded-md overflow-hidden flex items-center justify-center border border-gray-300">
                                        {captured[s] ? (
                                            <img src={captured[s]} alt={s} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-xs text-gray-500">{s}</div>
                                        )}
                                    </div>
                                    {captured[s] && (
                                        <div className="flex justify-between mt-2 gap-1">
                                            <a
                                                href={captured[s]}
                                                download={`${s}.jpg`}
                                                className="text-xs text-green-600 hover:text-green-800 border-b border-green-600 leading-tight"
                                            >
                                                DL
                                            </a>
                                            <button
                                                onClick={() => handleRetake(s)}
                                                className="text-xs text-red-600 hover:text-red-800 border-b border-red-600 leading-tight"
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