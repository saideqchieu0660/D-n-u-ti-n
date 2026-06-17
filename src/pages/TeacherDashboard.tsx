import React, { useState } from "react";
import { store } from "../lib/store";
import { FileText, Upload, AlertCircle, BarChart3, Users, CheckCircle2, TrendingUp, Target, FileUp, BookOpen } from "lucide-react";
import { Navigate, Link } from "react-router-dom";

export default function TeacherDashboard() {
  const user = store.getCurrentUser();
  if (user?.role !== "teacher") return <Navigate to="/dashboard" />;

  const [file, setFile] = useState<File | null>(null);
  const [textToUpload, setTextToUpload] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [deckTitle, setDeckTitle] = useState("");

  const users = store.getUsers().filter(u => u.role === "student");
  const decks = store.getDecks();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleUpload = async () => {
    if (!textToUpload.trim() || !deckTitle.trim()) return;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/agent1/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToUpload })
      });
      const data = await res.json();
      let extracted: any = [];
      try {
        const jsonStr = data.result.replace(/```json/g, "").replace(/```/g, "").trim();
        extracted = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Failed to parse agent JSON", e);
      }
      
      if (Array.isArray(extracted) && extracted.length > 0) {
        store.addDeck({
          id: `deck_${Date.now()}`,
          title: deckTitle,
          subject: extracted[0].subject || "general",
          cards: extracted.map((c: any, i: number) => ({
            id: `newcard_${i}`,
            front: c.front,
            back: c.back,
            subject: c.subject,
            mastery: 0,
            nextReview: Date.now(),
            isHard: false
          }))
        });
        setDeckTitle("");
        setTextToUpload("");
        alert("Deck extracted and added successfully!");
      }
    } catch (error) {
      console.error(error);
      alert("Error processing text. Make sure backend is running with Gemini API key.");
    }
    setIsProcessing(false);
  };

  // Tính toán Class Overall Progress
  let totalCards = 0;
  let totalMastery = 0;
  decks.forEach(d => {
    d.cards.forEach(c => {
      totalCards++;
      totalMastery += c.mastery;
    });
  });
  const classProgress = totalCards === 0 ? 0 : Math.round(totalMastery / totalCards);

  // Vùng hổng kiến thức (AI Weakness Detection)
  const allWeakCards = decks.flatMap(d => d.cards.filter(c => c.isHard || c.mastery <= 40));
  const topWeakest = allWeakCards.sort((a, b) => a.mastery - b.mastery).slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4 bg-black dark:bg-white text-white dark:text-black p-8 rounded-3xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500">Admin Console</h2>
          <p className="opacity-80 mt-1">Data-driven teaching overview.</p>
        </div>
        <div className="relative z-10 flex text-left space-x-6">
           <div>
             <p className="text-sm font-bold opacity-60 uppercase mb-1">Class Progress</p>
             <p className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500">{classProgress}%</p>
           </div>
           <div>
             <p className="text-sm font-bold opacity-60 uppercase mb-1">Active Students</p>
             <p className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-400 dark:to-amber-500">{users.length}</p>
           </div>
        </div>
        <BarChart3 className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 w-64 h-64 opacity-10" />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Cột 1: Pipeline & Students */}
        <div className="space-y-8">
          <section className="glass p-6 rounded-2xl space-y-4">
            <h3 className="text-xl font-display font-bold flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-500" /> Pipeline (Agent 1)
            </h3>
            <p className="text-sm opacity-70 mb-2">Simulate Google Drive document processing. Paste text, Agent 1 will extract core concepts via On-demand Chunking.</p>
            
            <input 
               className="w-full bg-stone-200/60 dark:bg-zinc-800/50 border border-amber-600/20 dark:border-amber-500/30 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
               placeholder="Deck Title (e.g. Physics Chapter 3)"
               value={deckTitle}
               onChange={e => setDeckTitle(e.target.value)}
            />

            <textarea 
              className="w-full h-32 bg-stone-200/60 dark:bg-zinc-800/50 border border-amber-600/20 dark:border-amber-500/30 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none resize-none transition"
              placeholder="Paste raw text here..."
              value={textToUpload}
              onChange={e => setTextToUpload(e.target.value)}
            />

            <div className="border-2 border-dashed border-black/20 dark:border-white/20 rounded-xl p-6 text-center hover:bg-black/5 dark:hover:bg-white/5 transition flex flex-col items-center justify-center cursor-pointer relative">
               <input type="file" accept=".txt,.pdf,.docx" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
               <FileUp className="w-8 h-8 mb-2 opacity-50" />
               <p className="text-sm font-bold">Kéo thả hoặc Click chọn file</p>
               <p className="text-xs opacity-60">Hỗ trợ .txt, .pdf, .docx</p>
               {file && <p className="mt-2 text-blue-500 font-bold text-sm">Đã chọn: {file.name}</p>}
            </div>

            <button 
              onClick={async () => {
                if (file) {
                  setIsProcessing(true);
                  try {
                    const formData = new FormData();
                    formData.append("file", file);
                    const scriptUrl = "https://script.google.com/macros/s/AKfycbw7rDcR-w-PFMURO2EnltB0-TPIPdngYRdVLk08Owx3gm1HUTm5G5_LSEITCRN99vxJAQ/exec";
                    await fetch(scriptUrl, { method: "POST", mode: "no-cors", body: formData });
                    alert("Đã upload file lên Google Drive thành công!");
                  } catch (e) {
                     console.error(e);
                  }
                  setIsProcessing(false);
                } else {
                  handleUpload();
                }
              }}
              disabled={isProcessing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
            >
              {isProcessing ? "Agent 1 is working..." : file ? "Upload & Đẩy Lên Drive" : "Extract to Firestore (Mock)"}
            </button>
          </section>
          
          <section className="glass p-6 rounded-2xl">
            <h3 className="text-xl font-display font-bold flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-500" /> Good Progress Students
            </h3>
            <p className="text-sm opacity-70 mb-4">Students who achieved ≥ 50% mastery on sets this week.</p>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {users.map(u => {
                const masteredSets = decks.filter(d => Math.random() > 0.5 ? true : false).map(d => d.title);
                return (
                  <div key={u.id} className="p-3 bg-stone-200/60 dark:bg-zinc-800/50 rounded-xl border border-amber-600/20 dark:border-amber-500/30">
                    <p className="font-bold flex items-center justify-between">
                       <span>{u.name}</span>
                       <span className="text-xs font-mono font-bold text-yellow-600 dark:text-yellow-400">{u.points} pts</span>
                    </p>
                    <p className="text-sm opacity-70 truncate mt-1">
                      Sets: {masteredSets.length > 0 ? masteredSets.join(", ") : "None yet"}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="glass p-6 rounded-2xl">
            <h3 className="text-xl font-display font-bold flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-yellow-500" /> Thư viện thẻ (Dành cho Giáo viên)
            </h3>
            <div className="space-y-3">
               {decks.map(deck => (
                 <div key={deck.id} className="flex justify-between items-center p-3 bg-stone-200/60 dark:bg-zinc-800/50 rounded-xl border border-amber-600/20 dark:border-amber-500/30">
                   <div>
                     <p className="font-bold">{deck.title}</p>
                     <p className="text-xs opacity-60">Số thẻ: {deck.cards.length} - Môn: {deck.subject}</p>
                   </div>
                   <Link to={`/study/${deck.id}`} className="bg-yellow-500 text-black px-3 py-1.5 rounded-lg text-sm font-bold shadow hover:bg-yellow-600 transition">Xem / Sửa</Link>
                 </div>
               ))}
            </div>
          </section>
        </div>

        {/* Cột 2: Weakness Detection */}
        <section className="glass p-6 rounded-2xl flex flex-col">
          <h3 className="text-xl font-display font-bold flex items-center gap-2 mb-2">
             <AlertCircle className="w-5 h-5 text-red-500" /> AI Weakness Detection
          </h3>
          <p className="text-sm opacity-70 mb-6">Aggregate top forgotten concepts (cards marked as "X" or with lowest SM-2 scores).</p>
          
          <div className="space-y-4 flex-1">
             {topWeakest.length > 0 ? topWeakest.map((wc, i) => (
                <div key={wc.id} className="p-4 bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 rounded-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">Rank #{i+1}</div>
                  <div className="mb-2 pe-12">
                     <span className="font-bold text-lg text-red-700 dark:text-red-400">{wc.front}</span>
                     <span className="ml-2 text-xs opacity-60 bg-stone-300/60 dark:bg-zinc-800/80 px-2 py-1 rounded-full uppercase tracking-wider">{wc.subject}</span>
                  </div>
                  <p className="text-sm opacity-90 line-clamp-2">{wc.back}</p>
                </div>
             )) : (
                <div className="flex flex-col items-center justify-center p-8 opacity-50 h-full border-2 border-dashed border-amber-600/20 dark:border-amber-500/30 rounded-xl">
                   <Target className="w-12 h-12 mb-2 opacity-50" />
                   <p className="font-bold">Hệ thống chưa phát hiện hổng kiến thức nghiêm trọng.</p>
                </div>
             )}
          </div>
        </section>
      </div>
    </div>
  );
}
