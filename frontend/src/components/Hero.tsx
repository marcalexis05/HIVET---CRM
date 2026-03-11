import { motion } from 'framer-motion';
import { ShoppingCart, PawPrint, Bone } from 'lucide-react';
import heroScene from '../assets/hero_scene.png';
import { Logo } from './Logo';

export const Hero = () => {
    return (
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-24 pb-16 px-4 overflow-hidden bg-accent-peach">
            {/* Top Navigation Spacer or Header elements could go here if needed, but nav is fixed */}

            <div className="container mx-auto text-center relative z-10 space-y-12">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1 }}
                    className="max-w-4xl mx-auto space-y-6"
                >
                    <div className="flex justify-center gap-4 mb-8">
                        <span className="bg-brand text-accent-brown px-4 py-1 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-sm">
                            Premium Pet Care
                        </span>
                    </div>

                    <h1 className="heading-xl flex flex-col items-center">
                        <span className="text-accent-brown">Hi-Vet</span>
                        <span className="text-brand-dark italic transform -rotate-1 mt-[-6px] xs:mt-[-10px] drop-shadow-sm font-outfit" style={{ fontSize: '1.2em' }}>Pet Store</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-accent-brown/70 max-w-2xl mx-auto leading-relaxed font-semibold">
                        Designing the future of specialized "Click and Collect" pet shopping.
                        Streamlining your workflow, one paw at a time.
                    </p>

                    <div className="flex flex-col xs:flex-row justify-center gap-4 xs:gap-6 pt-6 px-4 xs:px-0">
                        <button className="btn-primary group flex items-center justify-center gap-3 w-full xs:w-auto">
                            <ShoppingCart className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            Explore Shop
                        </button>
                        <button className="bg-white text-accent-brown px-8 xs:px-10 py-4 xs:py-5 rounded-full font-black border-2 border-brand/20 shadow-xl hover:bg-brand-light transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[10px] xs:text-sm w-full xs:w-auto">
                            <Bone className="w-5 h-5" />
                            Loyalty Page
                        </button>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.2, delay: 0.2 }}
                    className="relative w-full max-w-4xl mx-auto"
                >
                    {/* Decorative Arch Backdrop */}
                    <div className="absolute inset-0 bg-white/40 rounded-t-[10rem] sm:rounded-t-[15rem] rounded-b-[4rem] sm:rounded-b-[5rem] -z-10 transform translate-y-8 sm:translate-y-12 blur-2xl" />

                    <div className="relative rounded-t-[12rem] sm:rounded-t-[18rem] rounded-b-[4rem] sm:rounded-b-[6rem] overflow-hidden border-4 sm:border-8 border-white shadow-[0_30px_60px_-15px_rgba(35,21,12,0.15)] sm:shadow-[0_50px_100px_-20px_rgba(35,21,12,0.15)] bg-accent-cream">
                        <img
                            src={heroScene}
                            alt="Hi-Vet Professional Pet Scene"
                            className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-1000"
                        />
                    </div>

                    {/* Floating Elements (similar to bubbles in Lovimal) */}
                    <motion.div
                        className="absolute top-10 xs:top-20 -left-6 xs:-left-12 bg-white p-4 xs:p-6 rounded-[2rem] xs:rounded-[3rem] shadow-2xl z-20 flex items-center gap-3 xs:gap-4 border border-brand/5 max-w-[160px] xs:max-w-none"
                        animate={{ y: [0, -20, 0] }}
                        transition={{ duration: 5, repeat: Infinity }}
                    >
                        <div className="w-10 h-10 xs:w-14 xs:h-14 bg-white rounded-full flex items-center justify-center p-1 xs:p-1.5 shadow-inner shrink-0">
                            <Logo className="w-full h-full" />
                        </div>
                        <div className="text-left min-w-0">
                            <span className="block text-[10px] xs:text-sm font-black text-accent-brown uppercase tracking-tighter truncate">New Arrivals</span>
                            <span className="text-[8px] xs:text-xs font-bold text-accent-brown/40 truncate">Healthy Treats</span>
                        </div>
                    </motion.div>

                    <motion.div
                        className="absolute bottom-10 xs:bottom-20 -right-4 xs:-right-8 bg-white p-4 xs:p-6 rounded-[2rem] xs:rounded-[3rem] shadow-2xl z-20 flex items-center gap-3 xs:gap-4 border border-brand/5 max-w-[160px] xs:max-w-none"
                        animate={{ y: [0, 20, 0] }}
                        transition={{ duration: 6, repeat: Infinity }}
                    >
                        <div className="w-10 h-10 xs:w-14 xs:h-14 bg-brand-dark/10 rounded-full flex items-center justify-center text-brand-dark shrink-0">
                            <Bone className="w-5 h-5 xs:w-8 xs:h-8 rotate-45" />
                        </div>
                        <div className="text-left min-w-0">
                            <span className="block text-[10px] xs:text-sm font-black text-accent-brown uppercase tracking-tighter truncate">BI Dashboard</span>
                            <span className="text-[8px] xs:text-xs font-bold text-accent-brown/40 truncate">Real-time Stats</span>
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            {/* Scattered Paw Prints in Background */}
            <PawPrint className="paw-print top-[20%] left-[10%] rotate-12" />
            <PawPrint className="paw-print top-[40%] right-[15%] -rotate-12" />
            <PawPrint className="paw-print bottom-[10%] left-[20%] rotate-45" />
            <PawPrint className="paw-print top-[60%] left-[5%] -rotate-45" />
        </section>
    );
};
