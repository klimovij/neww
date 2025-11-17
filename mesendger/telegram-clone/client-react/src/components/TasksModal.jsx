import React from 'react';
import Tasks from './Tasks';

export default function TasksModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 375,
        width: 'calc(100vw - 358px - 20px)',
        height: '100vh',
        zIndex: 300000,
        background: 'transparent',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
          borderRadius: 28,
          width: 'min(94%, 1180px)',
          minWidth: '700px',
          maxWidth: '1180px',
          height: '93vh',
          marginTop: '12px',
          boxSizing: 'border-box',
          boxShadow: 'none',
          border: 'none',
          outline: 'none',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          color: '#e2e8f0',
          padding: '22px 24px 18px 24px',
          overflow: 'hidden'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            fontSize: 16,
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.18)',
            cursor: 'pointer',
            color: '#e2e8f0',
            fontWeight: 800,
            width: 36,
            height: 36,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.18s ease',
            boxShadow: '0 6px 18px rgba(2,6,23,0.45)',
            zIndex: 3
          }}
          aria-label="Close modal"
        >
          ✕
        </button>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingRight: 6 }}>
          <Tasks modal onClose={onClose} />
        </div>
      </div>
    </div>
  );
}