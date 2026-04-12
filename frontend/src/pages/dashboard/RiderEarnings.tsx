import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    CreditCard, ArrowUpRight, DollarSign, 
    Calendar, ChevronRight, Package, Loader2,
    ArrowLeft, ArrowRight
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import RiderBottomNav from '../../components/RiderBottomNav';

const RiderEarnings = () => {
    const [stats, setStats] = useState({ 
        total_earnings: 0, 
        completed_orders: 0, 
        today_earnings: 0,
        pending_payout: 0 
    });
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 6;

    const fetchEarnings = async () => {
        const token = localStorage.getItem('hivet_token');
        try {
            const res = await fetch('http://localhost:8000/api/rider/earnings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }

            // Mocking history for now
            setHistory([
                { id: 10234, amount: 150, status: 'Completed', date: 'Today, 2:30 PM', address: '123 Rizal St, QC' },
                { id: 10232, amount: 120, status: 'Completed', date: 'Today, 11:15 AM', address: '456 Aurora Blvd, QC' },
                { id: 10221, amount: 200, status: 'Completed', date: 'Yesterday', address: '789 Katipunan, QC' },
                { id: 10220, amount: 180, status: 'Completed', date: 'Yesterday', address: '321 Commonwealth Ave, QC' },
                { id: 10219, amount: 140, status: 'Completed', date: '2 days ago', address: '555 Taft Ave, Manila' },
                { id: 10218, amount: 210, status: 'Completed', date: '2 days ago', address: '777 Espana Blvd, Manila' },
            ]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEarnings();
    }, []);

    return (
        <DashboardLayout title="Earnings">
            <div className="space-y-10 pb-32">
                {/* Fleet Treasury Master Card */}
                <div className="bg-brand-dark rounded-[3.5rem] p-10 sm:p-14 text-white shadow-[0_30px_60px_-15px_rgba(232,93,4,0.3)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full -mr-[250px] -mt-[250px] blur-[120px] group-hover:bg-white/10 transition-all duration-1000" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-32 -mb-32 blur-3xl" />
                    
                    <div className="relative z-10 flex flex-col gap-10">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-[2px] bg-white/20" />
                                    <h3 className="font-black text-white/40 uppercase tracking-[0.4em] text-[10px]">Fleet Treasury</h3>
                                </div>
                                <h2 className="text-5xl sm:text-7xl font-black tracking-tighter uppercase leading-none">
                                    ₱{stats.total_earnings.toFixed(2)}
                                </h2>
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30 italic">Accumulated Asset Value</p>
                            </div>
                            <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center backdrop-blur-3xl border border-white/10 shadow-2xl">
                                <CreditCard className="w-10 h-10 text-white" />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button className="flex-1 bg-white text-brand-dark h-[72px] rounded-[1.8rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-white hover:scale-[1.02] transition-all shadow-2xl active:scale-95">
                                Initiate Payout
                            </button>
                            <button className="flex-1 bg-white/5 border-2 border-white/10 h-[72px] rounded-[1.8rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-white/10 transition-all active:scale-95">
                                Operational Audit
                            </button>
                        </div>
                    </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {[
                        { 
                            label: "Today's Yield", 
                            value: `₱${stats.today_earnings}`, 
                            icon: DollarSign, 
                            color: "bg-white",
                            desc: "Confirmed earnings for this cycle."
                        },
                        { 
                            label: "Logistical Count", 
                            value: stats.completed_orders, 
                            icon: Package, 
                            color: "bg-brand-dark text-white",
                            desc: "Successful fulfilment completions."
                        }
                    ].map((stat, i) => (
                        <div key={i} className={`rounded-[2.5rem] p-10 shadow-sm border border-accent-brown/5 hover:shadow-2xl transition-all group/stat ${stat.color.includes('bg-white') ? 'bg-white' : stat.color}`}>
                            <div className="flex items-center justify-between mb-8">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border group-hover/stat:rotate-12 transition-transform ${stat.color.includes('bg-white') ? 'bg-accent-peach/20 text-accent-brown border-accent-brown/10' : 'bg-white/10 text-white border-white/10'}`}>
                                    <stat.icon size={24} />
                                </div>
                                <ArrowUpRight className={`${stat.color.includes('bg-white') ? 'text-accent-brown/10 group-hover/stat:text-brand-dark' : 'text-white/20 group-hover/stat:text-white'} transition-colors`} size={24} />
                            </div>
                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${stat.color.includes('bg-white') ? 'text-accent-brown/30' : 'text-white/40'}`}>{stat.label}</p>
                            <h4 className={`text-3xl font-black tracking-tighter uppercase ${stat.color.includes('bg-white') ? 'text-accent-brown' : 'text-white'}`}>{stat.value}</h4>
                            <p className={`text-[11px] font-bold mt-2 leading-relaxed italic ${stat.color.includes('bg-white') ? 'text-accent-brown/40' : 'text-white/60'}`}>{stat.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Transaction Ledger */}
                <div className="space-y-12">
                    <div className="flex items-center justify-between px-2">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-[2px] bg-accent-brown" />
                                <h3 className="font-black text-accent-brown uppercase tracking-[0.4em] text-[10px]">Operational Ledger</h3>
                            </div>
                        </div>
                        <button className="text-[10px] font-black text-accent-brown uppercase tracking-[0.3em] border-b-2 border-accent-brown/20 pb-1">Full Statement</button>
                    </div>

                    <div className="space-y-12">
                        {loading ? (
                            <div className="py-24 flex flex-col items-center justify-center gap-5">
                                <Loader2 className="animate-spin text-accent-brown" size={40} />
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-accent-brown/20">Auditing Streams...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                {history.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-white rounded-[2.5rem] p-10 border border-accent-brown/5 shadow-xl shadow-accent-brown/5 group/row cursor-pointer transition-all hover:border-brand-dark/20 flex flex-col min-h-[420px]"
                                    >
                                        <div className="flex justify-between items-start mb-10">
                                            <div className="w-16 h-16 bg-[#FAF9F6] group-hover/row:bg-brand-dark group-hover/row:text-white rounded-2xl flex items-center justify-center text-brand-dark transition-all border border-accent-brown/5">
                                                <ArrowUpRight size={28} />
                                            </div>
                                            <div className="text-right">
                                                <p className="text-3xl font-black text-accent-brown tracking-tighter">₱{item.amount.toFixed(2)}</p>
                                                <p className="text-[9px] font-black text-accent-brown uppercase tracking-widest mt-1">Success Drop</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-8">
                                            <div className="flex items-center gap-3">
                                                <p className="text-xl font-black text-accent-brown tracking-tighter">#HY-{item.id.toString().slice(-4)}</p>
                                                <div className="w-1.5 h-1.5 rounded-full bg-accent-brown/20" />
                                                <p className="text-[10px] font-black text-accent-brown/40 uppercase tracking-widest">{item.date}</p>
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-brown/20 italic">Validated Assignment</p>
                                        </div>

                                        <div className="flex-1 mb-8 p-6 bg-[#FAF9F6] rounded-[2rem] border border-accent-brown/5 flex flex-col justify-center">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-accent-brown/30 mb-2">Location Target</p>
                                            <p className="text-sm font-black text-accent-brown leading-tight uppercase tracking-tight line-clamp-2" title={item.address}>
                                                {item.address}
                                            </p>
                                        </div>

                                        <div className="pt-2 border-t border-accent-brown/5 flex items-center justify-between">
                                            <span className="text-[9px] font-black text-accent-brown/30 uppercase tracking-widest">Transaction Verified</span>
                                            <div className="w-10 h-10 rounded-full border border-accent-brown/5 flex items-center justify-center text-accent-brown/20 group-hover/row:text-brand-dark group-hover/row:border-brand-dark/20 transition-all">
                                                <ChevronRight size={18} />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Pagination Controls */}
                        {history.length > ITEMS_PER_PAGE && (
                            <div className="flex items-center justify-center gap-4 pt-10 border-t border-accent-brown/5">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="w-14 h-14 bg-white border border-accent-brown/10 rounded-2xl flex items-center justify-center text-accent-brown/40 hover:text-accent-brown disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                
                                <div className="flex items-center gap-3">
                                    {Array.from({ length: Math.ceil(history.length / ITEMS_PER_PAGE) }).map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`w-14 h-14 rounded-2xl text-xs font-black transition-all ${
                                                currentPage === i + 1 
                                                ? 'bg-brand-dark text-white shadow-lg shadow-brand-dark/20 scale-110' 
                                                : 'bg-white text-accent-brown hover:text-brand-dark hover:border-brand-dark/20 border border-accent-brown/5'
                                            }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(history.length / ITEMS_PER_PAGE), prev + 1))}
                                    disabled={currentPage === Math.ceil(history.length / ITEMS_PER_PAGE)}
                                    className="w-14 h-14 bg-white border border-accent-brown/10 rounded-2xl flex items-center justify-center text-accent-brown/40 hover:text-accent-brown disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                    <ArrowRight size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <RiderBottomNav />
        </DashboardLayout>
    );
};

export default RiderEarnings;
