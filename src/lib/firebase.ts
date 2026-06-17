import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

// Cấu hình Firebase
// Hãy điền các thông số apiKey, projectId vào file .env theo định dạng VITE_FIREBASE_API_KEY...
const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSy_YOUR_API_KEY",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "your-project",
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Hàm tạo nhóm tự sinh ID ngẫu nhiên bằng Firestore (Cách 1)
export async function createLearningGroup(groupName: string, userId: string = "id_user_cua_may") {
  try {
    const docRef = await addDoc(collection(db, "groups"), {
      groupName: groupName,
      createdAt: Date.now(),
      createdBy: userId
    });
    
    // Hệ thống tự cấp cái ID ngẫu nhiên nằm ở docRef.id ni nầy
    console.log("Tạo nhóm ngon lành! ID Firebase cấp: ", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Lỗi rồi cu ơi: ", e);
    return null;
  }
}
