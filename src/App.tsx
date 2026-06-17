import React, { useState } from "react";
import { Link, Routes, Route, useNavigate } from "react-router-dom";
import { Moon, Sun, BookOpen, Crown, LogOut, MessageCircle } from "lucide-react";
import { useTheme, ThemeProvider } from "./components/ThemeProvider";
import { store } from "./lib/store";
import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudyRoom from "./pages/StudyRoom";
import Agent3Widget from "./components/Agent3Widget";

function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const user = store.getCurrentUser();

  const handleLogout = () => {
    store.logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300">
      <header className="bg-black/[0.02] dark:bg-white/[0.03] border-b border-black/[0.05] dark:border-white/[0.08] dark:border-amber-500/30 border-amber-600/20 backdrop-blur-md shadow-[0_8px_32px_0_rgba(215,180,120,0.15)] dark:shadow-[inset_0_1px_1px_rgba(245,158,11,0.1),0_8px_32px_0_rgba(0,0,0,0.7)] text-stone-800 dark:text-stone-200 transition-all duration-500 ease-out fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-6 h-6 text-yellow-500" />
          <span className="font-display font-bold text-xl tracking-wider uppercase">Henosis</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition">
            {theme === "dark" ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
          </button>
          
          {user && (
            <div className="flex items-center gap-4">
              <span className="font-medium">{user.name}</span>
              <button onClick={handleLogout} className="p-2 rounded-full hover:bg-red-500/10 text-red-500 transition">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 mt-24 mb-10 px-4 md:px-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {user && user.role === "student" && <Agent3Widget />}
      
      {user && (
         <a href="https://t.me/+O50q6ltXTzwxMzk1" target="_blank" rel="noopener noreferrer" 
            className="fixed bottom-6 left-6 glass px-4 py-2 rounded-full flex items-center gap-2 hover:bg-yellow-500 hover:text-black transition cursor-pointer z-50">
           <MessageCircle className="w-4 h-4" />
           <span className="font-medium text-sm">Hỗ trợ (Telegram)</span>
         </a>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/study/:deckId" element={<StudyRoom />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  );
}
