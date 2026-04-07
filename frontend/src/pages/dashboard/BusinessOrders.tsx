import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { Search, Eye, CheckCircle, XCircle, Clock, Loader2, ChevronDown, ChevronUp, MapPin, Truck, Store, X, Navigation } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { CustomDropdown } from '../../components/CustomDropdown';

// ALL_ORDERS moved to state

const STATUS_STYLES: Record<string, string> = {
    Completed: 'bg-green-100 text-green-700',
    Processing: 'bg-blue-100 text-blue-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Cancelled: 'bg-red-100 text-red-500',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
    Completed: <CheckCircle className="w-3 h-3" />,
    Processing: <Loader2 className="w-3 h-3 animate-spin" />,
    Pending: <Clock className="w-3 h-3" />,
    Cancelled: <XCircle className="w-3 h-3" />,
};

const STATUS_FILTERS = ['All', 'Completed', 'Processing', 'Pending', 'Cancelled'];
const FULFILLMENT_FILTERS = ['All', 'Delivery', 'Pickup'];

const BusinessOrders = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [fulfillmentFilter, setFulfillmentFilter] = useState('All');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Street View State
    const [showStreetView, setShowStreetView] = useState(false);
    const [viewingOrder, setViewingOrder] = useState<any>(null);
    const [panoPosition, setPanoPosition] = useState<{ lat: number; lng: number } | null>(null);
    const [panoPov, setPanoPov] = useState({ heading: 0, pitch: 0 });
    const streetViewInstance = React.useRef<google.maps.StreetViewPanorama | null>(null);

    useEffect(() => {
        if (user?.token) {
            fetchOrders();
        }
    }, [user?.token]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const resp = await fetch('http://localhost:8000/api/business/orders', {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            if (resp.ok) {
                setOrders(await resp.json());
            }
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = orders.filter(o => {
        const matchStatus = statusFilter === 'All' || o.status === statusFilter;
        const matchFulfillment = fulfillmentFilter === 'All' || 
            (fulfillmentFilter === 'Delivery' && o.fulfillment_method === 'delivery') ||
            (fulfillmentFilter === 'Pickup' && o.fulfillment_method === 'pickup');
        const matchSearch = o.customer.toLowerCase().includes(search.toLowerCase())
            || o.id.toLowerCase().includes(search.toLowerCase())
            || o.product.toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchFulfillment && matchSearch;
    });

    const totalRevenue = filtered.reduce((sum, o) => sum + (!['Cancelled', 'Pending'].includes(o.status) ? o.total : 0), 0);

    return (
        <DashboardLayout title="Orders">
            <div className="space-y-6">

                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white rounded-2xl p-4 shadow-xl shadow-accent-brown/5 border border-white">
                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-brown/40 group-focus-within:text-brand-dark transition-colors" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            type="text"
                            placeholder="Search orders, customers..."
                            className="w-full pl-10 pr-4 py-2.5 bg-accent-peach/20 rounded-xl border border-transparent focus:border-brand/30 outline-none text-xs font-bold text-accent-brown placeholder:text-accent-brown/40 transition-all"
                        />
                    </div>
                    <div className="flex flex-col gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                            <Truck className="w-4 h-4 text-accent-brown/40 shrink-0" />
                            {FULFILLMENT_FILTERS.map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFulfillmentFilter(f)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${fulfillmentFilter === f ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-accent-peach/20 text-accent-brown/50 hover:bg-accent-peach/40'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-t border-accent-brown/5 pt-3 md:border-t-0 md:pt-0">
                            <Clock className="w-4 h-4 text-accent-brown/40 shrink-0" />
                            {STATUS_FILTERS.map(f => (
                                <button
                                    key={f}
                                    onClick={() => setStatusFilter(f)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === f ? 'bg-brand-dark text-white shadow-lg shadow-brand/20' : 'bg-accent-peach/20 text-accent-brown/50 hover:bg-accent-peach/40'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Summary strip */}
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm font-medium text-accent-brown/50">{filtered.length} order{filtered.length !== 1 ? 's' : ''} found</p>
                    <p className="text-sm font-black text-accent-brown">Revenue: <span className="text-brand-dark">₱{totalRevenue.toLocaleString()}</span></p>
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block bg-white rounded-[2rem] shadow-xl shadow-accent-brown/5 border border-white overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                            <Loader2 className="w-10 h-10 animate-spin text-brand" />
                            <p className="font-bold text-sm tracking-widest uppercase">Loading live orders...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-accent-brown/5 bg-accent-peach/10">
                                        {['', 'Order ID', 'Customer', 'Product', 'Qty', 'Total', 'Date', 'Status'].map(h => (
                                            <th key={h} className="text-left text-[9px] font-black uppercase tracking-widest text-accent-brown/30 py-4 px-4">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((o, i) => (
                                        <React.Fragment key={o.id}>
                                            <motion.tr
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                                                className="border-b border-accent-brown/5 hover:bg-accent-peach/10 transition-colors cursor-pointer group"
                                            >
                                                <td className="py-4 px-4 text-accent-brown/20 group-hover:text-brand-dark transition-colors">
                                                    {expandedId === o.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </td>
                                                <td className="py-4 px-4 text-[10px] font-black text-accent-brown/50">{o.id}</td>
                                                <td className="py-4 px-4 font-bold text-accent-brown text-sm">{o.customer}</td>
                                                <td className="py-4 px-4 text-sm font-medium text-accent-brown/70 max-w-[200px] truncate">{o.product}</td>
                                                <td className="py-4 px-4 text-sm font-black text-accent-brown/60">×{o.qty}</td>
                                                <td className="py-4 px-4 font-black text-accent-brown">₱{o.total.toLocaleString()}</td>
                                                <td className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-accent-brown/40">{o.date}</td>
                                                <td className="py-4 px-4">
                                                    <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full w-fit ${STATUS_STYLES[o.status]}`}>
                                                        {STATUS_ICONS[o.status]} {o.status}
                                                    </span>
                                                </td>
                                            </motion.tr>
                                            {expandedId === o.id && (
                                                <tr className="bg-accent-peach/10 border-b border-accent-brown/5">
                                                    <td colSpan={8} className="px-8 py-5">
                                                        <div className="flex flex-col lg:flex-row gap-8">
                                                            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-6">
                                                                <div>
                                                                    <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-1">Customer Email</p>
                                                                    <p className="text-sm font-bold text-accent-brown">{o.email}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-1">Payment Method</p>
                                                                    <p className="text-sm font-bold text-accent-brown uppercase">{o.payment}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-1">Order Date</p>
                                                                    <p className="text-sm font-bold text-accent-brown">{o.date}</p>
                                                                </div>
                                                                <div className="flex flex-col gap-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <button className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-brand-dark text-white px-4 py-2 rounded-xl hover:bg-black transition-colors">
                                                                            <Eye className="w-3.5 h-3.5" /> View Full Order
                                                                        </button>
                                                                    </div>
                                                                        <CustomDropdown
                                                                            value={o.status}
                                                                            onChange={async (val) => {
                                                                                try {
                                                                                    const realId = o.id.split('-')[1];
                                                                                    const res = await fetch(`http://localhost:8000/api/business/orders/${realId}/status`, {
                                                                                        method: 'PATCH',
                                                                                        headers: {
                                                                                            'Content-Type': 'application/json',
                                                                                            'Authorization': `Bearer ${user?.token}`
                                                                                        },
                                                                                        body: JSON.stringify({ status: val })
                                                                                    });
                                                                                    if (res.ok) fetchOrders();
                                                                                } catch (err) {
                                                                                    console.error('Failed to update status', err);
                                                                                }
                                                                            }}
                                                                            options={STATUS_FILTERS.slice(1).map(s => ({
                                                                                label: s,
                                                                                value: s,
                                                                                icon: STATUS_ICONS[s]
                                                                            }))}
                                                                            className="!py-2 !rounded-xl"
                                                                        />
                                                                </div>
                                                            </div>
                                                            {o.fulfillment_method === 'delivery' ? (
                                                                <div className="w-full lg:w-[450px] flex flex-col gap-4 bg-white p-5 rounded-[2.5rem] shadow-2xl shadow-accent-brown/5 border border-accent-brown/5 relative overflow-hidden group/map">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand-dark">
                                                                                <Truck className="w-5 h-5" />
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 block">Delivery To</span>
                                                                                <p className="text-sm font-bold text-accent-brown leading-tight truncate max-w-[200px]">
                                                                                    {o.delivery_address || 'No address provided'}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <button 
                                                                            onClick={() => {
                                                                                setViewingOrder(o);
                                                                                setShowStreetView(true);
                                                                            }}
                                                                            className="px-4 py-2 bg-brand-dark text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-brand/10"
                                                                        >
                                                                            <Eye className="w-3.5 h-3.5" /> Street View
                                                                        </button>
                                                                    </div>

                                                                    <div className="h-48 rounded-[2rem] overflow-hidden shadow-inner border-2 border-accent-peach/10 relative">
                                                                        <Map
                                                                            mapId="7b36622874134468"
                                                                            center={o.delivery_lat ? { lat: o.delivery_lat, lng: o.delivery_lng } : { lat: 14.5995, lng: 120.9842 }}
                                                                            defaultZoom={15}
                                                                            disableDefaultUI={true}
                                                                            className="w-full h-full"
                                                                        >
                                                                            {o.delivery_lat && (
                                                                                <AdvancedMarker position={{ lat: o.delivery_lat, lng: o.delivery_lng }}>
                                                                                    <div className="w-10 h-10 bg-brand-dark rounded-full flex items-center justify-center text-white border-2 border-white shadow-xl ring-4 ring-brand/20">
                                                                                        <MapPin className="w-5 h-5" />
                                                                                    </div>
                                                                                </AdvancedMarker>
                                                                            )}
                                                                        </Map>
                                                                        
                                                                        <div className="absolute bottom-3 left-3 right-3 p-3 bg-white/90 backdrop-blur-md rounded-2xl border border-white/50 flex items-center justify-between shadow-xl">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-6 h-6 bg-brand-dark text-white rounded-lg flex items-center justify-center">
                                                                                    <Navigation className="w-3.5 h-3.5" />
                                                                                </div>
                                                                                <span className="text-[9px] font-black uppercase tracking-widest text-accent-brown">Geo-Locked</span>
                                                                            </div>
                                                                            <span className="text-[10px] font-bold text-accent-brown/40">
                                                                                {o.delivery_lat?.toFixed(4)}, {o.delivery_lng?.toFixed(4)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="w-full lg:w-[450px] flex flex-col gap-4 bg-white p-5 rounded-[2.5rem] shadow-2xl shadow-accent-brown/5 border border-accent-brown/5">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand-dark">
                                                                            <Store className="w-5 h-5" />
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 block">Clinic Store Pick-up</span>
                                                                            <p className="text-sm font-bold text-accent-brown leading-tight">
                                                                                Self-pick up at branch
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="h-48 rounded-[2rem] bg-accent-peach/5 border-2 border-dashed border-accent-brown/10 flex flex-col items-center justify-center gap-2 opacity-60">
                                                                        <Truck className="w-8 h-8 text-accent-brown/20" />
                                                                        <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">No logistical coordinates needed</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4">
                    {filtered.map((o, i) => (
                        <motion.div
                            key={o.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white rounded-3xl p-5 shadow-xl shadow-accent-brown/5 border border-white space-y-4"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-black text-accent-brown/40 uppercase tracking-widest mb-1">{o.id}</p>
                                    <h4 className="font-black text-accent-brown text-lg tracking-tight leading-tight">{o.customer}</h4>
                                    <p className="text-[10px] font-medium text-accent-brown/50">{o.email}</p>
                                </div>
                                <span className={`flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${STATUS_STYLES[o.status]}`}>
                                    {STATUS_ICONS[o.status]} {o.status}
                                </span>
                            </div>

                            <div className="p-4 bg-accent-peach/10 rounded-2xl">
                                <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-2">Order Items</p>
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-bold text-accent-brown truncate flex-1 mr-4">{o.product}</p>
                                    <p className="text-[10px] font-black text-accent-brown/50 whitespace-nowrap">×{o.qty}</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 mb-0.5">Total Amount</p>
                                    <p className="text-xl font-black text-brand-dark tracking-tighter">₱{o.total.toLocaleString()}</p>
                                </div>
                                <button 
                                    onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                                    className="bg-accent-brown text-white w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-brand-dark transition-all shadow-lg shadow-accent-brown/10"
                                >
                                    <Eye className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-accent-brown/30 pt-4 border-t border-accent-brown/5">
                                <span>{o.date}</span>
                                <span>{o.payment}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {filtered.length === 0 && (
                    <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-accent-peach/20">
                        <p className="text-accent-brown/40 font-bold">No orders found matching your criteria.</p>
                    </div>
                )}

            </div>

            {/* Street View Overlay */}
            <AnimatePresence>
                {showStreetView && viewingOrder && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-[1000] bg-black flex flex-col"
                    >
                        <div className="absolute top-8 left-8 right-8 z-[1110] flex items-center justify-between pointer-events-none">
                            <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 pointer-events-auto">
                                <h3 className="text-white text-lg font-black tracking-tighter leading-tight">{viewingOrder.customer}</h3>
                                <p className="text-white/50 text-[10px] font-black uppercase tracking-widest">{viewingOrder.delivery_address}</p>
                            </div>
                            <button 
                                onClick={() => {
                                    setShowStreetView(false);
                                    streetViewInstance.current = null;
                                }}
                                className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-white hover:bg-red-500 hover:border-red-600 transition-all pointer-events-auto shadow-2xl"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col relative">
                            <div className="flex-[0.7] relative bg-black">
                                <div 
                                    ref={(el) => {
                                        if (el && !streetViewInstance.current) {
                                            const pos = { lat: Number(viewingOrder.delivery_lat), lng: Number(viewingOrder.delivery_lng) };
                                            const pano = new google.maps.StreetViewPanorama(el, {
                                                position: pos,
                                                pov: { heading: 0, pitch: 0 },
                                                zoom: 1,
                                                addressControl: false,
                                                fullscreenControl: false,
                                                zoomControl: false,
                                                linksControl: true,
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
                                    }} 
                                    className="w-full h-full" 
                                />
                            </div>

                            <div className="flex-[0.3] relative overflow-hidden shadow-2xl border-t-2 border-brand/5">
                                <Map
                                    mapId="46537618861d8583"
                                    center={panoPosition || { lat: Number(viewingOrder.delivery_lat), lng: Number(viewingOrder.delivery_lng) }}
                                    zoom={17}
                                    disableDefaultUI={true}
                                    className="w-full h-full"
                                >
                                    {panoPosition && (
                                        <AdvancedMarker position={panoPosition}>
                                            <div 
                                                className="w-10 h-10 flex items-center justify-center"
                                                style={{ transform: `rotate(${panoPov.heading}deg)` }}
                                            >
                                                <div className="w-5 h-5 bg-blue-500 rounded-full border-[3px] border-white shadow-2xl relative">
                                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-blue-500" />
                                                </div>
                                            </div>
                                        </AdvancedMarker>
                                    )}
                                    <AdvancedMarker position={{ lat: Number(viewingOrder.delivery_lat), lng: Number(viewingOrder.delivery_lng) }}>
                                        <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center text-brand-dark border-2 border-white shadow-xl">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                    </AdvancedMarker>
                                </Map>
                                
                                <div className="absolute bottom-6 left-6 right-6 z-20 flex justify-between items-end pointer-events-none">
                                    <div className="bg-white/90 backdrop-blur-md p-4 rounded-[2rem] shadow-2xl border border-white flex flex-col gap-1 pointer-events-auto">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown">Real-time HUD</span>
                                        </div>
                                        <p className="text-[9px] font-bold text-accent-brown/60 uppercase">Heading: {Math.round(panoPov.heading)}° | Pitch: {Math.round(panoPov.pitch)}°</p>
                                    </div>
                                    
                                    <button 
                                        onClick={() => {
                                            if (streetViewInstance.current) {
                                                streetViewInstance.current.setPosition({ lat: Number(viewingOrder.delivery_lat), lng: Number(viewingOrder.delivery_lng) });
                                                streetViewInstance.current.setPov({ heading: 0, pitch: 0 });
                                            }
                                        }}
                                        className="bg-brand-dark text-white px-6 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl border border-white/10 flex items-center gap-3 pointer-events-auto hover:bg-black transition-all"
                                    >
                                        <Navigation className="w-4 h-4" /> Reset Tracker
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
};

export default BusinessOrders;
