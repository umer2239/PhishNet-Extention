/* filename: popup.js - Logic for PhishNet Extension Popup (Minimal Update) */

document.addEventListener('DOMContentLoaded', () => {

    // =====================================================================
    // 1. Element Selectors (SIMPLIFIED)
    // =====================================================================
    const body = document.body;
    const mainToggleBtn = document.getElementById('main-toggle-btn');
    const dialStatusText = document.querySelector('.dial-status-text');
    const timerDisplay = document.getElementById('timer-display');
    const alwaysOnToggle = document.getElementById('always-on-toggle');
    
    // Auth Elements
    const loginLinkHeader = document.getElementById('login-link-header');
    const signupLinkHeader = document.getElementById('signup-link-header');
    const usernameDisplay = document.getElementById('username-display');
    const logoutBtnDemo = document.getElementById('logout-btn-demo');

    // Modals & Drawers
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const menuDrawer = document.getElementById('menu-drawer');
    const loginGatingModal = document.getElementById('login-gating-modal');
    const whitelistModal = document.getElementById('whitelist-modal');
    const bulkScanModal = document.getElementById('bulk-scan-modal');
    const settingsModal = document.getElementById('settings-modal');
    const onboardingModal = document.getElementById('onboarding-modal');
    const toastNotification = document.getElementById('toast-notification');
    const submitEmailModal = document.getElementById('submit-email-modal');

    // Page Navigation Elements
    const mainContentPage = document.getElementById('main-content');
    const premiumPage = document.getElementById('premium-page');
    const allPages = document.querySelectorAll('.page-view');
    const premiumLink = document.getElementById('premium-link');
    const premiumBackBtn = document.getElementById('premium-back-btn');
    const viewLastReportBtn = document.getElementById('view-last-report-btn'); // In menu

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
    const urlScanToggle = document.getElementById('url-scan-toggle'); // Moved
    const emailScanToggle = document.getElementById('email-scan-toggle'); // Moved
    const dataSharingToggle = document.getElementById('data-sharing-toggle');
    const autoSubmitToggle = document.getElementById('auto-submit-toggle');
    const desktopNotifyToggle = document.getElementById('desktop-notify-toggle');
    const testNotificationBtn = document.getElementById('test-notification-btn');

    // Onboarding Elements
    const onboardingNextBtn = document.getElementById('onboarding-next-btn');
    const dontShowOnboarding = document.getElementById('dont-show-onboarding');
    
    // Legal Links (Demo URLs)
    const termsLink = document.getElementById('terms-link');
    const privacyLink = document.getElementById('privacy-link');

    // Modal close triggers
    const modalCloseTriggers = document.querySelectorAll('[data-close-modal]');

    // =====================================================================
    // 2. State Management (Demo using localStorage)
    // =====================================================================
    
    const DEMO_API_URL = 'https://phishnet.example.com/api/v1';

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
            username: "demo@user.com"
        }
    };

    let state = {};
    let timerInterval = null;

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
            startTimer(true); // Resume timer
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
        
        // PRODUCTION: Persist preferences to backend
        /*
        const payload = {
            alwaysOn: state.alwaysOn,
            scanURLs: state.scanURLs,
            scanEmails: state.scanEmails,
            preferences: state.preferences
        };
        fetch(`${DEMO_API_URL}/user/preferences`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ...' },
            body: JSON.stringify(payload)
        }).catch(console.error);
        */
    }
    
    function updateUI() {
        body.classList.toggle('logged-in', state.isLoggedIn);
        if (state.isLoggedIn) {
            usernameDisplay.textContent = state.user.username;
        }
        mainToggleBtn.classList.toggle('is-active', state.isProtected);
        mainToggleBtn.setAttribute('aria-checked', state.isProtected);
        dialStatusText.textContent = state.isProtected ? 'ON' : 'OFF';
        timerDisplay.classList.toggle('is-visible', state.isProtected && !state.alwaysOn);
        alwaysOnToggle.checked = state.alwaysOn;
        
        // Update toggles inside settings modal
        urlScanToggle.checked = state.scanURLs;
        emailScanToggle.checked = state.scanEmails;
        dataSharingToggle.checked = state.preferences.dataSharing;
        autoSubmitToggle.checked = state.preferences.autoSubmit;
        desktopNotifyToggle.checked = state.preferences.desktopNotify;
        
        renderWhitelist();
    }

    // =====================================================================
    // 3. Core Functionality (Protection Toggle & Timer)
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
    
    // --- Timer Functions ---
    function startTimer(resume = false) {
        stopTimer(); 
        if (!resume) {
            state.timerEndTime = Date.now() + (10 * 60 * 1000); // 10 minutes
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
        toastMessage.textContent = message;
        toastNotification.classList.remove('hidden');
        setTimeout(() => {
            toastNotification.classList.add('hidden');
        }, 3000);
    }

    // =====================================================================
    // 4. Page & Modal Management
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
    
    // --- Menu Navigation ---
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
    // 5. Auth & Onboarding (Demo)
    // =====================================================================

    logoutBtnDemo.addEventListener('click', () => {
        state.isLoggedIn = false;
        state.isProtected = false;
        stopTimer();
        saveState();
        updateUI();
        closeModal('menu-drawer');
    });

    loginLinkHeader.addEventListener('click', (e) => {
        e.preventDefault();
        if (!state.isLoggedIn) {
            state.isLoggedIn = true;
            state.user.username = "demo@user.com";
            saveState();
            updateUI();
        }
    });

    if (state.firstRun) {
        openModal('onboarding-modal');
        let currentStep = 1;
        const totalSteps = 3;
        
        onboardingNextBtn.addEventListener('click', () => {
            document.getElementById(`onboarding-step-${currentStep}`).classList.add('hidden');
            currentStep++;
            if (currentStep > totalSteps) {
                state.firstRun = !dontShowOnboarding.checked;
                saveState();
                closeModal('onboarding-modal');
            } else {
                document.getElementById(`onboarding-step-${currentStep}`).classList.remove('hidden');
                if (currentStep === totalSteps) {
                    onboardingNextBtn.textContent = "Finish";
                }
            }
        });
    }

    // =====================================================================
    // 6. Feature Implementation (Whitelist, Bulk Scan, Settings, etc.)
    // =====================================================================

    // --- Whitelist ---
    function renderWhitelist() {
        whitelistList.innerHTML = '';
        if (state.whitelist.length === 0) {
            whitelistList.innerHTML = '<li class="empty-list-item">No domains whitelisted.</li>';
        }
        state.whitelist.forEach((domain, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${domain}</span>
                <button class="icon-btn remove-btn" data-index="${index}" aria-label="Remove ${domain} from whitelist">&times;</button>
            `;
            whitelistList.appendChild(li);
        });
    }
    whitelistAddBtn.addEventListener('click', () => {
        const domain = whitelistInput.value.trim();
        if (domain && !state.whitelist.includes(domain)) {
            state.whitelist.push(domain);
            saveState();
            renderWhitelist();
            whitelistInput.value = '';
        }
    });
    whitelistList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-btn')) {
            const index = parseInt(e.target.dataset.index, 10);
            state.whitelist.splice(index, 1);
            saveState();
            renderWhitelist();
        }
    });

    // --- Bulk Scan ---
    bulkScanSubmit.addEventListener('click', () => {
        const urls = bulkUrlsInput.value.trim().split('\n').filter(Boolean);
        if (urls.length > 0) {
            showToast(`Queued ${urls.length} URLs for scanning.`);
            console.log("Queued URLs:", urls);
            bulkUrlsInput.value = '';
            closeModal('bulk-scan-modal');
        }
    });

    // --- Submit Email ---
    emailSubmitBtn.addEventListener('click', () => {
        const emailContent = emailContentInput.value.trim();
        if (emailContent) {
            showToast(`Threat submitted for analysis.`);
            console.log("Submitted Content:", emailContent);
            emailContentInput.value = '';
            closeModal('submit-email-modal');
        }
    });

    // --- In-Popup Settings Toggles ---
    urlScanToggle.addEventListener('change', () => {
        state.scanURLs = urlScanToggle.checked;
        saveState();
    });

    emailScanToggle.addEventListener('change', () => {
        state.scanEmails = emailScanToggle.checked;
        saveState();
    });
    dataSharingToggle.addEventListener('change', () => {
        state.preferences.dataSharing = dataSharingToggle.checked;
        saveState();
    });
    autoSubmitToggle.addEventListener('change', () => {
        state.preferences.autoSubmit = autoSubmitToggle.checked;
        saveState();
    });
    desktopNotifyToggle.addEventListener('change', () => {
        state.preferences.desktopNotify = desktopNotifyToggle.checked;
        saveState();
        if(state.preferences.desktopNotify) {
            Notification.requestPermission();
        }
    });

    // --- Desktop Notification Demo ---
    testNotificationBtn.addEventListener('click', () => {
        const notificationTitle = "PhishNet Test";
        const notificationOptions = {
            body: "This is a test notification. PhishNet is working!",
            icon: "icons/icon-128.png"
        };
        if (!("Notification"in window)) {
            alert("This browser does not support desktop notification");
        } else if (Notification.permission === "granted") {
            new Notification(notificationTitle, notificationOptions);
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then((permission) => {
                if (permission === "granted") {
                    new Notification(notificationTitle, notificationOptions);
                }
            });
        }
    });
    
    // --- Set Demo Links ---
    const DEMO_URL = 'about:blank';
    loginLinkHeader.href = `${DEMO_URL}?action=login`;
    signupLinkHeader.href = `${DEMO_URL}?action=signup`;
    termsLink.href = `${DEMO_URL}?page=terms`;
    privacyLink.href = `${DEMO_URL}?page=privacy`;
    viewLastReportBtn.href = `${DEMO_URL}?page=reports`;
    
    // =====================================================================
    // 8. Initial Load
    // =====================================================================
    loadState();
});