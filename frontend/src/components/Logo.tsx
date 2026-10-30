export const Logo = ({ className = "" }: { className?: string }) => (
    <img
        src="/branding/icon-192.png"
        srcSet="/branding/icon-192.png 192w, /branding/icon-512.png 512w, /branding/hivet-logo.png 1254w"
        sizes="128px"
        alt="Hi-Vet"
        width={1254}
        height={1254}
        className={`object-contain ${className}`}
        decoding="async"
        draggable={false}
    />
);
