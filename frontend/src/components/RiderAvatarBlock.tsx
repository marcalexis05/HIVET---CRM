import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatName } from '../utils/textFormatters';
import { RIDER_TEXT } from '../constants/riderWording';

interface RiderAvatarBlockProps {
    className?: string;
    maxTextWidth?: string;
}

export const RiderAvatarBlock: React.FC<RiderAvatarBlockProps> = ({
    className = '',
    maxTextWidth = 'max-w-[180px] xs:max-w-[240px] sm:max-w-[320px]'
}) => {
    const { user } = useAuth();
    const [imgError, setImgError] = useState(false);

    const riderName = user?.name || 'Rider';
    const vehicle = user?.vehicle_type;
    const subtitle = vehicle
        ? `${vehicle} • ${RIDER_TEXT.profile.portalBadge}`
        : RIDER_TEXT.profile.portalBadge;

    const getInitials = (name: string) => {
        if (!name) return 'RD';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[1][0]).toUpperCase();
    };

    const hasAvatar = !!user?.avatar && !imgError;

    return (
        <Link
            to="/dashboard/rider/account"
            className={`flex items-center gap-3 shrink min-w-0 group transition-all rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand select-none ${className}`}
            aria-label={`Profile, ${riderName}`}
            title={`Profile, ${riderName}`}
        >
            {/* Avatar circle: 40px to 44px with thin orange ring and small white gap */}
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full p-[2px] border-2 border-brand/40 bg-white group-hover:border-brand shadow-sm transition-all shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-accent-peach/25 text-accent-brown font-black text-xs sm:text-sm">
                    {hasAvatar ? (
                        <img
                            src={user?.avatar}
                            alt=""
                            className="w-full h-full object-cover rounded-full"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <span>{getInitials(riderName)}</span>
                    )}
                </div>
            </div>

            {/* Rider Name and Subtitle */}
            <div className={`flex flex-col min-w-0 justify-center ${maxTextWidth}`}>
                <h2 className="text-sm sm:text-base font-black text-accent-brown tracking-tight leading-tight truncate group-hover:text-brand-dark transition-colors">
                    {formatName(riderName)}
                </h2>
                {subtitle && (
                    <p className="text-xs font-medium text-slate-600 truncate leading-snug mt-0.5">
                        {subtitle}
                    </p>
                )}
            </div>
        </Link>
    );
};

export default RiderAvatarBlock;
