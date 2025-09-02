// Performance & Loading Configuration
const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbynlmDPlMcpRSfSoAL_mde0fkLA5iP2oEBrYsyzOutEDT0PoYgIIhVJzTZ145imNosrUQ/exec", // แทนที่ด้วย URL จริง
  LOADING_TIMEOUT: 10000, // 10 seconds max loading
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes cache
  RETRY_ATTEMPTS: 3
};

// Loading Manager Class
class LoadingManager {
  constructor() {
    this.loadingStates = new Map();
    this.createLoadingOverlay();
  }

  createLoadingOverlay() {
    if (document.getElementById('globalLoading')) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'globalLoading';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="particles" id="particles"></div>
      <div class="logo-pulse">🏢</div>
      <div class="loading-progress">
        <div class="loading-progress-bar"></div>
      </div>
      <div class="loading-text">กำลังโหลด<span class="dots"></span></div>
    `;
    document.body.appendChild(overlay);
    this.createParticles();
  }

  createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    
    for(let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.width = particle.style.height = Math.random() * 4 + 2 + 'px';
      particle.style.animationDelay = Math.random() * 6 + 's';
      particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
      container.appendChild(particle);
    }
  }

  show(message = 'กำลังโหลด...') {
    const overlay = document.getElementById('globalLoading');
    if (overlay) {
      const text = overlay.querySelector('.loading-text');
      if (text) text.innerHTML = message + '<span class="dots"></span>';
      overlay.style.display = 'flex';
      overlay.style.opacity = '1';
    }
  }

  hide() {
    const overlay = document.getElementById('globalLoading');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 800);
    }
  }

  showButtonLoading(buttonId) {
    const btn = document.getElementById(buttonId);
    if(btn) {
      btn.classList.add('btn-loading');
      btn.disabled = true;
    }
  }

  hideButtonLoading(buttonId) {
    const btn = document.getElementById(buttonId);
    if(btn) {
      btn.classList.remove('btn-loading');
      btn.disabled = false;
    }
  }
}

// API Manager with Caching & Retry
class APIManager {
  constructor() {
    this.cache = new Map();
    this.loading = new LoadingManager();
  }

  async request(endpoint, params = {}, options = {}) {
    const cacheKey = endpoint + JSON.stringify(params);
    const showLoading = options.showLoading !== false;
    const retryCount = options.retryCount || 0;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
        return cached.data;
      }
    }

    if (showLoading) {
      this.loading.show(options.loadingMessage || 'กำลังโหลดข้อมูล...');
    }

    try {
      const url = `${CONFIG.API_URL}?action=${endpoint}&${new URLSearchParams(params)}`;
      const response = await Promise.race([
        fetch(url),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), CONFIG.LOADING_TIMEOUT)
        )
      ]);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      // Cache successful responses
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;

    } catch (error) {
      if (retryCount < CONFIG.RETRY_ATTEMPTS) {
        await this.delay(1000 * (retryCount + 1)); // Progressive delay
        return this.request(endpoint, params, {
          ...options,
          retryCount: retryCount + 1
        });
      }
      throw error;
    } finally {
      if (showLoading) {
        this.loading.hide();
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  clearCache() {
    this.cache.clear();
  }
}

// Initialize Global Instances
const api = new APIManager();
const loading = new LoadingManager();

// Enhanced Login Function
async function handleLogin(event) {
  event.preventDefault();
  
  const employeeId = document.getElementById('employeeId').value.trim();
  const password = document.getElementById('password').value;
  
  if (!employeeId || !password) {
    showAlert('กรุณาใส่รหัสพนักงานและรหัสผ่าน', 'error');
    return;
  }

  loading.showButtonLoading('loginBtn');
  
  try {
    loading.show('🔐 กำลังตรวจสอบข้อมูลผู้ใช้...');
    
    const result = await api.request('login', {
      employeeId,
      password
    }, {
      loadingMessage: '🔐 กำลังเข้าสู่ระบบ...',
      showLoading: false // Use custom loading
    });

    if (result.success) {
      loading.show('✅ เข้าสู่ระบบสำเร็จ!');
      
      // Store user data
      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('loginTime', Date.now());
      
      // Simulate additional loading for better UX
      await api.delay(1000);
      
      // Redirect based on role
      if (result.user.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'dashboard.html';
      }
    } else {
      showAlert(result.message || 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showAlert('ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง', 'error');
  } finally {
    loading.hideButtonLoading('loginBtn');
    loading.hide();
  }
}

// Dashboard Functions
async function loadDashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.employeeId) {
    window.location.href = 'index.html';
    return;
  }

  // Update profile link
  const profileLink = document.getElementById('navProfile');
  if (profileLink) {
    profileLink.textContent = '👤 ' + user.fullName;
  }

  try {
    const data = await api.request('leaveSummary', {
      employeeId: user.employeeId,
      role: user.role
    });

    if (data.success) {
      updateSummaryCards(data.summary);
      renderLeaveCharts(data);
      renderRecentLeaves(data.recent);
      
      if (user.role === 'head' || user.role === 'admin') {
        showHeadPanel(data.pending);
      }
    }
  } catch (error) {
    console.error('Dashboard load error:', error);
    showAlert('ไม่สามารถโหลดข้อมูลได้', 'error');
  }
}

function updateSummaryCards(summary) {
  if (!summary) return;
  
  const casualLeave = document.getElementById('casualLeave');
  const sickLeave = document.getElementById('sickLeave');
  const vacationLeave = document.getElementById('vacationLeave');
  const pendingRequests = document.getElementById('pendingRequests');
  
  if (casualLeave) casualLeave.textContent = `${summary.casual?.remaining || 0}/${summary.casual?.total || 0}`;
  if (sickLeave) sickLeave.textContent = `${summary.sick?.remaining || 0}/${summary.sick?.total || 0}`;
  if (vacationLeave) vacationLeave.textContent = `${summary.vacation?.remaining || 0}/${summary.vacation?.total || 0}`;
  if (pendingRequests) pendingRequests.textContent = summary.pending || 0;
}

function renderLeaveCharts(data) {
  // History Chart
  const historyCanvas = document.getElementById('leaveHistoryChart');
  if (historyCanvas && data.history) {
    new Chart(historyCanvas, {
      type: 'line',
      data: {
        labels: data.history.years || ['2023', '2024', '2025'],
        datasets: [{
          label: 'จำนวนวันลา',
          data: data.history.days || [5, 8, 3],
          borderColor: '#4f8cff',
          backgroundColor: 'rgba(79,140,255,0.1)',
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  // Type Chart
  const typeCanvas = document.getElementById('leaveTypeChart');
  if (typeCanvas && data.byType) {
    new Chart(typeCanvas, {
      type: 'doughnut',
      data: {
        labels: data.byType.types || ['ลากิจ', 'ลาป่วย', 'ลาพักร้อน'],
        datasets: [{
          data: data.byType.counts || [1, 3, 0],
          backgroundColor: ['#4f8cff', '#e05a5a', '#38e6c0']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}

function renderRecentLeaves(recent) {
  const container = document.getElementById('recentLeaves');
  if (!container || !recent) return;

  container.innerHTML = recent.map(leave => `
    <div class="recent-leave-item">
      <div class="leave-type">${getLeaveTypeIcon(leave.type)} ${leave.type}</div>
      <div class="leave-date">${leave.date}</div>
      <div class="leave-status ${leave.status}">${getStatusText(leave.status)}</div>
    </div>
  `).join('');
}

function getLeaveTypeIcon(type) {
  const icons = {
    'ลากิจ': '⚡',
    'ลาป่วย': '🏥',
    'ลาพักร้อน': '🏖️',
    'ลาอื่นๆ': '📄'
  };
  return icons[type] || '📋';
}

function getStatusText(status) {
  const statusMap = {
    'pending': '⏳ รอพิจารณา',
    'approved': '✅ อนุมัติ',
    'rejected': '❌ ปฏิเสธ',
    'waiting_certificate': '📋 รอใบรับรอง'
  };
  return statusMap[status] || status;
}

// Leave Request Functions
function calculateLeaveDays() {
  const startDate = document.getElementById('startDate');
  const endDate = document.getElementById('endDate');
  const display = document.getElementById('durationDisplay');
  
  if (!startDate || !endDate || !display) return;
  
  if (startDate.value && endDate.value) {
    const start = new Date(startDate.value);
    const end = new Date(endDate.value);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    display.textContent = `จำนวนวัน: ${diffDays} วัน`;
    
    // Show warnings based on leave type
    showLeaveWarnings();
  }
}

function showLeaveWarnings() {
  const leaveType = document.getElementById('leaveType');
  const warningMessage = document.getElementById('warningMessage');
  const attachmentSection = document.getElementById('attachmentSection');
  
  if (!leaveType || !warningMessage) return;
  
  const selectedType = leaveType.value;
  let warning = '';
  
  switch(selectedType) {
    case 'LT002': // ลาป่วย
      warning = '⚠️ การลาป่วยเกิน 3 วัน จำเป็นต้องแนบใบรับรองแพทย์';
      if (attachmentSection) attachmentSection.style.display = 'block';
      break;
    case 'LT003': // ลาพักร้อน
      warning = '📅 การลาพักร้อนต้องแจ้งล่วงหน้าอย่างน้อย 7 วัน';
      if (attachmentSection) attachmentSection.style.display = 'none';
      break;
    default:
      if (attachmentSection) attachmentSection.style.display = 'none';
      break;
  }
  
  if (warning) {
    warningMessage.innerHTML = warning;
    warningMessage.style.display = 'block';
  } else {
    warningMessage.style.display = 'none';
  }
}

async function submitLeaveRequest(event) {
  event.preventDefault();
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const formData = {
    employeeId: user.employeeId,
    leaveType: document.getElementById('leaveType').value,
    startDate: document.getElementById('startDate').value,
    endDate: document.getElementById('endDate').value,
    reason: document.getElementById('reason').value
  };
  
  if (!formData.leaveType || !formData.startDate || !formData.endDate || !formData.reason) {
    showAlert('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
    return;
  }
  
  loading.showButtonLoading('submitBtn');
  
  try {
    const result = await api.request('submitLeave', formData);
    
    if (result.success) {
      showAlert('ส่งคำขอลาสำเร็จ รอการพิจารณาจากหัวหน้า', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 2000);
    } else {
      showAlert(result.message || 'ไม่สามารถส่งคำขอได้', 'error');
    }
  } catch (error) {
    console.error('Submit leave error:', error);
    showAlert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง', 'error');
  } finally {
    loading.hideButtonLoading('submitBtn');
  }
}

// Profile Functions
async function loadProfile() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.employeeId) {
    window.location.href = 'index.html';
    return;
  }
  
  try {
    const data = await api.request('getProfile', { employeeId: user.employeeId });
    
    if (data.success) {
      updateProfileForm(data.profile);
      renderPersonalChart(data.leaveStats);
    }
  } catch (error) {
    console.error('Profile load error:', error);
    showAlert('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้', 'error');
  }
}

function updateProfileForm(profile) {
  const elements = ['userName', 'userRole', 'userCode', 'email', 'phone', 'lineId', 'department', 'startDate'];
  
  elements.forEach(id => {
    const element = document.getElementById(id);
    if (element && profile[id]) {
      if (element.tagName === 'INPUT') {
        element.value = profile[id];
      } else {
        element.textContent = profile[id];
      }
    }
  });
  
  // Update profile image
  const profileImage = document.getElementById('profileImage');
  if (profileImage && profile.profileImageURL) {
    profileImage.src = profile.profileImageURL;
  }
}

// Utility Functions
function showAlert(message, type = 'info', duration = 5000) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} animate-fadein`;
  alert.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" style="margin-left: auto; background: none; border: none; color: inherit; font-size: 1.2rem; cursor: pointer;">×</button>
  `;
  alert.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    color: white;
    font-weight: 500;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    max-width: 400px;
  `;
  
  // Set background color based on type
  const colors = {
    success: '#3bceac',
    error: '#e05a5a',
    warning: '#ffd36a',
    info: '#4f8cff'
  };
  alert.style.backgroundColor = colors[type] || colors.info;
  
  document.body.appendChild(alert);
  
  // Auto remove
  setTimeout(() => {
    if (alert.parentElement) {
      alert.style.opacity = '0';
      alert.style.transform = 'translateX(100%)';
      setTimeout(() => alert.remove(), 300);
    }
  }, duration);
}

function logout() {
  localStorage.clear();
  window.location.href = 'index.html';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
  const currentPage = window.location.pathname.split('/').pop();
  
  // Initialize loading manager for all pages
  loading.createLoadingOverlay();
  
  // Common logout functionality
  const logoutBtn = document.getElementById('navLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
  
  // Page-specific initialization
  switch(currentPage) {
    case 'index.html':
    case '':
      initLoginPage();
      break;
    case 'dashboard.html':
      loadDashboard();
      break;
    case 'admin.html':
      loadAdminPanel();
      break;
    case 'profile.html':
      loadProfile();
      break;
    case 'request-leave.html':
      initRequestLeavePage();
      break;
  }
});

function initLoginPage() {
  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', handleLogin);
    
    // Auto-focus first input
    const firstInput = form.querySelector('input');
    if (firstInput) firstInput.focus();
  }
}

function initRequestLeavePage() {
  const form = document.getElementById('leaveRequestForm');
  if (form) {
    form.addEventListener('submit', submitLeaveRequest);
  }
  
  // Date change listeners
  const startDate = document.getElementById('startDate');
  const endDate = document.getElementById('endDate');
  const leaveType = document.getElementById('leaveType');
  
  if (startDate) startDate.addEventListener('change', calculateLeaveDays);
  if (endDate) endDate.addEventListener('change', calculateLeaveDays);
  if (leaveType) leaveType.addEventListener('change', showLeaveWarnings);
}

async function loadAdminPanel() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.role !== 'admin') {
    window.location.href = 'dashboard.html';
    return;
  }
  
  try {
    const data = await api.request('adminDashboard');
    
    if (data.success) {
      updateAdminStats(data.stats);
      renderAdminCharts(data.charts);
    }
  } catch (error) {
    console.error('Admin panel load error:', error);
    showAlert('ไม่สามารถโหลดข้อมูล Admin ได้', 'error');
  }
}

function updateAdminStats(stats) {
  const elements = ['totalEmployees', 'todayRequests', 'pendingCerts', 'monthlyTrend'];
  
  elements.forEach(id => {
    const element = document.getElementById(id);
    if (element && stats && stats[id]) {
      element.textContent = stats[id];
    }
  });
}

function renderAdminCharts(chartData) {
  // Department Ranking Chart
  const deptCanvas = document.getElementById('departmentRankingChart');
  if (deptCanvas && chartData?.departments) {
    new Chart(deptCanvas, {
      type: 'bar',
      data: {
        labels: chartData.departments.names || [],
        datasets: [{
          label: 'วันลา',
          data: chartData.departments.days || [],
          backgroundColor: '#4f8cff'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } }
      }
    });
  }
  
  // Organization Heatmap (simplified as bar chart)
  const heatmapCanvas = document.getElementById('organizationHeatmap');
  if (heatmapCanvas && chartData?.heatmap) {
    new Chart(heatmapCanvas, {
      type: 'bar',
      data: {
        labels: chartData.heatmap.months || [],
        datasets: [{
          label: 'การลารายเดือน',
          data: chartData.heatmap.values || [],
          backgroundColor: '#38e6c0'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } }
      }
    });
  }
}

// Admin Functions
function showEmployeeList() {
  // Implementation for showing employee list
  showAlert('กำลังโหลดรายชื่อพนักงาน...', 'info');
}

function showTodayRequests() {
  // Implementation for showing today's requests
  showAlert('กำลังโหลดคำขอวันนี้...', 'info');
}

function showPendingCertificates() {
  // Implementation for showing pending certificates
  showAlert('กำลังโหลดรายการรอใบรับรอง...', 'info');
}

function showMonthlyTrend() {
  // Implementation for showing monthly trend
  showAlert('กำลังโหลดแนวโน้มรายเดือน...', 'info');
}

// Export Functions
document.addEventListener('click', function(e) {
  if (e.target.id === 'exportExcelBtn') {
    exportReport('excel');
  } else if (e.target.id === 'exportPdfBtn') {
    exportReport('pdf');
  }
});

async function exportReport(type) {
  const start = document.getElementById('exportStart')?.value;
  const end = document.getElementById('exportEnd')?.value;
  const dept = document.getElementById('exportDepartment')?.value;
  
  const params = new URLSearchParams({
    action: 'export',
    type: type,
    start: start || '',
    end: end || '',
    department: dept || ''
  });
  
  const url = `${CONFIG.API_URL}?${params}`;
  
  // Open in new tab for download
  window.open(url, '_blank');
  
  showAlert(`กำลัง Export รายงานเป็น ${type.toUpperCase()}...`, 'info');
}
