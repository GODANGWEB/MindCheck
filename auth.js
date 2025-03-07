// ไฟล์ auth.js - จัดการการลงทะเบียนและเข้าสู่ระบบ

// เลือกองค์ประกอบ DOM
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const switchToRegister = document.getElementById('switch-to-register');
const switchToLogin = document.getElementById('switch-to-login');
const authCard = document.getElementById('auth-card');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const dashboard = document.getElementById('dashboard');
const logoutBtn = document.getElementById('logout-btn');
const userName = document.getElementById('user-name');

// สลับไปยังหน้าลงทะเบียน
switchToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    switchToRegister.style.display = 'none';
    switchToLogin.style.display = 'block';
    authTitle.textContent = 'ลงทะเบียน';
    authSubtitle.textContent = 'สร้างบัญชีเพื่อเริ่มการติดตามสุขภาพจิตของคุณ';
});

// สลับไปยังหน้าเข้าสู่ระบบ
switchToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    switchToLogin.style.display = 'none';
    switchToRegister.style.display = 'block';
    authTitle.textContent = 'เข้าสู่ระบบ';
    authSubtitle.textContent = 'เข้าสู่ระบบเพื่อติดตามสุขภาพจิตของคุณ';
});

// จัดการการลงทะเบียน
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    
    // ตรวจสอบรหัสผ่านที่ตรงกัน
    if (password !== confirmPassword) {
        alert('รหัสผ่านไม่ตรงกัน โปรดลองอีกครั้ง');
        return;
    }
    
    // สร้างบัญชีด้วย Firebase Auth
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // สร้างโปรไฟล์ผู้ใช้ใน Firestore
            return db.collection('users').doc(userCredential.user.uid).set({
                name: name,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            registerForm.reset();
            // จะเปลี่ยนไปยังหน้าแดชบอร์ดโดยอัตโนมัติผ่าน auth state listener
        })
        .catch((error) => {
            console.error('Error during registration:', error);
            alert(`เกิดข้อผิดพลาดในการลงทะเบียน: ${error.message}`);
        });
});

// จัดการการเข้าสู่ระบบ
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            loginForm.reset();
            // จะเปลี่ยนไปยังหน้าแดชบอร์ดโดยอัตโนมัติผ่าน auth state listener
        })
        .catch((error) => {
            console.error('Error during login:', error);
            alert(`เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ${error.message}`);
        });
});

// จัดการการออกจากระบบ
logoutBtn.addEventListener('click', () => {
    auth.signOut()
        .then(() => {
            // จะเปลี่ยนไปยังหน้าล็อกอินโดยอัตโนมัติผ่าน auth state listener
        })
        .catch((error) => {
            console.error('Error during logout:', error);
            alert(`เกิดข้อผิดพลาดในการออกจากระบบ: ${error.message}`);
        });
});

// ติดตามสถานะการเข้าสู่ระบบ
auth.onAuthStateChanged((user) => {
    if (user) {
        // ผู้ใช้เข้าสู่ระบบแล้ว
        authCard.style.display = 'none';
        dashboard.style.display = 'block';
        
        // ดึงข้อมูลผู้ใช้จาก Firestore
        db.collection('users').doc(user.uid).get()
            .then((doc) => {
                if (doc.exists) {
                    userName.textContent = `ยินดีต้อนรับ, ${doc.data().name}`;
                } else {
                    userName.textContent = `ยินดีต้อนรับ`;
                }
            })
            .catch((error) => {
                console.error('Error getting user data:', error);
            });
            
        // โหลดข้อมูลเช็คอินอารมณ์
        loadMoodHistory(user.uid);
    } else {
        // ผู้ใช้ยังไม่ได้เข้าสู่ระบบ
        dashboard.style.display = 'none';
        authCard.style.display = 'block';
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        switchToLogin.style.display = 'none';
        switchToRegister.style.display = 'block';
        
        // รีเซ็ตฟอร์ม
        loginForm.reset();
        registerForm.reset();
    }
});
// ตรวจสอบอีเมล
document.getElementById('email').addEventListener('input', () => {
    const email = document.getElementById('email').value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailError = document.getElementById('email-error');
    if (!emailRegex.test(email)) {
        emailError.style.display = 'block';
    } else {
        emailError.style.display = 'none';
    }
});

// ตรวจสอบรหัสผ่าน
document.getElementById('password').addEventListener('input', () => {
    const password = document.getElementById('password').value;
    const passwordError = document.getElementById('password-error');
    if (password.length < 6) {
        passwordError.style.display = 'block';
    } else {
        passwordError.style.display = 'none';
    }
});
// จัดการการลงทะเบียน
registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    
    const name = document.getElementById("reg-name").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            return db.collection("users").doc(userCredential.user.uid).set({
                name: name,
                email: email,
                points: 0, // กำหนดคะแนนเริ่มต้น
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            registerForm.reset();
        })
        .catch((error) => {
            console.error("Error during registration:", error);
            alert(`เกิดข้อผิดพลาดในการลงทะเบียน: ${error.message}`);
        });
});
