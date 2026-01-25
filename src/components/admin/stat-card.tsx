import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: "blue" | "green" | "yellow" | "purple" | "red";
  subtitle?: string;
}

const colorClasses = {
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    icon: "text-blue-500",
    text: "text-blue-400",
  },
  green: {
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    icon: "text-green-500",
    text: "text-green-400",
  },
  yellow: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    icon: "text-yellow-500",
    text: "text-yellow-400",
  },
  purple: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    icon: "text-purple-500",
    text: "text-purple-400",
  },
  red: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    icon: "text-red-500",
    text: "text-red-400",
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  color = "blue",
  subtitle,
}: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div
      className={`
      bg-zinc-900 border ${colors.border} rounded-xl p-6
      hover:border-opacity-40 transition-all duration-200
    `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-400 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${colors.text}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-zinc-500 mt-2">{subtitle}</p>
          )}
        </div>

        <div className={`${colors.bg} p-3 rounded-lg`}>
          <Icon className={`w-6 h-6 ${colors.icon}`} />
        </div>
      </div>
    </div>
  );
}
