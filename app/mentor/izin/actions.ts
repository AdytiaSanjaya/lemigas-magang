"use server";

import { revalidatePath } from "next/cache";

export async function revalidateMentorIzin() {
  revalidatePath("/mentor/izin");
  revalidatePath("/peserta/izin");
  revalidatePath("/peserta/dashboard");
}
