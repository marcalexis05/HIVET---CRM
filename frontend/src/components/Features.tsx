import { motion } from 'framer-motion';
import { Package, Truck, Award, BarChart3, PawPrint } from 'lucide-react';

export const Features = () => {
    const steps = [
        {
            icon: Package,
            title: "Smart Browsing",
            description: "Access a specialized catalog designed for the unique needs of pet owners.",
            color: "bg-brand/20 text-brand-dark",
            size: "col-span-1 md:col-span-2",
            image: true
        },
        {
            icon: Truck,
            title: "Click & Collect",
            description: "Reserve online and pick up at your local store in minutes.",
            color: "bg-accent-peach text-accent-brown",
            size: "col-span-1"
        },
        {
            icon: Award,
            title: "Loyalty Points",
            description: "Earn rewards and redeem exclusive vouchers for your furry friends.",
            color: "bg-brand-dark text-white",
            size: "col-span-1"
        },
        {
            icon: BarChart3,
            title: "BI Dashboard",
            description: "Advanced analytics for retail admins to track high-demand products.",
            color: "bg-accent-cream text-accent-brown",
            size: "col-span-1 md:col-span-2",
            border: true
        }
    ];

    return (
        <section className="py-20 bg-accent-peach/30 relative">
            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-12 xs:mb-16 max-w-2xl mx-auto space-y-3">
                    <h2 className="text-3xl xs:text-4xl md:text-5xl font-black text-accent-brown leading-tight">Designed for <span className="text-brand-dark">Efficiency</span></h2>
                    <p className="text-base xs:text-lg text-accent-brown/60 font-medium italic">Smooth operations from storefront to analytics.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {steps.map((s, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className={`${s.size} ${s.color} p-6 xs:p-8 md:p-10 rounded-[2.5rem] xs:rounded-[3rem] relative overflow-hidden flex flex-col justify-between min-h-[280px] xs:min-h-[320px] shadow-xl group hover:shadow-2xl transition-all ${s.border ? 'border-2 border-brand/10' : ''}`}
                        >
                            <div className="relative z-10">
                                <div className="w-12 h-12 xs:w-14 xs:h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 xs:mb-6 border border-white/30 group-hover:rotate-6 transition-transform">
                                    <s.icon className="w-6 h-6 xs:w-7 xs:h-7" />
                                </div>
                                <h3 className="text-xl xs:text-2xl font-black mb-2 xs:mb-3 uppercase tracking-tighter leading-none">{s.title}</h3>
                                <p className="text-sm xs:text-base font-medium opacity-80 leading-relaxed max-w-sm">{s.description}</p>
                            </div>

                            {/* Decorative Arched Elements inside cards */}
                            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all" />

                            <PawPrint className="absolute bottom-8 right-8 w-12 h-12 opacity-10 group-hover:rotate-12 transition-transform" />
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Background Texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <PawPrint
                        key={i}
                        className="absolute text-brand"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            transform: `rotate(${Math.random() * 360}deg) scale(${0.5 + Math.random()})`,
                            width: '80px',
                            height: '80px'
                        }}
                    />
                ))}
            </div>
        </section>
    );
};
