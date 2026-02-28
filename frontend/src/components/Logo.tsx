export const Logo = ({ className = "" }: { className?: string }) => {
    return (
        <svg
            viewBox="0 0 100 100"
            className={className}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Paw 1 (Top Right) */}
            <g transform="translate(45, 10) scale(0.45)">
                {/* Main Pad */}
                <path
                    d="M50 85C40 85 25 75 25 60C25 45 35 35 50 35C65 35 75 45 75 60C75 75 60 85 50 85Z"
                    fill="#A0522D"
                />
                <path
                    d="M50 78C44 78 35 72 35 63C35 54 41 50 50 50C59 50 65 54 65 63C65 72 56 78 50 78Z"
                    fill="#8B4513"
                />
                {/* Toes */}
                <circle cx="20" cy="40" r="12" fill="#8B4513" />
                <circle cx="40" cy="22" r="12" fill="#8B4513" />
                <circle cx="68" cy="22" r="12" fill="#8B4513" />
                <circle cx="88" cy="40" r="12" fill="#8B4513" />
            </g>

            {/* Paw 2 (Bottom Left) */}
            <g transform="translate(5, 45) scale(0.45)">
                {/* Main Pad */}
                <path
                    d="M50 85C40 85 25 75 25 60C25 45 35 35 50 35C65 35 75 45 75 60C75 75 60 85 50 85Z"
                    fill="#A0522D"
                />
                <path
                    d="M50 78C44 78 35 72 35 63C35 54 41 50 50 50C59 50 65 54 65 63C65 72 56 78 50 78Z"
                    fill="#8B4513"
                />
                {/* Toes */}
                <circle cx="20" cy="40" r="12" fill="#8B4513" />
                <circle cx="40" cy="22" r="12" fill="#8B4513" />
                <circle cx="68" cy="22" r="12" fill="#8B4513" />
                <circle cx="88" cy="40" r="12" fill="#8B4513" />
            </g>
        </svg>
    );
};
