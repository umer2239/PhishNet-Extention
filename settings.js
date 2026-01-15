// PhishNet Extension - Settings Page JavaScript

console.log('📄 settings.js loaded!');

// Use page references exposed by popup.js
const { settingsPage, dashboardPage } = window.__phishnetPages || {};

// Back button (local reference)
const settingsBackBtn = document.getElementById('settings-back-btn');

// Profile Elements
const profilePictureInput = document.getElementById('profile-picture-input');
const profilePictureBtn = document.getElementById('profile-picture-btn');
const profilePicture = document.getElementById('profile-picture');
const profileNameInput = document.getElementById('profile-name');
const profileEmailInput = document.getElementById('profile-email');
const profileSaveBtn = document.getElementById('profile-save-btn');

// Scanning Settings
const scanUrlsToggle = document.getElementById('scan-urls-toggle-page');
const scanEmailsToggle = document.getElementById('scan-emails-toggle-page');
const realTimeProtectionToggle = document.getElementById('real-time-protection-toggle');

// Privacy Settings
const dataSharingToggle = document.getElementById('data-sharing-toggle-page');
const autoSubmitToggle = document.getElementById('auto-submit-toggle-page');

// Notification Settings
const notifyToggle = document.getElementById('notify-toggle-page');
const emailAlertsToggle = document.getElementById('email-alerts-toggle-page');
const weeklyReportToggle = document.getElementById('weekly-report-toggle-page');

// Advanced Settings
const blockPopUpsToggle = document.getElementById('block-pop-ups-toggle');
const safeSearchToggle = document.getElementById('safe-search-toggle');

// Save All Settings Button
const settingsSaveAllBtn = document.getElementById('settings-save-all-btn');

// Storage Keys
const SETTINGS_STORAGE_KEY = 'phishnetSettings';
const USER_PROFILE_STORAGE_KEY = 'phishnetUserProfile';
const PROFILE_PICTURE_STORAGE_KEY = 'phishnetProfilePicture';

// Initialize Settings Page
async function initializeSettingsPage() {
    console.log('🔧 Initializing Settings Page...');
    
    // Load user profile data
    await loadUserProfile();
    
    // Load saved settings
    await loadSettings();
    
    // Setup event listeners
    setupSettingsEventListeners();
    
    console.log('✓ Settings Page Initialized');
}

// Load User Profile
async function loadUserProfile() {
    let userData = null;
    try {
        console.log('📋 Loading user profile...');
        const profile = await PhishNetAPI.getUserProfile();
        if (profile && profile.data) {
            userData = profile.data;
            console.log('✓ User profile loaded from API');
        }
    } catch (error) {
        console.warn('⚠ Could not load profile from API, trying local storage:', error);
    }

    if (!userData) {
        const stored = await new Promise((resolve) => {
            chrome.storage.local.get([USER_PROFILE_STORAGE_KEY], (result) => {
                resolve(result[USER_PROFILE_STORAGE_KEY]);
            });
        });
        if (stored) {
            userData = stored;
            console.log('✓ User profile loaded from local storage');
        }
    }

    if (!userData && window.__phishnetState?.currentUser) {
        userData = window.__phishnetState.currentUser;
        console.log('✓ User profile loaded from popup state');
    }

    if (userData) {
        if (userData.name) profileNameInput.value = userData.name;
        if (userData.email) profileEmailInput.value = userData.email;

        // Store profile locally for future loads
        await chrome.storage.local.set({
            [USER_PROFILE_STORAGE_KEY]: {
                name: userData.name || '',
                email: userData.email || ''
            }
        });
    } else {
        console.log('⚠ No user profile found');
    }
    
    // Load profile picture from storage
    const stored = await new Promise((resolve) => {
        chrome.storage.local.get([PROFILE_PICTURE_STORAGE_KEY], (result) => {
            resolve(result[PROFILE_PICTURE_STORAGE_KEY]);
        });
    });
    
    if (stored) {
        const img = document.createElement('img');
        img.src = stored;
        profilePicture.innerHTML = '';
        profilePicture.appendChild(img);
        console.log('✓ Profile picture loaded');
    }
}

// Load Settings from Storage
async function loadSettings() {
    console.log('⚙️ Loading settings from storage...');
    
    const stored = await new Promise((resolve) => {
        chrome.storage.local.get([SETTINGS_STORAGE_KEY], (result) => {
            resolve(result[SETTINGS_STORAGE_KEY] || {});
        });
    });
    
    // Apply saved settings to toggles with defaults
    scanUrlsToggle.checked = stored.scanUrls !== undefined ? stored.scanUrls : true;
    scanEmailsToggle.checked = stored.scanEmails !== undefined ? stored.scanEmails : true;
    realTimeProtectionToggle.checked = stored.realTimeProtection !== undefined ? stored.realTimeProtection : false;
    
    dataSharingToggle.checked = stored.dataSharing !== undefined ? stored.dataSharing : false;
    autoSubmitToggle.checked = stored.autoSubmit !== undefined ? stored.autoSubmit : false;
    
    notifyToggle.checked = stored.notifications !== undefined ? stored.notifications : true;
    emailAlertsToggle.checked = stored.emailAlerts !== undefined ? stored.emailAlerts : false;
    weeklyReportToggle.checked = stored.weeklyReport !== undefined ? stored.weeklyReport : false;
    
    blockPopUpsToggle.checked = stored.blockPopUps !== undefined ? stored.blockPopUps : false;
    safeSearchToggle.checked = stored.safeSearch !== undefined ? stored.safeSearch : true;
    
    console.log('✓ Settings loaded:', stored);
}

// Setup Event Listeners
function setupSettingsEventListeners() {
    // Back button
    if (settingsBackBtn) {
        settingsBackBtn.addEventListener('click', () => {
            if (typeof window.showPage === 'function' && dashboardPage) {
                window.showPage(dashboardPage);
            } else {
                console.warn('⚠ Unable to navigate back: showPage or dashboardPage missing');
            }
        });
    } else {
        console.warn('⚠ settingsBackBtn not found');
    }
    
    // Profile picture upload
    if (profilePictureBtn) {
        profilePictureBtn.addEventListener('click', () => {
            profilePictureInput.click();
        });
    }
    
    if (profilePictureInput) {
        profilePictureInput.addEventListener('change', (e) => {
            handleProfilePictureUpload(e);
        });
    }
    
    // Profile save button
    if (profileSaveBtn) {
        profileSaveBtn.addEventListener('click', () => {
            saveProfileChanges();
        });
    }
    
    // Settings save all button
    if (settingsSaveAllBtn) {
        settingsSaveAllBtn.addEventListener('click', () => {
            saveAllSettings();
        });
    }
}

// Handle Profile Picture Upload
function handleProfilePictureUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file size (max 1MB)
    if (file.size > 1024 * 1024) {
        showToast('Profile picture must be less than 1MB');
        return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageData = e.target.result;
        
        // Display the image
        const img = document.createElement('img');
        img.src = imageData;
        profilePicture.innerHTML = '';
        profilePicture.appendChild(img);
        
        // Store locally (we'll save to backend when user clicks Save Profile)
        chrome.storage.local.set({
            [PROFILE_PICTURE_STORAGE_KEY]: imageData
        });
        
        console.log('✓ Profile picture selected');
    };
    reader.readAsDataURL(file);
}

// Save Profile Changes
async function saveProfileChanges() {
    try {
        const name = profileNameInput.value.trim();
        
        if (!name) {
            showToast('Please enter your name');
            return;
        }
        
        // Show saving state
        profileSaveBtn.disabled = true;
        profileSaveBtn.textContent = 'Saving...';
        
        // Prepare update data
        const updateData = {
            name: name
        };
        
        // Try to update via API
        try {
            const response = await PhishNetAPI.request('/users/me', {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });
            
            console.log('✓ Profile updated on server:', response);
        } catch (error) {
            console.warn('⚠ Could not update profile on server:', error);
            // Continue - we'll still save locally
        }
        
        // Store profile locally
        const profile = {
            name: name,
            email: profileEmailInput.value
        };
        
        await chrome.storage.local.set({
            [USER_PROFILE_STORAGE_KEY]: profile
        });

        // Sync to popup state and persist UI state
        if (window.__phishnetState) {
            window.__phishnetState.currentUser = {
                ...(window.__phishnetState.currentUser || {}),
                name: name,
                email: profileEmailInput.value
            };
            if (typeof window.saveState === 'function') {
                window.saveState();
            }
        }
        
        showToast('Profile saved successfully! ✓');
        console.log('✓ Profile changes saved');
        
    } catch (error) {
        console.error('❌ Error saving profile:', error);
        showToast('Error saving profile. Please try again.');
    } finally {
        profileSaveBtn.disabled = false;
        profileSaveBtn.textContent = 'Save Profile Changes';
    }
}

// Save All Settings
async function saveAllSettings() {
    try {
        // Show saving state
        settingsSaveAllBtn.disabled = true;
        settingsSaveAllBtn.textContent = 'Saving...';
        
        // Collect all settings
        const settings = {
            // Scanning
            scanUrls: scanUrlsToggle.checked,
            scanEmails: scanEmailsToggle.checked,
            realTimeProtection: realTimeProtectionToggle.checked,
            
            // Privacy
            dataSharing: dataSharingToggle.checked,
            autoSubmit: autoSubmitToggle.checked,
            
            // Notifications
            notifications: notifyToggle.checked,
            emailAlerts: emailAlertsToggle.checked,
            weeklyReport: weeklyReportToggle.checked,
            
            // Advanced
            blockPopUps: blockPopUpsToggle.checked,
            safeSearch: safeSearchToggle.checked,
            
            // Metadata
            lastUpdated: new Date().toISOString()
        };
        
        // Save to local storage
        await chrome.storage.local.set({
            [SETTINGS_STORAGE_KEY]: settings
        });
        
        // Try to sync with backend
        try {
            const response = await PhishNetAPI.request('/users/settings', {
                method: 'POST',
                body: JSON.stringify(settings)
            });
            console.log('✓ Settings synced with backend:', response);
        } catch (error) {
            console.warn('⚠ Could not sync settings with backend:', error);
            // Settings are still saved locally, that's okay
        }
        
        showToast('All settings saved successfully! ✓');
        console.log('✓ All settings saved:', settings);
        
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        showToast('Error saving settings. Please try again.');
    } finally {
        settingsSaveAllBtn.disabled = false;
        settingsSaveAllBtn.textContent = 'Save All Settings';
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Check if API is available (it should be from popup.js)
    if (typeof PhishNetAPI !== 'undefined' && typeof showPage !== 'undefined' && typeof showToast !== 'undefined') {
        initializeSettingsPage();
    } else {
        console.warn('⚠ Required dependencies not available yet');
        // Try again after a short delay
        setTimeout(initializeSettingsPage, 500);
    }
});

// Export initialization function for use by popup.js
window.settingsPageInit = initializeSettingsPage;
