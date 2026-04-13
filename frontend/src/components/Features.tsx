import { motion } from 'framer-motion';
import { Package, Truck, Award, BarChart3, PawPrint, Target, ShieldCheck } from 'lucide-react';

export const Features = () => {
    const features = [
        {
            icon: Target,
            title: "Precision Sourcing",
            description: "A specialized catalog curated with surgical precision for discerning pet professionals and owners.",
            color: "bg-white border-accent-brown/5",
            size: "col-span-1 md:col-span-2",
            accent: "Expert Selection"
        },
        {
            icon: Truck,
            title: "Rider Logistics",
            description: "Seamless click-and-collect fulfillment powered by our dedicated rider workforce.",
            color: "bg-brand-dark text-white",
            size: "col-span-1"
        },
        {
            icon: ShieldCheck,
            title: "Clinic Standards",
            description: "Every product verified for professional veterinary use and standard compliance.",
            color: "bg-white border-accent-brown/5",
            size: "col-span-1"
        },
        {
            icon: BarChart3,
            title: "BI Analytics",
            description: "Empowering clinics with real-time data insights to optimize procurement and forecasting.",
            color: "bg-accent-brown text-white",
            size: "col-span-1 md:col-span-2 shadow-2xl shadow-accent-brown/20"
        },
        {
            icon: Award,
            title: "Elite Loyalty",
            description: "A multi-tier rewards program designed to value long-term health and commitment.",
            color: "bg-white border-accent-brown/5",
            size: "col-span-1 md:col-span-2"
        }
    ];

    return (
        <section className="py-24 sm:py-32 bg-white relative overflow-hidden">
            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-8">
                    <div className="max-w-2xl space-y-4">
                        <div className="inline-flex items-center gap-2 text-brand-dark uppercase tracking-[0.4em] text-[10px] font-black">
                            <div className="w-8 h-[2px] bg-brand-dark" />
                            Core Capabilities
                        </div>
                        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-accent-brown tracking-tighter leading-[0.95]">
                            Ecosystem Designed for <span className="text-brand-dark italic font-outfit">Supreme Efficiency.</span>
                        </h2>
                    </div>
                    <p className="text-lg sm:text-xl text-accent-brown/50 font-medium max-w-sm leading-relaxed">
                        Precision-engineered solutions for the modern veterinary supply chain and retail experience.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 xl:gap-8">
                    {features.map((f, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.6 }}
                            className={`${f.size} ${f.color} p-10 lg:p-12 rounded-[3.5rem] border flex flex-col justify-between min-h-[340px] shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden`}
                        >
                            <div className="relative z-10 h-full flex flex-col">
                                <div className="flex items-center justify-between mb-8">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner transition-transform group-hover:rotate-6 ${f.color.includes('bg-white') ? 'bg-accent-peach/30 border-brand/10' : 'bg-white/20 border-white/30'}`}>
                                        <f.icon className="w-7 h-7" />
                                    </div>
                                    {f.accent && (
                                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-dark opacity-40">
                                            {f.accent}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-auto">
                                    <h3 className="text-2xl lg:text-3xl font-black mb-4 uppercase tracking-tighter leading-none">
                                        {f.title}
                                    </h3>
                                    <p className={`text-base lg:text-lg font-medium leading-relaxed max-w-sm ${f.color.includes('text-white') ? 'opacity-80' : 'text-accent-brown/60'}`}>
                                        {f.description}
                                    </p>
                                </div>
                            </div>

                            {/* Decorative Grid Pattern */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Architectural Background Decoration */}
            <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-64 h-64 bg-brand/5 rounded-full blur-3xl" />
            <div className="absolute -right-20 bottom-0 w-96 h-96 bg-accent-peach/20 rounded-full blur-3xl" />
        </section>
    );
};
