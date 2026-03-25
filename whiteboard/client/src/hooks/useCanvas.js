import { useEffect, useRef, useCallback } from 'react';

export function useCanvas(canvasRef, socket, tool, color, brushSize) {
  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  const currentStroke = useRef([]);
  const historyRef = useRef([]); // local undo stack of ImageData

  // Throttle helper
  function throttle(fn, delay) {
    let last = 0;
    return (...args) => {
      const now = Date.now();
      if (now - last >= delay) {
        last = now;
        fn(...args);
      }
    };
  }

  // Convert mouse/touch event to canvas-relative coordinates (scaled correctly)
  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  // Draw a single segment on the canvas
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

  // Draw a rectangle
  function drawRect(ctx, start, end, opts) {
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.brushSize;
    ctx.beginPath();
    ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    ctx.restore();
  }

  // Draw a circle
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

  // Replay full history from server
  const replayHistory = useCallback((history) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const event of history) {
      if (event.type === 'stroke') {
        const points = event.points;
        if (!points || points.length < 2) continue;
        const opts = { tool: event.tool, color: event.color, brushSize: event.brushSize };
        for (let i = 1; i < points.length; i++) {
          if (event.tool === 'rect') {
            drawRect(ctx, points[0], points[points.length - 1], opts);
          } else if (event.tool === 'circle') {
            drawCircle(ctx, points[0], points[points.length - 1], opts);
          } else {
            drawSegment(ctx, points[i - 1], points[i], opts);
          }
        }
      } else if (event.type === 'image') {
        const img = new Image();
        img.src = event.dataUrl;
        img.onload = () => {
          ctx.drawImage(img, event.x, event.y, event.w, event.h);
        };
      }
    }
  }, [canvasRef]);

  // ── Pointer events ──────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Save state for undo
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (historyRef.current.length > 50) historyRef.current.shift();

    isDrawing.current = true;
    const pos = getPos(e);
    lastPos.current = pos;
    currentStroke.current = [pos];

    socket?.emit('draw-start', { x: pos.x, y: pos.y, tool, color, brushSize });
  }, [socket, tool, color, brushSize]);

  const onPointerMove = useCallback(throttle((e) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);

    if (tool === 'brush' || tool === 'eraser') {
      drawSegment(ctx, lastPos.current, pos, { tool, color, brushSize });
    }

    currentStroke.current.push(pos);
    lastPos.current = pos;

    socket?.emit('draw-move', { x: pos.x, y: pos.y, tool, color, brushSize });

    // Cursor move (separate throttle)
    socket?.emit('cursor-move', { x: pos.x / canvas.width, y: pos.y / canvas.height });
  }, 16), [socket, tool, color, brushSize]);

  const onPointerUp = useCallback((e) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);

    // Finalize shape tools
    if (tool === 'rect' && currentStroke.current.length > 0) {
      const start = currentStroke.current[0];
      // Restore to before the shape and redraw cleanly
      const saved = historyRef.current[historyRef.current.length - 1];
      if (saved) ctx.putImageData(saved, 0, 0);
      drawRect(ctx, start, pos, { tool, color, brushSize });
    } else if (tool === 'circle' && currentStroke.current.length > 0) {
      const start = currentStroke.current[0];
      const saved = historyRef.current[historyRef.current.length - 1];
      if (saved) ctx.putImageData(saved, 0, 0);
      drawCircle(ctx, start, pos, { tool, color, brushSize });
    }

    currentStroke.current.push(pos);
    socket?.emit('draw-end', {
      points: currentStroke.current,
      tool, color, brushSize,
    });
    currentStroke.current = [];
  }, [socket, tool, color, brushSize]);

  // ── Undo ────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    const prev = historyRef.current.pop();
    ctx.putImageData(prev, 0, 0);
    socket?.emit('undo');
  }, [socket, canvasRef]);

  // ── Remote draw events ─────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const remoteState = {}; // per-user drawing state

    socket.on('canvas-history', replayHistory);

    socket.on('draw-start', ({ userId, x, y, tool, color, brushSize }) => {
      remoteState[userId] = { lastX: x, lastY: y, tool, color, brushSize };
    });

    socket.on('draw-move', ({ userId, x, y }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const s = remoteState[userId];
      if (!s) return;

      if (s.tool === 'brush' || s.tool === 'eraser') {
        drawSegment(ctx, { x: s.lastX, y: s.lastY }, { x, y }, s);
      }
      s.lastX = x;
      s.lastY = y;
    });

    socket.on('draw-end', ({ userId, points, tool, color, brushSize }) => {
      const canvas = canvasRef.current;
      if (!canvas || !points?.length) return;
      const ctx = canvas.getContext('2d');
      const opts = { tool, color, brushSize };

      if (tool === 'rect') {
        drawRect(ctx, points[0], points[points.length - 1], opts);
      } else if (tool === 'circle') {
        drawCircle(ctx, points[0], points[points.length - 1], opts);
      }
      delete remoteState[userId];
    });

    socket.on('clear-canvas', () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvasRef.current.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      historyRef.current = [];
    });

    socket.on('image-drop', ({ dataUrl, x, y, w, h }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => canvas.getContext('2d').drawImage(img, x, y, w, h);
    });

    return () => {
      socket.off('canvas-history');
      socket.off('draw-start');
      socket.off('draw-move');
      socket.off('draw-end');
      socket.off('clear-canvas');
      socket.off('image-drop');
    };
  }, [socket, replayHistory]);

  return { onPointerDown, onPointerMove, onPointerUp, undo };
}