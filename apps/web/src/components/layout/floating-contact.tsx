import { MessageCircleIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

// Fixed call-to-action bubble (Lily-style corner contact), honest single action → enquiry.
export function FloatingContact() {
  return (
    <a
      href="#contact"
      aria-label={messages.nav.planTrip}
      className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-dropdown fixed right-5 bottom-5 z-40 flex items-center gap-2 rounded-full px-4 py-3 transition-colors"
    >
      <MessageCircleIcon className="size-5" />
      <span className="text-sm font-medium max-sm:hidden">{messages.nav.planTrip}</span>
    </a>
  );
}

export default FloatingContact;
