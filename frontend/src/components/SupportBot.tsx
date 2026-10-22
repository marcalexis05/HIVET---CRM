import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Send, RefreshCw
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

const SupportBot: React.FC<SupportBotProps> = ({ hideFloating = true }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<'tree' | 'ai'>('tree');
    const scrollRef = useRef<HTMLDivElement>(null);

    const initialOptions = [
        "Order Tracking",
        "Appointment Help",
        "Account & Security",
        "Talk to AI Assistant"
    ];

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('open-support-bot', handleOpen);
        return () => window.removeEventListener('open-support-bot', handleOpen);
    }, []);

    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: 'welcome',
                text: "Hello! I'm your Hi-Vet Assistant. How can I help you today?",
                sender: 'bot',
                timestamp: new Date(),
                options: initialOptions
            }]);
        }
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

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
            {/* Chat Window (Triggered via More Menu -> Chat Support or CustomEvent) */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
                        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] lg:bottom-28 right-3 sm:right-4 lg:right-8 w-[calc(100vw-1.5rem)] sm:w-[400px] h-[70vh] max-h-[600px] bg-white/95 backdrop-blur-2xl rounded-3xl sm:rounded-[2.5rem] shadow-[-20px_20px_60px_rgba(0,0,0,0.15)] border border-slate-200 z-[100] flex flex-col overflow-hidden"
                    >
                        <div className="p-6 bg-brand-dark flex items-center justify-between text-white">
                            <div className="flex items-center gap-3">
                                <div>
                                    <h3 className="font-black italic text-sm">Hi-Vet Assistant</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                        <p className="text-xs font-bold opacity-70">Always Online</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setMessages([])} title="Reset Chat" className="text-xs font-bold opacity-60 hover:opacity-100 transition-opacity">
                                    Reset
                                </button>
                                <button onClick={() => setIsOpen(false)} title="Close Chat" className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                            {messages.map((m) => (
                                <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium leading-relaxed ${
                                        m.sender === 'user' 
                                            ? 'bg-brand text-white rounded-tr-none shadow-lg shadow-brand/10' 
                                            : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none shadow-sm'
                                    }`}>
                                        {m.text}
                                    </div>
                                    
                                    {/* Structured Options */}
                                    {m.options && m.options.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {m.options.map((opt) => (
                                                <button
                                                    key={opt}
                                                    onClick={() => handleOptionClick(opt)}
                                                    className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:border-brand hover:text-brand hover:bg-brand/5 transition-all shadow-sm cursor-pointer"
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            
                            {isLoading && (
                                <div className="flex items-center gap-2 text-slate-400 p-2">
                                    <span className="text-xs font-bold">Hi-Vet is thinking...</span>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100">
                            {mode === 'ai' ? (
                                <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm transition-all focus-within:border-brand/40">
                                    <input
                                        type="text"
                                        placeholder="Type your question..."
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        className="flex-1 bg-transparent px-3 py-2 outline-none text-xs font-bold text-slate-600 placeholder:text-slate-300"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isLoading || !inputValue.trim()}
                                        className="w-10 h-10 bg-brand text-white rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:grayscale disabled:opacity-50"
                                    >
                                        <Send size={18} />
                                    </button>
                                </form>
                            ) : (
                                <div className="text-center bg-white/50 p-3 rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-xs font-bold text-slate-400">Select an option above to begin</p>
                                    <button 
                                        onClick={() => setMode('ai')}
                                        className="mt-2 text-xs font-bold text-brand hover:underline cursor-pointer"
                                    >
                                        Or unlock free-chat with AI
                                    </button>
                                </div>
                            )}
                            <div className="mt-4 flex items-center justify-center gap-1.5 opacity-40">
                                <span className="text-[10px] font-bold text-slate-500">Secure Care Support</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default SupportBot;
