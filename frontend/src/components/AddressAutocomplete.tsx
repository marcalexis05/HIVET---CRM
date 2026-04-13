/// <reference types="@types/google.maps" />
import React, { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';
import MapPickerModal from './MapPickerModal';

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

interface AddressAutocompleteProps {
    onAddressSelect: (address: string, components: any, geometry?: { lat: number, lng: number }, granular?: GranularAddress) => void;
    placeholder?: string;
    className?: string;
    defaultValue?: string;
    initialLocation?: { lat: number; lng: number };
    initialGranular?: GranularAddress;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ 
    onAddressSelect, 
    placeholder = "Enter your address",
    className = "",
    defaultValue = "",
    initialLocation,
    initialGranular
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const places = useMapsLibrary('places');
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [inputValue, setInputValue] = useState(defaultValue);

    useEffect(() => {
        setInputValue(defaultValue);
    }, [defaultValue]);

    useEffect(() => {
        if (!places || !inputRef.current) return;

        const options = {
            fields: ["address_components", "geometry", "formatted_address"],
            componentRestrictions: { country: "ph" }
        };

        const autocomplete = new places.Autocomplete(inputRef.current, options);

        autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (!place) return;

            const comps = place.address_components || [];
            const geometry = place.geometry?.location ? {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
            } : undefined;

            // Parse granular fields from address components
            let houseNumber = '', street = '', barangay = '', city = '', province = '', zip = '', district = '', subdivision = '', sitio = '', blockNumber = '', region = 'Philippines';
            comps.forEach((c: any) => {
                const t = c.types;
                if (t.includes('street_number')) houseNumber = c.long_name;
                if (!houseNumber && (t.includes('premise') || t.includes('subpremise'))) houseNumber = c.long_name;
                if (t.includes('route')) street = c.long_name;
                if (t.includes('sublocality_level_1') || t.includes('barangay')) barangay = c.long_name;
                
                // PHILIPPINES: locality is usually city/municipality
                if (t.includes('locality')) city = c.long_name;
                
                // PHILIPPINES: administrative_area_level_1 is often the Region, level_2 is the Province
                // We prioritize Level 1 for province, but fallback to Level 2 if Level 1 is a region name or if Level 1 is missing
                if (t.includes('administrative_area_level_1')) province = c.long_name;
                if (t.includes('administrative_area_level_2')) {
                    district = c.long_name;
                    // If province is empty, or looks like a region (contains 'Region' or 'NCR'), 
                    // and level 2 is present, use level 2 as province
                    if (!province || province.toLowerCase().includes('region') || province === 'Metro Manila' || province === 'National Capital Region') {
                        // If province is currently empty or a region, try to use level 2 as province
                        // But only if city isn't already level 2
                        if (!province) province = c.long_name;
                    }
                }
                
                if (t.includes('postal_code')) zip = c.long_name;
                if (t.includes('neighborhood') || t.includes('subdivision')) subdivision = c.long_name;
                
                // Fallbacks for city if locality is missing
                if (!city && t.includes('administrative_area_level_3')) city = c.long_name;
                if (!city && t.includes('administrative_area_level_2') && province !== c.long_name) city = c.long_name;
            });

            const granular: GranularAddress = { houseNumber, blockNumber, street, subdivision, sitio, barangay, city, district, province, zip, region };

            // Build a detailed address string to show in the input
            const detailed = [houseNumber, street, subdivision, barangay, city, province, zip].filter(Boolean).join(', ');
            const displayValue = detailed || place.formatted_address || '';
            setInputValue(displayValue);

            onAddressSelect(place.formatted_address || '', comps, geometry, granular);
        });

        return () => {
            if (autocomplete) {
                google.maps.event.clearInstanceListeners(autocomplete);
            }
        };
    }, [places, onAddressSelect]);

    const handleMapSelection = (address: string, lat: number, lng: number, components: google.maps.GeocoderAddressComponent[], granular: GranularAddress) => {
        setInputValue(address);
        onAddressSelect(address, components, { lat, lng }, granular); 
        setIsMapModalOpen(false);
    };

    return (
        <div className="relative w-full group">
            <style>{`
                .pac-container {
                    z-index: 999999 !important;
                    pointer-events: all !important;
                    border-radius: 1.5rem !important;
                    border: 1px solid rgba(255, 255, 255, 0.5) !important;
                    box-shadow: 0 25px 50px -12px rgba(66, 32, 6, 0.15) !important;
                    margin-top: 8px !important;
                    font-family: inherit !important;
                    overflow: hidden !important;
                    background-color: white !important;
                }
                .pac-item {
                    padding: 14px 20px !important;
                    cursor: pointer !important;
                    border-top: 1px solid rgba(165, 124, 94, 0.05) !important;
                    display: flex !important;
                    align-items: center !important;
                    pointer-events: all !important;
                    transition: all 0.2s ease !important;
                }
                .pac-item:hover {
                    background-color: rgba(253, 224, 71, 0.1) !important; /* light brand-yellow tint */
                }
                .pac-item-query {
                    font-size: 14px !important;
                    font-weight: 700 !important;
                    color: #422006 !important; /* brand-dark */
                }
                .pac-matched {
                    color: #EAB308 !important; /* brand yellow/gold */
                }
                .pac-icon {
                    margin-right: 12px !important;
                }
                .hdpi .pac-icon {
                   filter: grayscale(1) brightness(0.5);
                }
                /* Hide the default Google logo row to keep it clean, or style it */
                .pac-container:after {
                    display: none !important;
                }
            `}</style>
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholder}
                className={`w-full bg-white border-2 border-accent-brown/5 rounded-2xl px-5 py-4 pr-16 focus:outline-none focus:border-brand-dark/20 transition-all font-medium text-accent-brown placeholder:text-accent-brown/30 ${className}`}
            />
            <button
                type="button"
                onClick={() => setIsMapModalOpen(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 text-accent-brown/40 hover:text-brand-dark hover:bg-brand-light/20 rounded-xl transition-all"
                title="Pick on map"
            >
                <MapPin size={20} />
            </button>

            <MapPickerModal 
                isOpen={isMapModalOpen}
                onClose={() => setIsMapModalOpen(false)}
                onSelection={handleMapSelection}
                initialLocation={initialLocation}
                initialGranular={initialGranular}
            />
        </div>
    );
};
export default AddressAutocomplete;
