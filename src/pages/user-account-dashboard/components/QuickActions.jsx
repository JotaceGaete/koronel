import React from 'react';
import { Link } from 'react-router-dom';
import Button from 'components/ui/Button';

export default function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link to="/post-classified-ad">
        <Button variant="default" iconName="Plus" iconPosition="left" iconSize={16}>
          Publicar Aviso
        </Button>
      </Link>
      <Link to="/business-profile-page">
        <Button variant="outline" iconName="Building2" iconPosition="left" iconSize={16}>
          Reclamar Negocio
        </Button>
      </Link>
    </div>
  );
}