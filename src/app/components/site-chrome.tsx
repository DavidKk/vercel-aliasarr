import Link from "next/link";
import type { ReactNode } from "react";

export function SiteNav({ active }: { active?: "home" | "admin" }) {
  return (
    <nav className="nav">
      <Link href="/" className="brand-mark">
        Aliasarr
        <span>on Vercel</span>
      </Link>
      <div className="nav-links">
        <Link href="/" aria-current={active === "home" ? "page" : undefined}>
          首页
        </Link>
        <Link
          href="/admin"
          aria-current={active === "admin" ? "page" : undefined}
        >
          试搜
        </Link>
        <a href="/api/health" target="_blank" rel="noreferrer">
          Health
        </a>
      </div>
    </nav>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return <div className="shell">{children}</div>;
}
