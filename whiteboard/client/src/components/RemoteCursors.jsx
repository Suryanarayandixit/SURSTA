import React, { useEffect, useState } from 'react';

export default function RemoteCursors({ socket, canvasRef, myId }) {
  const [cursors, setCursors] = useState({});

  useEffect(() => {
    if (!socket) return;

    socket.on('cursor-update', ({ id, name, color, x, y }) => {
      if (id === myId) return;
      setCursors(prev => ({ ...prev, [id]: { name, color, x, y } }));
    });

    socket.on('user-left', (id) => {
      setCursors(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });

    return () => {
      socket.off('cursor-update');
      socket.off('user-left');
    };
  }, [socket, myId]);

  const canvas = canvasRef.current;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();

  return (
    <div style={styles.overlay} aria-hidden>
      {Object.entries(cursors).map(([id, { name, color, x, y }]) => {
        // x,y are normalized (0-1), map to screen coords
        const screenX = x * rect.width + rect.left;
        const screenY = y * rect.height + rect.top;
        return (
          <div key={id} style={{ ...styles.cursor, left: screenX, top: screenY }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2L2 13L5.5 9.5L8 14L10 13L7.5 8.5L12 8.5L2 2Z" fill={color} stroke="white" strokeWidth="1" />
            </svg>
            <span style={{ ...styles.label, background: color }}>{name}</span>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 100,
  },
  cursor: {
    position: 'fixed',
    transform: 'translate(-2px, -2px)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '4px',
    pointerEvents: 'none',
  },
  label: {
    fontSize: '10px',
    fontWeight: '700',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
    marginTop: '12px',
    fontFamily: 'var(--font-mono)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
  },
};