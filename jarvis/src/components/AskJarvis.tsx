"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { MessageSquare, Send, X } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Why am I down today?",
  "Am I too concentrated in tech?",
  "How should I invest my extra cash?",
  "What should I watch this week?",
];

/** Minimal formatting: **bold** and line breaks. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-ink">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export function AskJarvis({ onThinking }: { onThinking: (b: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [msgs]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: text.trim() }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    onThinking(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs([...next, { role: "assistant", content: acc }]);
      }
    } catch (e) {
      setMsgs([...next, { role: "assistant", content: `⚠ ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
      onThinking(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-panel px-5 py-3 text-sm font-medium text-accent shadow-[0_0_30px_rgba(79,209,255,0.25)] transition hover:bg-accent/10"
        >
          <MessageSquare size={16} /> Ask Jarvis
        </button>
      )}
      {open && (
        <div className="panel fixed inset-x-3 bottom-3 z-40 flex h-[70vh] flex-col sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[420px]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className={`flex items-center gap-2 ${busy ? "thinking" : ""}`}>
              <div className="reactor !h-5 !w-5" aria-hidden />
              <span className="font-mono text-sm tracking-[0.25em] text-accent">JARVIS</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-ink-3 hover:text-ink" aria-label="Close chat">
              <X size={18} />
            </button>
          </div>
          <div ref={scroller} className="scroll-thin flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.length === 0 && (
              <div>
                <p className="text-sm text-ink-2">
                  Ask me anything about your money. I can see your accounts and holdings, and I can search the news.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-2 transition hover:border-accent/40 hover:text-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                <div
                  className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user" ? "bg-accent/15 text-ink" : "border border-line bg-bg/50 text-ink-2"
                  }`}
                >
                  {m.content ? <Rich text={m.content} /> : <span className="animate-pulse text-ink-3">Thinking…</span>}
                </div>
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-line p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Should I rebalance?"
              className="flex-1 rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-accent/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-lg bg-accent/15 px-3 text-accent transition hover:bg-accent/25 disabled:opacity-40"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
