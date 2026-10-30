export const AdminFooter = ({ className = '' }: { className?: string }) => (
    <footer className={`footer-admin border-t border-slate-200 bg-white px-4 py-4 text-xs text-slate-500 sm:px-6 lg:px-8 ${className}`}>
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-2">
            <p>© {new Date().getFullYear()} Hi-Vet. All rights reserved.</p>
            <p>Admin dashboard</p>
        </div>
    </footer>
);
