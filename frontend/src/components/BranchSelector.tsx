import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';

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

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const resp = await fetch('http://localhost:8000/api/business/branches', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await resp.json();
                setBranches(data);
                
                // Auto-select saved branch or fall back to Main branch
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

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentBranch = branches.find(b => b.id === currentBranchId);

    if (branches.length === 0) return null;

    return (
        <div className="relative" ref={containerRef}>
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 bg-white hover:opacity-90 active:scale-95 rounded-2xl transition-all shadow-xl shadow-black/10 min-w-[160px] sm:min-w-[200px] font-brand group border border-accent-brown/5"
            >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-brand/10 shadow-sm flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-brand" />
                </div>
                <div className="flex flex-col items-start overflow-hidden text-left">
                    <span className="truncate w-full font-black text-black text-[10px] sm:text-[11px] uppercase tracking-widest">
                        {currentBranchId === null && allowAllBranches ? 'All Branches' : currentBranch ? currentBranch.name : 'Initializing...'}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-black/50 font-black uppercase tracking-widest leading-none mt-1">
                        {currentBranchId === null && allowAllBranches ? 'Global System' : currentBranch ? `${currentBranch.city}` : 'Branch Discovery'}
                    </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-black/30 group-hover:text-black ml-auto transition-transform duration-500 ${isOpen ? 'rotate-180 text-black' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-4 w-72 sm:w-80 bg-white rounded-[2.5rem] shadow-2xl shadow-accent-brown/10 border border-accent-peach/10 p-4 z-[150] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="text-[9px] font-black uppercase tracking-[0.25em] text-black px-4 py-3 border-b border-accent-peach/10 mb-3">Select Clinic Branch</div>
                    
                    <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-2">
                        {allowAllBranches && (
                            <button
                                type="button"
                                onClick={() => {
                                    localStorage.setItem('hivet_selected_branch', 'all');
                                    onBranchChange(null);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group ${currentBranchId === null ? 'bg-brand text-white shadow-xl shadow-brand/20' : 'text-black hover:bg-accent-peach/10'}`}
                            >
                                <div className="flex flex-col overflow-hidden pr-4">
                                    <span className="font-black truncate uppercase tracking-widest text-[10px]">All Branches</span>
                                    <span className={`text-[8px] truncate font-black uppercase tracking-widest mt-1 ${currentBranchId === null ? 'text-white/40' : 'text-black'}`}>
                                        View complete metrics
                                    </span>
                                </div>
                                <span className={`text-[8px] uppercase tracking-widest shrink-0 font-black px-2 py-1 rounded-lg ${currentBranchId === null ? 'bg-white/10 text-white' : 'bg-accent-peach/30 text-accent-brown/40'}`}>
                                    Global
                                </span>
                            </button>
                        )}
                        {branches.map(b => (
                            <button
                                key={b.id}
                                type="button"
                                onClick={() => {
                                    localStorage.setItem('hivet_selected_branch', String(b.id));
                                    onBranchChange(b.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group ${currentBranchId === b.id ? 'bg-brand text-white shadow-xl shadow-brand/20' : 'text-black hover:bg-accent-peach/10'}`}
                            >
                                <div className="flex flex-col overflow-hidden pr-4">
                                    <span className="font-black truncate uppercase tracking-widest text-[10px]">{b.name}</span>
                                    <span className={`text-[8px] truncate font-black uppercase tracking-widest mt-1 ${currentBranchId === b.id ? 'text-white/40' : 'text-black'}`}>
                                        {b.city} Location
                                    </span>
                                </div>
                                {b.is_main && (
                                    <span className={`text-[8px] uppercase tracking-widest shrink-0 font-black px-2 py-1 rounded-lg ${currentBranchId === b.id ? 'bg-white/10 text-white' : 'bg-brand/10 text-brand-dark'}`}>
                                        Core
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BranchSelector;
