import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export interface CartItem {
    id: number;
    name: string;
    price: string;
    image: string;
    quantity: number;
    variant?: string;
    size?: string;
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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [items, setItems] = useState<CartItem[]>(() => {
        const saved = localStorage.getItem('hivet_cart');
        return saved ? JSON.parse(saved) : [];
    });
    const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);

    useEffect(() => {
        localStorage.setItem('hivet_cart', JSON.stringify(items));
    }, [items]);

    const addToCart = (newItem: CartItem) => {
        setItems(currentItems => {
            const existingItemIndex = currentItems.findIndex(
                item => item.id === newItem.id && item.variant === newItem.variant && item.size === newItem.size
            );

            if (existingItemIndex > -1) {
                const updatedItems = [...currentItems];
                updatedItems[existingItemIndex].quantity += newItem.quantity;
                return updatedItems;
            }

            return [...currentItems, newItem];
        });
    };

    const removeFromCart = (itemId: number, variant?: string, size?: string) => {
        setItems(currentItems => currentItems.filter(
            item => !(item.id === itemId && item.variant === variant && item.size === size)
        ));
    };

    const updateQuantity = (itemId: number, quantity: number, variant?: string, size?: string) => {
        if (quantity < 1) {
            removeFromCart(itemId, variant, size);
            return;
        }

        setItems(currentItems =>
            currentItems.map(item =>
                (item.id === itemId && item.variant === variant && item.size === size)
                    ? { ...item, quantity }
                    : item
            )
        );
    };

    const clearCart = () => {
        setItems([]);
    };

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

    const triggerFlyAnimation = (e: React.MouseEvent, image: string) => {
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
        }}>
            {children}

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
