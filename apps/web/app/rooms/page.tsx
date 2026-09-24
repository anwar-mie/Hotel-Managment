"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  BedDouble,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Layers,
  ArrowRight,
} from "lucide-react";
import { PmsSidebar } from "@/components/layout/pms-sidebar";
import { PmsHeader } from "@/components/layout/pms-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/utils";
import type { IRoom, IRoomType, FrontDeskStatus, HousekeepingStatus } from "shared-types";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<IRoom[]>([]);
  const [roomTypes, setRoomTypes] = useState<IRoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [floorFilter, setFloorFilter] = useState<number | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<string | "ALL">("ALL");

  // Room Status Change Modal
  const [selectedRoom, setSelectedRoom] = useState<IRoom | null>(null);
  const [newFrontDeskStatus, setNewFrontDeskStatus] = useState<FrontDeskStatus>("VACANT");
  const [newHkStatus, setNewHkStatus] = useState<HousekeepingStatus>("CLEAN");
  const [statusNotes, setStatusNotes] = useState("");
  const [submittingStatus, setSubmittingStatus] = useState(false);

  const fetchRoomsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [roomsRes, typesRes] = await Promise.all([
        api.get<IRoom[]>("/rooms"),
        api.get<IRoomType[]>("/room-types"),
      ]);

      setRooms(roomsRes.data);
      setRoomTypes(typesRes.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchRoomsData();
    }
  }, [user]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    try {
      setSubmittingStatus(true);
      await api.patch(`/rooms/${selectedRoom.id}/status`, {
        frontDeskStatus: newFrontDeskStatus,
        housekeepingStatus: newHkStatus,
        notes: statusNotes || undefined,
      });

      setSelectedRoom(null);
      setStatusNotes("");
      fetchRoomsData();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSubmittingStatus(false);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    if (floorFilter !== "ALL" && r.floor !== floorFilter) return false;
    if (typeFilter !== "ALL" && r.roomTypeId !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!r.number.toLowerCase().includes(q) && !r.roomType?.name.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PmsSidebar />

      <div className="ml-64 flex-1 flex flex-col min-w-0">
        <PmsHeader onRefresh={fetchRoomsData} />

        <main className="flex-1 p-6 space-y-5">
          {/* Header & Title */}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-700" />
              <span>Room Inventory & Physical Asset Directory</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              30 physical rooms across 3 floors with live status overrides and category assignments
            </p>
          </div>

          {/* Room Type Categories Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {roomTypes.map((rt) => {
              const countForType = rooms.filter((r) => r.roomTypeId === rt.id).length;
              return (
                <div
                  key={rt.id}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{rt.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {countForType} Rooms
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      {rt.description}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-extrabold text-amber-900">
                      {formatCurrency(Number(rt.basePrice))}/night
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Max {rt.capacity} Guests
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search room number (e.g. 101, 205)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            {/* Floor filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-400 text-[11px] uppercase">Floor:</span>
              {(["ALL", 1, 2, 3] as const).map((fl) => (
                <button
                  key={fl}
                  onClick={() => setFloorFilter(fl)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    floorFilter === fl
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {fl === "ALL" ? "All" : `F${fl}`}
                </button>
              ))}
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-400 text-[11px] uppercase">Category:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700"
              >
                <option value="ALL">All Categories</option>
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {filteredRooms.map((room) => {
              const isOccupied = room.frontDeskStatus === "OCCUPIED";
              const isBlocked = room.frontDeskStatus === "OUT_OF_ORDER";
              const isDirty = room.housekeepingStatus === "DIRTY";
              const isInspected = room.housekeepingStatus === "INSPECTED";

              return (
                <Card
                  key={room.id}
                  className="border-slate-200/80 p-3.5 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-extrabold text-slate-900">
                        #{room.number}
                      </span>
                      <Badge
                        variant={
                          isBlocked
                            ? "outOfOrder"
                            : isOccupied
                            ? "occupied"
                            : isDirty
                            ? "dirty"
                            : isInspected
                            ? "inspected"
                            : "clean"
                        }
                      >
                        {isBlocked ? "Blocked" : room.housekeepingStatus}
                      </Badge>
                    </div>

                    <div className="text-[11px] font-medium text-slate-500 truncate">
                      {room.roomType?.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Floor {room.floor}
                    </div>
                  </div>

                  {["ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPER"].includes(user?.role || "") && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => {
                          setSelectedRoom(room);
                          setNewFrontDeskStatus(room.frontDeskStatus);
                          setNewHkStatus(room.housekeepingStatus);
                        }}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                      >
                        Update Status →
                      </button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </main>
      </div>

      {/* Room Status Override Modal */}
      {selectedRoom && (
        <Modal
          isOpen={Boolean(selectedRoom)}
          onClose={() => setSelectedRoom(null)}
          title={`Update Room #${selectedRoom.number}`}
          description={`${selectedRoom.roomType?.name} • Floor ${selectedRoom.floor}`}
        >
          <form onSubmit={handleUpdateStatus} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800">
                Front Desk Status
              </label>
              <select
                value={newFrontDeskStatus}
                onChange={(e) => setNewFrontDeskStatus(e.target.value as FrontDeskStatus)}
                className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <option value="VACANT">VACANT</option>
                <option value="OCCUPIED">OCCUPIED</option>
                <option value="OUT_OF_ORDER">OUT OF ORDER (Maintenance Block)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800">
                Housekeeping Turnover Status
              </label>
              <select
                value={newHkStatus}
                onChange={(e) => setNewHkStatus(e.target.value as HousekeepingStatus)}
                className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <option value="CLEAN">CLEAN (Ready for turnover)</option>
                <option value="INSPECTED">INSPECTED (Supervisor approved)</option>
                <option value="DIRTY">DIRTY (Needs turnover)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800">
                Audit Reason / Notes
              </label>
              <Input
                placeholder="e.g. Manual inspection passed by supervisor"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedRoom(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={submittingStatus}
                className="gap-1.5 font-semibold text-xs"
              >
                <span>{submittingStatus ? "Saving..." : "Save Room Status"}</span>
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
