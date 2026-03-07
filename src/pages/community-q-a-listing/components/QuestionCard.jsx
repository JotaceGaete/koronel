import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { communityService } from '../../../services/communityService';

const SECTOR_COLORS = {
  'Centro': { bg: '#dbeafe', color: '#1d4ed8' },
  'Lagunillas': { bg: '#dcfce7', color: '#15803d' },
  'Schwager': { bg: '#fef3c7', color: '#b45309' },
  'Puchoco': { bg: '#fce7f3', color: '#be185d' },
  'Las Higueras': { bg: '#ede9fe', color: '#7c3aed' },
  'Punta de Parra': { bg: '#ffedd5', color: '#c2410c' },
  'Otro': { bg: '#f1f5f9', color: '#475569' },
};

export default function QuestionCard({ post, coverImage }) {
  const sectorStyle = SECTOR_COLORS?.[post?.sector] || SECTOR_COLORS?.['Otro'];
  const authorName = post?.user?.full_name || 'Usuario';
  const initials = authorName?.split(' ')?.map(n => n?.[0])?.slice(0, 2)?.join('')?.toUpperCase();

  return (
    <Link to={`/comunidad/${post?.id}`} className="block group">
      <div className="bg-card border border-border rounded-xl hover:shadow-md hover:border-primary/30 transition-all duration-200 h-full flex flex-col overflow-hidden">
        {/* Cover image */}
        {coverImage && (
          <div className="w-full h-36 overflow-hidden flex-shrink-0">
            <img
              src={coverImage}
              alt={`Imagen de la pregunta: ${post?.title}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        <div className="p-5 flex flex-col flex-1">
          {/* Sector Badge */}
          <div className="flex items-center justify-between mb-3">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: sectorStyle?.bg, color: sectorStyle?.color }}
            >
              <Icon name="MapPin" size={11} color="currentColor" className="mr-1" />
              {post?.sector}
            </span>
            {post?.lat && post?.lng && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Icon name="Navigation" size={11} color="currentColor" />
                Con ubicación
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-heading font-semibold text-foreground text-base leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {post?.title}
          </h3>

          {/* Body snippet */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
            {post?.body}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            {/* Author */}
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: 'var(--color-primary)' }}
              >
                {post?.user?.avatar_url ? (
                  <img src={post?.user?.avatar_url} alt={authorName} className="w-full h-full rounded-full object-cover" />
                ) : initials}
              </div>
              <div>
                <p className="text-xs font-medium text-foreground leading-none">{authorName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{communityService?.formatRelativeDate(post?.created_at)}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Icon name="MessageCircle" size={13} color="currentColor" />
                {post?.replyCount || 0}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Icon name="ThumbsUp" size={13} color="currentColor" />
                {post?.upvote_count || 0}
              </span>
              {coverImage && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon name="Image" size={11} color="currentColor" />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
