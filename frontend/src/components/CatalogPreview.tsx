import { motion } from 'framer-motion';
import { PawPrint, ArrowRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MAIN_LANDING_TEXT } from '../constants/mainLandingWording';
import foodImg from '../assets/food_bag.png';
import accessoriesImg from '../assets/cat_accessories.png';
import vitaminsImg from '../assets/dog_vitamins.png';

const CATEGORY_IMAGES = [foodImg, accessoriesImg, vitaminsImg];

export const CatalogPreview = () => {
    const categories = MAIN_LANDING_TEXT.storePreview.categories.map((c, i) => ({
        ...c,
        image: CATEGORY_IMAGES[i],
    }));

    return (
        <section className="py-24 sm:py-32 bg-white relative overflow-hidden" id="catalog">
            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
                    <div className="max-w-3xl space-y-6">
                        <div className="inline-flex items-center gap-3 text-brand-dark text-xs font-bold">
                            <div className="w-8 h-[2px] bg-brand-dark" />
                            {MAIN_LANDING_TEXT.storePreview.tag}
                        </div>
                        <h2 className="text-5xl sm:text-6xl md:text-7xl font-black text-accent-brown leading-tight tracking-tight">
                            {MAIN_LANDING_TEXT.storePreview.titlePrefix} <br />
                            <span className="text-brand-dark italic font-outfit">{MAIN_LANDING_TEXT.storePreview.titleHighlight}</span>
                        </h2>
                    </div>
                    <p className="text-xl text-accent-brown/50 font-medium max-w-sm leading-relaxed">
                        {MAIN_LANDING_TEXT.storePreview.subtitle}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                    {categories.map((c, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1, duration: 0.6 }}
                            className="group"
                        >
                            <Link to={`/catalog?type=${c.name}`} className="relative block aspect-[4/5] rounded-[3.5rem] overflow-hidden bg-[#F0F0F0] shadow-sm group-hover:shadow-2xl transition-all duration-700">
                                <img
                                    src={c.image}
                                    alt={c.name}
                                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-[1.5s] ease-out"
                                />

                                {/* Interactive Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-12">
                                    <div className="translate-y-8 group-hover:translate-y-0 transition-transform duration-500 space-y-4 text-white">
                                        <div className="inline-flex items-center gap-2 text-brand-dark font-black text-xs font-bold">
                                            <ExternalLink className="w-3 h-3" />
                                            {MAIN_LANDING_TEXT.storePreview.shopNow}
                                        </div>
                                        <p className="text-white/70 font-medium italic">{c.desc}</p>
                                    </div>
                                </div>
                                
                                <div className="absolute top-8 left-8">
                                    <span className="bg-white/90 backdrop-blur-md text-accent-brown px-4 py-2 rounded-full text-xs font-bold shadow-xl">
                                        {c.tag}
                                    </span>
                                </div>
                            </Link>

                            <div className="mt-8 space-y-2 group-hover:translate-x-2 transition-transform duration-500">
                                <h3 className="text-3xl font-black text-accent-brown group-hover:text-brand transition-colors tracking-tight">{c.name}</h3>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-[1px] bg-brand/30" />
                                    <p className="text-accent-brown/40 text-xs font-medium">
                                        {c.count}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="mt-20 flex justify-center">
                    <Link to="/catalog" className="group flex items-center gap-6 bg-accent-brown text-white pl-10 pr-4 py-4 rounded-full font-bold text-xs shadow-2xl hover:bg-brand-dark transition-all transform hover:-translate-y-1">
                        {MAIN_LANDING_TEXT.storePreview.visitStoreBtn}
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                            <ArrowRight className="w-5 h-5" />
                        </div>
                    </Link>
                </div>
            </div>

            {/* Background Paw Element */}
            <PawPrint className="absolute right-[-5%] top-[10%] w-64 h-64 text-accent-brown/5 rotate-[45deg] pointer-events-none" />
        </section>
    );
};
