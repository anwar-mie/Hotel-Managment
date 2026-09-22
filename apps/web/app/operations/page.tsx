"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Plus,
  ShieldAlert,
  Clock,
  User,
  BedDouble,
} from "lucide-react";
import { PmsSidebar } from "@/components/layout/pms-sidebar";
import { PmsHeader } from "@/components/layout/pms-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Modal } from "@/components/ui/modal";
import { api, getErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type {
  IRoom,
  IHousekeepingTask,
  IMaintenanceRequest,
  IHousekeepingDashboard,
} from "shared-types";

export default function OperationsPage() {
  const [activeTab, setActiveTab] = useState("TURNOVER");
  const [rooms, setRooms] = useState<IRoom[]>([]);
  const [hkDashboard, setHkDashboard] = useState<IHousekeepingDashboard | null>(null);
  const [tasks, setTasks] = useState<IHousekeepingTask[]>([]);
  const [maintenanceTickets, setMaintenanceTickets] = useState<IMaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Maintenance Ticket modal
  const [isNewMaintOpen, setIsNewMaintOpen] = useState(false);
  const [maintRoomId, setMaintRoomId] = useState("");
  const [maintTitle, setMaintTitle] = useState("");
  const [maintDescription, setMaintDescription] = useState("");
  const [submittingMaint, setSubmittingMaint] = useState(false);

  const fetchOperationsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [roomsRes, dashRes, tasksRes, maintRes] = await Promise.all([
        api.get<IRoom[]>("/rooms"),
        api.get<IHousekeepingDashboard>("/operations/housekeeping/dashboard"),
        api.get<IHousekeepingTask[]>("/operations/housekeeping/tasks"),
        api.get<IMaintenanceRequest[]>("/operations/maintenance/requests"),
      ]);

      setRooms(roomsRes.data);
      setHkDashboard(dashRes.data);
      setTasks(tasksRes.data);
      setMaintenanceTickets(maintRes.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperationsData();
  }, []);

  const handleUpdateRoomHousekeeping = async (
    roomId: string,
    housekeepingStatus: "CLEAN" | "INSPECTED" | "DIRTY"
  ) => {
    try {
      await api.patch(`/rooms/${roomId}/status`, {
        housekeepingStatus,
        notes: `Turnover updated to ${housekeepingStatus} via Operations Board`,
      });
      fetchOperationsData();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleUpdateTaskStatus = async (
    taskId: string,
    status: "IN_PROGRESS" | "COMPLETED"
  ) => {
    try {
      await api.patch(`/operations/housekeeping/tasks/${taskId}`, { status });
      fetchOperationsData();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleResolveMaintenance = async (ticketId: string) => {
    try {
      await api.patch(`/operations/maintenance/requests/${ticketId}`, {
        status: "RESOLVED",
        resolutionNotes: "Repaired and returned to turnover turnover queue.",
      });
      fetchOperationsData();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintRoomId || !maintTitle) return;

    try {
      setSubmittingMaint(true);
      await api.post("/operations/maintenance/requests", {
        roomId: maintRoomId,
        title: maintTitle,
        description: maintDescription || undefined,
      });
      setIsNewMaintOpen(false);
      setMaintRoomId("");
      setMaintTitle("");
      setMaintDescription("");
      fetchOperationsData();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSubmittingMaint(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PmsSidebar />

      <div className="ml-64 flex-1 flex flex-col min-w-0">
        <PmsHeader onRefresh={fetchOperationsData} />

        <main className="flex-1 p-6 space-y-5">
          {/* Header & Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-600" />
                <span>Housekeeping & Maintenance Operations</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Room sanitation oversight, inspection workflows, turnover task queue & defect tickets
              </p>
            </div>

            <Button
              onClick={() => setIsNewMaintOpen(true)}
              variant="outline"
              size="sm"
              className="font-semibold gap-1.5 shadow-xs border-rose-200 text-rose-700 hover:bg-rose-50"
            >
              <Wrench className="h-4 w-4" />
              <span>Report Defect / Ticket</span>
            </Button>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Dirty Turnover
                </span>
                <div className="text-lg font-extrabold text-slate-900">
                  {hkDashboard?.dirtyRoomsCount ?? "--"} Rooms
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Sanitized Clean
                </span>
                <div className="text-lg font-extrabold text-slate-900">
                  {hkDashboard?.cleanRoomsCount ?? "--"} Rooms
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Inspected & Ready
                </span>
                <div className="text-lg font-extrabold text-slate-900">
                  {hkDashboard?.inspectedRoomsCount ?? "--"} Rooms
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Out of Service
                </span>
                <div className="text-lg font-extrabold text-slate-900">
                  {hkDashboard?.outOfServiceRoomsCount ?? "--"} Rooms
                </div>
              </div>
            </div>
          </div>

          {/* Operations Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="TURNOVER">
                Room Turnover Grid ({rooms.length})
              </TabsTrigger>
              <TabsTrigger value="TASKS">
                Turnover Task Queue ({tasks.length})
              </TabsTrigger>
              <TabsTrigger value="MAINTENANCE">
                Defect Tickets & Repairs ({maintenanceTickets.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Room Turnover Grid */}
            <TabsContent value="TURNOVER" className="pt-2">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {rooms.map((room) => {
                  const isDirty = room.housekeepingStatus === "DIRTY";
                  const isClean = room.housekeepingStatus === "CLEAN";
                  const isInspected = room.housekeepingStatus === "INSPECTED";
                  const isBlocked = room.frontDeskStatus === "OUT_OF_ORDER";

                  return (
                    <Card
                      key={room.id}
                      className="border-slate-200/80 p-3.5 flex flex-col justify-between hover:shadow-md transition-all"
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
                                : isDirty
                                ? "dirty"
                                : isInspected
                                ? "inspected"
                                : "clean"
                            }
                          >
                            {room.housekeepingStatus}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 font-medium truncate">
                          {room.roomType?.name} • Floor {room.floor}
                        </div>
                      </div>

                      {/* 1-Click Status Advance */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-1">
                        {isDirty && !isBlocked && (
                          <Button
                            variant="emerald"
                            size="sm"
                            onClick={() =>
                              handleUpdateRoomHousekeeping(room.id, "CLEAN")
                            }
                            className="w-full text-xs font-semibold h-7"
                          >
                            Mark Clean
                          </Button>
                        )}
                        {isClean && !isBlocked && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() =>
                              handleUpdateRoomHousekeeping(room.id, "INSPECTED")
                            }
                            className="w-full text-xs font-semibold h-7"
                          >
                            Mark Inspected
                          </Button>
                        )}
                        {isInspected && !isBlocked && (
                          <button
                            onClick={() =>
                              handleUpdateRoomHousekeeping(room.id, "DIRTY")
                            }
                            className="w-full text-[10px] text-slate-400 hover:text-amber-700 py-1"
                          >
                            Reset to Dirty
                          </button>
                        )}
                        {isBlocked && (
                          <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            <span>Maint. Locked</span>
                          </span>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* TAB 2: Tasks Queue */}
            <TabsContent value="TASKS" className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tasks.map((task) => (
                  <Card key={task.id} className="border-slate-200/80 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                          <BedDouble className="h-4 w-4 text-slate-500" />
                          <span>Room #{task.room?.number}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          {task.notes || "Priority turnover cleaning requested"}
                        </p>
                      </div>
                      <Badge
                        variant={
                          task.status === "COMPLETED"
                            ? "clean"
                            : task.status === "IN_PROGRESS"
                            ? "occupied"
                            : "dirty"
                        }
                      >
                        {task.status}
                      </Badge>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>{task.assignedTo?.name || "Unassigned"}</span>
                      </div>

                      {task.status === "PENDING" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateTaskStatus(task.id, "IN_PROGRESS")}
                          className="h-7 text-xs font-semibold gap-1 text-sky-700 border-sky-200 hover:bg-sky-50"
                        >
                          <Play className="h-3 w-3" />
                          <span>Start Cleaning</span>
                        </Button>
                      )}

                      {task.status === "IN_PROGRESS" && (
                        <Button
                          variant="emerald"
                          size="sm"
                          onClick={() => handleUpdateTaskStatus(task.id, "COMPLETED")}
                          className="h-7 text-xs font-semibold gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Mark Done</span>
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}

                {tasks.length === 0 && (
                  <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                    <h4 className="mt-2 text-sm font-semibold text-slate-800">
                      All turnover tasks are cleared!
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      New tasks are generated automatically upon guest check-out
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 3: Maintenance Tickets */}
            <TabsContent value="MAINTENANCE" className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {maintenanceTickets.map((ticket) => (
                  <Card key={ticket.id} className="border-slate-200/80 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold text-rose-700 uppercase tracking-wide flex items-center gap-1">
                          <Wrench className="h-3.5 w-3.5" />
                          <span>Room #{ticket.room?.number}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">
                          {ticket.title}
                        </h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {ticket.description || "Defect reported requiring technician inspection."}
                        </p>
                      </div>
                      <Badge variant={ticket.status === "RESOLVED" ? "clean" : "outOfOrder"}>
                        {ticket.status}
                      </Badge>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>Reported: {formatDate(ticket.createdAt)}</span>
                      {ticket.status !== "RESOLVED" ? (
                        <Button
                          variant="emerald"
                          size="sm"
                          onClick={() => handleResolveMaintenance(ticket.id)}
                          className="h-7 text-xs font-semibold gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Resolve Defect</span>
                        </Button>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-[11px]">
                          ✓ Resolved & Inspected
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* New Maintenance Defect Modal */}
      <Modal
        isOpen={isNewMaintOpen}
        onClose={() => setIsNewMaintOpen(false)}
        title="Report Maintenance Defect"
        description="Blocks physical room as Out of Order until repaired"
      >
        <form onSubmit={handleCreateMaintenance} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800">
              Affected Physical Room
            </label>
            <select
              value={maintRoomId}
              onChange={(e) => setMaintRoomId(e.target.value)}
              required
              className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <option value="">-- Choose Room --</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room #{r.number} (Floor {r.floor} • {r.roomType?.name})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800">
              Defect Title / Issue
            </label>
            <Input
              placeholder="e.g. Broken bathroom fixture, electrical short, AC leak"
              value={maintTitle}
              onChange={(e) => setMaintTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800">
              Detailed Description / Notes
            </label>
            <Input
              placeholder="Describe defect location and required parts"
              value={maintDescription}
              onChange={(e) => setMaintDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewMaintOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={submittingMaint || !maintRoomId || !maintTitle}
              className="gap-1.5 font-semibold text-xs"
            >
              <Wrench className="h-4 w-4" />
              <span>{submittingMaint ? "Submitting..." : "Submit & Block Room"}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
