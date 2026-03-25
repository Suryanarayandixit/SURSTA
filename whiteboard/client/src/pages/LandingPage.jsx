import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const adjectives = ['swift','bold','calm','wild','dark','neon','void','gold','iron','luna'];
const nouns = ['canvas','brush','pixel','stroke','layer','draft','chalk','board','mark','line'];

function randomRoomId() {
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const b = nouns[Math.floor(Math.random() * nouns.length)];
  const n = Math.floor(Math.random() * 900) + 100;
  return `${a}-${b}-${n}`;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [tab, setTab] = useState('create'); // 'create' | 'join'
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');

  function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Enter your name first'); return; }
    const roomId = randomRoomId();
    sessionStorage.setItem('wb-username', name.trim());
    sessionStorage.setItem('wb-password',password);
    navigate(`/draw/${roomId}`);
  }

  function handleJoin(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Enter your name first'); return; }
    if (!roomCode.trim()) { setError('Enter a room code'); return; }
    sessionStorage.setItem('wb-username', name.trim());
    sessionStorage.setItem('wb-password',password);
    navigate(`/draw/${roomCode.trim().toLowerCase()}`);
  }

  return (
    <div style={styles.page}>
      {/* Background grid */}
      <div style={styles.grid} />

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#7c6af5" />
            <path d="M8 22 L14 10 L20 18 L24 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <circle cx="24" cy="14" r="2" fill="#f5a623"/>
          </svg>
          <span style={styles.logoText}>SURSTA</span>
        </div>

        <h1 style={styles.headline}>Draw together,<br />in real time.</h1>
        <p style={styles.sub}>Create a room or join one. Share the link. Start drawing.</p>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(tab === 'create' ? styles.tabActive : {}) }}
            onClick={() => { setTab('create'); setError(''); }}
          >
            New Room
          </button>
          <button
            style={{ ...styles.tab, ...(tab === 'join' ? styles.tabActive : {}) }}
            onClick={() => { setTab('join'); setError(''); }}
          >
            Join Room
          </button>
        </div>

        {/* Name field (shared) */}
        <div style={styles.field}>
          <label style={styles.label}>Your Name</label>
          <input
            style={styles.input}
            placeholder="e.g. Surya"
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            maxLength={24}
          />
        </div>
        {/* Password field (shared) */}
        <div style={styles.field}>
        <label style={styles.label}>Room Password (Optional)</label>
        <input 
        type="password" 
        placeholder="Enter secret password..." 
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={styles.input}
        />
       </div>

        {tab === 'join' && (
          <div style={styles.field}>
            <label style={styles.label}>Room Code</label>
            <input
              style={styles.input}
              placeholder="e.g. swift-canvas-412"
              value={roomCode}
              onChange={e => { setRoomCode(e.target.value); setError(''); }}
            />
          </div>
        )}

        {error && <p style={styles.error}>{error}</p>}

        <button
          style={styles.btn}
          onClick={tab === 'create' ? handleCreate : handleJoin}
          onMouseEnter={e => e.target.style.background = '#9580ff'}
          onMouseLeave={e => e.target.style.background = '#7c6af5'}
        >
          {tab === 'create' ? '✦ Create Room' : '→ Join Room'}
        </button>

        <p style={styles.hint}>
          No account needed. Rooms stay alive for 10 minutes after everyone leaves.
        </p>
      </div>

      {/* Feature pills */}
      <div style={styles.pills}>
        {['Multi-user cursors', 'Brush · Eraser · Shapes', 'Undo / Redo', 'Image upload', 'Unique room URLs'].map(f => (
          <span key={f} style={styles.pill}>{f}</span>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    padding: '24px',
    position: 'relative',
    gap: '24px',
  },
  grid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(124,106,245,0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(124,106,245,0.06) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '440px',
    position: 'relative',
    boxShadow: '0 0 80px rgba(124,106,245,0.08)',
    zIndex: 1,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '28px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: '800',
    letterSpacing: '-0.5px',
    color: 'var(--text)',
  },
  headline: {
    fontSize: '32px',
    fontWeight: '800',
    lineHeight: 1.15,
    letterSpacing: '-1px',
    marginBottom: '10px',
    color: 'var(--text)',
  },
  sub: {
    color: 'var(--text-muted)',
    fontSize: '14px',
    lineHeight: 1.6,
    marginBottom: '28px',
    fontFamily: 'var(--font-mono)',
  },
  tabs: {
    display: 'flex',
    background: 'var(--bg)',
    borderRadius: 'var(--radius)',
    padding: '4px',
    marginBottom: '20px',
    border: '1px solid var(--border)',
  },
  tab: {
    flex: 1,
    padding: '8px',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '13px',
    fontWeight: '600',
    borderRadius: '6px',
    transition: 'all 0.15s',
    fontFamily: 'var(--font-display)',
  },
  tabActive: {
    background: 'var(--surface2)',
    color: 'var(--text)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: '6px',
    fontFamily: 'var(--font-mono)',
  },
  input: {
    width: '100%',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '10px 14px',
    color: 'var(--text)',
    fontSize: '14px',
    fontFamily: 'var(--font-mono)',
    transition: 'border-color 0.15s',
  },
  error: {
    color: 'var(--danger)',
    fontSize: '13px',
    marginBottom: '12px',
    fontFamily: 'var(--font-mono)',
  },
  btn: {
    width: '100%',
    padding: '13px',
    background: 'var(--accent)',
    color: 'white',
    fontWeight: '700',
    fontSize: '15px',
    borderRadius: 'var(--radius)',
    marginTop: '4px',
    transition: 'background 0.15s',
    letterSpacing: '-0.2px',
    fontFamily: 'var(--font-display)',
  },
  hint: {
    marginTop: '16px',
    fontSize: '11px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    fontFamily: 'var(--font-mono)',
    lineHeight: 1.5,
  },
  pills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
    zIndex: 1,
  },
  pill: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '100px',
    padding: '5px 14px',
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
};