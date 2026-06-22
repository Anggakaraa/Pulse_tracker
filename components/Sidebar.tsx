"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { colors } from "@/lib/tokens";
import type { CategoryKey } from "@/lib/tokens";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="4" height="4" rx="0.5" />
        <rect x="7" y="1" width="4" height="4" rx="0.5" />
        <rect x="1" y="7" width="4" height="4" rx="0.5" />
        <rect x="7" y="7" width="4" height="4" rx="0.5" />
      </svg>
    ),
  },
  {
    label: "Experiments",
    href: "/experiments",
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 1v4.5L2 10h8L7.5 5.5V1" />
        <line x1="3.5" y1="1" x2="8.5" y2="1" />
      </svg>
    ),
  },
  {
    label: "Test log",
    href: "/tests",
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="2" y1="3" x2="10" y2="3" />
        <line x1="2" y1="6" x2="10" y2="6" />
        <line x1="2" y1="9" x2="7" y2="9" />
      </svg>
    ),
  },
  {
    label: "Upload",
    href: "/upload",
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 9v1.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V9" />
        <polyline points="4 4 6 2 8 4" />
        <line x1="6" y1="2" x2="6" y2="8" />
      </svg>
    ),
  },
];

const CATEGORIES: { key: CategoryKey; label: string; href: string }[] = [
  { key: "metabolic",      label: "Metabolic",       href: "/metrics/metabolic" },
  { key: "cardiovascular", label: "Cardiovascular",  href: "/metrics/cardiovascular" },
  { key: "inflammation",   label: "Inflammation",    href: "/metrics/inflammation" },
  { key: "hormonal",       label: "Hormonal",        href: "/metrics/hormonal" },
  { key: "nutritional",    label: "Nutritional & Gut", href: "/metrics/nutritional" },
  { key: "blood",          label: "Blood & Organ",     href: "/metrics/blood" },
  { key: "vitals",         label: "Vitals",             href: "/metrics/vitals" },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <p style={{
      fontFamily: "var(--font-dm-sans)",
      fontSize: "12px",
      fontWeight: 300,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "rgba(251,248,240,0.30)",
      margin: "0 0 4px 0",
      padding: "0 8px",
    }}>
      {children}
    </p>
  );
}

function NavItem({ label, href, icon, active }: { label: string; href: string; icon: React.ReactNode; active: boolean }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "7px 8px",
        borderRadius: "4px",
        backgroundColor: active ? "rgba(251,248,240,0.08)" : "transparent",
        color: active ? "#FBF8F0" : "rgba(251,248,240,0.55)",
        fontFamily: "var(--font-dm-sans)",
        fontSize: "14px",
        fontWeight: 400,
        transition: `background-color var(--duration-micro) var(--ease), color var(--duration-micro) var(--ease)`,
        cursor: "pointer",
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(251,248,240,0.05)";
          (e.currentTarget as HTMLDivElement).style.color = "rgba(251,248,240,0.75)";
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
          (e.currentTarget as HTMLDivElement).style.color = "rgba(251,248,240,0.55)";
        }
      }}
      >
        <span style={{ flexShrink: 0, display: "flex" }}>{icon}</span>
        {label}
      </div>
    </Link>
  );
}

function Divider() {
  return (
    <div style={{
      height: "1px",
      backgroundColor: "rgba(251,248,240,0.08)",
      margin: "10px 0",
    }} />
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: "185px",
      flexShrink: 0,
      backgroundColor: "#2A2520",
      height: "100vh",
      position: "fixed",
      top: 0,
      left: 0,
      display: "flex",
      flexDirection: "column",
      padding: "20px 10px",
      gap: "2px",
      overflowY: "auto",
    }}>
      {/* Product name */}
      <div style={{
        fontFamily: "var(--font-outfit)",
        fontWeight: 600,
        fontSize: "14px",
        color: "#FBF8F0",
        padding: "0 8px",
        marginBottom: "20px",
      }}>
        Pulse
      </div>

      {/* Views */}
      <SectionLabel>Views</SectionLabel>
      {NAV_ITEMS.map(item => (
        <NavItem
          key={item.href}
          label={item.label}
          href={item.href}
          icon={item.icon}
          active={pathname === item.href || pathname.startsWith(item.href + "/")}
        />
      ))}

      <Divider />

      {/* Categories */}
      <SectionLabel>Categories</SectionLabel>
      {CATEGORIES.map(cat => (
        <NavItem
          key={cat.href}
          label={cat.label}
          href={cat.href}
          icon={
            <span style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: colors.category[cat.key],
              display: "inline-block",
              flexShrink: 0,
            }} />
          }
          active={pathname === cat.href}
        />
      ))}
    </aside>
  );
}
