// Background service worker for Safe Browsing navigation checks
const PROTECTION_STORAGE_KEY = 'phishnetProtectionState';
const SCAN_HISTORY_KEY = 'phishnetScanHistory';
const MAX_SCAN_HISTORY = 50; // Keep last 50 scans
const SCAN_ENDPOINT = 'http://localhost:5000/api/v1/urls/scan';
const SCAN_TIMEOUT_MS = 3000;
const SCAN_CACHE_TTL_MS = 300000; // 5 minutes

let protectionState = { isProtected: false, alwaysOn: false };
const allowOnceByTab = new Map();
const pendingWarningByTab = new Map();
const scanCache = new Map(); // Cache: url -> { status, timestamp }

init();

function init() {
    chrome.storage.local.get([PROTECTION_STORAGE_KEY], (res) => {
        applyProtectionState(res?.[PROTECTION_STORAGE_KEY]);
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;
        if (changes[PROTECTION_STORAGE_KEY]) {
            applyProtectionState(changes[PROTECTION_STORAGE_KEY].newValue);
        }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message?.type === 'phishnet.protection-state') {
            applyProtectionState(message.payload);
            sendResponse?.({ ok: true });
            return;
        }

        if (message?.type === 'warning-page-ready') {
            const tabId = sender?.tab?.id ?? message.tabId;
            const pending = tabId ? pendingWarningByTab.get(tabId) : null;
            sendResponse?.({ url: pending?.url || null, verdict: pending?.verdict || null, tabId: tabId || null });
            return;
        }

        if (message?.type === 'warning-decision') {
            const tabId = sender?.tab?.id ?? message.tabId;
            if (!tabId) {
                sendResponse?.({ ok: false, reason: 'missing-tab' });
                return;
            }

            const { decision, url } = message;
            pendingWarningByTab.delete(tabId);

            if (decision === 'continue' && url) {
                allowOnceByTab.set(tabId, url);
                chrome.tabs.update(tabId, { url });
            }

            if (decision === 'stay_safe') {
                // Keep the user on the warning page; nothing else to do.
            }

            sendResponse?.({ ok: true });
            return true;
        }
    });

    chrome.webNavigation.onBeforeNavigate.addListener(handleNavigation);
}

function applyProtectionState(payload) {
    if (!payload || typeof payload !== 'object') return;
    protectionState.isProtected = !!payload.isProtected;
    protectionState.alwaysOn = !!payload.alwaysOn;
}

async function handleNavigation(details) {
    try {
        if (!protectionState.isProtected) return;
        if (details.frameId !== 0) return;
        const targetUrl = details.url || '';
        if (shouldIgnoreUrl(targetUrl)) return;

        const allowKey = allowOnceByTab.get(details.tabId);
        if (allowKey && allowKey === targetUrl) {
            console.log('[PhishNet] Allowed once for:', targetUrl);
            allowOnceByTab.delete(details.tabId);
            return;
        }

        const existing = pendingWarningByTab.get(details.tabId);
        if (existing && existing.url === targetUrl) {
            console.log('[PhishNet] Warning already pending for:', targetUrl);
            return;
        }

        // Check cache first
        const cached = scanCache.get(targetUrl);
        if (cached && Date.now() - cached.timestamp < SCAN_CACHE_TTL_MS) {
            console.log('[PhishNet] Cache hit for:', targetUrl, '→', cached.status);
            if (cached.status === 'SAFE') return;
            pendingWarningByTab.set(details.tabId, { url: targetUrl, verdict: cached.status });
            const warningUrl = buildWarningPageUrl(targetUrl, cached.status, details.tabId);
            chrome.tabs.update(details.tabId, { url: warningUrl });
            return;
        }

        console.log('[PhishNet] Scanning:', targetUrl);
        const verdict = await scanUrl(targetUrl);
        const status = verdict?.status || 'SAFE';
        
        // Cache result
        scanCache.set(targetUrl, { status, timestamp: Date.now() });
        console.log('[PhishNet] Scan result:', status);
        
        // Save to scan history for security insights
        await saveScanResult({
            url: targetUrl,
            result: status,
            threats: verdict?.threats || [],
            timestamp: Date.now()
        });
        
        if (status === 'SAFE') return;

        pendingWarningByTab.set(details.tabId, { url: targetUrl, verdict: status });
        const warningUrl = buildWarningPageUrl(targetUrl, status, details.tabId);
        console.log('[PhishNet] Redirecting to warning page:', warningUrl);
        chrome.tabs.update(details.tabId, { url: warningUrl });
    } catch (err) {
        console.warn('[PhishNet] Navigation scan failed (allowing safe passage):', err);
        // On scan error, allow navigation to proceed (don't block)
    }
}

function shouldIgnoreUrl(url) {
    try {
        const parsed = new URL(url);
        if (parsed.protocol === 'chrome:' || parsed.protocol === 'edge:' || parsed.protocol === 'about:') return true;
        if (parsed.protocol === 'chrome-extension:') return true;
        if (parsed.hostname === 'localhost' && parsed.pathname.startsWith('/_')) return true;
        return false;
    } catch (e) {
        return true;
    }
}

async function scanUrl(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

    try {
        const headers = { 'Content-Type': 'application/json' };
        const token = await getAccessToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        console.log('[PhishNet] Calling scan endpoint for:', url);
        const resp = await fetch(SCAN_ENDPOINT, {
            method: 'POST',
            headers,
            body: JSON.stringify({ url }),
            signal: controller.signal
        });

        if (!resp.ok) {
            console.warn('[PhishNet] Scan returned status:', resp.status);
            throw new Error(`Scan failed: ${resp.status}`);
        }
        
        const data = await resp.json();
        console.log('[PhishNet] Scan response:', data);
        return data;
    } catch (err) {
        console.error('[PhishNet] Scan error:', err?.message || err);
        // Return safe status on error (fail open, don't block user)
        return { status: 'SAFE', threats: [] };
    } finally {
        clearTimeout(timeout);
    }
}

function getAccessToken() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['accessToken'], (result) => {
            resolve(result?.accessToken || null);
        });
    });
}

function buildWarningPageUrl(url, verdict, tabId) {
    const base = chrome.runtime.getURL('warning.html');
    const params = new URLSearchParams();
    params.set('url', url);
    params.set('verdict', verdict);
    if (tabId !== undefined && tabId !== null) params.set('tabId', tabId);
    return `${base}?${params.toString()}`;
}

async function saveScanResult(result) {
    return new Promise((resolve) => {
        chrome.storage.local.get([SCAN_HISTORY_KEY], (res) => {
            let history = res?.[SCAN_HISTORY_KEY] || [];
            if (!Array.isArray(history)) history = [];
            
            // Add new result to the top
            history.unshift(result);
            
            // Keep only last MAX_SCAN_HISTORY items
            if (history.length > MAX_SCAN_HISTORY) {
                history = history.slice(0, MAX_SCAN_HISTORY);
            }
            
            chrome.storage.local.set({ [SCAN_HISTORY_KEY]: history }, () => {
                console.log('[PhishNet] Saved scan result. Total history:', history.length);
                resolve();
            });
        });
    });
}
