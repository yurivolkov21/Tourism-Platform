'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BotMessageSquareIcon,
  MailIcon,
  MessageCircleIcon,
  MessagesSquareIcon,
} from 'lucide-react';

import { messages } from '@tourism/i18n';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@tourism/ui';

import { ChatPanel } from '../chat/chat-panel';
import {
  buildPrefill,
  buildWhatsAppLink,
  getContactChannels,
  isLauncherHidden,
} from '../../lib/contact-launcher';

const t = messages.contactLauncher;

const rowClass =
  'hover:bg-accent hover:text-accent-foreground flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors';

/**
 * Floating contact launcher (Lily-style corner bubble): popover of contact
 * channels — AI concierge first, then env-driven externals (WhatsApp hides
 * itself until NEXT_PUBLIC_CHAT_WHATSAPP is set), then the enquiry form.
 */
export function FloatingContact() {
  const pathname = usePathname();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [prefill, setPrefill] = useState<string>(t.prefillGeneric);

  if (isLauncherHidden(pathname)) return null;

  const channels = getContactChannels({
    whatsappPhone: process.env.NEXT_PUBLIC_CHAT_WHATSAPP,
  });

  // Tour context comes from the live document at open time (titles are `%s — Nexora`),
  // so ISR pages need no server→client plumbing.
  const refreshPrefill = (open: boolean) => {
    setPopoverOpen(open);
    if (open && typeof document !== 'undefined') {
      setPrefill(
        buildPrefill({
          pathname,
          documentTitle: document.title,
          url: window.location.href,
        }),
      );
    }
  };

  const openChatPanel = () => {
    setPopoverOpen(false);
    setPanelOpen(true);
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={refreshPrefill}>
        <PopoverTrigger
          aria-label={t.triggerAria}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-dropdown fixed right-5 bottom-5 z-40 flex items-center gap-2 rounded-full px-4 py-3 transition-colors"
        >
          <MessageCircleIcon className="size-5" />
          <span className="text-sm font-medium max-sm:hidden">{t.trigger}</span>
        </PopoverTrigger>
        <PopoverContent align="end" side="top" sideOffset={12}>
          <PopoverHeader className="p-2 pb-0">
            <PopoverTitle>{t.title}</PopoverTitle>
            <PopoverDescription>{t.subtitle}</PopoverDescription>
          </PopoverHeader>
          <nav className="flex flex-col gap-1">
            {channels.map((channel) => {
              if (channel.kind === 'bot') {
                return (
                  <button
                    key={channel.kind}
                    type="button"
                    onClick={openChatPanel}
                    className={rowClass}
                  >
                    <BotMessageSquareIcon className="text-primary mt-0.5 size-4 shrink-0" />
                    <span>
                      <span className="block font-medium">{t.bot.label}</span>
                      <span className="text-muted-foreground block text-xs">
                        {t.bot.hint}
                      </span>
                    </span>
                  </button>
                );
              }
              if (channel.kind === 'whatsapp') {
                return (
                  <a
                    key={channel.kind}
                    href={buildWhatsAppLink(channel.phone, prefill)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={rowClass}
                  >
                    <MessagesSquareIcon className="text-primary mt-0.5 size-4 shrink-0" />
                    <span>
                      <span className="block font-medium">
                        {t.whatsapp.label}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        {t.whatsapp.hint}
                      </span>
                    </span>
                  </a>
                );
              }
              return (
                <Link
                  key={channel.kind}
                  href={channel.href}
                  className={rowClass}
                >
                  <MailIcon className="text-primary mt-0.5 size-4 shrink-0" />
                  <span>
                    <span className="block font-medium">{t.enquiry.label}</span>
                    <span className="text-muted-foreground block text-xs">
                      {t.enquiry.hint}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </PopoverContent>
      </Popover>
      <ChatPanel open={panelOpen} onOpenChange={setPanelOpen} />
    </>
  );
}

export default FloatingContact;
