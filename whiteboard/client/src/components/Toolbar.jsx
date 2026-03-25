import React from 'react';

const TOOLS = [
  { id: 'brush', icon: '✏️', label: 'Brush' },
  { id: 'eraser', icon: '⬜', label: 'Eraser' },
  { id: 'rect', icon: '▭', label: 'Rectangle' },
  { id: 'circle', icon: '○', label: 'Circle' },
];

const COLORS = [
  '#ffffff', '#000000', '#FF6B6B', '#FF9F43',
  '#FFEAA7', '#A8E6CF', '#4ECDC4', '#45B7D1',
  '#7c6af5', '#DDA0DD',
];

const SIZES = [2, 5, 10, 20];

export default function Toolbar({
  tool, setTool,
  color, setColor,
  brushSize, setBrushSize,
  onUndo, onClear, onImageUpload,
}) {
  return (
    <div style={styles.bar}>
      {/* Tools */}
      <section style={styles.section}>
        <span style={styles.sectionLabel}>TOOL</span>
        <div style={styles.row}>
          {TOOLS.map(t => (
            <button
              key={t.id}
              title={t.label}
              style={{ ...styles.toolBtn, ...(tool === t.id ? styles.toolActive : {}) }}
              onClick={() => setTool(t.id)}
            >
              {t.icon}
            </button>
          ))}
        </div>
      </section>

      <div style={styles.divider} />

      {/* Color palette */}
      <section style={styles.section}>
        <span style={styles.sectionLabel}>COLOR</span>
        <div style={styles.colorGrid}>
          {COLORS.map(c => (
            <button
              key={c}
              style={{
                ...styles.colorBtn,
                background: c,
                boxShadow: color === c ? `0 0 0 2px var(--accent), 0 0 0 4px ${c}` : 'none',
              }}
              onClick={() => setColor(c)}
            />
          ))}
          {/* Custom color input */}
          <label style={styles.customColor} title="Custom color">
            <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ opacity: 0, width: 0, height: 0 }} />
            🎨
          </label>
        </div>
      </section>

      <div style={styles.divider} />

      {/* Brush size */}
      <section style={styles.section}>
        <span style={styles.sectionLabel}>SIZE</span>
        <div style={styles.row}>
          {SIZES.map(s => (
            <button
              key={s}
              style={{ ...styles.sizeBtn, ...(brushSize === s ? styles.toolActive : {}) }}
              onClick={() => setBrushSize(s)}
            >
              <div style={{
                width: Math.min(s * 1.5, 20),
                height: Math.min(s * 1.5, 20),
                borderRadius: '50%',
                background: 'var(--text)',
                margin: 'auto',
              }} />
            </button>
          ))}
        </div>
      </section>

      <div style={styles.divider} />

      {/* Actions */}
      <section style={styles.section}>
        <span style={styles.sectionLabel}>ACTIONS</span>
        <div style={styles.col}>
          <button style={styles.actionBtn} onClick={onUndo} title="Undo (Ctrl+Z)">↩ Undo</button>
          <button style={{ ...styles.actionBtn, ...styles.dangerBtn }} onClick={onClear} title="Clear canvas">✕ Clear</button>
          <label style={{ ...styles.actionBtn, ...styles.uploadBtn, cursor: 'pointer' }} title="Drop image">
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onImageUpload} />
            ↑ Image
          </label>
        </div>
      </section>
    </div>
  );
}

const styles = {
  bar: {
    width: '72px',
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 0',
    gap: '4px',
    overflowY: 'auto',
    flexShrink: 0,
  },
  section: {
    width: '100%',
    padding: '8px 8px 4px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  sectionLabel: {
    fontSize: '8px',
    fontWeight: '600',
    letterSpacing: '0.1em',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    justifyContent: 'center',
  },
  col: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    width: '100%',
  },
  divider: {
    width: '40px',
    height: '1px',
    background: 'var(--border)',
    margin: '4px 0',
  },
  toolBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    background: 'transparent',
    color: 'var(--text)',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.1s',
  },
  toolActive: {
    background: 'var(--accent)',
    boxShadow: '0 0 12px var(--accent-glow)',
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '4px',
  },
  colorBtn: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.1)',
    transition: 'transform 0.1s, box-shadow 0.1s',
    cursor: 'pointer',
  },
  customColor: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    cursor: 'pointer',
  },
  sizeBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    width: '100%',
    padding: '6px 4px',
    borderRadius: '6px',
    background: 'var(--surface2)',
    color: 'var(--text)',
    fontSize: '10px',
    fontWeight: '600',
    fontFamily: 'var(--font-mono)',
    border: '1px solid var(--border)',
    textAlign: 'center',
    transition: 'background 0.1s',
    display: 'block',
  },
  dangerBtn: {
    color: 'var(--danger)',
    borderColor: 'rgba(255,71,87,0.3)',
  },
  uploadBtn: {
    color: 'var(--accent)',
    borderColor: 'rgba(124,106,245,0.3)',
  },
};