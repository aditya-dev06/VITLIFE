import React from 'react';

/**
 * Pixel-Perfect Skeleton Loaders matching exact card dimensions & visual hierarchy.
 */

export function FacultyCardSkeleton() {
  return (
    <div className="faculty-card skeleton-card">
      <div className="card-top-row">
        <div className="skeleton-box skeleton-avatar" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div className="skeleton-box skeleton-line" style={{ width: '70%', height: '15px' }} />
          <div className="skeleton-box skeleton-line" style={{ width: '45%', height: '12px' }} />
        </div>
      </div>
      <div className="card-details-list" style={{ marginTop: '0.75rem', gap: '0.4rem' }}>
        <div className="skeleton-box skeleton-badge" style={{ width: '100%', height: '22px' }} />
        <div className="skeleton-box skeleton-badge" style={{ width: '85%', height: '20px' }} />
      </div>
      <div className="card-action-bar" style={{ marginTop: '0.75rem', gap: '0.4rem' }}>
        <div className="skeleton-box skeleton-btn" style={{ flex: 1, height: '28px' }} />
        <div className="skeleton-box skeleton-btn" style={{ flex: 1, height: '28px' }} />
      </div>
    </div>
  );
}

export function ContentCardSkeleton() {
  return (
    <div className="skeleton-card" style={{
      background: 'hsla(var(--bg-card) / 0.55)',
      border: '1px solid hsla(var(--border-glass))',
      borderRadius: '16px',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton-box skeleton-badge" style={{ width: '90px', height: '20px' }} />
        <div className="skeleton-box skeleton-badge" style={{ width: '60px', height: '18px' }} />
      </div>
      <div className="skeleton-box skeleton-line" style={{ width: '80%', height: '18px' }} />
      <div className="skeleton-box skeleton-line" style={{ width: '60%', height: '14px' }} />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
        <div className="skeleton-box skeleton-line" style={{ width: '40%', height: '14px' }} />
        <div className="skeleton-box skeleton-line" style={{ width: '30%', height: '14px' }} />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6, SkeletonComponent = ContentCardSkeleton, gridClass = "faculty-grid" }) {
  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonComponent key={`skeleton-${idx}`} />
      ))}
    </div>
  );
}

export default SkeletonGrid;
