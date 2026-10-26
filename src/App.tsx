import { lazy, Suspense } from 'react';
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { ShopperProvider } from './context/ShopperContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './components/Toast';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import ServiceDetail from './pages/ServiceDetail';
import Software from './pages/Software';
import Contact from './pages/Contact';
// Store and account code loads on demand to keep the first page light.
const Store = lazy(() => import('./pages/store/Store'));
const ProductDetail = lazy(() => import('./pages/store/ProductDetail'));
const Compare = lazy(() => import('./pages/store/Compare'));
const auth = () => import('./pages/auth/AuthPages');
const SignIn = lazy(() => auth().then((m) => ({ default: m.SignIn })));
const SignUp = lazy(() => auth().then((m) => ({ default: m.SignUp })));
const ForgotPassword = lazy(() => auth().then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => auth().then((m) => ({ default: m.ResetPassword })));
const acct = () => import('./pages/account/Account');
const AccountLayout = lazy(() => acct().then((m) => ({ default: m.AccountLayout })));
const ProfilePanel = lazy(() => acct().then((m) => ({ default: m.ProfilePanel })));
const OrdersPanel = lazy(() => acct().then((m) => ({ default: m.OrdersPanel })));
const DownloadsPanel = lazy(() => acct().then((m) => ({ default: m.DownloadsPanel })));
const AddressesPanel = lazy(() => acct().then((m) => ({ default: m.AddressesPanel })));
const WishlistPanel = lazy(() => acct().then((m) => ({ default: m.WishlistPanel })));

const PageLoading = () => <div className="py-24 text-center text-muted" aria-busy="true">Loading…</div>;
import Upcoming from './pages/Upcoming';
import NotFound from './pages/NotFound';

const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter;
// Built in later phases
const upcoming = ['/cart', '/checkout', '/track-order', '/blog/*', '/faq', '/policies/*'];

export default function App() {
  return (
    <ToastProvider>
      <SettingsProvider>
        <AuthProvider>
          <ShopperProvider>
            <CartProvider>
              <Router>
                <Suspense fallback={<PageLoading />}>
                <Routes>
                  <Route element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="about" element={<About />} />
                    <Route path="services" element={<Services />} />
                    <Route path="services/:slug" element={<ServiceDetail />} />
                    <Route path="software" element={<Software />} />
                    <Route path="contact" element={<Contact />} />
                    <Route path="store" element={<Store />} />
                    <Route path="store/category/:slug" element={<Store />} />
                    <Route path="store/product/:slug" element={<ProductDetail />} />
                    <Route path="compare" element={<Compare />} />
                    <Route path="account/sign-in" element={<SignIn />} />
                    <Route path="account/sign-up" element={<SignUp />} />
                    <Route path="account/forgot-password" element={<ForgotPassword />} />
                    <Route path="account/reset-password" element={<ResetPassword />} />
                    <Route path="account" element={<AccountLayout />}>
                      <Route index element={<ProfilePanel />} />
                      <Route path="orders" element={<OrdersPanel />} />
                      <Route path="downloads" element={<DownloadsPanel />} />
                      <Route path="addresses" element={<AddressesPanel />} />
                      <Route path="wishlist" element={<WishlistPanel />} />
                    </Route>
                    {upcoming.map((p) => <Route key={p} path={p} element={<Upcoming />} />)}
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
                </Suspense>
              </Router>
            </CartProvider>
          </ShopperProvider>
        </AuthProvider>
      </SettingsProvider>
    </ToastProvider>
  );
}
