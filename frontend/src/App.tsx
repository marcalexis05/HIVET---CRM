import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { CatalogPreview } from './components/CatalogPreview';
import { ReservationsSection } from './components/ReservationsSection';
import { LoyaltySection } from './components/LoyaltySection';
import { AboutSection } from './components/AboutSection';
import { Logo } from './components/Logo';
import { ShoppingCart, Menu, X, Home, ShoppingBag, Package, Award, Info, Zap, LayoutGrid, Shield, Sparkles, FileText } from 'lucide-react';
import { setPwaManifestForRole } from './utils/pwaManager';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Catalog from './pages/Catalog';
import ScrollToTop from './components/ScrollToTop';
import { Footer } from './components/Footer';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { CartProvider, useCart } from './context/CartContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import AdminBusinesses from './pages/dashboard/AdminBusinesses';
import AdminClinicCompliance from './pages/dashboard/AdminClinicCompliance';
import AdminRiderCompliance from './pages/dashboard/AdminRiderCompliance';
import AdminRiders from './pages/dashboard/AdminRiders';
import AdminCustomerRecords from './pages/dashboard/AdminCustomerRecords';
import AdminCustomers from './pages/dashboard/AdminCustomers';
import AdminAlerts from './pages/dashboard/AdminAlerts';
import CustomerDashboard from './pages/dashboard/CustomerDashboard';
import CustomerCatalog from './pages/dashboard/CustomerCatalog';
import ProductDetail from './pages/dashboard/ProductDetail';
import CustomerReservations from './pages/dashboard/CustomerReservations';
import CustomerLoyalty from './pages/dashboard/CustomerLoyalty';
import CustomerAlerts from './pages/dashboard/CustomerAlerts';
import CustomerOrders from './pages/dashboard/CustomerOrdersList';
import Checkout from './pages/dashboard/Checkout';
import ClinicMap from './pages/dashboard/ClinicMap';
import PaymentSuccess from './pages/dashboard/PaymentSuccess';
import ReservationCheckout from './pages/dashboard/ReservationCheckout';
import ReservationPaymentSuccess from './pages/dashboard/ReservationPaymentSuccess';
import BusinessDashboard from './pages/dashboard/BusinessDashboard';
import BusinessOrders from './pages/dashboard/BusinessOrders';
import BusinessCatalog from './pages/dashboard/BusinessCatalog';
import BusinessAnalytics from './pages/dashboard/BusinessAnalytics';
import BusinessReservations from './pages/dashboard/BusinessReservations';
import BusinessProductEditor from './pages/dashboard/BusinessProductEditor';
import AccountSettings from './pages/dashboard/AccountSettings';
import GoogleCallback from './pages/GoogleCallback';
import BusinessLanding from './pages/BusinessLanding';
import { CLINIC_LANDING_TEXT } from './constants/clinicLandingWording';
import { MAIN_LANDING_TEXT } from './constants/mainLandingWording';
import { RIDER_LANDING_TEXT } from './constants/riderLandingWording';
import BusinessLogin from './pages/BusinessLogin';
import BusinessRegister from './pages/BusinessRegister';
import RiderLanding from './pages/RiderLanding';
import RiderLogin from './pages/RiderLogin';
import RiderRegister from './pages/RiderRegister';
import RiderDashboard from './pages/dashboard/RiderDashboard';
import RiderOrders from './pages/dashboard/RiderOrders';
import RiderEarnings from './pages/dashboard/RiderEarnings';
import RiderAlerts from './pages/dashboard/RiderAlerts';

function Navigation() {
  const { user } = useAuth();
  const { requestCartAccess } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const isDarkHeroPage = ['/', '/for-clinics', '/for-riders'].includes(location.pathname);
      // Stay transparent while anywhere inside the full-screen cinematic hero (100dvh).
      // Only transition to solid white once the hero scrolls out of view.
      const threshold = isDarkHeroPage ? Math.max(window.innerHeight - 90, 300) : 30;
      setIsScrolled(window.scrollY > threshold);
      setHasScrolled(window.scrollY > 12);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [location.pathname]);

  // Back button, Escape, Resize, and Body Scroll Lock
  useEffect(() => {
    if (!isMenuOpen) return;

    // Push state so back button closes the menu without leaving the page
    window.history.pushState({ mobileMenu: true }, '');

    const handlePopState = () => {
      setIsMenuOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the first link
    const focusTimer = setTimeout(() => {
      firstLinkRef.current?.focus();
    }, 60);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      document.body.style.overflow = prevOverflow;
      clearTimeout(focusTimer);
      menuButtonRef.current?.focus();
    };
  }, [isMenuOpen]);

  useEffect(() => {
    document.title = 'Hi-Vet';
    if (location.pathname.startsWith('/dashboard/business') || location.pathname.startsWith('/login/business') || location.pathname === '/for-clinics' || location.pathname.startsWith('/register/business')) {
      setPwaManifestForRole('business');
    } else if (location.pathname.startsWith('/dashboard/rider') || location.pathname.startsWith('/login/rider') || location.pathname === '/for-riders' || location.pathname.startsWith('/register/rider')) {
      setPwaManifestForRole('rider');
    } else {
      setPwaManifestForRole('customer');
    }
  }, [location.pathname]);

  // Hide public navbar on auth pages and dashboard portals
  const shouldShowNavbar = !['/login', '/login/business', '/login/rider', '/register', '/register/business', '/register/rider', '/forgot-password', '/catalog'].includes(location.pathname) && !location.pathname.startsWith('/dashboard') && !location.pathname.startsWith('/catalog/') && location.pathname !== '/login/admin';

  if (!shouldShowNavbar) return null;

  const isBusinessLanding = location.pathname === '/for-clinics';
  const isRiderLanding = location.pathname === '/for-riders';
  const isHome = location.pathname === '/';
  const homeHref = '/';
  
  // Dynamic Styles based on scroll and page
  const isTransparent = (isHome || isBusinessLanding || isRiderLanding) && !isScrolled && !isMenuOpen;
  const navBackground = isTransparent ? 'bg-transparent' : 'bg-white border-b border-accent-brown/5 shadow-[0_20px_50px_rgba(45,34,27,0.1)] rounded-b-[2.5rem]';
  const textColor = isTransparent ? 'text-white' : 'text-accent-brown';
  const linkColor = isTransparent ? 'text-white/70' : 'text-accent-brown/60';

  const handleHomeClick = (e: React.MouseEvent) => {
    const heroId = isBusinessLanding ? 'features' : isRiderLanding ? 'benefits' : null;
    const hero = heroId ? document.getElementById(heroId) : null;
    const headerBottom = e.currentTarget.closest('nav')?.getBoundingClientRect().bottom || 0;
    const sectionOffset = Math.max(headerBottom, parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0);
    const belowRoleHero = hero !== null && hero.getBoundingClientRect().bottom <= sectionOffset + 1;
    if (isHome || belowRoleHero) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setIsMenuOpen(false);
    if (location.pathname === '/' || href.startsWith('#')) {
      const targetId = href.replace('/#', '').replace('#', '');
      const elem = document.getElementById(targetId);
      if (elem) {
        e.preventDefault();
        elem.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const menuItems = isBusinessLanding ? [
    { name: CLINIC_LANDING_TEXT.nav.features, href: '#features', type: 'anchor', icon: Zap },
    { name: CLINIC_LANDING_TEXT.nav.clinicTools, href: '#capabilities', type: 'anchor', icon: LayoutGrid },
    { name: CLINIC_LANDING_TEXT.nav.safety, href: '#security', type: 'anchor', icon: Shield }
  ] : isRiderLanding ? [
    { name: RIDER_LANDING_TEXT.nav.benefits, href: '#benefits', type: 'anchor', icon: Award },
    { name: RIDER_LANDING_TEXT.nav.rewards, href: '#perks', type: 'anchor', icon: Sparkles },
    { name: RIDER_LANDING_TEXT.nav.whatYouNeed, href: '#requirements', type: 'anchor', icon: FileText }
  ] : [
    { name: MAIN_LANDING_TEXT.nav.home, href: '/', type: 'link', icon: Home },
    { name: MAIN_LANDING_TEXT.nav.store, href: '/catalog', type: 'link', icon: ShoppingBag },
    { name: MAIN_LANDING_TEXT.nav.orders, href: '/#orders', type: 'anchor', icon: Package },
    { name: MAIN_LANDING_TEXT.nav.rewards, href: '/#loyalty', type: 'anchor', icon: Award },
    { name: MAIN_LANDING_TEXT.nav.about, href: '/#about', type: 'anchor', icon: Info },
  ];

  const isItemActive = (item: { href: string; type: string }) => {
    if (item.href === '/') {
      return location.pathname === '/' && !location.hash;
    }
    if (item.type === 'link') {
      return location.pathname === item.href;
    }
    if (item.type === 'anchor') {
      const hash = item.href.replace('/', '');
      return location.hash === hash;
    }
    return false;
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 pt-[env(safe-area-inset-top,0px)] ${isTransparent ? 'bg-gradient-to-b from-black/60 via-black/25 to-transparent pb-3 sm:pb-4' : isMenuOpen ? 'bg-white' : 'bg-white border-b border-accent-brown/5 shadow-[0_20px_50px_rgba(45,34,27,0.1)] rounded-b-[2rem] sm:rounded-b-[2.5rem]'}`}>
      {/* Blur the backdrop layer without changing the containing block of fixed dialogs. */}
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-10 bg-black/25 backdrop-blur-xl transition-opacity duration-300 ${isTransparent && hasScrolled ? 'opacity-100' : 'opacity-0'}`} />
      <div className="w-full transition-all duration-500 flex items-center justify-between gap-4 lg:gap-6 px-6 sm:px-12 h-16 sm:h-20">
        <div className="shrink-0 flex justify-start lg:flex-1 min-w-0">
          <Link to={homeHref} aria-label="Hi-Vet home" className="flex items-center gap-2.5 xs:gap-3.5 group" onClick={handleHomeClick}>
            <Logo className="w-14 h-14 sm:w-[4.5rem] sm:h-[4.5rem] shrink-0 group-hover:scale-105 transition-transform" />
          </Link>
        </div>

        <div className={`hidden lg:flex shrink-0 justify-center items-center gap-4 xl:gap-7 font-bold text-xs xl:text-sm uppercase tracking-wide whitespace-nowrap ${linkColor}`}>
          {isBusinessLanding ? (
            <>
              <a href="#features" className="hover:text-brand-dark transition-colors">{CLINIC_LANDING_TEXT.nav.features}</a>
              <a href="#capabilities" className="hover:text-brand-dark transition-colors">{CLINIC_LANDING_TEXT.nav.clinicTools}</a>
              <a href="#security" className="hover:text-brand-dark transition-colors">{CLINIC_LANDING_TEXT.nav.safety}</a>
            </>
          ) : isRiderLanding ? (
            <>
              <a href="#benefits" className="hover:text-brand-dark transition-colors">{RIDER_LANDING_TEXT.nav.benefits}</a>
              <a href="#perks" className="hover:text-brand-dark transition-colors">{RIDER_LANDING_TEXT.nav.rewards}</a>
              <a href="#requirements" className="hover:text-brand-dark transition-colors">{RIDER_LANDING_TEXT.nav.whatYouNeed}</a>
            </>
          ) : (
            <>
              <Link to="/" className="hover:text-brand-dark transition-colors" onClick={handleHomeClick}>{MAIN_LANDING_TEXT.nav.home}</Link>
              <Link to="/catalog" className="hover:text-brand-dark transition-colors">{MAIN_LANDING_TEXT.nav.store}</Link>
              <a href="/#orders" className="hover:text-brand-dark transition-colors">{MAIN_LANDING_TEXT.nav.orders}</a>
              <a href="/#loyalty" className="hover:text-brand-dark transition-colors">{MAIN_LANDING_TEXT.nav.rewards}</a>
              <a href="/#about" className="hover:text-brand-dark transition-colors">{MAIN_LANDING_TEXT.nav.about}</a>
            </>
          )}
        </div>

        <div className="ml-auto lg:ml-0 shrink-0 flex items-center justify-end gap-3 xl:gap-5 whitespace-nowrap lg:flex-1 min-w-max">
          {!isBusinessLanding && !isRiderLanding && (
            <>
              <Link to={user?.role === 'customer' ? '/dashboard/customer/checkout' : '/login'} onClick={e => { if (!requestCartAccess()) e.preventDefault(); }} aria-label="Shopping cart" className={`relative p-2 transition-all ${isTransparent ? 'text-white/70 hover:text-white' : 'text-accent-brown/60 hover:text-brand'}`}>
                <ShoppingCart className="w-5 h-5 xs:w-6 xs:h-6" />
              </Link>
              <div className={`h-8 w-[1px] mx-2 hidden lg:block ${isTransparent ? 'bg-white/20' : 'bg-accent-brown/10'}`}></div>
            </>
          )}

          {isBusinessLanding ? (
            <div className="hidden md:flex items-center gap-3 xl:gap-5">
              <Link to="/login/business" className={`text-xs xs:text-sm font-bold transition-colors uppercase tracking-widest ${isTransparent ? 'text-white/80 hover:text-white' : 'text-accent-brown/80 hover:text-brand'}`}>
                {CLINIC_LANDING_TEXT.nav.loginBtn}
              </Link>
              <Link to="/register/business" className="bg-brand-dark text-white hover:bg-brand px-5 xl:px-7 py-3 rounded-full text-[10px] xs:text-xs font-bold transition-colors uppercase tracking-widest shadow-md">
                {CLINIC_LANDING_TEXT.nav.registerBtn}
              </Link>
            </div>
          ) : isRiderLanding ? (
            <div className="hidden md:flex items-center gap-3 xl:gap-5">
              <Link to="/login/rider" className={`text-xs xs:text-sm font-bold transition-colors uppercase tracking-widest ${isTransparent ? 'text-white/80 hover:text-white' : 'text-accent-brown/80 hover:text-brand'}`}>
                {RIDER_LANDING_TEXT.nav.loginBtn}
              </Link>
              <Link to="/register/rider" className="bg-brand-dark text-white hover:bg-brand px-5 xl:px-7 py-3 rounded-full text-[10px] xs:text-xs font-bold transition-colors uppercase tracking-widest shadow-md">
                {RIDER_LANDING_TEXT.nav.registerBtn}
              </Link>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-6">
              <Link to="/login" className={`text-xs xs:text-sm font-bold transition-colors uppercase tracking-widest ${isTransparent ? 'text-white/70 hover:text-white' : 'text-accent-brown/60 hover:text-brand'}`}>
                {MAIN_LANDING_TEXT.nav.loginBtn}
              </Link>
              <Link to="/register" className="btn-primary !px-6 xs:!px-8 !py-2.5 xs:!py-3 !text-[10px] xs:!text-xs !rounded-full">
                {MAIN_LANDING_TEXT.nav.registerBtn}
              </Link>
            </div>
          )}

          <button
            ref={menuButtonRef}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation-menu"
            className={`lg:hidden w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all ${isTransparent ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-accent-peach/50 text-accent-brown hover:bg-brand/20'}`}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Light Backdrop with NO blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.1 : 0.2 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 top-[calc(4rem+env(safe-area-inset-top,0px))] sm:top-[calc(5rem+env(safe-area-inset-top,0px))] bg-black/[0.08] z-40 lg:hidden"
              aria-hidden="true"
            />

            {/* Compact Dropdown Panel directly below header */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
              transition={{ duration: shouldReduceMotion ? 0.1 : 0.22, ease: [0.16, 1, 0.3, 1] }}
              id="mobile-navigation-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation"
              className="absolute top-full left-0 right-0 z-50 lg:hidden pointer-events-none"
            >
              <div className="w-full bg-white rounded-b-[2rem] sm:rounded-b-[2.5rem] shadow-[0_20px_40px_rgba(45,34,27,0.14)] border-x border-b border-accent-brown/10 overflow-hidden pointer-events-auto flex flex-col max-h-[calc(85vh-5rem)]">
                {/* Scrollable links list */}
                <div className="overflow-y-auto divide-y divide-slate-100 py-1">
                  {menuItems.map((item, idx) => {
                    const active = isItemActive(item);
                    const linkContent = (
                      <div className={`flex items-center gap-3.5 px-4 py-3 min-h-[52px] transition-all group ${
                        active ? 'bg-brand/5 text-brand' : 'hover:bg-slate-50 text-accent-brown'
                      }`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          active ? 'bg-brand/10 text-brand' : 'bg-slate-100 text-slate-500 group-hover:bg-brand/10 group-hover:text-brand'
                        }`}>
                          <item.icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
                        </div>
                        <span className={`text-base leading-none transition-colors ${
                          active ? 'font-bold text-brand' : 'font-medium text-accent-brown'
                        }`}>
                          {item.name}
                        </span>
                        {active && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-brand" aria-hidden="true" />
                        )}
                      </div>
                    );

                    return (
                      <div key={item.name}>
                        {item.type === 'link' ? (
                          <Link
                            ref={idx === 0 ? firstLinkRef : undefined}
                            to={item.href}
                            onClick={(e) => item.href === '/' ? handleHomeClick(e) : setIsMenuOpen(false)}
                            aria-current={active ? 'page' : undefined}
                            className="block focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand/30"
                          >
                            {linkContent}
                          </Link>
                        ) : (
                          <a
                            ref={idx === 0 ? firstLinkRef : undefined}
                            href={item.href}
                            onClick={(e) => handleAnchorClick(e, item.href)}
                            aria-current={active ? 'page' : undefined}
                            className="block focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand/30"
                          >
                            {linkContent}
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="px-3.5 pt-3 pb-4 border-t border-slate-100 shrink-0">
                  {isBusinessLanding ? (
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5 sm:gap-3">
                      <Link
                        to="/login/business"
                        onClick={() => setIsMenuOpen(false)}
                        className="h-12 min-h-[48px] rounded-xl border-2 border-brand text-brand hover:bg-brand/5 font-bold text-sm flex items-center justify-center transition-all active:scale-[0.98] bg-white"
                      >
                        {CLINIC_LANDING_TEXT.nav.loginBtn}
                      </Link>
                      <Link
                        to="/register/business"
                        onClick={() => setIsMenuOpen(false)}
                        className="h-12 min-h-[48px] rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-sm shadow-md shadow-brand/20 flex items-center justify-center transition-all active:scale-[0.98]"
                      >
                        {CLINIC_LANDING_TEXT.nav.registerBtn}
                      </Link>
                    </div>
                  ) : isRiderLanding ? (
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5 sm:gap-3">
                      <Link
                        to="/login/rider"
                        onClick={() => setIsMenuOpen(false)}
                        className="h-12 min-h-[48px] rounded-xl border-2 border-brand text-brand hover:bg-brand/5 font-bold text-sm flex items-center justify-center transition-all active:scale-[0.98] bg-white"
                      >
                        {RIDER_LANDING_TEXT.nav.loginBtn}
                      </Link>
                      <Link
                        to="/register/rider"
                        onClick={() => setIsMenuOpen(false)}
                        className="h-12 min-h-[48px] rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-sm shadow-md shadow-brand/20 flex items-center justify-center transition-all active:scale-[0.98]"
                      >
                        {RIDER_LANDING_TEXT.nav.registerBtn}
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5 sm:gap-3">
                      <Link
                        to="/login"
                        onClick={() => setIsMenuOpen(false)}
                        className="h-12 min-h-[48px] rounded-xl border-2 border-brand text-brand hover:bg-brand/5 font-bold text-sm flex items-center justify-center transition-all active:scale-[0.98] bg-white"
                      >
                        {MAIN_LANDING_TEXT.nav.loginBtn}
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => setIsMenuOpen(false)}
                        className="h-12 min-h-[48px] rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-sm shadow-md shadow-brand/20 flex items-center justify-center transition-all active:scale-[0.98]"
                      >
                        {MAIN_LANDING_TEXT.nav.registerBtn}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}

function Landing() {
  return (
    <>
      <Hero />
      <Features />
      <CatalogPreview />
      <ReservationsSection />
      <LoyaltySection />
      <AboutSection />
      <div className="bg-[#FAF9F6]">
        <Footer />
      </div>
    </>
  );
}


function StatusBarManager() {
  const location = useLocation();

  useEffect(() => {
    const isDarkHeroPage = ['/', '/for-clinics', '/for-riders'].includes(location.pathname);

    const updateStatus = () => {
      let targetColor = '#FFFFFF';
      let docBg = '#FAF9F6';

      if (isDarkHeroPage) {
        // Opaque browser/OS fallback only: theme-color cannot put the hero image
        // behind a status bar that Chrome reserves outside the web viewport.
        const heroCutoff = Math.max(window.innerHeight - 90, 300);
        const isScrolledPastHero = window.scrollY > heroCutoff;
        if (!isScrolledPastHero) {
          targetColor = '#000000';
          docBg = '#000000';
        } else {
          targetColor = '#FFFFFF';
          docBg = '#FAF9F6';
        }
      } else if (location.pathname === '/catalog') {
        targetColor = '#FAF9F6';
        docBg = '#FAF9F6';
      } else if (
        location.pathname.startsWith('/login') ||
        location.pathname.startsWith('/register') ||
        location.pathname === '/forgot-password'
      ) {
        targetColor = '#FFFFFF';
        docBg = '#FFFFFF';
      } else if (location.pathname.startsWith('/dashboard/admin')) {
        targetColor = '#FFFFFF';
        docBg = '#FAF9F6';
      } else if (location.pathname.startsWith('/dashboard/customer')) {
        // Customer page background is bg-accent-peach/20 over #FAF9F6 = #FBF7EF
        targetColor = '#FBF7EF';
        docBg = '#FAF9F6';
      } else if (location.pathname.startsWith('/dashboard')) {
        // Clinic Business and Rider page background is #FAF9F6
        targetColor = '#FAF9F6';
        docBg = '#FAF9F6';
      } else {
        targetColor = '#FAF9F6';
        docBg = '#FAF9F6';
      }

      // Update meta theme-color immediately
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!targetColor) {
        // Omitting a hint leaves system-bar rendering to the browser; it does not
        // request or guarantee a transparent Android status bar.
        if (meta) {
          meta.remove();
        }
      } else {
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', 'theme-color');
          document.head.appendChild(meta);
        }
        if (meta.getAttribute('content') !== targetColor) {
          meta.setAttribute('content', targetColor);
        }
      }

      // Update html and body backgrounds to match so overscroll / pull-to-refresh is seamless
      if (document.documentElement.style.backgroundColor !== docBg) {
        document.documentElement.style.backgroundColor = docBg;
      }
      if (document.body.style.backgroundColor !== docBg) {
        document.body.style.backgroundColor = docBg;
      }
    };

    updateStatus();

    window.addEventListener('scroll', updateStatus, { passive: true });
    window.addEventListener('resize', updateStatus);
    return () => {
      window.removeEventListener('scroll', updateStatus);
      window.removeEventListener('resize', updateStatus);
    };
  }, [location.pathname]);

  return null;
}

function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <CartProvider>
          <Router>
            <ScrollToTop />
            <StatusBarManager />
            <div className="min-h-screen bg-transparent font-brand selection:bg-brand/30 selection:text-accent-brown overflow-x-hidden">
              <Navigation />

              <main>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/catalog" element={<Catalog />} />
                  <Route path="/catalog/:id" element={<ProductDetail />} />
                  <Route path="/login/admin" element={<Login />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/login/business" element={<BusinessLogin />} />
                  <Route path="/login/rider" element={<RiderLogin />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/register/business" element={<BusinessRegister />} />
                  <Route path="/register/rider" element={<RiderRegister />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/auth/callback" element={<GoogleCallback />} />
                  <Route path="/for-clinics" element={<BusinessLanding />} />
                  <Route path="/for-riders" element={<RiderLanding />} />

                  {/* Protected Dashboard Routes */}
                  {/* Super Admin Routes */}
                  <Route
                    path="/dashboard/admin/businesses"
                    element={
                      <ProtectedRoute allowedRoles={['super_admin']}>
                        <AdminBusinesses />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/admin/riders"
                    element={
                      <ProtectedRoute allowedRoles={['super_admin']}>
                        <AdminRiders />
                      </ProtectedRoute>
                    }
                  />
                   <Route
                    path="/dashboard/admin/customer-records"
                    element={
                      <ProtectedRoute allowedRoles={['super_admin', 'system_admin']}>
                        <AdminCustomerRecords />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/admin/users"
                    element={
                      <ProtectedRoute allowedRoles={['super_admin']}>
                        <AdminCustomers />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/admin"
                    element={
                      <ProtectedRoute allowedRoles={['super_admin', 'system_admin']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/admin/alerts"
                    element={
                      <ProtectedRoute allowedRoles={['super_admin', 'system_admin']}>
                        <AdminAlerts />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/user/*"
                    element={<Navigate to="/dashboard/customer" replace />}
                  />
                  <Route
                    path="/dashboard/customer/catalog"
                    element={
                      <ProtectedRoute allowedRoles={['customer']}>
                        <CustomerCatalog />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/customer/catalog/:id"
                    element={
                      <ProtectedRoute allowedRoles={['customer']}>
                        <ProductDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/customer/reservations"
                    element={
                      <ProtectedRoute allowedRoles={['customer']}>
                        <CustomerReservations />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/customer/reservations/checkout"
                    element={
                      <ProtectedRoute allowedRoles={['customer']}>
                        <ReservationCheckout />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/customer/reservations/payment-success"
                    element={
                      <ProtectedRoute allowedRoles={['customer']}>
                        <ReservationPaymentSuccess />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/customer/loyalty"
                    element={
                      <ProtectedRoute allowedRoles={['customer']}>
                        <CustomerLoyalty />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/customer/alerts"
                    element={
                      <ProtectedRoute allowedRoles={['customer']}>
                        <CustomerAlerts />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/customer/orders"
                    element={
                      <ProtectedRoute allowedRoles={['customer']}>
                        <CustomerOrders />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/customer/map"
                    element={
                      <ProtectedRoute allowedRoles={['customer']}>
                        <ClinicMap />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/customer/checkout"
                    element={
                      <ProtectedRoute allowedRoles={['customer']}>
                        <Checkout />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/customer/checkout/success"
                    element={
                      <ProtectedRoute allowedRoles={['customer']}>
                        <PaymentSuccess />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/customer/*"
                    element={
                      <ProtectedRoute allowedRoles={['customer']}>
                        <CustomerDashboard />
                      </ProtectedRoute>
                    }
                  />
                  {/* Business Routes */}
                  <Route
                    path="/dashboard/business"
                    element={
                      <ProtectedRoute allowedRoles={['business']}>
                        <BusinessDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/business/orders"
                    element={
                      <ProtectedRoute allowedRoles={['business']}>
                        <BusinessOrders />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/business/catalog"
                    element={
                      <ProtectedRoute allowedRoles={['business']}>
                        <BusinessCatalog />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/business/catalog/product/:id"
                    element={
                      <ProtectedRoute allowedRoles={['business']}>
                        <BusinessProductEditor />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/business/reservations"
                    element={
                      <ProtectedRoute allowedRoles={['business']}>
                        <BusinessReservations />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/business/analytics"
                    element={
                      <ProtectedRoute allowedRoles={['business']}>
                        <BusinessAnalytics />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/business/account"
                    element={
                      <ProtectedRoute allowedRoles={['business']}>
                        <AccountSettings />
                      </ProtectedRoute>
                    }
                  />
                  {/* Rider Routes */}
                  <Route
                    path="/dashboard/rider"
                    element={
                      <ProtectedRoute allowedRoles={['rider']}>
                        <RiderDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/rider/account"
                    element={
                      <ProtectedRoute allowedRoles={['rider']}>
                        <AccountSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/rider/orders"
                    element={
                      <ProtectedRoute allowedRoles={['rider']}>
                        <RiderOrders />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/rider/earnings"
                    element={
                      <ProtectedRoute allowedRoles={['rider']}>
                        <RiderEarnings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/rider/alerts"
                    element={
                      <ProtectedRoute allowedRoles={['rider']}>
                        <RiderAlerts />
                      </ProtectedRoute>
                    }
                  />
                  {/* Account Settings – shared across all roles */}
                  <Route
                    path="/dashboard/admin/compliance/clinics"
                    element={
                      <ProtectedRoute allowedRoles={['super_admin', 'system_admin']}>
                        <AdminClinicCompliance />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/admin/compliance/riders"
                    element={
                      <ProtectedRoute allowedRoles={['super_admin', 'system_admin']}>
                        <AdminRiderCompliance />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/admin/account"
                    element={
                      <ProtectedRoute allowedRoles={['super_admin', 'system_admin']}>
                        <AccountSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/customer/account"
                    element={
                      <ProtectedRoute allowedRoles={['customer']}>
                        <AccountSettings />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </main>
            </div>
          </Router>
        </CartProvider>
      </ErrorBoundary>
    </AuthProvider>

  );
}

export default App;

