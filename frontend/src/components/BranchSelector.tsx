import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Branch {
    id: number;
    name: string;
    is_main: boolean;
    address_line1?: string;
    address_line2?: string;
    house_number?: string;
    street?: string;
    sitio?: string;
    city?: string;
    barangay?: string;
}

interface BranchSelectorProps {
    token: string;
    onBranchChange: (branchId: number | null) => void;
    currentBranchId: number | null;
    allowAllBranches?: boolean;
}

const BranchSelector: React.FC<BranchSelectorProps> = ({ token, onBranchChange, currentBranchId, allowAllBranches = false }) => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerBtnRef = useRef<HTMLButtonElement>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const resp = await fetch('http://localhost:8000/api/business/branches', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await resp.json();
                setBranches(data);
                
                if (currentBranchId === null && data.length > 0) {
                    const saved = localStorage.getItem('hivet_selected_branch');
                    if (allowAllBranches && saved === 'all') {
                        onBranchChange(null);
                    } else {
                        const savedId = saved && saved !== 'all' ? parseInt(saved) : null;
                        const exists = savedId && data.some((b: Branch) => b.id === savedId);
                        if (exists) {
                            onBranchChange(savedId);
                        } else if (allowAllBranches && (saved === 'all' || !saved)) {
                            onBranchChange(null);
                        } else {
                            const main = data.find((b: Branch) => b.is_main) || data[0];
                            onBranchChange(main.id);
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching branches:', err);
            }
        };
        fetchBranches();
    }, [token, currentBranchId, onBranchChange, allowAllBranches]);

    const updatePosition = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const isMobile = window.innerWidth < 640;
            const width = isMobile ? Math.min(window.innerWidth - 32, rect.width) : Math.max(rect.width, 280);
            const left = isMobile 
                ? Math.max(16, rect.left + window.scrollX)
                : Math.max(16, Math.min(rect.left + window.scrollX, window.innerWidth - width - 16));

            setDropdownPos({
                top: rect.bottom + window.scrollY + 6,
                left: left,
                width: width
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                setIsOpen(false);
                triggerBtnRef.current?.focus();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const currentBranch = branches.find(b => b.id === currentBranchId);
    const branchDisplayName = currentBranchId === null && allowAllBranches ? 'All Branches' : currentBranch ? currentBranch.name : 'Initializing...';
    const branchSubLabel = currentBranchId === null && allowAllBranches ? 'Global System' : currentBranch ? `${currentBranch.city} Location` : 'Branch Discovery';

    if (branches.length === 0) return null;

    const dropdownContent = (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    style={{ 
                        position: 'absolute',
                        top: `${dropdownPos.top}px`,
                        left: `${dropdownPos.left}px`,
                        width: `${dropdownPos.width}px`,
                        zIndex: 99999
                    }}
                    role="listbox"
                    aria-label="Clinic Branches"
                    className="bg-white rounded-[20px] shadow-2xl border border-accent-brown/15 p-3 overflow-hidden outline-none"
                >
                    <div className="text-xs font-bold text-slate-700 px-3 py-2 border-b border-accent-brown/10 mb-2 flex items-center justify-between">
                        <span>Select Clinic Branch</span>
                        <div className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse" aria-hidden="true" />
                    </div>
                    
                    <div className="max-h-[300px] overflow-y-auto space-y-1.5 focus:outline-none">
                        {allowAllBranches && (
                            <button
                                type="button"
                                role="option"
                                aria-selected={currentBranchId === null}
                                onClick={() => {
                                    localStorage.setItem('hivet_selected_branch', 'all');
                                    onBranchChange(null);
                                    setIsOpen(false);
                                    triggerBtnRef.current?.focus();
                                }}
                                className={`w-full min-h-[48px] text-left p-3 rounded-xl transition-all flex items-center justify-between group outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                                    currentBranchId === null 
                                        ? 'bg-brand text-white shadow-md shadow-brand/20' 
                                        : 'text-accent-brown hover:bg-accent-peach/10'
                                }`}
                            >
                                <div className="flex flex-col overflow-hidden pr-3">
                                    <span className="font-bold truncate text-sm">All Branches</span>
                                    <span className={`text-xs truncate font-medium mt-0.5 ${currentBranchId === null ? 'text-white/80' : 'text-slate-600'}`}>
                                        View complete metrics
                                    </span>
                                </div>
                                {currentBranchId === null ? (
                                    <Check className="w-4 h-4 text-white shrink-0" aria-hidden="true" />
                                ) : (
                                    <span className="text-xs shrink-0 font-bold px-2 py-0.5 rounded-md bg-accent-peach/30 text-accent-brown/80">
                                        Global
                                    </span>
                                )}
                            </button>
                        )}
                        {branches.map(b => {
                            const isSelected = currentBranchId === b.id;
                            return (
                                <button
                                    key={b.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => {
                                        localStorage.setItem('hivet_selected_branch', String(b.id));
                                        onBranchChange(b.id);
                                        setIsOpen(false);
                                        triggerBtnRef.current?.focus();
                                    }}
                                    className={`w-full min-h-[48px] text-left p-3 rounded-xl transition-all flex items-center justify-between group outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                                        isSelected 
                                            ? 'bg-brand text-white shadow-md shadow-brand/20' 
                                            : 'text-accent-brown hover:bg-accent-peach/10'
                                    }`}
                                >
                                    <div className="flex flex-col overflow-hidden pr-3">
                                        <span className="font-bold truncate text-sm">{b.name}</span>
                                        <span className={`text-xs truncate font-medium mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-600'}`}>
                                            {b.city ? `${b.city} Location` : 'Clinic Branch'}
                                        </span>
                                    </div>
                                    {isSelected ? (
                                        <Check className="w-4 h-4 text-white shrink-0" aria-hidden="true" />
                                    ) : b.is_main ? (
                                        <span className="text-xs shrink-0 font-bold px-2 py-0.5 rounded-md bg-brand/10 text-brand-dark">
                                            Core
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <div className="relative w-full sm:w-[280px] md:w-[320px] lg:w-[340px]" ref={containerRef}>
            <button 
                ref={triggerBtnRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={`Branch selector: currently ${branchDisplayName}`}
                className="w-full min-h-[52px] h-[52px] flex items-center gap-3 px-3.5 sm:px-4 py-2.5 bg-white hover:bg-slate-50/70 active:scale-[0.99] rounded-[16px] transition-all shadow-sm group border border-accent-brown/15 outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
                <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand shadow-none flex items-center justify-center shrink-0" aria-hidden="true">
                    <MapPin className="w-5 h-5 text-brand" />
                </div>
                <div className="flex flex-col items-start overflow-hidden text-left flex-1 min-w-0">
                    <span className="truncate w-full font-bold text-accent-brown text-sm leading-tight">
                        {branchDisplayName}
                    </span>
                    <span className="text-xs text-slate-600 font-medium leading-tight mt-0.5 truncate w-full">
                        {branchSubLabel}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-accent-brown/70 group-hover:text-accent-brown ml-auto shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>

            {createPortal(dropdownContent, document.body)}
        </div>
    );
};

export default BranchSelector;
