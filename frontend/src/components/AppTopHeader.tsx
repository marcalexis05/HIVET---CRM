import React, { useEffect, useRef, useState } from 'react';

/**
 * Shared top header shell for the Customer, Rider and Clinic Business apps.
 *
 * Phones / tablets (< 1024px):
 *  - At the top of the page the header is fully transparent (no background,
 *    no border, no shadow, no blur) so its items sit directly on the page.
 *  - After the page scrolls past 16px it turns solid using the SAME color as
 *    the page background, with a thin bottom line and a very soft shadow.
 *    It turns transparent again below 8px (hysteresis, so it never flickers).
 *  - The change fades over 200ms; with reduced motion it switches at once.
 *
 * Desktop (>= 1024px): keeps the original white header look unchanged.
 */

const SCROLL_ON_PX = 16;
const SCROLL_OFF_PX = 8;

export const useHeaderScrolled = () => {
    const initial = typeof window !== 'undefined' && window.scrollY > SCROLL_ON_PX;
    const [scrolled, setScrolled] = useState(initial);
    const scrolledRef = useRef(initial);

    useEffect(() => {
        let frame = 0;

        const update = () => {
            frame = 0;
            const y = window.scrollY;
            const next = scrolledRef.current ? y > SCROLL_OFF_PX : y > SCROLL_ON_PX;
            if (next !== scrolledRef.current) {
                scrolledRef.current = next;
                setScrolled(next);
            }
        };

        const onScroll = () => {
            if (!frame) frame = window.requestAnimationFrame(update);
        };

        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, []);

    return scrolled;
};

/**
 * Which page background the header sits on.
 *  - 'portal':   Clinic Business and Rider pages (#FAF9F6).
 *  - 'customer': Customer pages (bg-accent-peach/20 over #FAF9F6, which renders as #FBF7EF).
 */
type HeaderSurface = 'portal' | 'customer';

interface AppTopHeaderProps {
    as?: 'header' | 'nav';
    position: 'sticky' | 'fixed';
    surface: HeaderSurface;
    /** Layout-only classes (height, padding, flex). */
    className?: string;
    role?: string;
    children: React.ReactNode;
}

const POSITION_CLASSES: Record<AppTopHeaderProps['position'], string> = {
    sticky: 'sticky top-0 z-40',
    fixed: 'fixed top-0 left-0 right-0 z-50',
};

const SOLID_MOBILE_CLASSES: Record<HeaderSurface, string> = {
    portal: 'bg-[#FAF9F6] border-accent-brown/10 shadow-[0_1px_3px_rgba(61,43,31,0.06)]',
    customer: 'bg-[#FBF7EF] border-accent-brown/10 shadow-[0_1px_3px_rgba(61,43,31,0.06)]',
};

const DESKTOP_CLASSES: Record<HeaderSurface, string> = {
    portal: 'lg:bg-white lg:border-accent-brown/5 lg:shadow-xs',
    customer: 'lg:bg-white lg:border-accent-brown/5 lg:shadow-xl lg:shadow-accent-brown/5',
};

export const AppTopHeader: React.FC<AppTopHeaderProps> = ({
    as = 'header',
    position,
    surface,
    className = '',
    role,
    children,
}) => {
    const scrolled = useHeaderScrolled();
    const Tag = as;

    const mobileState = scrolled
        ? SOLID_MOBILE_CLASSES[surface]
        : 'bg-transparent border-transparent shadow-none';

    return (
        <Tag
            role={role}
            data-scrolled={scrolled ? 'true' : 'false'}
            className={`${POSITION_CLASSES[position]} border-b ${mobileState} ${DESKTOP_CLASSES[surface]} transition-[background-color,border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none ${className}`}
        >
            {children}
        </Tag>
    );
};

export default AppTopHeader;
