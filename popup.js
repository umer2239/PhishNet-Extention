// PhishNet Extension - Popup JavaScript with User Authentication

// Backend API Configuration
const API_BASE_URL = 'http://localhost:5000/api/v1';
const WEBSITE_URL = 'http://localhost:3000'; // Change to your website URL

// API Service Class
class PhishNetAPI {
    static async request(endpoint, options = {}) {
        const requestId = `REQ-${Date.now()}`;
        const url = `${API_BASE_URL}${endpoint}`;
        
        console.log(`\n[${requestId}] 🌐 API REQUEST`);
        console.log(`[${requestId}] URL: ${url}`);
        console.log(`[${requestId}] Method: ${options.method || 'GET'}`);
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add authorization token if available
        const token = await this.getAccessToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            console.log(`[${requestId}] ✓ Authorization token added`);
        } else {
            console.log(`[${requestId}] ⚠ No authorization token found`);
        }

        try {
            console.log(`[${requestId}] Sending request...`);
            const response = await fetch(url, {
                ...options,
                headers
            });

            console.log(`[${requestId}] Response received - Status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                // Get error details from response
                const errorData = await response.json();
                console.log(`[${requestId}] ❌ Request failed:`, errorData);
                
                if (response.status === 401) {
                    // Check if this is a login/signup attempt or a protected endpoint
                    const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/signup');
                    
                    if (!isAuthEndpoint && token) {
                        // For protected endpoints with existing token, try refresh
                        console.log(`[${requestId}] ⚠ 401 Unauthorized on protected endpoint - Attempting token refresh...`);
                        const refreshed = await this.refreshToken();
                        if (refreshed) {
                            console.log(`[${requestId}] ✓ Token refreshed, retrying request...`);
                            return this.request(endpoint, options);
                        }
                        console.log(`[${requestId}] ❌ Token refresh failed`);
                        throw new Error('Session expired. Please log in again.');
                    } else {
                        // For login/signup or no token, show backend error message
                        console.log(`[${requestId}] ⚠ 401 on auth endpoint - Invalid credentials or account issue`);
                        throw new Error(errorData.message || 'Authentication failed. Please check your credentials.');
                    }
                }
                
                throw new Error(errorData.message || 'API request failed');
            }

            const data = await response.json();
            console.log(`[${requestId}] ✅ Request successful`);
            return data;
        } catch (error) {
            console.error(`[${requestId}] ❌ Request error:`, error);
            throw error;
        }
    }

    static async signup(name, email, password) {
        return this.request('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
    }

    static async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    static async logout() {
        return this.request('/auth/logout', {
            method: 'POST'
        });
    }

    static async getUserProfile() {
        return this.request('/users/me', {
            method: 'GET'
        });
    }

    static async getUserStats() {
        return this.request('/users/stats', {
            method: 'GET'
        });
    }

    static async checkUrl(url, status = 'unknown') {
        return this.request('/urls/check', {
            method: 'POST',
            body: JSON.stringify({
                url,
                status,
                reasons: [],
                userAction: 'visited',
                wasWarned: false
            })
        });
    }

    static async getAccessToken() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['accessToken'], (result) => {
                resolve(result.accessToken || null);
            });
        });
    }

    static async getRefreshToken() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['refreshToken'], (result) => {
                resolve(result.refreshToken || null);
            });
        });
    }

    static async saveTokens(accessToken, refreshToken) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ accessToken, refreshToken }, resolve);
        });
    }

    static async refreshToken() {
        try {
            const refreshToken = await this.getRefreshToken();
            if (!refreshToken) return false;

            const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) return false;

            const data = await response.json();
            await this.saveTokens(data.data.accessToken, data.data.refreshToken);
            return true;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }
}

// PAGE ELEMENTS
const introPage = document.getElementById('intro-page');
const dashboardPage = document.getElementById('dashboard-page');
const settingsPage = document.getElementById('settings-page');
const premiumPage = document.getElementById('premium-page');
const settingsBackBtn = document.getElementById('settings-back-btn');

// Expose page refs globally for settings.js/runtime debug
window.__phishnetPages = {
    introPage,
    dashboardPage,
    settingsPage,
    premiumPage
};

// BUTTONS
const introLoginBtn = document.getElementById('intro-login-btn');
const introSignupBtn = document.getElementById('intro-signup-btn');
const loginSubmitBtn = document.getElementById('login-submit');
const gotoSignupBtn = document.getElementById('goto-signup');
const menuToggleBtn = document.getElementById('menu-toggle-btn');
const protectionDial = document.getElementById('protection-dial');
const alwaysOnToggle = document.getElementById('always-on-toggle');
const taglineEl = document.getElementById('tagline');

// MODALS
const loginModal = document.getElementById('login-modal');
const drawer = document.getElementById('menu-drawer');
const whitelistModal = document.getElementById('whitelist-modal');
const bulkScanModal = document.getElementById('bulk-scan-modal');
const threatModal = document.getElementById('threat-modal');
const premiumModal = document.getElementById('premium-modal');
const premiumBackBtn = document.getElementById('premium-back-btn');

// MODAL INPUTS
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginPwToggle = document.getElementById('loginPwToggle');

// UI ELEMENTS
const dialStatus = document.getElementById('dial-status');
const timerDisplay = document.getElementById('timer-display');
const usernameDisplay = document.getElementById('username-display');
const userAvatar = document.getElementById('user-avatar');
const toast = document.getElementById('toast');
const whitelistInput = document.getElementById('whitelist-input');
const whitelistAddBtn = document.getElementById('whitelist-add');
const whitelistList = document.getElementById('whitelist-list');

// STATE MANAGEMENT (keep localStorage for UI state only, not user data)
let state = {
    isLoggedIn: false,
    currentUser: null,
    isProtected: false,
    alwaysOn: false,
    timerEndTime: 0,
    whitelist: ['example.com', 'my-trusted-site.com'],
    settings: {
        scanURLs: true,
        scanEmails: true,
        dataSharing: false,
        autoSubmit: false,
        desktopNotify: true
    }
};

// Expose state for other scripts (e.g., settings.js) to read current user
window.__phishnetState = state;

let timerInterval = null;

function getUserInitials(name, email) {
    if (name && name.trim()) {
        const parts = name.trim().split(' ');
        const initials = parts.map(p => p.charAt(0).toUpperCase()).join('');
        return initials.slice(0, 2);
    }
    if (email && email.trim()) {
        return email.charAt(0).toUpperCase() + (email.charAt(1) || '').toUpperCase();
    }
    return 'U';
}

function createUserAvatar(name, email) {
    const initials = getUserInitials(name, email);
    const avatar = document.createElement('div');
    avatar.className = 'avatar-circle';
    avatar.textContent = initials;
    return avatar;
}

// LOAD STATE
function loadState() {
    const stored = localStorage.getItem('phishNetState');
    if (stored) {
        state = JSON.parse(stored);
    }
    updateUI();
}

// SAVE STATE
function saveState() {
    localStorage.setItem('phishNetState', JSON.stringify(state));
}

// SHOW PAGE
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    if (page) {
        page.classList.add('active');
    }
}

// Expose for cross-file usage
window.showPage = showPage;

// SHOW MODAL
function openModal(modal) {
    if (modal) {
        modal.classList.add('open');
    }
}

// CLOSE MODAL
function closeModal(modal) {
    if (modal) {
        modal.classList.remove('open');
    }
}

// OPEN DRAWER
function openDrawer() {
    drawer.classList.add('open');
}

// CLOSE DRAWER
function closeDrawer() {
    drawer.classList.remove('open');
}

// SHOW TOAST
function showToast(message, duration = 3000) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// TYPEWRITER EFFECT
function typewriter(element, text, speed = 60) {
    if (!element) return;
    element.textContent = '';
    let index = 0;
    function type() {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            setTimeout(type, speed);
        }
    }
    type();
}

// TIMER DISPLAY
function startTimer(resume = false) {
    clearInterval(timerInterval);
    if (!resume) {
        state.timerEndTime = Date.now() + (10 * 60 * 1000);
    }
    timerInterval = setInterval(updateTimerDisplay, 1000);
    updateTimerDisplay();
    saveState();
}

function stopTimer() {
    clearInterval(timerInterval);
    state.timerEndTime = 0;
}

function updateTimerDisplay() {
    const msRemaining = state.timerEndTime - Date.now();
    if (msRemaining <= 0) {
        timerDisplay.textContent = '00:00';
        if (state.isProtected) {
            state.isProtected = false;
            stopTimer();
            saveState();
            updateUI();
            showToast('PhishNet paused (auto-off)');
        }
        return;
    }
    const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// UPDATE UI
function updateUI() {
    if (state.isLoggedIn && state.currentUser) {
        showPage(dashboardPage);
        usernameDisplay.textContent = state.currentUser.name;
        userAvatar.innerHTML = '';
        userAvatar.appendChild(createUserAvatar(state.currentUser.name, state.currentUser.email));
    } else {
        showPage(introPage);
        typewriter(taglineEl, 'Advanced Phishing Protection at Your Fingertips...', 60);
    }

    protectionDial.setAttribute('aria-checked', state.isProtected);
    protectionDial.classList.toggle('is-active', state.isProtected);
    dialStatus.textContent = state.isProtected ? 'ON' : 'OFF';
    timerDisplay.classList.toggle('is-visible', state.isProtected && !state.alwaysOn);
    alwaysOnToggle.checked = state.alwaysOn;

    // Resume timer if needed
    if (state.isProtected && !state.alwaysOn && state.timerEndTime > Date.now()) {
        startTimer(true);
    }
}

// AUTHENTICATION HANDLERS
async function handleSignup(name, email, password) {
    if (!name.trim() || !email.trim() || !password.trim()) {
        showToast('Please fill in all fields');
        return;
    }

    try {
        signupSubmitBtn.disabled = true;
        signupSubmitBtn.textContent = 'Signing up...';

        const response = await PhishNetAPI.signup(name.trim(), email.trim(), password);

        if (response.success) {
            // Save tokens
            await PhishNetAPI.saveTokens(response.data.accessToken, response.data.refreshToken);

            state.isLoggedIn = true;
            state.currentUser = {
                name: response.data.user.name,
                email: response.data.user.email,
                userId: response.data.user._id
            };
            
            saveState();
            updateUI();
            closeModal(signupModal);
            showToast(`Welcome, ${state.currentUser.name}!`);
            
            signupNameInput.value = '';
            signupEmailInput.value = '';
            signupPasswordInput.value = '';
        }
    } catch (error) {
        showToast(error.message || 'Registration failed');
    } finally {
        signupSubmitBtn.disabled = false;
        signupSubmitBtn.textContent = 'Sign Up';
    }
}

async function handleLogin(email, password) {
    if (!email.trim() || !password.trim()) {
        showToast('Please enter email and password');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        showToast('Please enter a valid email address');
        return;
    }

    try {
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.textContent = 'Logging in...';

        console.log('🔐 Attempting login...', { email: email.trim() });
        const response = await PhishNetAPI.login(email.trim(), password);
        console.log('✅ Login response received:', response);

        if (response.success) {
            // Save tokens
            await PhishNetAPI.saveTokens(response.data.accessToken, response.data.refreshToken);

            state.isLoggedIn = true;
            // Handle both firstName/lastName (website schema) and name (legacy)
            const fullName = response.data.user.firstName && response.data.user.lastName 
                ? `${response.data.user.firstName} ${response.data.user.lastName}`
                : response.data.user.name || 'User';
            
            state.currentUser = {
                name: fullName,
                email: response.data.user.email,
                userId: response.data.user._id,
                firstName: response.data.user.firstName,
                lastName: response.data.user.lastName
            };
            
            saveState();
            updateUI();
            closeModal(loginModal);
            showToast(`Welcome back, ${state.currentUser.name}!`);
            
            loginEmailInput.value = '';
            loginPasswordInput.value = '';
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        
        // Show specific error message from backend
        let errorMessage = 'Login failed. Please try again.';
        
        if (error.message) {
            // Backend returns specific messages like:
            // - "No account found with this email. Please sign up first."
            // - "Incorrect password. Please try again."
            // - "Email is required"
            // - "Invalid email format"
            errorMessage = error.message;
        }
        
        showToast(errorMessage);
    } finally {
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.textContent = 'Login';
    }
}

// PROTECTION TOGGLE
function toggleProtection() {
    if (!state.isLoggedIn) {
        openModal(loginModal);
        showToast('Please log in first');
        return;
    }
    state.isProtected = !state.isProtected;
    if (state.isProtected) {
        if (!state.alwaysOn) {
            startTimer();
        }
        showToast('PhishNet protection enabled');
    } else {
        stopTimer();
        showToast('PhishNet protection disabled');
    }
    saveState();
    updateUI();
}

// ALWAYS ON TOGGLE
function handleAlwaysOnChange() {
    state.alwaysOn = alwaysOnToggle.checked;
    if (state.alwaysOn && state.isProtected) {
        stopTimer();
    } else if (!state.alwaysOn && state.isProtected) {
        startTimer();
    }
    saveState();
    updateUI();
}

// WHITELIST HANDLERS
function addToWhitelist() {
    const domain = whitelistInput.value.trim();
    if (domain && !state.whitelist.includes(domain)) {
        state.whitelist.push(domain);
        saveState();
        whitelistInput.value = '';
        renderWhitelist();
        showToast(`Added ${domain} to whitelist`);
    }
}

function removeFromWhitelist(domain) {
    state.whitelist = state.whitelist.filter(d => d !== domain);
    saveState();
    renderWhitelist();
    showToast(`Removed ${domain} from whitelist`);
}

function renderWhitelist() {
    whitelistList.innerHTML = '';
    state.whitelist.forEach(domain => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${domain}</span>
            <button aria-label="Remove ${domain}">✕</button>
        `;
        li.querySelector('button').addEventListener('click', () => removeFromWhitelist(domain));
        whitelistList.appendChild(li);
    });
}

// LOGOUT
async function handleLogout() {
    try {
        await PhishNetAPI.logout();
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        state.isLoggedIn = false;
        state.currentUser = null;
        state.isProtected = false;
        stopTimer();
        saveState();
        
        // Clear tokens
        chrome.storage.local.remove(['accessToken', 'refreshToken']);
        
        updateUI();
        closeDrawer();
        showToast('Logged out successfully');
    }
}

// EVENT LISTENERS - INTRO PAGE
introLoginBtn.addEventListener('click', () => {
    // Open login modal inside extension
    openModal(loginModal);
});

// Signup button removed from extension - users sign up on website directly

// EVENT LISTENERS - AUTHENTICATION
// Login handled inside extension using extension backend
loginSubmitBtn.addEventListener('click', () => {
    handleLogin(loginEmailInput.value, loginPasswordInput.value);
});

loginPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginSubmitBtn.click();
});

// "Sign up on website" button - redirects to website
gotoSignupBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: `${WEBSITE_URL}/signup.html?source=extension` });
});

// Password toggle functionality
if (loginPwToggle) {
    loginPwToggle.addEventListener('click', () => {
        const isPassword = loginPasswordInput.type === 'password';
        loginPasswordInput.type = isPassword ? 'text' : 'password';
        loginPwToggle.classList.toggle('active', !isPassword);
    });
}

// EVENT LISTENERS - MENU
menuToggleBtn.addEventListener('click', openDrawer);
document.querySelector('.drawer-backdrop').addEventListener('click', closeDrawer);
document.querySelector('.close-drawer').addEventListener('click', closeDrawer);

// EVENT LISTENERS - DASHBOARD
protectionDial.addEventListener('click', toggleProtection);
alwaysOnToggle.addEventListener('change', handleAlwaysOnChange);

// EVENT LISTENERS - MODAL CLOSE
document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.remove('open');
    });
});

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.remove('open');
    });
});

// EVENT LISTENERS - MENU ITEMS (using event delegation)
document.addEventListener('click', (e) => {
    // Handle menu buttons
    if (e.target.closest('.menu-btn')) {
        const btn = e.target.closest('.menu-btn');
        const action = btn.getAttribute('data-action');
        console.log(`Menu button clicked: ${action}`);
        closeDrawer();
        
        switch(action) {
            case 'dashboard':
                // Redirect to website dashboard in a new tab
                try {
                    console.log(`Opening dashboard: ${WEBSITE_URL}/dashboard.html`);
                    const url = `${WEBSITE_URL}/dashboard.html`;
                    console.log(`Full URL: ${url}`);
                    window.open(url, '_blank');
                } catch (error) {
                    console.error('Error opening dashboard:', error);
                }
                break;
            case 'report-threat':
                openModal(threatModal);
                break;
            case 'bulk-scan':
                openModal(bulkScanModal);
                break;
            case 'whitelist':
                renderWhitelist();
                openModal(whitelistModal);
                break;
            case 'settings':
                // Show full settings page instead of modal
                console.log('🔧 SETTINGS CLICKED - settingsPage:', settingsPage);
                console.log('🔧 settingsPage classList before:', settingsPage?.classList);
                
                if (settingsPage) {
                    showPage(settingsPage);
                    console.log('✓ Called showPage(settingsPage)');
                    console.log('✓ settingsPage classList after:', settingsPage.classList);
                    
                    // Give a small delay to ensure page rendered
                    setTimeout(() => {
                        // Initialize settings page if it hasn't been already
                        if (typeof window.settingsPageInit === 'function') {
                            console.log('✓ Calling settingsPageInit()');
                            window.settingsPageInit();
                        } else {
                            console.warn('⚠ settingsPageInit not found');
                        }
                    }, 100);
                } else {
                    console.error('❌ settingsPage is null/undefined!');
                }
                break;
            case 'premium':
                showPage(premiumPage);
                break;
            case 'logout':
                handleLogout();
                break;
        }
    }
    
    // Handle menu links with data-action
    if (e.target.closest('.menu-link[data-action]')) {
        e.preventDefault();
        const link = e.target.closest('.menu-link[data-action]');
        const action = link.getAttribute('data-action');
        console.log(`Menu link clicked: ${action}`);
        closeDrawer();
        
        if (action === 'view-reports') {
            try {
                console.log(`Opening reports: ${WEBSITE_URL}/reports.html`);
                const url = `${WEBSITE_URL}/reports.html`;
                console.log(`Full URL: ${url}`);
                window.open(url, '_blank');
            } catch (error) {
                console.error('Error opening reports:', error);
            }
        }
    }
}, true); // Use capture phase to ensure we catch the events

// PREMIUM PAGE
if (premiumBackBtn) {
    premiumBackBtn.addEventListener('click', () => {
        showPage(dashboardPage);
    });
}

const premiumCta = document.querySelector('.premium-cta');
if (premiumCta) {
    premiumCta.addEventListener('click', () => {
        showToast('Premium upgrade would be processed');
    });
}

const modalUpgradeBtn = document.getElementById('modal-upgrade-btn');
if (modalUpgradeBtn) {
    modalUpgradeBtn.addEventListener('click', () => {
        closeModal(premiumModal);
        showPage(premiumPage);
        showToast('Opening premium page...');
    });
}

// SETTINGS PAGE BACK BUTTON (ensure it always works)
if (settingsBackBtn) {
    settingsBackBtn.addEventListener('click', () => {
        showPage(dashboardPage);
    });
}

// EVENT LISTENERS - WHITELIST
whitelistAddBtn.addEventListener('click', addToWhitelist);
whitelistInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addToWhitelist();
});

// BULK SCAN HANDLER
const bulkScanSubmit = document.getElementById('bulk-scan-submit');
if (bulkScanSubmit) {
    bulkScanSubmit.addEventListener('click', () => {
        const input = document.getElementById('bulk-scan-input');
        const urls = input.value.split('\n').filter(url => url.trim());
        if (urls.length > 0) {
            showToast(`Scanning ${urls.length} URL(s)...`);
            closeModal(bulkScanModal);
            input.value = '';
        }
    });
}

// THREAT REPORT HANDLER
const threatSubmit = document.getElementById('threat-submit');
if (threatSubmit) {
    threatSubmit.addEventListener('click', () => {
        const url = document.getElementById('threat-url').value.trim();
        if (url) {
            showToast('Threat reported successfully!');
            closeModal(threatModal);
            document.getElementById('threat-url').value = '';
            document.getElementById('threat-desc').value = '';
        }
    });
}

// INITIALIZE
async function initializeApp() {
    // Check if user is already logged in
    const token = await PhishNetAPI.getAccessToken();
    if (token) {
        try {
            const response = await PhishNetAPI.getUserProfile();
            state.isLoggedIn = true;
            state.currentUser = {
                name: response.data.name,
                email: response.data.email,
                userId: response.data._id
            };
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
            // Clear invalid tokens
            chrome.storage.local.remove(['accessToken', 'refreshToken']);
        }
    }
    
    loadState();
}

initializeApp();

// ============================================
// NOTE: Extension handles login locally
// Signup redirects to website, but user must return to extension to login
// ============================================
