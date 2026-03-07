import React from 'react';
import Icon from 'components/AppIcon';

export default function TabNav({ activeTab, onTabChange, unreadCount = 0 }) {
  const tabs = [
    { id: 'ads', label: 'Mis Avisos', icon: 'Tag', count: null },
    { id: 'businesses', label: 'Mis Negocios', icon: 'Building2', count: null },
    { id: 'messages', label: 'Mis Mensajes', icon: 'MessageSquare', count: unreadCount > 0 ? unreadCount : null },
    { id: 'settings', label: 'Configuración', icon: 'Settings', count: null },
  ];

  return (
    <div className="border-b border-border overflow-x-auto scrollbar-hide">
      <div className="flex gap-0 min-w-max">
        {tabs?.map((tab) => (
          <button
            key={tab?.id}
            onClick={() => onTabChange(tab?.id)}
            className={`flex items-center gap-2 px-4 md:px-6 py-3 text-sm font-caption font-medium border-b-2 transition-all duration-200 whitespace-nowrap min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
              ${activeTab === tab?.id
                ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            aria-selected={activeTab === tab?.id}
          >
            <Icon name={tab?.icon} size={16} color="currentColor" />
            {tab?.label}
            {tab?.count !== null && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-data ${
                  activeTab === tab?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {tab?.count > 99 ? '99+' : tab?.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}