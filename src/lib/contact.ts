import { company } from '../config/site';

export const telHref = `tel:${company.phoneTel}`;
export const mailHref = `mailto:${company.email}`;

/** WhatsApp click-to-chat link using the international format (no "+" or leading 0). */
export function whatsappHref(message?: string) {
  const base = `https://wa.me/${company.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const addressLine = `${company.address.street}, ${company.address.area}, ${company.address.city}, ${company.address.country}`;
