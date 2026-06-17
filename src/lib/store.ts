import { v4 as uuidv4 } from "uuid";

export type Role = "student" | "teacher";

export interface User {
  id: string;
  name: string;
  password?: string;
  role: Role;
  points: number; // For weekly ranking
  streak?: number;
  lastActiveDate?: string;
  streakFreeze?: boolean;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  subject: string;
  mastery: number; // 0 to 100
  nextReview: number; // timestamp
  isHard: boolean; 
}

export interface ReviewRecord {
  id: string;
  userId: string;
  cardId: string;
  deckTitle: string;
  front: string;
  remembered: boolean;
  masteryChange: number;
  timestamp: number;
}

export interface Deck {
  id: string;
  title: string;
  subject: string;
  cards: Flashcard[];
}

export interface StudyGroup {
  id: string;
  name: string;
  members: string[]; // user ids
}

let users: User[] = [
  { id: "student_1", name: "Marcus", password: "123", role: "student", points: 42, streak: 5, lastActiveDate: new Date().toISOString().split('T')[0] },
  { id: "student_2", name: "Seneca", password: "123", role: "student", points: 28, streak: 2, lastActiveDate: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
  { id: "student_3", name: "Epictetus", password: "123", role: "student", points: 89, streak: 12, lastActiveDate: new Date().toISOString().split('T')[0] },
  { id: "student_4", name: "Aurelius", password: "123", role: "student", points: 55, streak: 4, lastActiveDate: new Date().toISOString().split('T')[0] },
  { id: "student_5", name: "Zeno", password: "123", role: "student", points: 15, streak: 1, lastActiveDate: new Date().toISOString().split('T')[0] },
  { id: "student_6", name: "Cleanthes", password: "123", role: "student", points: 120, streak: 21, lastActiveDate: new Date().toISOString().split('T')[0] },
  { id: "student_7", name: "Chrysippus", password: "123", role: "student", points: 76, streak: 8, lastActiveDate: new Date().toISOString().split('T')[0] },
];

let currentUser: User | null = null;
let reviewHistory: ReviewRecord[] = [];

let decks: Deck[] = [
  {
    id: "deck_1",
    title: "Stoicism 101",
    subject: "philosophy",
    cards: [
      { id: "card_1", front: "Amor Fati", back: "Love of fate. Welcoming whatever happens.", subject: "philosophy", mastery: 40, nextReview: Date.now() - 10000, isHard: true },
      { id: "card_2", front: "Memento Mori", back: "Remember that you must die.", subject: "philosophy", mastery: 80, nextReview: Date.now() + 86400000, isHard: false },
      { id: "card_3", front: "Eudaimonia", back: "A life well lived; flourishing.", subject: "philosophy", mastery: 20, nextReview: Date.now() - 50000, isHard: true },
      { id: "card_4", front: "Prohairesis", back: "Moral character / the faculty of choice.", subject: "philosophy", mastery: 60, nextReview: Date.now() + 3600000, isHard: false },
    ]
  },
  {
    id: "deck_2",
    title: "History of Rome",
    subject: "history",
    cards: [
      { id: "card_5", front: "Who was the first Roman Emperor?", back: "Augustus Caesar", subject: "history", mastery: 90, nextReview: Date.now() + 86400000*2, isHard: false },
      { id: "card_6", front: "In what year did the Western Roman Empire fall?", back: "476 AD", subject: "history", mastery: 50, nextReview: Date.now() - 2000, isHard: true },
      { id: "card_7", front: "Who crossed the Rubicon?", back: "Julius Caesar", subject: "history", mastery: 100, nextReview: Date.now() + 86400000*5, isHard: false },
    ]
  },
  {
    id: "deck_3",
    title: "Basic Physics",
    subject: "science",
    cards: [
      { id: "card_8", front: "Newton's First Law", back: "An object at rest stays at rest and an object in motion stays in motion with the same speed and in the same direction unless acted upon by an unbalanced force.", subject: "science", mastery: 10, nextReview: Date.now() - 100000, isHard: true },
      { id: "card_9", front: "Formula for Force", back: "F = ma", subject: "science", mastery: 100, nextReview: Date.now() + 86400000*3, isHard: false },
    ]
  }
];

let groups: StudyGroup[] = [
  { id: "group_1", name: "Roman Scholars", members: ["student_1", "student_2", "student_4"] },
  { id: "group_2", name: "Physics Masters", members: ["student_3", "student_6", "student_7"] },
  { id: "group_3", name: "Stoic Circle", members: ["student_1", "student_3", "student_5", "student_7"] },
];

const checkAndResetWeeklyPoints = () => {
  const lastResetStr = localStorage.getItem("lastWeeklyReset");
  const now = Date.now();
  if (!lastResetStr) {
    localStorage.setItem("lastWeeklyReset", now.toString());
    return;
  }
  
  const lastReset = parseInt(lastResetStr, 10);
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  
  if (now - lastReset > SEVEN_DAYS) {
    // Reset points
    users.forEach(u => u.points = 0);
    if (currentUser) currentUser.points = 0;
    localStorage.setItem("lastWeeklyReset", now.toString());
    console.log("Weekly points have been reset to 0.");
  }
};

checkAndResetWeeklyPoints();

const updateStreak = (user: User) => {
  const today = new Date().toISOString().split('T')[0];
  if (user.lastActiveDate === today) {
    return;
  }
  if (user.lastActiveDate) {
    const lastActive = new Date(user.lastActiveDate);
    const current = new Date(today);
    const diffDays = Math.round(Math.abs(current.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      user.streak = (user.streak || 0) + 1;
    } else if (diffDays === 2 && user.streakFreeze) {
      user.streakFreeze = false;
      // Streak maintained, not reset, not increased
    } else if (diffDays > 1) {
      user.streak = 1;
    }
  } else {
    user.streak = 1;
  }
  user.lastActiveDate = today;
};

export const store = {
  getUsers: () => users,
  getCurrentUser: () => {
    if (currentUser) updateStreak(currentUser);
    return currentUser;
  },
  logout: () => { currentUser = null; },
  signup: (name: string, password: string, adminKey?: string) => {
    if (users.find(x => x.name === name)) return null; // already exists
    
    let role: Role = "student";
    const correctAdminKey = (import.meta as any).env?.VITE_ADMIN_KEY || "seneca";
    if (adminKey && adminKey === correctAdminKey) {
       role = "teacher";
    }

    const u: User = { id: `user_${uuidv4()}`, name, password, role, points: 0, streak: 1, lastActiveDate: new Date().toISOString().split('T')[0] };
    users.push(u);
    currentUser = u;
    return u;
  },
  login: (name: string, password?: string, adminKey?: string) => {
    let u = users.find(x => x.name === name);
    
    // For Preview logic where we just auto-login or create transient guest
    if (!password && !u) {
      u = { id: `user_${uuidv4()}`, name, role: "student", points: 0, streak: 1, lastActiveDate: new Date().toISOString().split('T')[0] };
      users.push(u);
    } else if (u && password && u.password !== password) {
      return null; // invalid password
    }

    if (u) {
       // if they provided correct admin key, upgrade them
       const correctAdminKey = (import.meta as any).env?.VITE_ADMIN_KEY || "seneca";
       if (adminKey && adminKey === correctAdminKey) {
          u.role = "teacher";
       }
       currentUser = u;
    }
    
    return u;
  },
  getDecks: () => decks,
  getDeck: (id: string) => decks.find(d => d.id === id),
  addDeck: (deck: Deck) => { decks.push(deck); },
  buyStreakFreeze: () => {
    if (currentUser && currentUser.points >= 50 && !currentUser.streakFreeze) {
      currentUser.points -= 50;
      currentUser.streakFreeze = true;
      return true;
    }
    return false;
  },
  addBonusPoints: (points: number) => {
    if (currentUser && currentUser.role === "student") {
        currentUser.points += points;
    }
  },
  updateCardMastery: (deckId: string, cardId: string, remembered: boolean) => {
     const deck = decks.find(d => d.id === deckId);
     if (!deck) return;
     const card = deck.cards.find(c => c.id === cardId);
     if (!card) return;

     const oldMastery = card.mastery;

     if (remembered) {
         card.mastery = Math.min(100, card.mastery + 20);
         card.nextReview = Date.now() + 86400000; // +1 day
         card.isHard = false;
         if (currentUser && currentUser.role === "student") {
             currentUser.points += 1;
         }
     } else {
         card.mastery = Math.max(0, card.mastery - 20);
         card.nextReview = Date.now() + 60000; // +1 min
         card.isHard = true;
     }

     const masteryChange = card.mastery - oldMastery;

     if (currentUser && currentUser.role === "student") {
         const today = new Date().toISOString().split('T')[0];
         const key = `daily_reviewed_${currentUser.id}_${today}`;
         const currentReviewed = parseInt(localStorage.getItem(key) || "0", 10);
         localStorage.setItem(key, (currentReviewed + 1).toString());

         reviewHistory.push({
           id: uuidv4(),
           userId: currentUser.id,
           cardId: card.id,
           deckTitle: deck.title,
           front: card.front,
           remembered,
           masteryChange,
           timestamp: Date.now()
         });
     }
  },
  getReviewHistory: (userId: string) => {
     return reviewHistory.filter(r => r.userId === userId).sort((a, b) => b.timestamp - a.timestamp);
  },
  getGroups: () => groups,
  updateCard: (deckId: string, cardId: string, front: string, back: string) => {
     const deck = decks.find(d => d.id === deckId);
     if (!deck) return;
     const card = deck.cards.find(c => c.id === cardId);
     if (!card) return;
     card.front = front;
     card.back = back;
  },
  createGroup: (name: string) => {
    let g = { id: `grp_${uuidv4().substring(0, 8)}`, name, members: currentUser ? [currentUser.id] : [] };
    groups.push(g);
    return g;
  },
  joinGroup: (id: string) => {
    let g = groups.find(x => x.id === id);
    if (g && currentUser && !g.members.includes(currentUser.id)) {
      g.members.push(currentUser.id);
    }
    return g;
  }
};
