"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, ExternalLink, Loader2, Mail, Send, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { sendInvitationsAction, sendTestInvitationAction, type InviteResult } from "@/actions/admin/invitations";
import { MAX_INVITES_PER_SEND, parseEmailList } from "@/lib/email-list";

/** Bouton « Inviter » de l'admin : saisie des adresses, puis envoi de l'e-mail d'invitation. */
export function InviteButton({ size = "md" }: { size?: "md" | "sm" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-[#ff5050] font-semibold text-white transition-colors hover:bg-[#ff5050]/90 ${
          size === "sm" ? "h-8 gap-1.5 px-3 text-xs" : "h-10 gap-2 px-4 text-sm"
        }`}
      >
        <UserPlus className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        Inviter
      </button>
      {open && <InviteDialog onClose={() => setOpen(false)} />}
    </>
  );
}

type Done = Extract<InviteResult, { ok: true }>;

function InviteDialog({ onClose }: { onClose: () => void }) {
  const [raw, setRaw] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [testing, setTesting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sendTest = async () => {
    setTesting(true);
    const res = await sendTestInvitationAction().catch(() => ({ ok: false as const, error: "L'envoi a échoué." }));
    setTesting(false);
    if (res.ok) toast.success(`Test envoyé à ${res.to}`, { description: "Regarde aussi dans les spams." });
    else toast.error("Le test n'est pas parti", { description: res.error, duration: 15_000 });
  };

  const { valid, invalid } = useMemo(() => parseEmailList(raw), [raw]);
  const tooMany = valid.length > MAX_INVITES_PER_SEND;

  useEffect(() => {
    textareaRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !sending) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose, sending]);

  const send = async () => {
    setSending(true);
    setError(null);
    const res = await sendInvitationsAction(raw).catch(
      (): InviteResult => ({ ok: false, error: "L'envoi a échoué. Réessaie dans un instant." })
    );
    setSending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(res);
    if (res.sent.length > 0) {
      toast.success(res.sent.length === 1 ? "Invitation envoyée" : `${res.sent.length} invitations envoyées`);
    }
  };

  const restart = () => {
    setDone(null);
    setRaw("");
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="invite-title">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !sending && onClose()} />

      <div className="relative flex max-h-[92vh] w-full flex-col rounded-t-3xl border border-zinc-800 bg-zinc-900 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:max-w-md sm:rounded-3xl">
        {/* En-tête */}
        <div className="border-b border-zinc-800/80 px-5 pb-3 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-700 sm:hidden" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff5050]/15">
                <Mail className="h-4 w-4 text-[#ff5050]" />
              </span>
              <div>
                <h2 id="invite-title" className="text-base font-bold text-white">Inviter des joueurs</h2>
                <p className="text-xs text-zinc-500">Un e-mail d&apos;invitation part vers chaque adresse</p>
              </div>
            </div>
            <button type="button" onClick={onClose} disabled={sending} aria-label="Fermer"
              className="-mr-2 rounded-xl p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-40">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {done ? (
          <ResultView result={done} onRestart={restart} onClose={onClose} />
        ) : (
          <>
            <div className="space-y-3 overflow-y-auto px-5 py-5">
              <label htmlFor="invite-emails" className="sr-only">Adresses e-mail</label>
              <textarea
                id="invite-emails"
                ref={textareaRef}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                rows={4}
                placeholder={"ami@gmail.com\ncopine@outlook.fr"}
                className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#5096ff] focus:outline-none focus:ring-1 focus:ring-[#5096ff]"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className={tooMany ? "font-semibold text-[#ff5050]" : "text-zinc-500"}>
                  {valid.length === 0
                    ? "Une adresse par ligne, ou séparées par des virgules"
                    : tooMany
                      ? `${valid.length} adresses : ${MAX_INVITES_PER_SEND} maximum par envoi`
                      : `${valid.length} adresse${valid.length > 1 ? "s" : ""} prête${valid.length > 1 ? "s" : ""}`}
                </span>
                <span className="flex items-center gap-3">
                  <a href="/api/admin/invitation-preview" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-[#5096ff] hover:underline underline-offset-2">
                    Voir l&apos;e-mail <ExternalLink className="h-3 w-3" />
                  </a>
                  <button type="button" onClick={sendTest} disabled={testing || sending}
                    className="inline-flex items-center gap-1 font-semibold text-[#5096ff] hover:underline underline-offset-2 disabled:opacity-50">
                    {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />} M&apos;envoyer un test
                  </button>
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">Les adresses qui ont déjà un compte sont ignorées (la tienne aussi : utilise « M&apos;envoyer un test »).</p>
              {invalid.length > 0 && (
                <p className="rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-400">
                  Ignorée{invalid.length > 1 ? "s" : ""} (format incorrect) : {invalid.join(", ")}
                </p>
              )}
              {error && <p className="rounded-lg bg-[#ff5050]/10 px-3 py-2 text-xs text-[#ff5050]">{error}</p>}
            </div>

            <div className="border-t border-zinc-800/80 px-5 pt-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
              <button
                type="button"
                onClick={send}
                disabled={sending || valid.length === 0 || tooMany}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ff5050] text-sm font-bold text-white transition-colors hover:bg-[#ff5050]/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending
                  ? "Envoi en cours…"
                  : valid.length > 1 ? `Envoyer ${valid.length} invitations` : "Envoyer l'invitation"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

function ResultView({ result, onRestart, onClose }: { result: Done; onRestart: () => void; onClose: () => void }) {
  const groups: { label: string; emails: string[]; tone: string; hint?: string }[] = [
    { label: "Envoyées", emails: result.sent, tone: "text-emerald-400" },
    { label: "Déjà inscrits", emails: result.alreadyRegistered, tone: "text-zinc-400" },
    {
      label: "Non envoyées : domaine refusé à l'inscription",
      emails: result.refusedDomain,
      tone: "text-amber-400",
      hint: "Ajoute le domaine à ALLOWED_EMAIL_DOMAINS (Vercel), puis renvoie.",
    },
    { label: "Format incorrect", emails: result.invalid, tone: "text-amber-400" },
    { label: "Échec d'envoi", emails: result.failed, tone: "text-[#ff5050]", hint: result.failedReason ?? "Réessaie dans un instant." },
  ].filter((g) => g.emails.length > 0);

  return (
    <>
      <div className="space-y-4 overflow-y-auto px-5 py-5">
        {result.sent.length > 0 && (
          <div className="flex flex-col items-center py-2 text-center">
            <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/15">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </span>
            <p className="text-base font-bold text-white">
              {result.sent.length === 1 ? "Invitation envoyée" : `${result.sent.length} invitations envoyées`}
            </p>
            <p className="text-xs text-zinc-500">
              Préviens-les : l&apos;e-mail peut arriver dans les spams. Un clic sur « Non spam » et les suivants
              (confirmation d&apos;inscription…) arriveront au bon endroit.
            </p>
          </div>
        )}
        {result.sent.length === 0 && (
          <div className="rounded-xl bg-amber-400/10 px-3 py-2.5 text-xs text-amber-400">
            <p className="font-semibold">Aucune invitation n&apos;est partie.</p>
            {result.alreadyRegistered.length > 0 && (
              <p className="mt-0.5 text-amber-400/80">Les adresses déjà inscrites ne reçoivent pas d&apos;invitation. Pour voir l&apos;e-mail, utilise « M&apos;envoyer un test ».</p>
            )}
          </div>
        )}
        {groups.map((g) => (
          <div key={g.label}>
            <p className={`text-xs font-semibold ${g.tone}`}>{g.label} ({g.emails.length})</p>
            <p className="mt-1 break-all text-xs text-zinc-400">{g.emails.join(", ")}</p>
            {g.hint && <p className="mt-0.5 text-[11px] text-zinc-500">{g.hint}</p>}
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-zinc-800/80 px-5 pt-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <button type="button" onClick={onRestart}
          className="h-11 flex-1 rounded-xl bg-zinc-800 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-700">
          Inviter d&apos;autres
        </button>
        <button type="button" onClick={onClose}
          className="h-11 flex-1 rounded-xl bg-[#5096ff] text-sm font-semibold text-white transition-colors hover:bg-[#5096ff]/90">
          Terminé
        </button>
      </div>
    </>
  );
}
