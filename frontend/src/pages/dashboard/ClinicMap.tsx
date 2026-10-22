import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import DashboardLayout from '../../components/DashboardLayout';
import {
    Eye, Store, User, X, Search, Navigation2,
    MapPin, Phone, LayoutGrid, ExternalLink,
    ChevronUp, ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toTitleCase, toSentenceCase, formatName } from '../../utils/textFormatters';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface Branch {
    id: number;
    name: string;
    is_main: boolean;
    phone: string;
    address_line1: string;
    address_line2: string;
    lat?: number;
    lng?: number;
}

interface Clinic {
    id: number;
    name: string;
    address_line1: string;
    address_line2: string;
    zip: string;
    phone: string;
    lat?: number;
    lng?: number;
    branches: Branch[];
}

const calculateDist = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    if (!lat1 || !lng1 || !lat2 || !lng2) return '...';
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    if (d < 1) return `${Math.round(d * 1000)}m`;
    return `${d.toFixed(1)}km`;
};

// Clean Map Styles: turns OFF all non-Hi-Vet POIs, commercial businesses, transit stations & labels
// Keeps roads, road labels, locality/barangay names, water, and green land areas visible.
const cleanMapStyles: google.maps.MapTypeStyle[] = [
    {
        featureType: 'poi',
        elementType: 'all',
        stylers: [{ visibility: 'off' }]
    },
    {
        featureType: 'poi.business',
        elementType: 'all',
        stylers: [{ visibility: 'off' }]
    },
    {
        featureType: 'poi.attraction',
        elementType: 'all',
        stylers: [{ visibility: 'off' }]
    },
    {
        featureType: 'poi.government',
        elementType: 'all',
        stylers: [{ visibility: 'off' }]
    },
    {
        featureType: 'poi.medical',
        elementType: 'all',
        stylers: [{ visibility: 'off' }]
    },
    {
        featureType: 'poi.park',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
    },
    {
        featureType: 'poi.place_of_worship',
        elementType: 'all',
        stylers: [{ visibility: 'off' }]
    },
    {
        featureType: 'poi.school',
        elementType: 'all',
        stylers: [{ visibility: 'off' }]
    },
    {
        featureType: 'poi.sports_complex',
        elementType: 'all',
        stylers: [{ visibility: 'off' }]
    },
    {
        featureType: 'transit',
        elementType: 'all',
        stylers: [{ visibility: 'off' }]
    },
    {
        featureType: 'transit.station',
        elementType: 'all',
        stylers: [{ visibility: 'off' }]
    },
    {
        featureType: 'transit.line',
        elementType: 'all',
        stylers: [{ visibility: 'off' }]
    }
];

const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_ID || '4c730709b30c1be1';

// Helper to render driving directions polyline
const DirectionsLine = ({ userLat, userLng, clinicLat, clinicLng }: { userLat: number | null, userLng: number | null, clinicLat: number, clinicLng: number }) => {
    const map = useMap();
    useEffect(() => {
        const maps = window.google?.maps;
        if (!maps || !map || !userLat || !userLng) return;

        const renderer = new maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true,
            preserveViewport: true,
            polylineOptions: {
                strokeColor: '#ff6b00',
                strokeWeight: 5,
                strokeOpacity: 0.85
            }
        });

        const service = new maps.DirectionsService();
        service.route(
            {
                origin: { lat: userLat, lng: userLng },
                destination: { lat: clinicLat, lng: clinicLng },
                travelMode: maps.TravelMode.DRIVING
            },
            (result, status) => {
                if (status === 'OK' && result) {
                    renderer.setDirections(result);
                }
            }
        );

        return () => {
            renderer.setMap(null);
        };
    }, [map, userLat, userLng, clinicLat, clinicLng]);

    return null;
};

// Map Controller: manages clean styles and provides map instance
function MapController({
    onMapReady,
    center
}: {
    onMapReady: (map: google.maps.Map) => void;
    center?: { lat: number; lng: number };
}) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;
        onMapReady(map);
        map.setOptions({
            clickableIcons: false,
            styles: cleanMapStyles
        });
    }, [map, onMapReady]);

    useEffect(() => {
        if (!map || !center) return;
        map.panTo(center);
    }, [map, center]);

    return null;
}

export default function ClinicMap() {
    const { user } = useAuth();
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [loading, setLoading] = useState(true);
    const [, setError] = useState<string | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<{ clinicName: string; branch: Branch } | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [showDirections, setShowDirections] = useState(false);
    const [showStreetView, setShowStreetView] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'nearby'>('all');

    // Screen responsiveness
    const [isMobile, setIsMobile] = useState(false);
    const [sheetPosition, setSheetPosition] = useState<'collapsed' | 'half' | 'full'>('half');
    const touchStartY = useRef<number | null>(null);

    // Map instance
    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
    const [mapCenter, setMapCenter] = useState({ lat: 14.5995, lng: 120.9842 });

    // Street view state
    const [panoPosition, setPanoPosition] = useState<{ lat: number, lng: number } | null>(null);
    const [panoPov, setPanoPov] = useState<{ heading: number, pitch: number }>({ heading: 0, pitch: 0 });
    const streetViewInstance = useRef<google.maps.StreetViewPanorama | null>(null);

    // Card refs for auto-scrolling
    const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});

    // Detect mobile viewport
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            // Mobile portrait or short screen
            setIsMobile(width < 768 && height >= 550);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Load Clinics & User Location
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`${API}/api/clinics`);
                if (!res.ok) throw new Error('Failed to fetch clinics');
                const data = await res.json();
                setClinics(data.clinics || []);

                if (user?.token) {
                    const addrRes = await fetch(`${API}/api/customer/addresses`, {
                        headers: { Authorization: `Bearer ${user.token}` }
                    });
                    if (addrRes.ok) {
                        const addrData = await addrRes.json();
                        const addresses = addrData.addresses || [];
                        const def = addresses.find((a: any) => a.is_default) || addresses[0];
                        if (def && def.lat !== null && def.lng !== null) {
                            const pos = { lat: def.lat, lng: def.lng };
                            setUserLocation(pos);
                            setMapCenter(pos);
                        }
                    }
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not load data.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user?.token]);

    const allBranches = clinics.flatMap(clinic =>
        (clinic.branches || []).filter(b => b.lat && b.lng).map(b => ({
            clinicName: clinic.name,
            branch: b
        }))
    );

    const filteredBranches = allBranches.filter(item => {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch = !query ||
            item.clinicName.toLowerCase().includes(query) ||
            item.branch.name.toLowerCase().includes(query) ||
            item.branch.address_line1.toLowerCase().includes(query) ||
            item.branch.address_line2?.toLowerCase().includes(query);

        if (activeTab === 'nearby' && userLocation && item.branch.lat && item.branch.lng) {
            const distStr = calculateDist(userLocation.lat, userLocation.lng, item.branch.lat, item.branch.lng);
            const distKm = parseFloat(distStr);
            return matchesSearch && distKm < 15; // Within 15km
        }
        return matchesSearch;
    });

    // Fit map bounds to show relevant pins
    const fitMapToBounds = (branches = filteredBranches, includeUser = (activeTab === 'nearby')) => {
        if (!mapInstance || !window.google?.maps) return;
        const bounds = new window.google.maps.LatLngBounds();
        let count = 0;

        if (includeUser && userLocation) {
            bounds.extend(userLocation);
            count++;
        }

        branches.forEach(item => {
            if (item.branch.lat && item.branch.lng) {
                bounds.extend({ lat: item.branch.lat, lng: item.branch.lng });
                count++;
            }
        });

        if (count > 0) {
            const padTop = isMobile ? 120 : 40;
            const padBottom = isMobile
                ? (sheetPosition === 'half' ? Math.round(window.innerHeight * 0.42) + 20 : 85)
                : 40;

            mapInstance.fitBounds(bounds, {
                top: padTop,
                right: isMobile ? 20 : 40,
                bottom: padBottom,
                left: isMobile ? 20 : 40
            });

            // Prevent excessive zoom when only 1 marker is present
            const listener = window.google.maps.event.addListenerOnce(mapInstance, 'idle', () => {
                if (mapInstance.getZoom() && mapInstance.getZoom()! > 15) {
                    mapInstance.setZoom(15);
                }
            });
        }
    };

    // Auto fit bounds when tab or search changes
    useEffect(() => {
        if (!loading && mapInstance) {
            fitMapToBounds(filteredBranches, activeTab === 'nearby');
        }
    }, [activeTab, searchQuery, mapInstance]);

    // Handle selecting a branch from the list
    const handleBranchSelect = (item: { clinicName: string; branch: Branch }) => {
        setSelectedBranch(item);
        if (item.branch.lat && item.branch.lng && mapInstance) {
            mapInstance.panTo({ lat: item.branch.lat, lng: item.branch.lng });
            if (mapInstance.getZoom() && mapInstance.getZoom()! < 14) {
                mapInstance.setZoom(14);
            }
        }
        setShowDirections(false);
        // On mobile, keep sheet at half height so map and card remain visible
        if (isMobile && sheetPosition === 'full') {
            setSheetPosition('half');
        }
    };

    // Handle tapping a pin marker on the map
    const handleMarkerClick = (item: { clinicName: string; branch: Branch }) => {
        setSelectedBranch(item);
        if (item.branch.lat && item.branch.lng && mapInstance) {
            mapInstance.panTo({ lat: item.branch.lat, lng: item.branch.lng });
        }
        if (isMobile && sheetPosition === 'collapsed') {
            setSheetPosition('half');
        }
        // Scroll card into view in the list
        setTimeout(() => {
            const el = cardRefs.current[item.branch.id];
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 120);
    };

    // Bottom sheet touch gestures for mobile
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartY.current === null) return;
        const deltaY = e.changedTouches[0].clientY - touchStartY.current;
        touchStartY.current = null;

        if (deltaY < -35) {
            // Dragged upward
            if (sheetPosition === 'collapsed') setSheetPosition('half');
            else if (sheetPosition === 'half') setSheetPosition('full');
        } else if (deltaY > 35) {
            // Dragged downward
            if (sheetPosition === 'full') setSheetPosition('half');
            else if (sheetPosition === 'half') setSheetPosition('collapsed');
        }
    };

    const toggleSheetPosition = () => {
        if (sheetPosition === 'collapsed') setSheetPosition('half');
        else if (sheetPosition === 'half') setSheetPosition('full');
        else setSheetPosition('half');
    };

    if (loading) {
        return (
            <DashboardLayout title="">
                <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
                    <motion.div
                        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 1.8, repeat: Infinity }}
                        className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center"
                    >
                        <MapPin className="text-brand w-8 h-8" />
                    </motion.div>
                    <p className="font-bold text-xs text-slate-800">Locating Hi-Vet clinics...</p>
                </div>
            </DashboardLayout>
        );
    }

    // Clinic Card Component for both mobile sheet and desktop sidebar
    const renderClinicCard = (item: { clinicName: string; branch: Branch }) => {
        const isSelected = selectedBranch?.branch.id === item.branch.id;
        return (
            <div
                key={item.branch.id}
                ref={(el) => { cardRefs.current[item.branch.id] = el; }}
                onClick={() => handleBranchSelect(item)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                    isSelected
                        ? 'bg-brand text-white border-brand shadow-xl shadow-brand/20 ring-2 ring-brand/30'
                        : 'bg-white border-slate-100 hover:border-brand/40 hover:shadow-md'
                }`}
            >
                {/* Header row: Icon, Names & Distance Badge */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors mt-0.5 ${
                            isSelected ? 'bg-white/15 text-white' : 'bg-brand/10 text-brand'
                        }`}>
                            <Store className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className={`text-sm font-black truncate leading-tight ${
                                isSelected ? 'text-white' : 'text-slate-800'
                            }`}>
                                {formatName(item.clinicName)}
                            </h4>
                            <p className={`text-[10px] font-medium mt-0.5 ${
                                isSelected ? 'text-white/70' : 'text-slate-500'
                            }`}>
                                {toTitleCase(item.branch.name)}
                            </p>
                        </div>
                    </div>

                    {/* Distance Badge in top right corner - shrink-0 so it never overlaps name */}
                    {userLocation && item.branch.lat && item.branch.lng && (
                        <div className={`shrink-0 ml-2 px-2.5 py-1 rounded-full text-[9px] font-bold ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-brand/10 text-brand'
                        }`}>
                            {calculateDist(userLocation.lat, userLocation.lng, item.branch.lat, item.branch.lng)} away
                        </div>
                    )}
                </div>

                {/* Address: 2 lines max with line-clamp-2 */}
                <div className={`flex items-start gap-2 mt-3 text-[11px] leading-relaxed ${
                    isSelected ? 'text-white/90' : 'text-slate-600'
                }`}>
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-brand" />
                    <span className="line-clamp-2">
                        {item.branch.address_line1}
                        {item.branch.address_line2 ? `, ${item.branch.address_line2}` : ''}
                    </span>
                </div>

                {/* Phone: Tap to call */}
                {item.branch.phone && (
                    <div className="mt-2 flex items-center gap-2">
                        <Phone className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white/80' : 'text-slate-400'}`} />
                        <a
                            href={`tel:${item.branch.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className={`text-[11px] font-bold hover:underline ${
                                isSelected ? 'text-white underline' : 'text-brand'
                            }`}
                        >
                            {item.branch.phone}
                        </a>
                    </div>
                )}

                {/* Expanded Actions when selected */}
                <AnimatePresence>
                    {isSelected && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-4 pt-3 border-t border-white/20 flex flex-wrap gap-2"
                        >
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowDirections(prev => !prev); }}
                                className="flex-1 min-h-[44px] px-3 py-2 bg-white text-brand rounded-xl font-bold text-xs shadow-sm hover:brightness-105 flex items-center justify-center gap-1.5"
                            >
                                <Navigation2 size={13} /> {showDirections ? 'Hide Route' : 'Get Route'}
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowStreetView(true); }}
                                className="flex-1 min-h-[44px] px-3 py-2 bg-white/15 border border-white/30 text-white rounded-xl font-bold text-xs hover:bg-white/25 flex items-center justify-center gap-1.5"
                            >
                                <Eye size={13} /> Street View
                            </button>
                            <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${item.branch.lat},${item.branch.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="min-h-[44px] px-3 py-2 bg-white/10 text-white rounded-xl font-bold text-xs hover:bg-white/20 flex items-center justify-center gap-1"
                                title="Open in Google Maps"
                            >
                                <ExternalLink size={13} />
                            </a>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <APIProvider apiKey={MAPS_API_KEY}>
            <DashboardLayout title="" hideHeader={false}>
                {/* Responsive Full-Height Map Container */}
                <div className="w-full h-[calc(100dvh-10.5rem)] sm:h-[calc(100dvh-11.5rem)] lg:h-[calc(100vh-175px)] min-h-[500px] max-w-[1920px] mx-auto relative rounded-3xl overflow-hidden border border-accent-brown/10 shadow-xl bg-slate-100">

                    {/* DESKTOP / TABLET / LANDSCAPE VIEW: Side-by-side Discovery Sidebar */}
                    {!isMobile ? (
                        <div className="flex flex-row h-full w-full">
                            {/* Discovery Panel Sidebar */}
                            <div className="w-[380px] lg:w-[420px] shrink-0 h-full flex flex-col bg-white border-r border-accent-brown/10 shadow-sm z-10 overflow-hidden">
                                {/* Header */}
                                <div className="p-6 space-y-4 bg-accent-peach/5 border-b border-accent-brown/10 shrink-0">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Clinic Network</h2>
                                            <p className="text-[10px] font-bold text-slate-500">Hi-Vet branches nearby</p>
                                        </div>
                                        <div className="px-3 py-1 bg-brand/10 text-brand rounded-full text-xs font-black">
                                            {filteredBranches.length} {filteredBranches.length === 1 ? 'Clinic' : 'Clinics'}
                                        </div>
                                    </div>

                                    {/* Search Bar */}
                                    <div className="relative">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search clinic, branch, or street..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/30 transition-all shadow-sm"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Tabs: All Clinics / Nearby Me */}
                                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                                        <button
                                            onClick={() => { setActiveTab('all'); }}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all min-h-[38px] flex items-center justify-center gap-1.5 ${
                                                activeTab === 'all'
                                                    ? 'bg-brand text-white shadow-sm'
                                                    : 'text-slate-600 hover:text-brand'
                                            }`}
                                        >
                                            All Clinics ({allBranches.length})
                                        </button>
                                        <button
                                            onClick={() => { setActiveTab('nearby'); }}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all min-h-[38px] flex items-center justify-center gap-1.5 ${
                                                activeTab === 'nearby'
                                                    ? 'bg-brand text-white shadow-sm'
                                                    : 'text-slate-600 hover:text-brand'
                                            }`}
                                        >
                                            <MapPin className="w-3 h-3" /> Nearby Me
                                        </button>
                                    </div>
                                </div>

                                {/* Scrollable List */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                                    {filteredBranches.length === 0 ? (
                                        <div className="py-16 text-center space-y-3 opacity-40 px-6">
                                            <Store size={48} className="mx-auto text-slate-400" strokeWidth={1.5} />
                                            <p className="text-xs font-medium text-slate-600">No matching Hi-Vet clinics found.</p>
                                        </div>
                                    ) : (
                                        filteredBranches.map(item => renderClinicCard(item))
                                    )}
                                </div>
                            </div>

                            {/* Map Canvas Area */}
                            <div className="flex-1 h-full relative">
                                <Map
                                    mapId={MAP_ID}
                                    defaultZoom={12}
                                    defaultCenter={mapCenter}
                                    gestureHandling="greedy"
                                    disableDefaultUI={false}
                                    mapTypeControl={false}
                                    streetViewControl={false}
                                    clickableIcons={false}
                                    styles={cleanMapStyles}
                                    className="w-full h-full"
                                >
                                    <MapController
                                        onMapReady={setMapInstance}
                                        center={mapCenter}
                                    />

                                    {/* User Location Marker */}
                                    {userLocation && (
                                        <AdvancedMarker position={userLocation}>
                                            <div className="relative flex items-center justify-center">
                                                <div className="w-10 h-10 bg-blue-500/25 rounded-full animate-ping absolute -inset-0" />
                                                <div className="relative w-8 h-8 bg-blue-500 rounded-xl border-2 border-white shadow-xl flex items-center justify-center text-white">
                                                    <User size={16} />
                                                </div>
                                            </div>
                                        </AdvancedMarker>
                                    )}

                                    {/* Only Hi-Vet Branch Markers */}
                                    {allBranches.map((item) => {
                                        const isSelected = selectedBranch?.branch.id === item.branch.id;
                                        return (
                                            <AdvancedMarker
                                                key={item.branch.id}
                                                position={{ lat: item.branch.lat!, lng: item.branch.lng! }}
                                                onClick={() => handleMarkerClick(item)}
                                            >
                                                <div className="relative flex flex-col items-center group cursor-pointer">
                                                    {isSelected && (
                                                        <div className="absolute -inset-1 bg-brand/30 rounded-2xl animate-ping" />
                                                    )}
                                                    <div className={`w-11 h-11 rounded-2xl border-2 border-white shadow-xl flex items-center justify-center transition-all ${
                                                        isSelected
                                                            ? 'bg-brand text-white scale-110 z-50 ring-4 ring-brand/30'
                                                            : 'bg-white text-brand hover:bg-brand hover:text-white'
                                                    }`}>
                                                        <Store size={20} />
                                                    </div>
                                                    <div className={`mt-1.5 bg-white px-2.5 py-1 rounded-full shadow-md border border-slate-100 transition-all ${
                                                        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                                    }`}>
                                                        <p className="text-[9px] font-bold text-slate-800 whitespace-nowrap">
                                                            {formatName(item.clinicName)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </AdvancedMarker>
                                        );
                                    })}

                                    {/* Driving Route Polyline */}
                                    {showDirections && selectedBranch && userLocation && (
                                        <DirectionsLine
                                            userLat={userLocation.lat}
                                            userLng={userLocation.lng}
                                            clinicLat={selectedBranch.branch.lat!}
                                            clinicLng={selectedBranch.branch.lng!}
                                        />
                                    )}
                                </Map>

                                {/* Floating Map Controls: Top-right corner */}
                                <div className="absolute top-6 right-6 flex flex-col gap-2.5 z-20">
                                    <button
                                        onClick={() => {
                                            if (userLocation && mapInstance) {
                                                mapInstance.panTo(userLocation);
                                                mapInstance.setZoom(15);
                                            }
                                        }}
                                        className="w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center text-slate-700 hover:text-brand transition-all border border-slate-100 group"
                                        title="My Location"
                                    >
                                        <Navigation2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                    <button
                                        onClick={() => fitMapToBounds(allBranches, false)}
                                        className="w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center text-slate-700 hover:text-brand transition-all border border-slate-100 group"
                                        title="Full Network View"
                                    >
                                        <LayoutGrid className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* MOBILE VIEW: Primary Full Map with Compact Floating Top Block & Draggable Bottom Sheet */
                        <div className="relative w-full h-full overflow-hidden">
                            {/* 1. Google Map Canvas (fills entire container) */}
                            <div className="absolute inset-0 w-full h-full">
                                <Map
                                    mapId={MAP_ID}
                                    defaultZoom={12}
                                    defaultCenter={mapCenter}
                                    gestureHandling="greedy"
                                    disableDefaultUI={false}
                                    mapTypeControl={false}
                                    streetViewControl={false}
                                    clickableIcons={false}
                                    styles={cleanMapStyles}
                                    className="w-full h-full"
                                >
                                    <MapController
                                        onMapReady={setMapInstance}
                                        center={mapCenter}
                                    />

                                    {/* User Location Marker */}
                                    {userLocation && (
                                        <AdvancedMarker position={userLocation}>
                                            <div className="relative flex items-center justify-center">
                                                <div className="w-9 h-9 bg-blue-500/25 rounded-full animate-ping absolute -inset-0" />
                                                <div className="relative w-8 h-8 bg-blue-500 rounded-xl border-2 border-white shadow-xl flex items-center justify-center text-white">
                                                    <User size={15} />
                                                </div>
                                            </div>
                                        </AdvancedMarker>
                                    )}

                                    {/* Only Hi-Vet Branch Markers */}
                                    {allBranches.map((item) => {
                                        const isSelected = selectedBranch?.branch.id === item.branch.id;
                                        return (
                                            <AdvancedMarker
                                                key={item.branch.id}
                                                position={{ lat: item.branch.lat!, lng: item.branch.lng! }}
                                                onClick={() => handleMarkerClick(item)}
                                            >
                                                <div className="relative flex flex-col items-center cursor-pointer">
                                                    {isSelected && (
                                                        <div className="absolute -inset-1 bg-brand/30 rounded-2xl animate-ping" />
                                                    )}
                                                    <div className={`w-11 h-11 rounded-2xl border-2 border-white shadow-xl flex items-center justify-center transition-all min-w-[44px] min-h-[44px] ${
                                                        isSelected
                                                            ? 'bg-brand text-white scale-110 z-50 ring-4 ring-brand/30'
                                                            : 'bg-white text-brand'
                                                    }`}>
                                                        <Store size={20} />
                                                    </div>
                                                    {isSelected && (
                                                        <div className="mt-1 bg-white px-2 py-0.5 rounded-full shadow-md border border-slate-100">
                                                            <p className="text-[8px] font-bold text-slate-800 whitespace-nowrap">
                                                                {formatName(item.clinicName)}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </AdvancedMarker>
                                        );
                                    })}

                                    {/* Driving Route Polyline */}
                                    {showDirections && selectedBranch && userLocation && (
                                        <DirectionsLine
                                            userLat={userLocation.lat}
                                            userLng={userLocation.lng}
                                            clinicLat={selectedBranch.branch.lat!}
                                            clinicLng={selectedBranch.branch.lng!}
                                        />
                                    )}
                                </Map>
                            </div>

                            {/* 2. Compact Floating Top Block (Search & Tabs) */}
                            <div className="absolute top-3 left-3 right-3 z-30 pointer-events-auto">
                                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-2.5 border border-slate-200/80 shadow-lg space-y-2">
                                    {/* Search Input */}
                                    <div className="relative flex items-center">
                                        <Search className="absolute left-3 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search Hi-Vet clinics or streets..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/30 transition-all"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Segmented Switch: All Clinics / Nearby Me */}
                                    <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
                                        <button
                                            onClick={() => setActiveTab('all')}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[38px] flex items-center justify-center gap-1 ${
                                                activeTab === 'all'
                                                    ? 'bg-brand text-white shadow-sm'
                                                    : 'text-slate-600 hover:text-brand'
                                            }`}
                                        >
                                            All Clinics ({allBranches.length})
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('nearby')}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[38px] flex items-center justify-center gap-1 ${
                                                activeTab === 'nearby'
                                                    ? 'bg-brand text-white shadow-sm'
                                                    : 'text-slate-600 hover:text-brand'
                                            }`}
                                        >
                                            <MapPin className="w-3 h-3" /> Nearby Me
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Floating Quick Map Controls (re-center, full view) - below top block */}
                            <div className="absolute top-32 right-3 z-20 flex flex-col gap-2">
                                <button
                                    onClick={() => {
                                        if (userLocation && mapInstance) {
                                            mapInstance.panTo(userLocation);
                                            mapInstance.setZoom(15);
                                        }
                                    }}
                                    className="w-11 h-11 bg-white/95 backdrop-blur-md rounded-xl shadow-lg flex items-center justify-center text-slate-700 hover:text-brand transition-all border border-slate-200/80"
                                    title="My Location"
                                >
                                    <Navigation2 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => fitMapToBounds(allBranches, false)}
                                    className="w-11 h-11 bg-white/95 backdrop-blur-md rounded-xl shadow-lg flex items-center justify-center text-slate-700 hover:text-brand transition-all border border-slate-200/80"
                                    title="Full Network View"
                                >
                                    <LayoutGrid className="w-5 h-5" />
                                </button>
                            </div>

                            {/* 4. Draggable Bottom Sheet */}
                            <motion.div
                                animate={{
                                    height: sheetPosition === 'collapsed'
                                        ? '76px'
                                        : sheetPosition === 'half'
                                            ? '42vh'
                                            : '82vh'
                                }}
                                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                                className="absolute bottom-0 left-0 right-0 z-30 bg-white/98 backdrop-blur-xl rounded-t-3xl border-t border-slate-200/90 shadow-[0_-12px_32px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden"
                            >
                                {/* Drag Handle Bar */}
                                <div
                                    onTouchStart={handleTouchStart}
                                    onTouchEnd={handleTouchEnd}
                                    onClick={toggleSheetPosition}
                                    className="w-full pt-2 pb-2 px-4 flex flex-col items-center cursor-pointer select-none shrink-0"
                                >
                                    {/* Visual handle pill */}
                                    <div className="w-10 h-1 bg-slate-300 rounded-full mb-2 hover:bg-slate-400 transition-colors" />

                                    {/* Sheet Header Row */}
                                    <div className="w-full flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-slate-800 tracking-tight">
                                                {sheetPosition === 'collapsed' && selectedBranch
                                                    ? formatName(selectedBranch.clinicName)
                                                    : `Clinics (${filteredBranches.length})`}
                                            </span>
                                            {sheetPosition === 'collapsed' && selectedBranch && userLocation && selectedBranch.branch.lat && selectedBranch.branch.lng && (
                                                <span className="text-[9px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">
                                                    {calculateDist(userLocation.lat, userLocation.lng, selectedBranch.branch.lat, selectedBranch.branch.lng)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Toggle indicator button */}
                                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                                            <span>
                                                {sheetPosition === 'collapsed' ? 'Swipe Up' : sheetPosition === 'half' ? 'Full List' : 'Collapse'}
                                            </span>
                                            {sheetPosition === 'full' ? (
                                                <ChevronDown className="w-4 h-4 text-slate-600" />
                                            ) : (
                                                <ChevronUp className="w-4 h-4 text-slate-600" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Sheet Scrollable Content (visible when half or full) */}
                                {sheetPosition !== 'collapsed' && (
                                    <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3 no-scrollbar">
                                        {filteredBranches.length === 0 ? (
                                            <div className="py-10 text-center space-y-2 opacity-50">
                                                <Store size={36} className="mx-auto text-slate-400" />
                                                <p className="text-xs font-medium text-slate-600">No matching Hi-Vet clinics found.</p>
                                            </div>
                                        ) : (
                                            filteredBranches.map(item => renderClinicCard(item))
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    )}

                    {/* Street View Modal Overlay (works on both mobile & desktop) */}
                    <AnimatePresence>
                        {showStreetView && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-50 bg-black flex flex-col"
                            >
                                {/* Street View Header */}
                                <div className="absolute top-3 left-3 right-3 sm:top-6 sm:left-6 sm:right-6 z-[110] flex items-center justify-between pointer-events-none">
                                    <div className="px-4 py-2.5 bg-black/70 backdrop-blur-md border border-white/20 rounded-2xl pointer-events-auto">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 bg-brand rounded-xl flex items-center justify-center text-white">
                                                <Store size={14} />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black text-white leading-none mb-0.5">
                                                    {formatName(selectedBranch?.clinicName || 'Clinic View')}
                                                </h4>
                                                <p className="text-[9px] font-bold text-white/70">
                                                    {toTitleCase(selectedBranch?.branch.name || '')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowStreetView(false);
                                            streetViewInstance.current = null;
                                        }}
                                        className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 flex items-center justify-center text-white hover:bg-red-500 hover:border-red-500 transition-all pointer-events-auto shadow-xl"
                                        title="Close Street View"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Main Panorama View */}
                                <div className="flex-1 relative bg-black">
                                    <div
                                        ref={(el) => {
                                            if (el && !streetViewInstance.current) {
                                                const pos = selectedBranch?.branch.lat && selectedBranch?.branch.lng
                                                    ? { lat: selectedBranch.branch.lat, lng: selectedBranch.branch.lng }
                                                    : (userLocation || mapCenter);

                                                const m = window.google?.maps;
                                                if (m) {
                                                    const pano = new m.StreetViewPanorama(el, {
                                                        position: pos,
                                                        pov: { heading: 0, pitch: 0 },
                                                        zoom: 1,
                                                        addressControl: false,
                                                        fullscreenControl: false,
                                                        panControl: true,
                                                        enableCloseButton: false,
                                                    });

                                                    pano.addListener('position_changed', () => {
                                                        const p = pano.getPosition();
                                                        if (p) setPanoPosition({ lat: p.lat(), lng: p.lng() });
                                                    });

                                                    pano.addListener('pov_changed', () => {
                                                        const pov = pano.getPov();
                                                        setPanoPov({ heading: pov.heading, pitch: pov.pitch });
                                                    });

                                                    streetViewInstance.current = pano;
                                                    setPanoPosition(pos);
                                                }
                                            }
                                        }}
                                        className="w-full h-full"
                                    />
                                </div>

                                {/* Responsive Mini Radar Map Overlay */}
                                <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 w-32 h-32 sm:w-48 sm:h-48 md:w-60 md:h-60 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl z-[120]">
                                    <Map
                                        mapId="mini-map-sv"
                                        center={panoPosition || mapCenter}
                                        zoom={18}
                                        disableDefaultUI={true}
                                        gestureHandling="none"
                                        className="w-full h-full"
                                    >
                                        {panoPosition && (
                                            <AdvancedMarker position={panoPosition}>
                                                <div
                                                    className="w-8 h-8 flex items-center justify-center transition-transform duration-200"
                                                    style={{ transform: `rotate(${panoPov.heading}deg)` }}
                                                >
                                                    <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-xl relative">
                                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-blue-500" />
                                                    </div>
                                                </div>
                                            </AdvancedMarker>
                                        )}

                                        {selectedBranch?.branch.lat && selectedBranch?.branch.lng && (
                                            <AdvancedMarker position={{ lat: selectedBranch.branch.lat, lng: selectedBranch.branch.lng }}>
                                                <div className="w-6 h-6 bg-brand rounded-lg flex items-center justify-center text-white border-2 border-white shadow-md">
                                                    <Store size={12} />
                                                </div>
                                            </AdvancedMarker>
                                        )}
                                    </Map>
                                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/70 backdrop-blur rounded text-[8px] font-bold text-white">
                                        Live Radar
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </DashboardLayout>
        </APIProvider>
    );
}
