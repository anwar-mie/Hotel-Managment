"use client";

import React, { useState, useEffect } from "react";
import {
  BellRing,
  LogIn,
  LogOut,
  BedDouble,
  User,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  ArrowRight,
  Plus,
} from "lucide-react";
import { PmsSidebar } from "@/components/layout/pms-sidebar";
import { PmsHeader } from "@/components/layout/pms-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Modal } from "@/components/ui/modal";
import { NewReservationModal } from "@/components/modals/new-reservation-modal";
import { AccessDenied } from "@/components/layout/access-denied";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { hasPermission, canCreateReservation, canCheckInCheckOut } from "@/lib/rbac";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { IReservation, IRoom } from "shared-types";

export default function FrontDeskPage() {
  const [activeTab, setActiveTab] = useState("ARRIVALS");
  const [reservations, setReservations] = useState<IReservation[]>([]);
  const [availableRooms, setAvailableRooms] = useState<IRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [checkInTarget, setCheckInTarget] = useState<{
    reservation: IReservation;
    stayId: string;
    roomTypeId: string;
    guestName: string;
  } | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Check-out modal
  const [checkOutTarget, setCheckOutTarget] = useState<{
    reservation: IReservation;
    stayId: string;
    roomNumber?: string;
  } | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [settleMethod, setSettleMethod] = useState("CARD");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resRes, roomsRes] = await Promise.all([
        api.get<IReservation[]>("/reservations"),
        api.get<IRoom[]>("/rooms", {
          params: { frontDeskStatus: "VACANT", housekeepingStatus: "CLEAN" },
        }),
      ]);
      const resList = Array.isArray(resRes.data)
        ? resRes.data
        : (resRes.data as any)?.data || [];
      const roomsList = Array.isArray(roomsRes.data)
        ? roomsRes.data
        : (roomsRes.data as any)?.data || [];
      setReservations(resList);
      setAvailableRooms(roomsList);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const { user } = useAuth();

  useEffect(() => {
    if (user && hasPermission(user.role, "frontDesk")) {
      fetchData();
    } else if (user) {
      setLoading(false);
    }
  }, [user]);

  const isAuthorized = hasPermission(user?.role, "frontDesk");

  const filteredReservations = (Array.isArray(reservations) ? reservations : []).filter((res) => {
    const q = searchQuery.toLowerCase();
    const guestFullName = res.booker
      ? `${res.booker.firstName} ${res.booker.lastName}`.toLowerCase()
      : "";
    const matchesGuest = guestFullName.includes(q);
    const matchesCode = res.reservationCode.toLowerCase().includes(q);
    if (searchQuery && !matchesGuest && !matchesCode) return false;

    const mainStay = res.stays?.[0];
    if (!mainStay) return false;

    if (activeTab === "ARRIVALS") {
      return mainStay.status === "SCHEDULED" || res.status === "CONFIRMED";
    }
    if (activeTab === "IN_HOUSE") {
      return mainStay.status === "CHECKED_IN" || res.status === "CHECKED_IN";
    }
    if (activeTab === "DEPARTURES") {
      return mainStay.status === "CHECKED_IN";
    }
    return true;
  });

  const handleExecuteCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInTarget || !selectedRoomId) return;

    try {
      setIsCheckingIn(true);
      await api.post(`/reservations/stays/${checkInTarget.stayId}/check-in`, {
        roomId: selectedRoomId,
      });
      setCheckInTarget(null);
      setSelectedRoomId("");
      fetchData();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleExecuteCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkOutTarget) return;

    try {
      setIsCheckingOut(true);
      await api.post(`/reservations/stays/${checkOutTarget.stayId}/check-out`, {
        notes: `Checked out at Front Desk. Payment settled via ${settleMethod}.`,
      });
      setCheckOutTarget(null);
      fetchData();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PmsSidebar />

      <div className="ml-64 flex-1 flex flex-col min-w-0">
        <PmsHeader
          onOpenNewBooking={() => setIsNewBookingOpen(true)}
          onRefresh={fetchData}
        />

        <main className="flex-1 p-6 space-y-5">
          {!isAuthorized ? (
            <AccessDenied
              moduleName="Front Desk Operations"
              allowedRolesDescription="Front Desk Receptionists, Hotel Managers, and System Administrators"
            />
          ) : (
            <>
              {/* Header & Title */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <BellRing className="h-5 w-5 text-amber-700" />
                    <span>Front Desk Operations</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Expedited guest check-ins, keycard issuance, active stay management & check-out folios
                  </p>
                </div>

                {canCreateReservation(user?.role) && (
                  <Button
                    onClick={() => setIsNewBookingOpen(true)}
                    variant="gold"
                    size="sm"
                    className="font-semibold gap-1.5 shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Walk-in / New Booking</span>
                  </Button>
                )}
              </div>

          {/* Quick Search */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search arrivals or in-house guests by name or booking code (e.g. RES-SEED01)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          {/* Tabs Filter */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="ARRIVALS">
                Arrivals & Pending Check-ins
              </TabsTrigger>
              <TabsTrigger value="IN_HOUSE">
                In-House Active Stays
              </TabsTrigger>
              <TabsTrigger value="DEPARTURES">
                Departures & Folio Settlement
              </TabsTrigger>
            </TabsList>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
                {error}
              </div>
            )}

            {/* Reservations Cards List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {filteredReservations.map((res) => {
                const stay = res.stays?.[0];
                const isCheckedIn = stay?.status === "CHECKED_IN";
                const guestName = res.booker
                  ? `${res.booker.firstName} ${res.booker.lastName}`
                  : "Guest";

                return (
                  <Card
                    key={res.id}
                    className="border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <CardHeader className="p-4 pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {res.reservationCode}
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                            {guestName}
                          </h3>
                          <div className="text-xs text-slate-500">
                            {res.booker?.email || "No email"}
                          </div>
                        </div>
                        <Badge variant={isCheckedIn ? "occupied" : "reserved"}>
                          {isCheckedIn ? "In-House" : "Scheduled"}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-0 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs rounded-xl bg-slate-50 p-2.5 border border-slate-200/60">
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">
                            Dates
                          </span>
                          <div className="font-bold text-slate-800 text-[11px] mt-0.5">
                            {stay ? formatDate(stay.checkInDate) : "--"}
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">
                            Room
                          </span>
                          <div className="font-bold text-slate-800 text-[11px] mt-0.5 flex items-center gap-1">
                            <BedDouble className="h-3.5 w-3.5 text-slate-500" />
                            <span>
                              {stay?.room ? `#${stay.room.number}` : "Unassigned"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-1 flex items-center justify-end gap-2 border-t border-slate-100">
                        {!isCheckedIn ? (
                          <Button
                            variant="emerald"
                            size="sm"
                            onClick={() => {
                              if (stay) {
                                setCheckInTarget({
                                  reservation: res,
                                  stayId: stay.id,
                                  roomTypeId: stay.roomTypeId,
                                  guestName,
                                });
                              }
                            }}
                            className="w-full font-semibold gap-1 text-xs"
                          >
                            <LogIn className="h-3.5 w-3.5" />
                            <span>Process Check-In</span>
                          </Button>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (stay) {
                                setCheckOutTarget({
                                  reservation: res,
                                  stayId: stay.id,
                                  roomNumber: stay.room?.number,
                                });
                              }
                            }}
                            className="w-full font-semibold gap-1 text-xs"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            <span>Process Check-Out</span>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {filteredReservations.length === 0 && !loading && (
                <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                  <BellRing className="mx-auto h-8 w-8 text-slate-300" />
                  <h4 className="mt-2 text-sm font-semibold text-slate-700">
                    No reservations found in this category
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Try another search query or create a new walk-in guest stay
                  </p>
                </div>
              )}
            </div>
          </Tabs>
          </>
          )}
        </main>
      </div>

      {/* Check-In Modal */}
      {checkInTarget && (
        <Modal
          isOpen={Boolean(checkInTarget)}
          onClose={() => setCheckInTarget(null)}
          title="Guest Check-In"
          description={`Assign physical room & check in ${checkInTarget.guestName}`}
        >
          <form onSubmit={handleExecuteCheckIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800">
                Select Available Clean Room
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                required
                className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <option value="">-- Choose Vacant Clean Room --</option>
                {(Array.isArray(availableRooms) ? availableRooms : []).map((r) => (
                  <option key={r.id} value={r.id}>
                    Room #{r.number} (Floor {r.floor} • {r.roomType?.name})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Only inspected/clean vacant rooms are eligible for assignment.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCheckInTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="emerald"
                disabled={isCheckingIn || !selectedRoomId}
                className="gap-1.5 font-semibold text-xs"
              >
                <LogIn className="h-4 w-4" />
                <span>{isCheckingIn ? "Checking In..." : "Confirm Check-In"}</span>
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Check-Out Modal */}
      {checkOutTarget && (
        <Modal
          isOpen={Boolean(checkOutTarget)}
          onClose={() => setCheckOutTarget(null)}
          title="Guest Check-Out & Folio Settlement"
          description={`Release Room #${checkOutTarget.roomNumber} & close folio`}
        >
          <form onSubmit={handleExecuteCheckOut} className="space-y-4">
            <div className="rounded-xl bg-amber-50/80 border border-amber-200/80 p-3.5 space-y-2 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-bold">
                <Sparkles className="h-4 w-4 text-amber-700" />
                <span>Turnover Scheduling Trigger</span>
              </div>
              <p className="text-amber-800 leading-relaxed text-[11px]">
                Upon check-out, Room #{checkOutTarget.roomNumber} will automatically transition to{" "}
                <strong>VACANT DIRTY</strong>, and an automated Housekeeping Turnover task will be
                scheduled for cleaning staff.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800">
                Payment Settlement Method
              </label>
              <select
                value={settleMethod}
                onChange={(e) => setSettleMethod(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <option value="CARD">Credit / Debit Card</option>
                <option value="CASH">Cash Deposit</option>
                <option value="BANK_TRANSFER">Bank Wire / Corporate</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCheckOutTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isCheckingOut}
                className="gap-1.5 font-semibold text-xs"
              >
                <LogOut className="h-4 w-4" />
                <span>{isCheckingOut ? "Processing..." : "Complete Check-Out"}</span>
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* New Reservation Wizard */}
      <NewReservationModal
        isOpen={isNewBookingOpen}
        onClose={() => setIsNewBookingOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
