// CONFIG
const API_URL = "https://script.google.com/macros/s/AKfycbzeJUBkDWV6CAMHnlkPzycrI6tydLEtc88enoNhxj51sFXoL4AbGXQW0qJ3-yVuCH-onA/exec";

// PWA Support (minimal)
if ('serviceWorker' in navigator) {
 navigator.serviceWorker.register('sw.js');
}

// LOGIN LOGIC (login.html)
if(document.getElementById('loginForm')){
  document.getElementById('loginForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const empId = document.getElementById('employeeId').value.trim();
    const pwd = document.getElementById('password').value;
    try {
      const res = await fetch(`${API_URL}?action=login&employeeId=${encodeURIComponent(empId)}&password=${encodeURIComponent(pwd)}`);
      const result = await res.json();
      if(result.success){
        localStorage.setItem('user', JSON.stringify(result.user));
        if(result.user.role==="admin") location.href = "admin.html";
        else location.href = "dashboard.html";
      } else {
        document.getElementById('loginError').innerText = result.message || 'รหัสผิด';
        document.getElementById('loginError').style.display = 'block';
      }
    } catch (e) {
      document.getElementById('loginError').innerText = 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้';
      document.getElementById('loginError').style.display = 'block';
    }
  });
}

// LOGOUT (All pages)
const logoutBtn = document.getElementById('navLogout');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('user');
    location.href = 'login.html';
  });
}

// LOAD DASHBOARD
if(document.getElementById('summarySection')){
  const user = JSON.parse(localStorage.getItem('user')||null);
  if(!user){location.href='login.html';}
  document.getElementById('navProfile').innerText = user.fullName;
  // ดึงข้อมูลจาก Google Sheet
  fetch(`${API_URL}?action=leaveSummary&employeeId=${user.employeeId}&role=${user.role}`)
    .then(res=>res.json())
    .then(data=>{
      // Render section (ประกอบด้วย HTML + Chart)
      renderSummarySection(data, user);
      renderLeaveHistoryChart(data.history);
      renderLeaveTypeChart(data.byType);
      renderLeaveTable(data.records);
    });
}

// ตัวอย่าง: Chart.js
function renderLeaveHistoryChart(history){
  const ctx = document.getElementById('leaveHistoryChart');
  new Chart(ctx, { type: 'line', data: { labels: history.years, datasets: [{label: 'จำนวนวันลา', data: history.days, borderColor:'#4f8cff', tension:.3, fill:true, backgroundColor:'rgba(79,140,255,0.09)'}] }, options: {responsive:true, plugins:{legend:{display:false}} }});
}
function renderLeaveTypeChart(byType){
  const ctx = document.getElementById('leaveTypeChart');
  new Chart(ctx, { type: 'bar', data: { labels: byType.types, datasets: [{ label:'รวมวันลา', data: byType.counts, backgroundColor:'#38e6c0' }] }, options: {responsive:true} });
}
// Heatmap (ต้องใช้ปลั๊กอิน Chart.js เสริม หรือสร้างเอง, ตัวอย่างแทนที่ด้วย bar chart)

// Export Excel/PDF (admin)
document.getElementById('exportExcelBtn')?.addEventListener('click', ()=>{
  exportReport('excel');
});
document.getElementById('exportPdfBtn')?.addEventListener('click', ()=>{
  exportReport('pdf');
});
async function exportReport(type){
  const start = document.getElementById('exportStart').value;
  const end = document.getElementById('exportEnd').value;
  const dept = document.getElementById('exportDepartment').value;
  window.open(`${API_URL}?action=export&type=${type}&start=${start}&end=${end}&department=${dept}`, '_blank');
}

// Notification UI ตัวอย่าง
function notify(msg, isError=false){
  const n = document.getElementById('notification');
  n.innerText = msg;
  n.className = isError?'alert-error':'notification';
  n.style.display = 'block';
  setTimeout(()=>{ n.style.display='none'; }, 3200);
}

/*--- เพิ่มเติม logic workflow ตาม requirement ได้ในโซนนี้ ----*/
