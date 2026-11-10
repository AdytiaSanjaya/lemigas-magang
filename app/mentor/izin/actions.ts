"use server";

import { revalidatePath } from "next/cache";

export async function revalidateMentorIzin() {
  revalidatePath("/mentor/izin");
  revalidatePath("/mentor/peserta");
  revalidatePath("/peserta/izin");
  revalidatePath("/peserta/dashboard");
}
