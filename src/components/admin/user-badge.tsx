import { Shield, User } from "lucide-react";

interface UserBadgeProps {
  role: "USER" | "ADMIN";
  size?: "sm" | "md" | "lg";
}

export function UserBadge({ role, size = "md" }: UserBadgeProps) {
  const isAdmin = role === "ADMIN";

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-lg
        ${sizeClasses[size]}
        ${
          isAdmin
            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
        }
      `}
    >
      {isAdmin ? (
        <Shield className={iconSizes[size]} />
      ) : (
        <User className={iconSizes[size]} />
      )}
      {role}
    </span>
  );
}
