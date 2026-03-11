"use client";
import { LayoutDashboard } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/hooks/useDashboard";

export default function DashboardPage() {
  const stats = useDashboard();

  return (
    <AppShell>
      <div className="h-full overflow-y-auto px-6 py-5 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
          <h1 className="font-semibold text-sm text-muted-foreground">Dashboard</h1>
        </div>

        {stats ? (
          <DashboardView stats={stats} />
        ) : (
          <DashboardSkeleton />
        )}
      </div>
    </AppShell>
  );
}
