"use client";

import { useEffect, useState } from "react";

// Jam digital waktu nyata (waktu lokal browser). Menampilkan waktu berjalan
// dan tanggal lengkap dalam Bahasa Indonesia.
export default function RealtimeClock({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeSize =
    size === "lg" ? "text-4xl md:text-5xl" : size === "sm" ? "text-lg" : "text-2xl";
  const dateSize = size === "lg" ? "text-sm" : size === "sm" ? "text-[11px]" : "text-xs";

  const time = now?.toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const date = now?.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className={`text-center ${className}`}>
      <div className={`font-mono font-semibold tracking-tight tabular-nums ${timeSize}`}>
        {time ?? "--:--:--"}
      </div>
      <div className={`mt-1 text-slate-500 ${dateSize}`}>{date ?? ""}</div>
    </div>
  );
}
