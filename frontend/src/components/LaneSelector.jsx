import React from 'react';

/**
 * LaneSelector — Horizontal scrollable pill buttons for selecting lane type.
 * @param {Object} props
 * @param {string} props.selectedLane
 * @param {Function} props.onLaneChange
 */
export default function LaneSelector({ selectedLane, onLaneChange }) {
  const lanes = [
    { value: 'standard', label: 'General' },
    { value: 'ready', label: 'Ready' },
    { value: 'sentri', label: 'SENTRI' },
    { value: 'pedestrian', label: 'Pedestrian' }
  ];

  return (
    <div style={{
      display: 'flex',
      gap: '0.5rem',
      overflowX: 'auto',
      paddingBottom: '0.5rem',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      WebkitOverflowScrolling: 'touch',
      width: '100%',
      marginBottom: '1rem'
    }}>
      {lanes.map((lane) => {
        const isActive = selectedLane === lane.value;
        return (
          <button
            key={lane.value}
            onClick={() => onLaneChange(lane.value)}
            style={{
              flexShrink: 0,
              padding: '0.5rem 1.25rem',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
              background: isActive ? 'var(--color-primary)' : 'var(--color-surface-2)',
              color: isActive ? '#fff' : 'var(--color-text-muted)',
              fontSize: '0.85rem',
              fontWeight: isActive ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none',
              boxShadow: isActive ? '0 2px 8px rgba(0, 115, 230, 0.2)' : 'none'
            }}
          >
            {lane.label}
          </button>
        );
      })}
    </div>
  );
}
