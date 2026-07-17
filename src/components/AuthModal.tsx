import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, cloudEnabled, sendMagicLink } from "../lib/supabase";
import { usePlayer } from "../store/player";
import { Close } from "./Icons";

type Mode = "signin" | "signup" | "magic";

export function AuthModal({ onClose }: { onClose: () => void }) {
  const setToast = usePlayer((s) => s.setToast);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!cloudEnabled) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    try {
      if (mode === "magic") {
        await sendMagicLink(email);
        setToast("Check your email for the login link.");
        onClose();
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setToast("Account created! Check email to confirm, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setToast("Signed in!");
        onClose();
      }
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto px-4 pt-[max(env(safe-area-inset-top),_10vh)] pb-[env(safe-area-inset-bottom)] sm:items-center sm:pt-0" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="glass-strong relative w-full max-w-sm shrink-0 rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-white/40 hover:text-white"
        >
          <Close width={20} height={20} />
        </button>

        <h2 className="mb-1 text-xl font-bold tracking-tight">
          {mode === "signup" ? "Create Account" : mode === "magic" ? "Magic Link" : "Sign In"}
        </h2>
        <p className="mb-5 text-sm text-white/45">
          Sync your listening stats and Replay across devices
        </p>

        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-xl bg-white/8 p-1">
          {(["signin", "signup", "magic"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                mode === m ? "bg-white/15 text-white" : "text-white/45 hover:text-white/70"
              }`}
            >
              {m === "signin" ? "Sign In" : m === "signup" ? "Sign Up" : "Magic Link"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl bg-white/8 px-4 py-3 text-sm outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-[color:var(--accent)]"
          />
          {mode !== "magic" && (
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 chars)"
              className="w-full rounded-xl bg-white/8 px-4 py-3 text-sm outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-[color:var(--accent)]"
            />
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn-accent mt-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
          >
            {loading
              ? "…"
              : mode === "signup"
              ? "Create Account"
              : mode === "magic"
              ? "Send Link"
              : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

/** Small button for TopBar — shows user avatar/icon, opens AuthModal or shows signed-in state. */
export function AccountButton() {
  const [user, setUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const setToast = usePlayer((s) => s.setToast);
  const openAuthModal = usePlayer((s) => s.openAuthModal);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    return supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null)
    ).data.subscription.unsubscribe;
  }, []);

  if (!cloudEnabled) return null;

  if (user) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--accent)] text-xs font-bold text-white"
          title={user.email}
        >
          {(user.email?.[0] ?? "U").toUpperCase()}
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setShowMenu(false)} />
            <div className="glass-strong absolute right-0 top-12 z-50 w-56 rounded-xl p-3 shadow-2xl origin-top-right">
              <p className="truncate text-xs font-medium text-white/70">{user.email}</p>
              <button
                onClick={() => {
                  void supabase!.auth.signOut().then(() => {
                    setToast("Signed out.");
                    setShowMenu(false);
                  });
                }}
                className="mt-2 w-full rounded-lg bg-white/8 py-2 text-xs font-semibold text-white/60 hover:bg-white/12 hover:text-white"
              >
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => openAuthModal(true)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/15 hover:text-white"
        title="Sign in"
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>
    </>
  );
}
