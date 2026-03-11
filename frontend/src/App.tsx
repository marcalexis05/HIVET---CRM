import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { CatalogPreview } from './components/CatalogPreview';
import { ReservationsSection } from './components/ReservationsSection';
import { LoyaltySection } from './components/LoyaltySection';
import { AboutSection } from './components/AboutSection';
import { Logo } from './components/Logo';
import { ShoppingCart, Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin, Menu, X } from 'lucide-react';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Catalog from './pages/Catalog';
import ScrollToTop from './components/ScrollToTop';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import AdminBusinesses from './pages/dashboard/AdminBusinesses';
import AdminUsers from './pages/dashboard/AdminUsers';
import UserDashboard from './pages/dashboard/UserDashboard';
import UserCatalog from './pages/dashboard/UserCatalog';
import ProductDetail from './pages/dashboard/ProductDetail';
import UserReservations from './pages/dashboard/UserReservations';
import UserLoyalty from './pages/dashboard/UserLoyalty';
import UserAlerts from './pages/dashboard/UserAlerts';
import UserOrders from './pages/dashboard/UserOrdersList';
import Checkout from './pages/dashboard/Checkout';
import BusinessDashboard from './pages/dashboard/BusinessDashboard';
import BusinessOrders from './pages/dashboard/BusinessOrders';
import BusinessCatalog from './pages/dashboard/BusinessCatalog';
import BusinessAnalytics from './pages/dashboard/BusinessAnalytics';
import AccountSettings from './pages/dashboard/AccountSettings';
import GoogleCallback from './pages/GoogleCallback';
import BusinessLanding from './pages/BusinessLanding';
import BusinessLogin from './pages/BusinessLogin';
import BusinessRegister from './pages/BusinessRegister';
import RiderLanding from './pages/RiderLanding';
import RiderLogin from './pages/RiderLogin';
import RiderRegister from './pages/RiderRegister';

function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  // Hide public navbar on auth pages and dashboard portals
  const shouldShowNavbar = !['/login', '/login/business', '/login/rider', '/register', '/register/business', '/register/rider', '/forgot-password', '/catalog'].includes(location.pathname) && !location.pathname.startsWith('/dashboard');

  if (!shouldShowNavbar) return null;

  const isBusinessLanding = location.pathname === '/for-clinics';
  const isRiderLanding = location.pathname === '/for-riders';

  return (
    <nav className={`fixed top-0 sm:top-8 left-0 w-full z-50 transition-all ${isMenuOpen ? 'bg-white' : ''}`}>
      <div className="container mx-auto px-4 xs:px-6 sm:px-8 h-16 sm:h-20 flex items-center justify-between relative">
        {/* Left: Branding */}
        <div className="flex-1 flex justify-start z-[60]">
          <Link to="/" className="flex items-center gap-2 xs:gap-3 group" onClick={() => setIsMenuOpen(false)}>
            <div className="w-10 h-10 xs:w-14 xs:h-14 flex items-center justify-center -ml-1 xs:-ml-3 group-hover:scale-110 transition-transform">
              <Logo className="w-full h-full drop-shadow-sm" />
            </div>
            <span className="text-lg xs:text-xl font-black tracking-tighter text-accent-brown">Hi-Vet</span>
          </Link>
        </div>

        {/* Center: Navigation Links (Desktop) */}
        <div className="hidden lg:flex items-center gap-8 xl:gap-10 font-black text-accent-brown/60 text-xs xl:text-sm uppercase tracking-widest">
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
              <Link to="/" className="hover:text-brand-dark transition-colors">Home</Link>
              <Link to="/catalog" className="hover:text-brand-dark transition-colors">Catalog</Link>
              <a href="/#orders" className="hover:text-brand-dark transition-colors">Orders</a>
              <a href="/#loyalty" className="hover:text-brand-dark transition-colors">Loyalty</a>
              <a href="/#about" className="hover:text-brand-dark transition-colors">About</a>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex-1 flex items-center justify-end gap-3 xs:gap-6 z-[60]">
          {!isBusinessLanding && !isRiderLanding && (
            <>
              <button className="relative p-2 text-accent-brown/60 hover:text-brand-dark transition-all">
                <ShoppingCart className="w-5 h-5 xs:w-6 xs:h-6" />
                <span className="absolute top-0 right-0 xs:-top-1 xs:-right-1 bg-brand-dark text-white text-[9px] xs:text-[10px] w-3.5 h-3.5 xs:w-4 xs:h-4 rounded-full flex items-center justify-center font-bold">2</span>
              </button>

              <div className="h-8 w-[1px] bg-accent-brown/10 mx-2 hidden lg:block"></div>
            </>
          )}

          {isBusinessLanding ? (
            <div className="hidden sm:flex items-center gap-4 xs:gap-6">
              <Link to="/login/business" className="text-xs xs:text-sm font-black text-accent-brown/80 hover:text-brand transition-colors uppercase tracking-widest">
                Partner Login
              </Link>
              <Link to="/register/business" className="bg-brand-dark text-white hover:bg-brand px-6 xs:px-8 py-2.5 xs:py-3 rounded-full text-[10px] xs:text-xs font-black transition-colors uppercase tracking-widest shadow-md">
                Register Clinic
              </Link>
            </div>
          ) : isRiderLanding ? (
            <div className="hidden sm:flex items-center gap-4 xs:gap-6">
              <Link to="/login" className="text-xs xs:text-sm font-black text-accent-brown/80 hover:text-brand transition-colors uppercase tracking-widest">
                Rider Login
              </Link>
              <Link to="/register" className="bg-brand-dark text-white hover:bg-brand px-6 xs:px-8 py-2.5 xs:py-3 rounded-full text-[10px] xs:text-xs font-black transition-colors uppercase tracking-widest shadow-md">
                Apply to Drive
              </Link>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-6">
              <Link to="/login" className="text-xs xs:text-sm font-black text-accent-brown/60 hover:text-accent-brown transition-colors uppercase tracking-widest">
                Login
              </Link>
              <Link to="/register" className="btn-primary !px-6 xs:!px-8 !py-2.5 xs:!py-3 !text-[10px] xs:!text-xs">
                Register
              </Link>
            </div>
          )}

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden w-10 h-10 bg-accent-peach/50 flex items-center justify-center rounded-xl text-accent-brown hover:bg-brand/20 transition-all"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
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
                  { name: 'Catalog', href: '/catalog', type: 'link' },
                  { name: 'Orders', href: '/#orders', type: 'anchor' },
                  { name: 'Loyalty', href: '/#loyalty', type: 'anchor' },
                  { name: 'About', href: '/#about', type: 'anchor' },
                ]).map((item) => (
                  item.type === 'link' ? (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setIsMenuOpen(false)}
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
                  <Link
                    to="/login/business"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-center py-4 rounded-2xl font-black text-accent-brown/80 uppercase tracking-widest bg-brand/10 border border-brand/20"
                  >
                    Partner Login
                  </Link>
                  <Link
                    to="/register/business"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-center py-5 rounded-2xl font-black text-white uppercase tracking-widest bg-brand-dark shadow-lg shadow-brand/20"
                  >
                    Register Clinic
                  </Link>
                </div>
              ) : isRiderLanding ? (
                <div className="space-y-4">
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-center py-4 rounded-2xl font-black text-accent-brown/80 uppercase tracking-widest bg-brand/10 border border-brand/20"
                  >
                    Rider Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-center py-5 rounded-2xl font-black text-white uppercase tracking-widest bg-brand-dark shadow-lg shadow-brand/20"
                  >
                    Apply to Drive
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-center py-4 rounded-2xl font-black text-accent-brown/60 uppercase tracking-widest bg-accent-peach/30"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-center py-5 rounded-2xl font-black text-white uppercase tracking-widest bg-brand-dark shadow-lg shadow-brand/20"
                  >
                    Register Now
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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

      {/* Footer */}
      <footer className="py-16 xs:py-24 bg-accent-brown text-accent-cream rounded-t-[3rem] xs:rounded-t-[5rem] mt-12 xs:mt-20">
        <div className="container mx-auto px-6 xs:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-12 xs:gap-16 md:gap-8 pb-12 xs:pb-16">
            {/* Branding Column */}
            <div className="md:col-span-4 space-y-6 xs:space-y-8">
              <Link to="/" className="flex items-center gap-3 group w-fit">
                <div className="w-12 h-12 xs:w-14 xs:h-14 bg-white rounded-2xl flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                  <Logo className="w-full h-full" />
                </div>
                <span className="text-xl xs:text-2xl font-black tracking-tighter text-white">Hi-Vet</span>
              </Link>
              <p className="text-accent-cream/50 text-sm xs:text-base leading-relaxed max-w-sm">
                Redefining the standard of pet care with professional tools and a community-driven approach. Your pet's wellbeing is our priority.
              </p>
              <div className="flex gap-3 xs:gap-4">
                {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                  <button key={i} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand hover:text-white transition-all">
                    <Icon className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="md:col-span-2 space-y-6 xs:space-y-8">
              <h4 className="text-xs xs:text-sm font-black uppercase tracking-[0.2em] text-brand">Platform</h4>
              <ul className="space-y-3 xs:space-y-4 text-accent-cream/60 font-medium text-sm xs:text-base">
                <li><Link to="/catalog" className="hover:text-white transition-colors">Catalog</Link></li>
                <li><a href="/#orders" className="hover:text-white transition-colors">Orders</a></li>
                <li><a href="/#loyalty" className="hover:text-white transition-colors">Loyalty Program</a></li>
                <li><Link to="/for-clinics" className="hover:text-brand transition-colors text-brand font-bold">For Clinic Owners</Link></li>
                <li><Link to="/for-riders" className="hover:text-brand transition-colors text-brand font-bold">For Riders</Link></li>
                <li><a href="/#about" className="hover:text-white transition-colors">About Us</a></li>
              </ul>
            </div>

            {/* Support */}
            <div className="md:col-span-2 space-y-6 xs:space-y-8">
              <h4 className="text-xs xs:text-sm font-black uppercase tracking-[0.2em] text-brand">Support</h4>
              <ul className="space-y-3 xs:space-y-4 text-accent-cream/60 font-medium text-sm xs:text-base">
                <li><button className="hover:text-white transition-colors text-left uppercase text-[10px] tracking-widest font-black">Help Center</button></li>
                <li><button className="hover:text-white transition-colors text-left uppercase text-[10px] tracking-widest font-black">Safety Center</button></li>
                <li><button className="hover:text-white transition-colors text-left uppercase text-[10px] tracking-widest font-black">Privacy Policy</button></li>
                <li><button className="hover:text-white transition-colors text-left uppercase text-[10px] tracking-widest font-black">Terms of Service</button></li>
              </ul>
            </div>

            {/* Contact */}
            <div className="md:col-span-4 space-y-6 xs:space-y-8">
              <h4 className="text-xs xs:text-sm font-black uppercase tracking-[0.2em] text-brand">Stay Connected</h4>
              <div className="space-y-3 xs:space-y-4">
                <div className="flex items-center gap-3 xs:gap-4 text-accent-cream/60">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-sm xs:text-base truncate">hello@hi-vet.com</span>
                </div>
                <div className="flex items-center gap-3 xs:gap-4 text-accent-cream/60">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-sm xs:text-base">+1 (555) 123-4567</span>
                </div>
                <div className="flex items-start gap-3 xs:gap-4 text-accent-cream/60 pt-2">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-sm xs:text-base">123 Vet Street, <br />Los Angeles, CA 90210</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[8px] xs:text-[10px] font-black uppercase tracking-[0.2em] xs:tracking-[0.3em] text-accent-cream/20 text-center md:text-left">
            <p>© 2026 Hi-Vet Professional CRM. All Rights Reserved.</p>
            <div className="flex gap-6 xs:gap-8">
              <button className="hover:text-white transition-colors">Security</button>
              <button className="hover:text-white transition-colors">Cookies</button>
              <button className="hover:text-white transition-colors">API Status</button>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <ScrollToTop />
          <div className="min-h-screen bg-accent-peach font-brand selection:bg-brand/30 selection:text-accent-brown overflow-x-hidden">
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
                    <ProtectedRoute allowedRole="admin">
                      <AdminBusinesses />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin/users"
                  element={
                    <ProtectedRoute allowedRole="admin">
                      <AdminUsers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin"
                  element={
                    <ProtectedRoute allowedRole="admin">
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/user/catalog"
                  element={
                    <ProtectedRoute allowedRole="user">
                      <UserCatalog />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/user/catalog/:id"
                  element={
                    <ProtectedRoute allowedRole="user">
                      <ProductDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/user/reservations"
                  element={
                    <ProtectedRoute allowedRole="user">
                      <UserReservations />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/user/loyalty"
                  element={
                    <ProtectedRoute allowedRole="user">
                      <UserLoyalty />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/user/alerts"
                  element={
                    <ProtectedRoute allowedRole="user">
                      <UserAlerts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/user/orders"
                  element={
                    <ProtectedRoute allowedRole="user">
                      <UserOrders />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/user/checkout"
                  element={
                    <ProtectedRoute allowedRole="user">
                      <Checkout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/user/*"
                  element={
                    <ProtectedRoute allowedRole="user">
                      <UserDashboard />
                    </ProtectedRoute>
                  }
                />
                {/* Business Routes */}
                <Route
                  path="/dashboard/business"
                  element={
                    <ProtectedRoute allowedRole="business">
                      <BusinessDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/business/orders"
                  element={
                    <ProtectedRoute allowedRole="business">
                      <BusinessOrders />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/business/catalog"
                  element={
                    <ProtectedRoute allowedRole="business">
                      <BusinessCatalog />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/business/analytics"
                  element={
                    <ProtectedRoute allowedRole="business">
                      <BusinessAnalytics />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/business/account"
                  element={
                    <ProtectedRoute allowedRole="business">
                      <AccountSettings />
                    </ProtectedRoute>
                  }
                />
                {/* Account Settings – shared across all roles */}
                <Route
                  path="/dashboard/admin/account"
                  element={
                    <ProtectedRoute allowedRole="admin">
                      <AccountSettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/user/account"
                  element={
                    <ProtectedRoute allowedRole="user">
                      <AccountSettings />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
