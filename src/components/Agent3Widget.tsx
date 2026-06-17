import React, { useState, useRef, useEffect } from "react";
import { store } from "../lib/store";
import { MessageCircle, X, Send, Bot, CheckCircle } from "lucide-react";
import { cn } from "../lib/utils";
import ReactMarkdown from "react-markdown";

export default function Agent3Widget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: "user"|"ai", text: string}[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [quizData, setQuizData] = useState<any>(null); // For MCQ

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, quizData]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    // Cooldown logic can be added here
    setMessages(prev => [...prev, { role: "user", text: input }]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      // Find current context
      const decks = store.getDecks();
      // simplified hidden context
      const context = "Student is studying. Deck info available.";

      if (currentInput.trim().toLowerCase().startsWith("/quiz")) {
        const difficulty = currentInput.trim().toLowerCase().replace("/quiz", "").trim() || "medium";
        
        // Collect 15 most weak cards
        let allWeak: any[] = [];
        decks.forEach(d => {
          allWeak = allWeak.concat(d.cards.filter(c => c.isHard || c.mastery < 50));
        });
        const top15 = allWeak.sort((a,b) => a.mastery - b.mastery).slice(0, 15);

        const res = await fetch("/api/agent3/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: currentInput, context, mode: "quiz", mcqData: top15, difficulty })
        });
        const data = await res.json();
        const jsonStr = data.result.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
        const parsed = JSON.parse(jsonStr);
        setQuizData(parsed);
      } else {
        const res = await fetch("/api/agent3/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: currentInput, context, mode: "chat" })
        });
        const data = await res.json();
        setMessages(prev => [...prev, { role: "ai", text: data.result }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "ai", text: "Tín hiệu bị nhiễu do bão mặt trời (Error 500). Vui lòng thử lại." }]);
    }
    setIsLoading(false);
  };

  const QuizRenderer = () => {
    const [currentQ, setCurrentQ] = useState(0);
    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);
    const [selected, setSelected] = useState<number | null>(null);
    const [showAnswer, setShowAnswer] = useState(false);

    if (!quizData || !Array.isArray(quizData) || quizData.length === 0) return null;

    if (finished) {
       return (
         <div className="p-4 bg-yellow-500/10 rounded-xl text-center space-y-2 mt-4">
           <h4 className="font-bold">Quiz Complete</h4>
           <p className="text-2xl font-display text-yellow-500">{score} / {quizData.length}</p>
           <button onClick={() => setQuizData(null)} className="text-sm underline opacity-70">Close Quiz</button>
         </div>
       );
    }

    const q = quizData[currentQ];

    const handleAnswer = (idx: number) => {
      setSelected(idx);
      setShowAnswer(true);
      if (idx === q.correctIndex) setScore(s => s + 1);
      
      setTimeout(() => {
        setShowAnswer(false);
        setSelected(null);
        if (currentQ + 1 < quizData.length) setCurrentQ(currentQ + 1);
        else setFinished(true);
      }, 2500);
    };

    return (
      <div className="p-4 bg-black/5 dark:bg-white/5 rounded-xl mt-4 border border-yellow-500/20">
        <div className="flex justify-between items-center text-xs opacity-50 mb-2">
           <span>Q: {currentQ + 1}/{quizData.length}</span>
           <span>Score: {score}</span>
        </div>
        <p className="font-bold mb-4">{q.question}</p>
        <div className="space-y-2">
           {q.options.map((opt: string, i: number) => {
             let bg = "bg-black/10 dark:bg-white/10";
             if (showAnswer) {
               if (i === q.correctIndex) bg = "bg-green-500 text-white";
               else if (i === selected) bg = "bg-red-500 text-white";
             }
             return (
               <button 
                 key={i} 
                 disabled={showAnswer}
                 onClick={() => handleAnswer(i)}
                 className={cn("w-full text-left p-2 rounded-lg text-sm transition", bg, !showAnswer && "hover:bg-yellow-500/20")}
               >
                 {opt}
               </button>
             );
           })}
        </div>
        {showAnswer && (
          <p className="mt-4 text-xs opacity-80 italic animate-in fade-in">
             💡 {q.explanation}
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-6 w-14 h-14 bg-yellow-500 text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition z-50 group"
        >
          <Bot className="w-6 h-6 group-hover:animate-bounce" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[350px] h-[500px] glass flex flex-col rounded-2xl overflow-hidden shadow-2xl z-50 animate-in slide-in-from-bottom-6">
          <div className="bg-yellow-500 text-black p-4 flex justify-between items-center">
             <div className="flex items-center gap-2">
               <Bot className="w-5 h-5" />
               <h3 className="font-bold tracking-tight">Agent 3 - Socratic Coach</h3>
             </div>
             <button onClick={() => setIsOpen(false)} className="hover:bg-black/10 p-1 rounded-full transition"><X className="w-4 h-4" /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             <div className="bg-black/10 dark:bg-white/10 p-3 rounded-xl rounded-tl-none w-fit max-w-[85%] text-sm">
                Chào bạn. Mình là Gia sư Socratic. Gõ `/quiz easy`, `/quiz medium`, hoặc `/quiz hard` để mình xếp bài test những phần bạn yếu nhé.
             </div>
             
             {messages.map((m, i) => (
                <div key={i} className={cn("text-sm p-3 rounded-xl max-w-[85%] break-words", m.role === "user" ? "bg-yellow-500/20 ml-auto rounded-tr-none" : "bg-black/10 dark:bg-white/10 rounded-tl-none")}>
                   <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
             ))}
             
             {quizData && <QuizRenderer />}
             
             {isLoading && (
                <div className="bg-black/10 dark:bg-white/10 p-3 rounded-xl rounded-tl-none w-fit">
                   <div className="flex gap-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                   </div>
                </div>
             )}
             <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
            <div className="flex gap-2">
              <input 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="Ask Socrates... (/quiz, /quiz easy, /quiz hard)"
                className="flex-1 bg-transparent border-none focus:outline-none text-sm px-2"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="p-2 bg-yellow-500 text-black rounded-lg disabled:opacity-50 hover:bg-yellow-600 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
