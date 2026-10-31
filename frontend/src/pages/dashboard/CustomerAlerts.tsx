import { dismissNotification, markNotificationRead, markAllNotificationsRead, removeAllNotifications } from '../../utils/notifications';
﻿import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Info, Bell, CheckCircle2, Trash2, BellOff } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import { toTitleCase, toSentenceCase, formatReviewIdInText } from '../../utils/textFormatters';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const CustomerAlerts = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notificationError, setNotificationError] = useState('');
    const [notificationBusy, setNotificationBusy] = useState(false);
    const notificationRevision = useRef(0);
    const dismissedNotifications = useRef(new Set<string>());
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const navigate = useNavigate();

    const fetchNotifications = async () => {
        const revision = notificationRevision.current;
        const token = localStorage.getItem('hivet_token');
        if (!token) return;
        try {
            const res = await fetch(`${API}/api/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (revision !== notificationRevision.current) return;
                setNotifications((data.notifications || []).filter((n: any) => !dismissedNotifications.current.has(String(n.id))));
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    };

    useEffect(() => { fetchNotifications(); }, []);

    const markAsRead = async (id: number) => {
        try {
            await markNotificationRead(id);
            setNotifications(prev => prev.map(n => String(n.id) === String(id) ? { ...n, read: true } : n));
            setNotificationError('');
        } catch (error) { setNotificationError(error instanceof Error ? error.message : 'Could not mark notification as read.'); }
    };

    const markAllAsRead = async () => {
        if (notificationBusy) return;
        setNotificationBusy(true); setNotificationError('');
        try {
            await markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) { setNotificationError(error instanceof Error ? error.message : 'Could not mark all notifications as read.'); }
        finally { setNotificationBusy(false); }
    };

    useEffect(() => {
        const refresh = () => { notificationRevision.current += 1; void fetchNotifications(); };
        window.addEventListener('hivet-notifications-changed', refresh);
        return () => window.removeEventListener('hivet-notifications-changed', refresh);
    }, []);

    const deleteAllNotifications = async () => {
        if (notificationBusy) return;
        setNotificationBusy(true); setNotificationError('');
        const previousNotifications = notifications;
        const ids = notifications.map(n => String(n.id));
        ids.forEach(id => dismissedNotifications.current.add(id));
        setNotifications([]);
        try {
            await removeAllNotifications();
        } catch (error) {
            ids.forEach(id => dismissedNotifications.current.delete(id));
            setNotifications(prev => [...prev, ...previousNotifications.filter(n => !prev.some(p => String(p.id) === String(n.id)))]);
            setNotificationError(error instanceof Error ? error.message : 'Could not remove notifications.');
            await fetchNotifications();
        } finally { setNotificationBusy(false); }
    };

    const deleteNotification = async (id: number) => {
        const key = String(id);
        const removedNotification = notifications.find(n => String(n.id) === key);
        if (dismissedNotifications.current.has(key)) return;
        dismissedNotifications.current.add(key);
        setNotificationError('');
        setNotifications(prev => prev.filter(n => String(n.id) !== key));
        try {
            await dismissNotification(id);
        } catch (error) {
            dismissedNotifications.current.delete(key);
            if (removedNotification) setNotifications(prev => prev.some(n => String(n.id) === key) ? prev : [...prev, removedNotification]);
            setNotificationError(error instanceof Error ? error.message : 'Could not remove this notification.');
            await fetchNotifications();
        }
    };



    const filteredAlerts = filter === 'all'
        ? notifications
        : notifications.filter(n => !n.read);

    const unreadCount = notifications.filter(n => !n.read).length;

    const getIcon = (type: string) => {
        switch (type) {
            case 'System': return Bell;
            case 'Promo': return Gift;
            case 'Reminder': return Info;
            default: return Bell;
        }
    };

    const getIconStyle = (type: string) => {
        switch (type) {
            case 'System': return 'bg-brand text-white shadow-lg shadow-brand/30';
            case 'Promo': return 'bg-orange-500 text-white shadow-lg shadow-orange-500/30';
            case 'Reminder': return 'bg-blue-500 text-white shadow-lg shadow-blue-500/30';
            default: return 'bg-accent-brown/20 text-accent-brown';
        }
    };

    return (
        <DashboardLayout title="">
            {notificationError && <p role="alert" className="p-3 text-sm text-red-600 bg-red-50 rounded-xl">{notificationError}</p>}
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Filter + Actions bar */}
                <div className="flex items-center justify-between pb-5 border-b-2 border-accent-brown/10">
                    {/* Filter pills */}
                    <div className="flex items-center gap-2">
                        {(['all', 'unread'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                    filter === f
                                        ? 'bg-brand text-white border-brand shadow-md shadow-brand/20'
                                        : 'bg-white border-accent-brown/15 text-accent-brown/50 hover:border-brand/30 hover:text-brand'
                                }`}
                            >
                                {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
                            </button>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={markAllAsRead} disabled={notificationBusy}
                            className="text-xs font-bold text-black/50 hover:text-black transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark all read
                        </button>
                        <div className="w-px h-4 bg-accent-brown/15" />
                        <button
                            onClick={deleteAllNotifications} disabled={notificationBusy}
                            className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Clear All
                        </button>
                    </div>
                </div>

                {/* Alerts List */}
                <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                        {filteredAlerts.length === 0 ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="py-24 text-center bg-white rounded-[2rem] border-2 border-dashed border-accent-brown/10"
                            >
                                <div className="w-16 h-16 bg-brand-dark/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <BellOff className="w-8 h-8 text-black/20" />
                                </div>
                                <p className="text-sm font-bold text-black/50">No notifications to show</p>
                                <p className="text-xs text-black/30 font-medium mt-1">You're all caught up!</p>
                            </motion.div>
                        ) : (
                            filteredAlerts.map((alert, i) => {
                                const Icon = getIcon(alert.type);
                                return (
                                    <motion.div
                                        key={alert.id}
                                        layout
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -30 }}
                                        transition={{ delay: i * 0.04 }}
                                        onClick={() => {
                                            if (!alert.read) markAsRead(alert.id);
                                            if (alert.link) navigate(alert.link);
                                        }}
                                        className={`group relative p-5 rounded-2xl flex items-start sm:items-center justify-between gap-5 cursor-pointer transition-all border-2 ${
                                            alert.read
                                                ? 'bg-white border-accent-brown/[0.08] hover:border-accent-brown/20 hover:shadow-md hover:shadow-accent-brown/5'
                                                : 'bg-white border-brand/25 shadow-lg shadow-brand/[0.08]'
                                        }`}
                                    >
                                        {/* Unread left strip */}
                                        {!alert.read && (
                                            <div className="absolute left-0 top-4 bottom-4 w-1 bg-brand rounded-r-full" />
                                        )}

                                        <div className="flex items-start gap-4 flex-1 min-w-0 pl-2">
                                            {/* Icon */}
                                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${getIconStyle(alert.type)}`}>
                                                <Icon className="w-5 h-5" />
                                            </div>

                                            {/* Content */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                                        alert.read
                                                            ? 'bg-accent-brown/[0.08] text-black/40'
                                                            : 'bg-brand/15 text-black'
                                                    }`}>
                                                        {toTitleCase(alert.type)}
                                                    </span>
                                                    {!alert.read && (
                                                        <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                                                    )}
                                                </div>
                                                <h3 className={`font-black tracking-tight text-base leading-snug mb-0.5 ${
                                                    alert.read ? 'text-black/50' : 'text-black'
                                                }`}>
                                                    {formatReviewIdInText(alert.title)}
                                                </h3>
                                                <p className={`text-sm font-medium leading-relaxed ${
                                                    alert.read ? 'text-black opacity-40' : 'text-black'
                                                }`}>
                                                    {formatReviewIdInText(alert.desc)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right: date + delete */}
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <span className="text-[10px] font-medium text-black/60 whitespace-nowrap">
                                                {new Date(alert.created_at).toLocaleDateString(undefined, {
                                                    month: 'short', day: 'numeric', year: 'numeric'
                                                })}
                                            </span>
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={(e) => { e.stopPropagation(); deleteNotification(alert.id); }}
                                                className="w-8 h-8 rounded-xl bg-accent-brown/5 hover:bg-red-50 text-accent-brown/25 hover:text-red-500 flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                                                title="Remove"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </AnimatePresence>
                </div>

            </div>
        </DashboardLayout>
    );
};

export default CustomerAlerts;
