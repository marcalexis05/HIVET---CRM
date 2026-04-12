import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import DashboardLayout from '../../components/DashboardLayout';
import { Building, Loader2, AlertCircle, Eye, Store, User, X, Truck } from 'lucide-react';
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
                strokeColor: '#F58634',
                strokeWeight: 4,
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
    const [routeBranch, setRouteBranch] = useState<{ clinicName: string; branch: Branch } | null>(null); // Track active route destination
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [activeMarker, setActiveMarker] = useState<'branch' | 'user' | null>(null);
    const [showDirections, setShowDirections] = useState(false);

    const [showStreetView, setShowStreetView] = useState(false);
    const [panoPosition, setPanoPosition] = useState<{ lat: number, lng: number } | null>(null);
    const [panoPov, setPanoPov] = useState<{ heading: number, pitch: number }>({ heading: 0, pitch: 0 });
    const streetViewInstance = useRef<google.maps.StreetViewPanorama | null>(null);

    // Initial center point (Metro Manila)
    const [mapCenter, setMapCenter] = useState({ lat: 14.5995, lng: 120.9842 });

    useEffect(() => {
        const fetchLayoutData = async () => {
            try {
                // Fetch clinics
                const res = await fetch(`${API}/api/clinics`);
                if (!res.ok) throw new Error('Failed to fetch clinics');
                const data = await res.json();
                setClinics(data.clinics || []);

                // Try fetching user address if token exists to set default map position
                if (user?.token) {
                    const authRes = await fetch(`${API}/api/customer/addresses`, {
                        headers: { Authorization: `Bearer ${user.token}` }
                    });
                    if (authRes.ok) {
                        const addrData = await authRes.json();
                        const addresses = addrData.addresses || [];
                        const def = addresses.find((a: any) => a.is_default) || addresses[0];

                        if (def && def.lat !== null && def.lng !== null) {
                            const pos = { lat: def.lat, lng: def.lng };
                            setUserLocation(pos);
                            setMapCenter(pos);
                            setActiveMarker('user'); // Show their location info window by default
                        }
                    }
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Could not load map data.';
                setError(msg);
            } finally {
                setLoading(false);
            }
        };
        fetchLayoutData();
    }, [user?.token]);

    const allBranches = clinics.flatMap(clinic =>
        (clinic.branches || []).filter(b => b.lat && b.lng).map(b => ({
            clinicName: clinic.name,
            branch: b
        }))
    );

    const [searchQuery, setSearchQuery] = useState('');
    const filteredBranches = allBranches.filter(item => 
        item.clinicName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.branch.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.branch.address_line1.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <DashboardLayout title="Clinic Map">
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-280px)] min-h-[700px]">

                {loading && (
                    <div className="flex-1 flex items-center justify-center bg-white rounded-[2rem] border border-white shadow-xl shadow-accent-brown/5">
                        <Loader2 className="w-8 h-8 text-brand animate-spin" />
                    </div>
                )}

                {!loading && error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col items-center justify-center h-full text-center text-red-600 shadow-xl shadow-accent-brown/5">
                        <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                        <h3 className="font-black text-xl mb-2 tracking-tight">Oops, something went wrong</h3>
                        <p className="font-medium text-sm text-red-500/80">{error}</p>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {/* Sidebar */}
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="w-full lg:w-96 flex flex-col bg-white rounded-[2rem] border border-accent-brown/5 shadow-xl shadow-accent-brown/5 overflow-hidden"
                        >
                            <div className="p-6 border-b border-accent-brown/5 bg-accent-peach/5">
                                <h3 className="text-sm font-black text-accent-brown uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <Building className="w-4 h-4 text-brand" /> Network Branches
                                </h3>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        placeholder="Search by name or location..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full px-5 py-3 rounded-xl bg-white border border-accent-brown/10 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
                                {filteredBranches.length === 0 ? (
                                    <div className="text-center py-10">
                                        <Store className="w-10 h-10 text-accent-brown/10 mx-auto mb-3" />
                                        <p className="text-[10px] font-black text-accent-brown/30 uppercase tracking-widest">No branches found</p>
                                    </div>
                                ) : (
                                    filteredBranches.map((item, idx) => (
                                        <motion.button
                                            key={`${item.branch.id}-${idx}`}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                setSelectedBranch(item);
                                                setActiveMarker('branch');
                                                setMapCenter({ lat: item.branch.lat!, lng: item.branch.lng! });
                                            }}
                                            className={`w-full text-left p-4 rounded-2xl border-2 transition-all group relative ${
                                                selectedBranch?.branch.id === item.branch.id 
                                                ? 'border-brand bg-brand/5 shadow-lg shadow-brand/5' 
                                                : 'border-accent-brown/5 hover:border-brand/20 hover:bg-accent-peach/5'
                                            }`}
                                        >
                                            {selectedBranch?.branch.id === item.branch.id && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedBranch(null);
                                                        setActiveMarker(null);
                                                    }}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-brand-dark text-white rounded-full flex items-center justify-center shadow-lg hover:bg-black transition-colors z-10"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                            <div className="flex items-start gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                                    selectedBranch?.branch.id === item.branch.id ? 'bg-brand text-white' : 'bg-accent-peach/20 text-brand'
                                                }`}>
                                                    <Store className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-black text-accent-brown text-xs truncate group-hover:text-brand transition-colors">{item.clinicName}</h4>
                                                    <p className="text-[10px] font-bold text-accent-brown/50 uppercase tracking-widest mt-0.5 truncate">{item.branch.name}</p>
                                                    
                                                    <div className="flex flex-col gap-1 mt-3">
                                                        <p className="text-[10px] font-medium text-accent-brown/60 leading-tight">
                                                            {item.branch.address_line1}
                                                        </p>
                                                        {item.branch.lat && item.branch.lng && userLocation && (
                                                            <div className="flex items-center justify-between mt-3">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Truck className="w-3 h-3 text-brand/50" />
                                                                    <span className="text-[9px] font-black text-brand-dark uppercase tracking-widest">
                                                                        {calculateDist(userLocation.lat, userLocation.lng, item.branch.lat, item.branch.lng)}
                                                                    </span>
                                                                </div>
                                                                
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (routeBranch?.branch.id === item.branch.id && showDirections) {
                                                                            setShowDirections(false);
                                                                            setRouteBranch(null);
                                                                        } else {
                                                                            setRouteBranch(item);
                                                                            setSelectedBranch(item);
                                                                            setActiveMarker('branch');
                                                                            setMapCenter({ lat: item.branch.lat!, lng: item.branch.lng! });
                                                                            setShowDirections(true);
                                                                        }
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                                                                        routeBranch?.branch.id === item.branch.id && showDirections
                                                                        ? 'bg-brand text-white'
                                                                        : 'bg-accent-peach/20 text-brand-dark hover:bg-brand hover:text-white'
                                                                    }`}
                                                                >
                                                                    {routeBranch?.branch.id === item.branch.id && showDirections ? 'Hide Route' : 'View Directions'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.button>
                                    ))
                                )}
                            </div>
                        </motion.div>

                        {/* Map Area */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex-1 w-full bg-white rounded-[2rem] border border-accent-brown/5 shadow-xl shadow-accent-brown/5 overflow-hidden flex flex-col relative"
                        >
                            <div className="flex-1 w-full h-full relative">
                                <AnimatePresence mode="wait">
                                    {!showStreetView ? (
                                        <motion.div
                                            key="map-view"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0"
                                        >
                                            <Map
                                                mapId="4c730709b30c1be1"
                                                defaultZoom={11}
                                                center={mapCenter}
                                                gestureHandling={'greedy'}
                                                disableDefaultUI={false}
                                                mapTypeControl={true}
                                                streetViewControl={false}
                                                fullscreenControl={false}
                                            >
                                                {userLocation && (
                                                    <AdvancedMarker
                                                        position={userLocation}
                                                        onClick={() => setActiveMarker('user')}
                                                    >
                                                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg ring-4 ring-blue-500/20 cursor-pointer hover:scale-110 transition-transform">
                                                            <User className="w-4 h-4" />
                                                        </div>
                                                    </AdvancedMarker>
                                                )}

                                                {allBranches.map((item, index) => (
                                                    <AdvancedMarker
                                                        key={`${item.clinicName}-${item.branch.id}-${index}`}
                                                        position={{ lat: item.branch.lat!, lng: item.branch.lng! }}
                                                        onClick={() => {
                                                            setSelectedBranch(item);
                                                            setActiveMarker('branch');
                                                            setMapCenter({ lat: item.branch.lat!, lng: item.branch.lng! });
                                                        }}
                                                    >
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white border-2 border-white shadow-xl ring-4 cursor-pointer hover:scale-110 transition-all ${
                                                            selectedBranch?.branch.id === item.branch.id 
                                                            ? 'bg-brand ring-brand/40 scale-110 z-10' 
                                                            : 'bg-brand-dark ring-brand/10'
                                                        }`}>
                                                            <Store className="w-5 h-5" />
                                                        </div>
                                                    </AdvancedMarker>
                                                ))}

                                                {activeMarker === 'user' && userLocation && (
                                                    <InfoWindow
                                                        position={userLocation}
                                                        onCloseClick={() => setActiveMarker(null)}
                                                        headerDisabled={true}
                                                    >
                                                        <div className="p-4 w-[280px] font-sans flex flex-col gap-3 relative">
                                                            <button
                                                                onClick={() => setActiveMarker(null)}
                                                                className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                                                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                                                                    <User className="w-5 h-5 text-blue-600" />
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-sm font-black text-brand-dark leading-tight">My Location</h3>
                                                                    <p className="text-[10px] font-bold text-accent-brown/50 uppercase tracking-widest mt-0.5">Your Saved Address</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-2 mt-1">
                                                                <button
                                                                    onClick={() => setShowStreetView(true)}
                                                                    className="w-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center gap-2 group/svb shadow-sm"
                                                                >
                                                                    <Eye className="w-4 h-4 group-hover/svb:scale-110 transition-transform" />
                                                                    Street View
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </InfoWindow>
                                                )}

                                                {activeMarker === 'branch' && selectedBranch && selectedBranch.branch.lat && selectedBranch.branch.lng && (
                                                    <InfoWindow
                                                        position={{ lat: selectedBranch.branch.lat, lng: selectedBranch.branch.lng }}
                                                        onCloseClick={() => {
                                                            setActiveMarker(null);
                                                            setSelectedBranch(null);
                                                        }}
                                                        headerDisabled={true}
                                                    >
                                                        <div className="p-4 w-[280px] font-sans flex flex-col gap-3 relative">
                                                            <button
                                                                onClick={() => {
                                                                    setActiveMarker(null);
                                                                    setSelectedBranch(null);
                                                                }}
                                                                className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                                                                <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center shrink-0">
                                                                    <Store className="w-5 h-5 text-brand" />
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-sm font-black text-brand-dark leading-tight">{selectedBranch.clinicName}</h3>
                                                                    <p className="text-[10px] font-bold text-accent-brown/50 uppercase tracking-widest mt-0.5">{selectedBranch.branch.name}</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col gap-2">
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => setShowStreetView(true)}
                                                                        className="flex-1 bg-brand/10 text-brand-dark text-[10px] font-black uppercase tracking-widest py-3 rounded-xl hover:bg-brand hover:text-white transition-all flex items-center justify-center gap-2 group/svb shadow-sm"
                                                                    >
                                                                        <Eye className="w-4 h-4 group-hover/svb:scale-110 transition-transform" />
                                                                        Street View
                                                                    </button>
                                                                </div>
                                                                
                                                                {userLocation && (
                                                                    <div className="w-full bg-brand-dark/5 border border-brand-dark/10 p-3 rounded-xl flex items-center justify-between mt-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-6 h-6 rounded-lg bg-brand-dark/10 flex items-center justify-center text-brand-dark">
                                                                                <Truck className="w-3 h-3" />
                                                                            </div>
                                                                            <span className="text-[9px] font-black uppercase tracking-widest text-brand-dark/50">Distance</span>
                                                                        </div>
                                                                        <span className="text-xs font-black text-brand-dark">
                                                                            {calculateDist(userLocation.lat, userLocation.lng, selectedBranch.branch.lat, selectedBranch.branch.lng)}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </InfoWindow>
                                                )}

                                                {routeBranch && userLocation && routeBranch.branch.lat && routeBranch.branch.lng && showDirections && (
                                                    <DirectionsLine
                                                        userLat={userLocation.lat}
                                                        userLng={userLocation.lng}
                                                        clinicLat={routeBranch.branch.lat}
                                                        clinicLng={routeBranch.branch.lng}
                                                    />
                                                )}

                                            </Map>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="street-view"
                                            initial={{ opacity: 0, scale: 1.1 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="absolute inset-0 z-[100] flex flex-col bg-black"
                                        >
                                            {/* Close Button */}
                                            <div className="absolute top-6 right-6 z-[110] flex items-center justify-end pointer-events-none">
                                                <button
                                                    onClick={() => {
                                                        setShowStreetView(false);
                                                        streetViewInstance.current = null;
                                                    }}
                                                    className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center text-white hover:bg-brand hover:border-brand hover:scale-110 active:scale-95 transition-all pointer-events-auto shadow-2xl"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>

                                            {/* Street View Area (70%) */}
                                            <div className="flex-[0.7] relative">
                                                <div
                                                    ref={(el) => {
                                                        if (el && !streetViewInstance.current) {
                                                            let pos = null;
                                                            if (activeMarker === 'user' && userLocation) {
                                                                pos = { lat: userLocation.lat, lng: userLocation.lng };
                                                            } else if (activeMarker === 'branch' && selectedBranch?.branch.lat && selectedBranch?.branch.lng) {
                                                                pos = { lat: selectedBranch.branch.lat, lng: selectedBranch.branch.lng };
                                                            }

                                                            if (pos) {
                                                                const m = window.google?.maps;
                                                                if (m) {
                                                                    const pano = new m.StreetViewPanorama(el, {
                                                                        position: pos,
                                                                        pov: { heading: 0, pitch: 0 },
                                                                        zoom: 1,
                                                                        addressControl: false,
                                                                        fullscreenControl: false,
                                                                        panControl: false,
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
                                                        }
                                                    }}
                                                    className="w-full h-full"
                                                />
                                            </div>

                                            {/* Mini-Map Widget (30%) */}
                                            <div className="flex-[0.3] relative overflow-hidden border-t-4 border-brand/20 shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
                                                <Map
                                                    mapId="mini-map-sv"
                                                    center={panoPosition || (activeMarker === 'user' && userLocation ? userLocation : (selectedBranch?.branch.lat && selectedBranch?.branch.lng ? { lat: selectedBranch.branch.lat, lng: selectedBranch.branch.lng } : mapCenter))}
                                                    zoom={18}
                                                    disableDefaultUI={true}
                                                    gestureHandling={'none'}
                                                    className="w-full h-full grayscale-[0.3] contrast-[1.2]"
                                                >
                                                    {panoPosition && (
                                                        <AdvancedMarker position={panoPosition}>
                                                            <div 
                                                                className="w-12 h-12 flex items-center justify-center transition-transform duration-200"
                                                                style={{ transform: `rotate(${panoPov.heading}deg)` }}
                                                            >
                                                                <div className="w-6 h-6 bg-blue-500 rounded-full border-[3px] border-white shadow-2xl relative">
                                                                    {/* Directional Arrow */}
                                                                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[15px] border-b-blue-500 drop-shadow-lg" />
                                                                </div>
                                                            </div>
                                                        </AdvancedMarker>
                                                    )}

                                                    {/* User Marker on Mini-Map */}
                                                    {activeMarker === 'user' && userLocation && (
                                                        <AdvancedMarker position={userLocation}>
                                                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg">
                                                                <User className="w-4 h-4" />
                                                            </div>
                                                        </AdvancedMarker>
                                                    )}

                                                    {/* Target Branch Marker */}
                                                    {selectedBranch?.branch.lat && selectedBranch?.branch.lng && (
                                                        <AdvancedMarker position={{ lat: selectedBranch.branch.lat, lng: selectedBranch.branch.lng }}>
                                                            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-white border-2 border-white shadow-lg">
                                                                <Store className="w-4 h-4" />
                                                            </div>
                                                        </AdvancedMarker>
                                                    )}

                                                    {/* Directions on Mini-Map */}
                                                    {routeBranch && userLocation && routeBranch.branch.lat && routeBranch.branch.lng && showDirections && (
                                                        <DirectionsLine
                                                            userLat={userLocation.lat}
                                                            userLng={userLocation.lng}
                                                            clinicLat={routeBranch.branch.lat}
                                                            clinicLng={routeBranch.branch.lng}
                                                        />
                                                    )}
                                                </Map>
                                                
                                                {/* Mini-Map Overlay Info */}
                                                <div className="absolute bottom-4 left-4 bg-brand-dark/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20">
                                                    <p className="text-[8px] font-black text-white uppercase tracking-widest">Live Mini-Map</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </>
                )}

            </div>
        </DashboardLayout>
    );
}
