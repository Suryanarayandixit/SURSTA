import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Header from '../components/Header';
import Toolbar from '../components/Toolbar';
import RemoteCursors from '../components/RemoteCursors';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// ── Throttle utility ─────────────────────────────────────────────────────────
function throttle(fn, ms) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  };
}

// ── Drawing utilities ────────────────────────────────────────────────────────
function drawSegment(ctx, from, to, opts) {
  ctx.save();
  ctx.globalCompositeOperation = opts.tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.strokeStyle = opts.color;
  ctx.lineWidth = opts.brushSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function drawRect(ctx, start, end, opts) {
  ctx.save();
  ctx.strokeStyle = opts.color;
  ctx.lineWidth = opts.brushSize;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
  ctx.restore();
}

function drawCircle(ctx, start, end, opts) {
  ctx.save();
  ctx.strokeStyle = opts.color;
  ctx.lineWidth = opts.brushSize;
  const rx = Math.abs(end.x - start.x) / 2;
  const ry = Math.abs(end.y - start.y) / 2;
  const cx = Math.min(start.x, end.x) + rx;
  const cy = Math.min(start.y, end.y) + ry;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export default function DrawingRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const overlayRef = useRef(null); // for shape preview
  const socketRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  const strokeStart = useRef(null);
  const currentStroke = useRef([]);
  const localHistory = useRef([]); // ImageData stack for undo

  const [users, setUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [myId, setMyId] = useState('');
  const [tool, setTool] = useState('brush');
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(5);
  const [isDragOver, setIsDragOver] = useState(false);

  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);

  // ── Canvas setup: hi-DPI + resize ────────────────────────────────────────
  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      if (!canvas || !overlay) return;
      const parent = canvas.parentElement;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      // Save current content
      const ctx = canvas.getContext('2d');
      const saved = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Resize
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      overlay.width = w * dpr;
      overlay.height = h * dpr;
      overlay.style.width = `${w}px`;
      overlay.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
      overlayRef.current.getContext('2d').scale(dpr, dpr);
      // Restore
      ctx.putImageData(saved, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvasRef.current?.parentElement);
    return () => ro.disconnect();
  }, []);

  // ── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    const userName = sessionStorage.getItem('wb-username');
    if (!userName) { navigate('/'); return; }
    sessionStorage.getItem('wb-password');

    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setMyId(socket.id);
      socket.emit('join-room', { roomId, password : password });
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('users-update', setUsers);
    socket.on('error', (errorMessage) => {
    alert(errorMessage);
    window.location.href = "/"; // Galat password 
});

    // Replay full history on join
    socket.on('canvas-history', (history) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      localHistory.current = [];

      for (const ev of history) {
        replayEvent(ctx, ev);
      }
    });

    // Remote drawing
    const remoteState = {};

    socket.on('draw-start', ({ userId, x, y, tool, color, brushSize }) => {
      remoteState[userId] = { lastX: x, lastY: y, startX: x, startY: y, tool, color, brushSize };
    });

    socket.on('draw-move', ({ userId, x, y }) => {
      const canvas = canvasRef.current;
      const s = remoteState[userId];
      if (!canvas || !s) return;
      const ctx = canvas.getContext('2d');
      if (s.tool === 'brush' || s.tool === 'eraser') {
        drawSegment(ctx, { x: s.lastX, y: s.lastY }, { x, y }, s);
      }
      s.lastX = x; s.lastY = y;
    });

    socket.on('draw-end', ({ userId, points, tool, color, brushSize }) => {
      const canvas = canvasRef.current;
      if (!canvas || !points?.length) return;
      const ctx = canvas.getContext('2d');
      const opts = { tool, color, brushSize };
      if (tool === 'rect') drawRect(ctx, points[0], points[points.length - 1], opts);
      else if (tool === 'circle') drawCircle(ctx, points[0], points[points.length - 1], opts);
      delete remoteState[userId];
    });

    socket.on('clear-canvas', () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.getContext('2d').clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      localHistory.current = [];
    });

    socket.on('canvas-history', replayAll);

    socket.on('image-drop', ({ dataUrl, x, y, w, h }) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => canvasRef.current?.getContext('2d').drawImage(img, x, y, w, h);
    });

    return () => socket.disconnect();
  }, [roomId]);

  function replayEvent(ctx, ev) {
    if (ev.type === 'stroke' && ev.points?.length > 1) {
      const opts = { tool: ev.tool, color: ev.color, brushSize: ev.brushSize };
      if (ev.tool === 'rect') {
        drawRect(ctx, ev.points[0], ev.points[ev.points.length - 1], opts);
      } else if (ev.tool === 'circle') {
        drawCircle(ctx, ev.points[0], ev.points[ev.points.length - 1], opts);
      } else {
        for (let i = 1; i < ev.points.length; i++) {
          drawSegment(ctx, ev.points[i - 1], ev.points[i], opts);
        }
      }
    } else if (ev.type === 'image') {
      const img = new Image();
      img.src = ev.dataUrl;
      img.onload = () => ctx.drawImage(img, ev.x, ev.y, ev.w, ev.h);
    }
  }

  function replayAll(history) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    localHistory.current = [];
    for (const ev of history) replayEvent(ctx, ev);
  }

  // ── Coordinate helper ─────────────────────────────────────────────────────
  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const scaleX = (canvas.width / dpr) / rect.width;
    const scaleY = (canvas.height / dpr) / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  // ── Pointer handlers ──────────────────────────────────────────────────────
  function onPointerDown(e) {
    e.preventDefault();
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;

    // Save for undo
    localHistory.current.push(ctx.getImageData(0, 0, canvas.width / dpr, canvas.height / dpr));
    if (localHistory.current.length > 50) localHistory.current.shift();

    isDrawing.current = true;
    const pos = getPos(e);
    lastPos.current = pos;
    strokeStart.current = pos;
    currentStroke.current = [pos];

    socketRef.current?.emit('draw-start', {
      x: pos.x, y: pos.y,
      tool: toolRef.current, color: colorRef.current, brushSize: brushSizeRef.current,
    });
  }

  const throttledCursor = useCallback(throttle((x, y) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    socketRef.current?.emit('cursor-move', {
      x: (x - rect.left) / rect.width,
      y: (y - rect.top) / rect.height,
    });
  }, 32), []);

  function onPointerMove(e) {
    e.preventDefault();
    throttledCursor(e.clientX, e.clientY);
    if (!isDrawing.current) return;

    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    const ctx = canvas.getContext('2d');
    const oCtx = overlay.getContext('2d');
    const pos = getPos(e);
    const dpr = window.devicePixelRatio || 1;
    const t = toolRef.current;
    const opts = { tool: t, color: colorRef.current, brushSize: brushSizeRef.current };

    if (t === 'brush' || t === 'eraser') {
      drawSegment(ctx, lastPos.current, pos, opts);
    } else {
      // Shape preview on overlay
      oCtx.clearRect(0, 0, overlay.width / dpr, overlay.height / dpr);
      if (t === 'rect') drawRect(oCtx, strokeStart.current, pos, opts);
      else if (t === 'circle') drawCircle(oCtx, strokeStart.current, pos, opts);
    }

    currentStroke.current.push(pos);
    lastPos.current = pos;

    socketRef.current?.emit('draw-move', {
      x: pos.x, y: pos.y,
      tool: t, color: colorRef.current, brushSize: brushSizeRef.current,
    });
  }

  function onPointerUp(e) {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    const ctx = canvas.getContext('2d');
    const oCtx = overlay.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const pos = getPos(e);
    const t = toolRef.current;
    const opts = { tool: t, color: colorRef.current, brushSize: brushSizeRef.current };

    // Commit shape from overlay
    oCtx.clearRect(0, 0, overlay.width / dpr, overlay.height / dpr);
    if (t === 'rect') drawRect(ctx, strokeStart.current, pos, opts);
    else if (t === 'circle') drawCircle(ctx, strokeStart.current, pos, opts);

    currentStroke.current.push(pos);

    socketRef.current?.emit('draw-end', {
      points: currentStroke.current,
      tool: t, color: colorRef.current, brushSize: brushSizeRef.current,
    });

    currentStroke.current = [];
  }

  // ── Undo ──────────────────────────────────────────────────────────────────
  function handleUndo() {
    const canvas = canvasRef.current;
    if (!canvas || localHistory.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(localHistory.current.pop(), 0, 0);
    socketRef.current?.emit('undo');
  }

  // ── Clear ─────────────────────────────────────────────────────────────────
  function handleClear() {
    if (!confirm('Clear the canvas for everyone?')) return;
    socketRef.current?.emit('clear-canvas');
  }

  // ── Image upload ──────────────────────────────────────────────────────────
  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.src = ev.target.result;
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const cw = canvas.width / dpr;
        const ch = canvas.height / dpr;
        const ratio = Math.min(cw * 0.5 / img.width, ch * 0.5 / img.height, 1);
        const w = img.width * ratio;
        const h = img.height * ratio;
        const x = (cw - w) / 2;
        const y = (ch - h) / 2;
        ctx.drawImage(img, x, y, w, h);
        socketRef.current?.emit('image-drop', { dataUrl: ev.target.result, x, y, w, h });
      };
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  // ── Drag & drop image ─────────────────────────────────────────────────────
  function onDragOver(e) { e.preventDefault(); setIsDragOver(true); }
  function onDragLeave() { setIsDragOver(false); }
  function onDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.src = ev.target.result;
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const scaleX = (canvas.width / dpr) / rect.width;
        const scaleY = (canvas.height / dpr) / rect.height;
        const dropX = (e.clientX - rect.left) * scaleX;
        const dropY = (e.clientY - rect.top) * scaleY;
        const ratio = Math.min(400 / img.width, 300 / img.height, 1);
        const w = img.width * ratio;
        const h = img.height * ratio;
        const x = dropX - w / 2;
        const y = dropY - h / 2;
        ctx.drawImage(img, x, y, w, h);
        socketRef.current?.emit('image-drop', { dataUrl: ev.target.result, x, y, w, h });
      };
    };
    reader.readAsDataURL(file);
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') handleUndo();
      if (e.key === 'b') setTool('brush');
      if (e.key === 'e') setTool('eraser');
      if (e.key === 'r') setTool('rect');
      if (e.key === 'c') setTool('circle');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const cursorStyle = {
    brush: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='4' fill='none' stroke='white' stroke-width='2'/%3E%3Ccircle cx='10' cy='10' r='4' fill='none' stroke='black' stroke-width='1'/%3E%3C/svg%3E") 10 10, crosshair`,
    eraser: 'cell',
    rect: 'crosshair',
    circle: 'crosshair',
  }[tool] || 'crosshair';

  return (
    <div style={styles.page}>
      <Header roomId={roomId} users={users} connected={connected} myId={myId} />

      <div style={styles.body}>
        <Toolbar
          tool={tool} setTool={setTool}
          color={color} setColor={setColor}
          brushSize={brushSize} setBrushSize={setBrushSize}
          onUndo={handleUndo}
          onClear={handleClear}
          onImageUpload={handleImageUpload}
        />

        <div
          style={{ ...styles.canvasWrap, ...(isDragOver ? styles.dragOver : {}) }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {/* Checkerboard background */}
          <div style={styles.checkerboard} />

          <canvas
            ref={canvasRef}
            style={{ ...styles.canvas, cursor: cursorStyle }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onTouchStart={onPointerDown}
            onTouchMove={onPointerMove}
            onTouchEnd={onPointerUp}
          />

          {/* Shape preview overlay */}
          <canvas
            ref={overlayRef}
            style={{ ...styles.canvas, ...styles.overlay, pointerEvents: 'none' }}
          />

          {isDragOver && (
            <div style={styles.dropZone}>
              <span style={styles.dropText}>Drop image here</span>
            </div>
          )}
        </div>
      </div>

      <RemoteCursors socket={socketRef.current} canvasRef={canvasRef} myId={myId} />

      {/* Keyboard hints */}
      <div style={styles.hints}>
        <span>B brush</span>
        <span>E eraser</span>
        <span>R rect</span>
        <span>C circle</span>
        <span>⌘Z undo</span>
      </div>
    </div>
  );
}

const styles = {
  page: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg)',
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
  },
  canvasWrap: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    transition: 'outline 0.1s',
  },
  dragOver: {
    outline: '3px dashed var(--accent)',
  },
  checkerboard: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(45deg, #1a1a24 25%, transparent 25%),
      linear-gradient(-45deg, #1a1a24 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #1a1a24 75%),
      linear-gradient(-45deg, transparent 75%, #1a1a24 75%)
    `,
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
    opacity: 0.3,
  },
  canvas: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    touchAction: 'none',
  },
  overlay: {
    zIndex: 5,
  },
  dropZone: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(124,106,245,0.08)',
    zIndex: 10,
    pointerEvents: 'none',
  },
  dropText: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'var(--accent)',
    fontFamily: 'var(--font-display)',
  },
  hints: {
    position: 'fixed',
    bottom: '12px',
    right: '16px',
    display: 'flex',
    gap: '12px',
    fontSize: '10px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    pointerEvents: 'none',
    zIndex: 50,
  },
};