import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';

const SECTOR_COLORS = {
  'Centro': { bg: '#dbeafe', color: '#1d4ed8' },
  'Lagunillas': { bg: '#dcfce7', color: '#15803d' },
  'Schwager': { bg: '#fef3c7', color: '#b45309' },
  'Puchoco': { bg: '#fce7f3', color: '#be185d' },
  'Las Higueras': { bg: '#ede9fe', color: '#7c3aed' },
  'Punta de Parra': { bg: '#ffedd5', color: '#c2410c' },
  'Otro': { bg: '#f1f5f9', color: '#475569' },
};

export default function CommunityPostBottomSheet({ post, onClose }) {
  const sectorStyle = SECTOR_COLORS?.[post?.sector] || SECTOR_COLORS?.['Otro'];

  return (
    <div className="p-4">
      {/* Handle bar */}
      <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4 md:hidden" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#7c3aed' }}
          >
            <Icon name="MessageCircle" size={18} color="white" />
          </div>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: sectorStyle?.bg, color: sectorStyle?.color }}
          >
            {post?.sector}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-muted transition-colors flex-shrink-0"
        >
          <Icon name="X" size={16} color="var(--color-muted-foreground)" />
        </button>
      </div>

      {/* Title */}
      <h3 className="font-heading font-semibold text-foreground text-base leading-snug mb-2">
        {post?.title}
      </h3>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-4">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Icon name="ThumbsUp" size={12} color="currentColor" />
          {post?.upvote_count || 0} votos
        </span>
      </div>

      {/* Action */}
      <Link
        to={`/comunidad/${post?.id}`}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
        style={{ background: '#7c3aed' }}
      >
        <Icon name="MessageCircle" size={15} color="white" />
        Ver pregunta
      </Link>
    </div>
  );
}
