// Warning page logic (moved from inline to satisfy CSP)
let targetUrl = '';
let verdict = '';
let tabId = null;

function setVerdictText(v) {
    const pill = document.getElementById('verdict-pill');
    if (!pill) return;
    if (!v) {
        pill.textContent = 'Analyzing...';
        return;
    }
    const label = v === 'MALICIOUS' ? 'Malicious site blocked' : v === 'SUSPICIOUS' ? 'Suspicious site flagged' : 'Warning';
    pill.textContent = label;
}

function setTarget(urlText) {
    const box = document.getElementById('target-url');
    if (box) box.textContent = urlText || 'Unknown URL';
}

function readQuery() {
    const params = new URLSearchParams(location.search);
    const url = params.get('url');
    const v = params.get('verdict');
    const tab = params.get('tabId');
    return { url, verdict: v, tabId: tab ? Number(tab) : null };
}

function disableButtons() {
    document.querySelectorAll('.btn').forEach((btn) => {
        btn.disabled = true;
        btn.style.opacity = '0.7';
        btn.style.cursor = 'not-allowed';
    });
}

function sendDecision(decision) {
    if (!targetUrl) return;
    const statusEl = document.getElementById('status-text');
    chrome.runtime.sendMessage({ type: 'warning-decision', decision, url: targetUrl, tabId }, (response) => {
        if (decision === 'continue') {
            // Continue navigates to the site (background handles this)
            return;
        }
        
        if (decision === 'stay_safe') {
            // Show blocked message while background navigates back
            if (statusEl) statusEl.textContent = 'Navigation blocked. Going back...';
            disableButtons();
            // Background worker will handle the navigation back
        }
    });
}

function hydrateFromBackground() {
    chrome.runtime.sendMessage({ type: 'warning-page-ready', tabId }, (res) => {
        const fallback = readQuery();
        targetUrl = res?.url || fallback.url || targetUrl;
        verdict = res?.verdict || fallback.verdict || verdict;
        tabId = res?.tabId ?? fallback.tabId ?? tabId;
        setVerdictText(verdict);
        setTarget(targetUrl);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize from query immediately (so the URL shows fast)
    const initial = readQuery();
    targetUrl = initial.url || '';
    verdict = initial.verdict || '';
    tabId = initial.tabId;
    setTarget(targetUrl);
    setVerdictText(verdict);

    // Then fetch freshest data from background
    hydrateFromBackground();
    const continueBtn = document.getElementById('continue-btn');
    const staySafeBtn = document.getElementById('stay-safe-btn');
    if (continueBtn) continueBtn.addEventListener('click', () => sendDecision('continue'));
    if (staySafeBtn) staySafeBtn.addEventListener('click', () => sendDecision('stay_safe'));
});
