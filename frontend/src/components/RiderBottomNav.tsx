import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ShoppingBag, Wallet, User } from 'lucide-react';
import { RIDER_TEXT } from '../constants/riderWording';

const RiderBottomNav: React.FC = () => {
    const navItems = [
        { name: RIDER_TEXT.nav.home, path: '/dashboard/rider', end: true, icon: Home },
        { name: RIDER_TEXT.nav.history, path: '/dashboard/rider/orders', end: false, icon: ShoppingBag },
        { name: RIDER_TEXT.nav.earnings, path: '/dashboard/rider/earnings', end: false, icon: Wallet },
        { name: RIDER_TEXT.nav.profile, path: '/dashboard/rider/account', end: false, icon: User },
    ];

    return (
        <nav
            aria-label="Rider Mobile Bottom Navigation"
            className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-accent-brown/10 shadow-[0_-10px_25px_rgba(0,0,0,0.06)] h-16 px-2 pb-[env(safe-area-inset-bottom,0px)]"
        >
            <div className="flex items-center justify-around h-full max-w-lg mx-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        end={item.end}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-all group select-none ${
                                isActive ? 'text-brand-dark' : 'text-black hover:text-brand-dark'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div
                                    className={`p-1.5 rounded-xl transition-all ${
                                        isActive ? 'bg-brand-dark/10 scale-105' : 'group-hover:scale-105'
                                    }`}
                                >
                                    <item.icon
                                        className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`}
                                    />
                                </div>
                                <span
                                    className={`text-xs leading-none mt-0.5 ${
                                        isActive ? 'font-black text-brand-dark' : 'font-bold text-black group-hover:text-brand-dark'
                                    }`}
                                >
                                    {item.name}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default RiderBottomNav;
