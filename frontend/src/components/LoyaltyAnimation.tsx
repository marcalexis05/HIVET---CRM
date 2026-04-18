import React from 'react';
import { motion } from 'framer-motion';

const LoyaltyAnimation = () => {
    return (
        <div className="relative w-full h-48 flex items-center justify-center overflow-hidden perspective-1000">
            {/* Holographic Ring */}
            <motion.div
                animate={{ 
                    rotateY: 360,
                    rotateX: [10, -10, 10],
                }}
                transition={{ 
                    duration: 8, 
                    repeat: Infinity, 
                    ease: "linear" 
                }}
                className="absolute w-32 h-32 border-4 border-brand/30 rounded-full shadow-[0_0_50px_rgba(255,107,0,0.3)] flex items-center justify-center"
                style={{ transformStyle: 'preserve-3d', fontFamily: 'Outfit, sans-serif' }}
            >
                {/* floating particles */}
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{ 
                            y: [0, -20, 0],
                            opacity: [0.3, 1, 0.3],
                            scale: [1, 1.2, 1]
                        }}
                        transition={{ 
                            duration: 3 + i, 
                            repeat: Infinity, 
                            ease: "easeInOut",
                            delay: i * 0.5
                        }}
                        className="absolute w-2 h-2 bg-brand rounded-full"
                        style={{ 
                            transform: `rotate(${i * 60}deg) translateX(60px)` 
                        }}
                    />
                ))}
            </motion.div>

            {/* Central Floating Badge */}
            <motion.div
                animate={{ 
                    y: [-10, 10],
                    rotateY: [-15, 15],
                    scale: [0.95, 1.05]
                }}
                transition={{ 
                    duration: 4, 
                    repeat: Infinity, 
                    repeatType: "reverse", 
                    ease: "easeInOut" 
                }}
                className="relative z-10 w-24 h-24 bg-gradient-to-tr from-brand to-brand-light rounded-[2rem] shadow-[0_20px_40px_rgba(255,107,0,0.4)] flex items-center justify-center border border-white/20"
                style={{ transformStyle: 'preserve-3d' }}
            >
                <motion.div
                    animate={{ rotateZ: [0, 10, -10, 0] }}
                    transition={{ duration: 5, repeat: Infinity }}
                >
                    <svg className="w-12 h-12 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 15l-2.43 1.278.464-2.706-1.966-1.916 2.717-.395L12 8.8l1.215 2.46 2.717.395-1.966 1.916.464 2.706L12 15z" />
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 100-16 8 8 0 000 16z" clipRule="evenodd" />
                    </svg>
                </motion.div>
                
                {/* 3D Depth back effect */}
                <div className="absolute inset-0 bg-black/20 rounded-[2rem] -z-10 blur-sm translate-y-4 scale-95" />
            </motion.div>

            {/* Orbiting Points */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute w-48 h-48 border border-white/10 rounded-full"
            >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/40 backdrop-blur-sm rounded-lg flex items-center justify-center text-[8px] font-black text-white">+10</div>
            </motion.div>
        </div>
    );
};

export default LoyaltyAnimation;
