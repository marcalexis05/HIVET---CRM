import { useEffect, useRef, useState } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Eye, Loader2, MapPin, Store } from 'lucide-react';

export function deliveryMapPosition(lat: unknown, lng: unknown): google.maps.LatLngLiteral | null {
    if (lat == null || lng == null || String(lat).trim() === '' || String(lng).trim() === '') return null;
    const position = { lat: Number(lat), lng: Number(lng) };
    return Number.isFinite(position.lat) && Number.isFinite(position.lng) && Math.abs(position.lat) <= 90 && Math.abs(position.lng) <= 180 ? position : null;
}

type Stop = 'clinic' | 'customer';
interface Props {
    orderId: number;
    clinic: google.maps.LatLngLiteral | null;
    customer: google.maps.LatLngLiteral | null;
    pickedUp: boolean;
    selectedStop: Stop | null;
    onSelect: (stop: Stop) => void;
    onStreetViewChange: (visible: boolean) => void;
}

export default function RiderMapControls({ orderId, clinic, customer, pickedUp, selectedStop, onSelect, onStreetViewChange }: Props) {
    const map = useMap();
    const streetView = useMapsLibrary('streetView');
    const markers = useMapsLibrary('marker');
    const selected = selectedStop || (pickedUp ? 'customer' : 'clinic');
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const request = useRef(0);

    useEffect(() => {
        request.current++;
        setLoading(false);
        setError('');
        map?.getStreetView().setVisible(false);
    }, [map, orderId, pickedUp]);

    useEffect(() => {
        if (!map) return;
        const bounds = new google.maps.LatLngBounds();
        if (clinic) bounds.extend(clinic);
        if (customer) bounds.extend(customer);
        if (clinic && customer && (clinic.lat !== customer.lat || clinic.lng !== customer.lng)) {
            map.fitBounds(bounds, { top: 100, right: 70, bottom: 110, left: 70 });
        } else if (clinic || customer) {
            map.setCenter((clinic || customer)!);
            map.setZoom(17);
        }
    }, [map, orderId, clinic?.lat, clinic?.lng, customer?.lat, customer?.lng]);

    useEffect(() => {
        if (!map) return;
        const panorama = map.getStreetView();
        panorama.setOptions({
            disableDefaultUI: true, addressControl: false, linksControl: false,
            panControl: false, zoomControl: false, fullscreenControl: false,
            motionTrackingControl: false, motionTracking: false,
            enableCloseButton: false, clickToGo: false, showRoadLabels: false,
            disableDoubleClickZoom: true
        });
        const listener = panorama.addListener('visible_changed', () => {
            const open = panorama.getVisible();
            setVisible(open);
            onStreetViewChange(open);
        });
        return () => {
            request.current++;
            listener.remove();
            panorama.setVisible(false);
            onStreetViewChange(false);
        };
    }, [map, onStreetViewChange]);

    useEffect(() => {
        if (!map || !markers || !visible) return;
        const panorama = map.getStreetView();
        // Create panorama overlays only while Street View is open, so Google
        // cannot also display them alongside the map's advanced markers.
        const stops = [
            { position: clinic, title: '1. Clinic pickup', color: '#e85d04', glyph: '<path d="M15 19h18v14H15zM13 19l3-8h16l3 8M20 33v-8h8v8M13 19c0 4 6 4 6 0 0 4 5 4 5 0 0 4 5 4 5 0 0 4 6 4 6 0"/>' },
            { position: customer, title: '2. Customer drop-off', color: '#ea580c', glyph: '<circle cx="24" cy="18" r="5"/><path d="M15 33v-3a9 9 0 0 1 18 0v3"/>' }
        ];
        const pins = stops.filter(stop => stop.position).map(stop => new markers.Marker({
            map: panorama,
            position: stop.position!,
            title: stop.title,
            icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="0 0 48 60"><path fill="${stop.color}" stroke="white" stroke-width="3.5" d="M24 58C19 49 2 36 2 24a22 22 0 1 1 44 0c0 12-17 25-22 34Z"/><g fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${stop.glyph}</g></svg>`),
                scaledSize: new google.maps.Size(64, 80),
                anchor: new google.maps.Point(32, 78),
                labelOrigin: new google.maps.Point(32, 96)
            },
            label: { text: stop.title, color: '#ffffff', fontSize: '13px', fontWeight: '800', className: 'bg-orange-600 border-2 border-white rounded-full px-3 py-1 shadow-lg' }
        }));
        return () => pins.forEach(pin => pin.setMap(null));
    }, [map, markers, visible, clinic?.lat, clinic?.lng, customer?.lat, customer?.lng]);

    const selectStop = (stop: Stop) => {
        const position = stop === 'clinic' ? clinic : customer;
        if (!map || !position) return;
        request.current++;
        setLoading(false);
        setError('');
        if (visible) {
            onSelect(stop);
            void openStreetView(stop, false);
            return;
        }
        map.getStreetView().setVisible(false);
        map.panTo(position);
        onSelect(stop);
    };

    const openStreetView = async (stop: Stop = selected, toggle = true) => {
        if (!map) return;
        const panorama = map.getStreetView();
        if (visible && toggle) {
            request.current++;
            setLoading(false);
            panorama.setVisible(false);
            return;
        }
        if (!streetView) return;
        const position = stop === 'clinic' ? clinic : customer;
        if (!position) return;
        const attempt = ++request.current;
        setLoading(true);
        setError('');
        try {
            const result = await new streetView.StreetViewService().getPanorama({ location: position, radius: 100, preference: streetView.StreetViewPreference.NEAREST });
            if (attempt !== request.current) return;
            if (!result.data.location?.pano) throw new Error('No panorama');
            panorama.setPano(result.data.location.pano);
            const camera = result.data.location.latLng;
            if (camera) {
                const radians = Math.PI / 180;
                const deltaLng = (position.lng - camera.lng()) * radians;
                const fromLat = camera.lat() * radians;
                const toLat = position.lat * radians;
                const heading = Math.atan2(Math.sin(deltaLng) * Math.cos(toLat), Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng)) / radians;
                panorama.setPov({ heading: (heading + 360) % 360, pitch: -8 });
            }
            panorama.setZoom(0);
            panorama.setVisible(true);
        } catch {
            if (attempt === request.current) setError('Street View could not load at this address. Try the other stop or return to the map.');
        } finally {
            if (attempt === request.current) setLoading(false);
        }
    };

    return <div className="absolute bottom-8 left-3 right-14 z-20 pointer-events-none">
        {error && <p role="status" className="mb-2 max-w-sm rounded-xl bg-white px-3 py-2 text-xs text-accent-brown shadow-md pointer-events-auto">{error}</p>}
        <div className="inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-white p-1 shadow-lg border border-accent-brown/10 pointer-events-auto">
            <button type="button" disabled={!clinic} onClick={() => selectStop('clinic')} aria-pressed={selected === 'clinic'} className={`min-h-10 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 ${selected === 'clinic' ? 'bg-brand-dark text-white' : 'text-accent-brown hover:bg-orange-50'}`}><Store size={15} />1. Clinic</button>
            <button type="button" disabled={!customer} onClick={() => selectStop('customer')} aria-pressed={selected === 'customer'} className={`min-h-10 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 ${selected === 'customer' ? 'bg-orange-600 text-white' : 'text-accent-brown hover:bg-orange-50'}`}><MapPin size={15} />2. Drop-off</button>
            <button type="button" disabled={!visible && (!streetView || loading || !(selected === 'clinic' ? clinic : customer))} onClick={() => void openStreetView()} aria-label={visible ? 'Back to delivery map' : `Open Street View near ${selected === 'clinic' ? 'clinic pickup' : 'customer drop-off'}`} className="min-h-10 px-2.5 rounded-lg text-xs font-bold text-accent-brown hover:bg-orange-50 disabled:opacity-40 flex items-center gap-1.5">{loading ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}{visible ? 'Back to map' : 'Street View'}</button>
        </div>
    </div>;
}
