import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
    scrollToTop?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    className = '',
    scrollToTop = false,
}) => {
    if (totalPages <= 1) return null;

    const handlePageClick = (page: number) => {
        if (page < 1 || page > totalPages || page === currentPage) return;
        onPageChange(page);
        if (scrollToTop && typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Keep visible pages clean on mobile (up to 5 buttons)
    const getVisiblePages = () => {
        if (totalPages <= 5) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        if (currentPage <= 3) {
            return [1, 2, 3, 4, 5];
        }
        if (currentPage >= totalPages - 2) {
            return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }
        return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
    };

    const visiblePages = getVisiblePages();

    return (
        <div className={`flex flex-col items-center justify-center gap-3 py-6 select-none ${className}`}>
            <p className="text-xs font-bold text-black text-center">
                Page <span className="text-accent-brown">{currentPage}</span> of{' '}
                <span className="text-accent-brown">{totalPages}</span>
            </p>
            <div className="flex items-center justify-center gap-1.5 xs:gap-2 max-w-full overflow-x-auto no-scrollbar py-1">
                {/* Prev Button */}
                <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => handlePageClick(currentPage - 1)}
                    className={`min-h-[44px] px-3.5 xs:px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap shrink-0 shadow-sm ${
                        currentPage === 1
                            ? 'bg-white text-slate-300 border border-slate-100 opacity-60 cursor-not-allowed'
                            : 'bg-white text-accent-brown border border-slate-200/80 hover:bg-slate-50 active:scale-95 cursor-pointer'
                    }`}
                >
                    Prev
                </button>

                {/* Numbered Page Buttons with 2-digit padding */}
                <div className="flex items-center gap-1.5 xs:gap-2 shrink-0">
                    {visiblePages.map((p) => {
                        const isActive = currentPage === p;
                        return (
                            <button
                                key={p}
                                type="button"
                                onClick={() => handlePageClick(p)}
                                aria-current={isActive ? 'page' : undefined}
                                className={`min-h-[44px] min-w-[40px] xs:min-w-[44px] px-2.5 xs:px-3 rounded-2xl font-bold text-xs transition-all shrink-0 cursor-pointer ${
                                    isActive
                                        ? 'bg-brand text-white shadow-md shadow-brand/25 scale-100'
                                        : 'bg-white text-slate-400 border border-slate-100 hover:border-brand/40 hover:text-brand active:scale-95 shadow-sm'
                                }`}
                            >
                                {p.toString().padStart(2, '0')}
                            </button>
                        );
                    })}
                </div>

                {/* Next Button */}
                <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageClick(currentPage + 1)}
                    className={`min-h-[44px] px-3.5 xs:px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap shrink-0 shadow-sm ${
                        currentPage === totalPages
                            ? 'bg-white text-slate-300 border border-slate-100 opacity-60 cursor-not-allowed'
                            : 'bg-brand text-white shadow-md shadow-brand/25 hover:bg-brand-dark active:scale-95 cursor-pointer'
                    }`}
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default Pagination;
