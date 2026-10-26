import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, MailCheck } from 'lucide-react';
import { Container, Button } from '../../components/ui';
import { Logo } from '../../components/Logo';
import { useAuth } from '../../context/AuthContext';
import { friendlyError, supabase } from '../../lib/supabase';
import { isEmail, isNigerianPhone } from '../../lib/forms';
import { usePageMeta } from '../../lib/seo';

const input = 'w-full rounded-btn border border-paper-line bg-white px-3.5 py-3 text-[0.95rem] text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 aria-[invalid=true]:border-[#B42318]';

/** Only allow same-site relative paths as post-login destinations. */
export function safeNext(next: string | null, fallback = '/account') {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

/** Where auth emails send people back to (works with hash and path routing). */
function redirectTo(path: string) {
  const base = window.location.origin + window.location.pathname.replace(/\/$/, '');
  return import.meta.env.VITE_ROUTER === 'hash' ? `${base}#${path}` : `${window.location.origin}${path}`;
}

function Shell({ title, intro, children, footer }: { title: string; intro?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="bg-paper-grey py-12 sm:py-20">
      <Container className="max-w-[30rem]">
        <div className="rounded-card border border-paper-line bg-white p-6 shadow-lift sm:p-9">
          <Logo className="w-[120px]" />
          <h1 className="mt-6 text-[1.6rem] font-extrabold tracking-tight text-ink">{title}</h1>
          {intro && <p className="mt-2 text-muted">{intro}</p>}
          <div className="mt-7">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-[0.92rem] text-muted">{footer}</div>}
      </Container>
    </section>
  );
}

function Field({ id, label, error, children, hint }: { id: string; label: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className="text-[0.88rem] font-semibold text-ink">{label}</label>
        {hint}
      </div>
      {children}
      {error && <p id={`${id}-err`} className="mt-1.5 text-[0.82rem] text-[#B42318]">{error}</p>}
    </div>
  );
}

function PasswordInput({ id, value, onChange, autoComplete, invalid }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete}
        aria-invalid={invalid} aria-describedby={invalid ? `${id}-err` : undefined} className={`${input} pr-11`} />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-muted hover:text-ink"
        aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function NotConfigured() {
  return <p role="alert" className="rounded-btn bg-paper-grey p-4 text-[0.92rem] text-muted">Accounts aren’t available yet. You can still browse and contact us on WhatsApp.</p>;
}

export function SignIn() {
  usePageMeta('Sign in', 'Sign in to your Zetalogic Systems account.');
  const { user, configured } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isEmail(email) || !password) return setError('Enter your email address and password.');
    setBusy(true); setError(null);
    const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setError(friendlyError(error, 'Sign in failed. Try again.'));
    navigate(next, { replace: true });
  };

  return (
    <Shell title="Sign in" intro="Track orders, save products and check out faster."
      footer={<>New to Zetalogic? <Link to={`/account/sign-up${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand-deep underline underline-offset-4">Create an account</Link></>}>
      {!configured ? <NotConfigured /> : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <Field id="si-email" label="Email address">
            <input id="si-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          </Field>
          <Field id="si-password" label="Password" hint={<Link to="/account/forgot-password" className="text-[0.82rem] font-semibold text-brand-deep hover:underline">Forgot password?</Link>}>
            <PasswordInput id="si-password" value={password} onChange={setPassword} autoComplete="current-password" />
          </Field>
          {error && <p role="alert" className="text-[0.9rem] text-[#B42318]">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Sign in'}</Button>
        </form>
      )}
    </Shell>
  );
}

export function SignUp() {
  usePageMeta('Create an account', 'Create a Zetalogic Systems customer account.');
  const { user, configured } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [f, setF] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (user && !sentTo) return <Navigate to={next} replace />;

  const set = (k: keyof typeof f, v: string) => { setF((p) => ({ ...p, [k]: v })); setErrors((p) => ({ ...p, [k]: '' })); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (f.fullName.trim().length < 2) errs.fullName = 'Enter your full name.';
    if (!isEmail(f.email)) errs.email = 'Enter an email address like name@example.com.';
    if (f.phone && !isNigerianPhone(f.phone)) errs.phone = 'Enter a Nigerian number like 0802 123 4567, or leave it blank.';
    if (f.password.length < 8) errs.password = 'Use at least 8 characters.';
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    setBusy(true); setFormError(null);
    const { data, error } = await supabase!.auth.signUp({
      email: f.email.trim(), password: f.password,
      options: { data: { full_name: f.fullName.trim(), phone: f.phone.trim() }, emailRedirectTo: redirectTo(next) },
    });
    setBusy(false);
    if (error) return setFormError(friendlyError(error, 'We couldn’t create your account. Try again.'));
    if (!data.session) setSentTo(f.email.trim()); // email confirmation required
  };

  if (sentTo) {
    return (
      <Shell title="Check your email">
        <div className="flex gap-4">
          <MailCheck className="h-8 w-8 shrink-0 text-brand-deep" aria-hidden="true" />
          <p className="text-muted">We sent a confirmation link to <strong className="text-ink">{sentTo}</strong>. Open it on this device to finish creating your account. It can take a minute to arrive; check spam if you don’t see it.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Create your account" intro="Save products, keep delivery addresses and see your orders in one place."
      footer={<>Already have an account? <Link to="/account/sign-in" className="font-semibold text-brand-deep underline underline-offset-4">Sign in</Link></>}>
      {!configured ? <NotConfigured /> : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <Field id="su-name" label="Full name" error={errors.fullName}>
            <input id="su-name" autoComplete="name" value={f.fullName} onChange={(e) => set('fullName', e.target.value)} className={input} aria-invalid={!!errors.fullName} />
          </Field>
          <Field id="su-email" label="Email address" error={errors.email}>
            <input id="su-email" type="email" autoComplete="email" value={f.email} onChange={(e) => set('email', e.target.value)} className={input} aria-invalid={!!errors.email} />
          </Field>
          <Field id="su-phone" label="Phone number (optional)" error={errors.phone}>
            <input id="su-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0802 123 4567" value={f.phone} onChange={(e) => set('phone', e.target.value)} className={input} aria-invalid={!!errors.phone} />
          </Field>
          <Field id="su-password" label="Password" error={errors.password}>
            <PasswordInput id="su-password" value={f.password} onChange={(v) => set('password', v)} autoComplete="new-password" invalid={!!errors.password} />
            {!errors.password && <p className="mt-1.5 text-[0.82rem] text-muted">At least 8 characters.</p>}
          </Field>
          {formError && <p role="alert" className="text-[0.9rem] text-[#B42318]">{formError}</p>}
          <Button type="submit" disabled={busy} className="w-full">{busy ? 'Creating account…' : 'Create account'}</Button>
          <p className="text-[0.8rem] text-muted">By creating an account you agree to our <Link to="/policies/terms" className="underline">terms</Link> and <Link to="/policies/privacy" className="underline">privacy policy</Link>.</p>
        </form>
      )}
    </Shell>
  );
}

export function ForgotPassword() {
  usePageMeta('Reset your password', 'Get a link to reset your Zetalogic Systems password.');
  const { configured } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) return setError('Enter the email address you signed up with.');
    setBusy(true); setError(null);
    const { error } = await supabase!.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectTo('/account/reset-password') });
    setBusy(false);
    if (error) return setError(friendlyError(error, 'We couldn’t send the email. Try again.'));
    setSent(true); // same message whether or not the account exists
  };

  return (
    <Shell title="Reset your password" intro={sent ? undefined : 'Enter your email and we’ll send you a link to choose a new password.'}
      footer={<Link to="/account/sign-in" className="font-semibold text-brand-deep underline underline-offset-4">Back to sign in</Link>}>
      {!configured ? <NotConfigured /> : sent ? (
        <p role="status" className="text-muted">If an account exists for <strong className="text-ink">{email}</strong>, a reset link is on its way. The link expires after one hour.</p>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <Field id="fp-email" label="Email address">
            <input id="fp-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          </Field>
          {error && <p role="alert" className="text-[0.9rem] text-[#B42318]">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">{busy ? 'Sending…' : 'Send reset link'}</Button>
        </form>
      )}
    </Shell>
  );
}

export function ResetPassword() {
  usePageMeta('Choose a new password', 'Set a new password for your account.');
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [waited, setWaited] = useState(false);
  useEffect(() => { const t = setTimeout(() => setWaited(true), 2500); return () => clearTimeout(t); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setError('Use at least 8 characters.');
    if (pw !== pw2) return setError('The two passwords don’t match.');
    setBusy(true); setError(null);
    const { error } = await supabase!.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setError(friendlyError(error, 'We couldn’t update your password. Request a new link and try again.'));
    navigate('/account?updated=password', { replace: true });
  };

  if (!user) {
    return (
      <Shell title="Choose a new password">
        {!ready || !waited ? <p className="text-muted">Checking your reset link…</p> : (
          <p role="alert" className="text-muted">This reset link is invalid or has expired. <Link to="/account/forgot-password" className="font-semibold text-brand-deep underline">Request a new link</Link>.</p>
        )}
      </Shell>
    );
  }

  return (
    <Shell title="Choose a new password">
      <form onSubmit={submit} noValidate className="space-y-5">
        <Field id="rp-1" label="New password"><PasswordInput id="rp-1" value={pw} onChange={setPw} autoComplete="new-password" /></Field>
        <Field id="rp-2" label="Confirm new password"><PasswordInput id="rp-2" value={pw2} onChange={setPw2} autoComplete="new-password" /></Field>
        {error && <p role="alert" className="text-[0.9rem] text-[#B42318]">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Saving…' : 'Save new password'}</Button>
      </form>
    </Shell>
  );
}
