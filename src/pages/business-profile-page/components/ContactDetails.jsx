import React from 'react';
import Icon from 'components/AppIcon';

const SOCIAL_ICON_MAP = {
  Facebook: 'Facebook',
  Instagram: 'Instagram',
  TikTok: 'Music2',
  YouTube: 'Youtube',
  'X (Twitter)': 'Twitter',
  WhatsApp: 'MessageCircle',
  Otra: 'Link',
};

export default function ContactDetails({ phone, whatsapp, email, website, address, socialLinks }) {
  const items = [
    phone && { icon: 'Phone', label: 'Teléfono', value: phone, href: `tel:${phone}` },
    whatsapp && { icon: 'MessageCircle', label: 'WhatsApp', value: whatsapp, href: `https://wa.me/${whatsapp?.replace(/\D/g, '')}` },
    email && { icon: 'Mail', label: 'Email', value: email, href: `mailto:${email}` },
    website && { icon: 'Globe', label: 'Sitio web', value: website, href: website?.startsWith('http') ? website : `https://${website}` },
    address && { icon: 'MapPin', label: 'Dirección', value: address, href: null },
  ]?.filter(Boolean);

  const validSocials = Array.isArray(socialLinks) ? socialLinks?.filter(s => s?.url?.trim()) : [];

  return (
    <div className="bg-card border border-border rounded-lg p-4 md:p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="Contact" size={18} color="var(--color-primary)" />
        <h3 className="font-heading font-semibold text-base text-foreground">Contacto</h3>
      </div>
      <div className="space-y-3">
        {items?.map(({ icon, label, value, href }) => (
          <div key={label} className="flex items-start gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-md bg-muted shrink-0">
              <Icon name={icon} size={16} color="var(--color-primary)" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-caption text-muted-foreground">{label}</p>
              {href ? (
                <a href={href} target={href?.startsWith('http') ? '_blank' : undefined}
                  rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="text-sm font-caption text-primary hover:underline truncate block">
                  {value}
                </a>
              ) : (
                <p className="text-sm font-caption text-foreground">{value}</p>
              )}
            </div>
          </div>
        ))}

        {/* Social links */}
        {validSocials?.length > 0 && (
          <div>
            <p className="text-xs font-caption text-muted-foreground mb-2">Redes sociales</p>
            <div className="flex flex-wrap gap-2">
              {validSocials?.map((s, i) => {
                const iconName = SOCIAL_ICON_MAP?.[s?.type] || 'Link';
                const href = s?.type === 'WhatsApp' && !s?.url?.startsWith('http')
                  ? `https://wa.me/${s?.url?.replace(/\D/g, '')}`
                  : s?.url;
                return (
                  <a key={i} href={href} target="_blank" rel="noopener noreferrer"
                    title={s?.type}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted hover:border-primary transition-colors text-foreground">
                    <Icon name={iconName} size={14} color="var(--color-primary)" />
                    {s?.type}
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}