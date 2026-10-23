import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Send, Bot, ShieldCheck, ArrowRight
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    options?: string[];
}

interface SupportBotProps {
    hideFloating?: boolean;
}

const SupportBot: React.FC<SupportBotProps> = ({ hideFloating = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<'tree' | 'ai'>('tree');
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const initialOptions = [
        "Order Tracking",
        "Appointment Help",
        "Account & Security",
        "Talk to AI Assistant"
    ];

    const getWelcomeMessage = (): Message => ({
        id: 'welcome',
        text: "Hello! I'm your Hi-Vet Assistant. How can I help you today?",
        sender: 'bot',
        timestamp: new Date(),
        options: initialOptions
    });

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('open-support-bot', handleOpen);
        return () => window.removeEventListener('open-support-bot', handleOpen);
    }, []);

    useEffect(() => {
        if (messages.length === 0) {
            setMessages([getWelcomeMessage()]);
        }
    }, []);

    // Smooth scroll to latest message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Lock body scroll on mobile phones (< 640px) when open
    useEffect(() => {
        if (isOpen) {
            const isMobile = window.innerWidth < 640;
            if (isMobile) {
                const prevOverflow = document.body.style.overflow;
                document.body.style.overflow = 'hidden';
                return () => {
                    document.body.style.overflow = prevOverflow;
                };
            }
        }
    }, [isOpen]);

    // Keyboard Escape to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Focus management on open/close
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                if (mode === 'ai' && inputRef.current) {
                    inputRef.current.focus();
                } else {
                    const firstBtn = panelRef.current?.querySelector('button') as HTMLButtonElement | null;
                    firstBtn?.focus();
                }
            }, 50);
        } else {
            triggerRef.current?.focus();
        }
    }, [isOpen, mode]);

    const handleReset = () => {
        setMessages([getWelcomeMessage()]);
        setMode('tree');
        setInputValue('');
        setIsLoading(false);
    };

    const handleOptionClick = (option: string) => {
        const userMsg: Message = {
            id: Date.now().toString(),
            text: option,
            sender: 'user',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);

        // Process Tree Logic
        setTimeout(() => {
            let response: Message = {
                id: (Date.now() + 1).toString(),
                text: "",
                sender: 'bot',
                timestamp: new Date()
            };

            if (option.includes("Order Tracking")) {
                response.text = "You can view and track your orders in real-time on the 'Orders' page. Would you like me to redirect you or provide more info?";
                response.options = ["Go to Orders", "Track via ID", "Back to Main"];
            } else if (option.includes("Appointment Help")) {
                response.text = "Need a veterinary visit? You can browse available schedules and book directly through the 'Reservations' tab.";
                response.options = ["View Clinics", "Emergency Contact", "Back to Main"];
            } else if (option.includes("Account & Security")) {
                response.text = "For security reasons, you can manage your password and privacy settings in the 'Account' section of your dashboard.";
                response.options = ["Go to Settings", "Back to Main"];
            } else if (option.includes("Talk to AI")) {
                setMode('ai');
                response.text = "I'm switching to AI mode. You can now ask me anything about Hi-Vet or pet care!";
                response.options = ["Switch back to Menu"];
            } else if (option.includes("Back to Main") || option.includes("Switch back to Menu")) {
                setMode('tree');
                response.text = "Returning to main menu. How else can I assist?";
                response.options = initialOptions;
            } else if (option.includes("Go to Orders")) {
                window.location.href = '/dashboard/customer/orders';
                return;
            } else {
                response.text = "I've noted your concern. For complex issues, I recommend speaking to our AI or contacting support via email.";
                response.options = ["Talk to AI Assistant", "Back to Main"];
            }

            setMessages(prev => [...prev, response]);
        }, 600);
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: inputValue,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('hivet_token');
            const res = await fetch(`${API}/api/support/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ message: inputValue, history: [] })
            });

            if (res.ok) {
                const data = await res.json();
                const botMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    text: data.response,
                    sender: 'bot',
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, botMsg]);
            } else {
                throw new Error("Failed to get response");
            }
        } catch (err) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                text: "I'm having a bit of trouble connecting to my brain. Please try again or check your internet connection.",
                sender: 'bot',
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Chat Panel Window & Mobile Dim Backdrop (Only opened via Profile Settings -> Help & Support) */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Mobile Dim Overlay (No blur, tap to close) */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/40 z-[75] sm:hidden cursor-pointer"
                            aria-hidden="true"
                        />

                        {/* Panel Container (Mobile full-width bottom sheet, Desktop floating right card) */}
                        <motion.div
                            ref={panelRef}
                            role="dialog"
                            aria-modal="true"
                            aria-label="Hi-Vet Assistant"
                            tabIndex={-1}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 30 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="fixed inset-x-0 bottom-0 w-full max-w-full h-[92vh] max-h-[92dvh] rounded-t-[24px] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[400px] sm:max-w-[420px] sm:h-[600px] sm:max-h-[80vh] sm:min-h-[480px] sm:rounded-[24px] bg-white shadow-[-10px_20px_50px_rgba(0,0,0,0.15)] border-t border-slate-200 sm:border sm:border-slate-200/90 z-[80] flex flex-col overflow-hidden motion-reduce:transform-none motion-reduce:transition-none outline-none"
                        >
                            {/* Decorative Mobile Drag Handle */}
                            <div className="sm:hidden w-10 h-1.5 bg-slate-200 rounded-full mx-auto my-2 shrink-0" aria-hidden="true" />

                            {/* Header Row */}
                            <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-white border-b border-accent-brown/10 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div
                                        aria-hidden="true"
                                        className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-brand/10 text-brand-dark border border-brand/20 flex items-center justify-center shrink-0 shadow-sm"
                                    >
                                        <Bot className="w-5 h-5 text-brand-dark" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base sm:text-[17px] font-bold text-accent-brown tracking-tight leading-snug truncate">
                                            Hi-Vet Assistant
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                                            <span className="text-xs font-semibold text-slate-600">Always Online</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        title="Reset Chat"
                                        aria-label="Reset Chat"
                                        className="min-h-[44px] min-w-[44px] px-3.5 py-1.5 rounded-full border border-brand/35 text-brand-dark hover:bg-brand/10 text-sm font-bold transition-all flex items-center justify-center active:scale-95 cursor-pointer select-none"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        title="Close Chat"
                                        aria-label="Close Chat"
                                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                                    >
                                        <X className="w-5 h-5 text-slate-700" aria-hidden="true" />
                                    </button>
                                </div>
                            </div>

                            {/* Message Area */}
                            <div 
                                ref={scrollRef} 
                                aria-live="polite"
                                className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar bg-slate-50/40"
                            >
                                {messages.map((m, idx) => {
                                    const isUser = m.sender === 'user';
                                    const prevMessage = idx > 0 ? messages[idx - 1] : null;
                                    const isSameSender = prevMessage && prevMessage.sender === m.sender;

                                    return (
                                        <div 
                                            key={m.id} 
                                            className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} ${isSameSender ? 'mt-2' : 'mt-4'}`}
                                        >
                                            <div className={`flex items-start gap-2 max-w-[85%] ${isUser ? 'justify-end ml-auto' : 'justify-start'}`}>
                                                {!isUser && (
                                                    <div 
                                                        aria-hidden="true"
                                                        className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-full bg-brand/10 text-brand-dark border border-brand/20 flex items-center justify-center shrink-0 mt-0.5 shadow-xs"
                                                    >
                                                        <Bot className="w-4 h-4 text-brand-dark" />
                                                    </div>
                                                )}

                                                <div 
                                                    className={`p-3.5 sm:p-4 text-base leading-relaxed break-words shadow-xs ${
                                                        isUser 
                                                            ? 'bg-brand-dark text-white rounded-[18px] rounded-tr-[4px] font-medium' 
                                                            : 'bg-white border border-slate-200/90 text-slate-800 rounded-[18px] rounded-tl-[4px] font-normal'
                                                    }`}
                                                >
                                                    <span className="sr-only">{isUser ? 'You: ' : 'Hi-Vet Assistant: '}</span>
                                                    {m.text}
                                                </div>
                                            </div>
                                            
                                            {/* Quick Reply Chips Directly Below Message */}
                                            {m.options && m.options.length > 0 && (
                                                <div className="flex flex-wrap gap-2.5 mt-3 pt-0.5 pl-9 max-w-full">
                                                    {m.options.map((opt) => {
                                                        const isAiChip = opt === "Talk to AI Assistant";
                                                        return (
                                                            <button
                                                                key={opt}
                                                                type="button"
                                                                onClick={() => handleOptionClick(opt)}
                                                                className={`min-h-[44px] h-auto py-2.5 px-4 rounded-full text-sm font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center text-center shadow-xs select-none ${
                                                                    isAiChip
                                                                        ? 'bg-brand/10 border-2 border-brand text-brand-dark hover:bg-brand/20 hover:border-brand-dark'
                                                                        : 'bg-white border-2 border-brand/35 text-accent-brown hover:border-brand-dark hover:bg-brand/5'
                                                                }`}
                                                            >
                                                                {opt}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                
                                {/* Loading / Thinking Indicator */}
                                {isLoading && (
                                    <div className="flex items-start gap-2 max-w-[85%] mt-4">
                                        <div 
                                            aria-hidden="true"
                                            className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-full bg-brand/10 text-brand-dark border border-brand/20 flex items-center justify-center shrink-0 mt-0.5 shadow-xs"
                                        >
                                            <Bot className="w-4 h-4 text-brand-dark" />
                                        </div>
                                        <div className="bg-white border border-slate-200/90 rounded-[18px] rounded-tl-[4px] px-4 py-3 shadow-xs flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse motion-reduce:animate-none" />
                                            <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse delay-150 motion-reduce:animate-none" />
                                            <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse delay-300 motion-reduce:animate-none" />
                                            <span className="sr-only">Hi-Vet is thinking...</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Bottom Area */}
                            <div className="p-3 sm:p-4 bg-white border-t border-slate-100 shrink-0 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))]">
                                {mode === 'ai' ? (
                                    <form onSubmit={handleSendMessage} className="flex items-center gap-2.5">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            placeholder="Type your question..."
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            disabled={isLoading}
                                            className="flex-1 min-h-[48px] h-12 py-2.5 px-4 text-base font-medium rounded-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-brand-dark focus:ring-2 focus:ring-brand/20 outline-none text-slate-800 placeholder:text-slate-400 transition-all leading-normal"
                                        />
                                        <button
                                            type="submit"
                                            disabled={isLoading || !inputValue.trim()}
                                            aria-disabled={isLoading || !inputValue.trim()}
                                            aria-label="Send message"
                                            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-brand-dark hover:bg-black text-white flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none shrink-0 cursor-pointer"
                                        >
                                            <Send className="w-5 h-5 text-white" aria-hidden="true" />
                                        </button>
                                    </form>
                                ) : (
                                    <div className="bg-[#FAF9F5] border border-amber-900/10 rounded-2xl p-3.5 sm:p-4 text-center space-y-2 shadow-xs">
                                        <p className="text-sm font-medium text-slate-600">
                                            Select an option above to begin
                                        </p>
                                        <div>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setMode('ai');
                                                    setTimeout(() => inputRef.current?.focus(), 100);
                                                }}
                                                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 text-sm sm:text-base font-bold text-brand-dark hover:text-black underline underline-offset-4 cursor-pointer transition-colors"
                                            >
                                                <span>Or unlock free-chat with AI</span>
                                                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                                            </button>
                                        </div>
                                        <div className="pt-2 border-t border-accent-brown/5 flex items-center justify-center gap-1.5">
                                            <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                                            <span className="text-xs font-semibold text-slate-500">Secure Care Support</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default SupportBot;
