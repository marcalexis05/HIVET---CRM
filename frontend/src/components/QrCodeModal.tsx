import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode, ShieldCheck, Loader2, CheckCircle2, Info } from 'lucide-react';

interface QrCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    qrData: string; // Base64 string
    amount: number;
    reference: string;
    referenceLabel?: string;
    status: 'pending' | 'succeeded' | 'expired' | 'processing';
}

const QrCodeModal: React.FC<QrCodeModalProps> = ({ 
    isOpen, 
    onClose, 
    qrData, 
    amount, 
    reference,
    referenceLabel = 'Order Reference',
    status 
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#FDF0D5]"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        className="bg-white rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.2)] relative max-h-[90vh] flex flex-col sm:flex-row"
                    >
                        {/* Status Overlays */}
                        {status === 'succeeded' && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 z-[100] bg-emerald-500 flex flex-col items-center justify-center text-white p-8"
                            >
                                <motion.div
                                    initial={{ scale: 0.5, rotate: -20 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", damping: 12 }}
                                >
                                    <CheckCircle2 className="w-24 h-24 mb-6" />
                                </motion.div>
                                <h3 className="text-4xl font-black tracking-tighter mb-2">Payment Received!</h3>
                                <p className="text-emerald-50/80 font-bold uppercase tracking-widest text-[11px] text-center">Processing your order now...</p>
                            </motion.div>
                        )}

                        {/* Left Side: QR Code Area */}
                        <div className="sm:w-[45%] bg-[#FAFAFA] border-r border-accent-peach/20 p-8 sm:p-12 flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full bg-brand/5 opacity-50 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                            
                            <div className="relative z-10 w-full flex flex-col items-center">
                                <div className="mb-8 text-center sm:text-left w-full">
                                    <div className="flex items-center gap-3 mb-2 justify-center sm:justify-start">
                                        <div className="bg-brand/10 p-2.5 rounded-xl text-brand">
                                            <QrCode className="w-5 h-5" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-brown/30">QRPh Payment</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-accent-brown tracking-tight">Scan to Pay</h3>
                                </div>

                                <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-accent-peach/20 relative group">
                                    <div className="absolute inset-0 bg-brand/5 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative">
                                        {qrData ? (
                                            <img 
                                                src={qrData} 
                                                alt="QRPh Code" 
                                                className="w-full max-w-[240px] aspect-square rounded-xl"
                                            />
                                        ) : (
                                            <div className="w-[240px] h-[240px] flex items-center justify-center bg-accent-peach/5 rounded-xl">
                                                <Loader2 className="w-12 h-12 text-brand animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center gap-2.5 px-4 py-2 bg-white rounded-full shadow-sm border border-accent-peach/20">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    <span className="text-[10px] font-black text-accent-brown/60 uppercase tracking-widest leading-none">PayMongo Secured</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Details & Instructions */}
                        <div className="sm:flex-1 p-8 sm:p-12 flex flex-col justify-between overflow-y-auto no-scrollbar">
                            <button 
                                onClick={onClose}
                                className="absolute top-8 right-8 p-3 hover:bg-accent-peach/20 rounded-2xl text-accent-brown/40 hover:text-accent-brown transition-all z-20"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <div className="space-y-10">
                                {/* Amount & Ref Section */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 block mb-3">Total Amount Due</span>
                                        <div className="text-4xl font-black text-accent-brown tracking-tighter">
                                            ₱{amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-accent-brown/30 block mb-3">{referenceLabel}</span>
                                        <div className="text-xl font-black text-accent-brown/60 tracking-tight flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-brand" />
                                            {reference}
                                        </div>
                                    </div>
                                </div>

                                {/* Instructions Section */}
                                <div className="space-y-6">
                                    <div className="bg-blue-50/50 rounded-3xl p-6 border border-blue-100 flex gap-5">
                                        <div className="w-10 h-10 bg-blue-100/50 rounded-2xl flex items-center justify-center shrink-0">
                                            <Info className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <div className="text-xs font-bold text-blue-700/80 leading-relaxed">
                                            Open any PH banking app or e-wallet (GCash, Maya, ShopeePay, etc.) and scan the QRPh code on the left to complete your payment instantly.
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-brown/30">Select Apps Support</span>
                                        <div className="flex items-center gap-5">
                                            <div className="flex -space-x-2">
                                                <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-sm" />
                                                <div className="w-8 h-8 rounded-full bg-green-500 border-2 border-white shadow-sm" />
                                                <div className="w-8 h-8 rounded-full bg-red-500 border-2 border-white shadow-sm" />
                                            </div>
                                            <div className="h-4 w-[1px] bg-accent-brown/10" />
                                            <span className="text-[11px] font-bold text-accent-brown/50 italic">Interoperable with all QRPh participants</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Status */}
                            <div className="mt-12 pt-8 border-t border-accent-peach/20">
                                {status === 'processing' ? (
                                    <div className="flex items-center gap-4 text-accent-brown/40">
                                        <Loader2 className="w-5 h-5 animate-spin text-brand" />
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-widest leading-none mb-1">Waiting for payment...</p>
                                            <p className="text-[9px] font-bold text-accent-brown/20 italic">Do not close this window</p>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={onClose}
                                        className="w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-accent-brown/40 hover:bg-accent-peach/10 transition-all border-2 border-accent-peach/20 hover:text-accent-brown"
                                    >
                                        I'll pay later
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default QrCodeModal;
