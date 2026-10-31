import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from './AuthContext';

export interface CartItem {
    id: number;
    business_id: number;
    name: string;
    description?: string;
    price: string;
    image: string;
    quantity: number;
    variant?: string;
    size?: string;
    stock: number;
}

export interface FlyingItem {
    id: string;
    startX: number;
    startY: number;
    image: string;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (itemId: number, variant?: string, size?: string) => void;
    updateQuantity: (itemId: number, quantity: number, variant?: string, size?: string) => void;
    clearCart: () => void;
    totalItems: number;
    totalAmount: number;
    flyingItems: FlyingItem[];
    triggerFlyAnimation: (e: React.MouseEvent, image: string) => void;
    requestCartAccess: () => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const { user, isLoading } = useAuth();
    const authDialog = useRef<HTMLDialogElement>(null);
    const requestCartAccess = useCallback(() => {
        if (user?.token && user.role === 'customer') return true;
        if (!authDialog.current?.open) authDialog.current?.showModal();
        return false;
    }, [user]);
    const [items, setItems] = useState<CartItem[]>(() => {
        const saved = localStorage.getItem('hivet_cart');
        return saved ? JSON.parse(saved) : [];
    });
    const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);

    useEffect(() => {
        if (!isLoading && !user) setItems([]);
    }, [isLoading, user]);

    useEffect(() => {
        localStorage.setItem('hivet_cart', JSON.stringify(items));
    }, [items]);

    const addToCart = useCallback((newItem: CartItem) => {
        if (!requestCartAccess()) return;
        setItems(currentItems => {
            const existingItemIndex = currentItems.findIndex(
                item => item.id === newItem.id && item.variant === newItem.variant && item.size === newItem.size
            );

            if (existingItemIndex > -1) {
                const updatedItems = [...currentItems];
                const item = updatedItems[existingItemIndex];
                // Update stock if dynamic
                if (newItem.stock !== undefined) item.stock = newItem.stock;
                
                // Enforce stock limit
                const maxStock = (newItem.stock !== undefined) ? newItem.stock : (item.stock !== undefined ? item.stock : 9999);
                item.quantity = Math.min(item.quantity + newItem.quantity, maxStock);
                return updatedItems;
            }

            return [...currentItems, newItem];
        });
    }, [requestCartAccess]);

    const removeFromCart = useCallback((itemId: number, variant?: string, size?: string) => {
        setItems(currentItems => currentItems.filter(
            item => !(item.id === itemId && item.variant === variant && item.size === size)
        ));
    }, []);

    const updateQuantity = useCallback((itemId: number, quantity: number, variant?: string, size?: string) => {
        if (quantity < 1) {
            removeFromCart(itemId, variant, size);
            return;
        }

        setItems(currentItems =>
            currentItems.map(item =>
                (item.id === itemId && item.variant === variant && item.size === size)
                    ? { ...item, quantity: Math.min(quantity, item.stock || 9999) }
                    : item
            )
        );
    }, [removeFromCart]);

    const clearCart = useCallback(() => {
        setItems([]);
    }, []);

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

    const triggerFlyAnimation = (e: React.MouseEvent, image: string) => {
        if (!requestCartAccess()) return;
        const newId = Date.now().toString() + Math.random();
        setFlyingItems(prev => [...prev, { id: newId, startX: e.clientX, startY: e.clientY, image }]);

        setTimeout(() => {
            setFlyingItems(prev => prev.filter(item => item.id !== newId));

            // Jiggle effect for the cart icon
            const cartIcon = document.getElementById('nav-cart-icon');
            if (cartIcon) {
                cartIcon.classList.add('animate-bounce');
                setTimeout(() => cartIcon.classList.remove('animate-bounce'), 500);
            }
        }, 1500);
    };

    return (
        <CartContext.Provider value={{
            items,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            totalItems,
            totalAmount,
            flyingItems,
            triggerFlyAnimation
            ,requestCartAccess
        }}>
            {children}
            <dialog ref={authDialog} aria-labelledby="cart-login-title" className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-white p-6 text-accent-brown shadow-2xl backdrop:bg-black/40">
                <h2 id="cart-login-title" className="text-xl font-bold mb-3">Log in to continue</h2>
                <p>You need to login or sign up first to add to cart.</p>
                <div className="flex flex-wrap gap-3 mt-6">
                    <a href="/login" className="px-5 py-3 rounded-xl bg-brand text-white font-bold">Log In</a>
                    <a href="/register" className="px-5 py-3 rounded-xl border border-brand text-brand font-bold">Sign Up</a>
                    <button onClick={() => authDialog.current?.close()} className="px-3 py-3 font-semibold">Close</button>
                </div>
            </dialog>

            {/* Render Flying Items Globally */}
            {flyingItems.map(item => {
                const navCart = document.getElementById('nav-cart-icon');
                const navRect = navCart?.getBoundingClientRect();
                const targetX = navRect ? navRect.left + navRect.width / 2 : window.innerWidth - 100;
                const targetY = navRect ? navRect.top + navRect.height / 2 : 50;

                return (
                    <motion.div
                        key={item.id}
                        initial={{ x: item.startX - 32, y: item.startY - 32, scale: 1, opacity: 1 }}
                        animate={{
                            x: targetX - 16,
                            y: targetY - 16,
                            scale: 0.15,
                            opacity: 0,
                            rotate: 720
                        }}
                        transition={{
                            duration: 1.5,
                            ease: "easeInOut" // Slower, smoother ease
                        }}
                        className="fixed top-0 left-0 z-[9999] w-16 h-16 pointer-events-none drop-shadow-2xl"
                    >
                        <img src={item.image} alt="flying product" className="w-full h-full object-contain" />
                    </motion.div>
                );
            })}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
