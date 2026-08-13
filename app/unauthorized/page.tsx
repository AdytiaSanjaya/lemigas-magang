export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-3xl">
          &#128274;
        </div>
        <h1 className="text-xl font-semibold text-slate-800">Akses Ditolak</h1>
        <p className="mt-2 text-sm text-slate-500">
          Anda tidak memiliki hak akses untuk halaman ini. Hubungi admin jika menurut Anda
          hal ini keliru.
        </p>
        <a
          href="/login"
          className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Kembali ke Login
        </a>
      </div>
    </main>
  );
}