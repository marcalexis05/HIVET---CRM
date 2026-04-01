import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Map, Marker, useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
import { X, Search, MapPin } from 'lucide-react';

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

interface MapPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelection: (address: string, lat: number, lng: number, components: google.maps.GeocoderAddressComponent[], granular: GranularAddress) => void;
    initialLocation?: { lat: number; lng: number };
    initialGranular?: GranularAddress;
}

const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 }; // Manila

// Internal component to access the map instance via useMap()
const MapContent: React.FC<{
    inputRef: React.RefObject<HTMLInputElement | null>;
    markerLocation: { lat: number; lng: number };
    setMarkerLocation: (loc: { lat: number; lng: number }) => void;
    setAddress: (addr: string) => void;
    onMarkerDragEnd: (e: google.maps.MapMouseEvent) => void;
    setComponents: (comps: google.maps.GeocoderAddressComponent[]) => void;
    setMapInstance: (map: google.maps.Map | null) => void;
}> = ({ inputRef, markerLocation, setMarkerLocation, setAddress, onMarkerDragEnd, setComponents, setMapInstance }) => {
    const map = useMap();
    const placesLibrary = useMapsLibrary('places');

    useEffect(() => {
        setMapInstance(map);
    }, [map, setMapInstance]);

    // Initialize Autocomplete
    useEffect(() => {
        if (!placesLibrary || !inputRef.current || !map) return;

        const autocomplete = new placesLibrary.Autocomplete(inputRef.current, {
            fields: ['geometry', 'formatted_address', 'name', 'address_components'],
            componentRestrictions: { country: 'ph' }
        });

        // Sync initial bounds
        const updateBounds = () => {
            const bounds = map.getBounds();
            if (bounds) autocomplete.setBounds(bounds);
        };

        if (map.getBounds()) updateBounds();
        const listener = map.addListener('bounds_changed', updateBounds);

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry?.location) {
                const newLoc = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                };
                setMarkerLocation(newLoc);
                setAddress(place.formatted_address || place.name || '');
                if (place.address_components) setComponents(place.address_components);
                map.panTo(newLoc);
                map.setZoom(17);
            }
        });

        return () => {
            google.maps.event.clearInstanceListeners(autocomplete);
            listener.remove();
        };
    }, [placesLibrary, map, inputRef, setMarkerLocation, setAddress, setComponents]);

    return (
        <Marker
            position={markerLocation}
            draggable={true}
            onDragEnd={onMarkerDragEnd}
        />
    );
};

const MapPickerModal: React.FC<MapPickerModalProps> = ({ isOpen, onClose, onSelection, initialLocation, initialGranular }) => {
    const [markerLocation, setMarkerLocation] = useState(initialLocation || DEFAULT_CENTER);
    const [address, setAddress] = useState<string>('');
    const [components, setComponents] = useState<google.maps.GeocoderAddressComponent[]>([]);
    const [step, setStep] = useState<'selection' | 'map' | 'details'>('selection');
    const [searchQuery, setSearchQuery] = useState('');
    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // PSGC State
    const [regions, setRegions] = useState<PSGCBase[]>([]);
    const [provinces, setProvinces] = useState<PSGCBase[]>([]);
    const [cities, setCities] = useState<PSGCBase[]>([]);
    const [barangays, setBarangays] = useState<PSGCBase[]>([]);
    const [loadingPSGC, setLoadingPSGC] = useState({
        provinces: false,
        cities: false,
        barangays: false
    });

    const [selectedRegion, setSelectedRegion] = useState<string>('');
    const [selectedProvince, setSelectedProvince] = useState<string>('');
    const [selectedCity, setSelectedCity] = useState<string>('');

    // Granular Fields State
    const [granular, setGranular] = useState<GranularAddress>(initialGranular || {
        houseNumber: '',
        blockNumber: '',
        street: '',
        subdivision: '',
        sitio: '',
        barangay: '',
        city: '',
        district: '',
        province: '',
        zip: '',
        region: 'Philippines'
    });

    const updateField = (field: keyof GranularAddress, value: string) => {
        setGranular(prev => ({ ...prev, [field]: value }));
    };

    // Fetch Regions
    useEffect(() => {
        if (!isOpen) return;
        fetch('https://psgc.cloud/api/regions')
            .then(res => res.json())
            .then(data => setRegions(data))
            .catch(err => console.error('Error fetching regions:', err));
    }, [isOpen]);

    // Fetch Provinces when region changes
    useEffect(() => {
        if (!selectedRegion) {
            setProvinces([]);
            return;
        }
        // NCR Fix: NCR (Region 13) has no provinces
        if (selectedRegion === '1300000000') {
            setProvinces([]);
            return;
        }
        setLoadingPSGC(prev => ({ ...prev, provinces: true }));
        fetch(`https://psgc.cloud/api/regions/${selectedRegion}/provinces`)
            .then(res => res.json())
            .then(data => setProvinces(data))
            .catch(err => console.error('Error fetching provinces:', err))
            .finally(() => setLoadingPSGC(prev => ({ ...prev, provinces: false })));
    }, [selectedRegion]);

    // Fetch Cities when province or region changes
    useEffect(() => {
        if (!selectedProvince && !selectedRegion) {
            setCities([]);
            return;
        }
        
        // Use province endpoint if province is selected, otherwise use region endpoint (for NCR)
        const endpoint = selectedProvince 
            ? `https://psgc.cloud/api/provinces/${selectedProvince}/cities-municipalities`
            : `https://psgc.cloud/api/regions/${selectedRegion}/cities-municipalities`;
            
        setLoadingPSGC(prev => ({ ...prev, cities: true }));
        fetch(endpoint)
            .then(res => res.json())
            .then(data => setCities(data))
            .catch(err => console.error('Error fetching cities:', err))
            .finally(() => setLoadingPSGC(prev => ({ ...prev, cities: false })));
    }, [selectedProvince, selectedRegion]);

    // Fetch Barangays when city changes
    useEffect(() => {
        if (!selectedCity) {
            setBarangays([]);
            return;
        }

        const fetchBarangays = async (code: string) => {
            setLoadingPSGC(prev => ({ ...prev, barangays: true }));
            try {
                // Try standard city-level fetch
                const res = await fetch(`https://psgc.cloud/api/cities-municipalities/${code}/barangays`);
                const data = await res.json();
                
                if (data && data.length > 0) {
                    setBarangays(data);
                } else {
                    // Manila Fix: If empty, check for sub-municipalities (Districts)
                    const subRes = await fetch(`https://psgc.cloud/api/cities-municipalities/${code}/sub-municipalities`);
                    const subData = await subRes.json();
                    
                    if (subData && subData.length > 0) {
                        const allBarangays: PSGCBase[] = [];
                        for (const sub of subData) {
                            const bRes = await fetch(`https://psgc.cloud/api/sub-municipalities/${sub.code}/barangays`);
                            const bData = await bRes.json();
                            if (bData) allBarangays.push(...bData);
                        }
                        setBarangays(allBarangays.sort((a, b) => a.name.localeCompare(b.name)));
                    } else {
                        setBarangays([]);
                    }
                }
            } catch (err) {
                console.error('Error fetching barangays:', err);
                setBarangays([]);
            } finally {
                setLoadingPSGC(prev => ({ ...prev, barangays: false }));
            }
        };

        fetchBarangays(selectedCity);
    }, [selectedCity]);

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('map-modal-active');
            if (initialGranular) {
                setGranular(initialGranular);
            }
        } else {
            document.body.classList.remove('map-modal-active');
        }
        return () => document.body.classList.remove('map-modal-active');
    }, [isOpen, initialGranular]);
    
    const geocodingLibrary = useMapsLibrary('geocoding');
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    const handleReverseGeocode = useCallback((lat: number, lng: number) => {
        if (!geocodingLibrary || !apiKey) return;
        
        const geocoder = new geocodingLibrary.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
                // We don't want to auto-fill the granular fields here anymore as per request,
                // but we keep the formatted address for reference if needed.
                // setAddress(results[0].formatted_address); 
            }
        });
    }, [geocodingLibrary, apiKey]);

    useEffect(() => {
        if (isOpen && (initialLocation || markerLocation)) {
            handleReverseGeocode(markerLocation.lat, markerLocation.lng);
        }
    }, [isOpen, initialLocation, handleReverseGeocode, markerLocation.lat, markerLocation.lng]);

    const onMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const newLoc = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            setMarkerLocation(newLoc);
            handleReverseGeocode(newLoc.lat, newLoc.lng);
        }
    };

    const placesLibrary = useMapsLibrary('places');

    const handleNearbyLandmark = useCallback((loc: { lat: number, lng: number }) => {
        if (!placesLibrary || !mapInstance) return;

        const service = new placesLibrary.PlacesService(mapInstance);
        service.nearbySearch(
            {
                location: loc,
                radius: 300,
                type: 'point_of_interest'
            },
            (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results?.[0]) {
                    const landmark = results[0];
                    const landmarkLabel = landmark.name || landmark.vicinity;
                    if (landmarkLabel) {
                        setAddress(`Near ${landmarkLabel}`);
                        if (inputRef.current) {
                            inputRef.current.value = `Near ${landmarkLabel}`;
                        }
                    }
                }
            }
        );
    }, [placesLibrary, mapInstance]);

    // Automate Landmark Detection when marker moves
    useEffect(() => {
        if (isOpen && markerLocation && mapInstance) {
            const timer = setTimeout(() => {
                handleNearbyLandmark(markerLocation);
            }, 1000); 
            return () => clearTimeout(timer);
        }
    }, [isOpen, markerLocation, mapInstance, handleNearbyLandmark]);

    // Manual Fields -> Map Sync (Automated)
    useEffect(() => {
        if (!isOpen || !geocodingLibrary || !mapInstance) return;
        
        const fullManualAddr = [granular.street, granular.barangay, granular.city, granular.province].filter(Boolean).join(', ');
        if (!fullManualAddr || fullManualAddr.length < 5) return;

        const timer = setTimeout(() => {
            const geocoder = new geocodingLibrary.Geocoder();
            geocoder.geocode({ address: fullManualAddr, componentRestrictions: { country: 'ph' } }, (results, status) => {
                if (status === 'OK' && results?.[0]?.geometry?.location) {
                    const newLoc = {
                        lat: results[0].geometry.location.lat(),
                        lng: results[0].geometry.location.lng()
                    };
                    // Update marker if distance is significant or marker is at default
                    setMarkerLocation(newLoc);
                    mapInstance.panTo(newLoc);
                }
            });
        }, 2000); // 2s debounce for typing

        return () => clearTimeout(timer);
    }, [granular.street, granular.barangay, granular.city, granular.province, isOpen, geocodingLibrary, mapInstance]);

    const renderStep = () => {
        switch (step) {
            case 'selection':
                return (
                    <div className="flex-grow flex flex-col lg:flex-row bg-[#F5F5F5] overflow-hidden">
                        {/* Left Side: Search & Selection */}
                        <div className="w-full lg:w-[450px] flex flex-col bg-white border-r border-gray-100">
                            <div className="p-4 flex items-center gap-3">
                                <button onClick={onClose} className="text-orange-500"><X size={24} /></button>
                                <div className="flex-grow flex items-center bg-[#F1F1F1] rounded-lg px-3 py-2 gap-2">
                                    <Search size={18} className="text-gray-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search City, District or Postal Code"
                                        className="bg-transparent border-none outline-none text-sm w-full"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="px-4 pb-4">
                                <button 
                                    onClick={() => {
                                        if (navigator.geolocation) {
                                            navigator.geolocation.getCurrentPosition((pos) => {
                                                const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                                                setMarkerLocation(newLoc);
                                                handleReverseGeocode(newLoc.lat, newLoc.lng);
                                                setStep('map');
                                            });
                                        }
                                    }}
                                    className="w-full bg-orange-50 p-4 rounded-xl flex items-center justify-center gap-2 text-orange-500 font-bold border border-orange-100 active:scale-95 transition-all shadow-sm"
                                >
                                    <MapPin size={20} />
                                    Use My Current Location
                                </button>
                            </div>

                            <div className="flex-grow overflow-y-auto no-scrollbar">
                                <div className="p-4 bg-[#F5F5F5] text-xs font-black text-gray-400 uppercase tracking-widest">Regions</div>
                                {regions
                                    .filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .map((region) => (
                                    <button 
                                        key={region.code}
                                        onClick={() => {
                                            setSelectedRegion(region.code);
                                            updateField('region', region.name);
                                            // Proactive: Move map to region and go to next step
                                            if (geocodingLibrary) {
                                                const geocoder = new geocodingLibrary.Geocoder();
                                                geocoder.geocode({ address: region.name, componentRestrictions: { country: 'ph' } }, (results, status) => {
                                                    if (status === 'OK' && results?.[0]?.geometry?.location) {
                                                        const newLoc = { lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() };
                                                        setMarkerLocation(newLoc);
                                                        setStep('map');
                                                    }
                                                });
                                            } else {
                                                setStep('map');
                                            }
                                        }}
                                        className={`w-full p-4 text-left border-b border-gray-50 flex items-center justify-between group transition-all ${selectedRegion === region.code ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${selectedRegion === region.code ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-orange-100 group-hover:text-orange-500'}`}>
                                                {region.name.charAt(0)}
                                            </span>
                                            <span className={`text-sm font-bold ${selectedRegion === region.code ? 'text-orange-600' : 'text-gray-700'}`}>{region.name}</span>
                                        </div>
                                        {selectedRegion === region.code && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />}
                                    </button>
                                ))}
                            </div>

                            <div className="p-4 bg-white border-t border-gray-50">
                                <button 
                                    onClick={() => setStep('map')}
                                    className="w-full bg-[#EE4D2D] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all"
                                >
                                    Go to Map Picking
                                </button>
                            </div>
                        </div>

                        {/* Right Side: Map Preview (Hidden on Mobile) */}
                        <div className="hidden lg:flex flex-grow relative bg-[#F5F5F5] items-center justify-center">
                            <div className="absolute inset-0 opacity-40">
                                <Map
                                    defaultCenter={markerLocation}
                                    defaultZoom={12}
                                    disableDefaultUI={true}
                                    style={{ width: '100%', height: '100%', filter: 'grayscale(0.5)' }}
                                />
                            </div>
                            <div className="relative text-center p-8">
                                <div className="w-20 h-20 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center text-orange-500 mx-auto mb-6 rotate-12">
                                    <MapPin size={40} />
                                </div>
                                <h4 className="text-2xl font-black text-gray-800 tracking-tighter mb-2">Refine in Step 2</h4>
                                <p className="text-gray-400 font-bold text-sm">Select your region on the left, then pin the exact location.</p>
                            </div>
                        </div>
                    </div>
                );

            case 'map':
                return (
                    <div className="flex-grow flex flex-col relative">
                        <div className="flex-grow relative">
                            <Map
                                defaultCenter={markerLocation}
                                defaultZoom={15}
                                disableDefaultUI={true}
                                gestureHandling={'greedy'}
                                style={{ width: '100%', height: '100%' }}
                            >
                                <MapContent 
                                    inputRef={inputRef}
                                    markerLocation={markerLocation}
                                    setMarkerLocation={setMarkerLocation}
                                    setAddress={setAddress}
                                    onMarkerDragEnd={onMarkerDragEnd}
                                    setComponents={setComponents}
                                    setMapInstance={setMapInstance}
                                />
                            </Map>

                            {/* Address Card Top */}
                            <div className="absolute top-4 left-4 right-4 bg-white/95 backdrop-blur-md p-5 rounded-[2rem] shadow-2xl border border-white/50 flex items-start gap-4">
                                <div className="w-12 h-12 bg-orange-100 rounded-2xl text-orange-500 shrink-0 flex items-center justify-center">
                                    <MapPin size={24} />
                                </div>
                                <div className="flex-grow min-w-0">
                                    <p className="text-[10px] text-orange-400 font-black uppercase tracking-[0.2em] mb-1">Current Pinned Location</p>
                                    <p className="text-sm font-black text-gray-800 leading-snug truncate">
                                        {address || "Pinning address..."}
                                    </p>
                                </div>
                                <button onClick={() => setStep('selection')} className="bg-orange-500 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 mt-1">Change</button>
                            </div>

                            {/* Recenter Button */}
                            <button 
                                onClick={() => mapInstance?.panTo(markerLocation)}
                                className="absolute bottom-28 right-6 w-14 h-14 bg-white rounded-[1.25rem] shadow-2xl flex items-center justify-center text-gray-600 active:scale-90 transition-all border border-gray-100"
                            >
                                <div className="w-8 h-8 border-2 border-gray-300 rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                                </div>
                            </button>
                        </div>

                        {/* Confirm Button Bottom */}
                        <div className="p-6 bg-white border-t border-gray-100 flex items-center gap-4">
                            <div className="flex-grow">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Lat: {markerLocation.lat.toFixed(6)}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Lng: {markerLocation.lng.toFixed(6)}</p>
                            </div>
                            <button 
                                onClick={async () => {
                                    // Auto-match PSGC codes from granular names so the user
                                    // doesn't have to re-select Region → Province → City in Finalize Details
                                    try {
                                        // 1. Match Region (already set if user picked from list)
                                        if (!selectedRegion && granular.region && granular.region !== 'Philippines') {
                                            const matched = regions.find(r => granular.province && r.name.toLowerCase().includes('ncr') && granular.city.toLowerCase().includes('quezon'));
                                            if (matched) setSelectedRegion(matched.code);
                                        }

                                        // 2. If region is known, auto-select province
                                        if (selectedRegion && !selectedProvince && granular.province && selectedRegion !== '1300000000') {
                                            const provRes = await fetch(`https://psgc.cloud/api/regions/${selectedRegion}/provinces`);
                                            const provData: PSGCBase[] = await provRes.json();
                                            setProvinces(provData);
                                            const matchedProv = provData.find(p =>
                                                p.name.toLowerCase().includes(granular.province.toLowerCase()) ||
                                                granular.province.toLowerCase().includes(p.name.toLowerCase())
                                            );
                                            if (matchedProv) {
                                                setSelectedProvince(matchedProv.code);
                                                updateField('province', matchedProv.name);

                                                // 3. Auto-select city from province
                                                if (granular.city) {
                                                    const cityRes = await fetch(`https://psgc.cloud/api/provinces/${matchedProv.code}/cities-municipalities`);
                                                    const cityData: PSGCBase[] = await cityRes.json();
                                                    setCities(cityData);
                                                    const matchedCity = cityData.find(c =>
                                                        c.name.toLowerCase().includes(granular.city.toLowerCase()) ||
                                                        granular.city.toLowerCase().includes(c.name.toLowerCase())
                                                    );
                                                    if (matchedCity) {
                                                        setSelectedCity(matchedCity.code);
                                                        updateField('city', matchedCity.name);
                                                    }
                                                }
                                            }
                                        } else if (selectedRegion === '1300000000' && granular.city) {
                                            // NCR: no province, go straight to city  
                                            if (cities.length === 0) {
                                                const cityRes = await fetch(`https://psgc.cloud/api/regions/${selectedRegion}/cities-municipalities`);
                                                const cityData: PSGCBase[] = await cityRes.json();
                                                setCities(cityData);
                                                const matchedCity = cityData.find(c =>
                                                    c.name.toLowerCase().includes(granular.city.toLowerCase()) ||
                                                    granular.city.toLowerCase().includes(c.name.toLowerCase())
                                                );
                                                if (matchedCity) {
                                                    setSelectedCity(matchedCity.code);
                                                    updateField('city', matchedCity.name);
                                                }
                                            } else if (!selectedCity) {
                                                const matchedCity = cities.find(c =>
                                                    c.name.toLowerCase().includes(granular.city.toLowerCase()) ||
                                                    granular.city.toLowerCase().includes(c.name.toLowerCase())
                                                );
                                                if (matchedCity) {
                                                    setSelectedCity(matchedCity.code);
                                                    updateField('city', matchedCity.name);
                                                }
                                            }
                                        } else if (selectedRegion && !selectedCity && granular.city && cities.length > 0) {
                                            // Cities already loaded — just match
                                            const matchedCity = cities.find(c =>
                                                c.name.toLowerCase().includes(granular.city.toLowerCase()) ||
                                                granular.city.toLowerCase().includes(c.name.toLowerCase())
                                            );
                                            if (matchedCity) {
                                                setSelectedCity(matchedCity.code);
                                                updateField('city', matchedCity.name);
                                            }
                                        }
                                    } catch (e) {
                                        console.warn('PSGC auto-match failed, proceeding manually:', e);
                                    }
                                    setStep('details');
                                }}
                                className="px-12 py-5 bg-[#EE4D2D] hover:bg-[#d73d1c] text-white rounded-[1.25rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
                            >
                                Confirm Location Details
                            </button>
                        </div>
                    </div>
                );

            case 'details':
                return (
                    <div className="flex-grow flex flex-col lg:flex-row bg-white overflow-hidden">
                        {/* Left Side: Map Preview Thumbnail */}
                        <div className="hidden lg:flex w-[400px] flex-col border-r border-gray-50 bg-[#F9F9F9]">
                            <div className="p-8 pb-4">
                                <h3 className="text-2xl font-black text-gray-800 tracking-tighter mb-2">Almost Done</h3>
                                <p className="text-sm font-bold text-gray-400">Review your location and finalize your address details on the right.</p>
                            </div>
                            
                            <div className="flex-grow p-8">
                                <div className="w-full h-full rounded-[2.5rem] overflow-hidden shadow-2xl relative border-4 border-white">
                                    <Map
                                        defaultCenter={markerLocation}
                                        defaultZoom={16}
                                        disableDefaultUI={true}
                                        style={{ width: '100%', height: '100%' }}
                                    >
                                        <Marker position={markerLocation} />
                                    </Map>
                                    <div className="absolute bottom-6 left-6 right-6">
                                        <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white">
                                            <p className="text-[9px] text-orange-400 font-black uppercase tracking-widest mb-1">Pinned Landmark</p>
                                            <p className="text-[11px] font-black text-gray-700 leading-tight">{address}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Cascading Details Form */}
                        <div className="flex-grow flex flex-col min-w-0">
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setStep('map')} className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors">
                                        <X size={20} />
                                    </button>
                                    <h3 className="text-xl font-bold text-gray-800">Finalize Details</h3>
                                </div>
                                <div className="px-4 py-1.5 bg-green-50 text-green-500 rounded-full text-[9px] font-black uppercase tracking-widest">Precision Landmark Set</div>
                            </div>

                            <div className="flex-grow overflow-y-auto p-8 space-y-8 no-scrollbar">
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">PSGC Standardized Area</h4>
                                    
                                    <div className="grid grid-cols-2 gap-6">
                                        <DetailSelect 
                                            label="Region" 
                                            options={regions} 
                                            value={selectedRegion} 
                                            readOnly
                                            onChange={(v, name) => {
                                                setSelectedRegion(v);
                                                setSelectedProvince('');
                                                setSelectedCity('');
                                                updateField('region', name);
                                                updateField('province', v === '1300000000' ? 'N/A (NCR)' : '');
                                                updateField('city', '');
                                                updateField('barangay', '');
                                            }} 
                                        />
                                        <DetailSelect 
                                            label="Province" 
                                            options={selectedRegion === '1300000000' ? [{ code: 'NCR', name: 'N/A (NCR)' }] : provinces} 
                                            value={selectedRegion === '1300000000' ? 'NCR' : selectedProvince} 
                                            disabled={!selectedRegion || selectedRegion === '1300000000'}
                                            loading={loadingPSGC.provinces}
                                            onChange={(v, name) => {
                                                setSelectedProvince(v);
                                                setSelectedCity('');
                                                updateField('province', name);
                                                updateField('city', '');
                                                updateField('barangay', '');
                                            }} 
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <DetailSelect 
                                            label="City / Municipality" 
                                            options={cities} 
                                            value={selectedCity} 
                                            disabled={!selectedRegion}
                                            loading={loadingPSGC.cities}
                                            onChange={(v, name) => {
                                                setSelectedCity(v);
                                                updateField('city', name);
                                                updateField('barangay', '');
                                            }} 
                                        />
                                        <DetailSelect 
                                            label="Barangay" 
                                            options={barangays} 
                                            value={granular.barangay} 
                                            isBarangay={true}
                                            disabled={!selectedCity}
                                            loading={loadingPSGC.barangays}
                                            onChange={(_v, name) => updateField('barangay', name)} 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Building & Street Details</h4>
                                    
                                    <div className="grid grid-cols-2 gap-6">
                                        <DetailInput label="House / Lot No." value={granular.houseNumber} onChange={(v) => updateField('houseNumber', v)} placeholder="e.g. 2B" />
                                        <DetailInput label="Block / Phase" value={granular.blockNumber} onChange={(v) => updateField('blockNumber', v)} placeholder="e.g. Blk 40" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <DetailInput label="Street / Road" value={granular.street} onChange={(v) => updateField('street', v)} placeholder="e.g. Northville" />
                                        <DetailInput label="Subdivision" value={granular.subdivision} onChange={(v) => updateField('subdivision', v)} placeholder="e.g. Village Name" />
                                    </div>

                                    <div className="grid grid-cols-3 gap-6">
                                        <DetailInput label="Sitio / Purok" value={granular.sitio} onChange={(v) => updateField('sitio', v)} placeholder="e.g. Zone 1" />
                                        <DetailInput label="District" value={granular.district} onChange={(v) => updateField('district', v)} placeholder="e.g. District 1" />
                                        <DetailInput label="ZIP Code" value={granular.zip} onChange={(v) => updateField('zip', v)} placeholder="e.g. 1421" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-white border-t border-gray-50 flex gap-4 shrink-0">
                                <button 
                                    onClick={() => setStep('map')}
                                    className="px-10 py-5 border-2 border-gray-100 bg-gray-50/50 rounded-[1.25rem] font-black text-[10px] text-gray-400 uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95"
                                >
                                    Back to Map
                                </button>
                                <button 
                                    onClick={() => onSelection(address, markerLocation.lat, markerLocation.lng, components, granular)}
                                    className="flex-grow bg-[#EE4D2D] text-white py-5 rounded-[1.25rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-orange-500/30 hover:scale-[1.01] active:scale-95 transition-all"
                                >
                                    Confirm & Save Address
                                </button>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-2xl transition-all">
            
            <div className="bg-white w-full max-w-6xl h-full lg:h-[90vh] lg:rounded-[3rem] overflow-hidden shadow-[0_0_150px_rgba(0,0,0,0.5)] flex flex-col transition-all">
                {renderStep()}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

const DetailInput: React.FC<{ label: string, value: string, onChange: (v: string) => void, placeholder: string }> = ({ label, value, onChange, placeholder }) => (
    <div className="space-y-2 group">
        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 pl-1 group-focus-within:text-orange-500 transition-colors">{label}</label>
        <input 
            type="text" 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            placeholder={placeholder}
            className="w-full bg-[#fcfcfc] border-2 border-gray-50 focus:border-orange-500/20 focus:bg-white rounded-[1.25rem] py-4 px-5 text-[13px] font-black text-gray-800 outline-none transition-all placeholder:text-gray-200" 
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
    const displayName = isBarangay
        ? (options.find(o => o.name === value)?.name || value)
        : (options.find(o => o.code === value)?.name || value);

    return (
        <div className="space-y-2 group">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 pl-1">{label}</label>
            {readOnly ? (
                <div className="w-full bg-[#f5f5f5] border-2 border-gray-100 rounded-[1.25rem] py-4 px-5 text-[13px] font-black text-gray-800 cursor-default select-none flex items-center justify-between">
                    <span className={displayName ? 'text-gray-800' : 'text-gray-300'}>
                        {loading ? `Loading ${label}...` : (displayName || `—`)}
                    </span>
                    <span className="text-gray-300 text-[10px] font-bold uppercase tracking-widest">Auto-filled</span>
                </div>
            ) : (
                <div className="relative">
                    <select 
                        value={isBarangay ? options.find(o => o.name === value)?.code || '' : value}
                        onChange={(e) => {
                            const opt = options.find(o => o.code === e.target.value);
                            if (opt) onChange(opt.code, opt.name);
                        }}
                        disabled={disabled}
                        className="w-full bg-[#fcfcfc] border-2 border-gray-50 focus:border-orange-500/20 focus:bg-white rounded-[1.25rem] py-4 px-5 text-[13px] font-black text-gray-800 outline-none transition-all disabled:opacity-30 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%23CBD5E1%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-[right_1rem_center] bg-no-repeat"
                    >
                        <option value="">{loading ? `Loading ${label}...` : `Select ${label}`}</option>
                        {options.map(opt => (
                            <option key={opt.code} value={opt.code}>{opt.name}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
};

export default MapPickerModal;
