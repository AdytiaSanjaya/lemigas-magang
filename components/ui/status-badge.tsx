import { STATUS_BADGE, STATUS_LABEL } from "@/lib/format";

export default function StatusBadge({ status }: { status: string }) {
  const badge = STATUS_BADGE[status] ?? "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}