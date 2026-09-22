"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Phone,
  Globe,
  CreditCard,
  History,
  CheckCircle2,
} from "lucide-react";
import { PmsSidebar } from "@/components/layout/pms-sidebar";
import { PmsHeader } from "@/components/layout/pms-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { api, getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { IGuest, IdentificationType } from "shared-types";

export default function GuestsPage() {
  const [guests, setGuests] = useState<IGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // New Guest Modal
  const [isNewGuestOpen, setIsNewGuestOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationality, setNationality] = useState("");
  const [identificationType, setIdentificationType] = useState<IdentificationType>("PASSPORT");
  const [identificationNumber, setIdentificationNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchGuests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<IGuest[]>("/guests");
      setGuests(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  const handleCreateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName) return;

    try {
      setSubmitting(true);
      await api.post("/guests", {
        firstName,
        lastName,
        email: email || undefined,
        phone: phone || undefined,
        nationality: nationality || undefined,
        identificationType,
        identificationNumber: identificationNumber || undefined,
      });

      setIsNewGuestOpen(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setNationality("");
      setIdentificationNumber("");
      fetchGuests();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredGuests = guests.filter((g) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const fullName = `${g.firstName} ${g.lastName}`.toLowerCase();
    return (
      fullName.includes(q) ||
      (g.email && g.email.toLowerCase().includes(q)) ||
      (g.nationality && g.nationality.toLowerCase().includes(q)) ||
      (g.identificationNumber && g.identificationNumber.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PmsSidebar />

      <div className="ml-64 flex-1 flex flex-col min-w-0">
        <PmsHeader onRefresh={fetchGuests} />

        <main className="flex-1 p-6 space-y-5">
          {/* Header & Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-700" />
                <span>Guest Profiles & Directory</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Centralized guest history, loyalty tracking, identification records & contact profiles
              </p>
            </div>

            <Button
              onClick={() => setIsNewGuestOpen(true)}
              variant="gold"
              size="sm"
              className="font-semibold gap-1.5 shadow-sm"
            >
              <UserPlus className="h-4 w-4" />
              <span>Create Guest Profile</span>
            </Button>
          </div>

          {/* Search bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search by guest name, email, nationality or passport number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Guest Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGuests.map((guest) => {
              const fullName = `${guest.firstName} ${guest.lastName}`;
              const reservationsCount = guest._count?.bookedReservations || 0;

              return (
                <Card
                  key={guest.id}
                  className="border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all p-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-400 font-bold text-sm shadow-xs">
                          {guest.firstName.slice(0, 1)}
                          {guest.lastName.slice(0, 1)}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            {fullName}
                          </h3>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span>{guest.email || "No email on file"}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {reservationsCount} {reservationsCount === 1 ? "Stay" : "Stays"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          Phone
                        </span>
                        <div className="text-[11px] font-medium text-slate-700">
                          {guest.phone || "Not specified"}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          Nationality
                        </span>
                        <div className="text-[11px] font-medium text-slate-700">
                          {guest.nationality || "International"}
                        </div>
                      </div>
                    </div>

                    {guest.identificationNumber && (
                      <div className="rounded-lg bg-slate-50 border border-slate-200/70 p-2 text-xs flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {guest.identificationType || "ID"}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-slate-800">
                          {guest.identificationNumber}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>Joined: {formatDate(guest.createdAt)}</span>
                    <span className="text-emerald-700 font-medium text-[11px]">
                      Verified Profile
                    </span>
                  </div>
                </Card>
              );
            })}

            {filteredGuests.length === 0 && !loading && (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                <Users className="mx-auto h-8 w-8 text-slate-300" />
                <h4 className="mt-2 text-sm font-semibold text-slate-800">
                  No guest profiles found
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Create a new guest record or clear the search query
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* New Guest Profile Modal */}
      <Modal
        isOpen={isNewGuestOpen}
        onClose={() => setIsNewGuestOpen(false)}
        title="Create New Guest Profile"
        description="Register a new guest with passport / contact verification"
      >
        <form onSubmit={handleCreateGuest} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800">First Name</label>
              <Input
                required
                placeholder="e.g. Eleanor"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800">Last Name</label>
              <Input
                required
                placeholder="e.g. Vance"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800">Email Address</label>
              <Input
                type="email"
                placeholder="guest@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800">Phone Number</label>
              <Input
                placeholder="+1 (555) 019-2834"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800">Nationality</label>
              <Input
                placeholder="e.g. United States, France"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800">ID Type</label>
              <select
                value={identificationType}
                onChange={(e) => setIdentificationType(e.target.value as IdentificationType)}
                className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <option value="PASSPORT">Passport</option>
                <option value="NATIONAL_ID">National ID</option>
                <option value="DRIVING_LICENSE">Driving License</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800">
              ID Document Number
            </label>
            <Input
              placeholder="e.g. US-P-9842104"
              value={identificationNumber}
              onChange={(e) => setIdentificationNumber(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewGuestOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gold"
              disabled={submitting}
              className="gap-1.5 font-semibold text-xs"
            >
              <UserPlus className="h-4 w-4" />
              <span>{submitting ? "Saving..." : "Save Guest Profile"}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
