import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { store } from "../lib/store";
import { KeyRound, User as UserIcon, Lock, Eye } from "lucide-react";
import { cn } from "../lib/utils";

type AuthMode = "signin" | "signup" | "preview";

export default function Login() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "preview") {
      const guestName = name.trim() || `Guest_${Math.floor(Math.random() * 1000)}`;
      const u = store.login(guestName, undefined, adminKey);
      if (u) {
        navigate(u.role === "teacher" ? "/teacher" : "/dashboard");
      }
      return;
    }

    if (!name.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }

    if (mode === "signup") {
      const u = store.signup(name, password, adminKey);
      if (!u) {
        setError("Username already exists.");
        return;
      }
      navigate(u.role === "teacher" ? "/teacher" : "/dashboard");
    } else if (mode === "signin") {
      const u = store.login(name, password, adminKey);
      if (!u) {
        setError("Invalid username or password.");
        return;
      }
      navigate(u.role === "teacher" ? "/teacher" : "/dashboard");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="glass p-8 rounded-2xl w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 text-center mb-2">Welcome to Henosis</h1>
        <p className="text-center text-sm opacity-70 mb-6 font-roman italic">
          "If one does not know to which port one is sailing, no wind is favorable." - Seneca
        </p>

        <div className="flex bg-stone-200/60 dark:bg-zinc-800/50 rounded-xl mb-6 p-1">
           <button 
             onClick={() => { setMode("signin"); setError(""); }}
             className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition", mode === "signin" ? "bg-white dark:bg-white/10 text-black dark:text-white shadow-sm" : "text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white")}
           >
             Sign In
           </button>
           <button 
             onClick={() => { setMode("signup"); setError(""); }}
             className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition", mode === "signup" ? "bg-white dark:bg-white/10 text-black dark:text-white shadow-sm" : "text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white")}
           >
             Sign Up
           </button>
           <button 
             onClick={() => { setMode("preview"); setError(""); }}
             className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition", mode === "preview" ? "bg-white dark:bg-white/10 text-black dark:text-white shadow-sm" : "text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white")}
           >
             Preview
           </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg mb-4 text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium ml-1">Username</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" />
              <input 
                type="text" 
                required={mode !== "preview"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-stone-200/60 dark:bg-zinc-800/50 border border-amber-600/20 dark:border-amber-500/30 rounded-xl px-10 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
                placeholder={mode === "preview" ? "Guest Name (Optional)" : "Marcus Aurelius"}
              />
            </div>
          </div>

          {mode !== "preview" && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <label className="text-sm font-medium ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-stone-200/60 dark:bg-zinc-800/50 border border-amber-600/20 dark:border-amber-500/30 rounded-xl px-10 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
                  placeholder="Enter your password..."
                />
              </div>
            </div>
          )}

          <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
            <label className="text-sm font-medium ml-1 flex items-center gap-2">
              Admin Key <span className="text-xs opacity-50 font-normal">(Optional, for Teachers)</span>
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" />
              <input 
                type="password" 
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="w-full bg-stone-200/60 dark:bg-zinc-800/50 border border-amber-600/20 dark:border-amber-500/30 rounded-xl px-10 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
                placeholder="Enter secret key..."
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-4 rounded-xl transition duration-300 transform active:scale-95 mt-4"
          >
            {mode === "signin" ? "Enter the Academy" : mode === "signup" ? "Join the Academy" : "Explore as Guest"}
          </button>
        </form>
      </div>
    </div>
  );
}
