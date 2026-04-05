import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Map, useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
import { X, Search, MapPin, ChevronLeft, Locate, Eye, Map as MapIcon } from 'lucide-react';

interface PSGCBase {
    code: string;
    name: string;
}

interface GranularAddress {
    houseNumber: string;
    blockNumber: string;
    street: string;
    subdivision: string;
    sitio: string;
    barangay: string;
    city: string;
    district: string;
    province: string;
    zip: string;
    region: string;
}

const DetailInput: React.FC<{ label: string, value: string, onChange: (v: string) => void, placeholder: string }> = ({ label, value, onChange, placeholder }) => (
    <div className="space-y-2 group">
        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 pl-1 group-focus-within:text-[#EE4D2D] transition-colors">{label}</label>
        <input 
            type="text" 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            placeholder={placeholder}
            className="w-full bg-[#fcfcfc] border-2 border-gray-50 hover:border-[#EE4D2D]/20 hover:bg-white focus:border-[#EE4D2D]/30 focus:bg-white rounded-[1.25rem] py-4 px-5 text-[13px] font-black text-gray-800 outline-none transition-all placeholder:text-gray-200 cursor-text" 
        />
    </div>
);

const DetailSelect: React.FC<{ 
    label: string, 
    options: PSGCBase[], 
    value: string, 
    onChange: (v: string, name: string) => void, 
    disabled?: boolean,
    isBarangay?: boolean,
    loading?: boolean,
    readOnly?: boolean
}> = ({ label, options, value, onChange, disabled, isBarangay, loading, readOnly }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const displayName = isBarangay
        ? (options.find(o => o.name === value)?.name || value)
        : (options.find(o => o.code === value)?.name || value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(o => 
        o.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (opt: PSGCBase) => {
        onChange(opt.code, opt.name);
        setIsOpen(false);
        setSearch('');
    };

    if (readOnly) {
        return (
            <div className="space-y-2 group">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 pl-1">{label}</label>
                <div className="w-full bg-[#f8f8f8] border-2 border-gray-50 rounded-[1.25rem] py-4 px-5 text-[13px] font-black text-gray-800 cursor-default select-none flex items-center justify-between">
                    <span className={displayName ? 'text-gray-800' : 'text-gray-300'}>
                        {loading ? `Loading ${label}...` : (displayName || `—`)}
                    </span>
                    <span className="text-gray-300 text-[9px] font-black uppercase tracking-[0.15em]">Auto-filled</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2 relative" ref={dropdownRef}>
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 pl-1 group-focus-within:text-[#EE4D2D] transition-colors">{label}</label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    className={`w-full bg-[#fcfcfc] border-2 transition-all rounded-[1.25rem] py-4 px-5 text-[13px] font-black text-left flex items-center justify-between outline-none active:scale-[0.98]
                        ${isOpen ? 'border-[#EE4D2D]/20 bg-white ring-4 ring-[#EE4D2D]/5 shadow-sm' : 'border-gray-50 hover:border-[#EE4D2D]/20 hover:bg-white'}
                        ${disabled ? 'opacity-30 cursor-not-allowed bg-[#f5f5f5]' : 'cursor-pointer'}
                    `}
                    disabled={disabled}
                >
                    <span className={`truncate mr-2 ${displayName ? 'text-gray-800' : 'text-gray-300'}`}>
                        {loading ? `Loading ${label}...` : (displayName || `Select ${label}`)}
                    </span>
                    <ChevronLeft size={16} className={`transition-all duration-300 shrink-0 ${isOpen ? 'rotate-90 text-[#EE4D2D]' : '-rotate-90 text-gray-300'}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white rounded-[1.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden z-[1000] animate-in fade-in zoom-in-95 duration-200 origin-top">
                        <div className="p-3 border-b border-gray-50 flex items-center gap-3 bg-gray-50/30">
                            <Search size={16} className="text-gray-400" />
                            <input 
                                autoFocus
                                type="text"
                                placeholder={`Search ${label}...`}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-transparent border-none outline-none text-[12px] font-bold text-gray-800 w-full placeholder:text-gray-300"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                        <div className="max-h-[280px] overflow-y-auto custom-scrollbar overflow-x-hidden p-2">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt) => {
                                    const isSelected = isBarangay ? value === opt.name : value === opt.code;
                                    return (
                                        <button
                                            key={opt.code}
                                            type="button"
                                            onClick={() => handleSelect(opt)}
                                            className={`w-full px-4 py-3 rounded-xl text-left transition-all flex items-center justify-between group mb-0.5 active:scale-[0.97]
                                                ${isSelected ? 'bg-[#EE4D2D]/5' : 'hover:bg-[#EE4D2D]/5'}
                                            `}
                                        >
                                            <span className={`text-[13px] font-bold transition-colors truncate
                                                ${isSelected ? 'text-[#EE4D2D]' : 'text-gray-600 group-hover:text-[#EE4D2D]'}
                                            `}>
                                                {opt.name}
                                            </span>
                                            {isSelected && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#EE4D2D] animate-in zoom-in" />
                                            )}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="px-5 py-12 text-center">
                                    <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Search size={16} className="text-gray-200" />
                                    </div>
                                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No Results for "{search}"</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface MapPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelection: (address: string, lat: number, lng: number, components: google.maps.GeocoderAddressComponent[], granular: GranularAddress) => void;
    initialLocation?: { lat: number; lng: number };
    initialGranular?: GranularAddress;
}

const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 }; // Manila

const MapContent: React.FC<{
    inputRef: React.RefObject<HTMLInputElement | null>;
    setMarkerLocation: (loc: { lat: number; lng: number }) => void;
    setAddress: (addr: string) => void;
    updateReverseGeocode: (lat: number, lng: number) => void;
    setComponents: (comps: google.maps.GeocoderAddressComponent[]) => void;
    setMapInstance: (map: google.maps.Map | null) => void;
}> = ({ inputRef, setMarkerLocation, setAddress, updateReverseGeocode, setComponents, setMapInstance }) => {
    const map = useMap();
    const placesLibrary = useMapsLibrary('places');

    useEffect(() => {
        setMapInstance(map);
    }, [map, setMapInstance]);

    useEffect(() => {
        if (!map) return;
        // Move pin ONLY when the user finishes dragging — no click-to-pin
        const onDragEnd = () => {
            const center = map.getCenter();
            if (center) {
                const newLoc = { lat: center.lat(), lng: center.lng() };
                setMarkerLocation(newLoc);
                updateReverseGeocode(newLoc.lat, newLoc.lng);
            }
        };
        const dragEndListener = map.addListener('dragend', onDragEnd);
        return () => {
            dragEndListener.remove();
        };
    }, [map, setMarkerLocation, updateReverseGeocode]);

    useEffect(() => {
        if (!placesLibrary || !inputRef.current || !map) return;
        const autocomplete = new placesLibrary.Autocomplete(inputRef.current, {
            fields: ['geometry', 'formatted_address', 'name', 'address_components'],
            componentRestrictions: { country: 'ph' }
        });
        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry?.location) {
                const newLoc = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                setMarkerLocation(newLoc);
                setAddress(place.formatted_address || place.name || '');
                if (place.address_components) setComponents(place.address_components);
                map.panTo(newLoc);
                map.setZoom(18);
            }
        });
        return () => google.maps.event.clearInstanceListeners(autocomplete);
    }, [placesLibrary, map, inputRef, setMarkerLocation, setAddress, setComponents]);

    return null;
};

const MapPickerModal: React.FC<MapPickerModalProps> = ({ isOpen, onClose, onSelection, initialLocation, initialGranular }) => {
    const [markerLocation, setMarkerLocation] = useState(initialLocation || DEFAULT_CENTER);
    const [address, setAddress] = useState<string>('');
    const [components, setComponents] = useState<google.maps.GeocoderAddressComponent[]>([]);
    const [step, setStep] = useState<'selection' | 'map' | 'details'>('selection');
    const [searchQuery, setSearchQuery] = useState('');
    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
    const [showStreetView, setShowStreetView] = useState(false);
    const [nearestLandmark, setNearestLandmark] = useState<{ name: string, distance: number } | null>(null);
    const streetViewInstance = useRef<google.maps.StreetViewPanorama | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [regions, setRegions] = useState<PSGCBase[]>([]);
    const [provinces, setProvinces] = useState<PSGCBase[]>([]);
    const [cities, setCities] = useState<PSGCBase[]>([]);
    const [barangays, setBarangays] = useState<PSGCBase[]>([]);
    const [loadingPSGC, setLoadingPSGC] = useState({ provinces: false, cities: false, barangays: false });
    const [loadingRegions, setLoadingRegions] = useState(false);

    const [selectedRegion, setSelectedRegion] = useState<string>('');
    const [selectedProvince, setSelectedProvince] = useState<string>('');
    const [selectedCity, setSelectedCity] = useState<string>('');

    const [granular, setGranular] = useState<GranularAddress>(initialGranular || {
        houseNumber: '', blockNumber: '', street: '', subdivision: '', sitio: '', barangay: '', city: '', district: '', province: '', zip: '', region: 'Philippines'
    });

    const updateField = (field: keyof GranularAddress, value: string) => {
        setGranular(prev => ({ ...prev, [field]: value }));
    };

    const fetchRegions = useCallback(async () => {
        setLoadingRegions(true);
        try {
            const res = await fetch('https://psgc.cloud/api/regions', { cache: 'no-cache' });
            if (!res.ok) throw new Error("Cloud Endpoint Failure");
            const data = await res.json();
            if (data && Array.isArray(data)) {
                setRegions(data);
                return;
            }
        } catch (err) {
            console.warn('Fallback to secondary PSGC service...', err);
            try {
                const res = await fetch('https://psgc.gitlab.io/api/regions.json');
                const data = await res.json();
                if (data && Array.isArray(data)) { setRegions(data); return; }
            } catch (err2) {
                console.error("All PSGC Remote Connections Failed.");
            }
        } finally {
            setLoadingRegions(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen && regions.length === 0) fetchRegions();
    }, [isOpen, fetchRegions, regions.length]);

    useEffect(() => {
        if (!selectedRegion || selectedRegion === '1300000000') {
            setProvinces([]);
            return;
        }
        setLoadingPSGC(prev => ({ ...prev, provinces: true }));
        fetch(`https://psgc.cloud/api/regions/${selectedRegion}/provinces`)
            .then(res => res.json())
            .then(data => setProvinces(data))
            .finally(() => setLoadingPSGC(prev => ({ ...prev, provinces: false })));
    }, [selectedRegion]);

    useEffect(() => {
        if (!selectedProvince && !selectedRegion) {
            setCities([]);
            return;
        }
        const endpoint = selectedProvince 
            ? `https://psgc.cloud/api/provinces/${selectedProvince}/cities-municipalities`
            : `https://psgc.cloud/api/regions/${selectedRegion}/cities-municipalities`;
        setLoadingPSGC(prev => ({ ...prev, cities: true }));
        fetch(endpoint)
            .then(res => res.json())
            .then(data => setCities(data))
            .finally(() => setLoadingPSGC(prev => ({ ...prev, cities: false })));
    }, [selectedProvince, selectedRegion]);

    useEffect(() => {
        if (!selectedCity) {
            setBarangays([]);
            return;
        }
        const fetchBrgys = async (code: string) => {
            setLoadingPSGC(prev => ({ ...prev, barangays: true }));
            try {
                const res = await fetch(`https://psgc.cloud/api/cities-municipalities/${code}/barangays`);
                const data = await res.json();
                if (data && Array.isArray(data) && data.length > 0) {
                    setBarangays(data);
                } else {
                    const subRes = await fetch(`https://psgc.cloud/api/cities-municipalities/${code}/sub-municipalities`);
                    const subData = await subRes.json();
                    if (subData && subData.length > 0) {
                        const all: PSGCBase[] = [];
                        for (const s of subData) {
                            const bR = await fetch(`https://psgc.cloud/api/sub-municipalities/${s.code}/barangays`);
                            const bD = await bR.json();
                            if (bD) all.push(...bD);
                        }
                        setBarangays(all.sort((a, b) => a.name.localeCompare(b.name)));
                    }
                }
            } finally { setLoadingPSGC(prev => ({ ...prev, barangays: false })); }
        };
        fetchBrgys(selectedCity);
    }, [selectedCity]);

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('map-modal-active');
            if (initialGranular) setGranular(initialGranular);
        } else {
            document.body.classList.remove('map-modal-active');
        }
        return () => document.body.classList.remove('map-modal-active');
    }, [isOpen, initialGranular]);

    const geocodingLibrary = useMapsLibrary('geocoding');
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371000;
        const toRad = (v: number) => v * Math.PI / 180;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a = Math.sin(dLat/2)**2 +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLng/2)**2;
        return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    };

    const findNearestLandmark = useCallback((lat: number, lng: number, geocodeResults?: google.maps.GeocoderResult[]) => {
        if (!mapInstance) return;
        const service = new google.maps.places.PlacesService(mapInstance);

        // Expand search radius but SORT by true distance and cap at 50m
        service.nearbySearch({
            location: { lat, lng },
            radius: 300,
            type: 'establishment'
        }, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                // Sort every result by actual Haversine distance — pick the true closest
                const sorted = results
                    .filter(r => r.geometry?.location && r.name)
                    .map(r => ({
                        name: r.name!,
                        distance: haversineMeters(
                            lat, lng,
                            r.geometry!.location!.lat(),
                            r.geometry!.location!.lng()
                        )
                    }))
                    .sort((a, b) => a.distance - b.distance);

                const closest = sorted[0];

                // Only show landmark if it is genuinely close (within 50m)
                if (closest && closest.distance <= 50) {
                    setNearestLandmark(closest);
                    return;
                }
            }

            // Fallback: extract the street name from reverse geocoding address components
            if (geocodeResults && geocodeResults[0]) {
                const components = geocodeResults[0].address_components;
                const route = components.find(c => c.types.includes('route'));
                const sublocality = components.find(c => c.types.includes('sublocality_level_1') || c.types.includes('neighborhood'));
                const fallbackName = route?.long_name || sublocality?.long_name;
                if (fallbackName) {
                    // Distance from pin to the nearest road is essentially 0 (it's the street)
                    setNearestLandmark({ name: fallbackName, distance: 0 });
                    return;
                }
            }

            // Nothing meaningful found
            setNearestLandmark(null);
        });
    }, [mapInstance]);

    const handleReverseGeocode = useCallback((lat: number, lng: number) => {
        if (!geocodingLibrary || !apiKey) return;
        const geocoder = new geocodingLibrary.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
                const formatted = results[0].formatted_address;
                setAddress(formatted);
                if (inputRef.current) inputRef.current.value = formatted;
                
                // Pass geocode results so street-name fallback is available
                findNearestLandmark(lat, lng, results);
            }
        });
    }, [geocodingLibrary, apiKey, findNearestLandmark]);

    // Google-Maps Level Accuracy Sync: Pan to form address immediately on Step 3 entry
    useEffect(() => {
        if (step === 'map' && geocodingLibrary && mapInstance) {
            const fullManualAddr = [granular.street, granular.barangay, granular.city, granular.province].filter(Boolean).join(', ');
            if (fullManualAddr.length > 5) {
                const geocoder = new geocodingLibrary.Geocoder();
                geocoder.geocode({ address: fullManualAddr, componentRestrictions: { country: 'ph' } }, (results, status) => {
                    if (status === 'OK' && results?.[0]?.geometry?.location) {
                        const loc = { lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() };
                        setMarkerLocation(loc);
                        mapInstance.panTo(loc);
                        mapInstance.setZoom(18);
                    }
                });
            }
        }
    }, [step, geocodingLibrary, mapInstance, granular.city, granular.province, granular.barangay, granular.street]);

    useEffect(() => {
        if (isOpen && (initialLocation || markerLocation)) {
            handleReverseGeocode(markerLocation.lat, markerLocation.lng);
        }
    }, [isOpen, initialLocation, handleReverseGeocode, markerLocation.lat, markerLocation.lng]);

    const renderStep = () => {
        switch (step) {
            case 'selection':
                return (
                    <div className="flex-grow flex flex-col lg:flex-row bg-[#F5F5F5] overflow-hidden">
                        <div className="w-full lg:w-[450px] flex flex-col bg-white border-r border-gray-100">
                            <div className="p-4 flex items-center gap-3">
                                <button onClick={onClose} className="text-[#EE4D2D] hover:scale-110 active:scale-90 transition-transform">
                                <X size={24} />
                            </button>
                                <div className="flex-grow flex items-center bg-[#F1F1F1] rounded-lg px-3 py-2 gap-2">
                                    <Search size={18} className="text-gray-400" />
                                    <input type="text" placeholder="Search Region" className="bg-transparent border-none outline-none text-sm w-full font-bold" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex-grow overflow-y-auto no-scrollbar">
                                <div className="p-4 bg-[#F5F5F5] text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Region</div>
                                {loadingRegions && <div className="p-12 flex flex-col items-center gap-4 justify-center"><div className="w-8 h-8 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin" /></div>}
                                {regions.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).map((r) => (
                                    <button key={r.code} onClick={() => { setSelectedRegion(r.code); updateField('region', r.name); setStep('details'); }} className="w-full p-5 text-left border-b border-gray-100 flex items-center justify-between hover:bg-[#EE4D2D]/5 group transition-all active:scale-[0.99]">
                                        <div className="flex items-center gap-4"><div className="w-2 h-2 rounded-full bg-gray-200 group-hover:bg-[#EE4D2D] transition-colors" /><span className="text-[13px] font-black text-gray-600 group-hover:text-[#EE4D2D] transition-colors">{r.name}</span></div>
                                        <ChevronLeft size={16} className="rotate-180 text-gray-200 group-hover:text-[#EE4D2D] transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="hidden lg:flex flex-grow relative bg-gray-900 items-center justify-center">
                            <div className="absolute inset-0 opacity-40"><Map defaultCenter={markerLocation} defaultZoom={12} disableDefaultUI={true} /></div>
                            <div className="relative text-center"><div className="w-20 h-20 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center text-orange-500 mx-auto mb-6"><MapPin size={40} /></div><h4 className="text-2xl font-black text-white tracking-tighter">Choose Region</h4></div>
                        </div>
                    </div>
                );
            case 'map':
                return (
                    <div className="flex-grow flex flex-col relative overflow-hidden">
                        <Map mapId={import.meta.env.VITE_GOOGLE_MAPS_ID} defaultCenter={markerLocation} defaultZoom={18} disableDefaultUI={true} gestureHandling='greedy' style={{ width: '100%', height: '100%' }}>
                            <MapContent inputRef={inputRef} setMarkerLocation={setMarkerLocation} setAddress={setAddress} updateReverseGeocode={handleReverseGeocode} setComponents={setComponents} setMapInstance={setMapInstance} />
                        </Map>
                        
                        <div className="absolute top-6 left-6 right-6 z-20 flex flex-col gap-3">
                            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 flex items-center px-5 py-2 gap-3 focus-within:ring-4 focus-within:ring-[#EE4D2D]/10 transition-all">
                                <Search size={22} className="text-[#EE4D2D]" />
                                <input ref={inputRef} type="text" placeholder="Search specific building or landmark..." className="flex-grow py-3 bg-transparent border-none outline-none text-[15px] font-black text-gray-800 placeholder:text-gray-300 placeholder:font-bold" />
                                <div className="w-[1px] h-6 bg-gray-100 mx-2"></div>
                                <button onClick={() => mapInstance?.panTo(markerLocation)} className="p-2 text-gray-400 hover:text-[#EE4D2D] active:scale-90 transition-all"><Locate size={20} /></button>
                            </div>
                            <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] p-5 shadow-xl border border-white/50 flex items-center gap-4 animate-in slide-in-from-top duration-500">
                                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 shadow-inner shrink-0"><Locate size={24} className="animate-pulse" /></div>
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-[10px] font-black uppercase text-orange-500 tracking-[0.3em]">Precision Location</h4>
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                        </div>
                                        {nearestLandmark && (
                                            <div className="bg-gray-900/5 px-3 py-1 rounded-full flex items-center gap-1.5 border border-gray-900/5">
                                                <div className="w-1 h-1 bg-gray-400 rounded-full" />
                                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest truncate max-w-[140px]">
                                                    {nearestLandmark.distance === 0
                                                        ? `On ${nearestLandmark.name}`
                                                        : `${nearestLandmark.distance}m · ${nearestLandmark.name}`
                                                    }
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm font-black text-gray-800 line-clamp-1 mt-1 truncate">
                                        {[granular.houseNumber, granular.blockNumber, granular.street, granular.subdivision, granular.barangay, granular.city, granular.province].filter(Boolean).join(', ')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                            <div className="relative flex flex-col items-center mb-[50px]">
                                <div className="w-16 h-16 bg-white rounded-[1.5rem] shadow-2xl flex items-center justify-center text-[#EE4D2D] border-4 border-white animate-in zoom-in duration-300">
                                    <MapPin size={32} />
                                </div>
                                <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[15px] border-t-white mt-[-2px] drop-shadow-lg" />
                                <div className="w-5 h-5 bg-red-600 rounded-full blur-[3px] absolute bottom-[-55px] opacity-20 animate-ping" />
                            </div>
                        </div>

                        {/* Drag hint */}
                        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                            <div className="bg-black/50 backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest opacity-70">
                                Drag map to move pin · or use street view
                            </div>
                        </div>
                        <button onClick={() => setShowStreetView(!showStreetView)} className={`absolute bottom-28 left-6 px-6 h-14 rounded-[1.25rem] shadow-2xl flex items-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all z-20 active:scale-95 ${showStreetView ? 'bg-[#EE4D2D] text-white hover:bg-[#d43d22]' : 'bg-white text-gray-600 border border-gray-100 hover:bg-[#EE4D2D]/5 hover:text-[#EE4D2D] hover:border-[#EE4D2D]/20'}`}>
                            {showStreetView ? <MapIcon size={18} /> : <Eye size={18} />} {showStreetView ? 'Exit Street View' : 'Real-World Check'}
                        </button>

                        <button onClick={() => mapInstance?.panTo(markerLocation)} className="absolute bottom-28 right-6 w-14 h-14 bg-white rounded-[1.25rem] shadow-2xl flex items-center justify-center text-gray-400 border border-gray-100 z-20 hover:bg-[#EE4D2D] hover:text-white hover:border-transparent active:scale-95 transition-all">
                            <Locate size={22} />
                        </button>

                        {showStreetView && (
                            <div className="absolute inset-0 z-30 overflow-hidden flex flex-col">
                                {/* Street View renders here */}
                                <div ref={el => {
                                    if (el && !streetViewInstance.current) {
                                        streetViewInstance.current = new google.maps.StreetViewPanorama(el, {
                                            position: markerLocation,
                                            pov: { heading: 0, pitch: 0 },
                                            zoom: 1,
                                            addressControl: false,
                                            fullscreenControl: false,
                                            motionTracking: false,
                                            motionTrackingControl: false,
                                        });
                                    } else if (el && streetViewInstance.current && showStreetView) {
                                        streetViewInstance.current.setPosition(markerLocation);
                                    }
                                }} className="flex-grow w-full" />

                                {/* Street View Controls */}
                                <div className="absolute top-5 left-5 right-5 z-40 flex items-center justify-between gap-3 pointer-events-none">
                                    <button 
                                        onClick={() => { setShowStreetView(false); streetViewInstance.current = null; }} 
                                        className="px-6 py-4 bg-white rounded-2xl shadow-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-[#EE4D2D] hover:text-white active:scale-95 transition-all pointer-events-auto"
                                    >
                                        <ChevronLeft size={16}/> Back to Map
                                    </button>
                                    <button 
                                        onClick={() => {
                                            const pano = streetViewInstance.current;
                                            if (!pano) return;
                                            const pos = pano.getPosition();
                                            if (pos) {
                                                const newLoc = { lat: pos.lat(), lng: pos.lng() };
                                                setMarkerLocation(newLoc);
                                                mapInstance?.panTo(newLoc);
                                                handleReverseGeocode(newLoc.lat, newLoc.lng);
                                                setShowStreetView(false);
                                                streetViewInstance.current = null;
                                            }
                                        }}
                                        className="px-8 py-4 bg-[#EE4D2D] text-white rounded-2xl shadow-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-[#d43d22] hover:shadow-xl active:scale-95 transition-all pointer-events-auto"
                                    >
                                        <MapPin size={14}/> Pin This Location
                                    </button>
                                </div>
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
                                    <div className="bg-black/60 backdrop-blur-sm text-white px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest">
                                        Walk around · tap "Pin This Location" to drop pin
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-6 bg-white border-t border-gray-100 flex items-center gap-4 z-40">
                            <button onClick={() => setStep('details')} className="px-6 py-5 bg-gray-50 rounded-2xl font-black text-[10px] text-gray-400 uppercase tracking-widest flex items-center gap-2 hover:bg-[#EE4D2D]/10 hover:text-[#EE4D2D] active:scale-95 transition-all"><ChevronLeft size={16}/> BACK</button>
                            <div className="flex-grow text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Verify & Save Exactly on Google Maps</div>
                            <button onClick={() => { onSelection(address, markerLocation.lat, markerLocation.lng, components, granular); onClose(); }} className="px-12 py-5 bg-[#EE4D2D] text-white rounded-[1.25rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all">Confirm & Save</button>
                        </div>
                    </div>
                );
            case 'details':
                return (
                    <div className="flex-grow flex flex-col bg-white overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center gap-4 bg-white">
                            <button onClick={() => setStep('selection')} className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl hover:bg-[#EE4D2D]/10 hover:text-[#EE4D2D] active:scale-90 transition-all"><X size={20}/></button>
                            <h3 className="text-xl font-bold text-gray-800 tracking-tighter">Finalize Address Details</h3>
                        </div>
                        <div className="flex-grow overflow-y-auto p-8 space-y-8 no-scrollbar">
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">PSGC Standardized Area</h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <DetailSelect label="Region" options={regions} value={selectedRegion} readOnly={true} onChange={(v, n) => { setSelectedRegion(v); updateField('region', n); }} />
                                    <DetailSelect label="Province" options={selectedRegion === '1300000000' ? [{ code: 'NCR', name: 'Metro Manila' }] : provinces} value={selectedRegion === '1300000000' ? 'NCR' : selectedProvince} disabled={!selectedRegion || selectedRegion === '1300000000'} loading={loadingPSGC.provinces} onChange={(v, n) => { setSelectedProvince(v); setSelectedCity(''); updateField('province', n); }} />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <DetailSelect label="City / Municipality" options={cities} value={selectedCity} disabled={!selectedRegion} loading={loadingPSGC.cities} onChange={(v, n) => { setSelectedCity(v); updateField('city', n); updateField('barangay', ''); }} />
                                    <DetailSelect label="Barangay" options={barangays} value={granular.barangay} isBarangay disabled={!selectedCity} loading={loadingPSGC.barangays} onChange={(_v, n) => updateField('barangay', n)} />
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Building & Street Details</h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <DetailInput label="HOUSE NUMBER / FLOOR" value={granular.houseNumber} onChange={v => updateField('houseNumber', v)} placeholder="e.g. 123" />
                                    <DetailInput label="BLOCK & LOT" value={granular.blockNumber} onChange={v => updateField('blockNumber', v)} placeholder="Blk 1 Lot 2" />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <DetailInput label="STREET / ROAD" value={granular.street} onChange={v => updateField('street', v)} placeholder="Street Name" />
                                    <DetailInput label="VILLAGE / SUBDIVISION" value={granular.subdivision} onChange={v => updateField('subdivision', v)} placeholder="Building/Subd" />
                                </div>
                                <div className="grid grid-cols-3 gap-6">
                                    <DetailInput label="Sitio" value={granular.sitio} onChange={v => updateField('sitio', v)} placeholder="Sitio" />
                                    <DetailInput label="District" value={granular.district} onChange={v => updateField('district', v)} placeholder="District" />
                                    <DetailInput label="ZIP" value={granular.zip} onChange={v => updateField('zip', v)} placeholder="ZIP" />
                                </div>
                            </div>
                        </div>
                        <div className="p-8 border-t border-gray-50 flex bg-white">
                            <button onClick={() => setStep('map')} className="flex-grow bg-[#EE4D2D] text-white py-5 rounded-[1.25rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-orange-500/30 transition-all hover:bg-[#d43d22] hover:shadow-xl active:scale-[0.99]">Verify Exact Google Map Location</button>
                        </div>
                    </div>
                );
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 lg:p-0 transition-opacity">
            <div className="bg-white w-full max-w-6xl h-full lg:h-[90vh] lg:rounded-[3rem] overflow-hidden shadow-[0_0_150px_rgba(0,0,0,0.5)] flex flex-col animate-in zoom-in-95 duration-300">
                {renderStep()}
            </div>
        </div>,
        document.body
    );
};

export default MapPickerModal;
