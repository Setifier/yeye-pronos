import Image from "next/image";
import { getTeamLogo } from "@/lib/nba-logos";

export function TeamLogo({ abbreviation, size = 40, className = "" }: { abbreviation: string; size?: number; className?: string }) {
  return (
    <Image
      src={getTeamLogo(abbreviation)}
      alt={abbreviation}
      width={size}
      height={size}
      className={`object-contain flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
