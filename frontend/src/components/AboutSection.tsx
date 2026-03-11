import { motion } from 'framer-motion';
import { Heart, Zap, Users, Shield } from 'lucide-react';

const pillars = [
    {
        icon: Shield,
        title: 'Expert Care',
        desc: 'Every service is delivered by licensed vets and certified groomers with years of hands-on experience.',
        color: 'bg-blue-50 text-blue-600',
    },
    {
        icon: Zap,
        title: 'Convenience First',
        desc: 'Online booking, real-time status updates, and same-day availability — care on your schedule.',
        color: 'bg-orange-50 text-orange-600',
    },
    {
        icon: Users,
        title: 'Community Driven',
        desc: 'A loyalty program that grows with you. Refer friends, earn rewards, and be part of a pet-loving community.',
        color: 'bg-green-50 text-green-600',
    },
];

const stats = [
    { value: '12+', label: 'Years in Business' },
    { value: '24k+', label: 'Happy Pets Treated' },
    { value: '5', label: 'Clinic Locations' },
    { value: '98%', label: 'Satisfaction Rate' },
];


export function AboutSection() {
    return (
        <section id="about" className="py-20 md:py-32">
            <div className="container mx-auto px-4 xs:px-6 sm:px-8">
                {/* Header + Mission */}
                <div className="grid md:grid-cols-2 gap-16 items-center mb-24">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-dark mb-3 xs:mb-4 block">About Hi-Vet</span>
                        <h2 className="text-4xl xs:text-5xl md:text-6xl font-black text-accent-brown tracking-tighter leading-none mb-4 xs:mb-6">
                            Built for pets,<br />driven by love.
                        </h2>
                        <p className="text-accent-brown/60 text-base xs:text-lg font-medium leading-relaxed mb-4 xs:mb-6">
                            Hi-Vet was built with a single mission: make professional pet care accessible, stress-free, and rewarding. From our first tiny clinic in Los Angeles to five locations today, we've never stopped putting pets first.
                        </p>
                        <p className="text-accent-brown/50 text-sm xs:text-base font-medium leading-relaxed">
                            We combine licensed veterinary expertise with a modern CRM platform so every pet owner gets a seamless, personalised experience.
                        </p>
                        <div className="mt-6 xs:mt-8 flex items-center gap-2">
                            <Heart className="w-5 h-5 text-red-400 fill-red-400" />
                            <span className="text-xs xs:text-sm font-bold text-accent-brown/60">Serving the LA pet community</span>
                        </div>
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="grid grid-cols-2 gap-4"
                    >
                        {stats.map((s, i) => (
                            <motion.div
                                key={s.label}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: i * 0.1 }}
                                className="bg-white rounded-[1.5rem] xs:rounded-[2rem] p-6 xs:p-8 shadow-xl shadow-accent-brown/5 border border-white text-center"
                            >
                                <p className="text-4xl xs:text-5xl font-black text-accent-brown tracking-tighter leading-none mb-1 xs:mb-2">{s.value}</p>
                                <p className="text-[8px] xs:text-[10px] font-black uppercase tracking-widest text-accent-brown/40">{s.label}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>

                {/* Pillars */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="mb-24"
                >
                    <h3 className="text-3xl font-black text-accent-brown tracking-tight mb-10">Our Core Values</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {pillars.map((p, i) => (
                            <motion.div
                                key={p.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: i * 0.15 }}
                                className="bg-white rounded-[2rem] p-8 xs:p-10 shadow-xl shadow-accent-brown/5 border border-white hover:border-brand/20 transition-all"
                            >
                                <div className={`w-12 h-12 xs:w-14 xs:h-14 rounded-2xl flex items-center justify-center mb-4 xs:mb-6 ${p.color}`}>
                                    <p.icon className="w-6 h-6 xs:w-7 xs:h-7" />
                                </div>
                                <h4 className="font-black text-accent-brown text-lg xs:text-xl tracking-tight mb-2 xs:mb-3">{p.title}</h4>
                                <p className="text-accent-brown/50 font-medium leading-relaxed text-xs xs:text-sm">{p.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

            </div>
        </section>
    );
}
