import Link from "next/link";
import {
  Award, BarChart2, ChevronRight, Crown, HeartPulse, LayoutGrid, Network, Shield, TrendingUp, Trophy, Users,
  type LucideIcon,
} from "lucide-react";
import { getCurrentSeason, getSeasonLabel } from "@/types/season";

// Libellé de saison recalculé régulièrement (pas figé au moment du build)
export const revalidate = 3600;

interface Entry {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
}

const REGULAR: (Entry & { tint: string })[] = [
  { href: "/standings",          label: "Classement NBA", hint: "Conférences, divisions, ligue · fiche de chaque équipe", icon: Trophy,     tint: "from-emerald-400/20 text-emerald-400" },
  { href: "/leaders",            label: "Leaders",        hint: "Points, passes, rebonds… les meilleurs de la ligue",     icon: TrendingUp, tint: "from-[#5096ff]/20 text-[#5096ff]" },
  { href: "/joueurs",            label: "Joueurs",        hint: "Tous les joueurs, leurs stats et leur fiche",             icon: Users,      tint: "from-[#dcff50]/15 text-[#dcff50]" },
  { href: "/joueurs/infirmerie", label: "Infirmerie",     hint: "Blessés et incertains, équipe par équipe",                icon: HeartPulse, tint: "from-rose-400/20 text-rose-400" },
];

const CUP: Entry[] = [
  { href: "/nba-cup",          label: "Bracket",       hint: "Quarts, demies, finale", icon: Network },
  { href: "/nba-cup/groupes",  label: "Groupes",       hint: "Les 6 poules",           icon: LayoutGrid },
  { href: "/nba-cup/wildcard", label: "Wild card",     hint: "Course aux repêchés",    icon: Shield },
  { href: "/nba-cup/equipes",  label: "Stats équipes", hint: "Matchs de la Cup",       icon: BarChart2 },
  { href: "/nba-cup/joueurs",  label: "Stats joueurs", hint: "Matchs de la Cup",       icon: TrendingUp },
];

const PLAYOFFS: Entry[] = [
  { href: "/playoffs",         label: "Bracket",       hint: "Play-in et séries",  icon: Network },
  { href: "/playoffs/equipes", label: "Stats équipes", hint: "Matchs de playoffs", icon: BarChart2 },
  { href: "/playoffs/joueurs", label: "Stats joueurs", hint: "Matchs de playoffs", icon: TrendingUp },
];

/**
 * « Stats NBA » : tout le contenu NBA de l'app au même endroit (menu mobile → Stats NBA).
 * Saison régulière, NBA Cup, playoffs. (Les saisons passées des pronos : /archives, dans le menu.)
 */
export default function NbaHubPage() {
  const season = getSeasonLabel(getCurrentSeason());

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-5 md:py-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">Stats NBA</h1>
        <p className="text-sm text-zinc-500">Saison {season} · classements, joueurs, NBA Cup, playoffs</p>
      </div>

      {/* Saison régulière */}
      <section>
        <SectionTitle>Saison régulière</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5 md:gap-3">
          {REGULAR.map(({ href, label, hint, icon: Icon, tint }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-gradient-to-br to-zinc-900/60 p-4 transition-transform active:scale-[0.97] md:hover:border-zinc-700 ${tint.split(" ")[0]}`}
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950/50 ${tint.split(" ")[1]}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-base font-black text-white">{label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-zinc-400">{hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <Group
        title="NBA Cup"
        subtitle="Le tournoi de novembre-décembre"
        icon={Award}
        tint="text-amber-400 bg-amber-400/15 border-amber-400/20"
        entries={CUP}
      />

      <Group
        title="Playoffs"
        subtitle="Play-in, séries et Finales"
        icon={Crown}
        tint="text-yellow-400 bg-yellow-400/15 border-yellow-400/20"
        entries={PLAYOFFS}
      />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-zinc-500">{children}</h2>;
}

function Group({ title, subtitle, icon: Icon, tint, entries }: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tint: string;
  entries: Entry[];
}) {
  const [text, bg, border] = tint.split(" ");
  return (
    <section className={`overflow-hidden rounded-2xl border bg-zinc-900/60 ${border}`}>
      <div className="flex items-center gap-3 px-4 pb-2 pt-4">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${text}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-black text-white">{title}</h2>
          <p className="text-xs text-zinc-500">{subtitle}</p>
        </div>
      </div>
      <div className="divide-y divide-zinc-800/70">
        {entries.map(({ href, label, hint, icon: EntryIcon }) => (
          <Link key={href} href={href} className="flex items-center gap-3 px-4 py-3 active:bg-zinc-800/60 md:hover:bg-zinc-800/40">
            <EntryIcon className={`h-4 w-4 flex-shrink-0 ${text}`} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white">{label}</span>
              <span className="block text-[11px] text-zinc-500">{hint}</span>
            </span>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-600" />
          </Link>
        ))}
      </div>
    </section>
  );
}
