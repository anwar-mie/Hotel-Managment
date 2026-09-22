"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Hotel } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/login" || pathname.startsWith("/login");

  useEffect(() => {
    if (!isLoading) {
      if (!user && !isLoginPage) {
        router.replace("/login");
      } else if (user && isLoginPage) {
        router.replace("/");
      }
    }
  }, [user, isLoading, isLoginPage, router]);

  // If initial load, show branded luxury loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-amber-400 shadow-xl animate-pulse">
          <Hotel className="h-7 w-7" />
        </div>
        <span className="mt-4 text-xs font-bold tracking-wider uppercase text-slate-500">
          Loading Aura Grand PMS...
        </span>
      </div>
    );
  }

  // If not authenticated and trying to access protected route, render blank while redirecting
  if (!user && !isLoginPage) {
    return null;
  }

  return <>{children}</>;
}
