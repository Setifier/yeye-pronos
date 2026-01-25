"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { UserBadgesDisplay } from "./user-badges-display";

interface ProfileBadgesSectionProps {
  userId: string;
}

export function ProfileBadgesSection({ userId }: ProfileBadgesSectionProps) {
  const [badgesData, setBadgesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/users/${userId}/badges`);

        if (!response.ok) {
          throw new Error("Erreur lors du chargement des badges");
        }

        const data = await response.json();
        setBadgesData(data);
      } catch (err) {
        console.error("Error fetching badges:", err);
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-[#5096ff] animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
        <div className="text-center">
          <p className="text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!badgesData) {
    return null;
  }

  return (
    <UserBadgesDisplay
      badges={badgesData.badges}
      stats={badgesData.stats}
      variant="featured"
      maxDisplay={6}
    />
  );
}
