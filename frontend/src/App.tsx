import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { CatalogPreview } from './components/CatalogPreview';
import { ReservationsSection } from './components/ReservationsSection';
import { LoyaltySection } from './components/LoyaltySection';
import { AboutSection } from './components/AboutSection';
import { Logo } from './components/Logo';
import { ShoppingCart, Menu, X } from 'lucide-react';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Catalog from './pages/Catalog';
import ScrollToTop from './components/ScrollToTop';
import { Footer } from './components/Footer';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { CartProvider } from './context/CartContext';
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hide public navbar on auth pages and dashboard portals
  const shouldShowNavbar = !['/login', '/login/business', '/login/rider', '/register', '/register/business', '/register/rider', '/forgot-password', '/catalog'].includes(location.pathname) && !location.pathname.startsWith('/dashboard');

  if (!shouldShowNavbar) return null;

  const isBusinessLanding = location.pathname === '/for-clinics';
  const isRiderLanding = location.pathname === '/for-riders';
  const isHome = location.pathname === '/';
  
  // Dynamic Styles based on scroll and page
  const isTransparent = (isHome || isBusinessLanding || isRiderLanding) && !isScrolled && !isMenuOpen;
  const navBackground = isTransparent ? 'bg-transparent' : 'bg-white border-b border-accent-brown/5 shadow-[0_20px_50px_rgba(45,34,27,0.1)] rounded-b-[2.5rem]';
  const textColor = isTransparent ? 'text-white' : 'text-accent-brown';
  const linkColor = isTransparent ? 'text-white/70' : 'text-accent-brown/60';

  const handleHomeClick = (e: React.MouseEvent) => {
    if (location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isTransparent ? 'py-4' : 'py-0'}`}>
      <div className={`w-full transition-all duration-500 flex items-center justify-between px-6 sm:px-12 h-16 sm:h-20 ${navBackground}`}>
        <div className="flex-1 flex justify-start">
          <Link to="/" className="flex items-center gap-2 xs:gap-3 group" onClick={handleHomeClick}>
            <div className={`w-10 h-10 xs:w-12 xs:h-12 flex items-center justify-center -ml-1 group-hover:scale-110 transition-transform ${isTransparent ? 'brightness-0 invert' : ''}`}>
              <Logo className="w-full h-full drop-shadow-sm" />
            </div>
            <span className={`text-lg xs:text-xl font-black tracking-tighter transition-colors ${textColor}`}>Hi-Vet</span>
          </Link>
        </div>

        <div className={`hidden lg:flex items-center gap-8 xl:gap-10 font-black text-xs xl:text-sm uppercase tracking-widest ${linkColor}`}>
          {isBusinessLanding ? (
            <>
              <a href="#features" className="hover:text-brand-dark transition-colors">Features</a>
              <a href="#capabilities" className="hover:text-brand-dark transition-colors">CRM & BI</a>
              <a href="#security" className="hover:text-brand-dark transition-colors">Security</a>
            </>
          ) : isRiderLanding ? (
            <>
              <a href="#benefits" className="hover:text-brand-dark transition-colors">Benefits</a>
              <a href="#perks" className="hover:text-brand-dark transition-colors">Perks</a>
              <a href="#requirements" className="hover:text-brand-dark transition-colors">Requirements</a>
            </>
          ) : (
            <>
              <Link to="/" className="hover:text-brand-dark transition-colors" onClick={handleHomeClick}>Home</Link>
              <Link to="/catalog" className="hover:text-brand-dark transition-colors">Store</Link>
              <a href="/#orders" className="hover:text-brand-dark transition-colors">Orders</a>
              <a href="/#loyalty" className="hover:text-brand-dark transition-colors">Loyalty</a>
              <a href="/#about" className="hover:text-brand-dark transition-colors">About</a>
            </>
          )}
        </div>

        <div className="flex-1 flex items-center justify-end gap-3 xs:gap-6">
          {!isBusinessLanding && !isRiderLanding && (
            <>
              <button className={`relative p-2 transition-all ${isTransparent ? 'text-white/70 hover:text-white' : 'text-accent-brown/60 hover:text-brand'}`}>
                <ShoppingCart className="w-5 h-5 xs:w-6 xs:h-6" />
              </button>
              <div className={`h-8 w-[1px] mx-2 hidden lg:block ${isTransparent ? 'bg-white/20' : 'bg-accent-brown/10'}`}></div>
            </>
          )}

          {isBusinessLanding ? (
            <div className="hidden sm:flex items-center gap-4 xs:gap-6">
              <Link to="/login/business" className={`text-xs xs:text-sm font-black transition-colors uppercase tracking-widest ${isTransparent ? 'text-white/80 hover:text-white' : 'text-accent-brown/80 hover:text-brand'}`}>
                Partner Login
              </Link>
              <Link to="/register/business" className="bg-brand-dark text-white hover:bg-brand px-6 xs:px-8 py-2.5 xs:py-3 rounded-full text-[10px] xs:text-xs font-black transition-colors uppercase tracking-widest shadow-md">
                Register Clinic
              </Link>
            </div>
          ) : isRiderLanding ? (
            <div className="hidden sm:flex items-center gap-4 xs:gap-6">
              <Link to="/login/rider" className={`text-xs xs:text-sm font-black transition-colors uppercase tracking-widest ${isTransparent ? 'text-white/80 hover:text-white' : 'text-accent-brown/80 hover:text-brand'}`}>
                Rider Login
              </Link>
              <Link to="/register/rider" className="bg-brand-dark text-white hover:bg-brand px-6 xs:px-8 py-2.5 xs:py-3 rounded-full text-[10px] xs:text-xs font-black transition-colors uppercase tracking-widest shadow-md">
                Apply to Drive
              </Link>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-6">
              <Link to="/login" className={`text-xs xs:text-sm font-black transition-colors uppercase tracking-widest ${isTransparent ? 'text-white/70 hover:text-white' : 'text-accent-brown/60 hover:text-brand'}`}>
                Login
              </Link>
              <Link to="/register" className="btn-primary !px-6 xs:!px-8 !py-2.5 xs:!py-3 !text-[10px] xs:!text-xs !rounded-full">
                Register
              </Link>
            </div>
          )}

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`lg:hidden w-10 h-10 flex items-center justify-center rounded-xl transition-all ${isTransparent ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-accent-peach/50 text-accent-brown hover:bg-brand/20'}`}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-white z-[50] pt-24 pb-12 px-6 flex flex-col justify-between"
          >
            <div className="space-y-6">
              {(isBusinessLanding ? [
                { name: 'Features', href: '#features', type: 'anchor' },
                { name: 'CRM & BI', href: '#capabilities', type: 'anchor' },
                { name: 'Security', href: '#security', type: 'anchor' }
              ] : isRiderLanding ? [
                { name: 'Benefits', href: '#benefits', type: 'anchor' },
                { name: 'Perks', href: '#perks', type: 'anchor' },
                { name: 'Requirements', href: '#requirements', type: 'anchor' }
              ] : [
                { name: 'Home', href: '/', type: 'link' },
                { name: 'Store', href: '/catalog', type: 'link' },
                { name: 'Orders', href: '/#orders', type: 'anchor' },
                { name: 'Loyalty', href: '/#loyalty', type: 'anchor' },
                { name: 'About', href: '/#about', type: 'anchor' },
              ]).map((item) => (
                item.type === 'link' ? (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={(e) => item.href === '/' ? handleHomeClick(e) : setIsMenuOpen(false)}
                    className="block text-2xl font-black text-accent-brown uppercase tracking-widest hover:text-brand transition-colors"
                  >
                    {item.name}
                  </Link>
                ) : (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="block text-2xl font-black text-accent-brown uppercase tracking-widest hover:text-brand transition-colors"
                  >
                    {item.name}
                  </a>
                )
              ))}
            </div>

            {isBusinessLanding ? (
              <div className="space-y-4">
                <Link to="/login/business" onClick={() => setIsMenuOpen(false)} className="block w-full text-center py-4 rounded-2xl font-black text-accent-brown/80 uppercase tracking-widest bg-brand/10 border border-brand/20">Partner Login</Link>
                <Link to="/register/business" onClick={() => setIsMenuOpen(false)} className="block w-full text-center py-5 rounded-2xl font-black text-white uppercase tracking-widest bg-brand-dark shadow-lg shadow-brand/20">Register Clinic</Link>
              </div>
            ) : isRiderLanding ? (
              <div className="space-y-4">
                <Link to="/login/rider" onClick={() => setIsMenuOpen(false)} className="block w-full text-center py-4 rounded-2xl font-black text-accent-brown/80 uppercase tracking-widest bg-brand/10 border border-brand/20">Rider Login</Link>
                <Link to="/register/rider" onClick={() => setIsMenuOpen(false)} className="block w-full text-center py-4 rounded-2xl font-black text-white uppercase tracking-widest bg-brand-dark shadow-lg shadow-brand-dark/20">Apply to Drive</Link>
              </div>
            ) : (
              <div className="space-y-4">
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block w-full text-center py-4 rounded-2xl font-black text-accent-brown/60 uppercase tracking-widest bg-accent-peach/30">Login</Link>
                <Link to="/register" onClick={() => setIsMenuOpen(false)} className="block w-full text-center py-5 rounded-2xl font-black text-white uppercase tracking-widest bg-brand-dark shadow-lg shadow-brand/20">Register Now</Link>
              </div>
            )}
          </motion.div>
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

function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <CartProvider>
          <Router>
            <ScrollToTop />
            <div className="min-h-screen bg-white font-brand selection:bg-brand/30 selection:text-accent-brown overflow-x-hidden">
              <Navigation />

              <main>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/catalog" element={<Catalog />} />
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

