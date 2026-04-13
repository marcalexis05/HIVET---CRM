import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Info, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';

interface ModernModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'error' | 'confirm' | 'danger';
    confirmLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
}

const ModernModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'info',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    loading = false
}: ModernModalProps) => {
    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle className="w-12 h-12 text-emerald-500" />;
            case 'error': return <XCircle className="w-12 h-12 text-red-500" />;
            case 'danger': return <AlertTriangle className="w-12 h-12 text-red-500" />;
            case 'confirm': return <HelpCircle className="w-12 h-12 text-brand-dark" />;
            default: return <Info className="w-12 h-12 text-brand-dark" />;
        }
    };

    const getButtonStyles = () => {
        switch (type) {
            case 'danger': return 'bg-red-500 hover:bg-red-600 shadow-red-500/20';
            case 'success': return 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20';
            default: return 'bg-brand-dark hover:bg-black shadow-brand-dark/20';
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-accent-brown/40 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative bg-white rounded-[2.5rem] w-full max-w-md p-8 sm:p-10 shadow-2xl overflow-hidden text-center"
                    >
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-peach/5 rounded-full -mr-16 -mt-16" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand/5 rounded-full -ml-12 -mb-12" />

                        {/* Icon */}
                        <div className="flex justify-center mb-6 relative">
                            <div className="p-4 bg-accent-peach/10 rounded-full">
                                {getIcon()}
                            </div>
                        </div>

                        {/* Text */}
                        <div className="relative mb-8">
                            <h3 className="text-2xl font-black text-accent-brown tracking-tighter mb-2">{title}</h3>
                            <p className="text-sm font-medium text-accent-brown/60 leading-relaxed">{message}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3 relative">
                            {onConfirm && (
                                <button
                                    onClick={onConfirm}
                                    disabled={loading}
                                    className={`w-full text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${getButtonStyles()} disabled:opacity-50`}
                                >
                                    {loading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : null}
                                    {confirmLabel}
                                </button>
                            )}
                            
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-accent-brown/30 hover:bg-accent-peach/10 transition-all border-2 border-accent-peach/20 hover:border-transparent cursor-pointer disabled:opacity-50"
                            >
                                {onConfirm ? cancelLabel : 'Dismiss'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ModernModal;
