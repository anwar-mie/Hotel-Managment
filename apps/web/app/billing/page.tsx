"use client";

import React, { useState, useEffect } from "react";
import {
  Receipt,
  CreditCard,
  DollarSign,
  Plus,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText,
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
import { formatCurrency, formatDate } from "@/lib/utils";
import type {
  IInvoice,
  IBillingSummary,
  IService,
  PaymentMethod,
} from "shared-types";

export default function BillingPage() {
  const [invoices, setInvoices] = useState<IInvoice[]>([]);
  const [summary, setSummary] = useState<IBillingSummary | null>(null);
  const [services, setServices] = useState<IService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selected Folio Inspector Modal
  const [selectedInvoice, setSelectedInvoice] = useState<IInvoice | null>(null);

  // Payment modal inside folio
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CARD");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [invRes, sumRes, servRes] = await Promise.all([
        api.get<IInvoice[]>("/billing/invoices"),
        api.get<IBillingSummary>("/billing/invoices/summary"),
        api.get<IService[]>("/billing/services"),
      ]);

      setInvoices(Array.isArray(invRes.data) ? invRes.data : (invRes.data as any)?.data || []);
      setSummary(sumRes.data);
      setServices(Array.isArray(servRes.data) ? servRes.data : (servRes.data as any)?.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchBillingData();
    }
  }, [user]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !paymentAmount) return;

    try {
      setSubmittingPayment(true);
      await api.post(`/billing/invoices/${selectedInvoice.id}/payments`, {
        amount: Number(paymentAmount),
        method: paymentMethod,
        transactionReference: `PMS-POS-${Date.now().toString().slice(-6)}`,
      });
      setIsRecordingPayment(false);
      setPaymentAmount("");

      // Refresh invoice details & billing summary
      const updatedInv = await api.get<IInvoice>(`/billing/invoices/${selectedInvoice.id}`);
      setSelectedInvoice(updatedInv.data);
      fetchBillingData();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSubmittingPayment(false);
    }
  };

  const filteredInvoices = (Array.isArray(invoices) ? invoices : []).filter((inv) => {
    if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNum = inv.invoiceNumber.toLowerCase().includes(q);
      const guestName = (inv as any).reservation?.booker
        ? `${(inv as any).reservation.booker.firstName} ${(inv as any).reservation.booker.lastName}`.toLowerCase()
        : "";
      if (!matchNum && !guestName.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PmsSidebar />

      <div className="ml-64 flex-1 flex flex-col min-w-0">
        <PmsHeader onRefresh={fetchBillingData} />

        <main className="flex-1 p-6 space-y-5">
          {/* Header & Title */}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-amber-700" />
              <span>Billing, Invoices & Folio Desk</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live guest folios, payment processing, ancillary charges settlement & accounts receivable
            </p>
          </div>

          {/* Revenue KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Gross Invoiced
              </span>
              <div className="text-xl font-extrabold text-slate-900 mt-1">
                {summary ? formatCurrency(summary.totalInvoiced) : "--"}
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Total stay & service billings
              </span>
            </div>

            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Collected Revenue
              </span>
              <div className="text-xl font-extrabold text-emerald-950 mt-1">
                {summary ? formatCurrency(summary.totalPaid) : "--"}
              </div>
              <span className="text-[11px] text-emerald-700 mt-0.5 block">
                Settled via Card, Cash & Bank
              </span>
            </div>

            <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Outstanding Balance
              </span>
              <div className="text-xl font-extrabold text-amber-950 mt-1">
                {summary ? formatCurrency(summary.totalOutstanding) : "--"}
              </div>
              <span className="text-[11px] text-amber-800 mt-0.5 block">
                Due upon departure checkout
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Folios
              </span>
              <div className="text-xl font-extrabold text-slate-900 mt-1">
                {summary ? Object.values(summary.invoicesCount).reduce((a, b) => a + b, 0) : "--"}
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {summary?.invoicesCount?.paid ?? 0} Paid • {summary?.invoicesCount?.issued ?? 0} Open
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search folio # (e.g. INV-SEED-001) or guest name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              {(["ALL", "PAID", "PARTIALLY_PAID", "ISSUED"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === st
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st === "ALL" ? "All Folios" : st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Folios Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600">
                  <th className="p-3.5">Folio Number</th>
                  <th className="p-3.5">Guest & Stay</th>
                  <th className="p-3.5">Total Amount</th>
                  <th className="p-3.5">Paid Amount</th>
                  <th className="p-3.5">Balance Due</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => {
                  const res = (inv as any).reservation;
                  const guestName = res?.booker
                    ? `${res.booker.firstName} ${res.booker.lastName}`
                    : "Guest Folio";
                  const balance = Number(inv.balanceDue ?? inv.total - (inv.totalPaid ?? 0));

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">
                          {guestName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Code: {res?.reservationCode || inv.reservationId}
                        </div>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        {formatCurrency(Number(inv.total))}
                      </td>
                      <td className="p-3.5 font-semibold text-emerald-700">
                        {formatCurrency(Number(inv.totalPaid ?? 0))}
                      </td>
                      <td className="p-3.5 font-extrabold text-amber-900">
                        {formatCurrency(balance)}
                      </td>
                      <td className="p-3.5">
                        <Badge
                          variant={
                            inv.status === "PAID"
                              ? "clean"
                              : inv.status === "PARTIALLY_PAID"
                              ? "dirty"
                              : "reserved"
                          }
                        >
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInvoice(inv)}
                          className="h-7 text-xs font-semibold gap-1"
                        >
                          <span>Inspect Folio</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {filteredInvoices.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No invoices found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* Folio Detail Inspector Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={Boolean(selectedInvoice)}
          onClose={() => {
            setSelectedInvoice(null);
            setIsRecordingPayment(false);
          }}
          title={`Folio ${selectedInvoice.invoiceNumber}`}
          description={`Reservation: ${(selectedInvoice as any).reservation?.reservationCode || selectedInvoice.reservationId}`}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            {/* Balance Overview */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Total Charges
                </span>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  {formatCurrency(Number(selectedInvoice.total))}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700">
                  Payments
                </span>
                <div className="text-base font-extrabold text-emerald-800 mt-0.5">
                  {formatCurrency(Number(selectedInvoice.totalPaid ?? 0))}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800">
                  Balance Remaining
                </span>
                <div className="text-base font-extrabold text-amber-900 mt-0.5">
                  {formatCurrency(Number(selectedInvoice.balanceDue ?? 0))}
                </div>
              </div>
            </div>

            {/* Line Items Breakdown */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                Itemized Charges & Services
              </span>
              <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 text-xs">
                {selectedInvoice.items?.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{item.description}</div>
                      <div className="text-[10px] text-slate-400">
                        Qty: {item.quantity} × {formatCurrency(Number(item.unitPrice))}
                      </div>
                    </div>
                    <div className="font-bold text-slate-900">
                      {formatCurrency(Number(item.total))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payments History */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                Recorded Payments
              </span>
              <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 text-xs">
                {selectedInvoice.payments?.map((pmt) => (
                  <div key={pmt.id} className="p-3 flex items-center justify-between bg-emerald-50/30">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <div>
                        <div className="font-semibold text-slate-900">
                          {pmt.method} Payment
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Ref: {pmt.transactionReference || "Direct"} • {formatDate(pmt.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="font-bold text-emerald-800">
                      {formatCurrency(Number(pmt.amount))}
                    </div>
                  </div>
                ))}

                {(!selectedInvoice.payments || selectedInvoice.payments.length === 0) && (
                  <div className="p-3 text-center text-slate-400 text-xs">
                    No payments posted yet.
                  </div>
                )}
              </div>
            </div>

            {/* Record Payment Section */}
            {Number(selectedInvoice.balanceDue ?? 0) > 0 && !isRecordingPayment && (
              <Button
                variant="gold"
                onClick={() => {
                  setPaymentAmount(String(selectedInvoice.balanceDue));
                  setIsRecordingPayment(true);
                }}
                className="w-full font-semibold gap-1.5"
              >
                <CreditCard className="h-4 w-4" />
                <span>Post Payment to Folio</span>
              </Button>
            )}

            {isRecordingPayment && (
              <form onSubmit={handleRecordPayment} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">Record Guest Payment</span>
                  <button
                    type="button"
                    onClick={() => setIsRecordingPayment(false)}
                    className="text-[11px] text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Amount ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                    >
                      <option value="CARD">Credit / Debit Card</option>
                      <option value="CASH">Cash Deposit</option>
                      <option value="BANK_TRANSFER">Bank Wire</option>
                    </select>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="emerald"
                  disabled={submittingPayment}
                  className="w-full font-semibold gap-1.5 text-xs"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{submittingPayment ? "Posting..." : "Confirm & Post Payment"}</span>
                </Button>
              </form>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
