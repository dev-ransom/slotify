"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";

type ChatMessage = {
  role: "user" | "model";
  text: string;
};

const INITIAL_MESSAGE: ChatMessage = {
  role: "model",
  text: "Hi! I can help you find a service and book a time. What are you looking for?",
};

// Matches a checkout path like "/checkout/cln8x..." anywhere in the assistant's
// reply text, so it can be rendered as a real clickable link instead of dead text —
// the assistant is instructed to mention this path after a successful hold_slot call.
const CHECKOUT_LINK_PATTERN = /\/checkout\/[a-zA-Z0-9_-]+/g;

function renderMessageText(text: string) {
  const parts = text.split(CHECKOUT_LINK_PATTERN);
  const matches = text.match(CHECKOUT_LINK_PATTERN) ?? [];

  if (matches.length === 0) return text;

  return parts.reduce<React.ReactNode[]>((acc, part, i) => {
    acc.push(part);
    if (matches[i]) {
      acc.push(
        <Link
          key={i}
          href={matches[i]}
          className="font-medium underline underline-offset-2 text-brand-300 hover:text-brand-200"
        >
          Continue to checkout →
        </Link>,
      );
    }
    return acc;
  }, []);
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isSending]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", text: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok) throw new Error("Assistant request failed");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "model", text: data.reply ?? "Sorry, I didn't catch that." },
      ]);
    } catch {
      setError("Couldn't reach the assistant. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open booking assistant"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-card-hover transition-transform hover:scale-105 hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-20" />
          <MessageCircle size={24} strokeWidth={2} aria-hidden="true" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-128 w-96 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-card border border-surface-border bg-surface-raised shadow-card-hover">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-surface-border bg-surface px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <span
                className="h-2 w-2 rounded-full bg-brand-400"
                aria-hidden="true"
              />
              <h2 className="text-sm font-medium text-neutral-50">
                Booking Assistant
              </h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close booking assistant"
              className="rounded-card p-1 text-neutral-400 transition-colors hover:bg-surface-border hover:text-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-label="Conversation with booking assistant"
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-card px-3.5 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-sm bg-brand-600 text-white"
                      : "rounded-bl-sm bg-surface text-neutral-100 border border-surface-border"
                  }`}
                >
                  {renderMessageText(m.text)}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start" aria-hidden="true">
                <div className="flex items-center gap-1.5 rounded-card rounded-bl-sm bg-surface border border-surface-border px-3.5 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500" />
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-card bg-accent-rose/10 border border-accent-rose/30 px-3 py-2 text-xs text-accent-rose"
              >
                {error}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-surface-border p-3">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              aria-label="Message the booking assistant"
              placeholder="Ask about a service or time..."
              className="flex-1 rounded-pill border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
            />
            <button
              onClick={handleSend}
              disabled={isSending || !input.trim()}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-opacity hover:bg-brand-700 disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              {isSending ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Send size={15} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
