/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShoppingCart, Star, ChevronRight, CheckCircle2, Award, 
    Loader2, Navigation2, Ruler, ExternalLink,
    Store, User, Minus, Plus
} from 'lucide-react';
import { APIProvider, Map, useMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import DashboardLayout from '../../components/DashboardLayout';
import { useCart } from '../../context/CartContext';

const DirectionsLine = ({ userLat, userLng, clinicLat, clinicLng }: { userLat: number | null, userLng: number | null, clinicLat: number, clinicLng: number }) => {
    const map = useMap();
    useEffect(() => {
        const maps = (window as any).google.maps;
        if (!maps || !map || !userLat || !userLng) return;

        const renderer = new maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: '#F58634',
                strokeWeight: 6,
                strokeOpacity: 0.8
            }
        });

        const service = new maps.DirectionsService();
        service.route(
            {
                origin: { lat: userLat, lng: userLng },
                destination: { lat: clinicLat, lng: clinicLng },
                travelMode: maps.TravelMode.DRIVING
            },
            (result: any, status: any) => {
                if (status === 'OK') {
                    renderer.setDirections(result);
                }
            }
        );

        return () => {
            renderer.setMap(null);
        };
    }, [map, userLat, userLng, clinicLat, clinicLng]);

    return null;
};

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart, triggerFlyAnimation } = useCart();

    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedVariant, setSelectedVariant] = useState('');
    const [selectedSize, setSelectedSize] = useState('');
    const [added, setAdded] = useState(false);
    const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
    const [distance, setDistance] = useState<string | null>(null);
    const [showMap, setShowMap] = useState(false);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        const fetchProduct = async () => {
            setLoading(true);
            try {
                const resp = await fetch(`http://localhost:8000/api/catalog/${id}`);
                if (resp.ok) {
                    const data = await resp.json();
                    setProduct(data);
                } else {
                    setProduct(null);
                }
            } catch (err) {
                console.error('Fetch error:', err);
                setProduct(null);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchProduct();

        // Get user location for distance calculation
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                (err) => console.warn('Geolocation error:', err),
                { enableHighAccuracy: true }
            );
        }
    }, [id]);

    useEffect(() => {
        if (userLoc && product?.clinic_lat && product?.clinic_lng) {
            const maps = (window as any).google?.maps;
            if (maps) {
                const service = new maps.DistanceMatrixService();
                service.getDistanceMatrix(
                    {
                        origins: [userLoc],
                        destinations: [{ lat: product.clinic_lat, lng: product.clinic_lng }],
                        travelMode: maps.TravelMode.DRIVING,
                        unitSystem: maps.UnitSystem.METRIC,
                    },
                    (response: any, status: any) => {
                        if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
                            setDistance(response.rows[0].elements[0].distance.text);
                        }
                    }
                );
            }
        }
    }, [userLoc, product]);

    const parsedVariants: {name: string, price: string, image?: string, sizes?: {name: string, price: string, stock: string}[]}[] = useMemo(() => product?.variants_json ? JSON.parse(product.variants_json) : [], [product]);
    
    // Sizes are now either from the variant OR the base product
    const parsedSizes: {name: string, price: string, stock: string, image?: string}[] = useMemo(() => {
        if (selectedVariant) {
            const v = parsedVariants.find(v => v.name === selectedVariant);
            return (v?.sizes || []) as {name: string, price: string, stock: string, image?: string}[];
        }
        return (product?.sizes_json ? JSON.parse(product.sizes_json) : []) as {name: string, price: string, stock: string, image?: string}[];
    }, [product, selectedVariant, parsedVariants]);

    useEffect(() => {
        if (product && parsedVariants.length > 0 && !selectedVariant) {
            // Only auto-select if nothing is selected and we haven't manually cleared it
        }
    }, [product, parsedVariants]);

    // Set initial selections once when product is loaded
    useEffect(() => {
        if (product) {
            if (parsedVariants.length > 0) setSelectedVariant(parsedVariants[0].name);
            if (product.sizes_json) {
                const sizes = JSON.parse(product.sizes_json);
                if (sizes.length > 0) setSelectedSize(sizes[0].name);
            }
        }
    }, [product]);

    const activeVar = parsedVariants.find(v => v.name === selectedVariant);
    const activeSiz = parsedSizes.find(s => s.name === selectedSize);

    const priceFromSize = activeSiz?.price && Number(activeSiz.price) > 0 ? Number(activeSiz.price) : 0;
    const priceFromVariant = activeVar?.price && Number(activeVar.price) > 0 ? Number(activeVar.price) : 0;
    
    // Stock level depends on selected variant and size
    const availableStock = activeSiz ? parseInt(activeSiz.stock || '0') : (product?.stock || 0);
    
    const finalPrice = product ? (priceFromSize || priceFromVariant || product.price) : 0;
    const finalImage = activeSiz?.image || activeVar?.image || product?.image;

    if (loading) {
        return (
            <DashboardLayout title="Loading Product...">
                <div className="flex flex-col items-center justify-center py-40 gap-4 opacity-40">
                    <Loader2 className="w-12 h-12 animate-spin text-brand" />
                    <p className="font-black text-xs uppercase tracking-widest">Retrieving Premium Item...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!product) {
        return (
            <DashboardLayout title="Product Not Found">
                <div className="flex flex-col items-center justify-center py-20">
                    <h2 className="text-2xl font-black text-accent-brown mb-4">Product Not Found</h2>
                    <button onClick={() => navigate('/dashboard/customer/catalog')} className="bg-brand-dark text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all cursor-pointer">
                        Return to Catalog
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const handleAddToCart = (e: React.MouseEvent) => {
        if (!product) return;
        triggerFlyAnimation(e, product.image);
        addToCart({
            id: product.id,
            business_id: product.business_id,
            name: product.name,
            price: String(finalPrice),
            image: finalImage,
            quantity: quantity,
            variant: selectedVariant,
            size: selectedSize,
            stock: availableStock
        });
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    };

    const handleBuyNow = () => {
        if (!product) return;
        addToCart({
            id: product.id,
            business_id: product.business_id,
            name: product.name,
            price: String(finalPrice),
            image: finalImage,
            quantity: quantity,
            variant: selectedVariant,
            size: selectedSize,
            stock: availableStock
        });
        navigate('/dashboard/customer/checkout');
    };

    return (
        <DashboardLayout title="Product Details">
            <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-xl shadow-accent-brown/5 border border-white min-h-[80vh]">

                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent-brown/40 mb-10">
                    <Link to="/dashboard/customer" className="hover:text-brand-dark transition-colors">My Hub</Link>
                    <ChevronRight className="w-3 h-3" />
                    <Link to="/dashboard/customer/catalog" className="hover:text-brand-dark transition-colors">Catalog</Link>
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
                                As low as ₱{(Number(product.price) / 4).toFixed(2)}/month at 0% APR. <button className="underline cursor-pointer">Apply now</button>
                            </p>
                        </div>

                        {/* Customization */}
                        {(parsedVariants.length > 0 || parsedSizes.length > 0) && (
                        <div className="space-y-6 pt-6 border-t border-accent-brown/10">
                            <h3 className="text-xs font-black uppercase tracking-widest text-accent-brown">Customize:</h3>

                            {parsedVariants.length > 0 && (
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-accent-brown/50 uppercase">Variant:</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-black text-accent-brown">{selectedVariant}</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setSelectedVariant('')}
                                            className={`w-6 h-6 rounded-full border-2 cursor-pointer ${!selectedVariant ? 'border-brand-dark' : 'border-transparent'} bg-white transition-all flex items-center justify-center text-[8px] font-black text-accent-brown`}
                                            title="Default"
                                        >
                                            Ø
                                        </button>
                                        {parsedVariants.map(v => (
                                            <button
                                                key={v.name}
                                                onClick={() => setSelectedVariant(v.name)}
                                                className={`w-6 h-6 rounded-full border-2 cursor-pointer ${selectedVariant === v.name ? 'border-brand-dark' : 'border-transparent'} ${v.name.includes('Standard') ? 'bg-orange-100' : 'bg-orange-900'} transition-all`}
                                                title={v.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            )}

                            {parsedSizes.length > 0 && (
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-accent-brown/50 uppercase">Size:</span>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex gap-2">
                                        {parsedSizes.map(s => (
                                            <button
                                                key={s.name}
                                                onClick={() => setSelectedSize(s.name)}
                                                className={`px-4 py-1 rounded-full border-2 text-[10px] font-black uppercase tracking-widest transition-all ${selectedSize === s.name ? 'border-brand-dark bg-brand/10 text-brand-dark' : 'border-accent-peach/30 text-accent-brown/40'}`}
                                            >
                                                {s.name}
                                            </button>
                                        ))}
                                        {parsedSizes.length === 0 && <span className="text-[10px] font-bold text-accent-brown/20 italic">No alternative sizes</span>}
                                    </div>
                                    {activeSiz && (
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${parseInt(activeSiz.stock || '0') > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {activeSiz.stock} Items Left
                                        </p>
                                    )}
                                </div>
                            </div>
                            )}
                        </div>
                        )}

                        {/* Price & Add to Cart */}
                        <div className="pt-6 border-t border-accent-brown/10">
                            <div className="flex items-center justify-between gap-4 mb-8">
                                <div>
                                    <p className="text-[10px] font-black text-accent-brown/30 uppercase tracking-[0.2em] mb-1 font-outfit">Total Investment</p>
                                    <h4 className="text-4xl font-black text-accent-brown tracking-tighter">₱{finalPrice}</h4>
                                    <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${availableStock > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {availableStock > 0 ? `${availableStock} units available` : 'Out of stock'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1.5 text-brand bg-brand/5 px-3 py-1.5 rounded-full border border-brand/10">
                                        <Award className="w-4 h-4" />
                                        <span className="text-[10px] font-black tracking-widest uppercase">Earn {product?.loyalty_points || 0} Points</span>
                                    </div>
                                    <p className="text-[8px] font-bold text-accent-brown/40 uppercase mt-2 tracking-widest">Hivet Rewards Program</p>
                                </div>
                            </div>

                            {/* CTAs */}
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-4 bg-accent-peach/10 p-3 rounded-2xl border border-accent-peach/20 w-fit">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 ml-2">Quantity:</span>
                                    <div className="flex items-center gap-4 bg-white rounded-xl p-1 shadow-sm border border-accent-brown/5">
                                        <button
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-accent-brown hover:bg-accent-peach/20 transition-colors"
                                        >
                                            <Minus className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="text-sm font-black text-brand-dark min-w-[20px] text-center">{quantity}</span>
                                        <button
                                            onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-accent-brown hover:bg-accent-peach/20 transition-colors"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    {quantity >= availableStock && availableStock > 0 && (
                                        <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter animate-pulse">Max Stock Reached</span>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 text-nowrap">
                                    <button
                                        disabled={availableStock <= 0 || quantity > availableStock}
                                        onClick={handleBuyNow}
                                        className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-colors shadow-lg text-center cursor-pointer ${(availableStock > 0 && quantity <= availableStock) ? "bg-brand-dark hover:bg-black text-white shadow-brand-dark/20" : "bg-accent-brown/20 text-accent-brown/50 cursor-not-allowed"}`}
                                    >
                                        {availableStock > 0 ? (quantity > availableStock ? "Exceeds Stock" : "Buy Now") : "Sold Out"}
                                    </button>
                                    <div className="flex flex-1 gap-4">
                                        <button
                                            disabled={availableStock <= 0 || quantity > availableStock}
                                            onClick={handleAddToCart}
                                            className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${(availableStock > 0 && quantity <= availableStock) ? (added ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-brand hover:bg-orange-500 text-white shadow-brand/20') : "bg-accent-brown/20 text-accent-brown/50 cursor-not-allowed"}`}
                                        >
                                            {added ? (
                                                <>
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Added!
                                                </>
                                            ) : (
                                                <>
                                                    <ShoppingCart className="w-4 h-4" />
                                                    {(availableStock > 0 && quantity <= availableStock) ? "Add to Cart" : (availableStock <= 0 ? "Out of Stock" : "Exceeds Stock")}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Clinic Identity Card */}
                            {product.clinic_name && (
                                <div className="mt-8 p-6 bg-accent-peach/10 rounded-[2rem] border border-accent-peach/20 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-brand-dark rounded-xl flex items-center justify-center text-white shadow-lg">
                                                <Store className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-tight text-accent-brown">{product.clinic_name}</h4>
                                                <p className="text-[10px] font-bold text-accent-brown/40 uppercase tracking-widest">{product.clinic_phone || 'Contact Private'}</p>
                                            </div>
                                        </div>
                                        {distance && (
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-1 text-brand">
                                                    <Ruler className="w-3 h-3" />
                                                    <span className="text-[10px] font-black">{distance}</span>
                                                </div>
                                                <span className="text-[8px] font-bold text-accent-brown/30 uppercase tracking-widest leading-none">Your Location</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        <button 
                                            onClick={() => setShowMap(!showMap)}
                                            className="flex items-center justify-center gap-2 py-3 bg-white border border-brand/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-brand-dark hover:bg-brand hover:text-white transition-all shadow-sm"
                                        >
                                            <Navigation2 className={`w-3 h-3 ${showMap ? 'rotate-180' : ''} transition-transform`} />
                                            {showMap ? 'Hide Map' : 'Show Map'}
                                        </button>
                                    </div>

                                    <AnimatePresence>
                                        {showMap && product.clinic_lat && product.clinic_lng && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 280, opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden rounded-2xl relative border border-brand/10"
                                            >
                                                <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                                                    <Map
                                                        style={{ width: '100%', height: '100%' }}
                                                        defaultCenter={{ lat: product.clinic_lat, lng: product.clinic_lng }}
                                                        defaultZoom={15}
                                                        gestureHandling={'greedy'}
                                                        disableDefaultUI={true}
                                                        mapId="f1966a3666683884" // Added Map ID to fix AdvancedMarker issues
                                                    >
                                                        <AdvancedMarker position={{ lat: product.clinic_lat, lng: product.clinic_lng }}>
                                                            <div className="w-8 h-8 bg-brand-dark rounded-lg flex items-center justify-center text-white shadow-2xl border-2 border-white ring-4 ring-brand/20">
                                                                <Store className="w-4 h-4" />
                                                            </div>
                                                        </AdvancedMarker>

                                                        {userLoc && (
                                                            <>
                                                                <AdvancedMarker position={userLoc}>
                                                                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-2xl border-2 border-white">
                                                                        <User className="w-3 h-3" />
                                                                    </div>
                                                                </AdvancedMarker>
                                                                <DirectionsLine 
                                                                    userLat={userLoc.lat} 
                                                                    userLng={userLoc.lng} 
                                                                    clinicLat={product.clinic_lat} 
                                                                    clinicLng={product.clinic_lng} 
                                                                />
                                                            </>
                                                        )}
                                                    </Map>
                                                </APIProvider>
                                                
                                                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                                                    <button 
                                                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${userLoc?.lat},${userLoc?.lng}&destination=${product.clinic_lat},${product.clinic_lng}&travelmode=driving`, '_blank')}
                                                        className="bg-white/90 backdrop-blur-md p-2 rounded-lg shadow-lg border border-brand/20 text-brand-dark hover:bg-brand transition-all"
                                                        title="Open in Google Maps"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
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
                            src={finalImage}
                            alt={product.name}
                            className="w-full h-full object-contain max-h-[500px] drop-shadow-2xl group-hover:scale-105 transition-transform duration-700"
                        />
                    </div>

                    {/* RIGHT COLUMN: Thumbnails & Specs */}
                    <div className="lg:col-span-3 flex flex-col justify-between gap-8">
                        {/* Thumbnails Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Product base image first */}
                            <div onClick={() => setSelectedVariant('')} className={`aspect-square bg-accent-peach/10 rounded-xl overflow-hidden cursor-pointer hover:border-2 border-brand/50 transition-all p-2 flex items-center justify-center ${!selectedVariant ? 'opacity-100 border-2' : 'opacity-70'}`}>
                                <img src={product.image} alt="Main" className="w-full h-full object-contain" />
                            </div>
                            {/* Variant images */}
                            {parsedVariants.filter(v => v.image).map((v, i) => (
                                <div key={`v-${i}`} onClick={() => setSelectedVariant(v.name)} className={`aspect-square bg-accent-peach/10 rounded-xl overflow-hidden cursor-pointer hover:border-2 border-brand/50 transition-all p-2 flex items-center justify-center ${selectedVariant === v.name ? 'opacity-100 border-2' : 'opacity-70'}`}>
                                    <img src={v.image} alt={v.name} className="w-full h-full object-contain" />
                                </div>
                            ))}
                            {/* Size images */}
                            {parsedSizes.filter(s => s.image).map((s, i) => (
                                <div key={`s-${i}`} onClick={() => setSelectedSize(s.name)} className={`aspect-square bg-accent-peach/10 rounded-xl overflow-hidden cursor-pointer hover:border-2 border-brand/50 transition-all p-2 flex items-center justify-center ${selectedSize === s.name ? 'opacity-100 border-2' : 'opacity-70'}`}>
                                    <img src={s.image} alt={s.name} className="w-full h-full object-contain" />
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
