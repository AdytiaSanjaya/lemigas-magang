import Link from "next/link";

interface PaginationProps {
  page: number;
  totalPages: number;
  basePath: string;
  query?: string;
}

export default function Pagination({ page, totalPages, basePath, query = "" }: PaginationProps) {
  const seen = new Set<string>();
  const pages: number[] = [];

  for (let p = 1; p <= totalPages; p++) {
    if (
      p === 1 ||
      p === totalPages ||
      Math.abs(p - page) <= 1
    ) {
      pages.push(p);
    } else if (!seen.has("sign")) {
      pages.push(0);
      seen.add("sign");
    }
  }

  function href(p: number) {
    const params = new URLSearchParams(query);
    params.set("page", String(p));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <nav className="mt-4 flex items-center justify-center gap-1 text-sm">
      {page > 1 ? (
        <Link href={href(1)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50">
          &laquo;
        </Link>
      ) : null}

      {pages.map((p, i) =>
        p === 0 ? (
          <span key={`e${i}`} className="px-2 text-slate-400">...</span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            className={`rounded-lg border px-3 py-1.5 ${
              p === page
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {p}
          </Link>
        )
      )}

      {page < totalPages ? (
        <Link href={href(totalPages)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50">
          &raquo;
        </Link>
      ) : null}
    </nav>
  );
}