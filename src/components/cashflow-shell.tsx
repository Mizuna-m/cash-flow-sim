import Link from "next/link";

const navItems = [
  { href: "/simulation", label: "Simulation" },
  { href: "/forecast", label: "Forecast Table" },
  { href: "/ledger", label: "Ledger & Entry" },
  { href: "/settings", label: "Settings" }
] as const;

export function CashflowShell({
  currentPath,
  title,
  subtitle,
  children
}: {
  currentPath: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="wire-page">
      <section className="wire-panel wire-top">
        <div>
          <h1 className="wire-main-title">{title}</h1>
          <p className="wire-subtitle">{subtitle}</p>
        </div>
        <nav className="wire-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`wire-nav-link ${currentPath === item.href ? "active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </section>
      {children}
    </main>
  );
}
