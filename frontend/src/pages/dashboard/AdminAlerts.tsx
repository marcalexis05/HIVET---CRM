import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { Bell, ArrowRight, Store, Truck, Clock } from 'lucide-react';

const AdminAlerts = () => {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAlerts = async () => {
        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch('http://localhost:8000/api/admin/alerts', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAlerts(data.notifications || []);
            }
        } catch (err) {
            console.error('Failed to fetch alerts:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    return (
        <DashboardLayout title="System Alerts">
            <div className="max-w-4xl mx-auto">
                {isLoading ? (
                    <div className="py-20 text-center">
                        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-sm font-bold text-accent-brown/40 uppercase tracking-widest">Loading Alerts...</p>
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="py-20 text-center bg-white/50 rounded-[2rem] border-2 border-dashed border-accent-brown/10">
                        <Bell className="w-12 h-12 text-accent-brown/10 mx-auto mb-4" />
                        <p className="text-sm font-bold text-accent-brown/40 uppercase tracking-widest">No pending applications</p>
                        <p className="text-xs font-medium text-accent-brown/30 mt-2">All clinic and rider applications have been reviewed.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {alerts.map((alert) => (
                            <Link 
                                key={alert.id}
                                to={alert.link}
                                className="group bg-white hover:bg-brand/5 border border-accent-brown/5 rounded-3xl p-6 transition-all hover:shadow-xl hover:shadow-brand/5 flex items-center gap-6"
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm shrink-0 transition-transform group-hover:scale-110 ${
                                    alert.id.startsWith('clinic') ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'
                                }`}>
                                    {alert.id.startsWith('clinic') ? <Store className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-black text-lg text-accent-brown truncate">{alert.title}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm ${
                                            alert.id.startsWith('clinic') ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                            {alert.id.startsWith('clinic') ? 'Clinic' : 'Rider'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-accent-brown/60 font-medium">{alert.desc}</p>
                                    <div className="flex items-center gap-2 mt-2 text-[10px] font-bold text-accent-brown/30 uppercase tracking-widest">
                                        <Clock className="w-3 h-3" />
                                        <span>Submitted on {new Date(alert.created_at).toLocaleDateString()} at {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>

                                <div className="w-10 h-10 rounded-full bg-accent-peach/20 flex items-center justify-center text-accent-brown/20 group-hover:bg-brand group-hover:text-white transition-all">
                                    <ArrowRight className="w-5 h-5" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AdminAlerts;
