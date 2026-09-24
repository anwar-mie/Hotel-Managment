"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { getRoleBadgeInfo } from "@/lib/rbac";

interface AccessDeniedProps {
  moduleName: string;
  allowedRolesDescription: string;
  recommendedPath?: string;
  recommendedLabel?: string;
}

export function AccessDenied({
  moduleName,
  allowedRolesDescription,
  recommendedPath = "/",
  recommendedLabel = "Return to Tape Chart",
}: AccessDeniedProps) {
  const { user } = useAuth();
  const roleInfo = getRoleBadgeInfo(user?.role);

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 px-4">
      <div className="max-w-md w-full rounded-2xl bg-white border border-slate-200/80 p-8 shadow-sm text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/80">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-slate-200 bg-slate-100 text-slate-700">
            <span>Current Role:</span>
            <span className={`px-1.5 py-0.5 rounded font-semibold ${roleInfo.color}`}>
              {roleInfo.label}
            </span>
          </div>

          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Access Restricted: {moduleName}
          </h2>

          <p className="text-xs text-slate-500 leading-relaxed">
            Your role does not have permission to view or manage {moduleName}.
            This section is reserved for: <strong>{allowedRolesDescription}</strong>.
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <Link href={recommendedPath} className="w-full">
            <Button variant="gold" size="sm" className="w-full font-semibold gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              <span>{recommendedLabel}</span>
            </Button>
          </Link>

          <Link href="/" className="w-full">
            <Button variant="ghost" size="sm" className="w-full text-slate-500 hover:text-slate-900 text-xs">
              Back to Tape Chart
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
