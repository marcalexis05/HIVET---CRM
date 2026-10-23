import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface NotificationItem {
    id: number;
    title: string;
    desc: string;
    type?: string;
    read: boolean;
    link?: string;
    created_at?: string;
}

export interface NotificationBellProps {
    notifications: NotificationItem[];
    unreadCount: number;
    markAsRead: (id: number) => void;
    markAllAsRead: () => void;
    deleteNotification: (id: number) => void;
    variant?: 'customer' | 'portal';
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    variant = 'portal',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
    const shouldReduceMotion = useReducedMotion();
    const navigate = useNavigate();

    const bellButtonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Track responsive layout (< 640px = bottom sheet, >= 640px = dropdown under bell)
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Body scroll lock & jump prevention when open
    useEffect(() => {
        if (!isOpen) return;

        const originalOverflow = document.body.style.overflow;
        const originalPaddingRight = document.body.style.paddingRight;
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.paddingRight = originalPaddingRight;
        };
    }, [isOpen]);

    // Handle Escape key & return focus on close
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setIsOpen(false);
                bellButtonRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const handleNotificationClick = (item: NotificationItem) => {
        if (!item.read) {
            markAsRead(item.id);
        }
        if (item.link) {
            navigate(item.link);
        }
        setIsOpen(false);
    };

    const bellLabel = unreadCount > 0
        ? `Notifications, ${unreadCount} new`
        : 'Notifications';

    return (
        <div className="relative inline-flex items-center">
            {/* The Bell Trigger Button */}
            <motion.button
                ref={bellButtonRef}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen((prev) => !prev)}
                aria-label={bellLabel}
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                className={`relative min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl transition-all cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                    isOpen
                        ? 'bg-brand text-white shadow-md shadow-brand/20'
                        : variant === 'customer'
                        ? 'bg-slate-100 text-black hover:text-accent-brown hover:bg-slate-200 active:bg-slate-300'
                        : 'bg-white hover:bg-slate-50 active:bg-slate-100 text-accent-brown border border-accent-brown/5 shadow-xs'
                }`}
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span
                        className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full border-2 border-white transition-colors ${
                            isOpen ? 'bg-white' : 'bg-rose-500 animate-pulse'
                        }`}
                        aria-hidden="true"
                    />
                )}
            </motion.button>

            {/* Notifications Modal Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop: Plain light dim, <= 40% dark, with NO blur */}
                        <motion.div
                            initial={shouldReduceMotion ? false : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
                            transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
                            onClick={() => {
                                setIsOpen(false);
                                bellButtonRef.current?.focus();
                            }}
                            className="fixed inset-0 bg-black/40 z-[9990] cursor-pointer"
                            aria-hidden="true"
                        />

                        {/* Content Container: Bottom sheet on phone (< 640px), Dropdown on desktop/tablet (>= 640px) */}
                        <div
                            className={
                                isMobile
                                    ? "fixed inset-x-0 bottom-0 z-[9991] flex flex-col justify-end pointer-events-none"
                                    : "absolute right-0 top-full mt-2 z-[9991] pointer-events-auto origin-top-right"
                            }
                        >
                            <motion.div
                                ref={panelRef}
                                role="dialog"
                                aria-label="Notifications"
                                tabIndex={-1}
                                initial={
                                    shouldReduceMotion
                                        ? false
                                        : isMobile
                                        ? { y: '100%', opacity: 0.8 }
                                        : { opacity: 0, y: 10, scale: 0.96 }
                                }
                                animate={
                                    isMobile
                                        ? { y: 0, opacity: 1 }
                                        : { opacity: 1, y: 0, scale: 1 }
                                }
                                exit={
                                    shouldReduceMotion
                                        ? { opacity: 0 }
                                        : isMobile
                                        ? { y: '100%', opacity: 0 }
                                        : { opacity: 0, y: 10, scale: 0.96 }
                                }
                                transition={{
                                    duration: shouldReduceMotion ? 0 : 0.22,
                                    ease: [0.16, 1, 0.3, 1],
                                }}
                                className={
                                    isMobile
                                        ? "pointer-events-auto w-full max-h-[92vh] bg-white rounded-t-[24px] shadow-2xl flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom,0px)] border-t border-slate-100"
                                        : "pointer-events-auto w-[380px] sm:w-[400px] max-h-[70vh] bg-white rounded-3xl shadow-2xl border border-brand-dark/5 flex flex-col overflow-hidden"
                                }
                            >
                                {/* Mobile Drag Handle */}
                                {isMobile && (
                                    <div
                                        aria-hidden="true"
                                        className="w-10 h-1 rounded-full bg-slate-300 mx-auto mt-2.5 mb-1 shrink-0"
                                    />
                                )}

                                {/* Panel Header */}
                                <div className="p-4 sm:p-5 border-b border-accent-brown/5 flex items-center justify-between bg-accent-peach/10 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <Bell className="w-4 h-4 text-brand" />
                                        <h3 className="font-black text-black text-sm italic">
                                            Notifications
                                        </h3>
                                        {unreadCount > 0 && (
                                            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black leading-none">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {unreadCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={markAllAsRead}
                                                className="text-xs font-bold text-black hover:underline bg-white px-3 py-1.5 rounded-full shadow-xs cursor-pointer active:scale-95 transition-transform"
                                            >
                                                Mark all as read
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsOpen(false);
                                                bellButtonRef.current?.focus();
                                            }}
                                            className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-black/70 hover:text-black shadow-xs transition-all cursor-pointer active:scale-95"
                                            aria-label="Close notifications"
                                            title="Close"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Scrolling Notifications List */}
                                <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-brand-dark/5">
                                    {notifications?.length === 0 ? (
                                        <div className="py-16 text-center px-6">
                                            <div className="w-16 h-16 bg-accent-peach/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Bell className="w-8 h-8 text-black/15" />
                                            </div>
                                            <p className="text-xs font-bold text-black">
                                                No notifications yet
                                            </p>
                                        </div>
                                    ) : (
                                        notifications?.map((n) => (
                                            <div
                                                key={n.id}
                                                onClick={() => handleNotificationClick(n)}
                                                className={`p-4 sm:p-5 flex gap-3.5 sm:gap-4 cursor-pointer transition-colors relative select-none ${
                                                    n.read
                                                        ? 'hover:bg-accent-peach/5'
                                                        : 'bg-brand/5 hover:bg-brand/10'
                                                }`}
                                            >
                                                {/* Left highlight strip for unread */}
                                                {!n.read && (
                                                    <div
                                                        aria-hidden="true"
                                                        className="absolute left-0 top-0 bottom-0 w-1 bg-brand"
                                                    />
                                                )}

                                                {/* Icon tile */}
                                                <div
                                                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0 flex items-center justify-center shadow-xs ${
                                                        n.type === 'System'
                                                            ? 'bg-white text-brand'
                                                            : 'bg-blue-50 text-blue-500'
                                                    }`}
                                                >
                                                    <Bell className="w-4 h-4 sm:w-5 h-5" />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <span className="font-black text-xs text-black truncate">
                                                            {n.title}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <span className="text-[10px] font-bold text-black/60">
                                                                Just now
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deleteNotification(n.id);
                                                                }}
                                                                className="min-w-[28px] min-h-[28px] w-7 h-7 flex items-center justify-center rounded-full bg-black/5 hover:bg-red-500 text-black/60 hover:text-white transition-all cursor-pointer active:scale-95"
                                                                aria-label={`Dismiss notification: ${n.title}`}
                                                                title="Dismiss"
                                                            >
                                                                <X className="w-3.5 h-3.5 stroke-[2.5]" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-[11px] text-black/80 leading-relaxed line-clamp-2 font-medium">
                                                        {n.desc}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;
