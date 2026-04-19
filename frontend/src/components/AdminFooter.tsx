import React from 'react';
import { Shield, Activity } from 'lucide-react';

export const AdminFooter = () => {
    return (
        <footer className="footer-admin px-10 py-8 border-t border-white/5 bg-[#0A0A0A] text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-col gap-1 text-center md:text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 leading-none">
                        © 2026 HI-VET ARCHITECTURE | CORE SYSTEMS ENGINE
                    </p>
                    <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/30">
                        Proprietary Infrastructure . Strategic Veterinary Logistics
                    </p>
                </div>

                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Activity className="w-3 h-3 text-brand" />
                            <span className="absolute inset-0 bg-brand rounded-full animate-ping opacity-20" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/70">Network: Live</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <Shield className="w-3 h-3 text-white/30" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/70">Protocol: AES-256 Verified</span>
                    </div>
                    
                    <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                        <span className="text-[8px] font-black uppercase tracking-widest text-brand leading-none">v2.4.0-STABLE</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};
