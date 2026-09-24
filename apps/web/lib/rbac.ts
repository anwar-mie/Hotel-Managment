import type { UserRole } from "shared-types";

export const ROLE_PERMISSIONS = {
  // Navigation Page Permissions
  tapeChart: ["ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPER", "ACCOUNTANT"],
  frontDesk: ["ADMIN", "MANAGER", "RECEPTIONIST"],
  rooms: ["ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPER", "ACCOUNTANT"],
  operations: ["ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPER"],
  billing: ["ADMIN", "MANAGER", "ACCOUNTANT", "RECEPTIONIST"],
  guests: ["ADMIN", "MANAGER", "RECEPTIONIST"],

  // Feature & Action Permissions
  createReservation: ["ADMIN", "MANAGER", "RECEPTIONIST"],
  checkInCheckOut: ["ADMIN", "MANAGER", "RECEPTIONIST"],
  manageRoomStatus: ["ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPER"],
  manageHousekeepingTasks: ["ADMIN", "MANAGER", "HOUSEKEEPER"],
  manageMaintenance: ["ADMIN", "MANAGER", "HOUSEKEEPER", "RECEPTIONIST"],
  viewFinancialSummary: ["ADMIN", "MANAGER", "ACCOUNTANT"],
  recordPayments: ["ADMIN", "MANAGER", "ACCOUNTANT", "RECEPTIONIST"],
  manageGuests: ["ADMIN", "MANAGER", "RECEPTIONIST"],
} as const;

export type PermissionKey = keyof typeof ROLE_PERMISSIONS;

export function hasPermission(
  role: UserRole | undefined | null,
  permission: PermissionKey
): boolean {
  if (!role) return false;
  const allowedRoles = ROLE_PERMISSIONS[permission] as readonly string[];
  return allowedRoles.includes(role);
}

export function canCreateReservation(role: UserRole | undefined | null): boolean {
  return hasPermission(role, "createReservation");
}

export function canCheckInCheckOut(role: UserRole | undefined | null): boolean {
  return hasPermission(role, "checkInCheckOut");
}

export function canViewBillingSummary(role: UserRole | undefined | null): boolean {
  return hasPermission(role, "viewFinancialSummary");
}

export function getRoleBadgeInfo(role: UserRole | undefined | null): {
  label: string;
  color: string;
} {
  switch (role) {
    case "ADMIN":
      return { label: "System Administrator", color: "bg-slate-900 text-amber-400" };
    case "MANAGER":
      return { label: "General Manager", color: "bg-amber-100 text-amber-900" };
    case "RECEPTIONIST":
      return { label: "Front Desk Receptionist", color: "bg-emerald-100 text-emerald-900" };
    case "HOUSEKEEPER":
      return { label: "Housekeeping Staff", color: "bg-sky-100 text-sky-900" };
    case "ACCOUNTANT":
      return { label: "Finance & Accounting", color: "bg-indigo-100 text-indigo-900" };
    default:
      return { label: "Staff Member", color: "bg-slate-100 text-slate-800" };
  }
}
