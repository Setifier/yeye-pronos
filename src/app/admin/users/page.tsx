"use client";

import { useEffect, useState } from "react";
import { DataTable, Column, PaginationData } from "@/components/admin/data-table";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Search,
  Filter,
  X,
  Ban,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  toggleBanUserAction,
  changeUserRoleAction,
  deleteUserAction,
} from "@/actions/admin/users";

interface User {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  banned: boolean;
  banReason: string | null;
  banExpires: Date | null;
  emailVerified: boolean;
  createdAt: Date;
  predictions: number;
}

interface UsersResponse {
  success: boolean;
  users: User[];
  pagination: PaginationData;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filtres
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "USER" | "ADMIN">("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Actions loading state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    user: User | null;
  }>({ isOpen: false, user: null });
  const [banModal, setBanModal] = useState<{
    isOpen: boolean;
    user: User | null;
  }>({ isOpen: false, user: null });
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, [debouncedSearch, roleFilter, pagination.page]);

  async function fetchUsers() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (debouncedSearch) params.append("search", debouncedSearch);
      if (roleFilter) params.append("role", roleFilter);

      const response = await fetch(`/api/admin/users?${params}`);
      const data: UsersResponse = await response.json();

      if (data.success) {
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = search || roleFilter;

  // Action handlers
  const handleToggleBan = async (user: User) => {
    if (user.banned) {
      // Débannir directement
      setActionLoading(user.id);
      const result = await toggleBanUserAction({ userId: user.id });
      setActionLoading(null);

      if (result.success) {
        toast.success(`${user.name} a été débanni`);
        fetchUsers();
      } else {
        toast.error(result.error || "Erreur lors du débannissement");
      }
    } else {
      // Ouvrir modal pour bannir
      setBanModal({ isOpen: true, user });
    }
  };

  const handleConfirmBan = async (reason: string) => {
    if (!banModal.user) return;

    setActionLoading(banModal.user.id);
    const result = await toggleBanUserAction({
      userId: banModal.user.id,
      reason,
    });
    setActionLoading(null);
    setBanModal({ isOpen: false, user: null });

    if (result.success) {
      toast.success(`${banModal.user.name} a été banni`);
      fetchUsers();
    } else {
      toast.error(result.error || "Erreur lors du bannissement");
    }
  };

  const handleChangeRole = async (user: User) => {
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";

    setActionLoading(user.id);
    const result = await changeUserRoleAction({
      userId: user.id,
      role: newRole,
    });
    setActionLoading(null);

    if (result.success) {
      toast.success(`Rôle modifié en ${newRole} pour ${user.name}`);
      fetchUsers();
    } else {
      toast.error(result.error || "Erreur lors du changement de rôle");
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.user) return;

    setActionLoading(deleteModal.user.id);
    const result = await deleteUserAction({ userId: deleteModal.user.id });
    setActionLoading(null);
    setDeleteModal({ isOpen: false, user: null });

    if (result.success) {
      toast.success(`${deleteModal.user.name} a été supprimé`);
      fetchUsers();
    } else {
      toast.error(result.error || "Erreur lors de la suppression");
    }
  };

  // Colonnes de la table
  const columns: Column<User>[] = [
    {
      key: "name",
      label: "Nom",
      render: (user) => (
        <div className="flex flex-col">
          <span className="font-medium text-white">{user.name}</span>
          <span className="text-xs text-zinc-500">{user.email}</span>
        </div>
      ),
    },
    {
      key: "role",
      label: "Rôle",
      render: (user) => (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          user.role === "ADMIN"
            ? "bg-yellow-500/20 text-yellow-400"
            : "bg-zinc-700/50 text-zinc-400"
        }`}>
          {user.role}
        </span>
      ),
    },
    {
      key: "emailVerified",
      label: "Email vérifié",
      render: (user) =>
        user.emailVerified ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-zinc-600" />
        ),
    },
    {
      key: "predictions",
      label: "Pronos",
      render: (user) => (
        <span className="text-white font-medium">{user.predictions}</span>
      ),
    },
    {
      key: "banned",
      label: "Statut",
      render: (user) =>
        user.banned ? (
          <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg font-medium">
            <Ban className="w-3 h-3" />
            Banni
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg font-medium">
            <CheckCircle className="w-3 h-3" />
            Actif
          </span>
        ),
    },
    {
      key: "createdAt",
      label: "Inscription",
      render: (user) => (
        <span className="text-zinc-400 text-xs">
          {formatDistanceToNow(new Date(user.createdAt), {
            addSuffix: true,
            locale: fr,
          })}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (user) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
            title={user.banned ? "Débannir" : "Bannir"}
            onClick={() => handleToggleBan(user)}
            disabled={actionLoading === user.id}
          >
            {actionLoading === user.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Ban className="w-4 h-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
            title={`Changer en ${user.role === "ADMIN" ? "USER" : "ADMIN"}`}
            onClick={() => handleChangeRole(user)}
            disabled={actionLoading === user.id}
          >
            {actionLoading === user.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400"
            title="Supprimer"
            onClick={() => setDeleteModal({ isOpen: true, user })}
            disabled={actionLoading === user.id}
          >
            {actionLoading === user.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Gestion des utilisateurs</h1>
        <p className="text-zinc-400 mt-2">
          Gérez les comptes utilisateurs, rôles et permissions
        </p>
      </div>

      {/* Filtres */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-white">Filtres</h2>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="ml-auto text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4 mr-1" />
              Réinitialiser
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recherche */}
          <div>
            <Label htmlFor="search" className="text-zinc-400">
              Rechercher
            </Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                id="search"
                type="text"
                placeholder="Nom ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Filtre par rôle */}
          <div>
            <Label htmlFor="role" className="text-zinc-400">
              Rôle
            </Label>
            <select
              id="role"
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value as "" | "USER" | "ADMIN")
              }
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5096ff] focus:border-transparent"
            >
              <option value="">Tous les rôles</option>
              <option value="USER">Utilisateurs</option>
              <option value="ADMIN">Administrateurs</option>
            </select>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-zinc-400">Total: </span>
              <span className="text-white font-medium">{pagination.total}</span>
            </div>
            {roleFilter && (
              <div>
                <span className="text-zinc-400">Filtrés: </span>
                <span className="text-white font-medium">{users.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={users}
        columns={columns}
        pagination={pagination}
        onPageChange={handlePageChange}
        isLoading={isLoading}
        emptyMessage={
          hasActiveFilters
            ? "Aucun utilisateur ne correspond aux filtres"
            : "Aucun utilisateur trouvé"
        }
      />

      {/* Modal Ban */}
      {banModal.isOpen && banModal.user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-2">
              Bannir {banModal.user.name}
            </h3>
            <p className="text-zinc-400 mb-4">
              Cette action empêchera l&apos;utilisateur d&apos;accéder à l&apos;application.
            </p>

            <div className="mb-4">
              <Label htmlFor="ban-reason" className="text-zinc-400">
                Raison du bannissement
              </Label>
              <Input
                id="ban-reason"
                type="text"
                placeholder="Ex: Violation des conditions d'utilisation"
                className="mt-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleConfirmBan(e.currentTarget.value);
                  }
                }}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setBanModal({ isOpen: false, user: null })}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={() => {
                  const input = document.getElementById(
                    "ban-reason"
                  ) as HTMLInputElement;
                  handleConfirmBan(input.value || "Aucune raison fournie");
                }}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Bannir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Delete */}
      {deleteModal.isOpen && deleteModal.user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-2">
              Supprimer {deleteModal.user.name} ?
            </h3>
            <p className="text-zinc-400 mb-4">
              Cette action est <span className="text-red-400 font-semibold">irréversible</span>.
              Toutes les données de l&apos;utilisateur (pronos, etc.) seront définitivement supprimées.
            </p>

            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm font-medium">
                ⚠️ Attention: Cette action ne peut pas être annulée
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteModal({ isOpen: false, user: null })}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={actionLoading === deleteModal.user.id}
              >
                {actionLoading === deleteModal.user.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  "Supprimer définitivement"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
