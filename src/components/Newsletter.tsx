import { useState, type FormEvent } from 'react';
import { Container } from './ui';
import { isEmail, subscribeNewsletter } from '../lib/forms';

type State = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done' } | { kind: 'error'; message: string };

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [state, setState] = useState<State>({ kind: 'idle' });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) return setFieldError('Enter an email address like name@example.com.');
    if (!consent) return setFieldError('Tick the box to agree to receive emails from us.');
    setFieldError(null);
    setState({ kind: 'sending' });
    const res = await subscribeNewsletter({ email: email.trim(), consent, website: hp });
    if (res.ok) setState({ kind: 'done' });
    else setState({ kind: 'error', message: res.reason === 'not_configured' ? 'Email updates are not open yet. Check back soon.' : res.message });
  };

  return (
    <div className="border-b border-white/10">
      <Container className="grid gap-8 py-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <h2 className="text-[1.6rem] font-extrabold tracking-tight text-white">Get new stock and practical tech tips by email</h2>
          <p className="mt-2 max-w-prose text-white/65">New arrivals, price drops on laptops, and short guides on software and business tools. Unsubscribe any time.</p>
        </div>
        {state.kind === 'done' ? (
          <p role="status" className="rounded-card border border-brand/40 bg-brand/10 p-5 text-white">You’re subscribed. Look out for a confirmation email from {`zetalogicsystems@gmail.com`}.</p>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor="nl-email" className="sr-only">Email address</label>
              <input
                id="nl-email" type="email" autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!fieldError && !isEmail(email)} aria-describedby="nl-msg"
                placeholder="you@example.com"
                className="h-12 flex-1 rounded-btn border border-white/20 bg-white/5 px-4 text-white placeholder:text-white/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
              <button type="submit" disabled={state.kind === 'sending'} className="h-12 rounded-btn bg-brand px-6 font-semibold text-ink hover:bg-[#43A63F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60">
                {state.kind === 'sending' ? 'Subscribing…' : 'Subscribe'}
              </button>
            </div>
            {/* Honeypot: hidden from people, filled by bots. */}
            <input type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} className="hidden" aria-hidden="true" name="website" />
            <label htmlFor="nl-consent" className="flex items-start gap-3 text-[0.85rem] text-white/65">
              <input id="nl-consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#4CB748]" />
              I agree to receive marketing emails from Zetalogic Systems. See our privacy policy for how we use your data.
            </label>
            <p id="nl-msg" role="alert" className="min-h-[1.25rem] text-[0.85rem] text-[#F5A3A3]">
              {fieldError ?? (state.kind === 'error' ? state.message : '')}
            </p>
          </form>
        )}
      </Container>
    </div>
  );
}
