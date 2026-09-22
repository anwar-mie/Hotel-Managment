"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api, getErrorMessage } from "./api";
import type { IAuthUser, IAuthTokens, IAuthResponse, UserRole } from "shared-types";

export interface DemoPersona {
  role: UserRole;
  label: string;
  email: string;
  description: string;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    role: "RECEPTIONIST",
    label: "Front Desk Lead",
    email: "receptionist@hotel.com",
    description: "Check-in/out, room assignments, bookings",
  },
  {
    role: "ADMIN",
    label: "System Admin",
    email: "admin@hotel.com",
    description: "Full system control & configuration",
  },
  {
    role: "MANAGER",
    label: "General Manager",
    email: "manager@hotel.com",
    description: "Property oversight & analytics",
  },
  {
    role: "HOUSEKEEPER",
    label: "Housekeeper Supervisor",
    email: "housekeeper@hotel.com",
    description: "Room turnover & inspection tasks",
  },
  {
    role: "ACCOUNTANT",
    label: "Chief Accountant",
    email: "accountant@hotel.com",
    description: "Billing, folios, and financial reports",
  },
];

interface AuthContextType {
  user: IAuthUser | null;
  tokens: IAuthTokens | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  switchPersona: (persona: DemoPersona) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<IAuthUser | null>(null);
  const [tokens, setTokens] = useState<IAuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load persisted session on client mount
    try {
      const storedTokens = localStorage.getItem("aura_tokens");
      const storedUser = localStorage.getItem("aura_user");
      if (storedTokens && storedUser) {
        setTokens(JSON.parse(storedTokens));
        setUser(JSON.parse(storedUser));
      }
    } catch {
      localStorage.removeItem("aura_tokens");
      localStorage.removeItem("aura_user");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string = "password123") => {
    try {
      const response = await api.post<IAuthResponse>("/auth/login", {
        email,
        password,
      });

      const { user: authedUser, tokens: authTokens } = response.data;
      setUser(authedUser);
      setTokens(authTokens);

      localStorage.setItem("aura_user", JSON.stringify(authedUser));
      localStorage.setItem("aura_tokens", JSON.stringify(authTokens));
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem("aura_user");
    localStorage.removeItem("aura_tokens");
  };

  const switchPersona = async (persona: DemoPersona) => {
    await login(persona.email, "password123");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        isLoading,
        login,
        logout,
        switchPersona,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
