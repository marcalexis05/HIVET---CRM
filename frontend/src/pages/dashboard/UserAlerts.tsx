import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, Info, CheckCircle2, Bell } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useNavigate } from 'react-router-dom';

const UserAlerts = () => {
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

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAsRead = async (id: number) => {
        const token = localStorage.getItem('hivet_token');
        try {
            await fetch(`http://localhost:8000/api/notifications/${id}/read`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (err) {
            console.error('Failed to mark read:', err);
        }
    };

    const markAllAsRead = async () => {
        const token = localStorage.getItem('hivet_token');
        try {
            await fetch('http://localhost:8000/api/notifications/read-all', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error('Failed to mark all read:', err);
        }
    };

    const deleteNotification = async (id: number) => {
        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch(`http://localhost:8000/api/notifications/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }
        } catch (err) {
            console.error('Failed to delete notification:', err);
        }
    };

    const deleteAllNotifications = async () => {
        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch('http://localhost:8000/api/notifications/all', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setNotifications([]);
            }
        } catch (err) {
            console.error('Failed to delete all notifications:', err);
        }
    };

    const filteredAlerts = filter === 'all'
        ? notifications
        : notifications.filter(n => !n.read);

    const getIcon = (type: string) => {
        switch (type) {
            case 'System': return Bell;
            case 'Promo': return Gift;
            case 'Reminder': return Info;
            default: return Bell;
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'System': return 'bg-brand text-brand-dark';
            case 'Promo': return 'bg-orange-400 text-white';
            case 'Reminder': return 'bg-blue-400 text-white';
            default: return 'bg-accent-brown/10 text-accent-brown';
        }
    };

    return (
        <DashboardLayout title="Alert Center">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header Controls */}
                <div className="flex items-center justify-between pb-4 border-b border-accent-brown/10">
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-full border transition-all ${filter === 'all' ? 'bg-brand/10 border-brand/20 text-brand-dark' : 'text-accent-brown/40 hover:text-accent-brown'}`}
                        >
                            All Alerts ({notifications.length})
                        </button>
                        <button
                            onClick={() => setFilter('unread')}
                            className={`px-4 py-2 rounded-full border transition-all ${filter === 'unread' ? 'bg-brand/10 border-brand/20 text-brand-dark' : 'text-accent-brown/40 hover:text-accent-brown'}`}
                        >
                            Unread ({notifications.filter(n => !n.read).length})
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={markAllAsRead}
                            className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 hover:text-brand-dark transition-colors flex items-center gap-2"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark all read
                        </button>
                        <button
                            onClick={deleteAllNotifications}
                            className="text-[10px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-500 transition-colors flex items-center gap-2"
                        >
                            <Bell className="w-3.5 h-3.5 rotate-[15deg]" /> Clear All
                        </button>
                    </div>
                </div>

                {/* Alerts List */}
                <div className="space-y-4">
                    {filteredAlerts.length === 0 ? (
                        <div className="py-20 text-center bg-white/50 rounded-[2rem] border-2 border-dashed border-accent-brown/10">
                            <Bell className="w-12 h-12 text-accent-brown/10 mx-auto mb-4" />
                            <p className="text-sm font-bold text-accent-brown/40 uppercase tracking-widest">No alerts to show</p>
                        </div>
                    ) : (
                        filteredAlerts.map((alert, i) => {
                            const Icon = getIcon(alert.type);
                            return (
                                <motion.div
                                    key={alert.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => {
                                        if (!alert.read) markAsRead(alert.id);
                                        if (alert.link) navigate(alert.link);
                                    }}
                                    className={`p-6 rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between gap-6 cursor-pointer transition-all border ${alert.read
                                        ? 'bg-transparent border-accent-brown/5 hover:bg-white'
                                        : 'bg-white border-brand/20 shadow-xl shadow-brand/5'
                                        }`}
                                >
                                    <div className="flex items-start gap-5">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${getColor(alert.type)}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1.5">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${alert.read ? 'bg-accent-brown/5 text-accent-brown/40' : 'bg-brand/10 text-brand-dark'
                                                    }`}>
                                                    {alert.type}
                                                </span>
                                                {!alert.read && <span className="w-2 h-2 rounded-full bg-brand"></span>}
                                            </div>
                                            <h3 className={`text-lg font-black tracking-tight mb-1 ${alert.read ? 'text-accent-brown/60' : 'text-accent-brown'}`}>
                                                {alert.title}
                                            </h3>
                                            <p className={`text-sm font-medium ${alert.read ? 'text-accent-brown/40' : 'text-accent-brown/70'}`}>
                                                {alert.desc}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-3 pl-[68px] sm:pl-0 shrink-0">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 whitespace-nowrap">
                                            {new Date(alert.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteNotification(alert.id);
                                            }}
                                            className="w-10 h-10 rounded-2xl bg-accent-peach/20 hover:bg-red-50 text-accent-brown/20 hover:text-red-500 flex items-center justify-center transition-all shadow-sm"
                                            title="Remove Notification"
                                        >
                                            <Bell className="w-4 h-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>

            </div>
        </DashboardLayout>
    );
};

export default UserAlerts;
