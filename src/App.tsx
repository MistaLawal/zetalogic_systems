import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import ServiceDetail from './pages/ServiceDetail';
import Software from './pages/Software';
import Contact from './pages/Contact';
import Upcoming from './pages/Upcoming';
import NotFound from './pages/NotFound';

const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter;
const upcoming = ['/store/*', '/cart', '/checkout', '/account/*', '/track-order', '/blog/*', '/faq', '/policies/*'];

export default function App() {
  return (
    <CartProvider>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="services" element={<Services />} />
            <Route path="services/:slug" element={<ServiceDetail />} />
            <Route path="software" element={<Software />} />
            <Route path="contact" element={<Contact />} />
            {upcoming.map((p) => <Route key={p} path={p} element={<Upcoming />} />)}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </CartProvider>
  );
}
