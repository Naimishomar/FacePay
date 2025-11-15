// src/pages/PayFaceDetection.jsx
import React, { useEffect, useRef, useState } from 'react';

const WS_URL = 'ws://localhost:3000/stream'; // use wss:// in production
const SEND_FPS = 5; // frames per second to send (tune: 2-10 recommended)
const JPEG_QUALITY = 0.75; // compression quality 0..1

export default function PayFaceDetection() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const sendIntervalRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);

  // Optional: token from localStorage for auth (if using JWT)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    // open websocket with optional token query param
    const url = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket open');
      setConnected(true);
      // you can send an init message if needed
      ws.send(JSON.stringify({ type: 'init', client: 'pay-face', ts: Date.now() }));
    };
    ws.onclose = () => {
      console.log('WebSocket closed');
      setConnected(false);
    };
    ws.onerror = (e) => {
      console.error('WebSocket error', e);
      setConnected(false);
    };
    ws.onmessage = (ev) => {
      // handle server messages if needed
      try {
        const text = typeof ev.data === 'string' ? ev.data : null;
        if (text) {
          const msg = JSON.parse(text);
          // e.g. { type: 'ack', frameId: '...' }
          console.log('Server:', msg);
        }
      } catch (err) {
        console.warn('Non-JSON ws message', ev.data);
      }
    };

    return () => {
      ws.close();
    };
  }, [token]);

  useEffect(() => {
    // request camera
    let mounted = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        console.error('Camera error', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    // create hidden canvas to draw frames
    const canvas = document.createElement('canvas');
    canvasRef.current = canvas;
  }, []);

  const startSending = () => {
    if (!videoRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('Video or WebSocket not ready');
      return;
    }
    if (sendIntervalRef.current) return;

    setSending(true);
    const intervalMs = Math.round(1000 / SEND_FPS);

    sendIntervalRef.current = setInterval(async () => {
      try {
        await captureAndSendFrame();
      } catch (err) {
        console.error('capture/send error', err);
      }
    }, intervalMs);
  };

  const stopSending = () => {
    if (sendIntervalRef.current) {
      clearInterval(sendIntervalRef.current);
      sendIntervalRef.current = null;
    }
    setSending(false);
  };

  async function captureAndSendFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ws = wsRef.current;
    if (!video || !canvas || !ws || ws.readyState !== WebSocket.OPEN) return;

    // size canvas to video
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    canvas.width = vw;
    canvas.height = vh;

    const ctx = canvas.getContext('2d');

    // mirror the image so it matches what the user sees (optional)
    ctx.save();
    ctx.translate(vw, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, vw, vh);
    ctx.restore();

    // you could draw overlays here (face box, etc.)

    // toBlob gives compressed JPEG blob
    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    );
    if (!blob) return;

    // Prepare metadata message - small JSON as string
    const meta = {
      type: 'frame-meta',
      ts: Date.now(),
      // add any app-specific metadata (user id, frame index, side label)
      userId: (localStorage.getItem('user') && JSON.parse(localStorage.getItem('user')).id) || null,
      width: vw,
      height: vh,
    };

    // First send metadata as text (easy to parse on server), then binary frame
    // You could also embed metadata in a header in binary, but separate messages are simpler.
    ws.send(JSON.stringify(meta));

    // convert blob -> ArrayBuffer and send
    const arrayBuffer = await blob.arrayBuffer();
    ws.send(arrayBuffer);
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Pay Face Detection (WebSocket streaming)</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="relative w-full max-w-md bg-black rounded overflow-hidden">
            <video ref={videoRef} className="w-full h-auto scale-x-[-1]" playsInline muted />
          </div>
          <div className="mt-3 flex gap-3">
            <button
              onClick={startSending}
              disabled={!connected || sending}
              className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-60"
            >
              Start Stream
            </button>
            <button
              onClick={stopSending}
              disabled={!sending}
              className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-60"
            >
              Stop Stream
            </button>
            <div className="ml-3 text-sm self-center">
              WS: {connected ? <span className="text-green-600">connected</span> : <span className="text-red-600">disconnected</span>}
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600">Notes:</p>
          <ul className="list-disc ml-5 mt-2 text-sm">
            <li>Frames are JPEG-compressed and sent as binary ArrayBuffers to save bandwidth.</li>
            <li>We send a small JSON metadata message before each binary frame.</li>
            <li>Tune <code>SEND_FPS</code> and <code>JPEG_QUALITY</code> for performance vs. fidelity.</li>
            <li>In production use <code>wss://</code> and pass a short-lived auth token.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
