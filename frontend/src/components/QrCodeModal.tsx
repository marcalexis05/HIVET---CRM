import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode, ShieldCheck, Loader2, CheckCircle2, Info } from 'lucide-react';

interface QrCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    qrData: string; // Base64 string
    amount: number;
    reference: string;
    status: 'pending' | 'succeeded' | 'expired' | 'processing';
}

const QrCodeModal: React.FC<QrCodeModalProps> = ({ 
    isOpen, 
    onClose, 
    qrData, 
    amount, 
    reference,
    status 
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-accent-brown/40 backdrop-blur-xl"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl relative"
                    >
                        {/* Status Overlays */}
                        {status === 'succeeded' && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 z-20 bg-emerald-500 flex flex-col items-center justify-center text-white"
                            >
                                <motion.div
                                    initial={{ scale: 0.5, rotate: -20 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", damping: 12 }}
                                >
                                    <CheckCircle2 className="w-24 h-24 mb-6" />
                                </motion.div>
                                <h3 className="text-3xl font-black tracking-tighter mb-2">Payment Received!</h3>
                                <p className="text-emerald-50/80 font-bold uppercase tracking-widest text-[10px]">Processing your order now</p>
                            </motion.div>
                        )}

                        <div className="p-8 sm:p-12">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-brand/10 p-2 rounded-xl text-brand">
                                            <QrCode className="w-5 h-5" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-brown/40">QRPh Payment</span>
                                    </div>
                                    <h3 className="text-3xl font-black text-accent-brown tracking-tighter">Scan to Pay</h3>
                                </div>
                                <button 
                                    onClick={onClose}
                                    className="p-3 hover:bg-accent-peach/20 rounded-2xl text-accent-brown/40 hover:text-accent-brown transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* QR Code Frame */}
                            <div className="relative group mb-8">
                                <div className="absolute inset-0 bg-brand/5 rounded-[2.5rem] blur-2xl group-hover:bg-brand/10 transition-all duration-500" />
                                <div className="relative bg-white border-2 border-accent-peach/30 rounded-[2.5rem] p-4 flex flex-col items-center shadow-lg">
                                    {qrData ? (
                                        <img 
                                            src={qrData} 
                                            alt="QRPh Code" 
                                            className="w-full max-w-[280px] aspect-square rounded-2xl"
                                        />
                                    ) : (
                                        <div className="w-[280px] h-[280px] flex items-center justify-center bg-accent-peach/10 rounded-2xl">
                                            <Loader2 className="w-12 h-12 text-brand animate-spin" />
                                        </div>
                                    )}
                                    
                                    <div className="mt-4 flex items-center gap-2 bg-accent-peach/20 px-4 py-2 rounded-full">
                                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                        <span className="text-[10px] font-black text-accent-brown uppercase tracking-widest">PayMongo Secured</span>
                                    </div>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-accent-peach/10 p-6 rounded-3xl border border-accent-peach/20">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 block mb-1">Amount Due</span>
                                    <div className="text-2xl font-black text-accent-brown tracking-tighter">
                                        ₱{amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div className="bg-accent-peach/10 p-6 rounded-3xl border border-accent-peach/20">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-accent-brown/30 block mb-1">Reference</span>
                                    <div className="text-lg font-black text-accent-brown/60 tracking-tight truncate">
                                        {reference}
                                    </div>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="space-y-4">
                                <div className="flex gap-4 items-start p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                    <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                    <div className="text-[11px] font-bold text-blue-700/80 leading-relaxed">
                                        Open your GCash, Maya, or any banking app and select "Scan QR" to pay. The QR code expires in 30 minutes.
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-3 py-2">
                                    <div className="flex -space-x-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-600 border-2 border-white" />
                                        <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-white" />
                                        <div className="w-6 h-6 rounded-full bg-red-500 border-2 border-white" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30">Supports All Major E-Wallets & Banks</span>
                                </div>
                            </div>

                            {/* Polling Indicator */}
                            {status === 'processing' ? (
                                <div className="mt-8 flex items-center justify-center gap-2 text-accent-brown/40">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Confirming Payment...</span>
                                </div>
                            ) : (
                                <div className="mt-8 pt-8 border-t border-accent-peach/20">
                                    <button 
                                        onClick={onClose}
                                        className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-accent-brown/40 hover:bg-accent-peach/10 transition-all border-2 border-accent-peach/20"
                                    >
                                        I'll pay later
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default QrCodeModal;
