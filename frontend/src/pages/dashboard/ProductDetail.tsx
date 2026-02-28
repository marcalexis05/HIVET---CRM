import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Star, Heart, ChevronRight, CheckCircle2, Award } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { products } from '../../data/products';
import { useCart } from '../../context/CartContext';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const product = products.find(p => p.id === Number(id));
    const { addToCart, triggerFlyAnimation } = useCart();

    const [selectedVariant, setSelectedVariant] = useState('Standard');
    const [selectedSize, setSelectedSize] = useState('Medium');
    const [added, setAdded] = useState(false);

    if (!product) {
        return (
            <DashboardLayout title="Product Not Found">
                <div className="flex flex-col items-center justify-center py-20">
                    <h2 className="text-2xl font-black text-accent-brown mb-4">Product Not Found</h2>
                    <button onClick={() => navigate('/dashboard/user/catalog')} className="btn-primary">
                        Return to Catalog
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    // Mock customization options based on category/type
    const variants = ['Standard', 'Premium'];
    const sizes = ['Small', 'Medium', 'Large'];

    const handleAddToCart = (e: React.MouseEvent) => {
        if (!product) return;
        triggerFlyAnimation(e, product.image);
        addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1,
            variant: selectedVariant,
            size: selectedSize
        });
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    };

    const handleBuyNow = () => {
        if (!product) return;
        addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1,
            variant: selectedVariant,
            size: selectedSize
        });
        navigate('/dashboard/user/checkout');
    };

    return (
        <DashboardLayout title="Product Details">
            <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-xl shadow-accent-brown/5 border border-white min-h-[80vh]">

                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mb-10">
                    <Link to="/dashboard/user" className="hover:text-brand-dark transition-colors">My Hub</Link>
                    <ChevronRight className="w-3 h-3" />
                    <Link to="/dashboard/user/catalog" className="hover:text-brand-dark transition-colors">Catalog</Link>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-brand-dark truncate">{product.name}</span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 xl:gap-16">

                    {/* LEFT COLUMN: Info & Actions */}
                    <div className="lg:col-span-4 flex flex-col space-y-8">
                        <div>
                            <div className="inline-block bg-brand-dark text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4">
                                {product.tag}
                            </div>
                            <h1 className="text-4xl xl:text-5xl font-black text-accent-brown tracking-tighter leading-tight uppercase mb-4">
                                {product.name}
                            </h1>

                            <div className="flex items-center gap-4 text-xs font-bold text-accent-brown/50">
                                <div className="flex gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-3.5 h-3.5 ${i < product.stars ? 'text-brand fill-brand' : 'text-accent-brown/20'}`} />
                                    ))}
                                </div>
                                <span>{Math.floor(Math.random() * 200) + 15} reviews</span>
                            </div>

                            <p className="text-xs font-medium text-brand-dark mt-4">
                                As low as ₱{(Number(product.price) / 4).toFixed(2)}/month at 0% APR. <button className="underline">Apply now</button>
                            </p>
                        </div>

                        {/* Customization */}
                        <div className="space-y-6 pt-6 border-t border-accent-brown/10">
                            <h3 className="text-xs font-black uppercase tracking-widest text-accent-brown">Customize:</h3>

                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-accent-brown/50 uppercase">Variant:</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-black text-accent-brown">{selectedVariant}</span>
                                    <div className="flex gap-2">
                                        {variants.map(v => (
                                            <button
                                                key={v}
                                                onClick={() => setSelectedVariant(v)}
                                                className={`w-6 h-6 rounded-full border-2 ${selectedVariant === v ? 'border-brand-dark' : 'border-transparent'} ${v === 'Standard' ? 'bg-orange-100' : 'bg-orange-900'} transition-all`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-accent-brown/50 uppercase">Size:</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-black text-accent-brown">{selectedSize}</span>
                                    <div className="flex gap-2">
                                        {sizes.map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setSelectedSize(s)}
                                                className={`w-6 h-6 rounded-full border-2 ${selectedSize === s ? 'border-brand-dark' : 'border-transparent'} bg-accent-peach transition-all flex items-center justify-center text-[8px] font-black text-accent-brown`}
                                            >
                                                {s.charAt(0)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Price & Add to Cart */}
                        <div className="pt-6 border-t border-accent-brown/10">
                            <div className="flex items-center justify-between mb-6">
                                <span className="text-xs font-bold text-accent-brown/50 uppercase">Total:</span>
                                <div className="text-right">
                                    <span className="text-3xl font-black text-accent-brown tracking-tighter">₱{product.price}</span>
                                    <div className="flex items-center justify-end gap-1 text-brand mt-1">
                                        <Award className="w-3 h-3" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Earn {Math.floor(Number(product.price) * 0.10)} Loyalty Points</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={handleBuyNow}
                                    className="flex-1 bg-brand-dark hover:bg-black text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-colors shadow-lg shadow-brand-dark/20 text-center"
                                >
                                    Buy Now
                                </button>
                                <div className="flex flex-1 gap-4">
                                    <button
                                        onClick={handleAddToCart}
                                        className={`flex-1 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg ${added ? 'bg-green-500 shadow-green-500/20' : 'bg-brand hover:bg-orange-500 text-brand-dark hover:text-white shadow-brand/20'}`}
                                    >
                                        {added ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4" />
                                                Added!
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingCart className="w-4 h-4" />
                                                Add to Cart
                                            </>
                                        )}
                                    </button>
                                    <button className="w-14 h-14 shrink-0 bg-white border-2 border-accent-brown/10 hover:border-brand/30 rounded-xl flex items-center justify-center text-accent-brown/40 hover:text-brand transition-colors">
                                        <Heart className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="pt-6 border-t border-accent-brown/10">
                            <h3 className="text-xs font-black uppercase tracking-widest text-accent-brown mb-3">Product Description:</h3>
                            <p className="text-xs font-medium text-accent-brown/60 leading-relaxed">
                                {product.description} Carefully formulated to provide the highest quality experience, it stands out with premium ingredients and unmatched durability. Perfect for enhancing the daily life of your beloved companion.
                            </p>
                        </div>
                    </div>

                    {/* MIDDLE COLUMN: Main Image */}
                    <div className="lg:col-span-5 flex items-center justify-center p-8 bg-accent-peach/5 rounded-[2rem] relative group overflow-hidden min-h-[400px]">
                        <motion.img
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-contain max-h-[500px] drop-shadow-2xl group-hover:scale-105 transition-transform duration-700"
                        />
                    </div>

                    {/* RIGHT COLUMN: Thumbnails & Specs */}
                    <div className="lg:col-span-3 flex flex-col justify-between gap-8">
                        {/* Thumbnails Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="aspect-square bg-accent-peach/10 rounded-xl overflow-hidden cursor-pointer hover:border-2 border-brand/50 transition-all p-2 flex items-center justify-center opacity-70 hover:opacity-100">
                                    <img
                                        src={product.image}
                                        alt={`Thumbnail ${i + 1}`}
                                        className={`w-full h-full object-contain transform ${i % 2 === 0 ? 'scale-110 -translate-x-2' : 'scale-90 translate-y-2'}`}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Specifications Card */}
                        <div className="bg-white border-2 border-accent-brown/5 rounded-2xl p-6 space-y-6">
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mb-1">Category</h4>
                                <p className="text-xs font-bold text-accent-brown uppercase">{product.category}</p>
                            </div>
                            <div className="w-full h-[1px] bg-accent-brown/5" />
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mb-1">Product Type</h4>
                                <p className="text-xs font-bold text-accent-brown uppercase">{product.type}</p>
                            </div>
                            <div className="w-full h-[1px] bg-accent-brown/5" />
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mb-1">Item Weight</h4>
                                <p className="text-xs font-bold text-accent-brown uppercase">2.4 lbs</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
};

export default ProductDetail;
