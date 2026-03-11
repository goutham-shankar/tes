"use client";
import { Sidebar } from "./Sidebar";
import { MobileHeader, MobileBottomNav } from "./MobileNav";
import { ToastProvider } from "@/components/ui/toast";
import { KeyboardShortcuts } from "@/components/layout/KeyboardShortcuts";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <KeyboardShortcuts />
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <MobileHeader />
          <main className="flex-1 overflow-hidden pb-16 md:pb-0">{children}</main>
          <MobileBottomNav />
        </div>
      </div>
    </ToastProvider>
  );
}
