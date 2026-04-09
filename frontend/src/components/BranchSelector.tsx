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
                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-accent-peach/30 rounded-xl sm:rounded-2xl border border-accent-brown/5 shadow-sm hover:border-brand/30 hover:bg-white transition-all text-[9px] sm:text-[10px] font-black text-accent-brown uppercase tracking-widest whitespace-nowrap min-w-[140px] sm:min-w-[180px]"
            >
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-brand-dark" />
                </div>
                <div className="flex flex-col items-start overflow-hidden text-left">
                    <span className="truncate w-full font-black">
                        {currentBranchId === null && allowAllBranches ? 'All Branches' : currentBranch ? currentBranch.name : 'Selecting Branch...'}
                    </span>
                    <span className="text-[7px] sm:text-[8px] opacity-40 truncate w-full font-bold leading-none mt-0.5">
                        {currentBranchId === null && allowAllBranches ? 'Aggregate View' : currentBranch ? `${currentBranch.barangay}, ${currentBranch.city}` : 'Branch Selection'}
                    </span>
                </div>
                <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-accent-brown/30 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 sm:mt-3 w-72 sm:w-80 bg-white rounded-3xl sm:rounded-[2rem] shadow-2xl border border-accent-brown/5 p-2 sm:p-3 z-[150] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-accent-brown/30 px-3 sm:px-4 py-2">Switch Active Branch</div>
                    
                    <div className="max-h-[250px] sm:max-h-[300px] overflow-y-auto no-scrollbar space-y-1 p-0.5 sm:p-1">
                        {allowAllBranches && (
                            <button
                                type="button"
                                onClick={() => {
                                    localStorage.setItem('hivet_selected_branch', 'all');
                                    onBranchChange(null);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-3 sm:px-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-between group ${currentBranchId === null ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-accent-brown hover:bg-accent-peach/10 bg-accent-peach/5 mb-1'}`}
                            >
                                <div className="flex flex-col overflow-hidden pr-3 sm:pr-4">
                                    <span className="font-black truncate uppercase tracking-widest text-[9px] sm:text-[10px]">All Branches</span>
                                    <span className={`text-[7px] sm:text-[8px] truncate font-bold ${currentBranchId === null ? 'text-white/60' : 'text-accent-brown/40'}`}>
                                        Aggregate View
                                    </span>
                                </div>
                                <span className={`text-[7px] sm:text-[8px] uppercase tracking-tighter shrink-0 font-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg ${currentBranchId === null ? 'bg-white/20 text-white' : 'bg-brand/10 text-brand-dark'}`}>
                                    Total
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
                                className={`w-full text-left px-3 sm:px-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-between group ${currentBranchId === b.id ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-accent-brown hover:bg-accent-peach/10 bg-accent-peach/5 mb-1'}`}
                            >
                                <div className="flex flex-col overflow-hidden pr-3 sm:pr-4">
                                    <span className="font-black truncate uppercase tracking-widest text-[9px] sm:text-[10px]">{b.name}</span>
                                    <span className={`text-[7px] sm:text-[8px] truncate font-bold ${currentBranchId === b.id ? 'text-white/60' : 'text-accent-brown/40'}`}>
                                        {b.barangay}, {b.city}
                                    </span>
                                </div>
                                {b.is_main && (
                                    <span className={`text-[7px] sm:text-[8px] uppercase tracking-tighter shrink-0 font-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg ${currentBranchId === b.id ? 'bg-white/20 text-white' : 'bg-brand/10 text-brand-dark'}`}>
                                        Main
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
