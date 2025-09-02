// Performance & Loading Configuration
const CONFIG = {
  API_URL: "YOUR_APPS_SCRIPT_URL",
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
    const overlay = document.createElement('div');
    overlay.id = 'globalLoading';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="particles" id="particles"></div>
      <div class="logo-pulse">🏢</div>
      <div class="loading-progress">
        <div class="loading-progress-bar"></div>
      </div>
      <div class="loading-text">กำลังเข้าสู่ระบบ<span class="dots">...</span></div>
    `;
    document.body.appendChild(overlay);
    this.createParticles();
  }

  createParticles() {
    const container = document.getElementById('particles');
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
    const text = overlay.querySelector('.loading-text');
    text.innerHTML = message + '<span class="dots">...</span>';
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
  }

  hide() {
    const overlay = document.getElementById('globalLoading');
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 800);
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

// Performance-optimized DOM loading
document.addEventListener('DOMContentLoaded', function() {
  // Optimize loading sequence
  requestAnimationFrame(() => {
    initializeApp();
  });
});

async function initializeApp() {
  const currentPage = window.location.pathname.split('/').pop();
  
  switch(currentPage) {
    case 'index.html':
    case '':
      initLoginPage();
      break;
    case 'dashboard.html':
      await initDashboard();
      break;
    case 'admin.html':
      await initAdminPanel();
      break;
    case 'profile.html':
      await initProfilePage();
      break;
  }
}

function initLoginPage() {
  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', handleLogin);
    
    // Auto-focus first input
    const firstInput = form.querySelector('input');
    if (firstInput) firstInput.focus();
  }
}

// Enhanced Alert System
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
