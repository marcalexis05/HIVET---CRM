/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShoppingCart, Star, ChevronRight, ChevronLeft, CheckCircle2, Award, 
    Loader2, ExternalLink,
    Store, User, Minus, Plus, MessageSquare, Send, Camera, X, MapPin
} from 'lucide-react';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import DashboardLayout from '../../components/DashboardLayout';
import ModernModal from '../../components/ModernModal';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart, triggerFlyAnimation } = useCart();

    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedVariant, setSelectedVariant] = useState('');
    const [selectedSize, setSelectedSize] = useState('');
    const [activeImage, setActiveImage] = useState<string | null>(null);
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
    const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
    const [allProductIds, setAllProductIds] = useState<number[]>([]);

    const { user } = useAuth();
    const token = user?.token;

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
                    
                    setSelectedVariant('');
                    const baseSizes = data.sizes_json ? JSON.parse(data.sizes_json) : [];
                    if (baseSizes.length > 0) {
                        setSelectedSize(baseSizes[0].name);
                    } else {
                        const variants = data.variants_json ? JSON.parse(data.variants_json) : [];
                        if (variants.length > 0 && variants[0].sizes?.length > 0) {
                            setSelectedVariant(variants[0].name);
                            setSelectedSize(variants[0].sizes[0].name);
                        } else {
                            setSelectedSize('');
                        }
                    }
                    
                    setActiveImage(null);
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
        const fetchRelated = async () => {
            try {
                const resp = await fetch('http://localhost:8000/api/catalog/');
                if (resp.ok) {
                    const allProducts = await resp.json();
                    
                    // Store all IDs for navigation
                    const ids = allProducts.map((p: any) => p.id);
                    setAllProductIds(ids);

                    const filtered = allProducts.filter((p: any) => String(p.id) !== String(id));
                    // Shuffle and pick 4
                    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
                    setRelatedProducts(shuffled.slice(0, 4));
                }
            } catch (err) {
                console.error('Error fetching related products:', err);
            }
        };
        fetchRelated();
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

    const parsedVariants: any[] = useMemo(() => product?.variants_json ? JSON.parse(product.variants_json) : [], [product]);
    
    const parsedSizes: any[] = useMemo(() => {
        let sizes = [];
        if (selectedVariant) {
            const v = parsedVariants.find(v => v.name === selectedVariant);
            sizes = v?.sizes || [];
        } else {
            sizes = product?.sizes_json ? JSON.parse(product.sizes_json) : [];
        }
        // Filter out empty or invalid size names to prevent ghosts
        const filtered = sizes.filter((s: any) => s.name && s.name.trim() !== '');
        
        // Custom sort to ensure 'Small' comes first, then 'Medium', 'Large', etc.
        const sizeOrder: Record<string, number> = {
            'small': 1, 's': 1,
            'medium': 2, 'm': 2,
            'large': 3, 'l': 3,
            'xl': 4, 'extra large': 4,
            'xxl': 5
        };

        return [...filtered].sort((a: any, b: any) => {
            const priorityA = sizeOrder[a.name.toLowerCase()] || 99;
            const priorityB = sizeOrder[b.name.toLowerCase()] || 99;
            if (priorityA !== priorityB) return priorityA - priorityB;
            return a.name.localeCompare(b.name);
        });
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
                setModal({ isOpen: true, title: 'Review Error', message: err.detail || 'Failed to post review.', type: 'error' });
            }
        } catch (err) {
            console.error('Submit error:', err);
        } finally {
            setSubmittingReview(false);
        }
    };

    const updateQuantityLocal = (increment: boolean) => {
        const stock = Number(availableStock);
        if (increment) {
            if (quantity < stock) setQuantity(prev => prev + 1);
        } else {
            setQuantity(prev => Math.max(stock > 0 ? 1 : 0, prev - 1));
        }
    };

    const handleQuantityInputChange = (val: string) => {
        let num = parseInt(val.replace(/[^0-9]/g, ''));
        if (isNaN(num)) num = availableStock > 0 ? 1 : 0;
        const stock = Number(availableStock);
        const finalNum = Math.min(Math.max(stock > 0 ? 1 : 0, num), stock);
        setQuantity(finalNum);
    };

    // Long press logic
    const timerRef = useRef<any>(null);
    const intervalRef = useRef<any>(null);

    const startCounter = (increment: boolean) => {
        updateQuantityLocal(increment);
        timerRef.current = setTimeout(() => {
            let speed = 100;
            const run = () => {
                updateQuantityLocal(increment);
                intervalRef.current = setTimeout(run, speed);
                if (speed > 30) speed -= 10;
            };
            run();
        }, 500);
    };

    const stopCounter = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (intervalRef.current) clearTimeout(intervalRef.current);
    };


    const activeVar = parsedVariants.find(v => v.name === selectedVariant);
    const activeSiz = parsedSizes.find(s => s.name === selectedSize);
    const priceFromSize = activeSiz?.price && Number(activeSiz.price) > 0 ? Number(activeSiz.price) : 0;
    const priceFromVariant = activeVar?.price && Number(activeVar.price) > 0 ? Number(activeVar.price) : 0;
    const availableStock = activeSiz ? parseInt(activeSiz.stock || '0') : (Number(product?.stock) || 0);

    // Sync quantity with available stock
    useEffect(() => {
        const stock = Number(availableStock);
        if (product) {
            if (stock === 0) {
                if (quantity !== 0) setQuantity(0);
            } else if (quantity > stock) {
                setQuantity(stock);
            } else if (quantity === 0 && stock > 0) {
                setQuantity(1);
            }
        }
    }, [availableStock, product, quantity]);
    const finalPrice = product ? (priceFromSize || priceFromVariant || product.price) : 0;
    const finalImage = activeImage || activeSiz?.image || activeVar?.image || product?.image;

    const branchAvailability = useMemo(() => {
        if (!product || !product.branch_availability) return [];
        return product.branch_availability.map((b: any) => {
            if (activeSiz && activeSiz.branch_stock) {
                const bData = activeSiz.branch_stock[b.branch_id];
                if (bData) {
                    return { ...b, stock: bData.stock };
                }
            }
            return b;
        });
    }, [product, activeSiz]);

    const allImages = useMemo(() => {
        const imgs = new Set<string>();
        if (product?.image) imgs.add(product.image);
        parsedVariants.forEach(v => { if (v.image) imgs.add(v.image); });
        parsedSizes.forEach(s => { if (s.image) imgs.add(s.image); });
        return Array.from(imgs);
    }, [product, parsedVariants, parsedSizes]);

    const currentIndexImg = useMemo(() => {
        return allImages.indexOf(finalImage);
    }, [allImages, finalImage]);

    // Centralized Sync: Update variant/size when image changes
    useEffect(() => {
        if (!activeImage || !product) return;

        // 1. Try matching with a variant
        const vMatch = parsedVariants.find(v => v.image === activeImage);
        if (vMatch) {
            setSelectedVariant(vMatch.name);
            if (vMatch.sizes && vMatch.sizes.length > 0) {
                // If current size isn't in this variant, default to first
                if (!vMatch.sizes.some((s: any) => s.name === selectedSize)) {
                    setSelectedSize(vMatch.sizes[0].name);
                }
            }
            return;
        }

        // 2. Try matching with a specific size (base sizes)
        const baseSizes = product.sizes_json ? JSON.parse(product.sizes_json) : [];
        const sMatch = baseSizes.find((s: any) => s.image === activeImage);
        if (sMatch) {
            setSelectedVariant('');
            setSelectedSize(sMatch.name);
            return;
        }

        // 3. If it's the main product image, reset variant
        if (activeImage === product.image) {
            setSelectedVariant('');
            if (baseSizes.length > 0 && !baseSizes.some((s: any) => s.name === selectedSize)) {
                setSelectedSize(baseSizes[0].name);
            }
        }
    }, [activeImage, product, parsedVariants, selectedSize]);

    const handleImgNav = (direction: 'next' | 'prev') => {
        if (allImages.length <= 1) return;
        
        let newIndex;
        if (direction === 'next') {
            newIndex = (currentIndexImg + 1) % allImages.length;
        } else {
            newIndex = (currentIndexImg - 1 + allImages.length) % allImages.length;
        }

        const img = allImages[newIndex];
        setActiveImage(img);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSwitchBranch = (branchId: number) => {
        localStorage.setItem('hivet_selected_branch', String(branchId));
        setSelectedBranchId(branchId);
    };

    if (loading && !product) {
        return (
            <DashboardLayout title="Loading...">
                <div className="flex flex-col items-center justify-center py-40 gap-4 opacity-40">
                    <Loader2 className="w-12 h-12 animate-spin text-accent-brown" />
                    <p className="font-black text-xs uppercase tracking-widest text-accent-brown">Syncing Details...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!product) {
        return (
            <DashboardLayout title="Not Found">
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <h2 className="text-2xl font-black text-accent-brown mb-4">Product Not Found</h2>
                    <button onClick={() => navigate('/dashboard/customer/catalog')} className="bg-accent-brown text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all">
                        Back to Store
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
        const checkoutItem = {
            id: product.id,
            business_id: product.business_id,
            name: product.name,
            price: String(finalPrice),
            image: finalImage,
            quantity: quantity,
            variant: selectedVariant,
            size: selectedSize,
            stock: availableStock
        };
        
        // Add to global cart context
        addToCart(checkoutItem);
        
        // Clear any old checkout state and set filter for THIS item only
        localStorage.removeItem('hivet_checkout_paying_order');
        localStorage.setItem('hivet_checkout_filtered', JSON.stringify([checkoutItem]));
        
        navigate('/dashboard/customer/checkout');
    };

    return (
        <DashboardLayout title="">
            <div className="bg-white min-h-screen">
                <div className="max-w-[1300px] mx-auto px-4 md:px-8 py-4 transition-all">
                    
                    {/* Navigation Trail */}
                    <div className="flex items-center justify-between mb-6">
                        <nav className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-black/40">
                            <Link to="/dashboard/customer/catalog" className="hover:text-brand transition-all">Store</Link>
                            <span>/</span>
                            <span className="text-black font-black italic uppercase">{product.category}</span>
                            <span>/</span>
                            <span className="text-black uppercase">{product.name}</span>
                        </nav>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                        
                        {/* Media Section (Left) */}
                        <div className="lg:col-span-1">
                            {/* Smaller Vertical Thumbs - only show if multiple unique images exist */}
                            {allImages.length > 1 && (
                                <div className="flex lg:flex-col gap-2">
                                    {allImages.map((img, i) => (
                                        <button 
                                            key={i} 
                                            className={`w-14 h-14 rounded-xl bg-gray-50 p-1.5 border-2 transition-all ${finalImage === img ? 'border-brand' : 'border-transparent hover:border-gray-200'}`}
                                            onClick={() => setActiveImage(img)}
                                        >
                                            <img src={img} className="w-full h-full object-contain mix-blend-multiply" alt="Thumb" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-6">
                            <div className="aspect-square bg-white rounded-3xl overflow-hidden flex items-center justify-center p-6 relative group border border-gray-100 shadow-sm">
                                <motion.img
                                    key={finalImage}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    src={finalImage}
                                    alt={product.name}
                                    className="w-full h-full object-contain"
                                />
                                
                                {/* Professional Tag Layout */}
                                {product.tag && (
                                    <div className="absolute top-6 left-6 flex flex-col items-start gap-1.5">
                                        <div className="bg-brand text-white px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-brand/20 flex items-center gap-2">
                                            {product.tag}
                                        </div>
                                        <div className="bg-white/80 backdrop-blur-md text-accent-brown px-3 py-1 text-[7px] font-black uppercase tracking-widest rounded-full border border-accent-brown/5 shadow-sm">
                                            {product.type} / {product.category}
                                        </div>
                                    </div>
                                )}

                                {/* Floating Navigation Arrows */}
                                <div className="absolute inset-y-0 left-4 right-4 flex items-center justify-between pointer-events-none">
                                    <button 
                                        onClick={() => handleImgNav('prev')}
                                        className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-md border border-white/50 flex items-center justify-center text-accent-brown hover:bg-white hover:scale-110 transition-all pointer-events-auto shadow-xl"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => handleImgNav('next')}
                                        className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-md border border-white/50 flex items-center justify-center text-accent-brown hover:bg-white hover:scale-110 transition-all pointer-events-auto shadow-xl"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-100 flex items-center gap-2 shadow-sm">
                                    <Star className="w-3 h-3 text-brand fill-brand" />
                                    <span className="text-[10px] font-black text-black tabular-nums">{avgRating.toFixed(1)}</span>
                                    <span className="text-[9px] font-bold text-black/40">({totalReviews})</span>
                                </div>
                            </div>
                        </div>

                        {/* Intelligence & Actions (Right) */}
                        <div className="lg:col-span-5 space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-accent-brown/5 flex items-center justify-center text-accent-brown">
                                            <Store className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-black">{product.clinic_name}</span>
                                    </div>
                                    <span className="text-[8px] font-bold text-black uppercase tracking-widest">ID: {product.sku || 'HIVET-00'}</span>
                                </div>

                                <h1 className="text-3xl font-black text-accent-brown tracking-tighter uppercase italic leading-[0.9]">
                                    {product.name}
                                </h1>

                                <p className="text-xs font-medium text-black leading-snug max-w-sm italic">
                                    "{product.description}"
                                </p>

                                <div className="pt-4 border-t border-gray-50 flex flex-col">
                                    <span className="text-[9px] font-black text-black uppercase tracking-widest mb-1">Recommended Value</span>
                                    <span className="text-4xl font-black text-accent-brown tracking-tighter tabular-nums">₱{finalPrice.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="space-y-10">
                                {/* Variants */}
                                {parsedVariants.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap gap-3">
                                            {parsedVariants.map((v: any) => (
                                                <button 
                                                    key={v.name} 
                                                    onClick={() => {
                                                        const isSelected = selectedVariant === v.name;
                                                        if (isSelected) {
                                                            setSelectedVariant('');
                                                            const baseSizes = product.sizes_json ? JSON.parse(product.sizes_json) : [];
                                                            if (baseSizes.length > 0) setSelectedSize(baseSizes[0].name);
                                                        } else {
                                                            setSelectedVariant(v.name);
                                                            if (v.image) setActiveImage(v.image);
                                                            if (v.sizes && v.sizes.length > 0) {
                                                                setSelectedSize(v.sizes[0].name);
                                                            }
                                                        }
                                                    }}
                                                    className={`h-12 min-w-[100px] border-2 rounded-xl flex items-center justify-center px-6 transition-all ${selectedVariant === v.name ? 'bg-accent-brown border-accent-brown text-white shadow-xl scale-[1.02]' : 'bg-white border-gray-100 text-accent-brown hover:border-brand hover:text-brand'}`}
                                                >
                                                    <span className="text-[10px] font-black uppercase tracking-[0.1em]">{v.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Sizes */}
                                {parsedSizes.length > 0 && (
                                    <div className="space-y-4">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-black">Unit Selection</span>
                                        <div className="grid grid-cols-5 gap-3">
                                            {parsedSizes.map((s: any) => (
                                                <button 
                                                    key={s.name} 
                                                    onClick={() => {
                                                    setSelectedSize(s.name);
                                                    if (s.image) setActiveImage(s.image);
                                                }}
                                                    className={`h-12 border-2 rounded-xl flex items-center justify-center text-[10px] font-black transition-all ${selectedSize === s.name ? 'bg-accent-brown border-accent-brown text-white shadow-xl' : 'bg-white border-gray-100 text-black/40 hover:border-brand hover:text-brand'}`}
                                                >
                                                    {s.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Market Console */}
                                <div className="pt-4 space-y-4">
                                    <div className="flex gap-4 items-center">
                                        <div className="flex bg-accent-brown/5 rounded-2xl p-1 border border-accent-brown/5">
                                            <button 
                                                onMouseDown={() => startCounter(false)}
                                                onMouseUp={stopCounter}
                                                onMouseLeave={stopCounter}
                                                onTouchStart={() => startCounter(false)}
                                                onTouchEnd={stopCounter}
                                                className="w-10 h-10 flex items-center justify-center text-black/40 hover:text-brand transition-colors select-none"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <input 
                                                type="text"
                                                inputMode="numeric"
                                                value={quantity}
                                                onChange={(e) => handleQuantityInputChange(e.target.value)}
                                                className="w-10 h-10 bg-transparent text-center text-sm font-black text-accent-brown outline-none"
                                            />
                                            <button 
                                                onMouseDown={() => startCounter(true)}
                                                onMouseUp={stopCounter}
                                                onMouseLeave={stopCounter}
                                                onTouchStart={() => startCounter(true)}
                                                onTouchEnd={stopCounter}
                                                className="w-10 h-10 flex items-center justify-center text-black/40 hover:text-brand transition-colors select-none"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex-1 flex gap-3">
                                            <button 
                                                disabled={availableStock <= 0}
                                                onClick={handleBuyNow}
                                                className="flex-1 h-14 bg-brand text-white rounded-xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-brand/10 active:scale-[0.98] disabled:bg-gray-100 disabled:text-gray-300"
                                            >
                                                Checkout Now
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={handleAddToCart}
                                                className={`w-14 h-14 border-2 rounded-xl flex items-center justify-center transition-all active:scale-95 ${added ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-white border-gray-100 text-accent-brown hover:border-brand hover:text-brand shadow-sm'}`}
                                            >
                                                {added ? <CheckCircle2 className="w-5 h-5 animate-pulse" /> : <ShoppingCart className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-black">
                                        <div className={`w-1.5 h-1.5 rounded-full ${availableStock > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        <span>{availableStock > 0 ? `${availableStock} Precise Units Available` : 'Sold Out Globally'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Logistics & Branch Insights */}
                    <div className="mt-20 border-t border-gray-50 pt-10">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black text-accent-brown tracking-tighter uppercase italic leading-none">Branch Logistics</h2>
                                    <p className="text-[9px] font-bold text-black uppercase tracking-widest">Physical verification points</p>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {(branchAvailability || []).map((branch: any) => (
                                        <div 
                                            key={branch.branch_id} 
                                            onClick={() => handleSwitchBranch(branch.branch_id)}
                                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedBranchId === branch.branch_id ? 'border-brand bg-brand/5 shadow-md' : 'border-gray-50 bg-gray-50/30 hover:border-gray-200'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedBranchId === branch.branch_id ? 'bg-brand text-white shadow-lg' : 'bg-white text-black/30'}`}>
                                                        <Store className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-accent-brown uppercase tracking-tight">{branch.name}</p>
                                                        <p className="text-[8px] font-black text-accent-brown uppercase tracking-widest mt-0.5">{branch.stock} Units Stocked</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className={`w-3.5 h-3.5 ${selectedBranchId === branch.branch_id ? 'text-brand' : 'text-black/10'}`} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="aspect-[16/10] bg-gray-50 rounded-[2rem] overflow-hidden border border-gray-100 shadow-inner relative">
                                <Map
                                    style={{ width: '100%', height: '100%' }}
                                    defaultCenter={{ lat: product.clinic_lat || 14.5995, lng: product.clinic_lng || 120.9842 }}
                                    defaultZoom={15}
                                    gestureHandling={'greedy'}
                                    disableDefaultUI={true}
                                    mapId="f1966a3666683884"
                                >
                                    {product.clinic_lat && (
                                        <AdvancedMarker position={{ lat: product.clinic_lat, lng: product.clinic_lng }}>
                                            <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center text-white shadow-2xl border-2 border-white">
                                                <Store className="w-4 h-4" />
                                            </div>
                                        </AdvancedMarker>
                                    )}
                                    {userLoc && (
                                        <AdvancedMarker position={userLoc}>
                                            <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-2xl border-[3px] border-white">
                                                <User className="w-3.5 h-3.5" />
                                            </div>
                                        </AdvancedMarker>
                                    )}
                                </Map>
                                {distance && (
                                    <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-xl flex items-center justify-between border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                                                <MapPin className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-black/50 uppercase tracking-[0.2em]">Travel Distance</p>
                                                <p className="text-xs font-black text-accent-brown">{distance}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${userLoc?.lat},${userLoc?.lng}&destination=${product.clinic_lat},${product.clinic_lng}`, '_blank')}
                                            className="h-8 px-4 bg-accent-brown text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-black transition-all"
                                        >
                                            Route Plan
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Community Intelligence & Reviews */}
                    <div className="mt-20 border-t border-gray-50 pt-10">
                        <div className="flex items-center justify-between mb-8">
                            <div className="space-y-1">
                                <h2 className="text-3xl font-black text-accent-brown tracking-tighter uppercase italic leading-none">Customer Review</h2>
                                <p className="text-[9px] font-bold text-black uppercase tracking-widest">Global Customer Feedback</p>
                            </div>
                            <div className="flex items-baseline gap-3">
                                <span className="text-5xl font-black text-brand italic">{avgRating.toFixed(1)}</span>
                                <div className="space-y-0.5">
                                    <div className="flex text-yellow-400 gap-0.5">
                                        {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-current" />)}
                                    </div>
                                    <p className="text-[8px] font-black text-black/40 uppercase tracking-widest">{totalReviews} Customer Reviews</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {reviews.map((rev) => (
                                <div key={rev.id} className="bg-gray-50/50 p-6 rounded-[1.5rem] border border-gray-50 flex flex-col gap-4 relative overflow-hidden group hover:bg-white hover:border-brand/10 hover:shadow-lg transition-all duration-500">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-black text-black/50 text-xs shadow-sm border border-gray-50">
                                                {rev.customer_name?.[0]}
                                            </div>
                                            <div>
                                                <h5 className="text-xs font-black text-accent-brown uppercase tracking-tight">{rev.customer_name}</h5>
                                                <div className="flex text-yellow-400 mt-0.5 gap-0.5">
                                                    {[...Array(5)].map((_, si) => <Star key={si} className={`w-2.5 h-2.5 ${si < rev.rating ? 'fill-current' : 'text-gray-100'}`} />)}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-[8px] font-bold text-black uppercase tracking-widest font-mono italic">{new Date(rev.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs font-medium text-black italic leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity px-1">"{rev.comment}"</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Related Products Syndicate (The Randomizer) */}
                    <div className="mt-20 pt-10 border-t border-gray-100">
                        <div className="text-center mb-10 space-y-3">
                            <h2 className="text-4xl font-black text-accent-brown tracking-tighter uppercase italic leading-none">Discover More</h2>
                            <div className="w-12 h-0.5 bg-brand mx-auto shadow-md shadow-brand/20" />
                            <p className="text-[8px] font-bold text-black uppercase tracking-[0.4em] pt-2">Handpicked for You</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            {relatedProducts.map((p) => (
                                <motion.div 
                                    key={p.id}
                                    whileHover={{ y: -5 }}
                                    onClick={() => {
                                        navigate(`/dashboard/customer/catalog/${p.id}`);
                                        window.scrollTo(0, 0);
                                    }}
                                    className="group cursor-pointer"
                                >
                                    <div className="aspect-[4/5] bg-gray-50 rounded-[2rem] mb-4 relative overflow-hidden flex items-center justify-center p-8 border-2 border-transparent group-hover:border-brand/40 group-hover:bg-white group-hover:shadow-xl transition-all duration-700">
                                        <img src={p.image} className="w-full h-full object-contain mix-blend-multiply transition-transform duration-1000 group-hover:scale-105" alt={p.name} />
                                        {p.tag && (
                                            <div className="absolute top-4 left-4 bg-brand text-white px-3 py-1 text-[7px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg">
                                                {p.tag}
                                            </div>
                                        )}
                                        <div className="absolute bottom-4 right-4 w-8 h-8 bg-white rounded-lg flex items-center justify-center text-accent-brown shadow-md opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                                            <ShoppingCart className="w-3 h-3" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 px-1">
                                        <p className="text-[8px] font-black text-black/50 uppercase tracking-[0.25em]">{p.category}</p>
                                        <h4 className="text-sm font-black text-brand transition-colors truncate uppercase italic tracking-tight leading-none">{p.name}</h4>
                                        <div className="flex items-center justify-between pt-0.5">
                                            <p className="text-lg font-black text-accent-brown tracking-tighter tabular-nums">₱{Number(p.price).toLocaleString()}</p>
                                            <div className="flex items-center gap-1.5 grayscale group-hover:grayscale-0 transition-all">
                                                <Star className="w-2.5 h-2.5 text-brand fill-brand" />
                                                <span className="text-[9px] font-black text-black">{(p.avg_rating || 0).toFixed(1)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {zoomedImage && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setZoomedImage(null)} className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-12 cursor-zoom-out">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} className="relative max-w-5xl max-h-[90vh]">
                            <img src={zoomedImage} alt="Fullscreen Detail" className="w-full h-full object-contain shadow-2xl rounded-3xl" />
                            <button onClick={() => setZoomedImage(null)} className="absolute top-6 right-6 text-white/50 hover:text-white transition-all"><X className="w-10 h-10" /></button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ModernModal isOpen={modal.isOpen} onClose={() => setModal(m => ({ ...m, isOpen: false }))} onConfirm={modal.onConfirm} title={modal.title} message={modal.message} type={modal.type} />
        </DashboardLayout>
    );
};

export default ProductDetail;
