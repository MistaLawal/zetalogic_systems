import { useState, type FormEvent, type ReactNode } from 'react';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { Button, ButtonA } from './ui';
import { serviceOptions } from '../config/site';
import { isEmail, isNigerianPhone, submitEnquiry, type EnquiryPayload } from '../lib/forms';
import { parseNairaToKobo } from '../lib/money';
import { whatsappHref } from '../lib/contact';

type Fields = {
  fullName: string; email: string; phone: string; businessName: string;
  service: string; budget: string; description: string; contactMethod: EnquiryPayload['contactMethod'];
};
type Errors = Partial<Record<keyof Fields, string>>;
type Status = { kind: 'idle' | 'sending' | 'sent' } | { kind: 'not_configured' } | { kind: 'error'; message: string };

const empty: Fields = { fullName: '', email: '', phone: '', businessName: '', service: '', budget: '', description: '', contactMethod: 'WhatsApp' };

function validate(f: Fields): Errors {
  const e: Errors = {};
  if (f.fullName.trim().length < 2) e.fullName = 'Enter your full name.';
  if (!isEmail(f.email)) e.email = 'Enter an email address like name@example.com.';
  if (!isNigerianPhone(f.phone)) e.phone = 'Enter a Nigerian number like 0802 123 4567.';
  if (!f.service) e.service = 'Choose the service you need.';
  if (f.budget && parseNairaToKobo(f.budget) === null) e.budget = 'Enter an amount in naira, for example 500,000.';
  if (f.description.trim().length < 20) e.description = 'Tell us a little more: at least 20 characters.';
  return e;
}

function Field({ id, label, optional, error, children }: { id: string; label: string; optional?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-[0.88rem] font-semibold text-ink">
        {label} {optional && <span className="font-normal text-muted">(optional)</span>}
      </label>
      {children}
      {error && <p id={`${id}-err`} className="mt-1.5 text-[0.82rem] text-[#B42318]">{error}</p>}
    </div>
  );
}

const input = 'w-full rounded-btn border bg-white px-3.5 py-3 text-[0.95rem] text-ink placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-brand/30';
const border = (err?: string) => (err ? 'border-[#B42318]' : 'border-paper-line focus:border-brand');

export function EnquiryForm({ defaultService = '' }: { defaultService?: string }) {
  const [f, setF] = useState<Fields>({ ...empty, service: defaultService });
  const [errors, setErrors] = useState<Errors>({});
  const [hp, setHp] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };
  const aria = (k: keyof Fields) => ({ 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `enq-${k}-err` : undefined });

  const whatsappMessage = () =>
    [
      `Hello Zetalogic, I'd like to discuss a project.`,
      `Name: ${f.fullName}`, `Service: ${f.service}`,
      f.businessName && `Business: ${f.businessName}`,
      f.budget && `Budget: ₦${f.budget}`,
      `Details: ${f.description}`,
    ].filter(Boolean).join('\n');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate(f);
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`enq-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setStatus({ kind: 'sending' });
    const res = await submitEnquiry({
      fullName: f.fullName.trim(), email: f.email.trim(), phone: f.phone.trim(),
      businessName: f.businessName.trim() || undefined, service: f.service,
      budgetKobo: f.budget ? parseNairaToKobo(f.budget) : null,
      description: f.description.trim(), contactMethod: f.contactMethod, website: hp,
    });
    if (res.ok) setStatus({ kind: 'sent' });
    else if (res.reason === 'not_configured') setStatus({ kind: 'not_configured' });
    else setStatus({ kind: 'error', message: res.message });
  };

  if (status.kind === 'sent') {
    return (
      <div role="status" className="rounded-card border border-brand/40 bg-brand-mist p-8">
        <CheckCircle2 className="h-8 w-8 text-brand-deep" aria-hidden="true" />
        <h3 className="mt-4 text-h3 text-ink">Enquiry sent</h3>
        <p className="mt-2 text-muted">Thanks, {f.fullName.split(' ')[0]}. We’ll reply by {f.contactMethod.toLowerCase()} within one working day.</p>
        <Button variant="outline" className="mt-6" onClick={() => { setF({ ...empty }); setStatus({ kind: 'idle' }); }}>Send another enquiry</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="enq-fullName" label="Full name" error={errors.fullName}>
          <input id="enq-fullName" autoComplete="name" value={f.fullName} onChange={(e) => set('fullName', e.target.value)} className={`${input} ${border(errors.fullName)}`} {...aria('fullName')} />
        </Field>
        <Field id="enq-businessName" label="Business name" optional>
          <input id="enq-businessName" autoComplete="organization" value={f.businessName} onChange={(e) => set('businessName', e.target.value)} className={`${input} ${border()}`} />
        </Field>
        <Field id="enq-email" label="Email address" error={errors.email}>
          <input id="enq-email" type="email" autoComplete="email" value={f.email} onChange={(e) => set('email', e.target.value)} className={`${input} ${border(errors.email)}`} {...aria('email')} />
        </Field>
        <Field id="enq-phone" label="Phone number" error={errors.phone}>
          <input id="enq-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0802 123 4567" value={f.phone} onChange={(e) => set('phone', e.target.value)} className={`${input} ${border(errors.phone)}`} {...aria('phone')} />
        </Field>
        <Field id="enq-service" label="Service required" error={errors.service}>
          <select id="enq-service" value={f.service} onChange={(e) => set('service', e.target.value)} className={`${input} ${border(errors.service)}`} {...aria('service')}>
            <option value="">Choose a service</option>
            {serviceOptions.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field id="enq-budget" label="Estimated budget" optional error={errors.budget}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">₦</span>
            <input id="enq-budget" inputMode="decimal" placeholder="500,000" value={f.budget} onChange={(e) => set('budget', e.target.value)} className={`${input} ${border(errors.budget)} pl-8 tabular-nums`} {...aria('budget')} />
          </div>
        </Field>
      </div>
      <Field id="enq-description" label="Project description" error={errors.description}>
        <textarea id="enq-description" rows={5} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="What do you need, who is it for, and when do you need it?" className={`${input} ${border(errors.description)} resize-y`} {...aria('description')} />
      </Field>
      <fieldset>
        <legend className="mb-2 text-[0.88rem] font-semibold text-ink">Preferred contact method</legend>
        <div className="flex flex-wrap gap-2">
          {(['WhatsApp', 'Phone call', 'Email'] as const).map((m) => (
            <label key={m} className={`cursor-pointer rounded-btn border px-4 py-2.5 text-[0.9rem] font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${f.contactMethod === m ? 'border-ink bg-ink text-white' : 'border-paper-line bg-white text-ink hover:border-ink/40'}`}>
              <input type="radio" name="contactMethod" value={m} checked={f.contactMethod === m} onChange={() => set('contactMethod', m)} className="sr-only" />
              {m}
            </label>
          ))}
        </div>
      </fieldset>
      <input type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} className="hidden" aria-hidden="true" name="website" />

      {status.kind === 'not_configured' && (
        <div role="alert" className="rounded-card border border-paper-line bg-paper-grey p-5">
          <p className="font-semibold text-ink">Online enquiries aren’t switched on yet.</p>
          <p className="mt-1 text-[0.92rem] text-muted">Your details are still on this page. Send them to us on WhatsApp in one tap.</p>
          <ButtonA href={whatsappHref(whatsappMessage())} className="mt-4"><MessageCircle className="h-4 w-4" aria-hidden="true" />Send on WhatsApp</ButtonA>
        </div>
      )}
      {status.kind === 'error' && <p role="alert" className="text-[0.9rem] text-[#B42318]">{status.message}</p>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" disabled={status.kind === 'sending'} className="sm:min-w-[200px]">
          {status.kind === 'sending' ? 'Sending…' : 'Send enquiry'}
        </Button>
        <p className="text-[0.82rem] text-muted">We only use these details to reply to your enquiry.</p>
      </div>
    </form>
  );
}
