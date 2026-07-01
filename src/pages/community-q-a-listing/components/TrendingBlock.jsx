import React, { useState, useEffect } from 'react';
import { communityService } from '../../../services/communityService';
import QuestionRow from './QuestionRow';

function TrendingSection({ icon, title, posts, loading }) {
  if (!loading && !posts?.length) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border" style={{ background: 'var(--color-muted)' }}>
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{title}</span>
      </div>
      {loading ? (
        <div className="divide-y divide-border">
          {[1, 2, 3].map(i => (
            <div key={i} className="px-4 py-3 animate-pulse" style={{ minHeight: '56px' }}>
              <div className="h-3.5 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div>
          {posts.map(post => (
            <QuestionRow key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TrendingBlock({ sector }) {
  const [hot, setHot] = useState([]);
  const [unanswered, setUnanswered] = useState([]);
  const [best, setBest] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      communityService.getPosts({ sector, sort: 'votes', page: 1, pageSize: 3 }),
      communityService.getPosts({ sector, sort: 'unanswered', page: 1, pageSize: 3 }),
      communityService.getPosts({ sector, sort: 'replies', page: 1, pageSize: 3 }),
    ]).then(([hotRes, unRes, bestRes]) => {
      if (cancelled) return;
      setHot(hotRes.data || []);
      setUnanswered(unRes.data || []);
      setBest(bestRes.data || []);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [sector]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <TrendingSection icon="🔥" title="Más votadas" posts={hot} loading={loading} />
      <TrendingSection icon="❓" title="Sin responder" posts={unanswered} loading={loading} />
      <TrendingSection icon="⭐" title="Mejor respondidas" posts={best} loading={loading} />
    </div>
  );
}
