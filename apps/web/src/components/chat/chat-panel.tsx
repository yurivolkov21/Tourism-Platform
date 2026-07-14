'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { RotateCcwIcon, SendIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { messages as i18n } from '@tourism/i18n';
import {
  Bubble,
  BubbleContent,
  Button,
  Input,
  Marker,
  MarkerContent,
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@tourism/ui';

import {
  buildWhatsAppLink,
  normalizeWhatsAppPhone,
} from '../../lib/contact-launcher';
import { createClient } from '../../lib/supabase/client';
import {
  getOrCreateConversationId,
  resetConversationId,
} from './conversation-store';

const t = i18n.chatBot;
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await createClient().auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

function toolActivityLabel(partType: string): string {
  const name = partType.replace(/^tool-/, '');
  const labels: Record<string, string> = t.toolActivity;
  return labels[name] ?? t.thinking;
}

/** "Talk to a human" → WhatsApp when configured, else the enquiry form. */
function humanHref(): string {
  const phone = normalizeWhatsAppPhone(process.env.NEXT_PUBLIC_CHAT_WHATSAPP);
  return phone
    ? buildWhatsAppLink(phone, i18n.contactLauncher.prefillGeneric)
    : '/contact';
}

export function ChatPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const conversationIdRef = useRef<string | null>(null);
  if (conversationIdRef.current === null && typeof window !== 'undefined') {
    conversationIdRef.current = getOrCreateConversationId();
  }

  const [input, setInput] = useState('');
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: `${API_BASE}/api/v1/chat/messages`,
        prepareSendMessagesRequest: async ({ messages }) => {
          const token = await getAccessToken();
          return {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: {
              conversationId: conversationIdRef.current ?? undefined,
              // Server-authoritative history: only the newest message goes up.
              message: messages[messages.length - 1],
            },
          };
        },
      }),
  );
  const { messages, sendMessage, setMessages, status, error, regenerate } =
    useChat({ transport });

  // Restore the persisted thread once, when the panel first opens.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!open || restoredRef.current) return;
    restoredRef.current = true;
    const id = conversationIdRef.current;
    if (!id) return;
    void (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch(
          `${API_BASE}/api/v1/chat/conversations/${id}/messages`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            cache: 'no-store',
          },
        );
        if (!res.ok) {
          // 404 = never used; 403 = someone else's thread — mint a fresh id.
          if (res.status === 403)
            conversationIdRef.current = resetConversationId();
          return;
        }
        const json = (await res.json()) as {
          data?: { messages?: UIMessage[] };
        };
        if (json.data?.messages?.length) setMessages(json.data.messages);
      } catch {
        // History restore is best-effort — a fresh panel still works.
      }
    })();
  }, [open, setMessages]);

  const busy = status === 'submitted' || status === 'streaming';

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    void sendMessage({ text });
    setInput('');
  };

  const startOver = () => {
    conversationIdRef.current = resetConversationId();
    setMessages([]);
    setInput('');
  };

  const unavailable = error?.message.includes('CHAT_UNAVAILABLE') ?? false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b p-4">
          <SheetTitle>{t.title}</SheetTitle>
          <SheetDescription>{t.disclaimer}</SheetDescription>
        </SheetHeader>

        <MessageScrollerProvider>
          <MessageScroller className="flex-1">
            <MessageScrollerViewport className="p-4">
              <MessageScrollerContent className="gap-4">
                {messages.length === 0 && (
                  <div className="flex flex-col gap-3">
                    <Bubble variant="muted" align="start">
                      <BubbleContent>{t.greeting}</BubbleContent>
                    </Bubble>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void sendMessage({ text: t.suggestions.findTour })
                        }
                      >
                        {t.suggestions.findTour}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void sendMessage({ text: t.suggestions.askIncluded })
                        }
                      >
                        {t.suggestions.askIncluded}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        render={<a href={humanHref()} />}
                      >
                        {t.suggestions.talkHuman}
                      </Button>
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <MessageScrollerItem key={message.id}>
                    {message.role === 'user' ? (
                      <Bubble variant="tinted" align="end">
                        <BubbleContent>
                          {message.parts
                            .filter((part) => part.type === 'text')
                            .map((part, i) => (
                              <span key={i}>
                                {(part as { text: string }).text}
                              </span>
                            ))}
                        </BubbleContent>
                      </Bubble>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {message.parts.map((part, i) => {
                          if (part.type === 'text') {
                            return (
                              <Bubble key={i} variant="muted" align="start">
                                <BubbleContent className="prose prose-sm max-w-none dark:prose-invert">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {(part as { text: string }).text}
                                  </ReactMarkdown>
                                </BubbleContent>
                              </Bubble>
                            );
                          }
                          if (part.type.startsWith('tool-')) {
                            return (
                              <Marker key={i} variant="separator">
                                <MarkerContent>
                                  {toolActivityLabel(part.type)}
                                </MarkerContent>
                              </Marker>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}
                  </MessageScrollerItem>
                ))}

                {status === 'submitted' && (
                  <Marker variant="separator">
                    <MarkerContent>{t.thinking}</MarkerContent>
                  </Marker>
                )}

                {error && (
                  <Bubble variant="destructive" align="start">
                    <BubbleContent className="flex flex-col items-start gap-2">
                      <span>{unavailable ? t.unavailable : t.error}</span>
                      {!unavailable && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void regenerate()}
                        >
                          {t.retry}
                        </Button>
                      )}
                    </BubbleContent>
                  </Bubble>
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>

        <form
          noValidate
          onSubmit={submit}
          className="flex items-center gap-2 border-t p-3"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t.startOver}
            title={t.startOver}
            onClick={startOver}
          >
            <RotateCcwIcon className="size-4" />
          </Button>
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t.inputPlaceholder}
            aria-label={t.inputPlaceholder}
            maxLength={2000}
          />
          <Button
            type="submit"
            size="icon-sm"
            aria-label={t.sendAria}
            disabled={busy || !input.trim()}
          >
            <SendIcon className="size-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default ChatPanel;
