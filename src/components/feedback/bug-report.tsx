"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bug, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { reportBugAction } from "@/actions/report-bug.action";

const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;

/** Bouton « Signaler un bug » (bandeau bêta, footer ou menu mobile) + fenêtre de saisie. */
export function BugReportButton({ loggedIn, variant }: { loggedIn: boolean; variant: "banner" | "footer" | "menu" }) {
  const [open, setOpen] = useState(false);

  if (variant === "menu") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-zinc-200 transition-colors active:bg-zinc-800"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff5050]/15">
            <Bug className="h-4 w-4 text-[#ff5050]" />
          </span>
          Signaler un bug
        </button>
        {open && <BugReportDialog loggedIn={loggedIn} onClose={() => setOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "banner"
            ? "shrink-0 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-[#5096ff] hover:bg-[#5096ff]/10 transition-colors"
            : "inline-flex items-center gap-1.5 text-xs font-medium text-[#5096ff] hover:underline underline-offset-2"
        }
      >
        <Bug className="h-3.5 w-3.5" />
        {variant === "banner" ? (
          <>
            <span className="sm:hidden">Signaler</span>
            <span className="hidden sm:inline">Signaler un bug</span>
          </>
        ) : (
          "Signaler un bug"
        )}
      </button>
      {open && <BugReportDialog loggedIn={loggedIn} onClose={() => setOpen(false)} />}
    </>
  );
}

function BugReportDialog({ loggedIn, onClose }: { loggedIn: boolean; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [email, setEmail]     = useState("");
  const [website, setWebsite] = useState(""); // piège anti-robots
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await reportBugAction({
      message,
      email: loggedIn ? undefined : email,
      website,
      // Sans les paramètres d'URL (ils peuvent contenir un lien de réinitialisation de mot de passe)
      page: `${window.location.origin}${window.location.pathname}`,
      screen: `${window.innerWidth}×${window.innerHeight}`,
    }).catch(() => ({ ok: false as const, error: "L'envoi a échoué. Réessayez dans un instant." }));
    setSending(false);
    if (res.ok) {
      toast.success("Merci ! Votre signalement a bien été envoyé.");
      onClose();
    } else {
      setError(res.error);
    }
  };

  const tooShort = message.trim().length < MIN_LENGTH;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bug-report-title"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={submit}
        className="relative w-full sm:max-w-md flex flex-col bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
      >
        {/* En-tête */}
        <div className="px-5 pt-3 pb-3 border-b border-zinc-800/80">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-700 sm:hidden" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff5050]/15">
                <Bug className="h-4 w-4 text-[#ff5050]" />
              </span>
              <h2 id="bug-report-title" className="text-base font-bold text-white">Signaler un bug</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="p-2 -mr-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Corps */}
        <div className="space-y-4 px-5 py-5">
          <div>
            <label htmlFor="bug-message" className="sr-only">Description du problème</label>
            <textarea
              id="bug-message"
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MAX_LENGTH}
              rows={5}
              placeholder="Que s’est-il passé ? Qu’attendiez-vous à la place ?"
              className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#5096ff] focus:outline-none focus:ring-1 focus:ring-[#5096ff]"
            />
            <p className="mt-1 text-right text-[11px] tabular-nums text-zinc-600">
              {message.length}/{MAX_LENGTH}
            </p>
          </div>

          {!loggedIn && (
            <div>
              <label htmlFor="bug-email" className="mb-1.5 block text-xs font-medium text-zinc-400">
                Votre e-mail (facultatif, pour qu’on puisse vous répondre)
              </label>
              <input
                id="bug-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 text-sm text-white focus:border-[#5096ff] focus:outline-none focus:ring-1 focus:ring-[#5096ff]"
              />
            </div>
          )}

          {/* Piège anti-robots : invisible pour un humain */}
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />

          <p className="text-xs text-zinc-500">La page actuelle et le type d’appareil sont joints automatiquement.</p>

          {error && <p className="rounded-lg bg-[#ff5050]/10 px-3 py-2 text-xs text-[#ff5050]">{error}</p>}
        </div>

        {/* Actions */}
        <div
          className="flex gap-2 border-t border-zinc-800/80 px-5 pt-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-zinc-800 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={sending || tooShort}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#5096ff] py-3 text-sm font-semibold text-white hover:bg-[#5096ff]/90 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            Envoyer
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
