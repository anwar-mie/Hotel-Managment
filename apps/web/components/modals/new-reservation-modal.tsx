"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { IRoomType, IGuest } from "shared-types";
import { CheckCircle2, UserPlus, Users, Calendar, Sparkles } from "lucide-react";

interface NewReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultRoomTypeId?: string;
  defaultCheckIn?: string;
}

export function NewReservationModal({
  isOpen,
  onClose,
  onSuccess,
  defaultRoomTypeId,
  defaultCheckIn,
}: NewReservationModalProps) {
  const [roomTypes, setRoomTypes] = useState<IRoomType[]>([]);
  const [guests, setGuests] = useState<IGuest[]>([]);
  const [selectedGuestId, setSelectedGuestId] = useState("");
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState(defaultRoomTypeId || "");

  // Date selection
  const today = new Date().toISOString().split("T")[0] || "";
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0] || "";
  const [checkInDate, setCheckInDate] = useState(defaultCheckIn || today);
  const [checkOutDate, setCheckOutDate] = useState(tomorrow);
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);

  // New guest inline creator
  const [isCreatingNewGuest, setIsCreatingNewGuest] = useState(false);
  const [newGuestFirstName, setNewGuestFirstName] = useState("");
  const [newGuestLastName, setNewGuestLastName] = useState("");
  const [newGuestEmail, setNewGuestEmail] = useState("");
  const [newGuestPhone, setNewGuestPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
      if (defaultRoomTypeId) setSelectedRoomTypeId(defaultRoomTypeId);
      if (defaultCheckIn) setCheckInDate(defaultCheckIn);
    }
  }, [isOpen, defaultRoomTypeId, defaultCheckIn]);

  const fetchInitialData = async () => {
    try {
      const [rtRes, gRes] = await Promise.all([
        api.get<IRoomType[]>("/room-types"),
        api.get<IGuest[]>("/guests"),
      ]);
      setRoomTypes(rtRes.data);
      if (rtRes.data.length > 0 && !selectedRoomTypeId) {
        const firstRt = rtRes.data[0];
        if (firstRt) setSelectedRoomTypeId(firstRt.id);
      }
      setGuests(gRes.data);
      if (gRes.data.length > 0 && !selectedGuestId) {
        const firstG = gRes.data[0];
        if (firstG) setSelectedGuestId(firstG.id);
      }
    } catch (err) {
      console.error("Failed to load reservation data", err);
    }
  };

  // Calculate nights and estimated total
  const selectedRoomType = roomTypes.find((rt) => rt.id === selectedRoomTypeId);
  const nights = Math.max(
    1,
    Math.round(
      (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );
  const estimatedTotal = selectedRoomType ? Number(selectedRoomType.basePrice) * nights : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let finalGuestId = selectedGuestId;

      // Create new guest if toggled
      if (isCreatingNewGuest) {
        if (!newGuestFirstName || !newGuestLastName) {
          throw new Error("Guest first and last name are required.");
        }
        const guestRes = await api.post<IGuest>("/guests", {
          firstName: newGuestFirstName,
          lastName: newGuestLastName,
          email: newGuestEmail || undefined,
          phone: newGuestPhone || undefined,
        });
        finalGuestId = guestRes.data.id;
      }

      if (!finalGuestId) {
        throw new Error("Please select or create a guest profile.");
      }
      if (!selectedRoomTypeId) {
        throw new Error("Please select a room type.");
      }

      await api.post("/reservations", {
        bookerGuestId: finalGuestId,
        stays: [
          {
            roomTypeId: selectedRoomTypeId,
            checkInDate: new Date(checkInDate).toISOString(),
            checkOutDate: new Date(checkOutDate).toISOString(),
            adults: Number(adultCount),
            children: Number(childCount),
          },
        ],
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Reservation"
      description="Book an upcoming guest stay with instant folio creation"
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Guest Selector / Creator */}
        <div className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-slate-500" />
              <span>Primary Guest</span>
            </label>
            <button
              type="button"
              onClick={() => setIsCreatingNewGuest(!isCreatingNewGuest)}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>{isCreatingNewGuest ? "Select Existing" : "+ New Guest Profile"}</span>
            </button>
          </div>

          {isCreatingNewGuest ? (
            <div className="grid grid-cols-1 gap-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="First Name (e.g. Eleanor)"
                  value={newGuestFirstName}
                  onChange={(e) => setNewGuestFirstName(e.target.value)}
                  required
                />
                <Input
                  placeholder="Last Name (e.g. Vance)"
                  value={newGuestLastName}
                  onChange={(e) => setNewGuestLastName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={newGuestEmail}
                  onChange={(e) => setNewGuestEmail(e.target.value)}
                />
                <Input
                  placeholder="Phone number"
                  value={newGuestPhone}
                  onChange={(e) => setNewGuestPhone(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <select
              value={selectedGuestId}
              onChange={(e) => setSelectedGuestId(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              {guests.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.firstName} {g.lastName} ({g.email || "No email"})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Room Type Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-800">Room Category</label>
          <div className="grid grid-cols-2 gap-2">
            {roomTypes.map((rt) => {
              const isSelected = selectedRoomTypeId === rt.id;
              return (
                <button
                  type="button"
                  key={rt.id}
                  onClick={() => setSelectedRoomTypeId(rt.id)}
                  className={`flex flex-col text-left p-3 rounded-xl border text-xs transition-all ${
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                  }`}
                >
                  <span className="font-bold">{rt.name}</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className={isSelected ? "text-amber-400 font-semibold" : "text-amber-700 font-semibold"}>
                      {formatCurrency(Number(rt.basePrice))}/night
                    </span>
                    <span className={isSelected ? "text-slate-300 text-[10px]" : "text-slate-400 text-[10px]"}>
                      Max {rt.capacity} guests
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dates & Guests */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400" />
              <span>Check-in</span>
            </label>
            <Input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400" />
              <span>Check-out ({nights} nights)</span>
            </label>
            <Input
              type="date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Guest Occupants */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Adults</label>
            <Input
              type="number"
              min="1"
              max="6"
              value={adultCount}
              onChange={(e) => setAdultCount(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Children</label>
            <Input
              type="number"
              min="0"
              max="4"
              value={childCount}
              onChange={(e) => setChildCount(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Booking Summary Box */}
        <div className="flex items-center justify-between rounded-xl bg-amber-50/70 border border-amber-200/80 p-3.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-700" />
            <div>
              <div className="text-xs font-bold text-amber-900">
                {selectedRoomType?.name || "Selected Room"} • {nights} Night{nights > 1 ? "s" : ""}
              </div>
              <div className="text-[11px] text-amber-800">
                Folio generated with room charges upon booking
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-amber-800">Estimated Total</div>
            <div className="text-base font-extrabold text-amber-950">
              {formatCurrency(estimatedTotal)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="gold" disabled={loading} className="gap-1.5 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            <span>{loading ? "Confirming..." : "Confirm Reservation"}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
