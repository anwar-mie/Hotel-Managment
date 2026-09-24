"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  BellRing,
  Building2,
  Sparkles,
  Receipt,
  Users,
  LogOut,
  Hotel,
  ShieldCheck,
  ChevronDown,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, DEMO_PERSONAS, DemoPersona } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { hasPermission, getRoleBadgeInfo, PermissionKey } from "@/lib/rbac";

interface NavItemConfig {
  label: string;
  href: string;
  icon: any;
  description: string;
  permission: PermissionKey;
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    label: "Tape Chart",
    href: "/",
    icon: CalendarDays,
    description: "Visual Room & Stay Grid",
    permission: "tapeChart",
  },
  {
    label: "Front Desk",
    href: "/front-desk",
    icon: BellRing,
    description: "Arrivals, Stays & Check-ins",
    permission: "frontDesk",
  },
  {
    label: "Rooms & Inventory",
    href: "/rooms",
    icon: Building2,
    description: "Status & Floor Directory",
    permission: "rooms",
  },
  {
    label: "Operations",
    href: "/operations",
    icon: Sparkles,
    description: "Housekeeping & Maintenance",
    permission: "operations",
  },
  {
    label: "Billing & Folios",
    href: "/billing",
    icon: Receipt,
    description: "Invoices, Payments & Folios",
    permission: "billing",
  },
  {
    label: "Guest Directory",
    href: "/guests",
    icon: Users,
    description: "Profiles & Stay Histories",
    permission: "guests",
  },
];

export function PmsSidebar() {
  const pathname = usePathname();
  const { user, logout, switchPersona } = useAuth();
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const roleInfo = getRoleBadgeInfo(user?.role);

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    hasPermission(user?.role, item.permission)
  );

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-200/80 bg-white shadow-sm">
      {/* Hotel Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-400 shadow-md">
          <Hotel className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight text-slate-900">
            Aura Grand Hotel
          </span>
          <span className="text-[11px] font-medium text-amber-700 flex items-center gap-1">
            <span>★★★★★</span>
            <span className="text-slate-400 font-normal">PMS Core</span>
          </span>
        </div>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Property Management
        </div>

        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all",
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform group-hover:scale-105",
                  isActive ? "text-amber-400" : "text-slate-400 group-hover:text-slate-700"
                )}
              />
              <div className="flex flex-col">
                <span>{item.label}</span>
                {!isActive && (
                  <span className="text-[10px] text-slate-400 font-normal">
                    {item.description}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Persona Switcher / Current Staff Profile */}
      <div className="border-t border-slate-100 p-3 bg-slate-50/50">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPersonaMenu(!showPersonaMenu)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-left shadow-xs hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-white">
                {user?.name?.slice(0, 2).toUpperCase() || "ST"}
              </div>
              <div className="flex flex-col truncate">
                <span className="truncate text-xs font-semibold text-slate-800">
                  {user?.name || "Staff Member"}
                </span>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-slate-300">
                    {user?.role || "GUEST"}
                  </Badge>
                </div>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
          </button>

          {/* Quick Persona Switcher Dropdown */}
          {showPersonaMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-full rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in slide-in-from-bottom-2 z-50">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Switch Staff Persona</span>
                <ShieldCheck className="h-3 w-3 text-slate-400" />
              </div>
              <div className="space-y-0.5">
                {DEMO_PERSONAS.map((persona) => (
                  <button
                    key={persona.email}
                    onClick={async () => {
                      await switchPersona(persona);
                      setShowPersonaMenu(false);
                    }}
                    className={cn(
                      "flex w-full flex-col rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                      user?.email === persona.email
                        ? "bg-slate-900 text-white font-medium"
                        : "hover:bg-slate-100 text-slate-700"
                    )}
                  >
                    <span className="font-semibold">{persona.label}</span>
                    <span className={cn("text-[10px]", user?.email === persona.email ? "text-slate-300" : "text-slate-400")}>
                      {persona.role} • {persona.email}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Logout Action */}
        <div className="mt-2 flex items-center justify-between px-1">
          <Link
            href="/login"
            className="text-[11px] font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1"
          >
            <span>Switch Account</span>
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700"
          >
            <LogOut className="h-3 w-3" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
