import React from 'react';

export const ShopIcon = ({ className = "", size = 24 }: { className?: string, size?: number }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Main Structure Frame */}
            <rect x="10" y="20" width="80" height="60" rx="4" stroke="#2D2422" strokeWidth="4" fill="white" />
            
            {/* Awning Section */}
            <g clipPath="url(#awningClip)">
                <rect x="10" y="20" width="80" height="25" fill="#2D2422" />
                <rect x="10" y="20" width="16" height="25" fill="#F26B21" />
                <rect x="26" y="20" width="16" height="25" fill="white" />
                <rect x="42" y="20" width="16" height="25" fill="#F26B21" />
                <rect x="58" y="20" width="16" height="25" fill="white" />
                <rect x="74" y="20" width="16" height="25" fill="#F26B21" />
            </g>
            <rect x="10" y="20" width="80" height="25" rx="4" stroke="#2D2422" strokeWidth="4" fill="transparent" />

            {/* Door/Window Separator */}
            <line x1="35" y1="45" x2="35" y2="80" stroke="#2D2422" strokeWidth="4" />
            
            <defs>
                <clipPath id="awningClip">
                    <rect x="10" y="20" width="80" height="25" rx="4" />
                </clipPath>
            </defs>
        </svg>
    );
};
