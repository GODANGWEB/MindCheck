// ไฟล์ firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyCFxBhQdtJ_u1LrUOxwpyBz6NLtnmjDwS0",
  authDomain: "hackathon-track-me.firebaseapp.com",
  projectId: "hackathon-track-me",
  storageBucket: "hackathon-track-me.firebasestorage.app",
  messagingSenderId: "671506635653",
  appId: "1:671506635653:web:e2ced20e05eeec779402ec",
  measurementId: "G-WVEBJF4YKE"
};

// กำหนดค่า Firebase
firebase.initializeApp(firebaseConfig);

// สร้างอ้างอิงสำหรับ Firebase Auth และ Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// ตั้งค่า Firestore ให้ทำงานในโหมดทดสอบ (test mode) ชั่วคราว
// ข้อควรระวัง: ในโหมดนี้จะยอมให้อ่าน/เขียนข้อมูลได้โดยไม่มีการตรวจสอบสิทธิ์
// ใช้เพื่อทดสอบเท่านั้น ไม่ควรใช้ในระบบจริง
db.settings({
  ignoreUndefinedProperties: true
}, { merge: true }); // ✅ เพิ่ม { merge: true }

// ตั้งค่า Persistence เพื่อให้ทำงานแม้ขณะออฟไลน์
db.enablePersistence({ synchronizeTabs: true })
  .catch((err) => {
    console.error("Firestore persistence error:", err);
  });

  

  