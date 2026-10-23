import { motion } from 'framer-motion';
import { Truck, Award, BarChart3, PawPrint, Target, ShieldCheck } from 'lucide-react';
import { MAIN_LANDING_TEXT } from '../constants/mainLandingWording';

export const Features = () => {
    const cardVisuals = [
        {
            icon: Target,
            color: "bg-white border-accent-brown/5",
            size: "col-span-1 md:col-span-2",
        },
        {
            icon: Truck,
            color: "bg-brand-dark text-white",
            size: "col-span-1",
        },
        {
            icon: ShieldCheck,
            color: "bg-white border-accent-brown/5",
            size: "col-span-1",
        },
        {
            icon: BarChart3,
            color: "bg-accent-brown text-white",
            size: "col-span-1 md:col-span-2 shadow-2xl shadow-accent-brown/20",
        },
        {
            icon: Award,
            color: "bg-white border-accent-brown/5",
            size: "col-span-1 md:col-span-2",
        },
    ];

    const features = MAIN_LANDING_TEXT.features.cards.map((card, i) => ({
        ...card,
        ...cardVisuals[i],
    }));

    return (
        <section className="py-24 sm:py-32 bg-white relative overflow-hidden">
            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-8">
                    <div className="max-w-2xl space-y-4">
                        <div className="inline-flex items-center gap-2 text-brand-dark text-xs font-bold">
                            <div className="w-8 h-[2px] bg-brand-dark" />
                            {MAIN_LANDING_TEXT.features.tag}
                        </div>
                        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-accent-brown tracking-tighter leading-[0.95]">
                            {MAIN_LANDING_TEXT.features.titlePrefix} <span className="text-brand-dark italic font-outfit">{MAIN_LANDING_TEXT.features.titleHighlight}</span>
                        </h2>
                    </div>
                    <p className="text-lg sm:text-xl text-accent-brown/50 font-medium max-w-sm leading-relaxed">
                        {MAIN_LANDING_TEXT.features.subtitle}
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
                                        <span className="text-xs font-bold text-brand-dark opacity-60">
                                            {f.accent}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-auto">
                                    <h3 className="text-2xl lg:text-3xl font-black mb-4 tracking-tight leading-tight">
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

            {/* Background Paw Element */}
            <PawPrint className="absolute left-[-5%] bottom-[-5%] w-96 h-96 text-accent-brown/5 -rotate-12 pointer-events-none" />
        </section>
    );
};
