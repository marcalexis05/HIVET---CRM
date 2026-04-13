import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Wallet, User } from 'lucide-react';

const RiderBottomNav = () => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-accent-brown border-t border-white/5 z-[100] h-24 sm:hidden shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-around h-full px-6">
                <NavLink 
                    to="/dashboard/rider" 
                    end
                    className={({ isActive }) => `flex flex-col items-center gap-2 transition-all duration-500 ${isActive ? 'text-brand scale-110 drop-shadow-[0_0_10px_rgba(255,159,28,0.5)]' : 'text-white/20 hover:text-white/40'}`}
                >
                    {({ isActive }) => (
                        <>
                            <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-white/5' : ''}`}>
                                <LayoutDashboard size={22} className={isActive ? 'fill-current' : ''} />
                            </div>
                            <span className="text-[11px] font-bold leading-none">Ops</span>
                        </>
                    )}
                </NavLink>

                <NavLink 
                    to="/dashboard/rider/orders" 
                    className={({ isActive }) => `flex flex-col items-center gap-2 transition-all duration-500 ${isActive ? 'text-brand scale-110 drop-shadow-[0_0_10px_rgba(255,159,28,0.5)]' : 'text-white/20 hover:text-white/40'}`}
                >
                    {({ isActive }) => (
                        <>
                            <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-white/5' : ''}`}>
                                <ShoppingBag size={22} className={isActive ? 'fill-brand' : ''} />
                            </div>
                            <span className="text-[11px] font-bold leading-none">Logs</span>
                        </>
                    )}
                </NavLink>

                <NavLink 
                    to="/dashboard/rider/earnings" 
                    className={({ isActive }) => `flex flex-col items-center gap-2 transition-all duration-500 ${isActive ? 'text-brand scale-110 drop-shadow-[0_0_10px_rgba(255,159,28,0.5)]' : 'text-white/20 hover:text-white/40'}`}
                >
                    {({ isActive }) => (
                        <>
                            <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-white/5' : ''}`}>
                                <Wallet size={22} className={isActive ? 'fill-brand' : ''} />
                            </div>
                            <span className="text-[11px] font-bold leading-none">Vault</span>
                        </>
                    )}
                </NavLink>

                <NavLink 
                    to="/dashboard/rider/account" 
                    className={({ isActive }) => `flex flex-col items-center gap-2 transition-all duration-500 ${isActive ? 'text-brand scale-110 drop-shadow-[0_0_10px_rgba(255,159,28,0.5)]' : 'text-white/20 hover:text-white/40'}`}
                >
                    {({ isActive }) => (
                        <>
                            <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-white/5' : ''}`}>
                                <User size={22} className={isActive ? 'fill-brand' : ''} />
                            </div>
                            <span className="text-[11px] font-bold leading-none">Agent</span>
                        </>
                    )}
                </NavLink>
            </div>
            
            {/* Safe Area Spacer for iOS */}
            <div className="h-safe-bottom bg-transparent" />
        </nav>
    );
};

export default RiderBottomNav;
