"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ExternalLink, Loader2, Search, Shield, ShieldOff, Trash2, UserX, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { changeUserRoleAction, deleteUserAction, toggleBanUserAction } from "@/actions/admin/users";
import type { PlayerRow, PlayersOverview } from "@/lib/admin-data";
import { formatAgo, formatParisDate } from "@/lib/admin-format";
import { Badge, EmptyState, StatTile } from "@/components/admin/ui";

type Filter = "all" | "preseason" | "tonight" | "unverified" | "banned";

/** Liste des joueurs : recherche, filtres, fiche dépliable et actions. */
export function PlayersPanel({ data, currentUserId }: { data: PlayersOverview; currentUserId: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const { rows, preseasonTotal, tonight } = data;
  const players = rows.filter((r) => r.onboarded && !r.banned);

  const filters: { id: Filter; label: string; count: number; hidden?: boolean }[] = [
    { id: "all",        label: "Tous",                       count: rows.length },
    { id: "preseason",  label: "Paris de saison incomplets", count: players.filter((r) => r.preseasonDone < preseasonTotal).length },
    { id: "tonight",    label: `Pas parié (${tonight.label.toLowerCase()})`, count: players.filter((r) => r.tonightBets === 0).length, hidden: tonight.games === 0 },
    { id: "unverified", label: "E-mail non confirmé",        count: rows.filter((r) => !r.emailVerified).length },
    { id: "banned",     label: "Bannis",                     count: rows.filter((r) => r.banned).length },
  ];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !r.email.toLowerCase().includes(q)) return false;
      switch (filter) {
        case "preseason":  return r.onboarded && !r.banned && r.preseasonDone < preseasonTotal;
        case "tonight":    return r.onboarded && !r.banned && r.tonightBets === 0;
        case "unverified": return !r.emailVerified;
        case "banned":     return r.banned;
        default:           return true;
      }
    });
  }, [rows, query, filter, preseasonTotal]);

  const preseasonComplete = players.filter((r) => r.preseasonDone >= preseasonTotal).length;
  const bettedTonight = players.filter((r) => r.tonightBets > 0).length;

  return (
    <div className="space-y-5">
      {/* Résumé */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatTile label="Inscrits" value={rows.length} hint={`${rows.filter((r) => r.emailVerified).length} e-mail confirmé`} />
        <StatTile label="Profil complété" value={rows.filter((r) => r.onboarded).length} />
        <StatTile
          label="Paris de saison"
          value={`${preseasonComplete}/${players.length}`}
          hint={`joueurs à ${preseasonTotal}/${preseasonTotal}`}
          tone={players.length > 0 && preseasonComplete === players.length ? "ok" : undefined}
        />
        <StatTile
          label={tonight.label}
          value={tonight.games === 0 ? "—" : `${bettedTonight}/${players.length}`}
          hint={tonight.games === 0 ? "pas de match" : "ont parié"}
        />
      </div>

      {/* Recherche + filtres */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un nom ou un e-mail"
            className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-3.5 text-sm text-white placeholder:text-zinc-600 focus:border-[#5096ff] focus:outline-none focus:ring-1 focus:ring-[#5096ff]"
          />
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {filters.filter((f) => !f.hidden).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === f.id ? "bg-[#5096ff]/15 text-[#5096ff]" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              {f.label}
              <span className="tabular-nums opacity-70">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
        {visible.length === 0 ? (
          <EmptyState icon={Users} title="Aucun joueur">
            {rows.length === 0 ? "Les inscriptions apparaîtront ici." : "Aucun joueur ne correspond à ce filtre."}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-zinc-800/80">
            {visible.map((p) => (
              <PlayerItem
                key={p.id}
                player={p}
                preseasonTotal={preseasonTotal}
                tonight={tonight}
                isSelf={p.id === currentUserId}
                open={openId === p.id}
                onToggle={() => setOpenId(openId === p.id ? null : p.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Avatar({ player }: { player: PlayerRow }) {
  if (player.image) {
    return <img src={player.image} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-zinc-800" />;
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#5096ff] to-[#3b7dd8] text-sm font-bold text-white">
      {player.name.charAt(0).toUpperCase()}
    </span>
  );
}

function PreseasonDots({ done, total }: { done: number; total: number }) {
  return (
    <span className="flex items-center gap-1" title={`Paris de saison : ${done}/${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < done ? "bg-[#dcff50]" : "bg-zinc-700"}`} />
      ))}
    </span>
  );
}

function PlayerItem({
  player: p, preseasonTotal, tonight, isSelf, open, onToggle,
}: {
  player: PlayerRow;
  preseasonTotal: number;
  tonight: PlayersOverview["tonight"];
  isSelf: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-800/40 sm:px-5" aria-expanded={open}>
        <Avatar player={p} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-white">{p.name}</span>
            {isSelf && <Badge tone="info">Vous</Badge>}
            {p.role === "ADMIN" && <Badge tone="info">Admin</Badge>}
            {p.banned && <Badge tone="error">Banni</Badge>}
            {!p.emailVerified && <Badge tone="warn">E-mail non confirmé</Badge>}
            {p.emailVerified && !p.onboarded && <Badge tone="neutral">Profil incomplet</Badge>}
          </div>
          <p className="truncate text-xs text-zinc-500">{p.email}</p>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
          <span className="text-sm font-bold tabular-nums text-[#dcff50]">
            {p.points} pts{p.rank ? <span className="ml-1 font-medium text-zinc-500">#{p.rank}</span> : null}
          </span>
          <PreseasonDots done={p.preseasonDone} total={preseasonTotal} />
        </div>
        <div className="hidden w-28 shrink-0 text-right text-xs text-zinc-500 md:block">
          {p.lastActiveAt ? formatAgo(p.lastActiveAt) : "jamais"}
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && <PlayerDetails player={p} preseasonTotal={preseasonTotal} tonight={tonight} isSelf={isSelf} />}
    </li>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm text-zinc-200">{children}</p>
    </div>
  );
}

function PlayerDetails({
  player: p, preseasonTotal, tonight, isSelf,
}: {
  player: PlayerRow;
  preseasonTotal: number;
  tonight: PlayersOverview["tonight"];
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");
  const [confirm, setConfirm] = useState<"ban" | "delete" | null>(null);

  const act = async (key: string, fn: () => Promise<{ success: boolean; error?: string }>, done: string) => {
    setBusy(key);
    try {
      const res = await fn();
      if (res.success) {
        toast.success(done);
        setConfirm(null);
        router.refresh();
      } else {
        toast.error(res.error ?? "Action impossible");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setBusy(null);
    }
  };

  const btn = "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="space-y-4 border-t border-zinc-800/60 bg-zinc-950/40 px-4 py-4 sm:px-5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Detail label="Points">{p.points} pts{p.rank ? ` · #${p.rank}` : ""}</Detail>
        <Detail label="Pronos (saison)">{p.predictions}{p.finished > 0 ? ` · ${p.winRate} % réussis` : ""}</Detail>
        <Detail label="Paris de saison">
          <span className="inline-flex items-center gap-2">{p.preseasonDone}/{preseasonTotal} <PreseasonDots done={p.preseasonDone} total={preseasonTotal} /></span>
        </Detail>
        <Detail label={tonight.label}>{tonight.games === 0 ? "Pas de match" : `${p.tonightBets}/${tonight.games} paris`}</Detail>
        <Detail label="Dernière activité">{p.lastActiveAt ? formatAgo(p.lastActiveAt) : "Jamais"}</Detail>
        <Detail label="Inscrit le">{formatParisDate(p.createdAt)}</Detail>
        <Detail label="Connexion">{p.loginMethods.length ? p.loginMethods.join(" + ") : "—"}</Detail>
        <Detail label="Équipe favorite">{p.favoriteTeam ?? "—"}</Detail>
      </div>

      {p.banned && p.banReason && (
        <p className="rounded-lg bg-[#ff5050]/10 px-3 py-2 text-xs text-[#ff5050]">Raison du bannissement : {p.banReason}</p>
      )}

      {/* Confirmation d'un bannissement */}
      {confirm === "ban" && (
        <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
          <label htmlFor={`ban-${p.id}`} className="block text-xs font-medium text-zinc-400">Raison (facultatif, visible des admins)</label>
          <input
            id={`ban-${p.id}`}
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            maxLength={200}
            className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white focus:border-[#5096ff] focus:outline-none"
          />
          <div className="flex gap-2">
            <button type="button" className={`${btn} bg-[#ff5050] text-white hover:bg-[#ff5050]/90`} disabled={busy !== null}
              onClick={() => act("ban", () => toggleBanUserAction({ userId: p.id, reason: banReason.trim() || undefined }), `${p.name} est banni`)}>
              {busy === "ban" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
              Confirmer le bannissement
            </button>
            <button type="button" className={`${btn} bg-zinc-800 text-zinc-300 hover:bg-zinc-700`} onClick={() => setConfirm(null)}>Annuler</button>
          </div>
        </div>
      )}

      {/* Confirmation d'une suppression */}
      {confirm === "delete" && (
        <div className="space-y-2 rounded-xl border border-[#ff5050]/30 bg-[#ff5050]/5 p-3">
          <p className="text-xs leading-relaxed text-zinc-300">
            Supprimer définitivement <strong className="text-white">{p.name}</strong> ? Ses pronos, paris de saison, amis et
            ligues sont effacés, toutes saisons confondues. Action irréversible.
          </p>
          <div className="flex gap-2">
            <button type="button" className={`${btn} bg-[#ff5050] text-white hover:bg-[#ff5050]/90`} disabled={busy !== null}
              onClick={() => act("delete", () => deleteUserAction({ userId: p.id }), `${p.name} a été supprimé`)}>
              {busy === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Supprimer définitivement
            </button>
            <button type="button" className={`${btn} bg-zinc-800 text-zinc-300 hover:bg-zinc-700`} onClick={() => setConfirm(null)}>Annuler</button>
          </div>
        </div>
      )}

      {/* Actions */}
      {confirm === null && (
        <div className="flex flex-wrap gap-2">
          <Link href={`/joueur/${p.id}`} target="_blank" className={`${btn} bg-zinc-800 text-zinc-300 hover:bg-zinc-700`}>
            <ExternalLink className="h-3.5 w-3.5" />
            Profil public
          </Link>
          {!isSelf && (
            <>
              <button type="button" className={`${btn} bg-zinc-800 text-zinc-300 hover:bg-zinc-700`} disabled={busy !== null}
                onClick={() => act("role", () => changeUserRoleAction({ userId: p.id, role: p.role === "ADMIN" ? "USER" : "ADMIN" }),
                  p.role === "ADMIN" ? `${p.name} n'est plus admin` : `${p.name} est maintenant admin`)}>
                {busy === "role" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : p.role === "ADMIN" ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                {p.role === "ADMIN" ? "Retirer admin" : "Passer admin"}
              </button>
              {p.banned ? (
                <button type="button" className={`${btn} bg-zinc-800 text-zinc-300 hover:bg-zinc-700`} disabled={busy !== null}
                  onClick={() => act("ban", () => toggleBanUserAction({ userId: p.id }), `${p.name} n'est plus banni`)}>
                  {busy === "ban" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                  Débannir
                </button>
              ) : (
                <button type="button" className={`${btn} bg-zinc-800 text-amber-300 hover:bg-zinc-700`} onClick={() => setConfirm("ban")}>
                  <UserX className="h-3.5 w-3.5" />
                  Bannir
                </button>
              )}
              <button type="button" className={`${btn} text-[#ff5050] hover:bg-[#ff5050]/10`} onClick={() => setConfirm("delete")}>
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
