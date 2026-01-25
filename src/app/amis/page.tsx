"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FriendsList } from "@/components/friends/friends-list";
import { FriendRequestsList } from "@/components/friends/friend-requests-list";
import { UserSearch } from "@/components/friends/user-search";
import {
  sendFriendRequestAction,
  acceptFriendRequestAction,
  rejectFriendRequestAction,
  removeFriendAction,
} from "@/actions/friends";
import { toast } from "sonner";
import { Users, Inbox, Search } from "lucide-react";

type TabType = "friends" | "requests" | "search";
type RequestSubTab = "received" | "sent";

interface Friend {
  id: string;
  name: string;
  image: string | null;
  friendCode: string | null;
}

interface FriendRequest {
  id: string;
  createdAt: Date | string;
  sender: {
    id: string;
    name: string;
    image: string | null;
    friendCode: string | null;
  };
}

interface SentFriendRequest {
  id: string;
  createdAt: Date | string;
  receiver: {
    id: string;
    name: string;
    image: string | null;
    friendCode: string | null;
  };
}

export default function AmisPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>("friends");
  const [requestSubTab, setRequestSubTab] = useState<RequestSubTab>("received");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentFriendRequest[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isLoadingSentRequests, setIsLoadingSentRequests] = useState(true);

  // State pour les actions en cours
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [sendingToUserId, setSendingToUserId] = useState<string | null>(null);

  // Read query params and set initial tab
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "requests" || tab === "search") {
      setActiveTab(tab as TabType);
    }
  }, [searchParams]);

  // Fetch friends
  useEffect(() => {
    fetchFriends();
  }, []);

  // Fetch requests
  useEffect(() => {
    fetchRequests();
    fetchSentRequests();
  }, []);

  async function fetchFriends() {
    setIsLoadingFriends(true);
    try {
      const response = await fetch("/api/friends");
      const data = await response.json();
      if (data.success) {
        setFriends(data.friends);
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
      toast.error("Erreur lors du chargement des amis");
    } finally {
      setIsLoadingFriends(false);
    }
  }

  async function fetchRequests() {
    setIsLoadingRequests(true);
    try {
      const response = await fetch("/api/friends/requests");
      const data = await response.json();
      if (data.success) {
        setRequests(data.requests);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Erreur lors du chargement des demandes");
    } finally {
      setIsLoadingRequests(false);
    }
  }

  async function fetchSentRequests() {
    setIsLoadingSentRequests(true);
    try {
      const response = await fetch("/api/friends/requests/sent");
      const data = await response.json();
      if (data.success) {
        setSentRequests(data.requests);
      }
    } catch (error) {
      console.error("Error fetching sent requests:", error);
      toast.error("Erreur lors du chargement des demandes envoyées");
    } finally {
      setIsLoadingSentRequests(false);
    }
  }

  const handleSendRequest = async (userId: string) => {
    setSendingToUserId(userId);
    const result = await sendFriendRequestAction({ targetUserId: userId });
    setSendingToUserId(null);

    if (result.success) {
      toast.success("Demande d'ami envoyée");
      // Rafraîchir la liste des demandes envoyées
      fetchSentRequests();
    } else {
      toast.error(result.error || "Erreur lors de l'envoi de la demande");
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    setProcessingRequestId(requestId);
    const result = await acceptFriendRequestAction({ requestId });
    setProcessingRequestId(null);

    if (result.success) {
      toast.success(result.message || "Demande acceptée");
      // Refresh both lists
      fetchFriends();
      fetchRequests();
    } else {
      toast.error(result.error || "Erreur lors de l'acceptation");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingRequestId(requestId);
    const result = await rejectFriendRequestAction({ requestId });
    setProcessingRequestId(null);

    if (result.success) {
      toast.success("Demande refusée");
      fetchRequests();
    } else {
      toast.error(result.error || "Erreur lors du refus");
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir retirer cet ami ?")) {
      return;
    }

    const result = await removeFriendAction({ friendId });

    if (result.success) {
      toast.success("Ami retiré");
      fetchFriends();
    } else {
      toast.error(result.error || "Erreur lors de la suppression");
    }
  };

  const tabs = [
    {
      id: "friends" as TabType,
      label: "Mes amis",
      icon: Users,
      count: friends.length,
    },
    {
      id: "requests" as TabType,
      label: "Demandes",
      icon: Inbox,
      count: requests.length + sentRequests.length,
    },
    {
      id: "search" as TabType,
      label: "Rechercher",
      icon: Search,
      count: null,
    },
  ];

  return (
    <div className="space-y-6 py-8 px-4 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Mes Amis</h1>
        <p className="text-zinc-400 mt-2">
          Gérez vos amis et trouvez de nouveaux joueurs
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 font-medium transition-colors relative
                  ${
                    isActive
                      ? "text-[#5096ff]"
                      : "text-zinc-400 hover:text-zinc-300"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== null && tab.count > 0 && (
                  <span
                    className={`
                    ml-1 px-2 py-0.5 text-xs rounded-full
                    ${
                      isActive
                        ? "bg-[#5096ff]/20 text-[#5096ff]"
                        : "bg-zinc-800 text-zinc-500"
                    }
                  `}
                  >
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5096ff]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "friends" && (
          <FriendsList
            friends={friends}
            onRemove={handleRemoveFriend}
            isLoading={isLoadingFriends}
          />
        )}

        {activeTab === "requests" && (
          <div className="space-y-4">
            {/* Sub-tabs pour Demandes */}
            <div className="flex gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
              <button
                onClick={() => setRequestSubTab("received")}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                  requestSubTab === "received"
                    ? "bg-[#5096ff] text-white"
                    : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                Reçues
                {requests.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white/20">
                    {requests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setRequestSubTab("sent")}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                  requestSubTab === "sent"
                    ? "bg-[#5096ff] text-white"
                    : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                Envoyées
                {sentRequests.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white/20">
                    {sentRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* Content des demandes */}
            {requestSubTab === "received" && (
              <FriendRequestsList
                requests={requests}
                onAccept={handleAcceptRequest}
                onReject={handleRejectRequest}
                isLoading={isLoadingRequests}
                processingId={processingRequestId}
              />
            )}

            {requestSubTab === "sent" && (
              <div>
                {isLoadingSentRequests ? (
                  <div className="text-center py-12 text-zinc-400">
                    Chargement...
                  </div>
                ) : sentRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Inbox className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-400">Aucune demande envoyée</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sentRequests.map((request) => (
                      <div
                        key={request.id}
                        className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-all"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          {request.receiver.image ? (
                            <img
                              src={request.receiver.image}
                              alt={request.receiver.name}
                              className="w-14 h-14 rounded-full object-cover ring-2 ring-zinc-800"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#5096ff] to-[#3b7dd8] flex items-center justify-center text-white font-bold text-lg ring-2 ring-zinc-800">
                              {request.receiver.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white truncate">
                              {request.receiver.name}
                            </h3>
                            <p className="text-xs text-zinc-500 font-mono truncate">
                              {request.receiver.friendCode || `#${request.receiver.id.slice(0, 8)}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                          <p className="text-xs text-zinc-400">
                            En attente de réponse...
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "search" && (
          <UserSearch
            onSendRequest={handleSendRequest}
            sendingToId={sendingToUserId}
          />
        )}
      </div>
    </div>
  );
}
