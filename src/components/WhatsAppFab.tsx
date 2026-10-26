import { MessageCircle } from 'lucide-react';
import { whatsappHref } from '../lib/contact';

export function WhatsAppFab() {
  return (
    <a
      href={whatsappHref('Hello Zetalogic Systems, I have a question.')}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fab fixed z-30 grid h-14 w-14 place-items-center rounded-full bg-brand text-ink shadow-lift hover:bg-[#43A63F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
    >
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
    </a>
  );
}
