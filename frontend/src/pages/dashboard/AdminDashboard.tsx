import DashboardLayout from '../../components/DashboardLayout';
import { motion } from 'framer-motion';
import { DollarSign, Package, Users, TrendingUp, CheckCircle2, Clock } from 'lucide-react';

const AdminDashboard = () => {
    return (
        <DashboardLayout title="Business Overview">
            <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { title: "Today's Revenue", value: "₱2,450.00", icon: DollarSign, trend: "+12.5%" },
                        { title: 'Pending Reservations', value: '18', icon: Clock, trend: "-2" },
                        { title: 'Active Products', value: '30', icon: Package, trend: "+0" },
                        { title: 'Total Customers', value: '1,204', icon: Users, trend: "+4.2%" },
                    ].map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white p-6 rounded-[2rem] shadow-xl shadow-accent-brown/5 border border-white hover:border-brand/20 transition-all"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-accent-peach/20 rounded-2xl flex items-center justify-center text-brand-dark">
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${stat.trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {stat.trend}
                                </span>
                            </div>
                            <h3 className="text-3xl font-black text-accent-brown tracking-tighter">{stat.value}</h3>
                            <p className="text-xs font-bold text-accent-brown/40 uppercase tracking-widest mt-1">{stat.title}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Recent Orders - Takes 2 columns */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="lg:col-span-2 bg-white rounded-[2rem] p-8 shadow-xl shadow-accent-brown/5 border border-white"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black text-accent-brown">Recent Reservations</h2>
                            <button className="text-[10px] font-black uppercase tracking-widest text-brand-dark hover:text-brand transition-colors">View All</button>
                        </div>

                        <div className="space-y-4">
                            {[
                                { id: 'RV-8821', customer: 'Emma Thompson', item: 'Premium Velvet Nest', status: 'Pending Pickup', time: '10 mins ago' },
                                { id: 'RV-8822', customer: 'James Wilson', item: 'Organic Alpine Salmon', status: 'Ready', time: '2 hours ago' },
                                { id: 'RV-8823', customer: 'Sarah Davis', item: 'Leather Trekking Harness', status: 'Completed', time: '5 hours ago' },
                            ].map((order, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-accent-peach/10 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-accent-peach/30 flex items-center justify-center text-brand-dark font-black text-xs">
                                            {order.customer.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-accent-brown group-hover:text-brand-dark transition-colors">{order.customer}</p>
                                            <p className="text-xs font-medium text-accent-brown/50">{order.id} • {order.item}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black uppercase tracking-widest text-brand-dark">{order.status}</p>
                                        <p className="text-[10px] text-accent-brown/40 font-medium">{order.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Inventory Alerts - Takes 1 column */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="bg-brand-dark rounded-[2rem] p-8 text-white relative overflow-hidden"
                    >
                        <div className="relative z-10 h-full flex flex-col">
                            <div className="flex items-center gap-3 mb-8">
                                <TrendingUp className="w-6 h-6 text-brand" />
                                <h2 className="text-xl font-black tracking-tight">System Status</h2>
                            </div>

                            <div className="space-y-6 flex-1">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-xs font-bold text-white/60 uppercase tracking-widest">
                                        <span>Server Uptime</span>
                                        <span className="text-brand">99.9%</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-brand w-full rounded-full"></div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-xs font-bold text-white/60 uppercase tracking-widest">
                                        <span>Low Stock Alerts</span>
                                        <span className="text-brand text-orange-400">3 Items</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-orange-400 w-[15%] rounded-full"></div>
                                    </div>
                                </div>
                            </div>

                            <button className="w-full bg-white/10 hover:bg-white/20 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors mt-auto flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Run Diagnostics
                            </button>
                        </div>
                        {/* Decorative blob */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-brand/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    </motion.div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminDashboard;
