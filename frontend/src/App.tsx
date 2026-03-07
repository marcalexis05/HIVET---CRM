import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { CatalogPreview } from './components/CatalogPreview';
import { ReservationsSection } from './components/ReservationsSection';
import { LoyaltySection } from './components/LoyaltySection';
import { AboutSection } from './components/AboutSection';
import { Logo } from './components/Logo';
import { ShoppingCart, Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import Login from './pages/Login';
import Register from './pages/Register';
import Catalog from './pages/Catalog';
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
import Checkout from './pages/dashboard/Checkout';
import BusinessDashboard from './pages/dashboard/BusinessDashboard';
import BusinessOrders from './pages/dashboard/BusinessOrders';
import BusinessCatalog from './pages/dashboard/BusinessCatalog';
import BusinessAnalytics from './pages/dashboard/BusinessAnalytics';
import AccountSettings from './pages/dashboard/AccountSettings';

function Navigation() {
  const location = useLocation();
  // Hide public navbar on auth pages and dashboard portals
  const shouldShowNavbar = !['/login', '/register', '/catalog'].includes(location.pathname) && !location.pathname.startsWith('/dashboard');

  if (!shouldShowNavbar) return null;

  return (
    <nav className="fixed top-8 left-0 w-full z-50">
      <div className="container mx-auto px-8 h-20 flex items-center justify-between relative">
        {/* Left: Branding */}
        <div className="flex-1 flex justify-start">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-14 h-14 flex items-center justify-center -ml-3 group-hover:scale-110 transition-transform">
              <Logo className="w-full h-full drop-shadow-sm" />
            </div>
            <span className="text-xl font-black tracking-tighter text-accent-brown">Hi-Vet</span>
          </Link>
        </div>

        {/* Center: Navigation Links */}
        <div className="hidden md:flex items-center gap-10 font-black text-accent-brown/60 text-sm uppercase tracking-widest">
          <Link to="/" className="hover:text-brand-dark transition-colors">Home</Link>
          <Link to="/catalog" className="hover:text-brand-dark transition-colors">Catalog</Link>
          <a href="/#reservations" className="hover:text-brand-dark transition-colors">Reservations</a>
          <a href="/#loyalty" className="hover:text-brand-dark transition-colors">Loyalty</a>
          <a href="/#about" className="hover:text-brand-dark transition-colors">About</a>
        </div>

        {/* Right: Actions */}
        <div className="flex-1 flex items-center justify-end gap-6">
          <button className="relative p-2 text-accent-brown/60 hover:text-brand-dark transition-all">
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 bg-brand-dark text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">2</span>
          </button>

          <div className="h-8 w-[1px] bg-accent-brown/10 mx-2 hidden md:block"></div>

          <Link to="/login" className="text-sm font-black text-accent-brown/60 hover:text-accent-brown transition-colors uppercase tracking-widest">
            Login
          </Link>
          <Link to="/register" className="btn-primary !px-8 !py-3 !text-xs">
            Register
          </Link>
        </div>
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
      <footer className="py-24 bg-accent-brown text-accent-cream rounded-t-[5rem] mt-20">
        <div className="container mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-16 md:gap-8 pb-16">
            {/* Branding Column */}
            <div className="md:col-span-4 space-y-8">
              <Link to="/" className="flex items-center gap-3 group w-fit">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                  <Logo className="w-full h-full" />
                </div>
                <span className="text-2xl font-black tracking-tighter text-white">Hi-Vet</span>
              </Link>
              <p className="text-accent-cream/50 text-base leading-relaxed max-w-sm">
                Redefining the standard of pet care with professional tools and a community-driven approach. Your pet's wellbeing is our priority.
              </p>
              <div className="flex gap-4">
                {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                  <button key={i} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand hover:text-white transition-all">
                    <Icon className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="md:col-span-2 space-y-8">
              <h4 className="text-sm font-black uppercase tracking-[0.2em] text-brand">Platform</h4>
              <ul className="space-y-4 text-accent-cream/60 font-medium">
                <li><Link to="/catalog" className="hover:text-white transition-colors">Catalog</Link></li>
                <li><a href="/#reservations" className="hover:text-white transition-colors">Reservations</a></li>
                <li><a href="/#loyalty" className="hover:text-white transition-colors">Loyalty Program</a></li>
                <li><a href="/#about" className="hover:text-white transition-colors">About Us</a></li>
              </ul>
            </div>

            {/* Support */}
            <div className="md:col-span-2 space-y-8">
              <h4 className="text-sm font-black uppercase tracking-[0.2em] text-brand">Support</h4>
              <ul className="space-y-4 text-accent-cream/60 font-medium">
                <li><button className="hover:text-white transition-colors">Help Center</button></li>
                <li><button className="hover:text-white transition-colors">Safety Center</button></li>
                <li><button className="hover:text-white transition-colors">Privacy Policy</button></li>
                <li><button className="hover:text-white transition-colors">Terms of Service</button></li>
              </ul>
            </div>

            {/* Contact */}
            <div className="md:col-span-4 space-y-8">
              <h4 className="text-sm font-black uppercase tracking-[0.2em] text-brand">Stay Connected</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-accent-cream/60">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <span className="font-medium">hello@hi-vet.com</span>
                </div>
                <div className="flex items-center gap-4 text-accent-cream/60">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <span className="font-medium">+1 (555) 123-4567</span>
                </div>
                <div className="flex items-start gap-4 text-accent-cream/60 pt-2">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="font-medium">123 Vet Street, <br />Los Angeles, CA 90210</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black uppercase tracking-[0.3em] text-accent-cream/20">
            <p>© 2026 Hi-Vet Professional CRM. All Rights Reserved.</p>
            <div className="flex gap-8">
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
          <div className="min-h-screen bg-accent-peach font-brand selection:bg-brand/30 selection:text-accent-brown overflow-x-hidden">
            <Navigation />

            <main>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

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
