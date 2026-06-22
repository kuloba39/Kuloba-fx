// ================================================================
// BTRADERHUB app.js — Complete rewrite
// Amy-verified PKCE flow + global bot bar + all features
// DERIV_APP_ID declared ONCE here only. Never in index.html.
// ================================================================

const DERIV_CLIENT_ID = "33ByqD0GecGTE5whirko8";
const DERIV_APP_ID    = "33ByqD0GecGTE5whirko8";
const DERIV_REDIRECT  = "https://btraderhub.vercel.app/";

// ----------------------------------------------------------------
// Global state
// ----------------------------------------------------------------
let derivWS        = null;
let accessToken    = null;
let accountId      = null;
let isReconnecting = false;

// Bot state
let isBotRunning    = false;
let currentStake    = 0;
let totalProfitLoss = 0;
let totalRuns       = 0;
let totalWins       = 0;
let currentStreak   = 0;
let peakExposure    = 0;
let lastContractId  = null;
let slaveAccounts   = [];

// Digit tracker
let digitCounts = new Array(10).fill(0);
let totalTicks  = 0;

// Stats
let stats = { wins: 0, losses: 0, totalProfit: 0 };

// Audio
const winAudio  = new Audio('https://actions.google.com/sounds/v1/cartoon/slide_whistle_up.ogg');
const lossAudio = new Audio('https://actions.google.com/sounds/v1/cartoon/boing_long.ogg');

// ================================================================
// PAGE LOAD — single entry point
// ================================================================
window.addEventListener('load', async () => {
    populateAssetDropdown();
    initializeStandaloneChart("OANDA:XAUUSD");

    // Check if Deriv redirected back with auth code
    const params = new URLSearchParams(window.location.search);
    const code   = params.get('code');
    const state  = params.get('state');

    if (code && state) {
        window.history.replaceState({}, document.title, window.location.pathname);
        await handleOAuthCallback(code, state);
    }
});

// ================================================================
// TAB NAVIGATION
// ================================================================
function switchTab(tabId) {
    // Hide all panes
    document.querySelectorAll('.tab-pane').forEach(p => {
        p.style.display = 'none';
    });
    // Reset all tab buttons
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.className = "tab-btn px-4 py-1.5 rounded text-sm font-medium transition text-gray-600 hover:bg-gray-100 whitespace-nowrap";
    });

    // Show selected pane
    const pane = document.getElementById(tabId + '-pane');
    const btn  = document.getElementById('tab-btn-' + tabId);

    if (pane) {
        if (tabId === 'bot-builder' || tabId === 'charts') {
            pane.style.display = 'flex';
        } else {
            pane.style.display = 'block';
        }
    }
    if (btn) {
        btn.className = "tab-btn px-4 py-1.5 rounded text-sm font-medium transition text-white bg-blue-600 shadow-sm whitespace-nowrap";
    }

    // Init charts on tab open
    if (tabId === 'charts') {
        setTimeout(() => initializeStandaloneChart("OANDA:XAUUSD"), 100);
    }
    if (tabId === 'bot-builder') {
        setTimeout(() => updateLiveChartAsset(), 100);
    }
}

// ================================================================
// AUTH — STEP 1: Generate PKCE and redirect to Deriv
// ================================================================
async function loginWithDeriv() {
    // Amy's exact PKCE generator
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const rnd = crypto.getRandomValues(new Uint8Array(64));
    const code_verifier = Array.from(rnd).map(v => charset[v % charset.length]).join('');

    const encoder = new TextEncoder();
    const hash    = await crypto.subtle.digest('SHA-256', encoder.encode(code_verifier));
    const bytes   = new Uint8Array(hash);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const code_challenge = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const stateBytes = crypto.getRandomValues(new Uint8Array(16));
    const state = Array.from(stateBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    sessionStorage.setItem('pkce_code_verifier', code_verifier);
    sessionStorage.setItem('oauth_state', state);

    const url = new URL('https://auth.deriv.com/oauth2/auth');
    url.searchParams.set('response_type',         'code');
    url.searchParams.set('client_id',             DERIV_CLIENT_ID);
    url.searchParams.set('redirect_uri',          DERIV_REDIRECT);
    url.searchParams.set('scope',                 'trade');
    url.searchParams.set('state',                 state);
    url.searchParams.set('code_challenge',        code_challenge);
    url.searchParams.set('code_challenge_method', 'S256');

    console.log("Redirecting to Deriv login:", url.toString());
    window.location.href = url.toString();
}

function signUpWithDeriv() {
    window.location.href = "https://track.deriv.com/_Yi8lkjLk8sFMjdsyM5hasGNd7ZgqdRLk/1/";
}

// ================================================================
// AUTH — STEP 2: Handle callback, exchange code for token
// ================================================================
async function handleOAuthCallback(code, state) {
    const savedState    = sessionStorage.getItem('oauth_state');
    const code_verifier = sessionStorage.getItem('pkce_code_verifier');
    sessionStorage.removeItem('oauth_state');
    sessionStorage.removeItem('pkce_code_verifier');

    if (state !== savedState) {
        showStatus("Security error: state mismatch. Please try logging in again.", 'error');
        return;
    }

    showStatus("Exchanging authorization code...", 'info');

    try {
        const resp = await fetch('/api/deriv-token', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                code_verifier,
                redirect_uri: DERIV_REDIRECT,
                client_id:    DERIV_CLIENT_ID
            })
        });
        const tokens = await resp.json();

        if (!resp.ok) {
            showStatus(`Auth failed: ${tokens.error || 'Unknown error'}`, 'error');
            console.error("Token error:", tokens);
            return;
        }

        accessToken = tokens.access_token;
        console.log("✅ Access token received");
        showStatus("Getting your account...", 'info');
        await loadAccount();

    } catch (err) {
        showStatus("Connection error during login. Please try again.", 'error');
        console.error("Callback error:", err);
    }
}

// ================================================================
// AUTH — STEP 3: Get or create Options account (Amy's snippet)
// ================================================================
async function loadAccount() {
    try {
        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'Deriv-App-ID':  DERIV_APP_ID
        };

        // 1) List existing accounts
        let resp = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
            method: 'GET', headers
        });
        let data = await resp.json();
        console.log("Accounts list:", data);

        let accounts = Array.isArray(data?.data) ? data.data : [];

        // 2) If none, create a demo account
        if (accounts.length === 0) {
            showStatus("Creating demo account...", 'info');
            resp = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
                method:  'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body:    JSON.stringify({ currency: "USD", group: "row", account_type: "demo" })
            });
            data = await resp.json();
            console.log("Created account:", data);
            if (!resp.ok || !data?.data) {
                showStatus("Failed to create trading account.", 'error');
                return;
            }
            accountId = data.data.account_id;
        } else {
            // Pick demo first, else first account (Amy's recommendation)
            const demo  = accounts.find(a => a.account_type === 'demo');
            const chosen = demo || accounts[0];
            accountId    = chosen.account_id;
        }

        console.log("✅ Account ID:", accountId);
        await openAuthenticatedWS();

    } catch (err) {
        showStatus("Failed to load account. Please try again.", 'error');
        console.error("Account error:", err);
    }
}

// ================================================================
// AUTH — STEP 4: Get OTP → open authenticated WebSocket (Amy's snippet)
// ================================================================
async function openAuthenticatedWS() {
    try {
        showStatus("Opening secure trading connection...", 'info');

        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'Deriv-App-ID':  DERIV_APP_ID
        };

        // Request OTP URL
        const otpResp = await fetch(
            `https://api.derivws.com/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`,
            { method: 'POST', headers }
        );
        const otpData = await otpResp.json();
        console.log("OTP response:", otpData);

        if (!otpResp.ok) {
            showStatus(`OTP request failed: ${JSON.stringify(otpData?.error || otpData)}`, 'error');
            return;
        }

        const wsUrl = otpData?.data?.url;
        if (!wsUrl) {
            showStatus("OTP URL missing in response.", 'error');
            return;
        }

        console.log("Opening WebSocket:", wsUrl);
        derivWS = new WebSocket(wsUrl);

        derivWS.onopen = () => {
            console.log("✅ WebSocket connected");
            isReconnecting = false;
            updateConnectionStatus(true);
            showStatus("✅ Connected and ready to trade!", 'success');

            // Hide auth buttons, show balance
            document.getElementById('login-nav-btn')?.classList.add('hidden');
            document.getElementById('signup-nav-btn')?.classList.add('hidden');
            document.getElementById('balance-display')?.classList.remove('hidden');

            // Start digit tick stream
            derivWS.send(JSON.stringify({ ticks: "R_10", subscribe: 1 }));
        };

        derivWS.onerror = (err) => {
            console.error("WS error:", err);
            updateConnectionStatus(false);
        };

        derivWS.onclose = () => {
            console.warn("WS closed");
            updateConnectionStatus(false);
        };

        derivWS.onmessage = (msg) => {
            const r = JSON.parse(msg.data);
            routeMessage(r);
        };

    } catch (err) {
        showStatus("Failed to open trading connection.", 'error');
        console.error("WS open error:", err);
    }
}

// Auto-reconnect if WS drops
setInterval(async () => {
    if (derivWS && derivWS.readyState === WebSocket.OPEN) {
        isReconnecting = false;
    } else if (!isReconnecting && accessToken && accountId) {
        isReconnecting = true;
        updateConnectionStatus(false);
        console.warn("WS dropped, reconnecting...");
        await openAuthenticatedWS();
    }
}, 5000);

// ================================================================
// CENTRAL MESSAGE ROUTER
// ================================================================
function routeMessage(r) {
    // Balance update
    if (r.msg_type === 'balance') {
        const bal = document.getElementById('account-balance');
        if (bal && r.balance) {
            bal.innerText = `${parseFloat(r.balance.balance).toFixed(2)} ${r.balance.currency}`;
        }
    }

    // Tick → digit tracker
    if (r.msg_type === 'tick' && r.tick) {
        updateDigitStats(r.tick.quote);
    }

    // Contract result
    if (r.msg_type === 'proposal_open_contract') {
        const c = r.proposal_open_contract;
        if (c && c.is_sold) updateDashboardStats(c.profit, c.status);
    }

    // Bot engine
    handleIncomingMarketData(r);
}

// ================================================================
// UI HELPERS
// ================================================================
function showStatus(msg, type) {
    const el = document.getElementById('connection-status');
    if (!el) return;
    el.classList.remove('hidden');
    const styles = {
        info:    "text-xs p-3 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 font-medium",
        success: "text-xs p-3 rounded-lg border border-emerald-300 bg-emerald-50 text-green-700 font-bold",
        error:   "text-xs p-3 rounded-lg border border-red-300 bg-red-50 text-red-600 font-medium"
    };
    el.className = styles[type] || styles.info;
    el.innerText = msg;
}

function updateConnectionStatus(on) {
    // Main header dot
    const dot  = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    if (dot)  dot.className  = on ? 'h-2 w-2 rounded-full bg-green-500 mr-2' : 'h-2 w-2 rounded-full bg-red-500 mr-2';
    if (text) text.innerText = on ? 'LIVE' : 'OFFLINE';

    // Global bot bar dot
    const barDot  = document.getElementById('bar-status-dot');
    const barText = document.getElementById('bar-status-text');
    if (barDot)  barDot.className  = on ? 'h-2 w-2 rounded-full bg-green-500' : 'h-2 w-2 rounded-full bg-red-500';
    if (barText) barText.innerText = on ? 'LIVE' : 'OFFLINE';
}

function logJournalMessage(text) {
    const t = document.getElementById('journal-terminal-log');
    if (!t) return;
    const ts  = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.className = "leading-tight border-l border-slate-700 pl-1";
    div.innerHTML = `<span class="text-slate-500">[${ts}]</span> ${text}`;
    t.appendChild(div);
    t.scrollTop = t.scrollHeight;
}

function toggleAccumulatorFields() {
    const val   = document.getElementById('bot-trade-type')?.value;
    const panel = document.getElementById('accumulator-config-panel');
    if (panel) panel.classList.toggle('hidden', val !== 'accumulator');
}

// ================================================================
// ASSET DROPDOWN
// ================================================================
const marketAssets = {
    "Continuous Indices": ["Volatility 10","Volatility 25","Volatility 50","Volatility 75","Volatility 100"],
    "1S Indices":         ["Volatility 10 (1s)","Volatility 25 (1s)","Volatility 50 (1s)","Volatility 75 (1s)","Volatility 100 (1s)"],
    "Jump Indices":       ["Jump 10 Index","Jump 25 Index","Jump 50 Index","Jump 75 Index","Jump 100 Index"]
};

function populateAssetDropdown() {
    const sel = document.getElementById('market-asset-select');
    if (!sel) return;
    Object.keys(marketAssets).forEach(cat => {
        const grp = document.createElement('optgroup');
        grp.label = cat;
        marketAssets[cat].forEach(name => {
            const opt  = document.createElement('option');
            opt.value  = name;
            opt.text   = name;
            grp.appendChild(opt);
        });
        sel.appendChild(grp);
    });
}

// ================================================================
// BOT ENGINE
// ================================================================
function toggleBotExecution() {
    if (!derivWS || derivWS.readyState !== WebSocket.OPEN) {
        alert("Please connect your Deriv account first!");
        return;
    }

    const mainBtn   = document.getElementById('global-run-btn');

    if (!isBotRunning) {
        isBotRunning = true;
        currentStake = parseFloat(document.getElementById('bot-stake')?.value || 10);
        logJournalMessage("🟢 Bot started.");

        // Update global bar button
        if (mainBtn) {
            mainBtn.innerText   = "🛑 STOP BOT";
            mainBtn.className   = "bg-red-600 hover:bg-red-700 text-white font-black text-sm px-6 py-2 rounded-lg tracking-wider transition shadow-lg flex-shrink-0";
        }

        const market = document.getElementById('bot-market')?.value || 'R_10';
        derivWS.send(JSON.stringify({ ticks: market, subscribe: 1 }));

    } else {
        isBotRunning = false;
        logJournalMessage("🔴 Bot stopped.");

        if (mainBtn) {
            mainBtn.innerText = "▶ RUN BOT";
            mainBtn.className = "bg-brandGreen hover:bg-brandGreenHover text-white font-black text-sm px-6 py-2 rounded-lg tracking-wider transition shadow-lg flex-shrink-0";
        }
    }
}

function handleIncomingMarketData(r) {
    if (!isBotRunning) return;

    if (r.msg_type === 'tick' && r.tick) {
        const digit     = parseInt(r.tick.quote.toString().slice(-1));
        const pred      = parseInt(document.getElementById('bot-prediction')?.value || 1);
        const tradeType = document.getElementById('bot-trade-type')?.value || 'over_under';

        if (lastContractId !== null) return; // wait for current contract to settle

        if (tradeType === 'over_under') {
            if (digit > pred) executeContractPurchase(pred);
        } else {
            executeContractPurchase(digit);
        }
    }

    if (r.msg_type === 'buy') {
        if (r.error) {
            logJournalMessage(`❌ Rejected: ${r.error.message}`);
            lastContractId = null;
        } else {
            lastContractId = r.buy.contract_id;
            totalRuns++;
            logJournalMessage(`📋 Contract #${lastContractId} placed.`);
            updateStatsDashboard();
        }
    }

    if (r.msg_type === 'proposal_open_contract' && r.proposal_open_contract) {
        const c = r.proposal_open_contract;
        if (c.is_expired && c.contract_id === lastContractId) {
            const profit = parseFloat(c.profit);
            lastContractId = null;

            if (profit > 0) {
                try { winAudio.play(); } catch(e) {}
                totalWins++;
                currentStreak   = currentStreak < 0 ? 1 : currentStreak + 1;
                totalProfitLoss += profit;
                logJournalMessage(`🎯 WIN +$${profit.toFixed(2)}`);
                addTransactionRow('WIN', currentStake, profit);
                currentStake = parseFloat(document.getElementById('bot-stake')?.value || currentStake);
            } else {
                try { lossAudio.play(); } catch(e) {}
                currentStreak   = currentStreak > 0 ? -1 : currentStreak - 1;
                totalProfitLoss += profit;
                logJournalMessage(`💥 LOSS $${profit.toFixed(2)}`);
                addTransactionRow('LOSS', currentStake, profit);
                const mult = parseFloat(document.getElementById('bot-martingale')?.value || 2.1);
                currentStake   *= mult;
                logJournalMessage(`📐 Martingale: next stake $${currentStake.toFixed(2)}`);
            }
            updateStatsDashboard();
            checkThresholds();
        }
    }
}

function executeContractPurchase(prediction) {
    if (!isBotRunning || lastContractId !== null) return;

    const market    = document.getElementById('bot-market')?.value || 'R_10';
    const duration  = parseInt(document.getElementById('bot-duration')?.value || 1);
    const tradeType = document.getElementById('bot-trade-type')?.value || 'over_under';

    let contractType = "DIGITOVER";
    let barrier      = undefined;
    let extra        = {};

    switch (tradeType) {
        case 'accumulator':
            contractType      = "ACCU";
            extra.growth_rate = parseFloat(document.getElementById('bot-growth-rate')?.value || 0.03);
            const tp          = parseFloat(document.getElementById('bot-tp')?.value || 0);
            if (tp > 0) extra.limit_order = { take_profit: tp };
            break;
        case 'over_under':      contractType = "DIGITOVER";  barrier = prediction?.toString() || "1"; break;
        case 'even_odd':        contractType = parseInt(prediction) % 2 === 0 ? "DIGITEVEN" : "DIGITODD"; break;
        case 'rise_fall':       contractType = "CALL";    break;
        case 'rise_fall_equal': contractType = "CALLE";   break;
        case 'only_ups_downs':  contractType = "RUNHIGH"; break;
        case 'high_low_ticks':  contractType = "TICKHIGH"; break;
        default:                contractType = "DIGITOVER"; barrier = "1";
    }

    const order = {
        buy: 1,
        price: currentStake,
        parameters: {
            amount: currentStake, basis: "stake",
            contract_type: contractType,
            currency: "USD", symbol: market,
            ...extra
        }
    };
    if (tradeType !== 'accumulator') {
        order.parameters.duration      = duration;
        order.parameters.duration_unit = "t";
    }
    if (barrier !== undefined) order.parameters.barrier = barrier;

    // Mirror to slaves
    replicateOrderToSlaves(order.parameters);

    lastContractId = "pending";
    derivWS.send(JSON.stringify(order));
    logJournalMessage(`🎯 ${contractType} @ $${currentStake.toFixed(2)}`);
}

// ================================================================
// STATS & TRANSACTIONS
// ================================================================
function addTransactionRow(type, stake, profit) {
    const container = document.getElementById('transaction-rows-container');
    const emptyMsg  = document.getElementById('empty-rows-msg');
    if (!container) return;
    if (emptyMsg) emptyMsg.classList.add('hidden');

    const isWin = type === 'WIN';
    const row   = document.createElement('div');
    row.className = `flex items-center justify-between p-2 rounded border text-xs font-medium ${
        isWin ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
    }`;
    row.innerHTML = `
        <div class="flex items-center gap-1.5">
            <span>${isWin ? '🎯' : '💥'}</span>
            <div>
                <div class="font-bold">${type}</div>
                <div class="text-[10px] text-gray-500 font-mono">Stake: $${stake.toFixed(2)}</div>
            </div>
        </div>
        <div class="font-mono font-bold ${isWin ? 'text-green-600' : 'text-red-600'}">
            ${isWin ? '+' : ''}$${profit.toFixed(2)}
        </div>`;
    container.insertBefore(row, container.firstChild);
}

function updateStatsDashboard() {
    const $ = id => document.getElementById(id);

    if ($('stat-runs'))   $('stat-runs').innerText   = totalRuns;
    if ($('stat-stake'))  $('stat-stake').innerText  = currentStake.toFixed(2);
    if ($('stat-profit')) {
        $('stat-profit').innerText  = totalProfitLoss.toFixed(2);
        $('stat-profit').className  = `text-sm font-mono font-black ${totalProfitLoss > 0 ? 'text-green-600' : totalProfitLoss < 0 ? 'text-red-600' : 'text-slate-800'}`;
    }
    if (currentStake > peakExposure) {
        peakExposure = currentStake;
        if ($('stat-peak-exposure')) $('stat-peak-exposure').innerText = peakExposure.toFixed(2);
    }
    const wr = totalRuns > 0 ? ((totalWins / totalRuns) * 100).toFixed(1) : "0.0";
    if ($('stat-win-rate')) $('stat-win-rate').innerText = `${wr}%`;
    if ($('stat-current-streak')) {
        $('stat-current-streak').innerText  = currentStreak > 0 ? `+${currentStreak}` : currentStreak;
        $('stat-current-streak').className  = `text-sm font-mono font-black ${currentStreak > 0 ? 'text-emerald-600' : currentStreak < 0 ? 'text-red-500' : 'text-slate-800'}`;
    }

    // Update global bot bar
    if ($('bar-runs')) $('bar-runs').innerText = totalRuns;
    if ($('bar-pl'))   {
        $('bar-pl').innerText   = totalProfitLoss.toFixed(2);
        $('bar-pl').className   = `font-mono font-bold ${totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`;
    }
    if ($('bar-wr')) $('bar-wr').innerText = `${wr}%`;
}

function checkThresholds() {
    const tp = parseFloat(document.getElementById('bot-tp')?.value || 0);
    const sl = parseFloat(document.getElementById('bot-sl')?.value || 0) * -1;
    if (tp > 0 && totalProfitLoss >= tp) {
        logJournalMessage(`🏆 Take profit $${tp} reached! Stopping bot.`);
        toggleBotExecution();
    } else if (sl < 0 && totalProfitLoss <= sl) {
        logJournalMessage(`⚠️ Stop loss $${Math.abs(sl)} hit! Stopping bot.`);
        toggleBotExecution();
    }
}

function updateDashboardStats(profit, status) {
    const p = parseFloat(profit);
    if (status === 'won') { stats.wins++; stats.totalProfit += p; }
    else                  { stats.losses++; stats.totalProfit += p; }
}

// ================================================================
// CHARTS
// ================================================================
let tvInstance = null;

function initializeStandaloneChart(symbol) {
    const container = document.getElementById('tv-standalone-frame');
    if (!container) return;
    container.innerHTML = '';

    const opts = {
        width: "100%", height: "100%",
        symbol, interval: "5",
        timezone: "Etc/UTC", theme: "light", style: "1", locale: "en",
        enable_publishing: false, allow_symbol_change: true,
        container_id: "tv-standalone-frame",
        studies: ["RSI@tv-basicstudies", "MACD@tv-basicstudies"]
    };

    const build = () => {
        if (typeof TradingView !== 'undefined') tvInstance = new TradingView.widget(opts);
    };

    if (typeof TradingView !== 'undefined') {
        build();
    } else {
        const s   = document.createElement('script');
        s.src     = 'https://s3.tradingview.com/tv.js';
        s.async   = true;
        s.onload  = build;
        document.head.appendChild(s);
    }
}

function updateLiveChartAsset() {
    const sym    = document.getElementById('bot-market')?.value || 'R_10';
    const ticker = document.getElementById('chart-asset-ticker');
    const iframe = document.getElementById('deriv-chart-frame');
    if (ticker) ticker.innerText = sym;
    if (iframe) iframe.src = `https://charts.deriv.com/?symbol=${sym}&granularity=60`;
    logJournalMessage(`Chart: ${sym}`);
}

// ================================================================
// COPY TRADING
// ================================================================
function addNewSlave() {
    const tokenEl = document.getElementById('slave-token-input');
    const multEl  = document.getElementById('slave-multiplier-input');
    if (!tokenEl?.value) return alert("Enter a valid token");

    const slave = {
        id:         Date.now(),
        token:      tokenEl.value,
        multiplier: parseFloat(multEl?.value || 1),
        ws:         new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`)
    };
    slave.ws.onopen = () => slave.ws.send(JSON.stringify({ authorize: slave.token }));
    slaveAccounts.push(slave);
    tokenEl.value = '';
    logJournalMessage(`👥 Slave added (x${slave.multiplier})`);
    renderSlaveList();
}

function renderSlaveList() {
    const container = document.getElementById('slave-list-container');
    if (!container) return;
    if (slaveAccounts.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-400">No slave accounts added yet.</p>';
        return;
    }
    container.innerHTML = '';
    slaveAccounts.forEach(s => {
        const div = document.createElement('div');
        div.className = "flex items-center justify-between p-3 rounded-lg border text-xs bg-white border-slate-200 shadow-sm";
        div.innerHTML = `
            <div><div class="font-bold text-slate-700">Slave #${s.id}</div><div class="text-gray-400">Multiplier: x${s.multiplier}</div></div>
            <button onclick="removeSlave(${s.id})" class="text-red-500 hover:text-red-700 font-bold">Remove</button>`;
        container.appendChild(div);
    });
}

function removeSlave(id) {
    const s = slaveAccounts.find(x => x.id === id);
    if (s?.ws) s.ws.close();
    slaveAccounts = slaveAccounts.filter(x => x.id !== id);
    logJournalMessage(`Slave ${id} removed`);
    renderSlaveList();
}

function replicateOrderToSlaves(params) {
    slaveAccounts.forEach(s => {
        if (s.ws?.readyState === WebSocket.OPEN) {
            s.ws.send(JSON.stringify({
                buy: 1,
                parameters: { ...params, amount: params.amount * s.multiplier }
            }));
            logJournalMessage(`🚀 Mirrored to slave #${s.id}`);
        }
    });
}

// ================================================================
// DIGIT TRACKER
// ================================================================
function updateDigitStats(tick) {
    const d = parseInt(tick.toString().slice(-1));
    if (isNaN(d)) return;
    digitCounts[d]++;
    totalTicks++;
    renderDigitCircles();
}

function renderDigitCircles() {
    const container = document.getElementById('digit-circles-container');
    if (!container) return;
    container.innerHTML = '';

    const ranked = digitCounts.map((c, d) => ({ d, c })).sort((a, b) => b.c - a.c);

    digitCounts.forEach((count, digit) => {
        const rank = ranked.findIndex(r => r.d === digit);
        const pct  = totalTicks > 0 ? ((count / totalTicks) * 100).toFixed(1) : '0.0';

        let bg = "bg-white text-slate-800";
        if (rank === 0) bg = "bg-green-500 text-white";
        else if (rank === 1) bg = "bg-blue-500 text-white";
        else if (rank === 8) bg = "bg-yellow-400 text-slate-800";
        else if (rank === 9) bg = "bg-red-500 text-white";

        const circle = document.createElement('div');
        circle.className = `digit-circle rounded-full flex flex-col items-center justify-center shadow-md ${bg}`;
        circle.title     = `Digit ${digit}: ${count} times (${pct}%)`;
        circle.onclick   = () => {
            const p = document.getElementById('bot-prediction');
            if (p) { p.value = digit; logJournalMessage(`Prediction set to ${digit}`); }
        };
        circle.innerHTML = `<span class="text-lg font-black">${digit}</span><span class="text-[9px] font-semibold">${pct}%</span>`;
        container.appendChild(circle);
    });
}

// ================================================================
// AI MARKET SUGGESTER
// ================================================================
async function suggestBestMarket() {
    if (!derivWS || derivWS.readyState !== WebSocket.OPEN) {
        logJournalMessage("⚠️ Connect your account first to use AI suggest.");
        return;
    }
    logJournalMessage("🤖 AI scanning markets...");
    const symbols = ["R_10", "R_50", "1HZ10V"];
    let best = { name: symbols[0], vol: Infinity };

    for (const sym of symbols) {
        const vol = await fetchVolatility(sym);
        if (vol < best.vol) best = { name: sym, vol };
    }

    const sel = document.getElementById('market-asset-select');
    const bot = document.getElementById('bot-market');
    if (sel) sel.value = best.name;
    if (bot) bot.value = best.name;
    logJournalMessage(`🎯 AI recommends: ${best.name}`);
    updateLiveChartAsset();
}

async function fetchVolatility(symbol, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await new Promise((resolve, reject) => {
                derivWS.send(JSON.stringify({
                    ticks_history: symbol, count: 100, end: "latest", style: "ticks"
                }));
                const handler = (msg) => {
                    const d = JSON.parse(msg.data);
                    if (d.msg_type === 'history') {
                        derivWS.removeEventListener('message', handler);
                        const p = d.history.prices;
                        resolve(Math.max(...p) - Math.min(...p));
                    }
                };
                derivWS.addEventListener('message', handler);
                setTimeout(() => {
                    derivWS.removeEventListener('message', handler);
                    reject(new Error("Timeout"));
                }, 5000);
            });
        } catch(e) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    return Infinity;
}