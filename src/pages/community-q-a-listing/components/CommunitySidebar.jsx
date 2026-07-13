import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { communityService } from '../../../services/communityService';
import { formatRelativeTime } from 'utils/relativeTime';

function SidebarSection({ icon, iconColor, title, children, loading, empty }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon name={icon} size={15} color={iconColor} />
        <h3 className="font-heading font-semibold text-sm text-foreground">{title}</h3>
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 })?.map((_, i) => (
            <div key={i} className="h-3.5 bg-muted rounded animate-pulse" style={{ width: `${70 - i * 12}%` }} />
          ))}
        </div>
      ) : empty ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        children
      )}
    </div>
  );
}

function PostLink({ post }) {
  return (
    <Link
      to={`/comunidad/${post?.id}`}
      className="block text-xs text-foreground hover:text-primary transition-colors leading-snug line-clamp-2 py-1.5 border-b border-border last:border-b-0"
    >
      {post?.title}
    </Link>
  );
}

export default function CommunitySidebar({ onSearchWord }) {
  const [popular, setPopular] = useState(null);
  const [unanswered, setUnanswered] = useState(null);
  const [members, setMembers] = useState(null);
  const [trending, setTrending] = useState(null);

  useEffect(() => {
    let cancelled = false;
    communityService?.getPosts({ sort: 'votes', page: 1, pageSize: 5 })?.then(({ data }) => {
      if (!cancelled) setPopular(data || []);
    });
    communityService?.getPosts({ sort: 'unanswered', page: 1, pageSize: 5 })?.then(({ data }) => {
      if (!cancelled) setUnanswered(data || []);
    });
    communityService?.getActiveMembers({ days: 30, limit: 5 })?.then(({ data }) => {
      if (!cancelled) setMembers(data || []);
    });
    communityService?.getTrendingWords({ days: 7, limit: 8 })?.then(({ data }) => {
      if (!cancelled) setTrending(data || []);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <aside className="flex flex-col gap-4">
      <SidebarSection
        icon="Flame"
        iconColor="var(--color-accent)"
        title="Tendencias esta semana"
        loading={trending === null}
        empty={trending?.length === 0 ? 'Todavía no hay suficiente actividad para detectar tendencias.' : null}
      >
        <div className="flex flex-wrap gap-1.5">
          {trending?.map(t => (
            <button
              key={t?.word}
              onClick={() => onSearchWord?.(t?.word)}
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-primary hover:text-white transition-colors"
            >
              {t?.word}
            </button>
          ))}
        </div>
      </SidebarSection>

      <SidebarSection
        icon="TrendingUp"
        iconColor="var(--color-primary)"
        title="Populares"
        loading={popular === null}
        empty={popular?.length === 0 ? 'Aún no hay preguntas populares.' : null}
      >
        <div>{popular?.map(p => <PostLink key={p?.id} post={p} />)}</div>
      </SidebarSection>

      <SidebarSection
        icon="MessageSquareDashed"
        iconColor="var(--color-warning)"
        title="Sin responder"
        loading={unanswered === null}
        empty={unanswered?.length === 0 ? '¡Todo respondido! No hay preguntas pendientes.' : null}
      >
        <div>{unanswered?.map(p => <PostLink key={p?.id} post={p} />)}</div>
      </SidebarSection>

      <SidebarSection
        icon="Users"
        iconColor="var(--color-success)"
        title="Miembros activos"
        loading={members === null}
        empty={members?.length === 0 ? 'Sin actividad reciente.' : null}
      >
        <div className="space-y-2.5">
          {members?.map(m => (
            <div key={m?.id} className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
                style={{ background: 'var(--color-primary)' }}
              >
                {m?.avatar_url ? (
                  <img src={m?.avatar_url} alt={m?.full_name} className="w-full h-full object-cover" />
                ) : (
                  m?.full_name?.charAt(0)?.toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">{m?.full_name}</p>
                <p className="text-[10px] text-muted-foreground">{m?.activity_count} aportes este mes</p>
              </div>
            </div>
          ))}
        </div>
      </SidebarSection>
    </aside>
  );
}
