// ================================================================
// BTRADERHUB app.js — Full rewrite with all features
// Auth: Amy-verified PKCE flow (DO NOT CHANGE)
// ================================================================

const DERIV_CLIENT_ID = "33ByqD0GecGTE5whirko8";
const DERIV_APP_ID    = "33ByqD0GecGTE5whirko8";
const DERIV_REDIRECT  = "https://btraderhub.vercel.app/";

// ── Global state ──────────────────────────────────────────────
let derivWS        = null;
let accessToken    = null;
let accountId      = null;
let allAccounts    = [];
let isReconnecting = false;

// Bot state
let isBotRunning    = false;
let activeBotId     = null;
let activeBotName   = "None";
let botDirection    = null; // "over","under","even","odd","rise","fall","ups","downs"
let currentStake    = 0;
let totalProfitLoss = 0;
let totalRuns       = 0;
let totalWins       = 0;
let currentStreak   = 0;
let peakExposure    = 0;
let lastContractId  = null;
let slaveAccounts   = [];

// Digit tracker — per market
let digitData = {}; // { "R_10": { counts:[...], ticks:0, subscription:null } }
let currentDigitMarket = "R_10";

// Bot repository
let botRepository = [
    { id: 1, name: "Over/Under Bot",  type: "over_under",     market: "R_10",  stake: 1, martingale: 2.1, tp: 50, sl: 100, direction: "over",  ticks: 1 },
    { id: 2, name: "Even/Odd Bot",    type: "even_odd",       market: "R_50",  stake: 1, martingale: 2.1, tp: 50, sl: 100, direction: "even",  ticks: 1 },
    { id: 3, name: "Rise/Fall Bot",   type: "rise_fall",      market: "R_100", stake: 1, martingale: 2.1, tp: 50, sl: 100, direction: "rise",  ticks: 5 },
    { id: 4, name: "Only Ups Bot",    type: "only_ups_downs", market: "R_75",  stake: 1, martingale: 2.0, tp: 30, sl: 60,  direction: "ups",   ticks: 5 },
];

const winAudio  = new Audio('https://actions.google.com/sounds/v1/cartoon/slide_whistle_up.ogg');
const lossAudio = new Audio('https://actions.google.com/sounds/v1/cartoon/boing_long.ogg');

// ================================================================
// PAGE LOAD
// ================================================================
window.addEventListener('load', async () => {
    renderBotRepository();
    onTradeTypeChange();
    initializeTVChart("OANDA:XAUUSD");

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
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    const pane = document.getElementById(tabId + '-pane');
    const btn  = document.getElementById('tab-btn-' + tabId);

    if (pane) {
        if (['bot-builder','deriv-chart','tv-chart'].includes(tabId)) {
            pane.style.display = 'flex';
        } else {
            pane.style.display = 'block';
        }
    }
    if (btn) btn.classList.add('active');

    if (tabId === 'tv-chart')    setTimeout(() => initializeTVChart("OANDA:XAUUSD"), 100);
    if (tabId === 'scanner')     runAIScanner();
    if (tabId === 'bot-builder') updateDerivChart();
}

// ================================================================
// AUTH — STEP 1: PKCE Login (Amy-verified)
// ================================================================
async function loginWithDeriv() {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const rnd = crypto.getRandomValues(new Uint8Array(64));
    const code_verifier = Array.from(rnd).map(v => charset[v % charset.length]).join('');

    const encoder = new TextEncoder();
    const hash    = await crypto.subtle.digest('SHA-256', encoder.encode(code_verifier));
    const bytes   = new Uint8Array(hash);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const code_challenge = btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');

    const stateBytes = crypto.getRandomValues(new Uint8Array(16));
    const state = Array.from(stateBytes).map(b => b.toString(16).padStart(2,'0')).join('');

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

    window.location.href = url.toString();
}

function signUpWithDeriv() {
    window.location.href = "https://track.deriv.com/_Yi8lkjLk8sFMjdsyM5hasGNd7ZgqdRLk/1/";
}

// ================================================================
// AUTH — STEP 2: Callback
// ================================================================
async function handleOAuthCallback(code, state) {
    const savedState    = sessionStorage.getItem('oauth_state');
    const code_verifier = sessionStorage.getItem('pkce_code_verifier');
    sessionStorage.removeItem('oauth_state');
    sessionStorage.removeItem('pkce_code_verifier');

    if (state !== savedState) { showStatus("State mismatch. Try again.", 'error'); return; }

    showStatus("Exchanging authorization code...", 'info');
    try {
        const resp = await fetch('/api/deriv-token', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ code, code_verifier, redirect_uri: DERIV_REDIRECT, client_id: DERIV_CLIENT_ID })
        });
        const tokens = await resp.json();
        if (!resp.ok) { showStatus(`Auth failed: ${tokens.error || 'Unknown'}`, 'error'); return; }

        accessToken = tokens.access_token;
        showStatus("Loading your accounts...", 'info');
        await loadAccounts();
    } catch(err) {
        showStatus("Connection error. Please try again.", 'error');
        console.error(err);
    }
}

// ================================================================
// AUTH — STEP 3: Load accounts (demo + real)
// ================================================================
async function loadAccounts() {
    try {
        const headers = { 'Authorization': `Bearer ${accessToken}`, 'Deriv-App-ID': DERIV_APP_ID };

        let resp = await fetch('https://api.derivws.com/trading/v1/options/accounts', { method:'GET', headers });
        let data = await resp.json();
        allAccounts = Array.isArray(data?.data) ? data.data : [];

        if (allAccounts.length === 0) {
            showStatus("Creating demo account...", 'info');
            resp = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
                method:'POST', headers:{...headers,'Content-Type':'application/json'},
                body: JSON.stringify({ currency:"USD", group:"row", account_type:"demo" })
            });
            data = await resp.json();
            if (!resp.ok || !data?.data) { showStatus("Failed to create account.", 'error'); return; }
            allAccounts = [data.data];
        }

        // Populate account switcher
        const switcher = document.getElementById('account-switcher');
        if (switcher) {
            switcher.innerHTML = '';
            allAccounts.forEach(acc => {
                const opt = document.createElement('option');
                opt.value = acc.account_id;
                opt.text  = `${acc.account_type === 'demo' ? '🟡 Demo' : '🟢 Real'} — ${acc.currency || 'USD'}`;
                switcher.appendChild(opt);
            });
        }

        // Use demo first
        const demo   = allAccounts.find(a => a.account_type === 'demo') || allAccounts[0];
        accountId    = demo.account_id;
        if (switcher) switcher.value = accountId;

        await openAuthenticatedWS();
    } catch(err) {
        showStatus("Failed to load accounts.", 'error');
        console.error(err);
    }
}

// ================================================================
// AUTH — STEP 4: Switch account
// ================================================================
async function switchAccount(newAccountId) {
    if (newAccountId === accountId) return;
    accountId = newAccountId;
    logJournal(`Switching to account: ${accountId}`);
    if (derivWS) { derivWS.close(); derivWS = null; }
    await openAuthenticatedWS();
}

// ================================================================
// AUTH — STEP 5: OTP → WebSocket
// ================================================================
async function openAuthenticatedWS() {
    try {
        showStatus("Opening secure connection...", 'info');
        const headers = { 'Authorization': `Bearer ${accessToken}`, 'Deriv-App-ID': DERIV_APP_ID };

        const otpResp = await fetch(
            `https://api.derivws.com/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`,
            { method:'POST', headers }
        );
        const otpData = await otpResp.json();

        if (!otpResp.ok || !otpData?.data?.url) {
            showStatus(`OTP failed: ${JSON.stringify(otpData?.error || otpData)}`, 'error');
            return;
        }

        derivWS = new WebSocket(otpData.data.url);

        derivWS.onopen = () => {
            console.log("✅ WS connected");
            isReconnecting = false;
            updateConnectionStatus(true);
            showStatus("✅ Connected and ready!", 'success');

            // Hide auth buttons
            document.getElementById('login-nav-btn')?.classList.add('hidden');
            document.getElementById('signup-nav-btn')?.classList.add('hidden');
            document.getElementById('account-switcher-wrap')?.classList.remove('hidden');
            document.getElementById('auth-card')?.classList.add('hidden');
            document.getElementById('dashboard-stats')?.classList.remove('hidden');
            document.getElementById('recent-trades-card')?.classList.remove('hidden');

            // Fetch balance
            derivWS.send(JSON.stringify({ balance: 1, subscribe: 1 }));
            // Start digit feed for current market
            subscribeDigitMarket(currentDigitMarket);
        };

        derivWS.onerror  = () => updateConnectionStatus(false);
        derivWS.onclose  = () => { updateConnectionStatus(false); };
        derivWS.onmessage = (msg) => routeMessage(JSON.parse(msg.data));

    } catch(err) {
        showStatus("Failed to open connection.", 'error');
        console.error(err);
    }
}

// Auto-reconnect
setInterval(async () => {
    if (derivWS && derivWS.readyState === WebSocket.OPEN) {
        isReconnecting = false;
    } else if (!isReconnecting && accessToken && accountId) {
        isReconnecting = true;
        updateConnectionStatus(false);
        await openAuthenticatedWS();
    }
}, 5000);

// ================================================================
// MESSAGE ROUTER
// ================================================================
function routeMessage(r) {
    if (r.msg_type === 'balance' && r.balance) {
        const el = document.getElementById('account-balance');
        if (el) el.textContent = `${parseFloat(r.balance.balance).toFixed(2)} ${r.balance.currency}`;
    }
    if (r.msg_type === 'tick' && r.tick) {
        processDigitTick(r.tick.symbol, r.tick.quote);
    }
    if (r.msg_type === 'proposal_open_contract') {
        const c = r.proposal_open_contract;
        if (c?.is_sold) updateDashboardStats(c.profit, c.status);
    }
    handleBotMessage(r);
}

// ================================================================
// DIRECTION CONTROLS
// ================================================================
function onTradeTypeChange() {
    const type = document.getElementById('bot-trade-type')?.value;
    const wrap = document.getElementById('direction-controls');
    const pred = document.getElementById('prediction-wrap');
    const accu = document.getElementById('accumulator-config-panel');
    if (!wrap) return;

    wrap.innerHTML = '';
    if (accu) accu.classList.add('hidden');
    if (pred) pred.classList.remove('hidden');

    const dirOptions = {
        over_under:      [['over','Over Only'],['under','Under Only']],
        even_odd:        [['even','Even Only'],['odd','Odd Only']],
        rise_fall:       [['rise','Rise Only'],['fall','Fall Only']],
        only_ups_downs:  [['ups','Only Ups'],['downs','Only Downs']],
        high_low_ticks:  [['high','High'],['low','Low']],
        accumulator:     []
    };

    if (type === 'accumulator') {
        if (accu) accu.classList.remove('hidden');
        if (pred) pred.classList.add('hidden');
        botDirection = 'accumulator';
        updateTradeInfoBar();
        return;
    }

    const opts = dirOptions[type] || [];
    opts.forEach(([val, label]) => {
        const btn = document.createElement('button');
        btn.className   = 'dir-btn';
        btn.textContent = label;
        btn.dataset.dir = val;
        btn.onclick = () => selectDirection(val);
        wrap.appendChild(btn);
    });

    // Auto-select first
    if (opts.length > 0) selectDirection(opts[0][0]);

    // Hide prediction for non-digit types
    if (['rise_fall','only_ups_downs','high_low_ticks','accumulator'].includes(type)) {
        if (pred) pred.classList.add('hidden');
    }

    updateTradeInfoBar();
}

function selectDirection(dir) {
    botDirection = dir;
    const btns = document.querySelectorAll('#direction-controls .dir-btn');
    btns.forEach(b => {
        b.classList.remove('selected','selected-red');
        if (b.dataset.dir === dir) {
            const isNeg = ['under','odd','fall','downs','low'].includes(dir);
            b.classList.add(isNeg ? 'selected-red' : 'selected');
        }
    });
    updateTradeInfoBar();
}

function updateTradeInfoBar() {
    const market    = document.getElementById('bot-market')?.value || '—';
    const type      = document.getElementById('bot-trade-type')?.value || '—';
    const im = document.getElementById('info-market');
    const id = document.getElementById('info-direction');
    const it = document.getElementById('info-type');
    if (im) im.textContent = market;
    if (id) { id.textContent = botDirection || '—'; id.style.color = ['under','odd','fall','downs'].includes(botDirection) ? '#ef4444' : '#00C853'; }
    if (it) it.textContent = type.replace(/_/g,' ');
    if (document.getElementById('chart-asset-ticker')) document.getElementById('chart-asset-ticker').textContent = market;
}

// ================================================================
// BOT REPOSITORY
// ================================================================
function renderBotRepository() {
    const container = document.getElementById('bot-repository');
    if (!container) return;
    if (botRepository.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-500 text-sm py-10">No bots yet. Create one or import a JSON file.</div>';
        return;
    }
    container.innerHTML = '';
    botRepository.forEach(bot => {
        const isActive  = bot.id === activeBotId;
        const isRunning = isActive && isBotRunning;
        const div = document.createElement('div');
        div.className = `bot-card ${isActive ? 'active-bot' : ''} ${isRunning ? 'running-bot' : ''}`;
        div.innerHTML = `
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                    <span class="font-black text-sm text-white truncate">${bot.name}</span>
                    ${isActive  ? '<span class="badge badge-green">LOADED</span>' : ''}
                    ${isRunning ? '<span class="badge badge-amber">RUNNING</span>' : ''}
                </div>
                <div class="text-[10px] text-slate-500">${bot.market} · ${bot.type.replace(/_/g,' ')} · ${bot.direction?.toUpperCase() || ''} · Stake $${bot.stake}</div>
            </div>
            <div class="flex gap-1.5 flex-shrink-0">
                <button onclick="loadBotIntoBuilder(${bot.id})" class="btn-green text-[10px] px-2 py-1 rounded">Load</button>
                <button onclick="duplicateBot(${bot.id})" class="btn-ghost text-[10px] px-2 py-1 rounded">Copy</button>
                <button onclick="exportBot(${bot.id})" class="btn-ghost text-[10px] px-2 py-1 rounded">Export</button>
                <button onclick="deleteBot(${bot.id})" class="btn-ghost text-[10px] px-2 py-1 rounded" style="color:#ef4444;">✕</button>
            </div>`;
        container.appendChild(div);
    });
}

function loadBotIntoBuilder(id) {
    const bot = botRepository.find(b => b.id === id);
    if (!bot) return;
    activeBotId   = id;
    activeBotName = bot.name;

    // Populate builder fields
    const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val; };
    set('bot-market',     bot.market);
    set('bot-trade-type', bot.type);
    set('bot-stake',      bot.stake);
    set('bot-martingale', bot.martingale);
    set('bot-tp',         bot.tp);
    set('bot-sl',         bot.sl);
    set('bot-duration',   bot.ticks || 1);
    if (bot.prediction !== undefined) set('bot-prediction', bot.prediction);

    onTradeTypeChange();
    if (bot.direction) selectDirection(bot.direction);

    const nameEl = document.getElementById('builder-bot-name');
    if (nameEl) nameEl.textContent = bot.name;

    updateDerivChart();
    updateBotBar();
    renderBotRepository();
    logJournal(`📋 Loaded bot: ${bot.name}`);
    switchTab('bot-builder');
}

function saveBotConfig() {
    if (!activeBotId) { alert("Load a bot first from Trading Bots tab."); return; }
    const bot = botRepository.find(b => b.id === activeBotId);
    if (!bot) return;

    bot.market     = document.getElementById('bot-market')?.value || bot.market;
    bot.type       = document.getElementById('bot-trade-type')?.value || bot.type;
    bot.stake      = parseFloat(document.getElementById('bot-stake')?.value || bot.stake);
    bot.martingale = parseFloat(document.getElementById('bot-martingale')?.value || bot.martingale);
    bot.tp         = parseFloat(document.getElementById('bot-tp')?.value || bot.tp);
    bot.sl         = parseFloat(document.getElementById('bot-sl')?.value || bot.sl);
    bot.ticks      = parseInt(document.getElementById('bot-duration')?.value || bot.ticks);
    bot.direction  = botDirection || bot.direction;
    bot.prediction = parseInt(document.getElementById('bot-prediction')?.value || 1);

    renderBotRepository();
    logJournal(`💾 Bot "${bot.name}" saved.`);
}

function createNewBot() {
    const name = prompt("Bot name:", `Custom Bot ${botRepository.length + 1}`);
    if (!name) return;
    const newBot = { id: Date.now(), name, type:"over_under", market:"R_10", stake:1, martingale:2.1, tp:50, sl:100, direction:"over", ticks:1 };
    botRepository.push(newBot);
    renderBotRepository();
    loadBotIntoBuilder(newBot.id);
}

function duplicateBot(id) {
    const bot = botRepository.find(b => b.id === id);
    if (!bot) return;
    const copy = { ...bot, id: Date.now(), name: bot.name + ' (Copy)' };
    botRepository.push(copy);
    renderBotRepository();
    logJournal(`Duplicated: ${bot.name}`);
}

function exportBot(id) {
    const bot = botRepository.find(b => b.id === id);
    if (!bot) return;
    const blob = new Blob([JSON.stringify(bot, null, 2)], { type: 'application/json' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `${bot.name.replace(/\s+/g,'_')}.json`;
    a.click();
}

function deleteBot(id) {
    if (!confirm("Delete this bot?")) return;
    botRepository = botRepository.filter(b => b.id !== id);
    if (activeBotId === id) { activeBotId = null; activeBotName = "None"; }
    renderBotRepository();
}

function importBot(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const bot = JSON.parse(e.target.result);
            bot.id = Date.now();
            botRepository.push(bot);
            renderBotRepository();
            logJournal(`📥 Imported: ${bot.name}`);
        } catch(err) {
            alert("Invalid bot file: " + err.message);
        }
    };
    reader.readAsText(file);
}

// ================================================================
// BOT EXECUTION
// ================================================================
function toggleBotExecution() {
    if (!derivWS || derivWS.readyState !== WebSocket.OPEN) {
        alert("Please connect your Deriv account first!");
        return;
    }
    if (!activeBotId) {
        alert("Please load a bot from the Trading Bots tab first.");
        switchTab('trading-bots');
        return;
    }

    const btn = document.getElementById('global-run-btn');
    if (!isBotRunning) {
        isBotRunning = true;
        const bot    = botRepository.find(b => b.id === activeBotId);
        currentStake = bot?.stake || parseFloat(document.getElementById('bot-stake')?.value || 1);
        botDirection = bot?.direction || botDirection;

        if (btn) { btn.textContent = "🛑 STOP BOT"; btn.className = "btn-red text-sm font-black px-6 py-2 rounded-lg tracking-wide flex-shrink-0"; }
        logJournal(`🟢 Bot started: ${activeBotName} | ${document.getElementById('bot-market')?.value} | ${botDirection?.toUpperCase()}`);

        const market = document.getElementById('bot-market')?.value || 'R_10';
        derivWS.send(JSON.stringify({ ticks: market, subscribe: 1 }));
        renderBotRepository();
    } else {
        isBotRunning = false;
        if (btn) { btn.textContent = "▶ RUN BOT"; btn.className = "btn-green text-sm font-black px-6 py-2 rounded-lg tracking-wide flex-shrink-0"; }
        logJournal("🔴 Bot stopped.");
        renderBotRepository();
    }
    updateBotBar();
}

function handleBotMessage(r) {
    if (!isBotRunning) return;

    if (r.msg_type === 'tick' && r.tick) {
        const price   = r.tick.quote.toString();
        const digit   = parseInt(price.slice(-1));
        const type    = document.getElementById('bot-trade-type')?.value || 'over_under';
        const pred    = parseInt(document.getElementById('bot-prediction')?.value || 1);

        if (lastContractId !== null) return;

        let shouldTrade = false;
        switch(type) {
            case 'over_under':
                if (botDirection === 'over'  && digit > pred)  shouldTrade = true;
                if (botDirection === 'under' && digit < pred)  shouldTrade = true;
                break;
            case 'even_odd':
                if (botDirection === 'even' && digit % 2 === 0) shouldTrade = true;
                if (botDirection === 'odd'  && digit % 2 !== 0) shouldTrade = true;
                break;
            case 'rise_fall':
            case 'only_ups_downs':
            case 'high_low_ticks':
            case 'accumulator':
                shouldTrade = true;
                break;
        }
        if (shouldTrade) executeContract();
    }

    if (r.msg_type === 'buy') {
        if (r.error) {
            logJournal(`❌ Rejected: ${r.error.message}`);
            lastContractId = null;
        } else {
            lastContractId = r.buy.contract_id;
            totalRuns++;
            logJournal(`📋 Contract #${lastContractId}`);
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
                logJournal(`🎯 WIN +$${profit.toFixed(2)}`);
                addTransactionRow('WIN', currentStake, profit);
                const bot = botRepository.find(b => b.id === activeBotId);
                currentStake = bot?.stake || parseFloat(document.getElementById('bot-stake')?.value || currentStake);
            } else {
                try { lossAudio.play(); } catch(e) {}
                currentStreak   = currentStreak > 0 ? -1 : currentStreak - 1;
                totalProfitLoss += profit;
                logJournal(`💥 LOSS $${profit.toFixed(2)}`);
                addTransactionRow('LOSS', currentStake, profit);
                const mult = parseFloat(document.getElementById('bot-martingale')?.value || 2.1);
                currentStake *= mult;
                logJournal(`📐 Next stake: $${currentStake.toFixed(2)}`);
            }
            updateStatsDashboard();
            checkThresholds();
        }
    }
}

function executeContract() {
    if (!isBotRunning || lastContractId !== null) return;

    const market    = document.getElementById('bot-market')?.value || 'R_10';
    const duration  = parseInt(document.getElementById('bot-duration')?.value || 1);
    const tradeType = document.getElementById('bot-trade-type')?.value || 'over_under';
    const pred      = parseInt(document.getElementById('bot-prediction')?.value || 1);

    let contractType = "DIGITOVER";
    let barrier      = undefined;
    let extra        = {};

    switch(tradeType) {
        case 'over_under':
            contractType = botDirection === 'under' ? "DIGITUNDER" : "DIGITOVER";
            barrier      = pred.toString();
            break;
        case 'even_odd':
            contractType = botDirection === 'odd' ? "DIGITODD" : "DIGITEVEN";
            break;
        case 'rise_fall':
            contractType = botDirection === 'fall' ? "PUT" : "CALL";
            break;
        case 'only_ups_downs':
            contractType = botDirection === 'downs' ? "RUNLOW" : "RUNHIGH";
            break;
        case 'high_low_ticks':
            contractType = botDirection === 'low' ? "TICKLOW" : "TICKHIGH";
            break;
        case 'accumulator':
            contractType      = "ACCU";
            extra.growth_rate = parseFloat(document.getElementById('bot-growth-rate')?.value || 0.03);
            const tp          = parseFloat(document.getElementById('bot-tp')?.value || 0);
            if (tp > 0) extra.limit_order = { take_profit: tp };
            break;
    }

    const order = {
        buy: 1, price: currentStake,
        parameters: { amount: currentStake, basis:"stake", contract_type: contractType, currency:"USD", symbol: market, ...extra }
    };
    if (tradeType !== 'accumulator') { order.parameters.duration = duration; order.parameters.duration_unit = "t"; }
    if (barrier !== undefined) order.parameters.barrier = barrier;

    replicateOrderToSlaves(order.parameters);
    lastContractId = "pending";
    derivWS.send(JSON.stringify(order));
    logJournal(`🎯 ${contractType} @ $${currentStake.toFixed(2)} | ${market} | ${botDirection?.toUpperCase()}`);
}

// ================================================================
// DIGIT TRACKER — per market
// ================================================================
function subscribeDigitMarket(symbol) {
    if (!derivWS || derivWS.readyState !== WebSocket.OPEN) return;
    if (!digitData[symbol]) digitData[symbol] = { counts: new Array(10).fill(0), ticks: 0 };
    derivWS.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
    currentDigitMarket = symbol;
    logJournal(`📊 Subscribed to digits: ${symbol}`);
}

function changeDigitMarket(symbol) {
    currentDigitMarket = symbol;
    if (!digitData[symbol]) digitData[symbol] = { counts: new Array(10).fill(0), ticks: 0 };
    subscribeDigitMarket(symbol);
    renderDigitCircles();
}

function processDigitTick(symbol, quote) {
    const d = parseInt(quote.toString().slice(-1));
    if (isNaN(d)) return;

    if (!digitData[symbol]) digitData[symbol] = { counts: new Array(10).fill(0), ticks: 0 };
    const data = digitData[symbol];
    data.counts[d]++;
    data.ticks = Math.min(data.ticks + 1, 1000);

    if (symbol === currentDigitMarket) {
        const lastEl = document.getElementById('digit-last');
        const tickEl = document.getElementById('digit-tick-count');
        if (lastEl) lastEl.textContent = d;
        if (tickEl) tickEl.textContent = data.ticks;
        renderDigitCircles();
        updateDigitStats(data);
    }
}

function renderDigitCircles() {
    const container = document.getElementById('digit-circles-container');
    const barsContainer = document.getElementById('digit-bars-container');
    if (!container) return;

    const data = digitData[currentDigitMarket] || { counts: new Array(10).fill(0), ticks: 0 };
    const counts = data.counts;
    const total  = data.ticks || 1;
    const pred   = parseInt(document.getElementById('bot-prediction')?.value ?? -1);

    const ranked = counts.map((c,d) => ({d,c})).sort((a,b) => b.c - a.c);
    container.innerHTML = '';
    if (barsContainer) barsContainer.innerHTML = '';

    counts.forEach((count, digit) => {
        const rank = ranked.findIndex(r => r.d === digit);
        const pct  = ((count / total) * 100).toFixed(1);

        let cls = '';
        if (rank === 0) cls = 'hot';
        else if (rank === 1) cls = 'warm';
        else if (rank === 8) cls = 'cold';
        else if (rank === 9) cls = 'ice';

        const isSelected = digit === pred;

        const circle = document.createElement('div');
        circle.className = `d-circle ${cls} ${isSelected ? 'selected-pred' : ''}`;
        circle.title     = `Digit ${digit}: ${count} times (${pct}%)`;
        circle.onclick   = () => {
            const p = document.getElementById('bot-prediction');
            if (p) { p.value = digit; renderDigitCircles(); logJournal(`Prediction → ${digit}`); }
        };
        circle.innerHTML = `<span style="font-size:18px;font-weight:900;">${digit}</span><span style="font-size:9px;opacity:0.8;">${pct}%</span>`;
        container.appendChild(circle);

        // Bar
        if (barsContainer) {
            const bar = document.createElement('div');
            bar.className = 'flex items-center gap-2 text-xs';
            bar.innerHTML = `
                <span class="w-4 text-right font-black text-slate-300">${digit}</span>
                <div class="flex-1 h-1.5 rounded-full" style="background:#1e293b;">
                    <div class="digit-bar-fill" style="width:${pct}%;background:${cls==='hot'?'#00C853':cls==='ice'?'#ef4444':'#3b82f6'}"></div>
                </div>
                <span class="w-10 text-right font-mono text-slate-400">${pct}%</span>
                <span class="w-8 text-right font-mono text-slate-600">${count}</span>`;
            barsContainer.appendChild(bar);
        }
    });
}

function updateDigitStats(data) {
    const counts = data.counts;
    const total  = data.ticks || 1;

    const evenCount = counts.filter((_,i) => i%2===0).reduce((a,b)=>a+b,0);
    const overCount = counts.slice(5).reduce((a,b)=>a+b,0);
    const ranked    = [...counts].map((c,d)=>({d,c})).sort((a,b)=>b.c-a.c);

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('stat-even',  ((evenCount/total)*100).toFixed(1)+'%');
    set('stat-odd',   (((total-evenCount)/total)*100).toFixed(1)+'%');
    set('stat-over',  ((overCount/total)*100).toFixed(1)+'%');
    set('stat-under', (((total-overCount)/total)*100).toFixed(1)+'%');
    set('stat-hot',   ranked[0]?.d ?? '—');
    set('stat-cold',  ranked[9]?.d ?? '—');
}

// ================================================================
// AI SCANNER
// ================================================================
async function runAIScanner() {
    const container = document.getElementById('scanner-results');
    if (!container) return;
    container.innerHTML = '<div class="text-xs text-slate-500 text-center py-6 col-span-2">🔍 Scanning markets...</div>';

    const markets = [
        { sym:'R_10',    label:'Volatility 10' },
        { sym:'R_25',    label:'Volatility 25' },
        { sym:'R_50',    label:'Volatility 50' },
        { sym:'R_75',    label:'Volatility 75' },
        { sym:'R_100',   label:'Volatility 100' },
        { sym:'1HZ10V',  label:'Volatility 10 (1s)' },
        { sym:'1HZ50V',  label:'Volatility 50 (1s)' },
        { sym:'JD10',    label:'Jump 10' },
        { sym:'JD50',    label:'Jump 50' },
    ];

    container.innerHTML = '';
    const now = new Date().toLocaleTimeString();

    markets.forEach(m => {
        const data   = digitData[m.sym] || { counts: new Array(10).fill(0), ticks: 0 };
        const counts = data.counts;
        const total  = Math.max(data.ticks, 1);
        const ranked = counts.map((c,d)=>({d,c})).sort((a,b)=>b.c-a.c);

        const evenPct  = ((counts.filter((_,i)=>i%2===0).reduce((a,b)=>a+b,0)/total)*100).toFixed(0);
        const overPct  = ((counts.slice(5).reduce((a,b)=>a+b,0)/total)*100).toFixed(0);
        const hotDigit = ranked[0]?.d ?? '—';
        const coldDig  = ranked[9]?.d ?? '—';

        // Generate signal
        let signal = '', strength = 'weak', color = '#f59e0b';
        if (parseInt(evenPct) > 55) { signal = `Even Signal (${evenPct}%)`; strength='strong'; color='#00C853'; }
        else if (parseInt(evenPct) < 45) { signal = `Odd Signal (${100-parseInt(evenPct)}%)`; strength='medium'; color='#3b82f6'; }
        else if (parseInt(overPct) > 55) { signal = `Over Signal (${overPct}%)`; strength='strong'; color='#00C853'; }
        else if (parseInt(overPct) < 45) { signal = `Under Signal (${100-parseInt(overPct)}%)`; strength='medium'; color='#3b82f6'; }
        else { signal = `Neutral — Hot: ${hotDigit}, Cold: ${coldDig}`; }

        const card = document.createElement('div');
        card.className = `signal-card ${strength}`;
        card.style.borderColor = color;
        card.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-black text-white">${m.label}</span>
                <span class="badge" style="background:${color}22;color:${color};border-color:${color}44;">${strength.toUpperCase()}</span>
            </div>
            <div class="text-sm font-black mb-1" style="color:${color};">${signal}</div>
            <div class="text-[10px] text-slate-500">Even ${evenPct}% | Over ${overPct}% | Hot: ${hotDigit} | Cold: ${coldDig}</div>
            <div class="text-[10px] text-slate-600 mt-1">${now} · ${data.ticks} ticks</div>`;
        container.appendChild(card);
    });
}

// ================================================================
// CHARTS
// ================================================================
function updateDerivChart() {
    const sym    = document.getElementById('bot-market')?.value || 'R_10';
    const iframe = document.getElementById('deriv-chart-frame');
    const ticker = document.getElementById('chart-asset-ticker');
    if (iframe) iframe.src = `https://charts.deriv.com/?symbol=${sym}&granularity=60`;
    if (ticker) ticker.textContent = sym;
    updateTradeInfoBar();
}

function loadDerivChart(sym) {
    const iframe = document.getElementById('deriv-standalone-frame');
    if (iframe) iframe.src = `https://charts.deriv.com/?symbol=${sym}&granularity=60`;
}

let tvInstance = null;
function initializeTVChart(symbol) {
    const container = document.getElementById('tv-chart-container');
    if (!container) return;
    container.innerHTML = '';
    const opts = {
        width:"100%", height:"100%", symbol, interval:"5",
        timezone:"Etc/UTC", theme:"dark", style:"1", locale:"en",
        enable_publishing:false, allow_symbol_change:true,
        container_id:"tv-chart-container",
        studies:["RSI@tv-basicstudies","MACD@tv-basicstudies"]
    };
    const build = () => { if (typeof TradingView !== 'undefined') tvInstance = new TradingView.widget(opts); };
    if (typeof TradingView !== 'undefined') { build(); }
    else {
        const s = document.createElement('script');
        s.src   = 'https://s3.tradingview.com/tv.js';
        s.async = true; s.onload = build;
        document.head.appendChild(s);
    }
}

// ================================================================
// STATS & TRANSACTIONS
// ================================================================
function addTransactionRow(type, stake, profit) {
    const container = document.getElementById('transaction-rows-container');
    const empty     = document.getElementById('empty-rows-msg');
    if (!container) return;
    if (empty) empty.style.display = 'none';

    const isWin = type === 'WIN';
    const row   = document.createElement('div');
    row.style.cssText = `display:flex;align-items:center;justify-content:space-between;padding:6px 8px;border-radius:6px;font-size:10px;font-weight:600;background:${isWin?'#00C85318':'#ef444418'};border:1px solid ${isWin?'#00C85344':'#ef444444'};margin-bottom:3px;`;
    row.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;">
            <span>${isWin?'🎯':'💥'}</span>
            <div><div style="color:${isWin?'#00C853':'#ef4444'}">${type}</div><div style="color:#64748b;font-family:monospace;">$${stake.toFixed(2)}</div></div>
        </div>
        <div style="font-family:monospace;font-weight:900;color:${isWin?'#00C853':'#ef4444'}">${isWin?'+':''}$${profit.toFixed(2)}</div>`;
    container.insertBefore(row, container.firstChild);

    // Also add to recent trades on dashboard
    const recentList = document.getElementById('recent-trades-list');
    if (recentList) {
        if (recentList.querySelector('.text-slate-500')) recentList.innerHTML = '';
        const r2 = row.cloneNode(true);
        recentList.insertBefore(r2, recentList.firstChild);
        if (recentList.children.length > 5) recentList.removeChild(recentList.lastChild);
    }
}

function updateStatsDashboard() {
    const $ = id => document.getElementById(id);
    if ($('stat-runs'))   $('stat-runs').textContent  = totalRuns;
    if ($('stat-stake'))  $('stat-stake').textContent = currentStake.toFixed(2);
    if (currentStake > peakExposure) {
        peakExposure = currentStake;
        if ($('stat-peak-exposure')) $('stat-peak-exposure').textContent = peakExposure.toFixed(2);
    }
    const wr = totalRuns > 0 ? ((totalWins/totalRuns)*100).toFixed(1) : "0.0";
    if ($('stat-win-rate')) $('stat-win-rate').textContent = `${wr}%`;
    if ($('stat-current-streak')) {
        $('stat-current-streak').textContent = currentStreak > 0 ? `+${currentStreak}` : currentStreak;
        $('stat-current-streak').style.color = currentStreak > 0 ? '#00C853' : currentStreak < 0 ? '#ef4444' : '#e2e8f0';
    }
    if ($('stat-profit')) {
        $('stat-profit').textContent = totalProfitLoss.toFixed(2);
        $('stat-profit').style.color = totalProfitLoss > 0 ? '#00C853' : totalProfitLoss < 0 ? '#ef4444' : '#e2e8f0';
    }

    // Dashboard
    if ($('dash-runs')) $('dash-runs').textContent = totalRuns;
    if ($('dash-wr'))   { $('dash-wr').textContent = `${wr}%`; $('dash-wr').style.color = '#00C853'; }
    if ($('dash-pl'))   { $('dash-pl').textContent = totalProfitLoss.toFixed(2); $('dash-pl').style.color = totalProfitLoss >= 0 ? '#00C853' : '#ef4444'; }
    if ($('dash-bot'))  $('dash-bot').textContent  = activeBotName;

    updateBotBar();
}

function updateBotBar() {
    const $ = id => document.getElementById(id);
    const wr = totalRuns > 0 ? ((totalWins/totalRuns)*100).toFixed(1) : "0.0";
    if ($('bar-runs'))     $('bar-runs').textContent     = totalRuns;
    if ($('bar-pl'))       { $('bar-pl').textContent = totalProfitLoss.toFixed(2); $('bar-pl').style.color = totalProfitLoss >= 0 ? '#00C853' : '#ef4444'; }
    if ($('bar-wr'))       $('bar-wr').textContent       = `${wr}%`;
    if ($('bar-bot-name')) $('bar-bot-name').textContent = activeBotName;
}

function checkThresholds() {
    const tp = parseFloat(document.getElementById('bot-tp')?.value || 0);
    const sl = parseFloat(document.getElementById('bot-sl')?.value || 0) * -1;
    if (tp > 0 && totalProfitLoss >= tp) { logJournal(`🏆 Take profit $${tp} hit!`); toggleBotExecution(); }
    else if (sl < 0 && totalProfitLoss <= sl) { logJournal(`⚠️ Stop loss $${Math.abs(sl)} hit!`); toggleBotExecution(); }
}

function updateDashboardStats(profit, status) {
    if (status === 'won') totalProfitLoss += parseFloat(profit);
    else totalProfitLoss += parseFloat(profit);
}

// ================================================================
// COPY TRADING
// ================================================================
function addNewSlave() {
    const tokenEl = document.getElementById('slave-token-input');
    const multEl  = document.getElementById('slave-multiplier-input');
    if (!tokenEl?.value) return alert("Enter a valid token");
    const slave = { id:Date.now(), token:tokenEl.value, multiplier:parseFloat(multEl?.value||1),
        ws: new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`) };
    slave.ws.onopen = () => slave.ws.send(JSON.stringify({ authorize: slave.token }));
    slaveAccounts.push(slave);
    tokenEl.value = '';
    logJournal(`👥 Slave added (x${slave.multiplier})`);
    renderSlaveList();
}

function renderSlaveList() {
    const container = document.getElementById('slave-list-container');
    if (!container) return;
    if (slaveAccounts.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-500 text-center py-4">No slave accounts added yet.</p>';
        return;
    }
    container.innerHTML = '';
    slaveAccounts.forEach(s => {
        const div = document.createElement('div');
        div.className = "bot-card";
        div.innerHTML = `<div><div class="font-black text-sm text-white">Slave #${s.id}</div><div class="text-[10px] text-slate-500">Multiplier: ×${s.multiplier}</div></div>
            <button onclick="removeSlave(${s.id})" class="btn-ghost text-xs px-3 py-1 rounded" style="color:#ef4444;">Remove</button>`;
        container.appendChild(div);
    });
}

function removeSlave(id) {
    const s = slaveAccounts.find(x => x.id === id);
    if (s?.ws) s.ws.close();
    slaveAccounts = slaveAccounts.filter(x => x.id !== id);
    renderSlaveList();
}

function replicateOrderToSlaves(params) {
    slaveAccounts.forEach(s => {
        if (s.ws?.readyState === WebSocket.OPEN) {
            s.ws.send(JSON.stringify({ buy:1, parameters:{...params, amount:params.amount*s.multiplier} }));
        }
    });
}

// ================================================================
// UI HELPERS
// ================================================================
function showStatus(msg, type) {
    const el = document.getElementById('connection-status');
    if (!el) return;
    el.classList.remove('hidden');
    const colors = { info:'#3b82f6', success:'#00C853', error:'#ef4444' };
    el.style.cssText = `border-color:${colors[type]||'#334155'};color:${colors[type]||'#e2e8f0'};background:${colors[type]||'#334155'}18;display:block;`;
    el.textContent = msg;
}

function updateConnectionStatus(on) {
    const els = [
        [document.getElementById('status-dot'),    document.getElementById('status-text')],
        [document.getElementById('bar-status-dot'), document.getElementById('bar-status-text')]
    ];
    els.forEach(([dot, text]) => {
        if (dot)  dot.style.background  = on ? '#00C853' : '#ef4444';
        if (text) { text.textContent    = on ? 'LIVE' : 'OFFLINE'; text.style.color = on ? '#00C853' : '#ef4444'; }
    });
}

function logJournal(text) {
    const t = document.getElementById('journal-terminal-log');
    if (!t) return;
    const div = document.createElement('div');
    div.className = 'text-xs';
    div.style.color = '#4ade80';
    div.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    t.appendChild(div);
    t.scrollTop = t.scrollHeight;
    if (t.children.length > 200) t.removeChild(t.firstChild);
}