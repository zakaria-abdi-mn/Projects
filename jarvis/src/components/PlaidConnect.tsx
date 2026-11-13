"use client";
import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { mutate } from "swr";
import { Building2, LineChart, Plus } from "lucide-react";

type Kind = "bank" | "brokerage";

function LinkLauncher({ token, kind, onDone }: { token: string; kind: Kind; onDone: () => void }) {
  const { open, ready } = usePlaidLink({
    token,
    onSuccess: async (publicToken, metadata) => {
      await fetch("/api/plaid/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicToken, institution: metadata.institution?.name, kind }),
      });
      await mutate(() => true); // refresh every SWR key
      onDone();
    },
    onExit: onDone,
  });
  useEffect(() => {
    if (ready) open();
  }, [ready, open]);
  return null;
}

export function ConnectButtons() {
  const [link, setLink] = useState<{ token: string; kind: Kind } | null>(null);
  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async (kind: Kind) => {
    setBusy(kind);
    setError(null);
    try {
      const r = await fetch("/api/plaid/link-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setLink({ token: j.linkToken, kind });
    } catch (e) {
      setError((e as Error).message.includes("not configured") ? "Add Plaid keys to .env.local first" : (e as Error).message);
    } finally {
      setBusy(null);
    }
  }, []);

  const btn =
    "inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent transition hover:bg-accent/15 disabled:opacity-50";
  return (
    <div className="relative flex items-center gap-2">
      <button className={btn} onClick={() => start("bank")} disabled={!!busy}>
        <Plus size={14} />
        <Building2 size={14} /> Bank
      </button>
      <button className={btn} onClick={() => start("brokerage")} disabled={!!busy}>
        <Plus size={14} />
        <LineChart size={14} /> Brokerage
      </button>
      {error && (
        <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-down/40 bg-panel p-3 text-xs text-down">
          {error}
        </div>
      )}
      {link && <LinkLauncher token={link.token} kind={link.kind} onDone={() => setLink(null)} />}
    </div>
  );
}
