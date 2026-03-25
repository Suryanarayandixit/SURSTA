import React, { useState } from 'react';

export default function Header({ roomId, users, connected, myId }) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <header style={styles.header}>
      {/* Logo */}
      <div style={styles.logo}>
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="#7c6af5" />
          <path d="M8 22 L14 10 L20 18 L24 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <circle cx="24" cy="14" r="2" fill="#f5a623"/>
        </svg>
        <span style={styles.logoText}>SURSTA</span>
      </div>

      {/* Room ID */}
      <div style={styles.roomTag}>
        <span style={styles.roomLabel}>ROOM</span>
        <span style={styles.roomId}>{roomId}</span>
      </div>

      {/* Online users */}
      <div style={styles.users}>
        {users.slice(0, 6).map(u => (
          <div
            key={u.id}
            title={u.name + (u.id === myId ? ' (you)' : '')}
            style={{
              ...styles.avatar,
              background: u.color,
              boxShadow: u.id === myId ? `0 0 0 2px var(--bg), 0 0 0 4px var(--accent)` : 'none',
              opacity: u.id === myId ? 1 : 0.85,
            }}
          >
            {u.name[0].toUpperCase()}
          </div>
        ))}
        {users.length > 6 && (
          <div style={{ ...styles.avatar, background: 'var(--surface2)' }}>+{users.length - 6}</div>
        )}
      </div>

      {/* Status + Copy */}
      <div style={styles.right}>
        <div style={styles.status}>
          <div style={{ ...styles.dot, background: connected ? 'var(--success)' : 'var(--danger)' }} />
          <span style={styles.statusText}>{connected ? 'Live' : 'Offline'}</span>
        </div>
        <button style={styles.copyBtn} onClick={copyLink}>
          {copied ? '✓ Copied!' : '⎘ Share'}
        </button>
      </div>
    </header>
  );
}

const styles = {
  header: {
    height: '52px',
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    gap: '16px',
    flexShrink: 0,
    zIndex: 10,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoText: {
    fontWeight: '800',
    fontSize: '15px',
    letterSpacing: '-0.3px',
  },
  roomTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '4px 10px',
  },
  roomLabel: {
    fontSize: '9px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  roomId: {
    fontSize: '12px',
    color: 'var(--accent)',
    fontFamily: 'var(--font-mono)',
    fontWeight: '500',
  },
  users: {
    display: 'flex',
    gap: '-4px',
    marginLeft: 'auto',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: '700',
    color: 'white',
    border: '2px solid var(--surface)',
    marginLeft: '-4px',
    cursor: 'default',
    fontFamily: 'var(--font-mono)',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  dot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  copyBtn: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '5px 12px',
    color: 'var(--text)',
    fontSize: '12px',
    fontWeight: '600',
    fontFamily: 'var(--font-mono)',
    transition: 'all 0.15s',
  },
};