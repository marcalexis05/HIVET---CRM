/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShoppingCart, Star, ChevronRight, CheckCircle2, Award, 
    Loader2, Navigation2, Ruler, ExternalLink,
    Store, User, Minus, Plus, MessageSquare, Send, Camera, X, Image as ImageIcon, ZoomIn, MapPin, Check
} from 'lucide-react';
import { APIProvider, Map, useMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import DashboardLayout from '../../components/DashboardLayout';
import ModernModal from '../../components/ModernModal';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

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
    const [reviews, setReviews] = useState<any[]>([]);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [newReview, setNewReview] = useState<{rating: number, comment: string, image_url: string}>({ rating: 5, comment: '', image_url: '' });
    const [hasPurchased, setHasPurchased] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(() => {
        const saved = localStorage.getItem('hivet_selected_branch');
        if (saved === 'all') return null;
        return saved ? parseInt(saved) : null;
    });
    const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' | 'confirm' | 'danger'; onConfirm?: () => void }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    const { user } = useAuth();
    const token = user?.token;

    // Dynamically calculate average rating from reviews array
    const { avgRating, totalReviews } = useMemo(() => {
        if (!reviews || reviews.length === 0) return { avgRating: 0, totalReviews: 0 };
        const sum = reviews.reduce((acc, rev) => acc + (rev.rating || 0), 0);
        return { 
            avgRating: sum / reviews.length, 
            totalReviews: reviews.length 
        };
    }, [reviews]);

    useEffect(() => {
        const fetchProductData = async () => {
            setLoading(true);
            try {
                const pUrl = selectedBranchId
                    ? `http://localhost:8000/api/catalog/${id}?branch_id=${selectedBranchId}`
                    : `http://localhost:8000/api/catalog/${id}`;
                    
                const [pResp, rResp] = await Promise.all([
                    fetch(pUrl),
                    fetch(`http://localhost:8000/api/catalog/${id}/reviews`)
                ]);
                
                if (pResp.ok) {
                    const data = await pResp.json();
                    setProduct(data);
                }
                if (rResp.ok) {
                    const revs = await rResp.json();
                    setReviews(revs);
                }
            } catch (err) {
                console.error('Fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchProductData();

        const checkPurchaseStatus = async () => {
            if (!token || !id) return;
            try {
                // Use the dedicated endpoint for a precise, reliable DB check
                const resp = await fetch(`http://localhost:8000/api/orders/check-purchased/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (resp.ok) {
                    const data = await resp.json();
                    setHasPurchased(data.has_purchased === true);
                }
            } catch (err) {
                console.error('Error checking purchase status:', err);
            }
        };
        if (token && id) checkPurchaseStatus();

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
    }, [id, token, selectedBranchId]);

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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const resp = await fetch('http://localhost:8000/api/business/upload-product-image', {
                method: 'POST',
                body: formData
            });
            if (resp.ok) {
                const data = await resp.json();
                setNewReview(prev => ({ ...prev, image_url: data.url }));
            }
        } catch (err) {
            console.error('Upload error:', err);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        setSubmittingReview(true);
        try {
            const resp = await fetch(`http://localhost:8000/api/catalog/${id}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newReview)
            });
            if (resp.ok) {
                const addedReview = await resp.json();
                setReviews([addedReview, ...reviews]);
                setNewReview({ rating: 5, comment: '', image_url: '' });
            } else {
                const err = await resp.json();
                setModal({
                    isOpen: true,
                    title: 'Review Error',
                    message: err.detail || 'Failed to post review. Please try again.',
                    type: 'error'
                });
            }
        } catch (err) {
            console.error('Submit error:', err);
        } finally {
            setSubmittingReview(false);
        }
    };
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

    const handleSwitchBranch = (branchId: number) => {
        localStorage.setItem('hivet_selected_branch', String(branchId));
        setSelectedBranchId(branchId);
    };

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
                    <Link to="/dashboard/customer" className="hover:text-accent-brown transition-colors">My Hub</Link>
                    <ChevronRight className="w-3 h-3" />
                    <Link to="/dashboard/customer/catalog" className="hover:text-accent-brown transition-colors">Catalog</Link>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-accent-brown truncate">{product.name}</span>
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

                            <div className="flex items-center gap-4 text-xs font-bold text-accent-brown/50 h-5">
                                {totalReviews > 0 ? (
                                    <>
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, si) => (
                                                <Star key={si} className={`w-3.5 h-3.5 ${si < Math.round(avgRating) ? 'text-brand fill-brand' : 'text-accent-brown/10'}`} />
                                            ))}
                                        </div>
                                        <span className="font-outfit text-accent-brown">{avgRating.toFixed(1)} Rating • {totalReviews} real reviews</span>
                                    </>
                                ) : (
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-brown/20 italic">No customer reviews yet</span>
                                )}
                            </div>
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
                                            className={`w-6 h-6 rounded-full border-2 cursor-pointer ${!selectedVariant ? 'border-accent-brown' : 'border-transparent'} bg-white transition-all flex items-center justify-center text-[8px] font-black text-accent-brown`}
                                            title="Default"
                                        >
                                            Ø
                                        </button>
                                        {parsedVariants.map(v => (
                                            <button
                                                key={v.name}
                                                onClick={() => setSelectedVariant(v.name)}
                                                className={`w-6 h-6 rounded-full border-2 cursor-pointer ${selectedVariant === v.name ? 'border-accent-brown' : 'border-transparent'} ${v.name.includes('Standard') ? 'bg-orange-100' : 'bg-orange-900'} transition-all`}
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
                                                className={`px-4 py-1 rounded-full border-2 text-[10px] font-black uppercase tracking-widest transition-all ${selectedSize === s.name ? 'border-accent-brown bg-brand/10 text-accent-brown' : 'border-accent-peach/30 text-accent-brown/40'}`}
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
                                        <span className="text-sm font-black text-accent-brown min-w-[20px] text-center">{quantity}</span>
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

                            {/* Branch Availability */}
                            {product.branch_availability && product.branch_availability.length > 0 && (
                                <div className="mt-8 pt-8 border-t border-accent-brown/10">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-widest text-accent-brown">Branch Availability</h3>
                                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-accent-brown/30 mt-1">Cross-site inventory status</p>
                                        </div>
                                        <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-100">
                                            Live Updates
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {product.branch_availability.map((branch: any) => {
                                            const isActive = selectedBranchId === branch.branch_id;
                                            return (
                                                <div 
                                                    key={branch.branch_id}
                                                    className={`border rounded-[1.5rem] p-4 flex items-center justify-between transition-all shadow-sm ${
                                                        isActive 
                                                            ? 'bg-brand/5 border-brand/40 ring-2 ring-brand/20' 
                                                            : 'bg-accent-peach/5 border-accent-peach/20 hover:border-brand/30 hover:bg-white'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-colors ${
                                                            isActive ? 'bg-brand text-white' : 'bg-white text-accent-brown'
                                                        }`}>
                                                            <MapPin className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown">{branch.name}</p>
                                                                {isActive && (
                                                                    <span className="flex items-center gap-1 bg-brand/10 text-brand px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">
                                                                        <Check className="w-2.5 h-2.5" />
                                                                        Selected
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {branch.address && (
                                                                <p className="text-[8px] font-bold text-accent-brown/40 uppercase tracking-tighter mt-0.5 max-w-[180px] leading-tight">
                                                                    {branch.address}
                                                                </p>
                                                            )}
                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${branch.stock > 0 ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                                                                <p className={`text-[9px] font-bold ${branch.stock > 0 ? 'text-emerald-500/80' : 'text-red-500/80'} uppercase tracking-tighter`}>
                                                                    {branch.stock > 0 ? `${branch.stock} available now` : 'Out of Stock'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {branch.stock > 0 && !isActive && (
                                                        <button 
                                                            onClick={() => handleSwitchBranch(branch.branch_id)}
                                                            className="px-5 py-2.5 bg-white rounded-xl text-[9px] font-black uppercase tracking-widest text-accent-brown hover:bg-brand-dark hover:text-white transition-all shadow-sm border border-accent-brown/5 flex items-center gap-2 group/btn"
                                                        >
                                                            Switch
                                                            <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

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
                                            className="flex items-center justify-center gap-2 py-3 bg-white border border-brand/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-accent-brown hover:bg-brand hover:text-white transition-all shadow-sm"
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
                                                
                                                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                                                    <button 
                                                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${userLoc?.lat},${userLoc?.lng}&destination=${product.clinic_lat},${product.clinic_lng}&travelmode=driving`, '_blank')}
                                                        className="bg-white/90 backdrop-blur-md p-2 rounded-lg shadow-lg border border-brand/20 text-accent-brown hover:bg-brand transition-all"
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

                    </div>

                    {/* MIDDLE COLUMN: Main Hero Image (Base Product) & Variant Gallery */}
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        <div className="flex items-center justify-center p-8 bg-accent-peach/5 rounded-[2rem] relative group overflow-hidden min-h-[400px]">
                            <motion.img
                                key={finalImage}
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                src={finalImage}
                                alt={product.name}
                                className="w-full h-full object-contain max-h-[500px] drop-shadow-2xl group-hover:scale-105 transition-transform duration-700"
                            />
                        </div>

                        {/* Variant Showcase Gallery */}
                        {parsedVariants.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-brown/30">Variant Gallery</h3>
                                    <p className="text-[8px] font-bold text-brand uppercase tracking-widest">{parsedVariants.length} Styles Available</p>
                                </div>
                                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar px-1">
                                    {/* Include Base Product Image in Gallery */}
                                    <button
                                        onClick={() => setSelectedVariant('')}
                                        className={`w-24 h-24 shrink-0 rounded-2xl border-2 transition-all p-3 flex items-center justify-center bg-white relative group/thumb ${!selectedVariant ? 'border-brand shadow-xl' : 'border-accent-brown/5 opacity-40 hover:opacity-100'}`}
                                    >
                                        <img src={product.image} alt="Base Product" className="w-full h-full object-contain" />
                                        <div className="absolute inset-x-0 bottom-0 py-1 bg-black/60 text-[6px] font-black text-white uppercase text-center opacity-0 group-hover/thumb:opacity-100 transition-opacity rounded-b-xl">
                                            Original
                                        </div>
                                    </button>

                                    {parsedVariants.map(v => (
                                        <button
                                            key={v.name}
                                            onClick={() => {
                                                setSelectedVariant(v.name);
                                                // If this variant has sizes, select the first size automatically
                                                if (v.sizes && v.sizes.length > 0) {
                                                    setSelectedSize(v.sizes[0].name);
                                                }
                                            }}
                                            className={`w-24 h-24 shrink-0 rounded-2xl border-2 transition-all p-3 flex items-center justify-center bg-white relative group/thumb ${selectedVariant === v.name ? 'border-brand shadow-xl' : 'border-accent-brown/5 opacity-40 hover:opacity-100'}`}
                                        >
                                            <img src={v.image || product.image} alt={v.name} className="w-full h-full object-contain" />
                                            <div className="absolute inset-x-0 bottom-0 py-1 bg-black/60 text-[6px] font-black text-white uppercase text-center opacity-0 group-hover/thumb:opacity-100 transition-opacity rounded-b-xl px-1 truncate">
                                                {v.name}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Product Description */}
                        <div className="mt-4 pt-8 border-t border-accent-brown/10">
                            <h3 className="text-xs font-black uppercase tracking-widest text-accent-brown mb-4 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                                Product Description
                            </h3>
                            <p className="text-sm font-medium text-accent-brown/60 leading-relaxed italic border-l-2 border-brand/20 pl-6 py-1">
                                "{product.description} Carefully formulated to provide the highest quality experience, it stands out with premium ingredients and unmatched durability. Perfect for enhancing the daily life of your beloved companion."
                            </p>
                        </div>



                    </div>

                    {/* RIGHT COLUMN: Variant Widget & Specs */}
                    <div className="lg:col-span-3 flex flex-col gap-8">
                        {/* Selected Variant Widget */}
                        <div className="bg-white border-2 border-accent-brown/5 rounded-[2rem] p-4 shadow-xl shadow-accent-brown/5 relative overflow-hidden group">
                            <div className="aspect-square bg-accent-peach/10 rounded-2xl overflow-hidden p-4 flex items-center justify-center relative">
                                <motion.img 
                                    key={finalImage}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    src={finalImage} 
                                    alt="Selected Selection" 
                                    className="w-full h-full object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-500" 
                                />
                                <div className="absolute top-3 left-3 bg-brand-dark text-white text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                                    Current Choice
                                </div>
                            </div>
                            <div className="mt-4 px-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown truncate">{selectedVariant || 'Standard'} • {selectedSize || 'Default'}</p>
                                <p className="text-[8px] font-bold text-accent-brown/40 uppercase tracking-widest mt-0.5">Custom Selection Active</p>
                            </div>
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
                                <p className="text-xs font-bold text-accent-brown uppercase">{product.weight || 'N/A'}</p>
                            </div>
                        </div>

                    </div>

                </div>

                {/* --- REVIEWS SECTION --- */}
                <div className="mt-20 pt-16 border-t-2 border-accent-brown/5">
                    <div className="flex flex-col lg:flex-row gap-16">
                        {/* Summary & Form */}
                        <div className="lg:col-span-4 w-full lg:w-1/3">
                            <div className="sticky top-28 space-y-8">
                                <div>
                                    <h2 className="text-3xl font-black text-accent-brown tracking-tighter uppercase mb-2">Customer Feedback</h2>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-brown/30">Honest reviews from our premium community</p>
                                </div>

                                <div className="bg-accent-peach/5 rounded-[2.5rem] p-8 border border-accent-peach/20">
                                    <div className="flex items-center gap-6 mb-8">
                                        <div className="text-5xl font-black text-accent-brown">{avgRating.toFixed(1)}</div>
                                        <div>
                                            <div className="flex gap-1 mb-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className={`w-4 h-4 ${i < Math.round(avgRating) ? 'text-brand fill-brand' : 'text-accent-brown/10'}`} />
                                                ))}
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">Based on {totalReviews} reviews</p>
                                        </div>
                                    </div>

                                    {/* Write Review Form */}
                                    {!hasPurchased ? (
                                        <div className="bg-accent-brown/5 rounded-2xl p-6 text-center border border-accent-brown/10">
                                            <CheckCircle2 className="w-8 h-8 text-accent-brown/20 mx-auto mb-3" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40">Only verified buyers with completed orders can leave a review.</p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleReviewSubmit} className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 ml-2">Your Rating</label>
                                                <div className="flex gap-2 bg-white p-3 rounded-2xl border border-accent-brown/5 shadow-sm">
                                                    {[1, 2, 3, 4, 5].map(s => (
                                                        <button 
                                                            key={s} 
                                                            type="button" 
                                                            onClick={() => setNewReview(r => ({ ...r, rating: s }))}
                                                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${newReview.rating >= s ? 'bg-brand text-white shadow-lg' : 'bg-accent-peach/20 text-accent-brown/30'}`}
                                                        >
                                                            <Star className={`w-4 h-4 ${newReview.rating >= s ? 'fill-white' : ''}`} />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 ml-2">Share your experience</label>
                                                <textarea 
                                                    value={newReview.comment}
                                                    onChange={e => setNewReview(r => ({ ...r, comment: e.target.value }))}
                                                    placeholder="Write your honest review here..."
                                                    className="w-full bg-white border border-accent-brown/5 rounded-2xl p-4 text-xs font-bold text-accent-brown outline-none focus:border-brand/40 transition-all h-28 resize-none shadow-sm"
                                                />
                                            </div>

                                            {/* Photo Upload */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-accent-brown/40 ml-2">Add Photo Proof</label>
                                                <div className="flex items-center gap-3">
                                                    {newReview.image_url ? (
                                                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden group shadow-lg">
                                                            <img src={newReview.image_url} alt="Review proof" className="w-full h-full object-cover" />
                                                            <button 
                                                                type="button"
                                                                onClick={() => setNewReview(prev => ({ ...prev, image_url: '' }))}
                                                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                                                            >
                                                                <X className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-accent-brown/10 flex flex-col items-center justify-center cursor-pointer hover:border-brand/40 hover:bg-brand/5 transition-all text-accent-brown/30">
                                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                                                            {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-5 h-5" />}
                                                            <span className="text-[8px] font-black uppercase mt-1">Upload</span>
                                                        </label>
                                                    )}
                                                    <div className="flex-1 p-3 bg-accent-peach/5 rounded-2xl border border-dashed border-accent-brown/10">
                                                        <p className="text-[9px] font-bold text-accent-brown/40">Showing a photo of your actual product helps other customers!</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <button 
                                                type="submit"
                                                disabled={submittingReview || !token}
                                                className="w-full bg-brand-dark text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-brand-dark/10"
                                            >
                                                {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                {token ? 'Post Review' : 'Log in to Review'}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Reviews List */}
                        <div className="flex-1 space-y-6">
                            {reviews.length === 0 ? (
                                <div className="bg-accent-peach/5 rounded-[2.5rem] p-12 text-center border border-dashed border-accent-brown/10">
                                    <MessageSquare className="w-10 h-10 text-accent-brown/10 mx-auto mb-4" />
                                    <p className="text-sm font-bold text-accent-brown/30 italic">No reviews yet. Be the first to share your thoughts!</p>
                                </div>
                            ) : (
                                reviews.map((rev, i) => (
                                    <motion.div 
                                        key={rev.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="bg-white rounded-3xl p-6 shadow-sm border border-accent-brown/5 hover:border-brand/20 transition-all"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-accent-peach/20 rounded-full flex items-center justify-center text-brand font-black text-xs">
                                                    {rev.customer_name?.[0] || 'A'}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-accent-brown">{rev.customer_name}</h4>
                                                    <div className="flex gap-0.5">
                                                        {[...Array(5)].map((_, si) => (
                                                            <Star key={si} className={`w-3.5 h-3.5 ${si < rev.rating ? 'text-brand fill-brand' : 'text-accent-brown/10'}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30">
                                                {new Date(rev.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-xs font-medium text-accent-brown/70 leading-relaxed italic mb-4">
                                            "{rev.comment}"
                                        </p>
                                        
                                        {rev.image_url && (
                                            <button
                                                onClick={() => setZoomedImage(rev.image_url)}
                                                className="relative w-full max-w-[200px] aspect-square rounded-2xl overflow-hidden shadow-md group cursor-zoom-in block"
                                            >
                                                <img 
                                                    src={rev.image_url} 
                                                    alt="Review proof" 
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                                </div>
                                                <div className="absolute top-2 left-2 bg-brand/90 backdrop-blur-sm px-2 py-0.5 rounded-lg flex items-center gap-1">
                                                    <ImageIcon className="w-2.5 h-2.5 text-white" />
                                                    <span className="text-[8px] font-black text-white uppercase tracking-widest">Image Proof</span>
                                                </div>
                                            </button>
                                        )}
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                </div>

                <AnimatePresence>
                    {zoomedImage && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setZoomedImage(null)}
                            className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-10 cursor-zoom-out"
                        >
                            <motion.div
                                initial={{ scale: 0.85, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.85, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                onClick={e => e.stopPropagation()}
                                className="relative max-w-sm max-h-[70vh] rounded-3xl overflow-hidden shadow-2xl"
                            >
                                <img src={zoomedImage} alt="Review proof" className="w-full h-full object-contain" />
                                <button
                                    onClick={() => setZoomedImage(null)}
                                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-white hover:text-white/70 transition-colors"
                                >
                                    <X className="w-5 h-5 drop-shadow-lg" />
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>


            {/* Global Modal */}
            <ModernModal
                isOpen={modal.isOpen}
                onClose={() => setModal(m => ({ ...m, isOpen: false }))}
                onConfirm={modal.onConfirm}
                title={modal.title}
                message={modal.message}
                type={modal.type}
            />
        </DashboardLayout>
    );
};

export default ProductDetail;
