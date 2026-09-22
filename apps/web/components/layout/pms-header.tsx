"use client";

import React, { useEffect, useState } from "react";
import { Plus, Sparkles, AlertCircle, CheckCircle2, BedDouble, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { IRoomStats } from "shared-types";

interface PmsHeaderProps {
  onOpenNewBooking?: () => void;
  onRefresh?: () => void;
}

export function PmsHeader({ onOpenNewBooking, onRefresh }: PmsHeaderProps) {
  const [stats, setStats] = useState<IRoomStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get<IRoomStats>("/rooms/stats");
      setStats(res.data);
    } catch {
      // ignore transient err
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchStats();
    onRefresh?.();
  };

  const occupancyPercent =
    stats && stats.total > 0
      ? Math.round((stats.frontDesk.occupied / stats.total) * 100)
      : 0;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-6 backdrop-blur-md">
      {/* Live Hotel Operational Indicators */}
      <div className="flex items-center gap-3 overflow-x-auto py-1">
        {/* Occupancy Rate */}
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-1.5 shadow-xs">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 text-white text-[11px] font-bold">
            %
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none">
              Occupancy
            </span>
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {stats ? `${occupancyPercent}%` : "--"}
            </span>
          </div>
        </div>

        {/* Ready For Guest / Vacant Clean */}
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80 px-3 py-1.5 shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 leading-none">
              Ready Clean
            </span>
            <span className="text-xs font-bold text-emerald-900 leading-tight">
              {stats ? `${stats.readyForGuest} Rooms` : "--"}
            </span>
          </div>
        </div>

        {/* Occupied */}
        <div className="flex items-center gap-2 rounded-xl bg-sky-50/70 border border-sky-200/80 px-3 py-1.5 shadow-xs">
          <BedDouble className="h-4 w-4 text-sky-600" />
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-700 leading-none">
              In-House
            </span>
            <span className="text-xs font-bold text-sky-900 leading-tight">
              {stats ? `${stats.frontDesk.occupied} Stays` : "--"}
            </span>
          </div>
        </div>

        {/* Dirty / Turnover */}
        <div className="flex items-center gap-2 rounded-xl bg-amber-50/70 border border-amber-200/80 px-3 py-1.5 shadow-xs">
          <Sparkles className="h-4 w-4 text-amber-600" />
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 leading-none">
              Turnover
            </span>
            <span className="text-xs font-bold text-amber-900 leading-tight">
              {stats ? `${stats.housekeeping.dirty} Dirty` : "--"}
            </span>
          </div>
        </div>

        {/* Out of Order */}
        {stats && stats.frontDesk.outOfOrder > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50/70 border border-rose-200/80 px-3 py-1.5 shadow-xs">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-700 leading-none">
                Maint. Block
              </span>
              <span className="text-xs font-bold text-rose-900 leading-tight">
                {stats.frontDesk.outOfOrder} Rooms
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Header Quick Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleRefresh}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Refresh property metrics"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-slate-700" : ""}`} />
        </button>

        {onOpenNewBooking && (
          <Button
            onClick={onOpenNewBooking}
            variant="gold"
            size="sm"
            className="flex items-center gap-1.5 font-semibold text-xs shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Reservation</span>
          </Button>
        )}
      </div>
    </header>
  );
}
