import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
    X, Package, Truck, Store, Clock, Users, MapPin, 
    Navigation, ShieldAlert, Loader2, CheckCircle, XCircle, 
    Banknote, ShieldCheck, ExternalLink, Eye 
} from 'lucide-react';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { CustomDropdown } from './CustomDropdown';

interface BusinessOrderDetailsModalProps {
    order: any | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusChange: (status: string) => Promise<void>;
    onBroadcast: () => Promise<void>;
    onReturnHandle: (action: 'Approved' | 'Rejected') => Promise<void>;
    onOpenStreetView: () => void;
    isBroadcasting?: boolean;
    isHandlingReturn?: string | null;
    statusStyles: Record<string, string>;
    statusIcons: Record<string, React.ReactNode>;
}

const BusinessOrderDetailsModal: React.FC<BusinessOrderDetailsModalProps> = ({
    order,
    isOpen,
    onClose,
    onStatusChange,
    onBroadcast,
    onReturnHandle,
    onOpenStreetView,
    isBroadcasting = false,
    isHandlingReturn = null,
    statusStyles,
    statusIcons,
}) => {
    const shouldReduceMotion = useReducedMotion();
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);

    // Lock body scroll and compensate scrollbar width to prevent page shift
    useEffect(() => {
        if (!isOpen) return;
        const originalOverflow = document.body.style.overflow;
        const originalPaddingRight = document.body.style.paddingRight;
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        const timer = setTimeout(() => {
            closeBtnRef.current?.focus();
        }, 50);

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.paddingRight = originalPaddingRight;
            clearTimeout(timer);
        };
    }, [isOpen]);

    // Keyboard handling: Escape key and focus trap
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
            return;
        }

        if (e.key === 'Tab' && dialogRef.current) {
            const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    last.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === last) {
                    first.focus();
                    e.preventDefault();
                }
            }
        }
    };

    if (!order) return null;

    const currentStatus = order.return_status || order.status;
    const isDelivery = order.fulfillment_method === 'delivery';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop: plain light dim, max 40% dark, zero blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 z-[200]"
                        aria-hidden="true"
                    />

                    {/* Dialog Container: Mobile bottom sheet / Desktop centered dialog */}
                    <div className="fixed inset-0 z-[201] flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 pointer-events-none">
                        <motion.div
                            ref={dialogRef}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="order-details-title"
                            tabIndex={-1}
                            onKeyDown={handleKeyDown}
                            initial={
                                shouldReduceMotion
                                    ? { opacity: 0 }
                                    : { opacity: 0, y: typeof window !== 'undefined' && window.innerWidth < 641 ? '100%' : 24 }
                            }
                            animate={
                                shouldReduceMotion
                                    ? { opacity: 1 }
                                    : { opacity: 1, y: 0 }
                            }
                            exit={
                                shouldReduceMotion
                                    ? { opacity: 0 }
                                    : { opacity: 0, y: typeof window !== 'undefined' && window.innerWidth < 641 ? '100%' : 24 }
                            }
                            transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
                            className="pointer-events-auto bg-white shadow-2xl flex flex-col w-full max-h-[92vh] sm:max-h-[90vh] rounded-t-[24px] sm:rounded-[2rem] border border-accent-brown/10 sm:max-w-xl md:max-w-2xl overflow-hidden outline-none"
                        >
                            {/* Fixed Header */}
                            <div className="flex items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4 border-b border-accent-brown/10 shrink-0 bg-white">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 sm:w-11 sm:h-11 bg-brand/10 rounded-xl flex items-center justify-center text-brand shrink-0">
                                        <Package size={20} aria-hidden="true" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                                            Order Details
                                        </p>
                                        <h2
                                            id="order-details-title"
                                            className="text-base sm:text-lg font-black text-accent-brown uppercase tracking-tight truncate"
                                        >
                                            {order.id}
                                        </h2>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <span
                                        className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${
                                            statusStyles[currentStatus] || 'bg-slate-100 text-slate-700'
                                        }`}
                                    >
                                        {statusIcons[currentStatus]}
                                        <span>{currentStatus}</span>
                                    </span>
                                    <button
                                        ref={closeBtnRef}
                                        type="button"
                                        onClick={onClose}
                                        aria-label="Close order details"
                                        className="min-w-[44px] min-h-[44px] w-11 h-11 bg-accent-peach/15 rounded-xl flex items-center justify-center text-accent-brown hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Body */}
                            <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4 sm:space-y-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
                                {/* Product Summary Card */}
                                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-accent-brown/10 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className="w-16 h-16 rounded-xl bg-white border border-accent-brown/10 overflow-hidden shrink-0 flex items-center justify-center p-2">
                                            {order.image ? (
                                                <img src={order.image} alt={order.product} className="w-full h-full object-contain" />
                                            ) : (
                                                <Package className="w-8 h-8 text-accent-brown/20" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-accent-brown text-base tracking-tight leading-snug break-words">
                                                {order.product}
                                            </h3>
                                            <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                                Quantity: ×{order.qty}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right shrink-0">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                                            Total Amount
                                        </span>
                                        <span className="text-2xl font-black text-brand tracking-tight tabular-nums block">
                                            ₱{order.total.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Verification Serial (if present) */}
                                {order.serial_number && (
                                    <div className="bg-orange-50 p-3.5 sm:p-4 rounded-xl border border-orange-200/80 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase text-orange-600 tracking-wider mb-0.5">Verification Serial</p>
                                            <p className="text-sm font-black text-accent-brown tracking-wider break-all">{order.serial_number}</p>
                                        </div>
                                        <ShieldCheck className="w-5 h-5 text-brand shrink-0" aria-hidden="true" />
                                    </div>
                                )}

                                {/* Customer & Delivery Meta Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                                    {/* Customer Box */}
                                    <div className="p-4 bg-white rounded-2xl border border-accent-brown/10 space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            <Users size={14} className="text-accent-brown" />
                                            <span>Customer Details</span>
                                        </div>
                                        <p className="text-base font-bold text-accent-brown break-words">{order.customer}</p>
                                        {order.email && <p className="text-xs font-medium text-slate-500 break-all">{order.email}</p>}
                                    </div>

                                    {/* Fulfillment Box */}
                                    <div className="p-4 bg-white rounded-2xl border border-accent-brown/10 space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            {isDelivery ? <Truck size={14} className="text-brand" /> : <Store size={14} className="text-brand" />}
                                            <span>Fulfillment Method</span>
                                        </div>
                                        <p className="text-base font-bold text-accent-brown uppercase">{order.fulfillment_method}</p>
                                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                                            <Clock size={12} />
                                            <span>Ordered on {order.date}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Delivery Address (if Delivery) */}
                                {isDelivery && order.delivery_address && (
                                    <div className="p-4 bg-white rounded-2xl border border-accent-brown/10 space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            <MapPin size={14} className="text-orange-500" />
                                            <span>Delivery Address</span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-700 break-words leading-relaxed">
                                            {order.delivery_address}
                                        </p>
                                    </div>
                                )}

                                {/* Return Request Section (if Return Requested) */}
                                {order.return_status === 'Requested' && (
                                    <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-orange-200 space-y-3.5 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold uppercase text-orange-600 tracking-wider">Return Request Reason</p>
                                            <ShieldAlert className="w-4 h-4 text-orange-500" />
                                        </div>
                                        <p className="text-sm font-semibold text-accent-brown italic bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                                            "{order.return_reason || 'No reason specified'}"
                                        </p>

                                        {order.return_photos && (() => {
                                            try {
                                                const photos = JSON.parse(order.return_photos);
                                                if (!Array.isArray(photos) || photos.length === 0) return null;
                                                return (
                                                    <div className="space-y-1.5">
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attached Proof Photos</p>
                                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                                            {photos.map((url: string, pi: number) => (
                                                                <a
                                                                    key={pi}
                                                                    href={url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="aspect-square rounded-xl overflow-hidden border border-accent-peach/20 hover:border-brand transition-all relative group block"
                                                                >
                                                                    <img src={url} alt="Proof" className="w-full h-full object-cover" />
                                                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                                        <ExternalLink size={16} />
                                                                    </div>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            } catch (e) {
                                                return null;
                                            }
                                        })()}

                                        <div className="flex gap-3 pt-1">
                                            <button
                                                type="button"
                                                disabled={isHandlingReturn !== null}
                                                onClick={() => onReturnHandle('Approved')}
                                                className="flex-1 min-h-[44px] py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {isHandlingReturn === 'Approved' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle size={15} />}
                                                <span>{isHandlingReturn === 'Approved' ? 'Processing...' : 'Approve Return'}</span>
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isHandlingReturn !== null}
                                                onClick={() => onReturnHandle('Rejected')}
                                                className="flex-1 min-h-[44px] py-2.5 bg-rose-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-rose-600 transition-all shadow-md shadow-rose-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {isHandlingReturn === 'Rejected' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle size={15} />}
                                                <span>{isHandlingReturn === 'Rejected' ? 'Processing...' : 'Reject Return'}</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Management Actions Grid */}
                                <div className="p-4 sm:p-5 bg-white rounded-2xl border border-accent-brown/10 space-y-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Order Management</h4>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-end">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                                Update Order Status
                                            </p>
                                            <CustomDropdown
                                                value={order.status}
                                                onChange={(val) => onStatusChange(val)}
                                                options={['Completed', 'Processing', 'Pending', 'Cancelled'].map(s => ({
                                                    label: s,
                                                    value: s,
                                                    icon: statusIcons[s]
                                                }))}
                                                className="!py-2.5 !rounded-xl !text-xs font-bold"
                                            />
                                        </div>

                                        {isDelivery && (
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={onOpenStreetView}
                                                    className="w-full min-h-[44px] h-11 bg-accent-brown text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-black transition-all flex items-center justify-center gap-2 shadow-sm active:scale-98 cursor-pointer"
                                                >
                                                    <Navigation className="w-4 h-4 text-orange-400" />
                                                    <span>Tracking HUD</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Broadcast Button */}
                                    {isDelivery && !order.delivery_status && (
                                        <button
                                            type="button"
                                            disabled={isBroadcasting}
                                            onClick={onBroadcast}
                                            className="w-full min-h-[44px] py-3 bg-brand text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-brand-dark transition-all flex items-center justify-center gap-2 shadow-md shadow-brand/10 disabled:opacity-50 cursor-pointer active:scale-98"
                                        >
                                            {isBroadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                                            <span>{isBroadcasting ? 'Broadcasting to Riders...' : 'Broadcast to Nearby Riders'}</span>
                                        </button>
                                    )}
                                </div>

                                {/* Mini Map Display (if delivery coordinates available) */}
                                {isDelivery && order.delivery_lat && order.delivery_lng && (
                                    <div className="rounded-2xl overflow-hidden border border-accent-brown/10 shadow-sm">
                                        <div className="h-44 w-full">
                                            <Map
                                                mapId="7b36622874134468"
                                                center={{ lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) }}
                                                defaultZoom={14}
                                                disableDefaultUI={true}
                                                className="w-full h-full"
                                            >
                                                <AdvancedMarker position={{ lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) }}>
                                                    <div className="relative">
                                                        <div className="absolute inset-0 bg-brand rounded-full animate-ping opacity-60" />
                                                        <div className="relative w-4 h-4 bg-brand rounded-full border-2 border-white shadow-xl" />
                                                    </div>
                                                </AdvancedMarker>
                                            </Map>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default BusinessOrderDetailsModal;
