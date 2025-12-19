// PhishNet Extension - Popup JavaScript

const DEMO_EMAIL = 'demo@phishnet.com';
const DEMO_PASSWORD = 'Demo123!';

// PAGE ELEMENTS
const introPage = document.getElementById('intro-page');
const dashboardPage = document.getElementById('dashboard-page');
const premiumPage = document.getElementById('premium-page');

// BUTTONS
const introLoginBtn = document.getElementById('intro-login-btn');
const introSignupBtn = document.getElementById('intro-signup-btn');
const loginSubmitBtn = document.getElementById('login-submit');
const menuToggleBtn = document.getElementById('menu-toggle-btn');
const protectionDial = document.getElementById('protection-dial');
const alwaysOnToggle = document.getElementById('always-on-toggle');
const taglineEl = document.getElementById('tagline');

// MODALS
const loginModal = document.getElementById('login-modal');
const drawer = document.getElementById('menu-drawer');
const whitelistModal = document.getElementById('whitelist-modal');
const settingsModal = document.getElementById('settings-modal');
const bulkScanModal = document.getElementById('bulk-scan-modal');
const threatModal = document.getElementById('threat-modal');
const premiumModal = document.getElementById('premium-modal');
const premiumBackBtn = document.getElementById('premium-back-btn');

// MODAL INPUTS
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

// UI ELEMENTS
const dialStatus = document.getElementById('dial-status');
const timerDisplay = document.getElementById('timer-display');
const usernameDisplay = document.getElementById('username-display');
const toast = document.getElementById('toast');
const whitelistInput = document.getElementById('whitelist-input');
const whitelistAddBtn = document.getElementById('whitelist-add');
const whitelistList = document.getElementById('whitelist-list');

// STATE
let state = {
    isLoggedIn: false,
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

let timerInterval = null;

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
    if (state.isLoggedIn) {
        showPage(dashboardPage);
        usernameDisplay.textContent = 'Demo User';
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

// LOGIN HANDLER
function handleLogin(email, password) {
    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
        state.isLoggedIn = true;
        saveState();
        updateUI();
        closeModal(loginModal);
        showToast('Welcome back, Demo User!');
    } else {
        showToast('Invalid credentials. Use demo@phishnet.com / Demo123!');
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
function handleLogout() {
    state.isLoggedIn = false;
    state.isProtected = false;
    stopTimer();
    saveState();
    updateUI();
    closeDrawer();
    showToast('Logged out successfully');
}

// EVENT LISTENERS - INTRO PAGE
introLoginBtn.addEventListener('click', () => openModal(loginModal));
introSignupBtn.addEventListener('click', () => showToast('Sign up page would open'));

// EVENT LISTENERS - LOGIN
loginSubmitBtn.addEventListener('click', () => {
    handleLogin(emailInput.value, passwordInput.value);
});
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginSubmitBtn.click();
});

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

// EVENT LISTENERS - MENU ITEMS
document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        closeDrawer();
        
        switch(action) {
            case 'dashboard':
                showPage(dashboardPage);
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
                openModal(settingsModal);
                break;
            case 'premium':
                showPage(premiumPage);
                break;
            case 'logout':
                handleLogout();
                break;
        }
    });
});

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

// EVENT LISTENERS - SETTINGS
document.getElementById('scan-urls-toggle').addEventListener('change', (e) => {
    state.settings.scanURLs = e.target.checked;
    saveState();
});

document.getElementById('scan-emails-toggle').addEventListener('change', (e) => {
    state.settings.scanEmails = e.target.checked;
    saveState();
});

document.getElementById('data-sharing-toggle').addEventListener('change', (e) => {
    state.settings.dataSharing = e.target.checked;
    saveState();
});

document.getElementById('auto-submit-toggle').addEventListener('change', (e) => {
    state.settings.autoSubmit = e.target.checked;
    saveState();
});

document.getElementById('notify-toggle').addEventListener('change', (e) => {
    state.settings.desktopNotify = e.target.checked;
    saveState();
});

// INITIALIZE
loadState();
