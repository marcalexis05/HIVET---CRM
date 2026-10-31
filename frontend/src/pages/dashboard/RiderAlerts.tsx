import { dismissNotification, markNotificationRead, markAllNotificationsRead, removeAllNotifications } from '../../utils/notifications';
﻿import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Info, Bell, CheckCircle2, Trash2, BellOff, ArrowLeft, Loader2 } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import { RIDER_TEXT } from '../../constants/riderWording';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const RiderAlerts = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notificationError, setNotificationError] = useState('');
    const [notificationBusy, setNotificationBusy] = useState(false);
    const notificationRevision = useRef(0);
    const dismissedNotifications = useRef(new Set<string>());
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [isLoading, setIsLoading] = useState(true);
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
        } finally {
            setIsLoading(false);
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
        <DashboardLayout title={RIDER_TEXT.alerts.pageTitle}>
            {notificationError && <p role="alert" className="p-3 text-sm text-red-600 bg-red-50 rounded-xl">{notificationError}</p>}
            <div className="max-w-4xl mx-auto space-y-8 pb-20">

                {/* Header Context - Simplified Navigation */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                    <div>
                        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent-brown/40 hover:text-brand-dark transition-colors group">
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> {RIDER_TEXT.alerts.backHomeBtn}
                        </button>
                        <h1 className="text-2xl min-[360px]:text-[28px] sm:text-3xl font-black text-accent-brown tracking-tight leading-tight mt-2">
                            {RIDER_TEXT.alerts.pageTitle}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                         <div className="flex bg-white rounded-2xl p-1 border border-accent-brown/5 shadow-sm">
                            {(['all', 'unread'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                                        filter === f
                                            ? 'bg-brand text-white shadow-lg shadow-brand/20'
                                             : 'text-accent-brown/40 hover:text-accent-brown'
                                    }`}
                                >
                                    {f === 'all' ? `${RIDER_TEXT.alerts.allTab} (${notifications.length})` : `${RIDER_TEXT.alerts.unreadTab} (${unreadCount})`}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Master Actions */}
                {notifications.length > 0 && (
                    <div className="flex items-center justify-end gap-6 pt-2">
                        <button
                            onClick={markAllAsRead} disabled={notificationBusy}
                            className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 hover:text-brand-dark transition-colors flex items-center gap-2 cursor-pointer"
                        >
                            <CheckCircle2 className="w-4 h-4" /> {RIDER_TEXT.alerts.markAllReadBtn}
                        </button>
                        <div className="w-px h-4 bg-accent-brown/10" />
                        <button
                            onClick={deleteAllNotifications} disabled={notificationBusy}
                            className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-500 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                            <Trash2 className="w-4 h-4" /> {RIDER_TEXT.alerts.deleteAllBtn}
                        </button>
                    </div>
                )}

                {/* Alerts List */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="py-24 flex flex-col items-center gap-4">
                            <Loader2 className="w-10 h-10 text-brand animate-spin" />
                            <p className="text-[10px] font-black text-accent-brown/20 uppercase tracking-widest">{RIDER_TEXT.alerts.loading}</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {filteredAlerts.length === 0 ? (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="py-32 text-center bg-white/50 rounded-[3rem] border-2 border-dashed border-accent-brown/10 backdrop-blur-sm flex flex-col items-center"
                                >
                                    <div className="w-20 h-20 bg-accent-brown/5 rounded-[2rem] flex items-center justify-center mb-6">
                                        <Bell className="w-10 h-10 text-accent-brown/10" />
                                    </div>
                                    <h3 className="text-xl font-black text-accent-brown tracking-tight lowercase">{RIDER_TEXT.alerts.emptyTitle}</h3>
                                    <p className="text-[10px] font-black text-brand-dark/20 uppercase tracking-[0.2em] mt-2">{filter === 'unread' ? RIDER_TEXT.alerts.emptyUnread : RIDER_TEXT.alerts.emptyAll}</p>
                                </motion.div>
                            ) : (
                                filteredAlerts.map((alert, i) => {
                                    const Icon = getIcon(alert.type);
                                    return (
                                        <motion.div
                                            key={alert.id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: -50 }}
                                            transition={{ delay: i * 0.05 }}
                                            onClick={() => {
                                                if (!alert.read) markAsRead(alert.id);
                                                if (alert.link) navigate(alert.link);
                                            }}
                                            className={`group relative p-6 sm:p-8 rounded-[2.5rem] flex items-start justify-between gap-6 cursor-pointer transition-all border-2 ${
                                                alert.read
                                                    ? 'bg-[#FAF9F6]/50 border-accent-brown/5 opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0'
                                                    : 'bg-white border-brand/20 shadow-xl shadow-brand/5'
                                            }`}
                                        >
                                            <div className="flex items-start gap-6 flex-1 min-w-0">
                                                {/* Icon */}
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${getIconStyle(alert.type)}`}>
                                                    <Icon className="w-6 h-6" />
                                                </div>

                                                {/* Content */}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                                                            alert.read
                                                                ? 'bg-accent-brown/[0.08] text-accent-brown/40'
                                                                : 'bg-brand/10 text-brand-dark'
                                                        }`}>
                                                            {alert.type}
                                                        </span>
                                                        {!alert.read && <div className="w-1.5 h-1.5 rounded-full bg-brand-dark animate-pulse" />}
                                                    </div>
                                                    <h3 className={`font-black tracking-tighter text-lg leading-tight mb-1 transition-colors ${
                                                        alert.read ? 'text-brand-dark/50 group-hover:text-brand-dark' : 'text-brand-dark'
                                                    }`}>
                                                        {alert.title}
                                                    </h3>
                                                    <p className={`text-sm font-bold leading-relaxed max-w-2xl ${
                                                        alert.read ? 'text-accent-brown/30 group-hover:text-accent-brown/50' : 'text-accent-brown/60'
                                                    }`}>
                                                        {alert.desc}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-4 text-[10px] font-black text-accent-brown/20 uppercase tracking-[0.2em]">
                                                        <span>{new Date(alert.created_at).toLocaleDateString(undefined, {
                                                            month: 'long', day: 'numeric', year: 'numeric'
                                                        })}</span>
                                                        <span>·</span>
                                                        <span>{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Delete Toggle */}
                                            <div className="self-center">
                                                <motion.button
                                                    whileHover={{ scale: 1.1, backgroundColor: '#fee2e2', color: '#ef4444' }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={(e) => { e.stopPropagation(); deleteNotification(alert.id); }}
                                                    className="w-10 h-10 rounded-xl bg-accent-brown/5 flex items-center justify-center text-accent-brown/20 transition-all opacity-0 group-hover:opacity-100"
                                                    title={RIDER_TEXT.alerts.deleteTooltip}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </AnimatePresence>
                    )}
                </div>

            </div>
        </DashboardLayout>
    );
};

export default RiderAlerts;
