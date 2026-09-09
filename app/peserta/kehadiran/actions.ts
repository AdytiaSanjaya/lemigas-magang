"use server";

import { revalidatePath } from "next/cache";

export async function revalidatePresensi() {
  revalidatePath("/peserta/dashboard");
  revalidatePath("/peserta/kehadiran");
  revalidatePath("/admin/dashboard");
  revalidatePath("/mentor/peserta");
}
