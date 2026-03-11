"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Lightbulb,
  Tag,
  MessageSquare,
  Settings,
  LayoutDashboard,
  Menu,
  X,
  BookOpen,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/",          label: "Insights",  icon: Lightbulb },
  { href: "/tags",      label: "Tags",      icon: Tag },
  { href: "/ask",       label: "Ask AI",    icon: MessageSquare },
  { href: "/settings",  label: "Settings",  icon: Settings },
];

// Bottom nav items (subset for mobile tab bar)
const BOTTOM_NAV = [
  { href: "/",          label: "Insights",  icon: Lightbulb },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ask",       label: "Ask AI",    icon: MessageSquare },
  { href: "/tags",      label: "Tags",      icon: Tag },
  { href: "/settings",  label: "Settings",  icon: Settings },
];

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <>
      {/* Top bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-semibold text-sm tracking-tight">InsightVault</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Drawer overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <nav
            className="absolute right-0 top-0 h-full w-64 bg-card border-l border-border p-4 space-y-1 animate-slide-in"
            onClick={(e) => e.stopPropagation()}
            aria-label="Mobile navigation"
          >
            <div className="flex items-center justify-between mb-6 px-2">
              <span className="text-sm font-semibold">Menu</span>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-accent"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm safe-area-bottom"
      aria-label="Mobile tab navigation"
    >
      <div className="flex items-center justify-around px-2 py-1">
        {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-[10px] font-medium transition-colors min-w-0",
                active
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", active && "text-primary")} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
