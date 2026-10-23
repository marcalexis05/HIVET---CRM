import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, PawPrint, ChevronRight, ChevronLeft, Building2, Car, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MAIN_LANDING_TEXT } from '../constants/mainLandingWording';

// New Cinematic Images
import heroCustomer from '../assets/hero_customer.png';
import heroDoctor from '../assets/hero_doctor.png';
import heroRider from '../assets/hero_rider.png';

const SLIDE_IMAGES = [heroCustomer, heroDoctor, heroRider];
const SLIDE_ICONS = [
    <ShoppingCart className="w-5 h-5" />,
    <Building2 className="w-5 h-5" />,
    <Car className="w-5 h-5" />,
];

const SLIDES = MAIN_LANDING_TEXT.hero.slides.map((s, idx) => ({
    ...s,
    image: SLIDE_IMAGES[idx],
    icon: SLIDE_ICONS[idx],
}));

export const Hero = () => {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % SLIDES.length);
        }, 7000);
        return () => clearInterval(timer);
    }, []);

    const nextSlide = () => setCurrent((prev) => (prev + 1) % SLIDES.length);
    const prevSlide = () => setCurrent((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1));

    return (
        <section className="relative min-h-[680px] h-[100dvh] w-full flex items-center justify-center overflow-hidden bg-black font-brand">
            {/* Background Slideshow */}
            <div className="absolute inset-0 z-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={current}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                        className="absolute inset-0"
                    >
                        <img 
                            src={SLIDES[current].image} 
                            alt={SLIDES[current].imageAlt} 
                            className="w-full h-full object-cover object-center sm:object-right md:object-[75%_center]" 
                        />
                        {/* High-Contrast Professional Mask */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
                        <div className="absolute inset-0 bg-black/10" />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Content Container - Grid Layout */}
            <div className="container mx-auto px-6 sm:px-12 lg:px-20 relative z-30 w-full h-full pointer-events-none">
                <div className="grid grid-cols-1 lg:grid-cols-2 h-full items-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={current}
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            transition={{ duration: 0.8 }}
                            className="space-y-6 sm:space-y-8 pointer-events-auto"
                        >
                            <div className="space-y-4">
                                <h1 className="text-white text-5xl sm:text-7xl xl:text-8xl font-black leading-tight tracking-tight drop-shadow-2xl">
                                    {SLIDES[current].title}
                                </h1>
                                <div className="text-brand-dark text-2xl sm:text-3xl font-black font-outfit tracking-normal">
                                    {SLIDES[current].witty}
                                </div>
                            </div>

                            <p className="text-xl sm:text-2xl text-white/80 leading-relaxed font-semibold max-w-lg">
                                {SLIDES[current].subtitle}
                            </p>

                            <div className="flex flex-col sm:flex-row gap-5 pt-4 relative z-30 pointer-events-auto">
                                <Link 
                                    to={SLIDES[current].primaryLink} 
                                    className="group bg-brand-dark text-white px-8 sm:px-10 py-4 sm:py-5 rounded-full font-black flex items-center justify-center gap-4 text-sm shadow-xl shadow-brand/20 hover:bg-brand-dark/90 transition-all transform hover:-translate-y-1 active:scale-95 cursor-pointer relative z-30 pointer-events-auto"
                                >
                                    {SLIDES[current].icon}
                                    {SLIDES[current].primaryBtn}
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                </Link>
                                <Link 
                                    to={SLIDES[current].secondaryLink} 
                                    className="bg-white/10 backdrop-blur-md text-white border-2 border-white/20 px-8 sm:px-10 py-4 sm:py-5 rounded-full font-black flex items-center justify-center gap-4 text-sm hover:bg-white/20 transition-all shadow-xl cursor-pointer relative z-30 pointer-events-auto"
                                >
                                    {SLIDES[current].secondaryBtn}
                                </Link>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-6 sm:bottom-10 left-0 right-0 z-20 flex flex-col items-center gap-4 sm:gap-8 pointer-events-none">
                {/* Dots */}
                <div className="flex gap-3 pointer-events-auto">
                    {SLIDES.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setCurrent(i)}
                            className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${current === i ? 'w-16 bg-brand-dark' : 'w-4 bg-white/30 hover:bg-white/50'}`}
                            aria-label={MAIN_LANDING_TEXT.hero.controls.slideIndicatorAria(i, SLIDES.length)}
                        />
                    ))}
                </div>

                {/* Arrow Navigation */}
                <div className="flex gap-4 pointer-events-auto">
                    <button 
                        type="button"
                        onClick={prevSlide}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white/20 bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-brand-dark hover:border-brand-dark transition-all group cursor-pointer active:scale-95"
                        aria-label={MAIN_LANDING_TEXT.hero.controls.prevSlideAria}
                    >
                        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <button 
                        type="button"
                        onClick={nextSlide}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white/20 bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-brand-dark hover:border-brand-dark transition-all group cursor-pointer active:scale-95"
                        aria-label={MAIN_LANDING_TEXT.hero.controls.nextSlideAria}
                    >
                        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Background Paw Deco */}
            <div className="absolute top-1/2 left-0 w-full h-full pointer-events-none opacity-10">
                 <PawPrint className="absolute h-96 w-96 text-white -left-20 -bottom-20 rotate-12" />
                 <PawPrint className="absolute h-64 w-64 text-white right-0 -top-20 -rotate-12" />
            </div>
        </section>
    );
};
