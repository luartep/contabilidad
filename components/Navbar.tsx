"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const link = (href: string, label: string) => {
    const active = pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={`text-sm px-3 py-1.5 rounded-lg transition ${
          active
            ? "bg-teal-700 text-white"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="border-b border-slate-200 bg-white sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link href="/empresas" className="font-bold text-teal-700 mr-4">
            ContaPyme
          </Link>
          {link("/empresas", "Empresas")}
          {link("/parametros", "Parámetros")}
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-slate-400 hover:text-slate-700 transition"
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}
