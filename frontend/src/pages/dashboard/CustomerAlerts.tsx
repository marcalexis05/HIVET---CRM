import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Info, Bell, CheckCircle2, Trash2, BellOff } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useNavigate } from 'react-router-dom';

const CustomerAlerts = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const navigate = useNavigate();

    const fetchNotifications = async () => {
        const token = localStorage.getItem('hivet_token');
        if (!token) return;
        try {
            const res = await fetch('http://localhost:8000/api/notifications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications);
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    };

    useEffect(() => { fetchNotifications(); }, []);

    const markAsRead = async (id: number) => {
        const token = localStorage.getItem('hivet_token');
        try {
            await fetch(`http://localhost:8000/api/notifications/${id}/read`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (err) { console.error(err); }
    };

    const markAllAsRead = async () => {
        const token = localStorage.getItem('hivet_token');
        try {
            await fetch('http://localhost:8000/api/notifications/read-all', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) { console.error(err); }
    };

    const deleteNotification = async (id: number) => {
        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch(`http://localhost:8000/api/notifications/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) { console.error(err); }
    };

    const deleteAllNotifications = async () => {
        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch('http://localhost:8000/api/notifications/all', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setNotifications([]);
        } catch (err) { console.error(err); }
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
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Filter + Actions bar */}
                <div className="flex items-center justify-between pb-5 border-b-2 border-accent-brown/10">
                    {/* Filter pills */}
                    <div className="flex items-center gap-2">
                        {(['all', 'unread'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border ${
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
                            onClick={markAllAsRead}
                            className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 hover:text-accent-brown transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark all read
                        </button>
                        <div className="w-px h-4 bg-accent-brown/15" />
                        <button
                            onClick={deleteAllNotifications}
                            className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer"
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
                                    <BellOff className="w-8 h-8 text-brand-dark/20" />
                                </div>
                                <p className="text-sm font-black text-brand-dark/30 uppercase tracking-widest">No alerts to show</p>
                                <p className="text-xs text-brand-dark/20 font-medium mt-1">You're all caught up!</p>
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
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                                                        alert.read
                                                            ? 'bg-accent-brown/[0.08] text-accent-brown/40'
                                                            : 'bg-brand/15 text-brand-dark'
                                                    }`}>
                                                        {alert.type}
                                                    </span>
                                                    {!alert.read && (
                                                        <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                                                    )}
                                                </div>
                                                <h3 className={`font-black tracking-tight text-base leading-snug mb-0.5 ${
                                                    alert.read ? 'text-brand-dark/50' : 'text-brand-dark'
                                                }`}>
                                                    {alert.title}
                                                </h3>
                                                <p className={`text-sm font-medium leading-relaxed ${
                                                    alert.read ? 'text-accent-brown/35' : 'text-accent-brown/65'
                                                }`}>
                                                    {alert.desc}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right: date + delete */}
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 whitespace-nowrap">
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
