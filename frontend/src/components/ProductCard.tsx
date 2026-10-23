import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, ShoppingCart, Minus, Plus, Store } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { toTitleCase, formatName } from '../utils/textFormatters';

export interface ProductCardData {
    id: number;
    name: string;
    category?: string;
    type?: string;
    price: number | string;
    stock?: number;
    sku?: string;
    image: string;
    description?: string;
    tag?: string;
    loyalty_points?: number;
    clinic_name?: string;
    business_id?: number;
    stars?: number;
    review_count?: number;
}

interface ProductCardProps {
    product: ProductCardData;
    index?: number;
    quantity?: number;
    onQuantityChange?: (qty: number) => void;
    onAddToCart?: (e: React.MouseEvent, product: ProductCardData, quantity: number) => void;
    className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
    product,
    index = 0,
    quantity,
    onQuantityChange,
    onAddToCart,
    className = ""
}) => {
    const navigate = useNavigate();
    const { addToCart, triggerFlyAnimation } = useCart();
    const [localQty, setLocalQty] = useState(1);

    const currentQty = quantity !== undefined ? quantity : localQty;

    const setQty = (val: number) => {
        const maxStock = product.stock !== undefined && product.stock > 0 ? product.stock : 999;
        const clamped = Math.min(Math.max(1, val), maxStock);
        if (onQuantityChange) {
            onQuantityChange(clamped);
        } else {
            setLocalQty(clamped);
        }
    };

    const handleMinus = (e: React.MouseEvent) => {
        e.stopPropagation();
        setQty(currentQty - 1);
    };

    const handlePlus = (e: React.MouseEvent) => {
        e.stopPropagation();
        setQty(currentQty + 1);
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        const raw = e.target.value.replace(/[^0-9]/g, '');
        const num = raw === '' ? 1 : parseInt(raw, 10);
        setQty(isNaN(num) ? 1 : num);
    };

    const handleNavigate = () => {
        navigate(`/dashboard/customer/catalog/${product.id}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCartClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (product.stock !== undefined && product.stock <= 0) return;

        if (onAddToCart) {
            onAddToCart(e, product, currentQty);
        } else {
            triggerFlyAnimation(e, product.image);
            addToCart({
                id: product.id,
                name: product.name,
                description: product.description,
                price: String(product.price),
                business_id: product.business_id || 1,
                image: product.image,
                quantity: currentQty,
                variant: 'Standard',
                size: 'Medium',
                stock: product.stock || 0
            });
        }
    };

    const isAvailable = product.stock === undefined || product.stock > 0;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            whileHover={{ y: -5 }}
            className={`group bg-white rounded-2xl xs:rounded-3xl sm:rounded-[2.5rem] p-3 xs:p-3.5 sm:p-5 lg:p-6 border border-accent-brown/10 hover:border-brand/40 transition-all duration-300 flex flex-col justify-between relative overflow-hidden h-full shadow-sm hover:shadow-lg ${className}`}
        >
            <div>
                {/* 1. Image Area (1:1 Aspect Ratio) */}
                <div 
                    onClick={handleNavigate}
                    className="relative aspect-square rounded-xl xs:rounded-2xl sm:rounded-[1.75rem] bg-accent-brown/5 mb-3 xs:mb-3.5 sm:mb-5 flex items-center justify-center p-2.5 xs:p-3 sm:p-5 cursor-pointer group-hover:bg-white transition-all duration-300 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-accent-brown/5 group-hover:bg-brand/5 transition-colors" />
                    <img
                        src={product.image}
                        alt={product.name}
                        className="relative z-10 w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                    />
                    
                    {/* Top-Left: Product Tag Pill */}
                    {product.tag && (
                        <div className="absolute top-2 left-2 z-20">
                            <div className="bg-accent-brown/90 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow-sm border border-white/10 flex items-center justify-center">
                                <span className="text-[10px] sm:text-[11px] font-black text-white leading-none tracking-wide">
                                    {toTitleCase(product.tag)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Bottom-Right: Loyalty Points Pill */}
                    {Number(product.loyalty_points) > 0 && (
                        <div className="absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 z-20 group-hover:opacity-0 transition-opacity duration-200">
                            <div className="bg-brand/95 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl shadow-sm border border-white/10 flex items-center gap-1">
                                <Award className="w-3 h-3 text-white shrink-0" />
                                <span className="text-[10px] sm:text-[11px] font-black text-white">
                                    +{product.loyalty_points} Points
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Clinic Name Hover Reveal (if present) */}
                    {product.clinic_name && (
                        <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-30">
                            <div className="bg-white/95 backdrop-blur-md rounded-xl p-2 shadow-lg border border-brand/10 flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                                    <Store className="w-3 h-3 text-brand" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-bold text-brand leading-none mb-0.5">Clinic</p>
                                    <p className="text-[10px] sm:text-[11px] font-bold text-accent-brown truncate">
                                        {formatName(product.clinic_name)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Category Row */}
                {(product.category || product.type) && (
                    <div className="flex items-center gap-1.5 mb-1.5 px-0.5 flex-wrap">
                        {product.category && (
                            <span className="text-xs font-bold text-brand">{toTitleCase(product.category)}</span>
                        )}
                        {product.category && product.type && (
                            <div className="w-1 h-1 rounded-full bg-accent-brown/30" />
                        )}
                        {product.type && (
                            <span className="text-xs font-medium text-black/70">{toTitleCase(product.type)}</span>
                        )}
                    </div>
                )}

                {/* 3. Product Name & 4. Description */}
                <div className="mb-3 sm:mb-4 px-0.5">
                    <h4 
                        onClick={handleNavigate}
                        className="text-sm sm:text-base font-black text-accent-brown tracking-tight leading-snug group-hover:text-brand transition-colors line-clamp-2 cursor-pointer"
                    >
                        {formatName(product.name)}
                    </h4>
                    {product.description && (
                        <p 
                            onClick={handleNavigate}
                            className="mt-1 text-xs text-black/60 font-medium leading-relaxed line-clamp-2 cursor-pointer hover:text-black transition-colors"
                        >
                            {product.description}
                        </p>
                    )}
                </div>
            </div>

            {/* 5. Divider & 6. Price & 7. Stepper + Cart */}
            <div className="mt-auto pt-3 sm:pt-4 border-t border-accent-brown/5 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 px-0.5">
                <div className="space-y-0.5 shrink-0">
                    <p className="text-xs font-bold text-black/60">Price</p>
                    <div className="flex items-baseline gap-0.5 font-black text-accent-brown">
                        <span className="text-xs sm:text-sm">₱</span>
                        <span className="text-base xs:text-lg sm:text-2xl tracking-tight tabular-nums">
                            {Number(product.price).toLocaleString()}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 xs:gap-2 self-stretch xs:self-auto justify-end">
                    {/* Quantity Stepper */}
                    <div className="flex items-center bg-accent-brown/5 rounded-xl p-0.5 border border-accent-brown/5 shrink-0">
                        <button 
                            type="button"
                            onClick={handleMinus}
                            className="min-w-[44px] min-h-[44px] w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-accent-brown/60 hover:text-brand active:scale-95 transition-all select-none"
                            aria-label="Decrease quantity"
                        >
                            <Minus className="w-3.5 h-3.5" />
                        </button>
                        
                        <input
                            type="text"
                            inputMode="numeric"
                            value={currentQty}
                            onChange={handleInput}
                            onClick={(e) => e.stopPropagation()}
                            className="w-7 sm:w-8 text-center text-xs sm:text-sm font-black text-accent-brown bg-transparent outline-none"
                            aria-label="Product quantity"
                        />

                        <button 
                            type="button"
                            onClick={handlePlus}
                            className="min-w-[44px] min-h-[44px] w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-accent-brown/60 hover:text-brand active:scale-95 transition-all select-none"
                            aria-label="Increase quantity"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Add to Cart Button */}
                    <button 
                        type="button"
                        onClick={handleCartClick}
                        aria-label={`Add ${product.name} to cart`}
                        disabled={!isAvailable}
                        className={`min-h-[44px] min-w-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-90 shrink-0 ${
                            isAvailable 
                                ? "bg-brand text-white hover:bg-black shadow-brand/20 cursor-pointer" 
                                : "bg-accent-brown/5 text-accent-brown/20 cursor-not-allowed"
                        }`}
                    >
                        <ShoppingCart className="w-4 h-4 sm:w-5 h-5" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default ProductCard;
