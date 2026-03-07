import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import { mapService } from '../../services/mapService';
import { communityService } from '../../services/communityService';
import MapSearchBar from './components/MapSearchBar';
import BusinessBottomSheet from './components/BusinessBottomSheet';
import EventBottomSheet from './components/EventBottomSheet';
import UpcomingEventsPanel from './components/UpcomingEventsPanel';
import { BusinessMarker, EventMarker, CommunityPostMarker } from './components/MapMarkers';
import { Link } from 'react-router-dom';

// Coronel, Chile coordinates
const CORONEL_CENTER = [-37.0298, -73.1429];
const DEFAULT_ZOOM = 14;

// Fix Leaflet default icon issue with bundlers
import L from 'leaflet';
delete L?.Icon?.Default?.prototype?._getIconUrl;
L?.Icon?.Default?.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component to fly map to coordinates
function MapFlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target?.lat && target?.lng) {
      map?.flyTo([target?.lat, target?.lng], 16, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

const SECTOR_COLORS = {
  Centro: { bg: '#dbeafe', color: '#1d4ed8' },
  Lagunillas: { bg: '#d1fae5', color: '#065f46' },
  Schwager: { bg: '#fef3c7', color: '#92400e' },
  Puchoco: { bg: '#f3e8ff', color: '#6b21a8' },
  'Las Higueras': { bg: '#fee2e2', color: '#991b1b' },
  'Punta de Parra': { bg: '#e0f2fe', color: '#0369a1' },
  Otro: { bg: '#f3f4f6', color: '#374151' },
};

function CommunityPostBottomSheet({ post, onClose }) {
  if (!post) return null;
  const sectorStyle = SECTOR_COLORS?.[post?.sector] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-center pt-2 pb-1 md:hidden">
        <div className="w-10 h-1 rounded-full" style={{ background: 'var(--color-border)' }} />
      </div>
      <div className="flex items-start justify-between px-4 pt-2 pb-3">
        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mb-2" style={{ background: sectorStyle?.bg, color: sectorStyle?.color }}>
            <Icon name="MapPin" size={11} color="currentColor" />
            {post?.sector}
          </span>
          <h3 className="font-heading font-bold text-foreground text-base leading-tight">{post?.title}</h3>
        </div>
        <button onClick={onClose} className="ml-2 p-1.5 rounded-full hover:bg-muted transition-colors shrink-0" aria-label="Cerrar">
          <Icon name="X" size={16} color="currentColor" />
        </button>
      </div>
      <div className="px-4 flex items-center gap-3 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1"><Icon name="MessageSquare" size={12} color="currentColor" /> Comunidad</span>
        <span className="flex items-center gap-1"><Icon name="ThumbsUp" size={12} color="currentColor" /> {post?.upvote_count || 0} votos</span>
      </div>
      <div className="px-4 pb-4">
        <Link
          to={`/comunidad/${post?.id}`}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted transition-colors text-foreground"
        >
          <Icon name="ExternalLink" size={15} color="currentColor" />
          Ver pregunta
        </Link>
      </div>
    </div>
  );
}

export default function InteractiveMapPage() {
  const [businesses, setBusinesses] = useState([]);
  const [events, setEvents] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showBusinesses, setShowBusinesses] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showCommunity, setShowCommunity] = useState(true);
  const [category, setCategory] = useState('all');
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const [upcomingPanelOpen, setUpcomingPanelOpen] = useState(true);
  const searchTimeout = useRef(null);

  const loadData = useCallback(async (searchVal, catVal) => {
    setLoading(true);
    try {
      const [bizResult, evResult, upResult, communityResult] = await Promise.all([
        mapService?.getBusinessesForMap({ search: searchVal, category: catVal }),
        mapService?.getEventsForMap({ search: searchVal, category: catVal }),
        mapService?.getUpcomingEvents(5),
        communityService?.getCommunityPostsForMap(),
      ]);
      setBusinesses(bizResult?.data || []);
      setEvents(evResult?.data || []);
      setUpcomingEvents(upResult?.data || []);
      setCommunityPosts(communityResult?.data || []);
    } catch (e) {
      console.error('Map load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData('', 'all');
  }, [loadData]);

  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(searchTimeout?.current);
    searchTimeout.current = setTimeout(() => {
      loadData(val, category);
    }, 400);
  };

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    loadData(search, cat);
  };

  const handleBusinessClick = (business) => {
    setSelectedBusiness(business);
    setSelectedEvent(null);
    setSelectedPost(null);
    setFlyTarget({ lat: business?.lat, lng: business?.lng });
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setSelectedBusiness(null);
    setSelectedPost(null);
    if (event?.resolvedLat && event?.resolvedLng) {
      setFlyTarget({ lat: event?.resolvedLat, lng: event?.resolvedLng });
    }
  };

  const handleUpcomingEventClick = (event) => {
    handleEventClick(event);
  };

  const handlePostClick = (post) => {
    setSelectedPost(post);
    setSelectedBusiness(null);
    setSelectedEvent(null);
    setFlyTarget({ lat: post?.lat, lng: post?.lng });
  };

  const handleCloseSheet = () => {
    setSelectedBusiness(null);
    setSelectedEvent(null);
    setSelectedPost(null);
  };

  const hasSelection = selectedBusiness || selectedEvent || selectedPost;

  return (
    <div className="flex flex-col" style={{ height: '100vh', background: 'var(--color-background)' }}>
      <Header />

      {/* Map Container */}
      <div className="relative flex-1" style={{ marginTop: '64px' }}>
        {/* Leaflet Map */}
        <MapContainer
          center={CORONEL_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Fly to target */}
          {flyTarget && <MapFlyTo target={flyTarget} />}

          {/* Business Markers */}
          {showBusinesses && businesses?.map(business => (
            <BusinessMarker
              key={business?.id}
              business={business}
              isSelected={selectedBusiness?.id === business?.id}
              onClick={handleBusinessClick}
            />
          ))}

          {/* Event Markers */}
          {showEvents && events?.map(event => (
            <EventMarker
              key={event?.id}
              event={event}
              isSelected={selectedEvent?.id === event?.id}
              onClick={handleEventClick}
            />
          ))}

          {/* Community Post Markers */}
          {showCommunity && communityPosts?.map(post => (
            <CommunityPostMarker
              key={post?.id}
              post={post}
              isSelected={selectedPost?.id === post?.id}
              onClick={handlePostClick}
            />
          ))}
        </MapContainer>

        {/* Sticky Search Bar (top overlay) */}
        <MapSearchBar
          search={search}
          onSearchChange={handleSearchChange}
          showBusinesses={showBusinesses}
          showEvents={showEvents}
          showCommunity={showCommunity}
          onToggleBusinesses={() => setShowBusinesses(v => !v)}
          onToggleEvents={() => setShowEvents(v => !v)}
          onToggleCommunity={() => setShowCommunity(v => !v)}
          category={category}
          onCategoryChange={handleCategoryChange}
        />

        {/* Loading indicator */}
        {loading && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-2 px-3 py-1.5 rounded-full shadow-md text-xs font-medium" style={{ background: 'var(--color-card)', color: 'var(--color-foreground)' }}>
            <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
            Cargando...
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 right-4 z-[400] bg-card border border-border rounded-lg shadow-md px-3 py-2 hidden md:block">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Leyenda</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: '#2563eb' }} />
              <span className="text-xs text-foreground">Negocios</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: '#ea580c' }} />
              <span className="text-xs text-foreground">Eventos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: '#7c3aed' }} />
              <span className="text-xs text-foreground">Comunidad</span>
            </div>
          </div>
        </div>

        {/* Upcoming Events Panel — bottom-left desktop, bottom drawer mobile */}
        <div className="absolute bottom-4 left-4 z-[400] hidden md:block">
          <UpcomingEventsPanel
            events={upcomingEvents}
            onEventClick={handleUpcomingEventClick}
            isOpen={upcomingPanelOpen}
            onToggle={() => setUpcomingPanelOpen(v => !v)}
          />
        </div>

        {/* Mobile: Upcoming Events as bottom drawer trigger */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 z-[400]">
          {/* Bottom Sheet for selected marker */}
          {hasSelection && (
            <div
              className="bg-card border-t border-border rounded-t-2xl shadow-2xl"
              style={{ maxHeight: '55vh', overflowY: 'auto' }}
            >
              {selectedBusiness && (
                <BusinessBottomSheet business={selectedBusiness} onClose={handleCloseSheet} />
              )}
              {selectedEvent && (
                <EventBottomSheet event={selectedEvent} onClose={handleCloseSheet} />
              )}
              {selectedPost && (
                <CommunityPostBottomSheet post={selectedPost} onClose={handleCloseSheet} />
              )}
            </div>
          )}

          {/* Upcoming events mini bar (mobile) */}
          {!hasSelection && (
            <div className="mx-3 mb-3">
              <UpcomingEventsPanel
                events={upcomingEvents}
                onEventClick={handleUpcomingEventClick}
                isOpen={upcomingPanelOpen}
                onToggle={() => setUpcomingPanelOpen(v => !v)}
              />
            </div>
          )}
        </div>

        {/* Desktop: Sidebar card for selected marker */}
        {hasSelection && (
          <div
            className="absolute top-20 right-4 z-[400] bg-card border border-border rounded-xl shadow-xl hidden md:block"
            style={{ width: '300px', maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}
          >
            {selectedBusiness && (
              <BusinessBottomSheet business={selectedBusiness} onClose={handleCloseSheet} />
            )}
            {selectedEvent && (
              <EventBottomSheet event={selectedEvent} onClose={handleCloseSheet} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
