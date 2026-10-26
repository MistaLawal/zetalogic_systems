import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingBag, User, X, Phone, MessageCircle } from 'lucide-react';
import { Logo } from './Logo';
import { Container, ButtonLink } from './ui';
import { announcement, company, mainNav } from '../config/site';
import { useCart } from '../context/CartContext';
import { telHref, whatsappHref } from '../lib/contact';

function AnnouncementBar() {
  if (!announcement.enabled) return null;
  return (
    <div className="bg-ink text-white">
      <Container className="flex items-center justify-center gap-3 py-2 text-[0.8125rem]">
        <p className="truncate text-white/85">{announcement.text}</p>
        <a
          href={whatsappHref('Hello Zetalogic, I need help choosing a laptop.')}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden shrink-0 font-semibold text-brand underline-offset-4 hover:underline sm:inline"
        >
          {announcement.linkLabel}
        </a>
      </Container>
    </div>
  );
}

function SearchForm({ autoFocus, onDone, id }: { autoFocus?: boolean; onDone?: () => void; id: string }) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/store?q=${encodeURIComponent(term)}` : '/store');
    onDone?.();
  };
  return (
    <form role="search" onSubmit={submit} className="relative w-full">
      <label htmlFor={id} className="sr-only">Search products</label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search laptops, software, SKU…"
        className="h-10 w-full rounded-btn border border-paper-line bg-paper-grey pl-9 pr-3 text-sm text-ink placeholder:text-muted/80 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    </form>
  );
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `relative py-2 text-[0.92rem] font-medium transition-colors ${
    isActive ? 'text-ink after:absolute after:inset-x-0 after:-bottom-[1px] after:h-[2px] after:bg-brand' : 'text-ink/70 hover:text-ink'
  }`;

export function Header() {
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const menuBtn = useRef<HTMLButtonElement>(null);

  // Close overlays on navigation.
  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [location.pathname, location.search]);

  // Lock scroll and support Escape while the mobile menu is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenuOpen(false); menuBtn.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

  return (
    <>
      <AnnouncementBar />
      <header className="sticky-header sticky z-40 border-b border-paper-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <Container className="flex h-[68px] items-center gap-4 lg:gap-6">
          <Link to="/" className="shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" aria-label="Zetalogic Systems home">
            <Logo className="w-[132px] sm:w-[148px]" />
          </Link>

          <nav aria-label="Main" className="hidden flex-1 items-center gap-5 xl:flex">
            {mainNav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/services'} className={navClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <div className="hidden w-56 lg:block xl:w-52 2xl:w-64">
              <SearchForm id="search-desktop" />
            </div>
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-btn text-ink hover:bg-paper-grey lg:hidden"
              aria-label="Search products"
              aria-expanded={searchOpen}
            >
              <Search className="h-5 w-5" />
            </button>
            <Link to="/account" className="grid h-10 w-10 place-items-center rounded-btn text-ink hover:bg-paper-grey" aria-label="Your account">
              <User className="h-5 w-5" />
            </Link>
            <Link to="/cart" className="relative grid h-10 w-10 place-items-center rounded-btn text-ink hover:bg-paper-grey" aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}>
              <ShoppingBag className="h-5 w-5" />
              <span
                aria-hidden="true"
                className={`absolute right-0.5 top-0.5 grid min-w-[18px] place-items-center rounded-full px-1 text-[0.68rem] font-bold leading-[18px] tabular-nums ${count > 0 ? 'bg-brand text-ink' : 'bg-paper-line text-muted'}`}
              >
                {count}
              </span>
            </Link>
            <ButtonLink to="/contact#enquiry" className="ml-2 hidden !py-2.5 md:inline-flex">Get a Quote</ButtonLink>
            <button
              ref={menuBtn}
              type="button"
              onClick={() => setMenuOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-btn text-ink hover:bg-paper-grey xl:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </Container>
        {searchOpen && (
          <div className="border-t border-paper-line bg-white lg:hidden">
            <Container className="py-3"><SearchForm id="search-mobile" autoFocus onDone={() => setSearchOpen(false)} /></Container>
          </div>
        )}
      </header>

      {menuOpen && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 xl:hidden">
          <button className="absolute inset-0 bg-ink/40" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <div className="mobile-sheet absolute inset-y-0 right-0 flex w-[min(88vw,380px)] flex-col bg-white shadow-2xl">
            <div className="flex h-[68px] items-center justify-between border-b border-paper-line px-5">
              <Logo className="w-[124px]" />
              <button autoFocus onClick={() => setMenuOpen(false)} className="grid h-10 w-10 place-items-center rounded-btn hover:bg-paper-grey" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-3 py-4">
              {[{ label: 'Home', to: '/' }, ...mainNav].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/' || item.to === '/services'}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-btn px-3 py-3.5 text-[1.05rem] font-semibold ${isActive ? 'bg-brand-mist text-ink shadow-[inset_3px_0_0_#4CB748]' : 'text-ink/80 hover:bg-paper-grey'}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="space-y-3 border-t border-paper-line p-5">
              <ButtonLink to="/contact#enquiry" className="w-full">Get a Quote</ButtonLink>
              <div className="grid grid-cols-2 gap-3">
                <a href={telHref} className="flex items-center justify-center gap-2 rounded-btn border border-paper-line py-2.5 text-sm font-semibold"><Phone className="h-4 w-4" />Call</a>
                <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-btn border border-paper-line py-2.5 text-sm font-semibold"><MessageCircle className="h-4 w-4" />WhatsApp</a>
              </div>
              <p className="text-center text-xs text-muted">{company.phoneDisplay}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
