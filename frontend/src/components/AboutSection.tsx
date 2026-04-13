import { motion } from 'framer-motion';
import { Heart, Zap, Users, Shield, Award, Sparkles } from 'lucide-react';

const pillars = [
    {
        icon: Shield,
        title: 'Professional Integrity',
        desc: 'Licensed veterinary experts and certified specialists delivering care under rigorous clinical protocols.',
        color: 'bg-accent-brown text-white',
    },
    {
        icon: Zap,
        title: 'Synchronized Care',
        desc: 'Real-time infrastructure connecting clinics, riders, and owners for a frictionless experience.',
        color: 'bg-brand-dark text-white',
    },
    {
        icon: Sparkles,
        title: 'Premium Standard',
        desc: 'A commitment to excellence in every product, every interaction, and every tail wag.',
        color: 'bg-white border-brand/20 text-brand-dark',
    },
];


export function AboutSection() {
    return (
        <section id="about" className="py-24 sm:py-40 bg-[#FAF9F6] relative overflow-hidden">
            <div className="container mx-auto px-6">
                <div className="flex flex-col lg:flex-row gap-20 lg:gap-32 items-center mb-32">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="flex-1 space-y-8"
                    >
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-3 text-brand-dark uppercase tracking-[0.5em] text-[10px] font-black">
                                <div className="w-12 h-[2px] bg-brand-dark" />
                                Our Heritage
                            </div>
                            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black text-accent-brown tracking-tighter leading-[0.9] uppercase">
                                Built for <span className="text-brand-dark">Pets,</span><br />
                                Driven by <span className="italic font-outfit">Love.</span>
                            </h2>
                        </div>
                        
                        <div className="space-y-6 max-w-xl">
                            <p className="text-xl text-accent-brown/70 font-semibold leading-relaxed">
                                Hi-Vet was established with a singular objective: to architect a supply chain where quality pet care is not a luxury, but a seamless standard.
                            </p>
                            <p className="text-lg text-accent-brown/50 font-medium leading-relaxed">
                                By integrating deep veterinary expertise with cutting-edge logistics technology, we ensure every interaction is precise, rewarding, and deeply personal.
                            </p>
                        </div>

                        <div className="pt-4">
                            <div className="inline-flex items-center gap-4 px-6 py-3 bg-white rounded-full shadow-sm border border-accent-brown/5">
                                <Heart className="w-5 h-5 text-brand-dark fill-brand-dark" />
                                <span className="text-xs font-black uppercase tracking-widest text-accent-brown/60">Legacy of care and commitment</span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="flex-1 relative"
                    >
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-6 translate-y-12">
                                <div className="aspect-[4/5] rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl">
                                    <img src="/about-grid-1.png" alt="Care" className="w-full h-full object-cover" />
                                </div>
                                <div className="aspect-square rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl">
                                    <img src="/about-grid-3.png" alt="Clinical" className="w-full h-full object-cover" />
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="aspect-square rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl">
                                    <img src="/about-grid-2.png" alt="Professional" className="w-full h-full object-cover" />
                                </div>
                                <div className="aspect-[4/5] rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl">
                                    <img src="/about-grid-4.png" alt="Service" className="w-full h-full object-cover" />
                                </div>
                            </div>
                        </div>

                        {/* Abstract Background Element */}
                        <div className="absolute -z-10 -top-20 -right-20 w-80 h-80 bg-brand/10 rounded-full blur-[100px]" />
                        <div className="absolute -z-10 -bottom-20 -left-20 w-80 h-80 bg-accent-peach/30 rounded-full blur-[100px]" />
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {pillars.map((p, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: i * 0.1 }}
                            className="bg-white p-12 rounded-[3.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 border border-accent-brown/5 group"
                        >
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 border shadow-inner group-hover:scale-110 transition-transform ${p.color.includes('bg-white') ? 'bg-accent-peach/20 border-brand/20' : 'bg-current border-white/20'}`}>
                                <p.icon className={`w-8 h-8 ${p.color.includes('text-white') ? 'text-white' : 'text-accent-brown'}`} />
                            </div>
                            <h4 className="text-2xl font-black text-accent-brown uppercase tracking-tighter mb-4">{p.title}</h4>
                            <p className="text-accent-brown/50 font-medium leading-relaxed italic">
                                "{p.desc}"
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
