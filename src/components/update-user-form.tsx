"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateUser } from "@/lib/auth-client";

interface UpdateUserFormProps {
  name: string;
}

export const UpdateUserForm = ({ name }: UpdateUserFormProps) => {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    const formData = new FormData(evt.target as HTMLFormElement);
    const newName = String(formData.get("name"));

    if (!newName) {
      return toast.error("Le nom est requis");
    }

    await updateUser({
      name: newName,
      fetchOptions: {
        onRequest: () => {
          setIsPending(true);
        },
        onResponse: () => {
          setIsPending(false);
        },
        onError: (ctx) => {
          toast.error(ctx.error.message);
        },
        onSuccess: () => {
          toast.success("Profil mis à jour avec succès !");
          router.refresh();
        },
      },
    });
  }

  return (
    <form className="w-full space-y-5" onSubmit={handleSubmit}>
      {/* Name Field */}
      <div className="space-y-2">
        <label
          htmlFor="name"
          className="block text-sm font-medium text-zinc-300"
        >
          Pseudonyme
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <User className="h-5 w-5 text-zinc-500" />
          </div>
          <input
            type="text"
            id="name"
            name="name"
            defaultValue={name}
            required
            className="block w-full pl-10 pr-3 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#5096ff] focus:border-transparent transition-all"
            placeholder="Votre pseudonyme"
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full px-4 py-2.5 bg-[#5096ff] hover:bg-[#5096ff]/90 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#5096ff] focus:ring-offset-2 focus:ring-offset-zinc-900"
      >
        {isPending ? "Mise à jour..." : "Mettre à jour"}
      </button>
    </form>
  );
};
