/* filename: popup.js - Logic for PhishNet Extension Popup (Blue/Black Theme) */

document.addEventListener('DOMContentLoaded', () => {

    // =====================================================================
    // 1. Element Selectors
    // =====================================================================
    const body = document.body;
    const mainToggleBtn = document.getElementById('main-toggle-btn');
    const dialStatusText = document.querySelector('.dial-status-text');
    const timerDisplay = document.getElementById('timer-display');
    const alwaysOnToggle = document.getElementById('always-on-toggle');
    
    // Auth Elements
    const loginBtnHeader = document.getElementById('login-btn-header');
    const signupLinkHeader = document.getElementById('signup-link-header');
    const usernameDisplay = document.getElementById('username-display');
    const logoutBtnDemo = document.getElementById('logout-btn-demo');
    const loginModal = document.getElementById('login-modal');
    const loginSubmitBtn = document.getElementById('login-submit-btn');
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const loginFromGatingBtn = document.getElementById('login-from-gating-btn');

    // Modals & Drawers
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const menuDrawer = document.getElementById('menu-drawer');
    const loginGatingModal = document.getElementById('login-gating-modal');
    const whitelistModal = document.getElementById('whitelist-modal');
    const bulkScanModal = document.getElementById('bulk-scan-modal');
    const settingsModal = document.getElementById('settings-modal');
    const toastNotification = document.getElementById('toast-notification');
    const submitEmailModal = document.getElementById('submit-email-modal');

    // Page Navigation Elements
    const mainContentPage = document.getElementById('main-content');
    const premiumPage = document.getElementById('premium-page');
    const allPages = document.querySelectorAll('.page-view');
    const premiumLink = document.getElementById('premium-link');
    const premiumBackBtn = document.getElementById('premium-back-btn');
    const viewLastReportBtn = document.getElementById('view-last-report-btn');

    // Menu Buttons
    const menuWhitelistBtn = document.getElementById('menu-whitelist-btn');
    const menuBulkScanBtn = document.getElementById('menu-bulk-scan-btn');
    const menuSettingsBtn = document.getElementById('menu-settings-btn');
    const menuSubmitEmailBtn = document.getElementById('menu-submit-email-btn');

    // Whitelist Elements
    const whitelistAddBtn = document.getElementById('whitelist-add-btn');
    const whitelistInput = document.getElementById('whitelist-input');
    const whitelistList = document.getElementById('whitelist-list');
    
    // Bulk Scan Elements
    const bulkUrlsInput = document.getElementById('bulk-urls-input');
    const bulkScanSubmit = document.getElementById('bulk-scan-submit');

    // Email Submit Elements
    const emailContentInput = document.getElementById('email-content-input');
    const emailSubmitBtn = document.getElementById('email-submit-btn');

    // Settings Elements
    const urlScanToggle = document.getElementById('url-scan-toggle');
    const emailScanToggle = document.getElementById('email-scan-toggle');
    const dataSharingToggle = document.getElementById('data-sharing-toggle');
    const autoSubmitToggle = document.getElementById('auto-submit-toggle');
    const desktopNotifyToggle = document.getElementById('desktop-notify-toggle');
    const testNotificationBtn = document.getElementById('test-notification-btn');

    // Legal Links
    const termsLink = document.getElementById('terms-link');
    const privacyLink = document.getElementById('privacy-link');

    // Modal close triggers
    const modalCloseTriggers = document.querySelectorAll('[data-close-modal]');

    // =====================================================================
    // 2. State Management
    // =====================================================================
    
    const defaultState = {
        isLoggedIn: false,
        isProtected: false,
        alwaysOn: false,
        scanURLs: true,
        scanEmails: true,
        timerEndTime: 0,
        firstRun: true,
        whitelist: ["example.com", "my-trusted-site.com"],
        preferences: {
            dataSharing: false,
            autoSubmit: false,
            desktopNotify: true,
        },
        user: {
            username: "demo@phishnet.com",
            name: "Demo User"
        }
    };

    let state = {};
    let timerInterval = null;

    // Demo credentials
    const DEMO_CREDENTIALS = {
        email: 'demo@phishnet.com',
        password: 'Demo123!'
    };

    function loadState() {
        try {
            const storedState = localStorage.getItem('phishNetState');
            state = storedState ? JSON.parse(storedState) : { ...defaultState };
        } catch (e) {
            console.error("Failed to parse state from localStorage:", e);
            state = { ...defaultState };
        }
        
        state = { ...defaultState, ...state, preferences: {...defaultState.preferences, ...state.preferences} };

        updateUI();
        
        if (state.isProtected && !state.alwaysOn && state.timerEndTime > Date.now()) {
            startTimer(true);
        } else if (state.isProtected && !state.alwaysOn && state.timerEndTime <= Date.now()) {
            state.isProtected = false;
            state.timerEndTime = 0;
            saveState();
            updateUI();
        }
    }

    function saveState() {
        try {
            localStorage.setItem('phishNetState', JSON.stringify(state));
        } catch (e) {
            console.error("Failed to save state to localStorage:", e);
        }
    }
    
    function updateUI() {
        body.classList.toggle('logged-in', state.isLoggedIn);
        if (state.isLoggedIn) {
            usernameDisplay.textContent = state.user.name || state.user.username;
        }
        mainToggleBtn.classList.toggle('is-active', state.isProtected);
        mainToggleBtn.setAttribute('aria-checked', state.isProtected);
        dialStatusText.textContent = state.isProtected ? 'ON' : 'OFF';
        timerDisplay.classList.toggle('is-visible', state.isProtected && !state.alwaysOn);
        alwaysOnToggle.checked = state.alwaysOn;
        
        if (urlScanToggle) urlScanToggle.checked = state.scanURLs;
        if (emailScanToggle) emailScanToggle.checked = state.scanEmails;
        if (dataSharingToggle) dataSharingToggle.checked = state.preferences.dataSharing;
        if (autoSubmitToggle) autoSubmitToggle.checked = state.preferences.autoSubmit;
        if (desktopNotifyToggle) desktopNotifyToggle.checked = state.preferences.desktopNotify;
        
        renderWhitelist();
    }

    // =====================================================================
    // 3. Authentication (Demo Login)
    // =====================================================================

    loginBtnHeader.addEventListener('click', () => {
        openModal('login-modal');
    });

    loginSubmitBtn.addEventListener('click', () => {
        const email = loginEmail.value.trim();
        const password = loginPassword.value.trim();

        if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
            state.isLoggedIn = true;
            state.user = {
                username: DEMO_CREDENTIALS.email,
                name: 'Demo User'
            };
            saveState();
            updateUI();
            closeModal('login-modal');
            showToast('Welcome back, Demo User! 🎉');
        } else {
            showToast('Invalid credentials. Use demo@phishnet.com / Demo123!');
        }
    });

    loginFromGatingBtn.addEventListener('click', () => {
        closeModal('login-gating-modal');
        openModal('login-modal');
    });

    logoutBtnDemo.addEventListener('click', () => {
        state.isLoggedIn = false;
        state.isProtected = false;
        stopTimer();
        saveState();
        updateUI();
        closeModal('menu-drawer');
        showToast('Logged out successfully');
    });

    // Allow Enter key in login form
    loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginSubmitBtn.click();
        }
    });

    // =====================================================================
    // 4. Core Functionality (Protection Toggle & Timer)
    // =====================================================================

    mainToggleBtn.addEventListener('click', () => {
        if (!state.isLoggedIn) {
            openModal('login-gating-modal');
            return;
        }
        state.isProtected = !state.isProtected;
        if (state.isProtected) {
            if (!state.alwaysOn) { startTimer(); }
        } else {
            stopTimer();
        }
        saveState();
        updateUI();
    });

    alwaysOnToggle.addEventListener('change', () => {
        state.alwaysOn = alwaysOnToggle.checked;
        if (state.alwaysOn && state.isProtected) {
            stopTimer();
        } else if (!state.alwaysOn && state.isProtected) {
            startTimer();
        }
        saveState();
        updateUI();
    });
    
    function startTimer(resume = false) {
        stopTimer(); 
        if (!resume) {
            state.timerEndTime = Date.now() + (10 * 60 * 1000);
        }
        timerInterval = setInterval(updateTimerDisplay, 1000);
        updateTimerDisplay();
        saveState();
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
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
                showToast("PhishNet paused (auto-off).");
            }
            return;
        }
        const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function showToast(message) {
        const toastMessage = document.getElementById('toast-message');
        if (toastMessage) toastMessage.textContent = message;
        toastNotification.classList.remove('hidden');
        setTimeout(() => {
            toastNotification.classList.add('hidden');
        }, 3000);
    }

    // =====================================================================
    // 5. Page & Modal Management
    // =====================================================================
    
    function showPage(pageId) {
        allPages.forEach(page => {
            page.classList.add('hidden');
        });
        const pageToShow = document.getElementById(pageId);
        if (pageToShow) {
            pageToShow.classList.remove('hidden');
            pageToShow.focus();
        }
    }
    
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            const firstFocusable = modal.querySelector('button, [href], input, select, textarea');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    modalCloseTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-container, .drawer-container');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal-container:not(.hidden), .drawer-container:not(.hidden)');
            if (openModal) {
                closeModal(openModal.id);
            }
        }
    });
    
    menuToggleBtn.addEventListener('click', () => {
        showPage('main-content');
        openModal('menu-drawer');
    });

    premiumLink.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('menu-drawer');
        showPage('premium-page');
    });

    premiumBackBtn.addEventListener('click', () => {
        showPage('main-content');
    });

    menuWhitelistBtn.addEventListener('click', () => {
        showPage('main-content');
        closeModal('menu-drawer');
        openModal('whitelist-modal');
    });
    
    menuBulkScanBtn.addEventListener('click', () => {
        showPage('main-content');
        closeModal('menu-drawer');
        openModal('bulk-scan-modal');
    });

    menuSubmitEmailBtn.addEventListener('click', () => {
        showPage('main-content');
        closeModal('menu-drawer');
        openModal('submit-email-modal');
    });

    menuSettingsBtn.addEventListener('click', () => {
        showPage('main-content');
        closeModal('menu-drawer');
        openModal('settings-modal');
    });

    // =====================================================================
    // 6. Whitelist Management
    // =====================================================================

    whitelistAddBtn.addEventListener('click', () => {
        const domain = whitelistInput.value.trim();
        if (domain && !state.whitelist.includes(domain)) {
            state.whitelist.push(domain);
            whitelistInput.value = '';
            saveState();
            renderWhitelist();
            showToast(`${domain} added to whitelist`);
        }
    });

    function renderWhitelist() {
        whitelistList.innerHTML = state.whitelist.map((domain, idx) => `
            <li>
                <span>${domain}</span>
                <button class="remove-btn" onclick="removeWhitelistItem(${idx})" aria-label="Remove ${domain}">×</button>
            </li>
        `).join('');
    }

    window.removeWhitelistItem = (idx) => {
        state.whitelist.splice(idx, 1);
        saveState();
        renderWhitelist();
        showToast("Domain removed from whitelist");
    };

    // =====================================================================
    // 7. Bulk Scan
    // =====================================================================

    bulkScanSubmit.addEventListener('click', () => {
        const urls = bulkUrlsInput.value.split('\n').filter(u => u.trim());
        if (urls.length > 0) {
            showToast(`Queued ${urls.length} URLs for scanning`);
            bulkUrlsInput.value = '';
            closeModal('bulk-scan-modal');
        }
    });

    // =====================================================================
    // 8. Email Submit
    // =====================================================================

    emailSubmitBtn.addEventListener('click', () => {
        const content = emailContentInput.value.trim();
        if (content) {
            showToast("Threat report submitted for analysis");
            emailContentInput.value = '';
            closeModal('submit-email-modal');
        }
    });

    // =====================================================================
    // 9. Settings
    // =====================================================================

    if (urlScanToggle) {
        urlScanToggle.addEventListener('change', () => {
            state.scanURLs = urlScanToggle.checked;
            saveState();
        });
    }

    if (emailScanToggle) {
        emailScanToggle.addEventListener('change', () => {
            state.scanEmails = emailScanToggle.checked;
            saveState();
        });
    }

    if (dataSharingToggle) {
        dataSharingToggle.addEventListener('change', () => {
            state.preferences.dataSharing = dataSharingToggle.checked;
            saveState();
        });
    }

    if (autoSubmitToggle) {
        autoSubmitToggle.addEventListener('change', () => {
            state.preferences.autoSubmit = autoSubmitToggle.checked;
            saveState();
        });
    }

    if (desktopNotifyToggle) {
        desktopNotifyToggle.addEventListener('change', () => {
            state.preferences.desktopNotify = desktopNotifyToggle.checked;
            saveState();
        });
    }

    if (testNotificationBtn) {
        testNotificationBtn.addEventListener('click', () => {
            showToast("Test notification - Extension is working!");
        });
    }

    // =====================================================================
    // 10. Initialize
    // =====================================================================

    loadState();
});
