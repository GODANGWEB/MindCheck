// เลือกองค์ประกอบ DOM
const moodOptions = document.querySelectorAll('.mood-option');
const checkInBtn = document.getElementById('check-in-btn');
const notesInput = document.getElementById('notes');
const historyEntries = document.getElementById('history-entries');
const chartContainer = document.getElementById('chart-container');

// ตัวแปรกลอบอล
let selectedMood = null;
let moodChart = null;
let allMoodEntries = []; // เก็บข้อมูลทั้งหมด
let currentPage = 1;
let entriesPerPage = 3;
let selectedMonth = 'all'; // สำหรับตัวกรองเดือน

// การเลือกอารมณ์
moodOptions.forEach(option => {
    option.addEventListener('click', () => {
        // ลบคลาสที่เลือกก่อนหน้านี้
        moodOptions.forEach(opt => opt.classList.remove('selected'));
        // เพิ่มคลาสที่เลือกให้กับตัวเลือกปัจจุบัน
        option.classList.add('selected');
        // บันทึกอารมณ์ที่เลือก
        selectedMood = option.getAttribute('data-mood');
    });
});

// บันทึกการเช็คอิน
checkInBtn.addEventListener('click', () => {
    if (!selectedMood) {
        alert('โปรดเลือกอารมณ์ของคุณก่อนบันทึก');
        return;
    }
    
    const user = auth.currentUser;
    if (!user) {
        alert('โปรดเข้าสู่ระบบก่อนบันทึกการเช็คอิน');
        return;
    }
    
    // สร้างข้อมูลการเช็คอิน
    const checkInData = {
        mood: selectedMood,
        notes: notesInput.value.trim(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // บันทึกลง Firestore
    db.collection('users').doc(user.uid)
      .collection('moodEntries')
      .add(checkInData)
      .then(() => {
          // รีเซ็ตฟอร์ม
          moodOptions.forEach(opt => opt.classList.remove('selected'));
          notesInput.value = '';
          selectedMood = null;
          // โหลดข้อมูลประวัติใหม่
          loadMoodHistory(user.uid);
      })
      .catch((error) => {
          console.error('Error adding check-in:', error);
          alert(`เกิดข้อผิดพลาดในการบันทึกการเช็คอิน: ${error.message}`);
      });
});


// โหลดประวัติการเช็คอินอารมณ์
function loadMoodHistory(userId) {
    db.collection('users').doc(userId)
      .collection('moodEntries')
      .orderBy('timestamp', 'desc')
      .get()
      .then((querySnapshot) => {
          // ล้างตัวแปรกลอบอล
          allMoodEntries = [];
          currentPage = 1;
          
          if (querySnapshot.empty) {
              showNoEntriesMessage();
              return;
          }
          
          querySnapshot.forEach((doc) => {
              const data = doc.data();
              const entry = {
                  id: doc.id,
                  mood: data.mood,
                  notes: data.notes,
                  timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
              };
              allMoodEntries.push(entry);
          });
          
          // อัปเดตตัวกรองเดือน
          createMonthFilter();
          
          // กรองและแสดงข้อมูล
          filterAndDisplayEntries();
      })
      .catch((error) => {
          console.error('Error getting mood history:', error);
          historyEntries.innerHTML = '<p class="text-center">เกิดข้อผิดพลาดในการโหลดประวัติ</p>';
      });
}

// สร้างตัวกรองเดือน
// แก้ไขฟังก์ชัน createMonthFilter
function createMonthFilter() {
    // ลบตัวกรองเดือนเดิมถ้ามีอยู่
    const existingFilter = document.querySelector('.month-filter');
    if (existingFilter) {
        existingFilter.parentNode.removeChild(existingFilter);
    }
    
    // สร้างตัวเลือกเดือนจากข้อมูลที่มี
    const months = {};
    
    allMoodEntries.forEach(entry => {
        const date = new Date(entry.timestamp);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        const monthName = getThaiMonthName(date.getMonth());
        months[monthYear] = `${monthName} ${date.getFullYear()}`;
    });
    
    // สร้าง DOM สำหรับตัวกรอง
    let filterHTML = `
        <div class="month-filter">
            <label for="month-select">เลือกเดือน:</label>
            <select id="month-select">
                <option value="all">ทั้งหมด</option>
    `;
    
    Object.keys(months).forEach(key => {
        filterHTML += `<option value="${key}">${months[key]}</option>`;
    });
    
    filterHTML += `
            </select>
        </div>
    `;
    
    // เพิ่มตัวกรองก่อนรายการประวัติ
    const filterContainer = document.createElement('div');
    filterContainer.innerHTML = filterHTML;
    historyEntries.parentNode.insertBefore(filterContainer, historyEntries);
    
    // เพิ่ม event listener
    document.getElementById('month-select').addEventListener('change', function() {
        selectedMonth = this.value;
        currentPage = 1; // รีเซ็ตหน้าเมื่อเปลี่ยนตัวกรอง
        filterAndDisplayEntries();
    });
}

// แปลงเลขเดือนเป็นชื่อเดือนภาษาไทย
function getThaiMonthName(monthIndex) {
    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return thaiMonths[monthIndex];
}

// กรองและแสดงข้อมูล
function filterAndDisplayEntries() {
    // กรองตามเดือน
    let filteredEntries = allMoodEntries;
    
    if (selectedMonth !== 'all') {
        const [filterMonth, filterYear] = selectedMonth.split('/');
        filteredEntries = allMoodEntries.filter(entry => {
            const date = new Date(entry.timestamp);
            return (date.getMonth() + 1) == filterMonth && date.getFullYear() == filterYear;
        });
    }
    
    // คำนวณจำนวนหน้าทั้งหมด
    const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
    
    // ตรวจสอบหน้าปัจจุบัน
    if (currentPage > totalPages) {
        currentPage = totalPages > 0 ? totalPages : 1;
    }
    
    // คำนวณ start และ end index
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = Math.min(startIndex + entriesPerPage, filteredEntries.length);
    
    // แสดงรายการประวัติ
    historyEntries.innerHTML = '';
    
    if (filteredEntries.length === 0) {
        showNoEntriesMessage();
        return;
    }
    
    // แสดงรายการตามหน้าปัจจุบัน
    for (let i = startIndex; i < endIndex; i++) {
        createHistoryEntry(filteredEntries[i]);
    }
    
    // สร้างปุ่มนำทาง
    createPagination(filteredEntries.length, totalPages);
    
    // สร้างกราฟสำหรับข้อมูลที่กรอง
    createMoodChart(filteredEntries);
}

// แสดงข้อความเมื่อไม่มีรายการ
function showNoEntriesMessage() {
    historyEntries.innerHTML = '<p class="text-center">ไม่พบการบันทึกการเช็คอินในช่วงเวลาที่เลือก</p>';
    
    // สร้างกราฟว่าง
    if (moodChart) {
        moodChart.destroy();
        moodChart = null;
    }
    chartContainer.innerHTML = '<div class="no-data">ไม่มีข้อมูลสำหรับแสดงกราฟ</div>';
}

// สร้างการนำทางแบบแบ่งหน้า
function createPagination(totalEntries, totalPages) {
    if (totalPages <= 1) return;
    
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination';
    
    // สร้างข้อความแสดงจำนวนรายการ
    const infoSpan = document.createElement('span');
    infoSpan.className = 'pagination-info';
    infoSpan.textContent = `แสดง ${(currentPage - 1) * entriesPerPage + 1}-${Math.min(currentPage * entriesPerPage, totalEntries)} จาก ${totalEntries} รายการ`;
    paginationDiv.appendChild(infoSpan);
    
    // สร้างปุ่มนำทาง
    const buttonDiv = document.createElement('div');
    buttonDiv.className = 'pagination-buttons';
    
    // ปุ่มย้อนกลับ
    if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> ก่อนหน้า';
        prevBtn.addEventListener('click', () => {
            currentPage--;
            filterAndDisplayEntries();
        });
        buttonDiv.appendChild(prevBtn);
    }
    
    // ปุ่มหน้าถัดไป
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.innerHTML = 'ถัดไป <i class="fas fa-chevron-right"></i>';
        nextBtn.addEventListener('click', () => {
            currentPage++;
            filterAndDisplayEntries();
        });
        buttonDiv.appendChild(nextBtn);
    }
    
    paginationDiv.appendChild(buttonDiv);
    historyEntries.appendChild(paginationDiv);
}

// สร้างรายการประวัติ
function createHistoryEntry(entry) {
    const entryDiv = document.createElement('div');
    entryDiv.classList.add('history-entry');
    
    // กำหนดไอคอนตามอารมณ์
    let moodIcon, moodText;
    switch (entry.mood) {
        case 'great':
            moodIcon = 'fa-grin-stars';
            moodText = 'ดีมาก';
            break;
        case 'good':
            moodIcon = 'fa-smile';
            moodText = 'ดี';
            break;
        case 'okay':
            moodIcon = 'fa-meh';
            moodText = 'ปานกลาง';
            break;
        case 'bad':
            moodIcon = 'fa-frown';
            moodText = 'แย่';
            break;
        case 'terrible':
            moodIcon = 'fa-sad-tear';
            moodText = 'แย่มาก';
            break;
        default:
            moodIcon = 'fa-question-circle';
            moodText = 'ไม่ระบุ';
    }
    
    // จัดรูปแบบวันที่
    const date = new Date(entry.timestamp);
    const formattedDate = `${date.getDate()} ${getThaiMonthName(date.getMonth())} ${date.getFullYear()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')} น.`;
    
    entryDiv.innerHTML = `
        <div class="history-date">${formattedDate}</div>
        <div class="history-mood ${entry.mood}">
            <i class="fas ${moodIcon}"></i>
            <span>${moodText}</span>
        </div>
        ${entry.notes ? `<div class="history-note">${entry.notes}</div>` : ''}
    `;
    
    historyEntries.appendChild(entryDiv);
}

// สร้างกราฟแสดงอารมณ์
function createMoodChart(entries) {
    const labels = entries.map(entry => {
        const date = new Date(entry.timestamp);
        return `${date.getDate()}/${date.getMonth() + 1}`;
    }).reverse();

    const data = entries.map(entry => {
        switch (entry.mood) {
            case 'great': return 5;
            case 'good': return 4;
            case 'okay': return 3;
            case 'bad': return 2;
            case 'terrible': return 1;
            default: return 0;
        }
    }).reverse();

    const ctx = document.createElement('canvas');
    chartContainer.innerHTML = '';
    chartContainer.appendChild(ctx);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'อารมณ์',
                data: data,
                backgroundColor: 'rgba(92, 107, 192, 0.2)',
                borderColor: 'rgba(92, 107, 192, 1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            scales: {
                y: {
                    min: 0,
                    max: 5,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            switch (value) {
                                case 1: return 'แย่มาก';
                                case 2: return 'แย่';
                                case 3: return 'ปานกลาง';
                                case 4: return 'ดี';
                                case 5: return 'ดีมาก';
                            }
                        }
                    }
                }
            }
        }
    });
}

// เพิ่มการจัดการกับข้อมูลทรัพยากรช่วยเหลือ
document.querySelectorAll('.resource-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        // ในกรณีจริงควรมีการนำทางไปยังแหล่งข้อมูลที่เกี่ยวข้อง
        const resourceType = this.parentElement.querySelector('h3').textContent;
        alert(`ระบบ "${resourceType}" กำลังอยู่ในขั้นตอนพัฒนา`);
    });
});
document.addEventListener('DOMContentLoaded', function() {
    const toggleDarkMode = document.getElementById('dark-mode-toggle');
    const body = document.body;
    
    // Check for saved user preference
    if (localStorage.getItem('darkMode') === 'enabled') {
        enableDarkMode();
    }
    
    // Toggle dark mode
    toggleDarkMode.addEventListener('click', () => {
        if (body.classList.contains('dark-mode')) {
            disableDarkMode();
        } else {
            enableDarkMode();
        }
    });
    
    function enableDarkMode() {
        body.classList.add('dark-mode');
        toggleDarkMode.textContent = ' โหมดสว่าง';
        localStorage.setItem('darkMode', 'enabled');
        
        // Update chart colors if chart exists
        updateChartForDarkMode(true);
    }
    
    function disableDarkMode() {
        body.classList.remove('dark-mode');
        toggleDarkMode.textContent = ' โหมดมืด';
        localStorage.setItem('darkMode', 'disabled');
        
        // Update chart colors if chart exists
        updateChartForDarkMode(false);
    }
    
    // Function to update chart colors based on mode
    function updateChartForDarkMode(isDark) {
        if (window.moodChart) {
            const chartData = window.moodChart.data;
            
            if (isDark) {
                // Dark mode chart colors
                chartData.datasets[0].borderColor = 'rgba(121, 134, 203, 1)';
                chartData.datasets[0].backgroundColor = 'rgba(121, 134, 203, 0.2)';
            } else {
                // Light mode chart colors
                chartData.datasets[0].borderColor = 'rgba(92, 107, 192, 1)';
                chartData.datasets[0].backgroundColor = 'rgba(92, 107, 192, 0.2)';
            }
            
            window.moodChart.update();
        }
    }
    
    // Add a smooth transition effect when switching modes
    toggleDarkMode.addEventListener('mousedown', function() {
        this.style.transform = 'scale(0.95)';
    });
    
    toggleDarkMode.addEventListener('mouseup', function() {
        this.style.transform = 'scale(1)';
    });
    
    toggleDarkMode.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
    });
});

// Override the createMoodChart function to support dark mode
function createMoodChart(entries) {
    const labels = entries.map(entry => {
        const date = new Date(entry.timestamp);
        return `${date.getDate()}/${date.getMonth() + 1}`;
    }).reverse();

    const data = entries.map(entry => {
        switch (entry.mood) {
            case 'great': return 5;
            case 'good': return 4;
            case 'okay': return 3;
            case 'bad': return 2;
            case 'terrible': return 1;
            default: return 0;
        }
    }).reverse();

    const ctx = document.createElement('canvas');
    chartContainer.innerHTML = '';
    chartContainer.appendChild(ctx);

    // Check if dark mode is enabled
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    const chartColors = {
        borderColor: isDarkMode ? 'rgba(121, 134, 203, 1)' : 'rgba(92, 107, 192, 1)',
        backgroundColor: isDarkMode ? 'rgba(121, 134, 203, 0.2)' : 'rgba(92, 107, 192, 0.2)',
        gridColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        textColor: isDarkMode ? '#b0b0b0' : '#666'
    };

    // Create new chart with appropriate colors
    if (window.moodChart) {
        window.moodChart.destroy();
    }
    
    window.moodChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'อารมณ์',
                data: data,
                backgroundColor: chartColors.backgroundColor,
                borderColor: chartColors.borderColor,
                borderWidth: 2,
                fill: true,
                tension: 0.2, // Add a slight curve to lines
                pointBackgroundColor: chartColors.borderColor,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: chartColors.textColor
                    }
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 5,
                    ticks: {
                        stepSize: 1,
                        color: chartColors.textColor,
                        callback: function(value) {
                            switch (value) {
                                case 1: return 'แย่มาก';
                                case 2: return 'แย่';
                                case 3: return 'ปานกลาง';
                                case 4: return 'ดี';
                                case 5: return 'ดีมาก';
                                default: return '';
                            }
                        }
                    },
                    grid: {
                        color: chartColors.gridColor
                    }
                },
                x: {
                    ticks: {
                        color: chartColors.textColor
                    },
                    grid: {
                        color: chartColors.gridColor
                    }
                }
            }
        }
    });
}
function transitionToDashboard() {
    const authCard = document.getElementById('auth-card');
    const dashboard = document.getElementById('dashboard');
    
    authCard.style.transition = 'opacity 0.5s ease-out';
    authCard.style.opacity = '0';
    
    setTimeout(() => {
        authCard.style.display = 'none';
        dashboard.style.display = 'block';
        dashboard.style.transition = 'opacity 0.5s ease-in';
        dashboard.style.opacity = '1';
    }, 500);
}
// อัปเดตคำแนะนำใหม่ พร้อมกิจกรรมและลิงก์
const moodAdvice = {
    great: {
        text: "เยี่ยมมาก! รักษาความรู้สึกดีนี้ไว้นะ ลองแชร์พลังบวกให้คนรอบตัว!",
        link: "https://www.kapook.com/", // เว็บไซต์ข่าวดีให้พลังบวก
        linkText: "อ่านเรื่องราวสร้างแรงบันดาลใจ"
    },
    good: {
        text: "ดีเลย! การดูแลสุขภาพจิตเป็นสิ่งสำคัญ ลองทำสิ่งที่ทำให้คุณมีความสุขต่อไป!",
        link: "https://www.youtube.com/watch?v=lM02vNMRRB0", // TED Talk เกี่ยวกับความสุข
        linkText: "ฟังเพลงเติมพลังใจ"
    },
    okay: {
        text: "ปานกลางใช่ไหม? ลองหากิจกรรมที่ทำให้รู้สึกดีขึ้น เช่น ฟังเพลงหรือออกกำลังกาย",
        link: "https://open.spotify.com/playlist/37i9dQZF1DX0FOF1IUWK1W", // เพลย์ลิสต์เพลงผ่อนคลาย
        linkText: "ฟังเพลงชิลล์ ๆ"
    },
    bad: {
        text: "รู้สึกแย่เหรอ? อย่าลืมให้เวลากับตัวเอง หรือฟังเพลงที่ช่วยให้รู้สึกดีขึ้น",
        link: "https://open.spotify.com/playlist/37i9dQZF1DWZgauS5j6pMv", // เพลย์ลิสต์เพลงสบายใจ
        linkText: "ฟังเพลงช่วยเยียวยาใจ"
    },
    terrible: {
        text: "ถ้ารู้สึกแย่มาก อย่าลังเลที่จะขอความช่วยเหลือ ลองฟังเพลงสงบๆ หรือโทร 1323",
        link: "https://www.youtube.com/watch?v=6mZ1dWLnUws", // เพลงบำบัดความเครียด
        linkText: "ฟังเพลงบำบัดความเครียด"
    }
};

// ดึง Element
const adviceBox = document.getElementById("mood-advice");
const adviceText = document.getElementById("advice-text");
const adviceLink = document.getElementById("advice-link");

// อัปเดตการเลือกอารมณ์
moodOptions.forEach(option => {
    option.addEventListener("click", () => {
        const mood = option.getAttribute("data-mood");
        
        // อัปเดตคำแนะนำ
        adviceText.textContent = moodAdvice[mood].text;

        // อัปเดตลิงก์แนะนำ
        if (moodAdvice[mood].link) {
            adviceLink.href = moodAdvice[mood].link;
            adviceLink.textContent = moodAdvice[mood].linkText;
            adviceLink.style.display = "inline-block";
        } else {
            adviceLink.style.display = "none";
        }

        // ลบสีเดิม และเพิ่มสีของอารมณ์ที่เลือก
        adviceBox.className = "advice-card " + mood;

        // แสดงกล่องคำแนะนำ
        adviceBox.style.display = "block";
        adviceBox.classList.remove("hide");
        adviceBox.classList.add("show");
    });
});

// เมื่อกดปุ่มเช็คอินให้ซ่อนคำแนะนำ
checkInBtn.addEventListener("click", () => {
    adviceBox.classList.remove("show");
    adviceBox.classList.add("hide");

    // ซ่อนกล่องคำแนะนำหลังจาก 300ms (ให้ตรงกับ Animation)
    setTimeout(() => {
        adviceBox.style.display = "none";
    }, 300);
});

// เพิ่มเงื่อนไขตรวจสอบว่าอิลิเมนต์มีอยู่จริงก่อนใช้งาน
const userPointsDisplay = document.getElementById("user-points");

// ฟังก์ชันโหลดคะแนนสะสมของผู้ใช้
function loadUserPoints(userId) {
    if (!userPointsDisplay) {
        console.error("ไม่พบอิลิเมนต์ user-points");
        return;
    }
    
    db.collection("users").doc(userId).get()
        .then((doc) => {
            if (doc.exists) {
                const points = doc.data().points || 0;
                userPointsDisplay.textContent = points;
            }
        })
        .catch((error) => console.error("Error loading points:", error));
}

// เพิ่มคะแนนเมื่อเช็คอิน ด้วยการจำกัดที่ 5 คะแนนต่อวัน
checkInBtn.addEventListener("click", () => {
    const user = auth.currentUser;
    if (!user || !selectedMood) return;
    
    // เช็คว่ามีอิลิเมนต์แสดงคะแนนหรือไม่
    const hasPointsDisplay = !!document.getElementById("user-points");
    
    const userRef = db.collection("users").doc(user.uid);
    
    // ดึงข้อมูลคะแนนและการเช็คอินของวันนี้
    userRef.get().then((doc) => {
        // ตรวจสอบว่ามีข้อมูลผู้ใช้หรือไม่
        if (!doc.exists) {
            console.error("ไม่พบข้อมูลผู้ใช้");
            return;
        }
        
        const userData = doc.data();
        let currentPoints = userData.points || 0;
        
        // เช็คว่ามีข้อมูลการเช็คอินวันนี้หรือไม่
        const today = new Date();
        const todayStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
        
        // ถ้าไม่มีข้อมูลของวันนี้ ให้สร้างขึ้นมาใหม่
        if (!userData.dailyCheckIns || !userData.dailyCheckIns[todayStr]) {
            // เพิ่มคะแนน เนื่องจากเป็นการเช็คอินครั้งแรกของวัน
            userRef.update({
                points: currentPoints + 1,
                [`dailyCheckIns.${todayStr}`]: 1 // เริ่มนับครั้งแรก
            }).then(() => {
                if (hasPointsDisplay) {
                    document.getElementById("user-points").textContent = currentPoints + 1;
                }
            });
        } else {
            // มีข้อมูลการเช็คอินของวันนี้แล้ว ตรวจสอบว่าเกินโควต้าหรือไม่
            const todayCheckIns = userData.dailyCheckIns[todayStr];
            
            if (todayCheckIns >= 5) {
                // เกินโควต้าแล้ว ไม่เพิ่มคะแนน
            } else {
                // ยังไม่เกินโควต้า เพิ่มคะแนนและจำนวนครั้งการเช็คอินของวันนี้
                userRef.update({
                    points: currentPoints + 1,
                    [`dailyCheckIns.${todayStr}`]: todayCheckIns + 1
                }).then(() => {
                    if (hasPointsDisplay) {
                        document.getElementById("user-points").textContent = currentPoints + 1;
                    }
                });
            }
        }
    }).catch((error) => {
        console.error("เกิดข้อผิดพลาดในการอัปเดตคะแนน:", error);
        alert("เกิดข้อผิดพลาดในการอัปเดตคะแนน โปรดลองอีกครั้ง");
    });
});

// แก้ไขส่วนระบบแลกของรางวัล
document.querySelectorAll(".redeem-btn").forEach((button) => {
    button.addEventListener("click", function () {
        const user = auth.currentUser;
        if (!user) return;

        const cost = parseInt(this.getAttribute("data-cost"));
        const userRef = db.collection("users").doc(user.uid);

        userRef.get().then((doc) => {
            let currentPoints = doc.data().points || 0;

            if (currentPoints >= cost) {
                userRef.update({ points: currentPoints - cost }).then(() => {
                    const pointsDisplay = document.getElementById("user-points");
                    if (pointsDisplay) {
                        pointsDisplay.textContent = currentPoints - cost;
                    }
                    alert(`แลกของรางวัลสำเร็จ! คะแนนที่เหลือ: ${currentPoints - cost}`);
                });
            } else {
                alert("คะแนนไม่เพียงพอ!");
            }
        });
    });
});

// โหลดคะแนนเมื่อเข้าสู่ระบบ
auth.onAuthStateChanged((user) => {
    if (user) {
        loadUserPoints(user.uid);
    }
});
// เพิ่มโค้ดนี้ต่อท้าย app.js

// สร้างระบบ tooltip/ป๊อปโอเวอร์ช่วยเหลือ
function createHelpSystem() {
    // สร้าง tooltip container
    const tooltipContainer = document.createElement('div');
    tooltipContainer.className = 'tooltip-container';
    tooltipContainer.style.display = 'none';
    tooltipContainer.innerHTML = `
        <div class="tooltip-content">
            <div class="tooltip-header">
                <h3 id="tooltip-title">คำแนะนำ</h3>
                <button class="tooltip-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="tooltip-body" id="tooltip-content"></div>
        </div>
    `;
    document.body.appendChild(tooltipContainer);
    
    // เพิ่ม Event Listener สำหรับปิด tooltip
    document.querySelector('.tooltip-close').addEventListener('click', () => {
        tooltipContainer.style.display = 'none';
    });
    
    // ฟังก์ชันแสดง tooltip
    window.showTooltip = function(title, content, position = null) {
        document.getElementById('tooltip-title').textContent = title;
        document.getElementById('tooltip-content').innerHTML = content;
        tooltipContainer.style.display = 'flex';
        
        // ตั้งค่าตำแหน่ง (ถ้ากำหนด)
        if (position) {
            tooltipContainer.style.top = position.top + 'px';
            tooltipContainer.style.left = position.left + 'px';
        } else {
            // ตำแหน่งกลางหน้าจอ
            tooltipContainer.style.top = '50%';
            tooltipContainer.style.left = '50%';
            tooltipContainer.style.transform = 'translate(-50%, -50%)';
        }
    };
    
    // เพิ่ม Event Listener สำหรับทุกปุ่มช่วยเหลือ
    document.querySelectorAll('.help-icon').forEach(icon => {
        icon.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const helpType = this.getAttribute('data-help-type');
            const helpContent = helpContents[helpType];
            
            if (helpContent) {
                // คำนวณตำแหน่งให้ tooltip แสดงใกล้กับปุ่ม
                const rect = this.getBoundingClientRect();
                const position = {
                    top: rect.bottom + window.scrollY + 10,
                    left: rect.left + window.scrollX - 150
                };
                
                showTooltip(helpContent.title, helpContent.content, position);
            }
        });
    });
}

// ข้อความช่วยเหลือสำหรับส่วนต่างๆ
const helpContents = {
    checkin: {
        title: 'วิธีการเช็คอินประจำวัน',
        content: `
            <p>เช็คอินประจำวันช่วยให้คุณติดตามสภาพอารมณ์ได้อย่างต่อเนื่อง:</p>
            <ol>
                <li>เลือกอารมณ์ที่ตรงกับความรู้สึกของคุณในวันนี้</li>
                <li>เพิ่มบันทึกเพิ่มเติมเพื่ออธิบายความรู้สึกของคุณ</li>
                <li>กดปุ่ม "บันทึกเช็คอิน" เพื่อบันทึกอารมณ์ประจำวัน</li>
            </ol>
            <p><strong>โบนัส:</strong> คุณจะได้รับ 1 คะแนนต่อการเช็คอิน (สูงสุด 5 ครั้งต่อวัน)</p>
             <p><strong>คะแนนสามารถนำไปแลกของรางวัลได้</strong>
        `
    },
    history: {
        title: 'วิธีดูประวัติการเช็คอิน',
        content: `
            <p>ส่วนประวัติการเช็คอินช่วยให้คุณเห็นพัฒนาการทางอารมณ์:</p>
            <ul>
                <li>กราฟแสดงแนวโน้มอารมณ์ในช่วงเวลาต่างๆ</li>
                <li>ใช้ตัวกรองเดือนเพื่อดูข้อมูลเฉพาะช่วงเวลาที่ต้องการ</li>
                <li>รายการด้านล่างแสดงรายละเอียดการเช็คอินพร้อมโน้ต</li>
            </ul>
            <p>การติดตามอารมณ์อย่างสม่ำเสมอช่วยให้คุณเข้าใจตัวเองมากขึ้น!</p>
        `
    },
    rewards: {
        title: 'ระบบคะแนนและของรางวัล',
        content: `
            <p>วิธีรับและใช้คะแนนสะสม:</p>
            <ul>
                <li>ได้รับ 1 คะแนนต่อการเช็คอิน (สูงสุด 5 คะแนนต่อวัน)</li>
                <li>สะสมคะแนนเพื่อแลกของรางวัลในร้านค้า</li>
                <li>ยิ่งเช็คอินสม่ำเสมอ ยิ่งได้คะแนนเร็ว!</li>
            </ul>
            <p>เช็คอินทุกวันเพื่อสะสมคะแนนให้มากที่สุด!</p>
        `
    },
    resources: {
        title: 'แหล่งข้อมูลช่วยเหลือ',
        content: `
            <p>แหล่งข้อมูลสำหรับช่วยเหลือด้านสุขภาพจิต:</p>
            <ul>
                <li><strong>สายด่วนสุขภาพจิต:</strong> โทร 1323 (ตลอด 24 ชั่วโมง)</li>
                <li><strong>เทคนิคการจัดการความเครียด:</strong> เรียนรู้วิธีการผ่อนคลายและจัดการความเครียด</li>
                <li><strong>แหล่งข้อมูลการบำบัด:</strong> ค้นหาผู้เชี่ยวชาญด้านสุขภาพจิตในพื้นที่ของคุณ</li>
            </ul>
            <p>อย่าลังเลที่จะขอความช่วยเหลือเมื่อคุณต้องการ!</p>
        `
    }
};

// เรียกใช้ฟังก์ชันสร้างระบบช่วยเหลือเมื่อโหลดหน้า
document.addEventListener('DOMContentLoaded', function() {
    // สร้างระบบช่วยเหลือ
    createHelpSystem();
    
    // เพิ่มคำแนะนำหลังเช็คอิน
    checkInBtn.addEventListener('click', function() {
        if (selectedMood) {
            setTimeout(() => {
                showTooltip(
                    'เช็คอินสำเร็จ!', 
                    `<p>ขอบคุณสำหรับการเช็คอิน! คุณได้รับ 1 คะแนนแล้ว</p>
                     <p>ลองดูกราฟอารมณ์และแนวโน้มของคุณในส่วนประวัติการเช็คอิน</p>
                     <p>เช็คอินทุกวันเพื่อติดตามสุขภาพจิตและสะสมคะแนน!</p>`
                );
            }, 1000);
        }
    });
});

document.addEventListener("DOMContentLoaded", function() {
    const tooltip = document.querySelector(".tooltip-container");
    const helpIcon = document.querySelector(".help-icon");
    const closeBtn = document.querySelector(".tooltip-close");

    if (helpIcon && tooltip) {
        helpIcon.addEventListener("click", function() {
            tooltip.style.display = "block"; // เปิด tooltip
        });

        closeBtn.addEventListener("click", function() {
            tooltip.style.display = "none"; // ปิด tooltip
        });
    }
});
