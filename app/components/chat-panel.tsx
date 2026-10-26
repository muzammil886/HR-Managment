"use client";

import { useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { api } from "@/lib/client";

export default function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const data = await api<{ answer: string }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: text }),
      });
      setMessages((m) => [...m, { role: "ai", text: data.answer }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "ai", text: err instanceof Error ? err.message : "Assistant unavailable." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-12 items-center gap-2 rounded-full bg-[#147d72] px-4 font-semibold text-white shadow-lg"
      >
        <MessageCircle size={18} /> Ask assistant
      </button>
      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[460px] w-[min(100%-24px,380px)] flex-col rounded-2xl border border-[#dfe9e5] bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#edf0f6] px-4 py-3">
            <div>
              <p className="font-bold text-[#18302e]">HCM assistant</p>
              <p className="text-xs text-[#8993a7]">AI-generated · uses your access</p>
            </div>
            <button type="button" aria-label="Close assistant" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.length === 0 && (
              <p className="text-[#8993a7]">Ask about headcount, attendance, leave or policy.</p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-xl px-3 py-2 ${m.role === "user" ? "ml-8 bg-[#147d72] text-white" : "mr-8 bg-[#f4f5ff] text-[#273249]"}`}
              >
                {m.text}
                {m.role === "ai" && (
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-[#8993a7]">AI-generated</p>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-[#edf0f6] p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask a question..."
              className="premium-input py-2"
            />
            <button type="button" onClick={send} className="premium-button px-3" disabled={busy}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
