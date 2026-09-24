"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Sparkles,
  BedDouble,
  User,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
} from "lucide-react";
import { PmsSidebar } from "@/components/layout/pms-sidebar";
import { PmsHeader } from "@/components/layout/pms-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { NewReservationModal } from "@/components/modals/new-reservation-modal";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canCreateReservation, canCheckInCheckOut, hasPermission } from "@/lib/rbac";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { IRoom, ICalendarStayItem, IRoomType } from "shared-types";

export default function TapeChartPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<IRoom[]>([]);
  const [roomTypes, setRoomTypes] = useState<IRoomType[]>([]);
  const [calendarStays, setCalendarStays] = useState<ICalendarStayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date window: 8 days
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [floorFilter, setFloorFilter] = useState<number | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<string | "ALL">("ALL");

  // Modals
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [selectedCellInfo, setSelectedCellInfo] = useState<{
    roomTypeId?: string;
    roomId?: string;
    roomNumber?: string;
    checkIn?: string;
  }>({});
  const [activeStayDetail, setActiveStayDetail] = useState<ICalendarStayItem | null>(null);
  const [isUpdatingStay, setIsUpdatingStay] = useState(false);

  const fetchRoomsAndGrid = async () => {
    try {
      setLoading(true);
      setError(null);

      // Compute end date (8 days window)
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 8);

      const [roomsRes, typesRes, calendarRes] = await Promise.all([
        api.get<IRoom[]>("/rooms"),
        api.get<IRoomType[]>("/room-types"),
        api.get<ICalendarStayItem[]>("/reservations/calendar", {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        }),
      ]);

      setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : []);
      setRoomTypes(Array.isArray(typesRes.data) ? typesRes.data : []);
      setCalendarStays(
        Array.isArray(calendarRes.data)
          ? calendarRes.data
          : (calendarRes.data as any)?.data || []
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRoomsAndGrid();
    }
  }, [startDate, user]);

  // Generate 8-day column headers
  const days: Date[] = [];
  for (let i = 0; i < 8; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push(d);
  }

  const navigateDays = (delta: number) => {
    const next = new Date(startDate);
    next.setDate(startDate.getDate() + delta);
    setStartDate(next);
  };

  const jumpToToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setStartDate(d);
  };

  // Filter rooms
  const filteredRooms = (Array.isArray(rooms) ? rooms : []).filter((r) => {
    if (floorFilter !== "ALL" && r.floor !== floorFilter) return false;
    if (typeFilter !== "ALL" && r.roomTypeId !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesNumber = r.number.toLowerCase().includes(q);
      const matchesType = r.roomType?.name?.toLowerCase().includes(q);
      if (!matchesNumber && !matchesType) return false;
    }
    return true;
  });

  const getStatusBadge = (r: IRoom) => {
    if (r.frontDeskStatus === "OUT_OF_ORDER") {
      return <Badge variant="outOfOrder">Out of Order</Badge>;
    }
    if (r.frontDeskStatus === "OCCUPIED") {
      return <Badge variant="occupied">Occupied</Badge>;
    }
    if (r.housekeepingStatus === "DIRTY") {
      return <Badge variant="dirty">Dirty</Badge>;
    }
    if (r.housekeepingStatus === "INSPECTED") {
      return <Badge variant="inspected">Inspected</Badge>;
    }
    return <Badge variant="clean">Clean</Badge>;
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PmsSidebar />

      {/* Main Content Area */}
      <div className="ml-64 flex-1 flex flex-col min-w-0">
        <PmsHeader
          onOpenNewBooking={() => {
            setSelectedCellInfo({});
            setIsNewBookingOpen(true);
          }}
          onRefresh={fetchRoomsAndGrid}
        />

        <main className="flex-1 p-6 space-y-5">
          {/* Page Title & Grid Timeline Controller */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <span>Tape Chart & Room Matrix</span>
                <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  {filteredRooms.length} Rooms
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-day room occupancy timeline with live guest stays & direct reservation slots
              </p>
            </div>

            {/* Date Navigation Bar */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={jumpToToday}
                className="text-xs font-semibold"
              >
                Today
              </Button>
              <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-xs p-0.5">
                <button
                  onClick={() => navigateDays(-7)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Previous 7 Days"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="px-3 text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5 text-amber-700" />
                  <span>
                    {days[0] ? formatDate(days[0]) : ""} –{" "}
                    {days[days.length - 1] ? formatDate(days[days.length - 1]!) : ""}
                  </span>
                </div>
                <button
                  onClick={() => navigateDays(7)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Next 7 Days"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search by Room # or Category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            {/* Floor Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-400 text-[11px] uppercase">Floor:</span>
              {(["ALL", 1, 2, 3] as const).map((fl) => (
                <button
                  key={fl}
                  onClick={() => setFloorFilter(fl)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    floorFilter === fl
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  {fl === "ALL" ? "All Floors" : `F${fl}`}
                </button>
              ))}
            </div>

            {/* Category Filter */}
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

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Interactive Tape Chart Matrix */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs min-w-[900px]">
                {/* Table Header: Room Info + Dates */}
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-600 font-semibold">
                    <th className="w-48 p-3 sticky left-0 z-20 bg-slate-100/90 backdrop-blur-sm border-r border-slate-200">
                      Room & Category
                    </th>
                    {days.map((d, idx) => {
                      const isToday =
                        d.toDateString() === new Date().toDateString();
                      return (
                        <th
                          key={idx}
                          className={`p-3 text-center border-r border-slate-200/80 min-w-[110px] ${
                            isToday ? "bg-amber-50/80 text-amber-900" : ""
                          }`}
                        >
                          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                            {d.toLocaleDateString("en-US", { weekday: "short" })}
                          </div>
                          <div className={`text-xs font-extrabold ${isToday ? "text-amber-900" : "text-slate-800"}`}>
                            {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                {/* Table Body: Rooms & Stay Blocks */}
                <tbody className="divide-y divide-slate-100">
                  {filteredRooms.map((room) => {
                    return (
                      <tr
                        key={room.id}
                        className="hover:bg-slate-50/60 transition-colors group"
                      >
                        {/* Sticky Left Room Column */}
                        <td className="p-3 sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-200 shadow-xs">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-sm text-slate-900">
                                  #{room.number}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400">
                                  Fl {room.floor}
                                </span>
                              </div>
                              <div className="text-[11px] font-medium text-slate-500 truncate max-w-[130px]">
                                {room.roomType?.name || "Standard"}
                              </div>
                            </div>
                            <div>{getStatusBadge(room)}</div>
                          </div>
                        </td>

                        {/* 8 Day Cells */}
                        {days.map((day, dIdx) => {
                          const dateStr = day.toISOString().split("T")[0];

                          // Check if a stay overlaps this room on this date
                          const stay = calendarStays.find((s) => {
                            if (s.roomId !== room.id) return false;
                            const checkIn = new Date(s.checkInDate).toISOString().split("T")[0];
                            const checkOut = new Date(s.checkOutDate).toISOString().split("T")[0];
                            if (!dateStr || !checkIn || !checkOut) return false;
                            return dateStr >= checkIn && dateStr < checkOut;
                          });

                          const isStartOfStay =
                            stay &&
                            new Date(stay.checkInDate).toISOString().split("T")[0] === dateStr;

                          return (
                            <td
                              key={dIdx}
                              className="p-1 border-r border-slate-100 text-center relative h-14 align-middle"
                            >
                              {stay ? (
                                <button
                                  type="button"
                                  onClick={() => setActiveStayDetail(stay)}
                                  className={`w-full h-11 rounded-lg px-2 flex flex-col justify-center text-left transition-all shadow-xs ${
                                    stay.status === "CHECKED_IN"
                                      ? "bg-sky-600 text-white hover:bg-sky-700"
                                      : "bg-slate-800 text-amber-300 hover:bg-slate-900"
                                  }`}
                                  title={`${stay.guestName} (${stay.reservationCode})`}
                                >
                                  <div className="flex items-center justify-between text-[11px] font-bold truncate leading-tight">
                                    <span className="truncate">{stay.guestName}</span>
                                    <span className="text-[9px] opacity-80 uppercase ml-1">
                                      {stay.status === "CHECKED_IN" ? "In-House" : "Booked"}
                                    </span>
                                  </div>
                                  <div className="text-[10px] opacity-80 truncate leading-none mt-0.5">
                                    {stay.reservationCode}
                                  </div>
                                </button>
                              ) : canCreateReservation(user?.role) ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCellInfo({
                                      roomTypeId: room.roomTypeId,
                                      roomId: room.id,
                                      roomNumber: room.number,
                                      checkIn: dateStr,
                                    });
                                    setIsNewBookingOpen(true);
                                  }}
                                  className="w-full h-11 rounded-lg border border-dashed border-transparent hover:border-amber-300 hover:bg-amber-50/50 flex items-center justify-center text-slate-300 hover:text-amber-700 transition-all opacity-0 group-hover:opacity-100 text-[11px] font-semibold"
                                >
                                  + Book
                                </button>
                              ) : (
                                <div className="w-full h-11 flex items-center justify-center text-[10px] text-slate-300">
                                  -
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* New Reservation Modal */}
      <NewReservationModal
        isOpen={isNewBookingOpen}
        onClose={() => setIsNewBookingOpen(false)}
        onSuccess={() => {
          fetchRoomsAndGrid();
        }}
        defaultRoomTypeId={selectedCellInfo.roomTypeId}
        defaultRoomId={selectedCellInfo.roomId}
        defaultRoomNumber={selectedCellInfo.roomNumber}
        defaultCheckIn={selectedCellInfo.checkIn}
      />

      {/* Active Stay Inspector Drawer / Modal */}
      {activeStayDetail && (
        <Modal
          isOpen={Boolean(activeStayDetail)}
          onClose={() => setActiveStayDetail(null)}
          title="Guest Stay Details"
          description={`Reservation ${activeStayDetail.reservationCode}`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/80 p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-400 font-bold">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {activeStayDetail.guestName}
                  </h4>
                  <div className="text-xs text-slate-500">
                    Room #{activeStayDetail.roomNumber} • {activeStayDetail.roomTypeName}
                  </div>
                </div>
              </div>
              <Badge
                variant={
                  activeStayDetail.status === "CHECKED_IN" ? "occupied" : "reserved"
                }
              >
                {activeStayDetail.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Check-in Date
                </span>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {formatDate(activeStayDetail.checkInDate)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Check-out Date
                </span>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {formatDate(activeStayDetail.checkOutDate)}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center gap-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveStayDetail(null)}
              >
                Close
              </Button>

              <div className="flex items-center gap-2">
                {canCheckInCheckOut(user?.role) && activeStayDetail.status === "SCHEDULED" && (
                  <Button
                    variant="emerald"
                    size="sm"
                    disabled={isUpdatingStay}
                    onClick={async () => {
                      try {
                        setIsUpdatingStay(true);
                        await api.post(`/reservations/stays/${activeStayDetail.stayId}/check-in`, {
                          roomId: activeStayDetail.roomId,
                        });
                        setActiveStayDetail(null);
                        fetchRoomsAndGrid();
                      } catch (err) {
                        alert(getErrorMessage(err));
                      } finally {
                        setIsUpdatingStay(false);
                      }
                    }}
                    className="gap-1.5 font-semibold text-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{isUpdatingStay ? "Checking In..." : "Check In Guest"}</span>
                  </Button>
                )}

                {canCheckInCheckOut(user?.role) && activeStayDetail.status === "CHECKED_IN" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isUpdatingStay}
                    onClick={async () => {
                      try {
                        setIsUpdatingStay(true);
                        await api.post(`/reservations/stays/${activeStayDetail.stayId}/check-out`, {
                          notes: "Checked out directly from Tape Chart",
                        });
                        setActiveStayDetail(null);
                        fetchRoomsAndGrid();
                      } catch (err) {
                        alert(getErrorMessage(err));
                      } finally {
                        setIsUpdatingStay(false);
                      }
                    }}
                    className="gap-1.5 font-semibold text-xs"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    <span>{isUpdatingStay ? "Checking Out..." : "Check Out"}</span>
                  </Button>
                )}

                {hasPermission(user?.role, "frontDesk") && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      window.location.href = "/front-desk";
                    }}
                    className="gap-1.5 font-semibold text-xs"
                  >
                    <span>Front Desk</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
