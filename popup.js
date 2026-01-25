// PhishNet Extension - Popup JavaScript with User Authentication

// Backend API Configuration
const API_BASE_URL = 'http://localhost:5000/api/v1';
const WEBSITE_URL = 'http://localhost:3000'; // Change to your website URL
const USE_SETTINGS_API = false; // Toggle to avoid 404s when settings endpoint is unavailable
const PRICING_PAGE_URL = 'http://localhost:3000/pricing.html';

// Expose flag for other scripts
window.__PHISHNET_USE_SETTINGS_API = USE_SETTINGS_API;

// Keys shared with settings.js for profile assets
const PROFILE_PICTURE_STORAGE_KEY = 'phishnetProfilePicture';

// API Service Class
class PhishNetAPI {
    static async request(endpoint, options = {}) {
        const requestId = `REQ-${Date.now()}`;
        const url = `${API_BASE_URL}${endpoint}`;
        
        console.log(`\n[${requestId}] 🌐 API REQUEST`);
        console.log(`[${requestId}] URL: ${url}`);
        console.log(`[${requestId}] Method: ${options.method || 'GET'}`);

        const suppressErrorLog = options.suppressErrorLog || false;
        
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
            if (!suppressErrorLog) {
                console.error(`[${requestId}] ❌ Request error:`, error);
            }
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

    static async getUserSettings() {
        try {
            return await this.request('/users/settings', {
                method: 'GET',
                suppressErrorLog: true
            });
        } catch (error) {
            console.warn('⚠ getUserSettings failed (will continue without backend settings):', error?.message || error);
            return null;
        }
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
const settingsBackBtn = document.getElementById('settings-back-btn');

// Expose page refs globally for settings.js/runtime debug
window.__phishnetPages = {
    introPage,
    dashboardPage,
    settingsPage
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
const topThreatsModal = document.getElementById('top-threats-modal');
const securityInsightsModal = document.getElementById('security-insights-modal');
// Premium modal/page removed; Get Premium opens pricing URL

// MODAL INPUTS
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginPwToggle = document.getElementById('loginPwToggle');

// UI ELEMENTS
const dialStatus = document.getElementById('dial-status');
const timerDisplay = document.getElementById('timer-display');
const usernameDisplay = document.getElementById('username-display');
const userAvatar = document.getElementById('user-avatar');
const userEmailDisplay = document.getElementById('user-email-display');
const toast = document.getElementById('toast');
// (removed whitelist/bulk-scan/threat controls — not supported in extension)

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
let typewriterRun = false;

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

function createUserAvatar(name, email, imageData) {
    if (imageData) {
        const img = document.createElement('img');
        img.src = imageData;
        img.alt = 'User avatar';
        img.className = 'avatar-image';
        return img;
    }
    const initials = getUserInitials(name, email);
    const avatar = document.createElement('div');
    avatar.className = 'avatar-circle';
    avatar.textContent = initials;
    return avatar;
}

// Load profile picture from chrome storage and merge into state
async function hydrateProfilePictureFromStorage() {
    const storedPicture = await new Promise((resolve) => {
        chrome.storage.local.get([PROFILE_PICTURE_STORAGE_KEY], (result) => {
            resolve(result[PROFILE_PICTURE_STORAGE_KEY]);
        });
    });
    if (!storedPicture) return;
    state.currentUser = state.currentUser || {};
    state.currentUser.profilePicture = storedPicture;
    saveState();
    renderUserAvatar();
}

// LOAD STATE
function loadState() {
    const stored = localStorage.getItem('phishNetState');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            // Preserve object identity so window.__phishnetState stays in sync
            Object.assign(state, parsed);
        } catch (err) {
            console.warn('⚠ Failed to parse stored state:', err);
        }
    }
    updateUI();
}

// SAVE STATE
function saveState() {
    localStorage.setItem('phishNetState', JSON.stringify(state));
}

// Expose saveState so settings.js can persist profile/avatar updates
window.saveState = saveState;

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
        usernameDisplay.textContent = state.currentUser.name || state.currentUser.fullName;
        if (userEmailDisplay) {
            const emailText = state.currentUser.email || '';
            userEmailDisplay.textContent = emailText;
            // set title so hovering shows full email if it wraps/truncates
            userEmailDisplay.title = emailText;
        }
        renderUserAvatar();
    } else {
        showPage(introPage);
        if (userEmailDisplay) userEmailDisplay.textContent = '';
        if (!typewriterRun) {
            typewriterRun = true;
            typewriter(taglineEl, 'Advanced Phishing Protection at Your Fingertips...', 60);
        }
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

// Render avatar in header using profile picture when available
function renderUserAvatar() {
    userAvatar.innerHTML = '';
    if (!state.currentUser) return;
    const avatarNode = createUserAvatar(
        state.currentUser.name,
        state.currentUser.email,
        state.currentUser.profilePicture
    );
    userAvatar.appendChild(avatarNode);
}

// Allow other scripts to refresh avatar when profile picture changes
window.refreshHeaderAvatar = renderUserAvatar;

// Load settings script on-demand if needed and wait for init hook
async function ensureSettingsInit(retries = 10, delay = 120) {
    // If already available, return fast
    if (typeof window.settingsPageInit === 'function') return true;

    // Try to (re)load settings.js if not present or not yet marked loaded
    const needsLoad = !window.__PHISHNET_SETTINGS_LOADED;
    if (needsLoad) {
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = `settings.js?v=${Date.now()}`;
            s.onload = resolve;
            s.onerror = reject;
            document.body.appendChild(s);
        }).catch(err => console.warn('⚠ Failed to load settings.js dynamically:', err));
    }

    for (let i = 0; i < retries; i++) {
        if (typeof window.settingsPageInit === 'function') return true;
        await new Promise(res => setTimeout(res, delay));
    }
    // Final fallback: use initializeSettingsPage if present, else noop to avoid repeated warnings
    if (typeof window.initializeSettingsPage === 'function') {
        window.settingsPageInit = window.initializeSettingsPage;
        return true;
    }
    window.settingsPageInit = () => console.warn('⚠ settings.js not ready (using noop init)');
    return true;
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

            // Rehydrate profile picture from storage so header shows immediately after login
            await hydrateProfilePictureFromStorage();
            
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

// (Whitelist, bulk-scan and threat reporting removed from extension)

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
document.addEventListener('click', async (e) => {
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
            case 'top-threats':
                try {
                    await populateTopThreats();
                } catch (err) { console.warn('populateTopThreats error', err); }
                openModal(topThreatsModal);
                break;
            case 'security-insights':
                try {
                    await populateSecurityInsights();
                } catch (err) { console.warn('populateSecurityInsights error', err); }
                openModal(securityInsightsModal);
                break;
            case 'learn-security':
                try {
                    chrome.tabs.create({ url: `${WEBSITE_URL}/blog.html` });
                } catch (error) {
                    window.open(`${WEBSITE_URL}/blog.html`, '_blank');
                }
                break;
            case 'settings':
                // Show full settings page instead of modal
                console.log('🔧 SETTINGS CLICKED - settingsPage:', settingsPage);
                console.log('🔧 settingsPage classList before:', settingsPage?.classList);
                
                if (settingsPage) {
                    showPage(settingsPage);
                    console.log('✓ Called showPage(settingsPage)');
                    console.log('✓ settingsPage classList after:', settingsPage.classList);
                    
                    // Give a small delay to ensure page rendered and settings init available
                    setTimeout(async () => {
                        const ok = await ensureSettingsInit();
                        if (ok) {
                            console.log('✓ Calling settingsPageInit()');
                            window.settingsPageInit();
                        } else {
                            console.warn('⚠ settingsPageInit not found after retry');
                        }
                    }, 100);
                } else {
                    console.error('❌ settingsPage is null/undefined!');
                }
                break;
            case 'premium':
                chrome.tabs.create({ url: PRICING_PAGE_URL });
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

// Premium page removed; Get Premium now opens website pricing page directly

// SETTINGS PAGE BACK BUTTON (ensure it always works)
if (settingsBackBtn) {
    settingsBackBtn.addEventListener('click', () => {
        showPage(dashboardPage);
    });
}

// NEW: Security Insights & Protection Status support
async function getLastScans() {
    // Try chrome.storage.local first (extension), fall back to localStorage
    return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['scanHistory'], (res) => {
                const arr = res?.scanHistory || null;
                if (arr && Array.isArray(arr)) return resolve(arr);
                // fallback to localStorage
                try {
                    const ls = localStorage.getItem('phishNetScans');
                    return resolve(ls ? JSON.parse(ls) : []);
                } catch (e) { return resolve([]); }
            });
        } else {
            try {
                const ls = localStorage.getItem('phishNetScans');
                return resolve(ls ? JSON.parse(ls) : []);
            } catch (e) { return resolve([]); }
        }
    });
}

// Seed dummy scan data if none exists (for demo / local testing)
async function seedDummyScans() {
    const existing = await new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['scanHistory'], (res) => resolve(res?.scanHistory || []));
        } else {
            try {
                const ls = localStorage.getItem('phishNetScans');
                resolve(ls ? JSON.parse(ls) : []);
            } catch (e) { resolve([]); }
        }
    });

    if (existing && existing.length > 0) return; // don't overwrite existing data

    const now = Date.now();
    const samples = [
        { target: 'http://malicious.example', url: 'http://malicious.example', result: 'Malicious', timestamp: now - 1000 * 60 * 60 },
        { target: 'http://suspicious.example', url: 'http://suspicious.example', result: 'Suspicious', timestamp: now - 1000 * 60 * 60 * 4 },
        { target: 'http://safe.example', url: 'http://safe.example', result: 'Safe', timestamp: now - 1000 * 60 * 60 * 24 },
        { target: 'http://phish.example', url: 'http://phish.example', result: 'Malicious', timestamp: now - 1000 * 60 * 30 },
        { target: 'user@example.com', url: 'mailto:user@example.com', result: 'Suspicious', timestamp: now - 1000 * 60 * 10 }
    ];

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ scanHistory: samples }, () => console.log('Seeded scanHistory in chrome.storage.local'));
    } else {
        try {
            localStorage.setItem('phishNetScans', JSON.stringify(samples));
            console.log('Seeded scanHistory in localStorage');
        } catch (e) {
            console.warn('Failed to seed localStorage scanHistory', e);
        }
    }
}

function formatResultIcon(result) {
    if (!result) return '✅';
    const r = String(result).toLowerCase();
    if (r.includes('malicious') || r.includes('malware')) return '⚠️';
    if (r.includes('suspicious')) return '🟡';
    return '✅';
}

async function populateSecurityInsights() {
    const listEl = document.getElementById('insights-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    const scans = await getLastScans();

    if (!Array.isArray(scans) || scans.length === 0) {
        listEl.innerHTML = '<p>No recent alerts.</p>';
        populateSecurityTips();
        return;
    }

    // Filter only Malicious/Suspicious
    const alerts = scans.filter(s => s.result && /malicious|suspicious|malware/i.test(s.result));
    const top = alerts.slice(0, 5);

    if (top.length === 0) {
        listEl.innerHTML = '<p>No recent malicious or suspicious results.</p>';
        populateSecurityTips();
        return;
    }

    top.forEach(item => {
        const card = document.createElement('div');
        card.className = 'insight-card';
        const when = item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Unknown';
        const icon = formatResultIcon(item.result);
        card.innerHTML = `
            <div class="insight-left">${icon}</div>
            <div class="insight-body">
                <div class="insight-target">${item.target || item.url || '—'}</div>
                <div class="insight-meta">${item.result} • ${when}</div>
            </div>
        `;
        // expose full target via title (hover tooltip)
        const targetEl = card.querySelector('.insight-target');
        if (targetEl) targetEl.title = item.target || item.url || '';
        listEl.appendChild(card);
    });

    // populate tips below insights
    populateSecurityTips();

        // ensure full value is available on hover
        const tt = row.querySelector('.threat-target');
        if (tt) tt.title = item.target || '';

}

// Simple security tips (static list for now)
function populateSecurityTips() {
    const tipsEl = document.getElementById('security-tips');
    if (!tipsEl) return;
    const tips = [
        { title: 'Verify sender', desc: 'Check email addresses carefully and avoid clicking links from unknown senders.' },
        { title: 'Hover links', desc: 'Hover over links to inspect the real URL before clicking.' },
        { title: 'Use strong passwords', desc: 'Use unique, complex passwords and enable two-factor authentication where possible.' },
        { title: 'Update software', desc: 'Keep your browser and extensions up to date to receive the latest security fixes.' },
        { title: 'Avoid public Wi‑Fi', desc: 'Avoid logging into sensitive accounts on public Wi‑Fi; use a trusted VPN when necessary.' }
    ];
    tipsEl.innerHTML = '';
    tips.forEach(t => {
        const card = document.createElement('div');
        card.className = 'tip-card';
        card.innerHTML = `<div class="tip-title">${t.title}</div><div class="tip-desc">${t.desc}</div>`;
        tipsEl.appendChild(card);
    });
}

// Top Threats (dummy data for now)
async function populateTopThreats() {
    const listEl = document.getElementById('top-threats-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    // Dummy high-priority threats
    const now = Date.now();
    const threats = [
        { target: 'http://malicious.example', type: 'Malicious', timestamp: now - 1000 * 60 * 25 },
        { target: 'http://phish.example/login', type: 'Malicious', timestamp: now - 1000 * 60 * 60 },
        { target: 'user@example.com', type: 'Suspicious', timestamp: now - 1000 * 60 * 90 },
        { target: 'http://suspicious.example', type: 'Suspicious', timestamp: now - 1000 * 60 * 240 }
    ];

    threats.forEach(item => {
        const row = document.createElement('div');
        row.className = 'threat-item';

        const icon = (item.type && /malicious/i.test(item.type)) ? '⚠️' : '🟡';

        row.innerHTML = `
            <div class="threat-left">
                <div class="threat-icon">${icon}</div>
                <div class="threat-body">
                    <div class="threat-target">${item.target}</div>
                    <div class="threat-meta">${item.type} • ${new Date(item.timestamp).toLocaleString()}</div>
                </div>
            </div>
            <div>
                <button class="view-details-btn">View Details</button>
            </div>
        `;

        listEl.appendChild(row);
    });
}

// INITIALIZE
async function initializeApp() {
    // Load persisted UI state first (may include profile picture)
    loadState();

    // Check if user is already logged in
    const token = await PhishNetAPI.getAccessToken();
    if (token) {
        try {
            const response = await PhishNetAPI.getUserProfile();
            state.isLoggedIn = true;
            state.currentUser = {
                name: response.data.firstName && response.data.lastName
                    ? `${response.data.firstName} ${response.data.lastName}`
                    : response.data.name || response.data.email,
                email: response.data.email,
                userId: response.data._id
            };
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
            // Clear invalid tokens
            chrome.storage.local.remove(['accessToken', 'refreshToken']);
        }
    }

    // Pull stored profile picture if present
    await hydrateProfilePictureFromStorage();

    // Seed demo scan data if none exists (useful while API not connected)
    try {
        await seedDummyScans();
    } catch (e) {
        console.warn('Failed to seed dummy scans:', e);
    }

    // Fetch profile picture/settings from backend if available
    if (token && USE_SETTINGS_API) {
        try {
            const settings = await PhishNetAPI.getUserSettings();
            if (settings?.data?.profilePicture) {
                state.currentUser = state.currentUser || {};
                state.currentUser.profilePicture = settings.data.profilePicture;
                chrome.storage.local.set({ [PROFILE_PICTURE_STORAGE_KEY]: settings.data.profilePicture });
                saveState();
                renderUserAvatar();
            }
        } catch (error) {
            console.warn('⚠ Could not fetch user settings/profile picture from backend:', error);
        }
    }

    updateUI();
    renderUserAvatar();
}

initializeApp();

// ============================================
// NOTE: Extension handles login locally
// Signup redirects to website, but user must return to extension to login
// ============================================
