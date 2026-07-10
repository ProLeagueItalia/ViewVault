"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "../lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function LoginButton() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
    }

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function login(provider: "google" | "github") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  const modal =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-[#121212] p-8 shadow-[0_0_60px_rgba(124,58,237,0.45)]">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  Accedi a <span className="text-[#7C3AED]">ViewVault</span>
                </h2>

                <button
                  onClick={() => setOpen(false)}
                  className="text-2xl text-zinc-400 hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => login("google")}
                  className="w-full rounded-full bg-white px-5 py-3 font-bold text-zinc-900 transition hover:bg-zinc-200"
                >
                  Continua con Google
                </button>

                <button
                  onClick={() => login("github")}
                  className="w-full rounded-full bg-zinc-900 px-5 py-3 font-bold text-white transition hover:bg-zinc-800"
                >
                  Continua con GitHub
                </button>
              </div>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-zinc-800" />
                <span className="text-sm text-zinc-500">oppure</span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-[#7C3AED]"
                />

                <input
                  type="password"
                  placeholder="Password"
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-[#7C3AED]"
                />

                <button className="w-full rounded-full bg-[#7C3AED] px-5 py-3 font-bold text-white transition hover:bg-[#2563EB]">
                  Accedi con email
                </button>

                <button className="w-full text-sm font-semibold text-zinc-400 hover:text-white">
                  Crea un nuovo account
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden text-sm font-semibold text-zinc-200 md:block">
          {user.user_metadata?.name ||
            user.user_metadata?.user_name ||
            user.email ||
            "Utente"}
        </span>

        <button
          onClick={logout}
          className="rounded-full border border-zinc-700 px-5 py-2 font-semibold text-zinc-200 transition hover:border-[#7C3AED] hover:text-white"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-[#7C3AED] px-7 py-3 font-semibold text-white transition hover:bg-[#2563EB]"
      >
        Login
      </button>

      {modal}
    </>
  );
}