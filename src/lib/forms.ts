// Form submission service. Posts to Supabase Edge Functions that validate on
// the server, rate-limit by hashed IP, check the honeypot and write to
// `service_enquiries` / `newsletter_subscriptions`. If the backend is not
// configured, submissions report `not_configured` and the UI offers WhatsApp.

export type SubmitResult =
  | { ok: true }
  | { ok: false; reason: 'not_configured' | 'network' | 'rejected'; message: string };

import { supabaseKey, supabaseUrl } from './supabase';

const backendUrl = supabaseUrl;

async function post(fn: string, payload: unknown): Promise<SubmitResult> {
  if (!backendUrl) {
    return {
      ok: false,
      reason: 'not_configured',
      message: 'Online submissions are not switched on yet.',
    };
  }
  try {
    const res = await fetch(`${backendUrl}/functions/v1/${fn}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey ?? '',
      },
      body: JSON.stringify(payload),
    });
    if (res.status === 429) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, reason: 'rejected', message: body.error ?? 'Too many attempts. Try again later.' };
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, reason: 'rejected', message: body.error ?? 'The form could not be sent. Check the fields and try again.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'network', message: 'No connection. Check your internet and try again.' };
  }
}

export type EnquiryPayload = {
  fullName: string;
  email: string;
  phone: string;
  businessName?: string;
  service: string;
  budgetKobo?: number | null;
  description: string;
  contactMethod: 'Phone call' | 'WhatsApp' | 'Email';
  website?: string; // honeypot: must stay empty
};

export const submitEnquiry = (p: EnquiryPayload) => post('submit-enquiry', p);
export const subscribeNewsletter = (p: { email: string; consent: boolean; website?: string }) =>
  post('newsletter-subscribe', p);

// Shared client-side checks (the server repeats them; never trust the client).
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
/** Accepts Nigerian numbers like 0702..., +234702..., 234702... */
export const isNigerianPhone = (v: string) => /^(\+?234|0)[789][01]\d{8}$/.test(v.replace(/[\s-]/g, ''));
