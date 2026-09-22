"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Hotel, KeyRound, Mail, ArrowRight, ShieldCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAuth, DEMO_PERSONAS, DemoPersona } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, switchPersona } = useAuth();

  const [email, setEmail] = useState("receptionist@hotel.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (persona: DemoPersona) => {
    setError(null);
    setLoading(true);
    try {
      await switchPersona(persona);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to sign in with demo account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-stone-50 to-amber-50/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-amber-400 shadow-xl ring-4 ring-amber-400/20">
            <Hotel className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Aura Grand Hotel
          </h1>
          <p className="text-xs font-medium text-slate-500">
            Property Management System • Staff Portal
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-200/90 shadow-xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Staff Authentication</CardTitle>
            <CardDescription>
              Sign in to manage rooms, bookings, folios and turnover
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Staff Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    placeholder="staff@hotel.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <span className="text-[11px] text-slate-400">Default: password123</span>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full font-semibold shadow-md gap-2"
                size="lg"
              >
                <span>{loading ? "Authenticating..." : "Sign In to PMS"}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            {/* Quick Demo Personas */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  1-Click Demo Login
                </span>
                <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Pre-Seeded Roles
                </span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {DEMO_PERSONAS.map((persona) => (
                  <button
                    key={persona.email}
                    type="button"
                    onClick={() => handleQuickLogin(persona)}
                    disabled={loading}
                    className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-left hover:border-slate-300 hover:bg-slate-100 transition-all text-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 text-[10px] font-bold text-slate-700 group-hover:bg-slate-900 group-hover:text-amber-400 transition-colors">
                        {persona.role.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">
                          {persona.label}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {persona.email}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 flex items-center gap-1">
                      <span>Log in</span>
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security badge footer */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Role-Based Access Control • NestJS API Guarded</span>
        </div>
      </div>
    </div>
  );
}
