"use client";
import Link from "next/link";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-6">
      <div className="max-w-md text-center space-y-6">
        <div className="space-y-2">
          <p className="text-6xl font-bold text-primary/30">404</p>
          <h1 className="text-xl font-bold">Page Not Found</h1>
          <p className="text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <Link href="/">
            <Button className="gap-2">
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </Link>
          <Link href="/ask">
            <Button variant="outline" className="gap-2">
              <Search className="w-4 h-4" />
              Ask AI
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
