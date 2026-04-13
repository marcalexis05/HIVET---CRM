import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import DashboardLayout from '../../components/DashboardLayout';
import {
    Building, Loader2, AlertCircle, Eye, Store,
    User, X, Truck, Search, Navigation2,
    MapPin, Phone, Clock, ChevronRight,
    Filter, LayoutGrid, List
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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

// Component for rendering directions on the map
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
                strokeOpacity: 0.8
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

export default function ClinicMap() {
    const { user } = useAuth();
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<{ clinicName: string; branch: Branch } | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [showDirections, setShowDirections] = useState(false);
    const [showStreetView, setShowStreetView] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'nearby'>('all');

    // Pan / Pov tracking for Street View Mini-Map
    const [panoPosition, setPanoPosition] = useState<{ lat: number, lng: number } | null>(null);
    const [panoPov, setPanoPov] = useState<{ heading: number, pitch: number }>({ heading: 0, pitch: 0 });
    const streetViewInstance = useRef<google.maps.StreetViewPanorama | null>(null);

    // Default center (Manila)
    const [mapCenter, setMapCenter] = useState({ lat: 14.5995, lng: 120.9842 });

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
        const matchesSearch = item.clinicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.branch.address_line1.toLowerCase().includes(searchQuery.toLowerCase());

        if (activeTab === 'nearby' && userLocation && item.branch.lat && item.branch.lng) {
            const distStr = calculateDist(userLocation.lat, userLocation.lng, item.branch.lat, item.branch.lng);
            const distKm = parseFloat(distStr);
            return matchesSearch && distKm < 10; // Only show within 10km for 'nearby'
        }
        return matchesSearch;
    });

    const handleBranchSelect = (item: { clinicName: string; branch: Branch }) => {
        setSelectedBranch(item);
        if (item.branch.lat && item.branch.lng) {
            setMapCenter({ lat: item.branch.lat, lng: item.branch.lng });
        }
        setShowDirections(false);
    };

    // Helper component to handle camera movements imperatively
    const CameraHandler = ({ center }: { center: { lat: number, lng: number } }) => {
        const map = useMap();
        useEffect(() => {
            if (map && center) {
                map.panTo(center);
            }
        }, [map, center]);
        return null;
    };

    if (loading) {
        return (
            <DashboardLayout title="">
                <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center"
                    >
                        <MapPin className="text-brand w-8 h-8" />
                    </motion.div>
                    <p className="font-black text-[10px] uppercase tracking-[0.2em] text-accent-brown/30">Locating Network Clinics...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <APIProvider apiKey={MAPS_API_KEY}>
            <DashboardLayout title="" hideHeader={false}>
                <div className="space-y-6 max-w-[1920px] mx-auto h-[calc(100vh-180px)] min-h-[700px]">

                    <div className="flex flex-col lg:flex-row gap-6 h-full">

                        {/* 1. Discovery Panel Sidebar */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="w-full lg:w-[450px] flex flex-col bg-white rounded-[2.5rem] border border-white shadow-2xl shadow-accent-brown/5 overflow-hidden"
                        >
                            {/* Header Section */}
                            <div className="p-8 space-y-6 bg-accent-peach/5 border-b border-accent-brown/5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-black text-accent-brown tracking-tighter">Clinic Network</h2>
                                        <p className="text-[10px] font-black text-accent-brown/30 uppercase tracking-[0.2em]">Discover Branches Nearby</p>
                                    </div>
                                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center">
                                        <Filter className="w-5 h-5 text-accent-brown/40" />
                                    </div>
                                </div>

                                {/* Search Bar */}
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/30" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, clinic or street..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white border border-accent-brown/5 text-xs font-bold text-accent-brown focus:outline-none focus:ring-4 focus:ring-brand/5 transition-all shadow-sm"
                                    />
                                </div>

                                {/* Tabs */}
                                <div className="flex gap-2 p-1 bg-white border border-accent-brown/5 rounded-xl shadow-sm">
                                    <button
                                        onClick={() => setActiveTab('all')}
                                        className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'all' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-accent-brown/40 hover:text-brand'}`}
                                    >
                                        All Clinics
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('nearby')}
                                        className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'nearby' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-accent-brown/40 hover:text-brand'}`}
                                    >
                                        Nearby Me
                                    </button>
                                </div>
                            </div>

                            {/* List Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                                {filteredBranches.length === 0 ? (
                                    <div className="py-20 text-center space-y-4 opacity-30 px-10">
                                        <Store size={64} className="mx-auto" strokeWidth={1} />
                                        <p className="text-sm font-black uppercase tracking-widest">No matching branches found in our network.</p>
                                    </div>
                                ) : (
                                    filteredBranches.map((item) => (
                                        <motion.div
                                            key={item.branch.id}
                                            whileHover={{ y: -4 }}
                                            onClick={() => handleBranchSelect(item)}
                                            className={`p-5 rounded-[1.5rem] border-2 cursor-pointer transition-all relative overflow-hidden group ${selectedBranch?.branch.id === item.branch.id
                                                    ? 'bg-brand border-brand shadow-xl shadow-brand/20'
                                                    : 'bg-white border-accent-brown/5 hover:border-brand/30 hover:shadow-lg'
                                                }`}
                                        >
                                            {/* Distance Badge */}
                                            {userLocation && item.branch.lat && item.branch.lng && (
                                                <div className={`absolute top-5 right-5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter ${selectedBranch?.branch.id === item.branch.id ? 'bg-white/20 text-white' : 'bg-brand/10 text-brand'
                                                    }`}>
                                                    {calculateDist(userLocation.lat, userLocation.lng, item.branch.lat, item.branch.lng)} away
                                                </div>
                                            )}

                                            <div className="flex gap-4">
                                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${selectedBranch?.branch.id === item.branch.id ? 'bg-white/10 text-white' : 'bg-accent-peach/20 text-brand'
                                                    }`}>
                                                    <Store className="w-5.5 h-5.5" />
                                                </div>
                                                <div className="min-w-0 pr-10">
                                                    <h4 className={`text-sm font-black truncate ${selectedBranch?.branch.id === item.branch.id ? 'text-white' : 'text-accent-brown group-hover:text-brand'}`}>
                                                        {item.clinicName}
                                                    </h4>
                                                    <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${selectedBranch?.branch.id === item.branch.id ? 'text-white/60' : 'text-accent-brown/40'}`}>
                                                        {item.branch.name}
                                                    </p>
                                                    <div className={`flex items-center gap-1.5 mt-3 text-[9px] font-medium ${selectedBranch?.branch.id === item.branch.id ? 'text-white/80' : 'text-accent-brown/60'}`}>
                                                        <MapPin size={10} className="shrink-0" />
                                                        <span className="truncate">{item.branch.address_line1}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Options when selected */}
                                            <AnimatePresence>
                                                {selectedBranch?.branch.id === item.branch.id && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="mt-6 pt-6 border-t border-white/10 flex gap-3"
                                                    >
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setShowDirections(true); }}
                                                            className="flex-1 py-3 bg-white text-brand rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:brightness-110 flex items-center justify-center gap-2"
                                                        >
                                                            <Navigation2 size={12} /> Get Route
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setShowStreetView(true); }}
                                                            className="flex-1 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-white/20 flex items-center justify-center gap-2"
                                                        >
                                                            <Eye size={12} /> Street View
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>

                        {/* 2. Map Canvas Area */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex-1 bg-white rounded-[2.5rem] border border-white shadow-2xl shadow-accent-brown/5 overflow-hidden relative"
                        >
                            <AnimatePresence mode="wait">
                                {!showStreetView ? (
                                    <motion.div
                                        key="map-view"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="h-full w-full"
                                    >
                                        <Map
                                            mapId="4c730709b30c1be1"
                                            defaultZoom={12}
                                            defaultCenter={mapCenter}
                                            gestureHandling={'greedy'}
                                            disableDefaultUI={false}
                                            mapTypeControl={false}
                                            streetViewControl={false}
                                        >
                                            <CameraHandler center={mapCenter} />
                                            {/* User Marker */}
                                            {userLocation && (
                                                <AdvancedMarker position={userLocation}>
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="relative"
                                                    >
                                                        <div className="w-12 h-12 bg-blue-500/20 rounded-full animate-ping absolute -inset-0" />
                                                        <div className="relative w-10 h-10 bg-blue-500 rounded-2xl border-2 border-white shadow-2xl flex items-center justify-center text-white">
                                                            <User size={20} />
                                                        </div>
                                                    </motion.div>
                                                </AdvancedMarker>
                                            )}

                                            {/* Branch Markers */}
                                            {allBranches.map((item) => (
                                                <AdvancedMarker
                                                    key={item.branch.id}
                                                    position={{ lat: item.branch.lat!, lng: item.branch.lng! }}
                                                    onClick={() => handleBranchSelect(item)}
                                                >
                                                    <motion.div
                                                        whileHover={{ scale: 1.1, y: -5 }}
                                                        className={`relative flex flex-col items-center group`}
                                                    >
                                                        <div className={`w-12 h-12 rounded-[1.25rem] border-2 border-white shadow-2xl flex items-center justify-center transition-all ${selectedBranch?.branch.id === item.branch.id
                                                                ? 'bg-brand text-white scale-125 z-50'
                                                                : 'bg-white text-brand hover:bg-brand hover:text-white'
                                                            }`}>
                                                            <Store size={22} />
                                                        </div>
                                                        <div className={`mt-2 bg-white px-3 py-1.5 rounded-full shadow-lg border border-accent-brown/5 transition-all outline-none ${selectedBranch?.branch.id === item.branch.id ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-1'
                                                            }`}>
                                                            <p className="text-[9px] font-black text-accent-brown uppercase tracking-widest whitespace-nowrap">
                                                                {item.clinicName}
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                </AdvancedMarker>
                                            ))}

                                            {/* Directions Layer */}
                                            {showDirections && selectedBranch && userLocation && (
                                                <DirectionsLine
                                                    userLat={userLocation.lat}
                                                    userLng={userLocation.lng}
                                                    clinicLat={selectedBranch.branch.lat!}
                                                    clinicLng={selectedBranch.branch.lng!}
                                                />
                                            )}
                                        </Map>

                                        {/* Floating Active Card (Mobile Friendly替代 standard InfoWindows) */}
                                        <AnimatePresence>
                                            {selectedBranch && (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -50 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -50 }}
                                                    className="absolute top-8 left-8 w-[calc(100%-4rem)] max-w-sm bg-white rounded-[1.5rem] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-accent-brown/5 pointer-events-auto z-40"
                                                >
                                                    <div className="flex items-start justify-between mb-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-11 h-11 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                                                                <Store size={22} />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-lg font-black text-accent-brown tracking-tight leading-tight">{selectedBranch.clinicName}</h3>
                                                                <p className="text-[9px] font-black text-brand uppercase tracking-widest">{selectedBranch.branch.name}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => setSelectedBranch(null)}
                                                            className="w-9 h-9 bg-accent-peach/5 text-accent-brown/30 hover:text-red-500 rounded-full flex items-center justify-center transition-colors"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 mb-5">
                                                        <div className="bg-accent-peach/5 p-3.5 rounded-xl space-y-1 border border-accent-brown/5">
                                                            <div className="flex items-center gap-2 text-[7px] font-black text-accent-brown/40 uppercase tracking-widest">
                                                                <Phone size={9} /> Contact
                                                            </div>
                                                            <p className="text-xs font-bold text-accent-brown truncate">{selectedBranch.branch.phone}</p>
                                                        </div>
                                                        <div className="bg-accent-peach/5 p-3.5 rounded-xl space-y-1 border border-accent-brown/5">
                                                            <div className="flex items-center gap-2 text-[7px] font-black text-accent-brown/40 uppercase tracking-widest">
                                                                <Truck size={9} /> Distance
                                                            </div>
                                                            <p className="text-xs font-bold text-accent-brown">
                                                                {userLocation ? calculateDist(userLocation.lat, userLocation.lng, selectedBranch.branch.lat!, selectedBranch.branch.lng!) : '...'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2.5">
                                                        <button
                                                            onClick={() => setShowDirections(!showDirections)}
                                                            className={`flex-1 py-3.5 rounded-lg font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${showDirections ? 'bg-accent-brown text-white' : 'bg-brand text-white shadow-brand/20 hover:brightness-110'}`}
                                                        >
                                                            <Navigation2 size={12} /> {showDirections ? 'Hide Directions' : 'Navigate Here'}
                                                        </button>
                                                        <button
                                                            onClick={() => setShowStreetView(true)}
                                                            className="px-5 py-3.5 bg-white border border-accent-brown/5 text-accent-brown rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-accent-peach/5 flex items-center justify-center"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Map Overlay Controls */}
                                        <div className="absolute top-8 right-8 flex flex-col gap-3">
                                            <button
                                                onClick={() => {
                                                    if (userLocation) setMapCenter(userLocation);
                                                }}
                                                className="w-14 h-14 bg-white rounded-2xl shadow-xl flex items-center justify-center text-accent-brown hover:text-brand transition-all border border-accent-brown/5 group"
                                                title="My Location"
                                            >
                                                <Navigation2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                            </button>
                                            <button
                                                onClick={() => setMapCenter({ lat: 14.5995, lng: 120.9842 })}
                                                className="w-14 h-14 bg-white rounded-2xl shadow-xl flex items-center justify-center text-accent-brown hover:text-brand transition-all border border-accent-brown/5 group"
                                                title="Full Network View"
                                            >
                                                <LayoutGrid className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                            </button>
                                        </div>

                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="street-view"
                                        initial={{ opacity: 0, scale: 1.1 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="h-full w-full bg-[#0a0a0a] flex flex-col"
                                    >
                                        {/* Street View Top Bar */}
                                        <div className="absolute top-8 left-8 right-8 z-[110] flex items-center justify-between pointer-events-none">
                                            <div className="px-6 py-3 bg-brand-dark/80 backdrop-blur-md border border-white/20 rounded-2xl pointer-events-auto">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-brand rounded-xl flex items-center justify-center text-white">
                                                        <Store size={16} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[11px] font-black text-white leading-none mb-1">{selectedBranch?.clinicName || 'Clinic View'}</h4>
                                                        <p className="text-[8px] font-black text-white/50 uppercase tracking-widest">{selectedBranch?.branch.name}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setShowStreetView(false);
                                                    streetViewInstance.current = null;
                                                }}
                                                className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-white hover:bg-red-500 hover:border-red-500 transition-all pointer-events-auto shadow-2xl group"
                                            >
                                                <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                                            </button>
                                        </div>

                                        {/* Main Pano View */}
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
                                                className="w-full h-full grayscale-[0.1]"
                                            />
                                        </div>

                                        {/* Fixed Mini Map Overlay */}
                                        <div className="absolute bottom-8 right-8 w-64 h-64 rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl z-[120] grayscale-[0.2]">
                                            <Map
                                                mapId="mini-map-sv"
                                                center={panoPosition || mapCenter}
                                                zoom={18}
                                                disableDefaultUI={true}
                                                gestureHandling={'none'}
                                                className="w-full h-full"
                                            >
                                                {panoPosition && (
                                                    <AdvancedMarker position={panoPosition}>
                                                        <div
                                                            className="w-12 h-12 flex items-center justify-center transition-transform duration-200"
                                                            style={{ transform: `rotate(${panoPov.heading}deg)` }}
                                                        >
                                                            <div className="w-6 h-6 bg-blue-500 rounded-full border-[3px] border-white shadow-2xl relative">
                                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-blue-500" />
                                                            </div>
                                                        </div>
                                                    </AdvancedMarker>
                                                )}

                                                {selectedBranch?.branch.lat && selectedBranch?.branch.lng && (
                                                    <AdvancedMarker position={{ lat: selectedBranch.branch.lat, lng: selectedBranch.branch.lng }}>
                                                        <div className="w-8 h-8 bg-brand rounded-xl flex items-center justify-center text-white border-2 border-white shadow-lg">
                                                            <Store size={16} />
                                                        </div>
                                                    </AdvancedMarker>
                                                )}
                                            </Map>
                                            <div className="absolute top-3 left-3 px-2 py-1 bg-brand-dark/80 backdrop-blur rounded text-[7px] font-black text-white uppercase tracking-widest">Live Radar</div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>

                    </div>

                </div>
            </DashboardLayout>
        </APIProvider>
    );
}
