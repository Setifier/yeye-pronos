"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Mail, RotateCcw, Smartphone, Trash2, User, Link2 } from "lucide-react";
import { toast } from "sonner";
import { deleteBugAction, setBugStatusAction } from "@/actions/admin/bugs";
import type { BugRow } from "@/lib/admin-data";
import { describeDevice, formatAgo, formatParisDateTime } from "@/lib/admin-format";
import { Badge } from "@/components/admin/ui";

/** Un signalement de bug, avec ses actions. */
export function BugCard({ bug }: { bug: BugRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"status" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const resolved = bug.status === "RESOLVED";

  const run = async (key: "status" | "delete", fn: () => Promise<void>, done: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(done);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setBusy(null);
    }
  };

  const path = bug.page ? bug.page.replace(/^https?:\/\/[^/]+/, "") || "/" : null;
  const summary = bug.message.replace(/\s+/g, " ").slice(0, 60);
  const mailto = bug.email
    ? `mailto:${bug.email}?subject=${encodeURIComponent(`Re: votre signalement sur Yeye Pronos — ${summary}`)}`
    : null;
  const btn = "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors disabled:opacity-40";

  return (
    <li className={`rounded-2xl border bg-zinc-900/60 p-4 sm:p-5 ${resolved ? "border-zinc-800/60" : "border-zinc-800"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={resolved ? "ok" : "error"}>{resolved ? "Résolu" : "À traiter"}</Badge>
        <span className="text-xs text-zinc-500" title={formatParisDateTime(bug.createdAt)}>{formatAgo(bug.createdAt)}</span>
      </div>

      <p className={`mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed ${resolved ? "text-zinc-400" : "text-zinc-100"}`}>
        {bug.message}
      </p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          {bug.user ? bug.user.name : "Visiteur"}{bug.email ? ` · ${bug.email}` : bug.user ? "" : " sans e-mail"}
        </span>
        {path && (
          <span className="flex min-w-0 items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 shrink-0" />
            <a href={path} target="_blank" rel="noreferrer" className="min-w-0 truncate text-[#5096ff] hover:underline">{path}</a>
          </span>
        )}
        <span className="flex items-center gap-1.5" title={bug.userAgent ?? undefined}>
          <Smartphone className="h-3.5 w-3.5" />
          {describeDevice(bug.userAgent)}{bug.screen ? ` · ${bug.screen}` : ""}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {confirmDelete ? (
          <>
            <button type="button" className={`${btn} bg-[#ff5050] text-white hover:bg-[#ff5050]/90`} disabled={busy !== null}
              onClick={() => run("delete", () => deleteBugAction(bug.id), "Signalement supprimé")}>
              {busy === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Supprimer définitivement
            </button>
            <button type="button" className={`${btn} bg-zinc-800 text-zinc-300 hover:bg-zinc-700`} onClick={() => setConfirmDelete(false)}>
              Annuler
            </button>
          </>
        ) : (
          <>
            <button type="button" disabled={busy !== null}
              className={`${btn} ${resolved ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25"}`}
              onClick={() => run("status", () => setBugStatusAction(bug.id, resolved ? "OPEN" : "RESOLVED"), resolved ? "Signalement rouvert" : "Marqué comme résolu")}>
              {busy === "status" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : resolved ? <RotateCcw className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {resolved ? "Rouvrir" : "Marquer résolu"}
            </button>
            {mailto && (
              <a href={mailto} className={`${btn} bg-zinc-800 text-zinc-300 hover:bg-zinc-700`}>
                <Mail className="h-3.5 w-3.5" />
                Répondre
              </a>
            )}
            <button type="button" className={`${btn} text-zinc-500 hover:bg-[#ff5050]/10 hover:text-[#ff5050]`} onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer
            </button>
          </>
        )}
      </div>
    </li>
  );
}
