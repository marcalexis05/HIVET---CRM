import { motion } from 'framer-motion';
import { Clock, Wallet, HeartHandshake, Bike, Car, Smartphone, CheckCircle2 } from 'lucide-react';
import { Footer } from '../components/Footer';

export default function RiderLanding() {
    return (
        <div className="min-h-screen bg-accent-peach">
            {/* Hero Section */}
            <section id="benefits" className="relative min-h-[90vh] flex flex-col items-center justify-center pt-32 pb-16 px-4 overflow-hidden bg-accent-peach">
                <div className="container mx-auto text-center relative z-10 space-y-12">
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1 }}
                        className="max-w-4xl mx-auto space-y-6"
                    >
                        <div className="flex justify-center gap-4 mb-8">
                            <span className="bg-brand-dark text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-sm">
                                For Riders
                            </span>
                        </div>

                        <h1 className="heading-xl flex flex-col items-center">
                            <span className="text-accent-brown">Deliver Care,</span>
                            <span className="text-brand-dark italic transform -rotate-1 mt-[-6px] xs:mt-[-10px] drop-shadow-sm font-outfit" style={{ fontSize: '1.2em' }}>Earn Flexibly</span>
                        </h1>

                        <p className="text-xl md:text-2xl text-accent-brown/70 max-w-2xl mx-auto leading-relaxed font-semibold">
                            Join the Hi-Vet delivery network. Connect pet parents with essential medications and premium products on your own schedule.
                        </p>
                    </motion.div>

                    <motion.div
                        id="perks"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.2, delay: 0.2 }}
                        className="relative w-full max-w-5xl mx-auto mt-16"
                    >
                        <div className="absolute inset-0 bg-brand-light/30 rounded-[3rem] -z-10 transform translate-y-8 blur-3xl" />
                        <div className="bg-white rounded-[2rem] sm:rounded-[4rem] p-6 sm:p-12 shadow-2xl border-4 border-white/50 relative overflow-hidden">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left relative z-10">
                                <div className="space-y-4">
                                    <div className="w-14 h-14 bg-brand/20 rounded-2xl flex items-center justify-center text-brand-dark">
                                        <Clock className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-2xl font-black text-accent-brown uppercase tracking-tighter">Your Schedule</h3>
                                    <p className="text-accent-brown/70 font-medium">Drive whenever you want. You are your own boss, with complete control over your hours and availability.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="w-14 h-14 bg-accent-peach rounded-2xl flex items-center justify-center text-accent-brown">
                                        <Wallet className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-2xl font-black text-accent-brown uppercase tracking-tighter">Great Earnings</h3>
                                    <p className="text-accent-brown/70 font-medium">Receive competitive pay for every delivery, plus 100% of your tips. Get paid out fast with transparent earnings.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="w-14 h-14 bg-brand-dark/10 rounded-2xl flex items-center justify-center text-brand-dark">
                                        <HeartHandshake className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-2xl font-black text-accent-brown uppercase tracking-tighter">Meaningful Work</h3>
                                    <p className="text-accent-brown/70 font-medium">Every delivery helps a pet in need. You're not just moving packages; you're delivering essential healthcare.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Requirements Section */}
            <section id="requirements" className="py-24 bg-white relative overflow-hidden text-center rounded-t-[4rem]">
                <div className="container mx-auto px-4 relative z-10">
                    <h2 className="text-3xl xs:text-5xl font-black text-accent-brown mb-16 uppercase tracking-tighter">
                        What You <span className="text-brand">Need to Start</span>
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
                        {[
                            { icon: CheckCircle2, title: "Age 18+", desc: "Must be at least 18 years old to deliver." },
                            { icon: Car, title: "Vehicle", desc: "A car, scooter, or motorcycle with insurance." },
                            { icon: Smartphone, title: "Smartphone", desc: "Android device for the driver app." },
                            { icon: Bike, title: "Clear Record", desc: "Must pass a background and driving check." }
                        ].map((req, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="p-8 rounded-[2rem] bg-accent-peach/30 hover:bg-brand/10 transition-colors border border-brand/5 shadow-sm"
                            >
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm mx-auto text-brand-dark">
                                    <req.icon className="w-6 h-6" />
                                </div>
                                <h4 className="text-xl font-black text-accent-brown mb-3 uppercase">{req.title}</h4>
                                <p className="text-accent-brown/60 text-sm font-medium">{req.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <Footer variant="rider" />
        </div>
    );
}
