import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { store, Flashcard } from "../lib/store";
import { Check, X, RefreshCcw, ArrowLeft, BrainCircuit, Edit3, Sparkles, Volume2, VolumeX, Type, Pin, PinOff, Minimize2, Maximize2, Play, Pause, Clock } from "lucide-react";
import { playFlipSound, playCorrectSound, playIncorrectSound, toggleMute, getIsMuted, initAudio } from "../lib/audio";
import { cn } from "../lib/utils";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { motion } from "motion/react";

const MOTIVATION_QUOTES = [
  "It is not because things are difficult that we do not dare; it is because we do not dare that they are difficult. - Seneca",
  "The impediment to action advances action. What stands in the way becomes the way. - Marcus Aurelius",
  "You have power over your mind - not outside events. - Marcus Aurelius",
  "Luck is what happens when preparation meets opportunity. - Seneca"
];

const Confetti = () => {
  const colors = ['#fde047', '#3b82f6', '#ef4444', '#22c55e', '#a855f7'];
  const pieces = Array.from({ length: 80 }).map((_, i) => ({
    id: i,
    x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 8 + 6,
    duration: 2.5 + Math.random() * 3,
    delay: Math.random() * 0.5,
    rotation: Math.random() * 720
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
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

export default function StudyRoom() {
  const user = store.getCurrentUser();
  const { deckId } = useParams();
  const deck = store.getDeck(deckId || "");
  const [studyQueue, setStudyQueue] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [finished, setFinished] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  
  const [muted, setMuted] = useState(getIsMuted());

  const handleToggleMute = () => {
     setMuted(toggleMute());
  };

  const handleFlip = () => {
    if (!isEditing) {
      if (!isFlipped) playFlipSound(); // Optionally play sound both on flip and unflip, but just play it
      else playFlipSound();
      setIsFlipped(!isFlipped);
    }
  };

  const [deepExplanation, setDeepExplanation] = useState<string | null>(null);
  const [isSerif, setIsSerif] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [quote] = useState(MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)]);

  const [studyMode, setStudyMode] = useState<"all" | "weak">("all");
  const [weakCardIds, setWeakCardIds] = useState<string[]>([]);
  
  // Pomodoro
  const POMODORO_MINS = 25;
  const [timerSeconds, setTimerSeconds] = useState(POMODORO_MINS * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerFinished, setIsTimerFinished] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(s => s - 1);
      }, 1000);
    } else if (isTimerRunning && timerSeconds === 0) {
      setIsTimerRunning(false);
      setIsTimerFinished(true);
      store.addBonusPoints(25);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const toggleTimer = () => {
    if (isTimerFinished) {
      setTimerSeconds(POMODORO_MINS * 60);
      setIsTimerFinished(false);
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(!isTimerRunning);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (deck) {
      const storageKey = `weak_cards_${deck.id}`;
      const savedWeakIds = JSON.parse(localStorage.getItem(storageKey) || "[]");
      setWeakCardIds(savedWeakIds);
      
      const due = deck.cards;
      setStudyQueue(due);
    }
  }, [deck]);

  const startReviewXCards = () => {
    if (!deck) return;
    const storageKey = `weak_cards_${deck.id}`;
    const savedWeakIds = JSON.parse(localStorage.getItem(storageKey) || "[]");
    const weakCards = deck.cards.filter(c => savedWeakIds.includes(c.id));
    
    if (weakCards.length === 0) {
       alert("Tuyệt vời! Bạn không còn thẻ nào bị đánh dấu X trong bộ này.");
       return;
    }
    
    setWeakCardIds(savedWeakIds);
    setStudyQueue(weakCards);
    setStudyMode("weak");
    setCurrentIndex(0);
    setFinished(false);
    setIsFlipped(false);
    if (!isPinned) setDeepExplanation(null);
    else setIsMinimized(true);
  };
  
  const startReviewAll = () => {
    if (!deck) return;
    setStudyQueue(deck.cards);
    setStudyMode("all");
    setCurrentIndex(0);
    setFinished(false);
    setIsFlipped(false);
    if (!isPinned) setDeepExplanation(null);
    else setIsMinimized(true);
  };

  if (!deck) return <div>Deck not found</div>;

  const currentCard = studyQueue[currentIndex];

  const handleMark = (remembered: boolean) => {
    initAudio();
    if (currentCard) {
      if (remembered) playCorrectSound();
      else playIncorrectSound();
      
      store.updateCardMastery(deck.id, currentCard.id, remembered);
      
      const storageKey = `weak_cards_${deck.id}`;
      let weakIds = JSON.parse(localStorage.getItem(storageKey) || "[]");
      
      if (!remembered) {
         if (!weakIds.includes(currentCard.id)) {
            weakIds.push(currentCard.id);
         }
      } else {
         weakIds = weakIds.filter((id: string) => id !== currentCard.id);
      }
      
      localStorage.setItem(storageKey, JSON.stringify(weakIds));
      setWeakCardIds(weakIds);
    }
    
    if (!isPinned) setDeepExplanation(null);
    else setIsMinimized(true);

    setIsFlipped(false);
    if (currentIndex + 1 < studyQueue.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setFinished(true);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (finished || !currentCard || isExtracting || isEditing) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowLeft') {
        if (isFlipped) {
          e.preventDefault();
          handleMark(false);
        }
      } else if (e.code === 'ArrowRight') {
        if (isFlipped) {
          e.preventDefault();
          handleMark(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [finished, currentCard, isExtracting, isEditing, isFlipped, deckId, currentIndex]); // using deps carefully to avoid infinite re-renders

  const handleAgent2 = async () => {
    if (!currentCard) return;
    setIsExtracting(true);
    setIsMinimized(false);
    try {
      const res = await fetch("/api/agent2/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          term: currentCard.front, 
          definition: currentCard.back, 
          subject: currentCard.subject 
        })
      });
      const data = await res.json();
      setDeepExplanation(data.result);
    } catch (e) {
      setDeepExplanation("Failed to router extract. Check AI connection.");
    }
    setIsExtracting(false);
  };

  const handleEditOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditFront(currentCard.front);
    setEditBack(currentCard.back);
    setIsEditing(true);
  };

  const handleSaveEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deck) {
      store.updateCard(deck.id, currentCard.id, editFront, editBack);
      // To immediately reflect changes
      currentCard.front = editFront;
      currentCard.back = editBack;
    }
    setIsEditing(false);
  };

  if (finished) {
    const avgMastery = Math.round(deck.cards.reduce((acc, c) => acc + c.mastery, 0) / deck.cards.length);
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-in zoom-in-95 duration-500">
        <Confetti />
        <div className="glass p-12 rounded-2xl max-w-lg text-center space-y-6 relative z-10">
          <div className="w-24 h-24 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
             <span className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500">{avgMastery}%</span>
          </div>
          <h2 className="text-2xl font-bold">Set Complete!</h2>
          
          <div className="p-4 bg-stone-200/60 dark:bg-zinc-800/50 rounded-lg border-l-4 border-yellow-500">
             <p className="font-roman italic opacity-80">"{quote}"</p>
          </div>

          <div className="pt-6 flex flex-col gap-3 justify-center">
            <button onClick={startReviewAll} className="px-6 py-3 rounded-lg bg-stone-300/60 dark:bg-zinc-800/80 font-bold hover:bg-black/20 transition">Ôn tập lại từ đầu (Review All)</button>
            {weakCardIds.length > 0 && (
              <button 
                onClick={startReviewXCards} 
                className="px-6 py-3 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 font-bold hover:bg-red-500 hover:text-white transition"
              >
                Ôn tập thẻ X ({weakCardIds.length})
              </button>
            )}
            <Link to="/dashboard" className="px-6 py-3 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-600 transition">Trở về Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCard || studyQueue.length === 0) return (
     <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
       <div>No cards in this view.</div>
       <button onClick={startReviewAll} className="px-6 py-2 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-600 transition">Quay lại bộ đầy đủ</button>
     </div>
  );

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Link to="/dashboard" className="flex items-center gap-2 opacity-60 hover:opacity-100 transition w-fit">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <button onClick={handleToggleMute} className="p-2 bg-stone-200/60 dark:bg-zinc-800/50 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition" title={muted ? "Unmute sounds" : "Mute sounds"}>
            {muted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 opacity-70" />}
          </button>
          <div className="flex items-center gap-2 bg-stone-200/60 dark:bg-zinc-800/50 px-3 py-1.5 rounded-full border border-amber-600/10 dark:border-amber-500/10">
            <Clock className="w-4 h-4 opacity-70" />
            <span className="font-mono font-bold text-sm min-w-[40px] text-center">
              {formatTime(timerSeconds)}
            </span>
            <button onClick={toggleTimer} className="hover:text-yellow-600 dark:hover:text-yellow-400 transition" title={isTimerRunning ? "Pause Timer" : "Start Pomodoro"}>
              {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            {isTimerFinished && (
              <span className="text-xs text-green-500 font-bold animate-pulse ml-1 text-[10px] uppercase">
                +25pts!
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={startReviewAll} className={cn("px-3 py-1 rounded text-sm font-bold transition", studyMode === "all" ? "bg-yellow-500 text-black shadow" : "bg-stone-200/60 dark:bg-zinc-800/50 opacity-70")}>Tất cả</button>
           <button onClick={startReviewXCards} className={cn("px-3 py-1 rounded text-sm font-bold transition flex items-center gap-1", studyMode === "weak" ? "bg-red-500 text-white shadow" : "bg-stone-200/60 dark:bg-zinc-800/50 opacity-70")}>
              Thẻ X <span className="bg-black/20 px-1.5 rounded-full text-xs">{weakCardIds.length}</span>
           </button>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-sm font-mono opacity-60 px-2">
         <span>Card {currentIndex + 1} of {studyQueue.length}</span>
         <span>Sub: {currentCard.subject}</span>
      </div>

      <div className="perspective-1000 relative w-full h-80 cursor-pointer group" onClick={handleFlip}>
        <div className={cn("w-full h-full transition-all duration-500 transform-style-3d glass rounded-3xl flex flex-col items-center justify-center text-center", isFlipped ? "[transform:rotateY(180deg)]" : "")}>
          {/* Front */}
          <div className="absolute inset-0 backface-hidden flex items-center justify-center p-8 rounded-3xl">
            {user?.role === "teacher" && !isEditing && (
               <button onClick={handleEditOpen} className="absolute top-4 right-4 z-20 p-2 bg-stone-300/60 dark:bg-zinc-800/80 rounded-full hover:bg-black/20 dark:hover:bg-white/20 transition">
                 <Edit3 className="w-5 h-5 text-blue-500" />
               </button>
            )}
            {!isEditing ? (
              <h2 className="text-4xl font-display font-semibold">{currentCard.front}</h2>
            ) : (
              <div className="w-full space-y-4" onClick={e => e.stopPropagation()}>
                <textarea 
                  className="w-full p-4 rounded-xl bg-stone-200/60 dark:bg-zinc-800/50 border border-amber-600/20 dark:border-amber-500/30 resize-none outline-none focus:ring-2 focus:ring-blue-500 transition" 
                  value={editFront} 
                  onChange={e => setEditFront(e.target.value)} 
                  placeholder="Mặt trước..." 
                  rows={2} 
                />
                <textarea 
                  className="w-full p-4 rounded-xl bg-stone-200/60 dark:bg-zinc-800/50 border border-amber-600/20 dark:border-amber-500/30 resize-none outline-none focus:ring-2 focus:ring-blue-500 transition text-sm" 
                  value={editBack} 
                  onChange={e => setEditBack(e.target.value)} 
                  placeholder="Mặt sau..." 
                  rows={3} 
                />
                <button onClick={handleSaveEdit} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold w-full hover:bg-blue-700 transition">Lưu Thay Đổi</button>
              </div>
            )}
          </div>
          {/* Back */}
          <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] flex items-center justify-center p-8 text-lg opacity-80 rounded-3xl overflow-y-auto">
            {user?.role === "teacher" && !isEditing && (
               <button onClick={handleEditOpen} className="absolute top-4 right-4 z-20 p-2 bg-stone-300/60 dark:bg-zinc-800/80 rounded-full hover:bg-black/20 dark:hover:bg-white/20 transition">
                 <Edit3 className="w-5 h-5 text-blue-500" />
               </button>
            )}
            {!isEditing ? (
              <p>{currentCard.back}</p>
            ) : (
              <div className="w-full space-y-4 bg-white dark:bg-black/90 p-4 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                <textarea 
                  className="w-full p-3 rounded-xl bg-stone-200/60 dark:bg-zinc-800/50 border border-amber-600/20 dark:border-amber-500/30 resize-none outline-none focus:ring-2 focus:ring-blue-500 transition text-base" 
                  value={editFront} 
                  onChange={e => setEditFront(e.target.value)} 
                  placeholder="Mặt trước..." 
                  rows={2} 
                />
                <textarea 
                  className="w-full p-3 rounded-xl bg-stone-200/60 dark:bg-zinc-800/50 border border-amber-600/20 dark:border-amber-500/30 resize-none outline-none focus:ring-2 focus:ring-blue-500 transition text-sm" 
                  value={editBack} 
                  onChange={e => setEditBack(e.target.value)} 
                  placeholder="Mặt sau..." 
                  rows={3} 
                />
                <button onClick={handleSaveEdit} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold w-full hover:bg-blue-700 transition">Lưu Thay Đổi</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 pt-4">
        {/* Agent 2 Deep Extract Button */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
             {(!deepExplanation || isPinned) && (
               <button onClick={handleAgent2} disabled={isExtracting} className="w-full flex items-center justify-center gap-2 p-3 glass rounded-xl text-md font-bold border border-yellow-500/30 hover:border-yellow-500 hover:bg-yellow-500/5 transition text-yellow-700 dark:text-yellow-400 shadow-sm">
                 <Sparkles className="w-5 h-5 text-yellow-500" />
                 {isExtracting ? "Đang Bóc Tách Chuyên Sâu..." : "Bóc Tách Sâu (Agent 2)"}
               </button>
             )}
             
             {deepExplanation && (
               <div className={cn(
                 "text-base animate-in fade-in leading-relaxed border-t-4 border-yellow-500 shadow-lg bg-gradient-to-b from-yellow-500/10 to-background",
                 isSerif ? "font-serif" : "font-sans",
                 isPinned 
                   ? (isMinimized 
                       ? "fixed bottom-4 right-4 z-50 w-auto glass px-6 py-3 rounded-full cursor-pointer hover:scale-105 transition-transform" 
                       : "fixed bottom-4 right-4 z-50 w-[90%] md:w-96 max-h-[70vh] overflow-y-auto glass p-6 rounded-2xl shadow-2xl") 
                   : "glass p-6 xl:p-8 rounded-xl mt-4"
               )}
               onClick={() => { if (isPinned && isMinimized) setIsMinimized(false); }}
               >
                 {isPinned && isMinimized ? (
                    <div className="flex items-center justify-center font-bold text-yellow-600 dark:text-yellow-400 gap-2">
                       <Sparkles className="w-4 h-4" /> 
                       <span>Agent 2</span>
                       <Maximize2 className="w-4 h-4 ml-2" />
                    </div>
                 ) : (
                    <>
                      <div className="flex justify-between items-center mb-4 pb-2 border-b border-amber-600/20 dark:border-amber-500/30 sticky top-0 bg-background/80 backdrop-blur-md z-10 p-2 -mx-2 -mt-2">
                         <span className="font-bold flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                             <Sparkles className="w-5 h-5" />
                             Agent 2
                         </span>
                         <div className="flex items-center gap-1">
                             <button onClick={(e) => { e.stopPropagation(); setIsSerif(!isSerif); }} className="p-2 bg-stone-200/60 dark:bg-zinc-800/50 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition" title="Toggle Font">
                                <Type className="w-4 h-4" />
                             </button>
                             <button onClick={(e) => { e.stopPropagation(); setIsPinned(!isPinned); if (isPinned) setIsMinimized(false); }} className={cn("p-2 rounded-lg transition", isPinned ? "bg-yellow-500 text-black shadow-sm" : "bg-stone-200/60 dark:bg-zinc-800/50 hover:bg-black/10 dark:hover:bg-white/10")} title={isPinned ? "Unpin" : "Pin"}>
                                {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                             </button>
                             {isPinned && (
                                 <button onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }} className="p-2 bg-stone-200/60 dark:bg-zinc-800/50 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition" title="Minimize">
                                     <Minimize2 className="w-4 h-4" />
                                 </button>
                             )}
                         </div>
                      </div>
                      <div className="markdown-body opacity-95">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{deepExplanation}</ReactMarkdown>
                      </div>
                    </>
                 )}
               </div>
             )}
        </div>

        {/* Buttons now ALWAYS SHOW on both front and back sides */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 border-t border-amber-600/20 dark:border-amber-500/30 pt-4 mt-2">
          <div className="flex justify-center gap-8">
            <button onClick={() => handleMark(false)} title="Chưa thuộc (Đánh dấu X)" className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition shadow-sm hover:scale-105 active:scale-95">
              <X className="w-8 h-8" />
            </button>
            <button onClick={() => handleMark(true)} title="Đã thuộc (Đánh dấu Check)" className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-white transition shadow-sm hover:scale-105 active:scale-95">
              <Check className="w-8 h-8" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
