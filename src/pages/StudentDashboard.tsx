import React, { useState, useEffect } from "react";
import { store } from "../lib/store";
import { Link, Navigate } from "react-router-dom";
import { Play, TrendingUp, Users, Target, BookOpen, Crown, BrainCircuit, Activity, Flame, ArrowLeft, CheckCircle2, XCircle, ArrowRight, Loader2, Trophy, Sparkles, Maximize2, Minimize2, Bell, BellOff, BellRing, Settings, AlertTriangle, Trash2, Snowflake } from "lucide-react";
import { cn } from "../lib/utils";
import { createLearningGroup } from "../lib/firebase";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "motion/react";

function AnimatedCounter({ value }: { value: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const animation = animate(count, value, { duration: 1, ease: "easeOut" });
    return animation.stop;
  }, [value]);

  return <motion.span>{rounded}</motion.span>;
}

const Confetti = () => {
  const colors = ['#fde047', '#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#fb923c'];
  const pieces = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 8 + 6,
    duration: 2.0 + Math.random() * 2,
    delay: Math.random() * 0.5,
    rotation: Math.random() * 720
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      {pieces.map(p => (
        <motion.div
            key={p.id}
            initial={{ y: -20, x: p.x, opacity: 1, rotate: 0 }}
            animate={{ 
              y: typeof window !== 'undefined' ? window.innerHeight + 100 : 1000, 
              x: p.x + (Math.random() - 0.5) * 300, 
              rotate: p.rotation,
              opacity: [1, 1, 0]
            }}
            transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
            style={{
              position: 'absolute',
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: Math.random() > 0.5 ? '50%' : 0,
            }}
          />
      ))}
    </div>
  );
};

type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex?: number;
  correctAnswer?: string;
  explanation?: string;
};

const MOTIVATION_QUOTES = [
  "Virtue is nothing else than right reason. - Seneca",
  "We suffer more often in imagination than in reality. - Seneca",
  "Waste no more time arguing what a good man should be. Be one. - Marcus Aurelius",
  "He who fears death will never do anything worth of a man who is alive. - Seneca"
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl border border-neutral-200/50 dark:border-neutral-800/50 p-4 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <p className="font-medium text-xs tracking-widest uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <p className="font-display font-bold text-2xl text-yellow-600 dark:text-yellow-500 leading-none">
            {payload[0].value}
          </p>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">pts</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function StudentDashboard() {
  const user = store.getCurrentUser();
  if (user?.role === "teacher") return <Navigate to="/teacher" />;
  if (!user) return <Navigate to="/" />;

  const decks = store.getDecks();
  const sortedUsers = [...store.getUsers()].filter(u => u.role === "student").sort((a, b) => b.points - a.points);
  
  const [groupId, setGroupId] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"study" | "ranking" | "quiz" | "groups" | "settings" | "history">("study");
  const [joinStatus, setJoinStatus] = useState<string | null>(null);
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<"7_days" | "30_days" | "all_time">("7_days");
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem("henosis_notifications");
    return saved === "true";
  });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showStreakConfetti, setShowStreakConfetti] = useState(false);
  
  useEffect(() => {
    if (user?.id) {
       const key = `last_streak_${user.id}`;
       const oldStreak = parseInt(sessionStorage.getItem(key) || "0", 10);
       if (user.streak && user.streak > oldStreak) {
          setShowStreakConfetti(true);
          setTimeout(() => setShowStreakConfetti(false), 5000);
       }
       sessionStorage.setItem(key, (user.streak || 0).toString());
    }
  }, [user?.streak, user?.id]);
  
  const todayString = new Date().toISOString().split('T')[0];
  const [dailyGoal, setDailyGoal] = useState(() => {
    const saved = localStorage.getItem(`daily_goal_${user?.id}`);
    return saved ? parseInt(saved, 10) : 20;
  });
  
  const [, setForceRender] = useState(0);

  const handleBuyFreeze = () => {
    if (store.buyStreakFreeze()) {
       setForceRender(prev => prev + 1);
    }
  };

  // Note: we fetch this statically on dashboard load/render since we don't dispatch events on localstorage
  const dailyReviewed = parseInt(localStorage.getItem(`daily_reviewed_${user?.id}_${todayString}`) || "0", 10);
  
  const handleDailyGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10) || 0;
    setDailyGoal(val);
    if (user?.id) localStorage.setItem(`daily_goal_${user.id}`, val.toString());
  };

  const pendingCardsCount = decks.reduce((acc, deck) => {
    return acc + deck.cards.filter(c => c.nextReview && c.nextReview <= Date.now()).length;
  }, 0);

  const toggleNotifications = () => {
    const newVal = !notificationsEnabled;
    setNotificationsEnabled(newVal);
    localStorage.setItem("henosis_notifications", newVal.toString());
  };

  const handleClearOldData = () => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('weak_cards_') || key.includes('draft') || key.includes('agent'))) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    setShowClearConfirm(false);
    // Optionally trigger a page reload or force an update here if needed.
    window.location.reload();
  };

  type ActiveGroupType = {
    id: string;
    name: string;
    members: { id: string, name: string, points: number, isCurrent: boolean }[];
  };
  const [activeGroup, setActiveGroup] = useState<ActiveGroupType | null>(null);

  const handleJoinGroup = () => {
    if (!groupId.trim()) {
        setJoinStatus("Vui lòng nhập ID nhóm hợp lệ.");
        setTimeout(() => setJoinStatus(null), 3000);
        return;
    }
    // Lập tức giả lập tham gia và thông báo thành công
    store.joinGroup(groupId);
    setJoinStatus(`Bạn đã tham gia nhóm ${groupId} thành công!`);
    
    // Giả lập danh sách thành viên nhóm để có leaderboard nhóm riêng biệt
    setActiveGroup({
        id: groupId,
        name: `Nhóm ${groupId}`,
        members: [
            { id: user?.id || "u0", name: user?.name || "Bạn", points: user?.points || 0, isCurrent: true },
            { id: "m1", name: "Marcus", points: Math.floor(Math.random() * 500) + 100, isCurrent: false },
            { id: "m2", name: "Seneca", points: Math.floor(Math.random() * 500) + 100, isCurrent: false },
            { id: "m3", name: "Epictetus", points: Math.floor(Math.random() * 500) + 100, isCurrent: false }
        ].sort((a, b) => b.points - a.points)
    });
    setGroupId("");
    setTimeout(() => setJoinStatus(null), 3000);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !user) {
        setJoinStatus("Vui lòng nhập tên nhóm hợp lệ.");
        setTimeout(() => setJoinStatus(null), 3000);
        return;
    }
    setIsCreating(true);
    setCreatedGroupId(null);
    let finalId = "";
    try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout Firebase")), 2000));
        const id: any = await Promise.race([createLearningGroup(newGroupName, user.id), timeoutPromise]);
        
        if (id) {
          finalId = id;
          setCreatedGroupId(id);
        } else {
           throw new Error("Không lấy được ID nhóm");
        }
    } catch (e) {
        // Fallback: Sinh ID ngẫu nhiên bằng JS thuần
        finalId = Math.random().toString(36).substring(2, 9).toUpperCase();
        setCreatedGroupId(finalId);
    } finally {
        setActiveGroup({
            id: finalId,
            name: newGroupName,
            members: [
                { id: user?.id || "u0", name: user?.name || "Bạn", points: user?.points || 0, isCurrent: true }
            ]
        });
        setNewGroupName("");
        setIsCreating(false);
    }
  };
  
  // Quiz states
  const [cooldown, setCooldown] = useState(0);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizCurrentIndex, setQuizCurrentIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizQuote] = useState(MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)]);

  useEffect(() => {
    let t: any;
    if (cooldown > 0) t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const triggerQuiz = async () => {
      if (cooldown > 0) return;
      
      const allDecks = store.getDecks();
      let weakCards: any[] = [];
      for (const deck of allDecks) {
        const storageKey = `weak_cards_${deck.id}`;
        const weakIds = JSON.parse(localStorage.getItem(storageKey) || "[]");
        let cards = deck.cards.filter(c => weakIds.includes(c.id) || c.mastery < 50);
        weakCards.push(...cards.map(c => ({ front: c.front, back: c.back, subject: c.subject })));
      }
      
      weakCards = weakCards.sort(() => 0.5 - Math.random()).slice(0, 15);
      
      if (weakCards.length === 0) {
        setQuizError("Bạn chưa có thẻ yếu nào để thực hiện kiểm tra AI. Hãy học thêm một số Flashcard nha!");
        setTimeout(() => setQuizError(null), 3000);
        return;
      }

      setCooldown(20);
      setIsQuizLoading(true);
      setActiveTab("quiz");
      setQuizError(null);
      setQuizFinished(false);
      setQuizScore(0);
      setQuizCurrentIndex(0);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
      
      try {
        const res = await fetch("/api/agent3/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mode: "quiz",
                message: "Sinh đề kiểm tra MCQ theo format chuẩn json.",
                mcqData: weakCards,
                difficulty: "medium"
            })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "Lỗi kết nối từ Hệ thống Gemini");
        if (data.result) {
            let jsonText = data.result.replace(/```json/g, "").replace(/```/g, "").trim();
            const questions = JSON.parse(jsonText);
            if (!Array.isArray(questions)) throw new Error("Format không phải là mảng JSON");
            setQuizQuestions(questions);
            setIsQuizLoading(false);
        } else {
            throw new Error("Dữ liệu rỗng bất thường");
        }
      } catch (err: any) {
        console.error("Quiz Error", err);
        setQuizError("Lỗi Hệ Thống Sinh Đề AI: " + (err.message || "Vui lòng thử lại"));
        setActiveTab("study");
        setIsQuizLoading(false);
        setCooldown(0);
        setTimeout(() => setQuizError(null), 4000);
      }
  };

  const currentQ = quizQuestions[quizCurrentIndex];

  const getCorrectIndex = (q: QuizQuestion) => {
    if (q.correctIndex !== undefined) return q.correctIndex;
    if (q.correctAnswer) {
        const charCode = q.correctAnswer.charCodeAt(0);
        if (charCode >= 65 && charCode <= 68) return charCode - 65; // A=0, B=1...
    }
    return 0; // fallback
  };

  const handleOptionClick = (idx: number) => {
    if (isAnswerRevealed) return;
    setSelectedOption(idx);
    setIsAnswerRevealed(true);
    
    if (idx === getCorrectIndex(currentQ)) {
      setQuizScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
      if (quizCurrentIndex + 1 < quizQuestions.length) {
          setQuizCurrentIndex(prev => prev + 1);
          setSelectedOption(null);
          setIsAnswerRevealed(false);
      } else {
          setQuizFinished(true);
      }
  };

  // Mock trend data
  const basePoints = user?.points || 0;
  
  const getTrendData = () => {
    if (chartPeriod === "30_days") {
       return Array.from({length: 15}).map((_, i) => ({
           day: `Day ${i * 2 + 1}`,
           points: Math.max(0, basePoints - (15 - i) * 12)
       })).concat([{ day: 'Today', points: basePoints }]);
    } else if (chartPeriod === "all_time") {
       return Array.from({length: 10}).map((_, i) => ({
           day: `Month ${i + 1}`,
           points: Math.max(0, basePoints - (10 - i) * 30)
       })).concat([{ day: 'Today', points: basePoints }]);
    } else { // 7 days
       return [
        { day: 'Day 1', points: Math.max(0, basePoints - 45) },
        { day: 'Day 2', points: Math.max(0, basePoints - 38) },
        { day: 'Day 3', points: Math.max(0, basePoints - 29) },
        { day: 'Day 4', points: Math.max(0, basePoints - 15) },
        { day: 'Day 5', points: Math.max(0, basePoints - 8) },
        { day: 'Day 6', points: Math.max(0, basePoints - 3) },
        { day: 'Today', points: basePoints },
      ];
    }
  };
  const trendData = getTrendData();

  return (
    <div className="space-y-8 animate-in fade-in pb-12 relative">
      {showStreakConfetti && <Confetti />}
      {/* Thêm Toast Thông báo Toast Thành Công */}
      {joinStatus && (
          <div className="fixed top-20 right-4 z-50 bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-right-8 font-bold flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6" />
              {joinStatus}
          </div>
      )}

      {/* Thêm Toast Thông báo lỗi AI */}
      {quizError && (
          <div className="fixed top-20 right-4 z-50 bg-red-500 text-white px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-right-8 font-bold flex items-center gap-3">
              <XCircle className="w-6 h-6" />
              {quizError}
          </div>
      )}

      <AnimatePresence mode="wait">
      {activeTab !== "quiz" && (
      <motion.section 
        key="header-stats"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
        transition={{ duration: 0.3 }}
        className="glass p-8 rounded-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Target className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 mb-2">Salve, {user?.name}</h2>
          <p className="font-roman text-lg italic opacity-80 mb-6">"Patience is the greatest of all virtues."</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-4 py-2 rounded-lg font-bold flex items-center gap-2 relative">
              <TrendingUp className="w-5 h-5" />
              Weekly Points: <AnimatedCounter value={user?.points || 0} />
            </div>
            
            <div className="bg-orange-500/20 text-orange-700 dark:text-orange-400 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
              <Flame className="w-5 h-5" />
              Daily Streak: {user?.streak || 0}
            </div>

            <button
               onClick={handleBuyFreeze}
               disabled={user?.streakFreeze || (user ? user.points < 50 : true)}
               title="Streak Freeze (Bảo vệ chuỗi ngày học) - Tốn 50 pts"
               className={cn("px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition hover:scale-105", user?.streakFreeze ? "bg-blue-500 text-white" : "bg-blue-500/20 text-blue-700 dark:text-blue-400 opacity-60 hover:opacity-100 disabled:opacity-30 disabled:hover:scale-100")}
            >
              <Snowflake className={cn("w-5 h-5", user?.streakFreeze ? "animate-pulse" : "")} />
              {user?.streakFreeze ? "Đã Kích Hoạt" : "Trang Bị (50 pts)"}
            </button>

            <button 
                onClick={triggerQuiz} 
                disabled={cooldown > 0} 
                className={cn("px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg transition transform", cooldown > 0 ? "bg-stone-300/60 dark:bg-zinc-800/80 text-black/50 dark:text-white/50 cursor-not-allowed" : "relative overflow-hidden group bg-yellow-500 hover:bg-yellow-600 text-black shadow-lg hover:scale-[1.02] transition-all duration-500 font-bold before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/50 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700")}
            >
              <BrainCircuit className="w-5 h-5" />
              {cooldown > 0 ? `Đang hồi chiêu (${cooldown}s)` : "Kiểm tra năng lực (AI)"}
            </button>
          </div>
        </div>
      </motion.section>
      )}

      {activeTab !== "quiz" && (
      <motion.div 
        key="tab-nav"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex gap-4 mb-6 border-b border-amber-600/20 dark:border-amber-500/30 pb-4 flex-wrap"
      >
        <button 
          onClick={() => setActiveTab("study")} 
          className={cn("px-4 py-2 font-bold rounded-lg transition", activeTab === "study" ? "bg-black dark:bg-white text-white dark:text-black" : "opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5")}
        >
          Góc Học Tập
        </button>
        <button 
          onClick={() => setActiveTab("ranking")} 
           className={cn("px-4 py-2 font-bold rounded-lg transition flex items-center gap-2", activeTab === "ranking" ? "bg-yellow-500 text-black shadow-md" : "opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5")}
        >
          <Crown className="w-5 h-5" /> Bảng Xếp Hạng Tuần
        </button>
        <button 
          onClick={() => setActiveTab("groups")} 
           className={cn("px-4 py-2 font-bold rounded-lg transition flex items-center gap-2", activeTab === "groups" ? "bg-blue-500 text-white shadow-md relative z-10" : "opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5")}
        >
          <Users className="w-5 h-5" /> Nhóm Học Tập
        </button>
        <button 
          onClick={() => setActiveTab("settings")} 
           className={cn("px-4 py-2 font-bold rounded-lg transition flex items-center gap-2", activeTab === "settings" ? "bg-zinc-800 dark:bg-zinc-200 text-white dark:text-black shadow-md" : "opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5")}
        >
          <Settings className="w-5 h-5" /> Cài Đặt
        </button>
        <button 
          onClick={() => setActiveTab("history")} 
           className={cn("px-4 py-2 font-bold rounded-lg transition flex items-center gap-2", activeTab === "history" ? "bg-zinc-800 dark:bg-zinc-200 text-white dark:text-black shadow-md" : "opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5")}
        >
          <Activity className="w-5 h-5" /> Lịch Sử
        </button>
      </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
      {activeTab === "quiz" && (
          <motion.div 
            key="quiz-tab"
            initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
            transition={{ duration: 0.4 }}
          >
             {isQuizLoading ? (
                 <div className="glass p-16 rounded-2xl flex flex-col items-center justify-center text-center space-y-6">
                     <Loader2 className="w-16 h-16 animate-spin text-yellow-500" />
                     <h2 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 text-yellow-600 dark:text-yellow-400">Đang khởi tạo bài kiểm tra năng lực...</h2>
                     <p className="opacity-70 max-w-lg italic font-serif">Chuyên gia khảo thí AI đang phân tích dữ liệu hổng kiến thức của bạn để tạo 15 câu trắc nghiệm thực chiến.</p>
                     <div className="font-mono text-xl bg-stone-200/60 dark:bg-zinc-800/50 px-6 py-2 rounded-full border border-amber-600/20 dark:border-amber-500/30">
                         Cooldown: {cooldown}s
                     </div>
                 </div>
             ) : quizFinished ? (
                 <div className="glass p-12 rounded-2xl flex flex-col items-center justify-center text-center space-y-6">
                     <Trophy className="w-24 h-24 text-yellow-500 mb-4" />
                     <h2 className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500">Tổng kết Bài Test</h2>
                     <div className="text-6xl font-mono font-bold text-yellow-600 dark:text-yellow-400 my-4">
                         {quizScore} <span className="opacity-40 text-4xl">/ {quizQuestions.length}</span>
                     </div>
                     <p className="font-roman text-xl italic opacity-80 border-l-4 border-yellow-500 pl-4 py-2">"{quizQuote}"</p>
                     
                     <div className="pt-8">
                         <button onClick={() => { setActiveTab("study"); setQuizQuestions([]); }} className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition flex items-center gap-2">
                             <ArrowLeft className="w-5 h-5" />
                             Về trang chủ Dashboard
                         </button>
                     </div>
                 </div>
             ) : (
                 <div className="glass p-8 md:p-12 rounded-2xl space-y-8 max-w-4xl mx-auto">
                     <div className="flex justify-between items-center border-b border-amber-600/20 dark:border-amber-500/30 pb-4">
                        <button onClick={() => { setActiveTab("study"); setQuizQuestions([]); setCooldown(0); }} className="opacity-60 hover:opacity-100 transition flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" /> Thoát Bài Test
                        </button>
                        <div className="font-mono bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 px-4 py-1.5 rounded-full font-bold">
                            Câu hỏi {quizCurrentIndex + 1} / {quizQuestions.length}
                        </div>
                     </div>
                     
                     <div className="min-h-[120px] flex items-center justify-center py-6">
                         <h3 className="text-2xl md:text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 leading-relaxed text-center">
                             <div className="markdown-body inline-block"><ReactMarkdown>{currentQ?.question || ""}</ReactMarkdown></div>
                         </h3>
                     </div>

                     <div className="grid md:grid-cols-2 gap-4">
                         {currentQ?.options.map((opt, i) => {
                             let optClass = "border border-amber-600/20 dark:border-amber-500/30 hover:border-yellow-500 hover:bg-yellow-500/5 bg-stone-200/60 dark:bg-zinc-800/50 opacity-90 hover:opacity-100";
                             let OptIcon = null;
                             
                             if (isAnswerRevealed) {
                                 const cIdx = getCorrectIndex(currentQ);
                                 if (i === cIdx) {
                                     optClass = "bg-green-500/20 border-green-500 text-green-900 dark:text-green-300 font-bold shadow-md ring-2 ring-green-500 scale-[1.02] transition-transform";
                                     OptIcon = <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 absolute right-4" />;
                                 } else if (i === selectedOption) {
                                     optClass = "bg-red-500/10 border-red-500/50 text-red-700 dark:text-red-400 opacity-60";
                                     OptIcon = <XCircle className="w-6 h-6 text-red-500/50 absolute right-4" />;
                                 } else {
                                     optClass = "border-amber-600/20 dark:border-amber-500/30 opacity-40 grayscale";
                                 }
                             } else if (i === selectedOption) {
                                 optClass = "ring-2 ring-yellow-500 bg-yellow-500/10 scale-[1.02] transition-transform font-bold";
                             }

                             return (
                                 <button 
                                    key={i}
                                    disabled={isAnswerRevealed}
                                    onClick={() => handleOptionClick(i)}
                                    className={cn("relative p-6 rounded-xl text-left transition-all duration-300 flex items-center md:text-lg", optClass, isAnswerRevealed ? "cursor-default" : "cursor-pointer")}
                                 >
                                    <span className="font-bold opacity-50 mr-4 font-mono">{String.fromCharCode(65 + i)}.</span>
                                    <div className="markdown-body pr-8"><ReactMarkdown>{opt}</ReactMarkdown></div>
                                    {OptIcon}
                                 </button>
                             );
                         })}
                     </div>
                     
                     {isAnswerRevealed && (
                         <div className="pt-8 border-t border-amber-600/20 dark:border-amber-500/30 animate-in fade-in slide-in-from-bottom-4 flex flex-col md:flex-row items-center justify-between gap-6">
                             <div className="flex-1 bg-stone-200/60 dark:bg-zinc-800/50 p-4 rounded-xl border border-amber-600/20 dark:border-amber-500/30">
                                 <span className="font-bold text-yellow-600 dark:text-yellow-400 flex items-center gap-2 mb-2">
                                     <Sparkles className="w-4 h-4" /> AI Giải Thích:
                                 </span>
                                 <p className="font-serif italic opacity-90">{currentQ?.explanation || "Đáp án đúng là " + String.fromCharCode(65 + getCorrectIndex(currentQ))}</p>
                             </div>
                             
                             <button onClick={handleNextQuestion} className="relative overflow-hidden group bg-yellow-500 hover:bg-yellow-600 text-black px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all duration-500 transform hover:scale-105 hover:-translate-y-1 shrink-0 w-full md:w-auto before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700">
                                 {quizCurrentIndex + 1 < quizQuestions.length ? "Câu tiếp theo" : "Xem kết quả"}
                                 <ArrowRight className="w-5 h-5" />
                             </button>
                         </div>
                     )}
                 </div>
             )}
          </motion.div>
      )}

      {activeTab === "study" && (
        <motion.div 
          key="study-tab"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="grid md:grid-cols-3 gap-8"
        >
          <section className="md:col-span-2 space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <h3 className="text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-yellow-500" /> Your Studies
              </h3>
              
              <button 
                onClick={toggleNotifications}
                className={cn("flex flex-1 md:flex-none justify-between items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition", notificationsEnabled ? "bg-stone-200/80 dark:bg-zinc-800/80 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30" : "bg-stone-200/40 dark:bg-zinc-800/40 opacity-70 hover:opacity-100 border border-transparent")}
              >
                <div className="flex items-center gap-2">
                  {notificationsEnabled ? <BellRing className="w-4 h-4 animate-pulse" /> : <BellOff className="w-4 h-4" />}
                  <span>{notificationsEnabled ? "Nhắc nhở đang bật" : "Nhắc nhở đang tắt"}</span>
                </div>
                {notificationsEnabled && pendingCardsCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-md animate-in zoom-in-95">{pendingCardsCount} pending</span>
                )}
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {decks.map((deck, idx) => {
                const masteredCount = deck.cards.filter(c => c.mastery >= 80).length;
                const masteryRate = deck.cards.length > 0 ? Math.round((masteredCount / deck.cards.length) * 100) : 0;
                
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    key={deck.id} 
                    className="glass p-6 rounded-xl flex flex-col hover:border-yellow-500/50 transition"
                  >
                    <h4 className="font-bold text-lg mb-1">{deck.title}</h4>
                    <span className="text-sm opacity-60 uppercase tracking-wider mb-4">{deck.subject}</span>
                    
                    <div className="mt-auto pt-4 border-t border-amber-600/20 dark:border-amber-500/30 flex items-center justify-between">
                      <div className="flex flex-col gap-1 w-full mr-4">
                        <div className="flex justify-between text-xs font-mono font-bold">
                          <span>Chỉ số Thông thạo</span>
                          <span className="text-yellow-600 dark:text-yellow-400">{masteryRate}%</span>
                        </div>
                        <div className="w-full h-2 bg-stone-300/60 dark:bg-zinc-800/80 rounded-full overflow-hidden">
                          <motion.div 
                            className="bg-yellow-500 h-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${masteryRate}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                      
                      <Link to={`/study/${deck.id}`} className="bg-black dark:bg-white text-white dark:text-black p-3 rounded-full hover:scale-110 shadow-md transition flex items-center justify-center shrink-0">
                        <Play className="w-4 h-4 ml-0.5" />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-8 pt-8 border-t border-amber-600/20 dark:border-amber-500/30">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <h3 className="text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 flex items-center gap-2">
                  <Activity className="w-6 h-6 text-yellow-500" /> Weekly Mastery Trend
                </h3>
                <div className="flex items-center gap-2">
                  <select 
                    value={chartPeriod} 
                    onChange={(e) => setChartPeriod(e.target.value as any)}
                    className="bg-stone-200/60 dark:bg-zinc-800/50 border border-amber-600/20 dark:border-amber-500/30 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 appearance-none cursor-pointer"
                  >
                    <option value="7_days">Last 7 Days</option>
                    <option value="30_days">Last 30 Days</option>
                    <option value="all_time">All Time</option>
                  </select>
                  <button 
                    onClick={() => setIsChartExpanded(true)}
                    className="p-2 bg-stone-200/60 dark:bg-zinc-800/50 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium opacity-80 hover:opacity-100"
                    title="Phóng to biểu đồ"
                  >
                    <Maximize2 className="w-4 h-4" /> Phóng to
                  </button>
                </div>
              </div>
              <div className="glass p-6 rounded-xl w-full h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis 
                      dataKey="day" 
                      stroke="currentColor" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      opacity={0.7}
                    />
                    <YAxis 
                      stroke="currentColor"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      opacity={0.7}
                      width={40}
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                      cursor={{ stroke: 'rgba(234,179,8,0.2)', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="points" 
                      stroke="#eab308" 
                      strokeWidth={3}
                      dot={{ fill: '#eab308', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <aside className="space-y-8">
            <section className="glass p-6 rounded-xl">
              <h3 className="text-xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" /> Mục tiêu Ngày
              </h3>
              <div className="flex flex-col items-center">
                 <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                       <circle cx="50" cy="50" r="40" fill="transparent" stroke="currentColor" strokeWidth="8" className="opacity-10 text-blue-500" />
                       <circle 
                         cx="50" cy="50" r="40" 
                         fill="transparent" 
                         stroke="#3b82f6" 
                         strokeWidth="8" 
                         strokeDasharray={251.2} 
                         strokeDashoffset={251.2 - (Math.min(dailyReviewed / dailyGoal, 1) * 251.2)} 
                         strokeLinecap="round" 
                         className="transition-all duration-1000 ease-out"
                       />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                       <span className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">{dailyReviewed}</span>
                       <span className="text-xs opacity-60">/ {dailyGoal} thẻ</span>
                    </div>
                 </div>
                 
                 <div className="mt-6 w-full space-y-2">
                    <label className="text-sm opacity-80 font-medium">Cài đặt mục tiêu (thẻ):</label>
                    <input 
                       type="number" 
                       min="1" max="1000"
                       value={dailyGoal}
                       onChange={handleDailyGoalChange}
                       className="w-full bg-black/5 dark:bg-white/5 border border-amber-600/20 dark:border-amber-500/30 rounded-lg px-3 py-2 text-center font-bold focus:outline-none focus:border-blue-500 transition"
                    />
                 </div>
              </div>
            </section>

            <section className="glass p-6 rounded-xl">
              <h3 className="text-xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" /> Leaderboard
              </h3>
              <div className="space-y-3">
                {sortedUsers.slice(0, 5).map((u, i) => (
                  <div key={u.id} className={cn("flex justify-between items-center p-2 rounded-lg", u.id === user?.id ? "bg-yellow-500/10 border border-yellow-500/20" : "")}>
                    <div className="flex items-center gap-3">
                      <span className={cn("font-bold font-mono text-sm", i === 0 ? "text-yellow-500" : "opacity-50")}>#{i + 1}</span>
                      <span className="font-medium truncate max-w-[120px]">{u.name}</span>
                    </div>
                    <span className="font-mono text-sm opacity-70 font-bold">{u.points} pts</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </motion.div>
      )}

      {activeTab === "groups" && (
        <motion.div 
          key="groups-tab"
        initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="glass p-8 md:p-12 rounded-2xl relative overflow-hidden max-w-4xl mx-auto"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Users className="w-64 h-64" />
          </div>
          <div className="relative z-10 space-y-12">
            {activeGroup ? (
              <div className="space-y-8 animate-in zoom-in-95 duration-500">
                 <div className="text-center mb-10">
                   <h3 className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 mb-2 flex justify-center items-center gap-3">
                      <Users className="w-8 h-8 text-blue-500" />
                      {activeGroup.name}
                   </h3>
                   <div className="flex items-center justify-center gap-4 mt-4">
                       <span className="font-mono bg-stone-200/60 dark:bg-zinc-800/50 border border-amber-600/20 dark:border-amber-500/30 text-lg font-bold py-2 px-6 rounded-lg select-all cursor-pointer" title="Copy to clipboard">
                           ID: {activeGroup.id}
                       </span>
                       <button onClick={() => setActiveGroup(null)} className="text-red-500 hover:text-red-600 bg-red-500/10 px-4 py-2 rounded-lg font-bold transition hover:bg-red-500/20">
                          Rời Nhóm
                       </button>
                   </div>
                 </div>

                 <div className="bg-background/40 backdrop-blur border border-amber-600/20 dark:border-amber-500/30 p-8 rounded-2xl max-w-2xl mx-auto space-y-6 shadow-xl">
                    <div className="flex items-center gap-3 border-b border-amber-600/20 dark:border-amber-500/30 pb-4">
                       <Crown className="w-6 h-6 text-yellow-500" />
                       <h4 className="text-xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500">Xếp Hạng Thành Viên</h4>
                    </div>
                    
                    <ul className="space-y-4">
                       {activeGroup.members.map((member, i) => (
                          <li key={member.id} className={cn("flex items-center justify-between p-4 rounded-xl border transition-all", 
                             member.isCurrent ? "bg-yellow-500/10 border-yellow-500 text-yellow-900 dark:text-yellow-100 shadow-md transform scale-[1.02]" : "bg-stone-200/60 dark:bg-zinc-800/50 border-transparent")}
                          >
                             <div className="flex items-center gap-4">
                               <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-lg shrink-0",
                                 i === 0 ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : 
                                 i === 1 ? "bg-gray-300 text-black shadow-lg" : 
                                 i === 2 ? "bg-orange-400 text-black shadow-lg" : 
                                 "bg-stone-300/60 dark:bg-zinc-800/80"
                               )}>
                                 #{i + 1}
                               </div>
                               <div>
                                 <p className="font-bold flex items-center gap-2">
                                    {member.name}
                                    {member.isCurrent && <span className="bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full">(Bạn)</span>}
                                 </p>
                               </div>
                             </div>
                             <div className="font-mono font-bold text-lg opacity-80">
                               {member.points} pts
                             </div>
                          </li>
                       ))}
                    </ul>
                 </div>
              </div>
            ) : (
            <>
              <div className="text-center mb-10">
                <h3 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 mb-2">Nhóm Học Tập</h3>
                <p className="opacity-70 font-serif italic text-lg max-w-xl mx-auto">Tham gia hoặc tạo nhóm để cùng nhau tiến bộ. Hành trình tri thức sẽ bớt gian nan hơn khi có bạn đồng hành.</p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-12">
                  <section className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-amber-600/20 dark:border-amber-500/30 pb-4">
                       <span className="bg-blue-500 text-white p-2 rounded-lg"><Users className="w-6 h-6" /></span>
                       <h3 className="text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500">Tham gia nhóm</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <label className="text-base font-bold opacity-80 block">Nhập ID nhóm của bạn:</label>
                      <div className="flex gap-2">
                        <input 
                           className="flex-1 bg-stone-200/60 dark:bg-zinc-800/50 border-2 border-amber-600/20 dark:border-amber-500/30 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-blue-500 font-mono transition-colors"
                           placeholder="Ví dụ: A7B9F2" 
                           value={groupId}
                           onChange={e => setGroupId(e.target.value)}
                           onKeyDown={e => e.key === 'Enter' && handleJoinGroup()}
                        />
                      </div>
                      <button onClick={handleJoinGroup} className="bg-blue-600 text-white w-full py-3 rounded-xl text-lg font-bold hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30 transition transform hover:-translate-y-1">
                          Tham Gia Ngay
                      </button>
                    </div>
                  </section>
      
                  <section className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-amber-600/20 dark:border-amber-500/30 pb-4">
                       <span className="bg-yellow-500 text-black p-2 rounded-lg"><Crown className="w-6 h-6" /></span>
                       <h3 className="text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500">Tạo nhóm học tập</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <label className="text-base font-bold opacity-80 block">Tên nhóm mới:</label>
                      <div className="flex gap-2">
                        <input 
                           className="flex-1 bg-stone-200/60 dark:bg-zinc-800/50 border-2 border-amber-600/20 dark:border-amber-500/30 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-yellow-500 transition-colors"
                           placeholder="Nhóm vượt vũ môn..." 
                           value={newGroupName}
                           onChange={e => setNewGroupName(e.target.value)}
                           onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
                           disabled={isCreating}
                        />
                      </div>
                      <button onClick={handleCreateGroup} disabled={isCreating} className="relative overflow-hidden group bg-yellow-500 text-black w-full py-3 rounded-xl text-lg font-bold hover:bg-yellow-600 shadow-lg hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all duration-500 transform hover:-translate-y-1 hover:scale-[1.02] disabled:opacity-50 disabled:transform-none before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700">
                        {isCreating ? (
                          <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Đang thiết lập...</span>
                        ) : "Khởi Tạo Nhóm"}
                      </button>
                    </div>
                  </section>
              </div>
            </>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === "ranking" && (
        <motion.div 
          key="ranking-tab"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="glass p-8 rounded-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Crown className="w-64 h-64" />
          </div>
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <div className="text-center mb-10">
              <h3 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 mb-2">Bảng Xếp Hạng Tuần</h3>
              <p className="opacity-70">Top học sinh có điểm tích lũy phong độ học tập cao nhất. Hệ thống tự động reset sau 7 ngày.</p>
            </div>
            
            <div className="space-y-4">
              {sortedUsers.map((u, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  key={u.id} className={cn("flex items-center justify-between p-4 rounded-xl border transition-all", 
                  u.id === user?.id ? "bg-yellow-500/10 border-yellow-500 text-yellow-900 dark:text-yellow-100 shadow-md scale-[1.02]" : "bg-stone-200/60 dark:bg-zinc-800/50 border-transparent hover:border-black/10 dark:hover:border-white/10"
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-lg shrink-0",
                      i === 0 ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : 
                      i === 1 ? "bg-gray-300 text-black shadow-lg" : 
                      i === 2 ? "bg-orange-400 text-black shadow-lg" : 
                      "bg-stone-300/60 dark:bg-zinc-800/80"
                    )}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-bold text-lg flex items-center flex-wrap gap-2">
                        {u.name} 
                        {u.id === user?.id && <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full uppercase tracking-wider">You</span>}
                      </p>
                      <p className="text-xs opacity-60">Học sinh</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-mono shrink-0">
                     <span className="text-2xl font-bold">{u.points}</span>
                     <span className="opacity-60 text-sm">pts</span>
                  </div>
                </motion.div>
              ))}
              
              {sortedUsers.length === 0 && (
                <div className="text-center p-8 opacity-50 font-bold border-2 border-dashed border-amber-600/20 dark:border-amber-500/30 rounded-xl">
                  Chưa có học sinh nào trên bảng xếp hạng tuần này.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "settings" && (
        <motion.div 
          key="settings-tab"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="glass p-8 rounded-2xl relative overflow-hidden max-w-3xl mx-auto"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Settings className="w-48 h-48" />
          </div>
          
          <div className="relative z-10">
            <h3 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 mb-8 flex items-center gap-3 border-b border-amber-600/20 dark:border-amber-500/30 pb-4">
               Cài Đặt Hệ Thống
            </h3>
            
            <div className="space-y-6">
              <div className="bg-white/50 dark:bg-zinc-900/50 p-6 rounded-xl border border-amber-600/20 dark:border-amber-500/30 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                 <div className="space-y-2 max-w-lg">
                    <h4 className="text-xl font-bold flex items-center gap-2"><Trash2 className="w-5 h-5 text-red-500" /> Xóa Dữ Liệu Cũ</h4>
                    <p className="opacity-70 text-sm">
                      Xóa bỏ các dữ liệu nháp của thẻ học (Agent 3) và danh sách thẻ yếu (weak_cards). Điều này giúp làm mới lộ trình học của bạn mà không ảnh hưởng đến điểm số hiện tại.
                    </p>
                 </div>
                 <button 
                    onClick={() => setShowClearConfirm(true)}
                    className="shrink-0 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-transform hover:scale-105 flex items-center gap-2 shadow-lg"
                 >
                    Xóa Dữ Liệu Ngay
                 </button>
              </div>
            </div>
          </div>

          {/* Dialog Confirmation */}
          <AnimatePresence>
             {showClearConfirm && (
                <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                >
                   <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-stone-100 dark:bg-zinc-900 border border-red-500/30 shadow-2xl rounded-2xl p-6 md:p-8 max-w-md w-full"
                   >
                      <div className="flex flex-col items-center text-center space-y-4">
                         <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
                             <AlertTriangle className="w-8 h-8" />
                         </div>
                         <h3 className="text-2xl font-bold">Bạn có chắc chắn?</h3>
                         <p className="opacity-80 pb-4">
                            Hành động này sẽ xóa vĩnh viễn các dữ liệu nháp và danh sách thẻ yếu hiện tại (weak_cards) khỏi hệ thống. Bạn không thể hoàn tác thao tác này. Bạn có muốn tiếp tục không?
                         </p>
                         <div className="flex w-full gap-4">
                            <button 
                               onClick={() => setShowClearConfirm(false)}
                               className="flex-1 py-3 rounded-lg border border-amber-600/20 dark:border-amber-500/30 font-bold transition hover:bg-black/5 dark:hover:bg-white/5"
                            >
                               Hủy
                            </button>
                            <button 
                               onClick={handleClearOldData}
                               className="flex-1 py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold transition-transform hover:scale-105 shadow-md"
                            >
                               Xác Nhận Xóa
                            </button>
                         </div>
                      </div>
                   </motion.div>
                </motion.div>
             )}
          </AnimatePresence>
        </motion.div>
      )}
      {activeTab === "history" && (
        <motion.div 
          key="history-tab"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="glass p-8 rounded-2xl relative max-w-4xl mx-auto"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Activity className="w-48 h-48" />
          </div>
          <div className="relative z-10">
             <h3 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 mb-8 flex items-center gap-3 border-b border-amber-600/20 dark:border-amber-500/30 pb-4">
                Lịch Sử Ôn Tập
             </h3>
             <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {user && store.getReviewHistory(user.id).length > 0 ? (
                  store.getReviewHistory(user.id).map((record) => (
                    <motion.div 
                      key={record.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white/50 dark:bg-zinc-900/50 p-4 rounded-xl border border-amber-600/20 dark:border-amber-500/30 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-stone-200 dark:bg-zinc-700">{record.deckTitle}</span>
                           <span className="text-xs opacity-60 font-mono">{new Date(record.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="font-bold text-lg line-clamp-1">{record.front}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                         {record.remembered ? (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold bg-green-500/10 px-3 py-1 rounded-full"><CheckCircle2 className="w-4 h-4"/> Nhớ mặt chữ</span>
                         ) : (
                            <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold bg-red-500/10 px-3 py-1 rounded-full"><XCircle className="w-4 h-4"/> Chưa nhớ</span>
                         )}
                         <div className="font-mono text-sm w-16 text-right">
                           <span className={record.masteryChange >= 0 ? "text-green-500" : "text-red-500"}>
                              {record.masteryChange > 0 ? "+" : ""}{record.masteryChange}%
                           </span>
                         </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center p-12 opacity-60 font-bold border-2 border-dashed border-amber-600/20 dark:border-amber-500/30 rounded-xl">
                     Chưa có lịch sử ôn tập. Hãy bắt đầu học!
                  </div>
                )}
             </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Full-screen Expanded Chart Overlay */}
      <AnimatePresence>
      {isChartExpanded && (
        <motion.div 
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 md:p-8"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-stone-100/80 dark:bg-zinc-950/40 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-amber-600/20 dark:border-amber-500/30 rounded-2xl w-full h-full max-w-6xl max-h-[800px] flex flex-col p-6 md:p-8 relative backdrop-blur-xl"
          >
            <div className="flex justify-between items-center mb-6 border-b border-amber-600/20 dark:border-amber-500/30 pb-4 flex-wrap gap-4">
              <h3 className="text-2xl md:text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500 flex items-center gap-3">
                <Activity className="w-8 h-8 text-yellow-500" /> Biểu Đồ Phong Độ Tuần
              </h3>
              <div className="flex items-center gap-4">
                <select 
                  value={chartPeriod} 
                  onChange={(e) => setChartPeriod(e.target.value as any)}
                  className="bg-stone-200/60 dark:bg-zinc-800/50 border border-amber-600/20 dark:border-amber-500/30 rounded-lg px-4 py-2 text-sm md:text-base font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 appearance-none cursor-pointer"
                >
                  <option value="7_days">Last 7 Days</option>
                  <option value="30_days">Last 30 Days</option>
                  <option value="all_time">All Time</option>
                </select>
                <button 
                  onClick={() => setIsChartExpanded(false)}
                  className="p-3 bg-stone-200/60 dark:bg-zinc-800/50 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                >
                  <Minimize2 className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" vertical={false} />
                  <XAxis 
                    dataKey="day" 
                    stroke="currentColor" 
                    fontSize={14}
                    tickLine={false}
                    axisLine={false}
                    opacity={0.7}
                    dy={10}
                  />
                  <YAxis 
                    stroke="currentColor"
                    fontSize={14}
                    tickLine={false}
                    axisLine={false}
                    opacity={0.7}
                    width={50}
                  />
                  <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{ stroke: 'rgba(234,179,8,0.3)', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="points" 
                    stroke="#eab308" 
                    strokeWidth={4}
                    dot={{ fill: '#eab308', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: 'white', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
