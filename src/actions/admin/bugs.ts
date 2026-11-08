"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/admin-guard";

/** Signalement traité / à traiter. */
export async function setBugStatusAction(id: string, status: "OPEN" | "RESOLVED") {
  await assertAdmin();
  await prisma.bugReport.update({ where: { id }, data: { status } });
  revalidatePath("/admin", "layout");
}

export async function deleteBugAction(id: string) {
  await assertAdmin();
  await prisma.bugReport.delete({ where: { id } });
  revalidatePath("/admin", "layout");
}
