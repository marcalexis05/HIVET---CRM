import { motion } from 'framer-motion';
import { ShoppingCart, PawPrint } from 'lucide-react';
import { Link } from 'react-router-dom';
import foodImg from '../assets/food_bag.png';
import accessoriesImg from '../assets/cat_accessories.png';
import vitaminsImg from '../assets/dog_vitamins.png';

export const CatalogPreview = () => {
    const categories = [
        { name: 'Food', count: '120+ Items', color: 'bg-[#f4a261]', image: foodImg, arch: true },
        { name: 'Accessories', count: '85+ Items', color: 'bg-[#e76f51]', image: accessoriesImg, arch: true },
        { name: 'Vitamins', count: '45+ Items', color: 'bg-[#f8a84a]', image: vitaminsImg, arch: true },
    ];

    return (
        <section className="py-32 bg-white relative overflow-hidden" id="catalog">
            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
                    <span className="text-brand font-black uppercase tracking-[0.3em] text-xs">Our Collections</span>
                    <h2 className="text-5xl md:text-7xl font-black text-accent-brown leading-tight">
                        Quality Meets <br />
                        <span className="text-brand-dark italic">Happy Tails</span>
                    </h2>
                    <p className="text-xl text-accent-brown/60 font-medium leading-relaxed">
                        Every product is hand-picked to ensure the highest standards for your beloved companions.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20">
                    {categories.map((c, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.2, duration: 0.8 }}
                            className="group flex flex-col items-center"
                        >
                            <Link to={`/catalog?type=${c.name}`} className="arch-card w-full shadow-2xl shadow-accent-brown/5 overflow-hidden block">
                                <img
                                    src={c.image}
                                    alt={c.name}
                                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                                />

                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-10">
                                    <div className="w-full py-4 bg-white rounded-full font-black text-xs uppercase tracking-widest text-accent-brown transform translate-y-4 group-hover:translate-y-0 transition-all text-center">
                                        Explored {c.name}
                                    </div>
                                </div>

                                <PawPrint className="paw-print bottom-4 right-4 text-white/40 opacity-100" />
                            </Link>

                            <div className="text-center mt-10 space-y-3">
                                <h3 className="text-4xl font-black text-accent-brown group-hover:text-brand-dark transition-colors">{c.name}</h3>
                                <p className="text-accent-brown/40 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                                    <span className="w-1 h-1 bg-brand rounded-full" />
                                    {c.count}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Additional Call to Action */}
                <div className="mt-24 text-center">
                    <Link to="/catalog" className="bg-accent-peach text-accent-brown px-12 py-5 rounded-full font-black hover:bg-brand-light transition-all inline-flex items-center gap-4 mx-auto border-2 border-brand/10 uppercase tracking-widest text-sm shadow-xl shadow-accent-brown/5">
                        <ShoppingCart className="w-5 h-5" />
                        Full Catalog (500+ Items)
                    </Link>
                </div>
            </div>

            {/* Background Paw Prints */}
            <PawPrint className="paw-print top-[10%] left-[-2%] w-32 h-32 rotate-12" />
            <PawPrint className="paw-print bottom-[5%] right-[-2%] w-40 h-40 -rotate-12" />
        </section>
    );
};
