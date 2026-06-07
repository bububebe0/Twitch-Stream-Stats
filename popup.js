let currentStats = null;
let pollHistory = [];
let viewerChart = null;

function applyI18nUI() {

  document.getElementById('liveLabel').textContent = currentStats?.isLive ? t('liveLabel_live') : t('liveLabel_off');

  document.getElementById('channelInput').placeholder = t('channelPlaceholder');
  document.getElementById('watchBtn').textContent = t('watchBtn');
  document.getElementById('toggleBtn').title = t('toggleTitle');
  document.getElementById('refreshBtn').title = t('refreshTitle');

  document.getElementById('tab-stats').textContent = t('tabStats');
  document.getElementById('tab-chatters').textContent = t('tabChat');
  document.getElementById('tab-history').textContent = t('tabHistory');
  document.getElementById('tab-settings').textContent = t('tabSettings');

  document.getElementById('s-interval-label').textContent = t('settingIntervalLabel');
  document.getElementById('s-interval-sub').textContent = t('settingIntervalSub');
  document.getElementById('s-unit-min').textContent = t('settingUnitMin');
  document.getElementById('s-presets-label').textContent = t('settingPresetsLabel');
  document.getElementById('s-presets-sub').textContent = t('settingPresetsSub');
  document.getElementById('preset-1').textContent = t('preset1');
  document.getElementById('preset-5').textContent = t('preset5');
  document.getElementById('preset-15').textContent = t('preset15');
  document.getElementById('preset-60').textContent = t('preset60');
  document.getElementById('s-clear-label').textContent = t('settingClearLabel');
  document.getElementById('s-clear-sub').textContent = t('settingClearSub');
  document.getElementById('clearHistoryBtn').textContent = t('settingClearBtn');
  document.getElementById('s-export-label').textContent = t('settingExportLabel');
  document.getElementById('s-export-sub').textContent = t('settingExportSub');
  document.getElementById('exportHtmlBtn').textContent = t('settingExportHtml');
  document.getElementById('s-lang-label').textContent = t('settingLangLabel');
  document.getElementById('s-lang-sub').textContent = t('settingLangSub');
  document.getElementById('s-archive-label').textContent = t('settingArchiveLabel');
  document.getElementById('s-archive-sub').textContent = t('settingArchiveSub');
  document.getElementById('clearArchiveBtn').textContent = t('settingArchiveClear');
  document.getElementById('s-api-note').textContent = t('settingApiNote');

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === getLang());
  });

  if (currentStats) renderStats(currentStats);
  if (document.querySelector('.tab[data-tab="history"]').classList.contains('active')) renderHistory();
  if (document.querySelector('.tab[data-tab="chatters"]').classList.contains('active')) renderChatters();
  if (document.querySelector('.tab[data-tab="settings"]').classList.contains('active')) renderArchive();
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const prev = document.querySelector('.tab.active');
    if (prev && prev.dataset.tab === 'chatters' && tab.dataset.tab !== 'chatters') stopChatPolling();
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'history') renderHistory();
    if (tab.dataset.tab === 'chatters') renderChatters();
    if (tab.dataset.tab === 'settings') renderArchive();
  });
});

function fmtUptime(sec) {
  if (!sec) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return t('hours', h, m);
  if (m > 0) return t('mins', m, s);
  return t('secs', s);
}
function fmtTime(ts) {
  const locale = getLang() === 'en' ? 'en-GB' : 'ru';
  return new Date(ts).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtDate(ts) {
  const locale = getLang() === 'en' ? 'en-GB' : 'ru';
  const d = new Date(ts);
  const date = d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${date} ${time}`;
}
function fmtNum(n) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
}

function renderStats(stats) {
  if (!stats) return;
  currentStats = stats;

  const dot = document.getElementById('liveDot');
  const lbl = document.getElementById('liveLabel');
  if (stats.isLive) {
    dot.className = 'dot live';
    lbl.textContent = t('liveLabel_live');
  } else {
    dot.className = 'dot';
    lbl.textContent = t('liveLabel_off');
  }

  const el = document.getElementById('statsContent');
  if (!stats.isLive) {
    el.innerHTML = `
      <div class="ch-info">
        ${stats.avatar ? `<img class="ch-avatar" src="${stats.avatar}" alt="${stats.displayName}">` : ''}
        <div>
          <div class="ch-name">${stats.displayName || stats.channel}</div>
          <div class="ch-game" style="color:var(--red)">${t('notLive')}</div>
        </div>
      </div>
      <div class="empty" style="padding:20px"><span>😴</span>${t('channelOffline', stats.displayName)}</div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="last-update">${t('updatedAt', fmtTime(stats.timestamp))}</div>
    <div class="ch-info">
      ${stats.avatar ? `<img class="ch-avatar" src="${stats.avatar}" alt="${stats.displayName}">` : ''}
      <div style="flex:1; min-width:0">
        <div class="ch-name">${stats.displayName || stats.channel}
          <span class="live-tag" style="margin-left:6px">🔴 Live</span>
        </div>
        <div class="ch-game">${stats.game || '—'}</div>
        <div class="ch-title" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${stats.title}">${stats.title || '—'}</div>
      </div>
    </div>
    <div class="cards">
      <div class="card">
        <div class="card-label">${t('cardViewers')}
          ${stats.viewerSources && stats.viewerSources.spread > 0
            ? `<span style="margin-left:4px;background:rgba(155,89,248,0.18);color:var(--accent);font-size:9px;padding:1px 5px;border-radius:3px;vertical-align:middle" title="GQL1: ${stats.viewerSources.gql ?? '?'} · GQL2: ${stats.viewerSources.gql2 ?? '?'} · Helix: ${stats.viewerSources.helix ?? '?'}">±${stats.viewerSources.spread.toLocaleString()}</span>`
            : ''}
        </div>
        <div class="card-value purple">${fmtNum(stats.viewers)}</div>
        <div class="card-sub">${t('cardViewersSub', stats.viewers.toLocaleString())}
          ${stats.viewerSources
            ? ` · <span style="font-size:9px;color:var(--muted)" title="${t('sourcesTitle')}">${[stats.viewerSources.gql, stats.viewerSources.gql2, stats.viewerSources.helix].map(v => v == null ? '?' : v.toLocaleString()).join(' / ')}</span>`
            : ''}
        </div>
      </div>
      <div class="card">
        <div class="card-label">${t('cardChatters')}</div>
        <div class="card-value green">${fmtNum(stats.chattersCount)}</div>
        <div class="card-sub">${t('cardChattersSub', stats.chattersCount)}</div>
      </div>
      <div class="card full" style="background:var(--surface2);border:1px solid var(--border)">
        <div class="card-label" style="margin-bottom:6px">${t('cardChatActivity')}</div>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="flex:1">
            <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:4px;font-family:'JetBrains Mono',monospace">
              <span>${t('chatMembers')}</span><span style="color:var(--text)">${stats.chattersCount}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:4px;font-family:'JetBrains Mono',monospace">
              <span>${t('chatSilent')} <span style="font-size:9px">${t('chatSilentHint')}</span></span><span style="color:var(--muted)">${stats.chatSilent != null ? stats.chatSilent : '—'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:6px;font-family:'JetBrains Mono',monospace">
              <span style="color:var(--green);font-weight:600">${t('chatActive')}</span><span style="color:var(--green);font-weight:600">${stats.chatActive != null ? stats.chatActive : '—'}</span>
            </div>
            ${stats.chatActive != null && stats.chattersCount > 0 ? (() => {
              const pct = Math.round((stats.chatActive / stats.chattersCount) * 100);
              return `<div style="height:4px;background:var(--border2);border-radius:2px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:var(--green);border-radius:2px;transition:width .4s"></div>
              </div>
              <div style="font-size:9px;color:var(--muted);margin-top:3px;text-align:right;font-family:'JetBrains Mono',monospace">${t('chatActivePct', pct)}</div>`;
            })() : ''}
          </div>
        </div>
      </div>
      <div class="card full">
        <div class="card-label">${t('cardUptime')}</div>
        <div class="card-value" style="font-size:18px">${fmtUptime(stats.uptimeSeconds)}</div>
      </div>
    </div>
    <div class="chart-wrap">
      <div class="chart-lbl">${t('chartViewers')}</div>
      <div style="position:relative;height:110px"><canvas id="viewerChartCanvas" role="img" aria-label="${t('chartViewers')}"></canvas></div>
    </div>
  `;
  renderChart();
}

function renderChart() {
  const canvas = document.getElementById('viewerChartCanvas');
  if (!canvas || pollHistory.length < 2) return;

  const live = pollHistory.filter(p => p.isLive);
  if (live.length < 2) return;

  const labels = live.map(p => fmtTime(p.timestamp));
  const data = live.map(p => p.viewers);

  if (viewerChart) { viewerChart.destroy(); viewerChart = null; }

  viewerChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: t('reportChartViewers'),
        data,
        borderColor: '#9b59f8',
        backgroundColor: 'rgba(155,89,248,0.12)',
        borderWidth: 2,
        pointRadius: live.length > 20 ? 0 : 3,
        pointBackgroundColor: '#9b59f8',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.y.toLocaleString()} ${t('reportChartViewersSuffix').trim()}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#6b7280', font: { size: 9, family: 'JetBrains Mono' }, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y: {
          ticks: { color: '#6b7280', font: { size: 9, family: 'JetBrains Mono' } },
          grid: { color: 'rgba(255,255,255,0.05)' },
          beginAtZero: false
        }
      }
    }
  });
}

let chatPollTimer = null;

function startChatPolling() {
  stopChatPolling();
  refreshChatPanel();
  chatPollTimer = setInterval(refreshChatPanel, 3000);
}

function stopChatPolling() {
  if (chatPollTimer) { clearInterval(chatPollTimer); chatPollTimer = null; }
}

function refreshChatPanel() {
  chrome.runtime.sendMessage({ type: 'GET_CHAT_LIVE' }, data => {
    if (chrome.runtime.lastError || !data) return;
    renderChatData(data.chatters, data.recentMessages || []);
  });
}

function renderChatters() {
  const el = document.getElementById('chattersContent');
  if (!currentStats || !currentStats.isLive) {
    el.innerHTML = `<div class="empty"><span>💬</span>${t('channelNotLive')}</div>`;
    stopChatPolling();
    return;
  }
  el.innerHTML = `
    <div class="chat-layout">
      <div class="chat-msgs-wrap">
        <div class="chatters-header">
          <span>${t('chatMessagesHdr')}</span>
          <span class="chatters-count" id="msgCount">0</span>
        </div>
        <div class="chat-messages" id="chatMessages">
          <div class="empty" style="padding:16px"><span style="font-size:18px">⏳</span>${t('chatWaiting')}</div>
        </div>
      </div>
      <div class="chat-presence-wrap">
        <div class="chatters-header">
          <span>${t('chatPresenceHdr')}</span>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:10px;color:var(--green);font-family:'JetBrains Mono',monospace" title="${t('chatActiveTip')}">✦ <span id="activeCount">0</span> ${t('chatActiveSuffix')}</span>
            <span class="chatters-count" id="presenceCount">0</span>
          </div>
        </div>
        <div class="chatters-list" id="presenceList"></div>
      </div>
    </div>
  `;
  startChatPolling();
}

function renderChatData(chatters, messages) {
  const msgEl = document.getElementById('chatMessages');
  const presEl = document.getElementById('presenceList');
  const msgCount = document.getElementById('msgCount');
  const presCount = document.getElementById('presenceCount');
  const activeCountEl = document.getElementById('activeCount');
  if (!msgEl || !presEl) return;

  if (msgCount) msgCount.textContent = messages.length;
  if (messages.length === 0) {
    msgEl.innerHTML = `<div class="empty" style="padding:16px"><span style="font-size:18px">⏳</span>${t('chatWaiting')}</div>`;
  } else {
    const wasAtBottom = msgEl.scrollHeight - msgEl.scrollTop - msgEl.clientHeight < 40;
    msgEl.innerHTML = messages.slice(-60).map(m => `
      <div class="chat-msg">
        <span class="chat-msg-user">${escHtml(m.user)}</span>
        <span class="chat-msg-text">${escHtml(m.text)}</span>
      </div>
    `).join('');
    if (wasAtBottom) msgEl.scrollTop = msgEl.scrollHeight;
  }

  const list = chatters ? chatters.list : [];
  const count = chatters ? chatters.count : 0;
  if (presCount) presCount.textContent = count;
  if (activeCountEl) activeCountEl.textContent = chatters ? (chatters.activeCount ?? 0) : 0;
  if (list.length === 0) {
    presEl.innerHTML = `<div class="chatter" style="color:var(--muted);justify-content:center">${t('chatPresenceWaiting')}</div>`;
  } else {
    presEl.innerHTML = list.map((nick, i) => `
      <div class="chatter">
        <div class="chatter-dot"></div>
        <span style="flex:1">${escHtml(nick)}</span>
        <span class="chatter-num">#${i + 1}</span>
      </div>
    `).join('') + (count > list.length
      ? `<div class="chatter" style="justify-content:center;color:var(--muted)">${t('chatMoreUsers', count - list.length)}</div>`
      : '');
  }
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderHistory() {
  const el = document.getElementById('historyContent');
  if (!pollHistory.length) {
    el.innerHTML = `<div class="empty"><span>📊</span>${t('historyEmpty2')}</div>`;
    return;
  }
  const rows = [...pollHistory].reverse().slice(0, 60);
  el.innerHTML = `
    <div style="margin-bottom:8px; display:flex; justify-content:space-between; align-items:center">
      <span style="font-size:10px;color:var(--muted);font-family:'JetBrains Mono',monospace">${t('historyLastN', rows.length)}</span>
    </div>
    <div class="history-wrap">
      <table class="history-table">
        <thead><tr>
          <th>${t('historyColTime')}</th>
          <th>${t('historyColViewers')}</th>
          <th>${t('historyColChatters')}</th>
          <th>${t('historyColOnline')}</th>
          <th>${t('historyColUptime')}</th>
        </tr></thead>
        <tbody>
          ${rows.map(r => `<tr>
            <td>${fmtTime(r.timestamp)}</td>
            <td style="color:var(--accent)">${r.isLive ? r.viewers.toLocaleString() : '—'}</td>
            <td style="color:var(--green)">${r.isLive ? r.chattersCount : '—'}</td>
            <td>${r.isLive ? '<span style="color:var(--red)">●</span> Live' : '<span style="color:var(--muted)">○</span> Off'}</td>
            <td>${r.isLive ? fmtUptime(r.uptimeSeconds) : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

document.getElementById('watchBtn').addEventListener('click', () => {
  const channel = document.getElementById('channelInput').value.trim().toLowerCase();
  if (!channel || !/^\w{3,25}$/.test(channel)) {
    const input = document.getElementById('channelInput');
    input.style.borderColor = 'var(--red)';
    setTimeout(() => { input.style.borderColor = ''; }, 2000);
    return;
  }

  // Always allow switching channels — the old session is auto-saved by background.js
  document.getElementById('statsContent').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  chrome.runtime.sendMessage({ type: 'SET_CHANNEL', channel });
  document.getElementById('toggleBtn').disabled = false;
  applyToggleState(true);
  setTimeout(loadData, 1500);
});

document.getElementById('channelInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('watchBtn').click();
});

function applyToggleState(isRunning) {
  const btn = document.getElementById('toggleBtn');
  const icon = document.getElementById('toggleIcon');
  const lbl = document.getElementById('toggleLabel');
  if (!btn) return;
  if (isRunning) {
    btn.classList.add('running');
    lbl.textContent = t('toggleStop');
    icon.innerHTML = '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>';
  } else {
    btn.classList.remove('running');
    lbl.textContent = t('toggleStart');
    icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
  }
}

document.getElementById('toggleBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'TOGGLE_PARSING' }, res => {
    if (res) applyToggleState(res.parsingActive);
  });
});
document.getElementById('refreshBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'POLL_NOW' }, () => {
    setTimeout(loadData, 800);
  });
});

document.getElementById('intervalInput').addEventListener('change', applyInterval);
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('intervalInput').value = btn.dataset.val;
    applyInterval();
  });
});

function applyInterval() {
  const minutes = parseFloat(document.getElementById('intervalInput').value);
  if (!isNaN(minutes) && minutes >= 0.5) {
    chrome.runtime.sendMessage({ type: 'SET_INTERVAL', minutes });
  }
}

document.getElementById('clearHistoryBtn').addEventListener('click', () => {
  if (confirm(t('confirmClearHistory'))) {
    chrome.storage.local.set({ pollHistory: [] });
    pollHistory = [];
    renderHistory();
  }
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const channel = currentStats?.channel || 'unknown';
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  const allChatters = new Set();
  const allMessages = [];
  const seenMsgKeys = new Set();
  for (const snap of pollHistory) {
    if (snap.chatters) snap.chatters.forEach(n => allChatters.add(n));
    if (snap.recentMessages) {
      for (const m of snap.recentMessages) {
        const key = `${m.ts}|${(m.login || m.user) || ''}|${m.text}`;
        if (seenMsgKeys.has(key)) continue;
        seenMsgKeys.add(key);
        if (m.login) allChatters.add(m.login);
        allMessages.push({
          time: fmtDate(m.ts),
          user: m.user,
          login: m.login || m.user,
          text: m.text
        });
      }
    }
  }

  const exportData = {
    exportedAt: fmtDate(Date.now()),
    channel,
    totalSnapshots: pollHistory.length,
    liveSnapshots: pollHistory.filter(p => p.isLive).length,
    uniqueChatters: [...allChatters],
    viewerHistory: pollHistory.map(p => ({
      time: fmtDate(p.timestamp),
      timestamp: p.timestamp,
      isLive: p.isLive,
      viewers: p.viewers,
      chattersCount: p.chattersCount,
      uptimeSeconds: p.uptimeSeconds,
      game: p.game,
      title: p.title
    })),
    recentMessages: allMessages.slice(-500)
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `twitch-stats-${channel}-${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('exportHtmlBtn').addEventListener('click', async () => {
  await exportHtmlReport();
});

async function exportHtmlReport(overrideChannel, overrideFileDateStr) {

  let chartJsSource = '';
  try {
    const chartUrl = chrome.runtime.getURL('chart.umd.js');
    const resp = await fetch(chartUrl);
    chartJsSource = await resp.text();
  } catch (e) {
    console.warn('Could not load local chart.umd.js, falling back to CDN', e);
  }

  if (!chartJsSource) {
    console.error('chart.umd.js not found locally — charts will not render in the report');
  }
  const chartScriptTag = chartJsSource
    ? `<script>${chartJsSource}<\/script>`
    : `<!-- chart.umd.js not found: add it to the extension folder -->`;

  const channel = overrideChannel || currentStats?.channel || 'unknown';
  const displayName = currentStats?.displayName || channel;
  const live = pollHistory.filter(p => p.isLive);

  const now = new Date();
  const dateStr = now.toLocaleString('ru', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  const fileDateStr = overrideFileDateStr || now.toISOString().slice(0, 10);

  const maxViewers = live.length ? Math.max(...live.map(p => p.viewers)) : 0;
  const avgViewers = live.length ? Math.round(live.reduce((s,p) => s+p.viewers, 0) / live.length) : 0;
  const maxChatters = live.length ? Math.max(...live.map(p => p.chattersCount)) : 0;

  const streamStart = live.length ? fmtDate(live[0].timestamp) : '—';
  const streamEnd = live.length ? fmtDate(live[live.length-1].timestamp) : '—';
  const totalUptimeSec = live.length ? live[live.length-1].uptimeSeconds : 0;

  const allChatters = new Set();
  const messagesByLogin = {};
  const seenMsgKeys = new Set();
  for (const snap of pollHistory) {
    if (snap.chatters) snap.chatters.forEach(n => allChatters.add(n));
    if (snap.recentMessages) {
      for (const m of snap.recentMessages) {
        const login = (m.login || m.user || '').toLowerCase();
        if (!login) continue;
        const key = `${m.ts}|${login}|${m.text}`;
        if (seenMsgKeys.has(key)) continue;
        seenMsgKeys.add(key);
        allChatters.add(login);
        if (!messagesByLogin[login]) messagesByLogin[login] = [];
        messagesByLogin[login].push({ user: m.user || login, text: m.text, ts: m.ts });
      }
    }
  }
  const chattersArr = [...allChatters];

  const activeData = live.map(p => p.chatActive ?? 0);
  const maxActive = activeData.length ? Math.max(...activeData) : 0;
  const avgActive = activeData.length ? Math.round(activeData.reduce((s,v) => s+v, 0) / activeData.length) : 0;

  const streamEndTs = live.length ? live[live.length - 1].timestamp : Date.now();
  const SILENT_THRESHOLD_MS = 10 * 60 * 1000;

  const lastSnap = live.length ? live[live.length - 1] : null;
  const lastActiveChatters = lastSnap?.chatters
    ? lastSnap.chatters.filter(login => {
        const msgs = messagesByLogin[login.toLowerCase()];
        if (!msgs || !msgs.length) return false;
        const lastMsgTs = Math.max(...msgs.filter(m => m.ts).map(m => m.ts));
        return (streamEndTs - lastMsgTs) < SILENT_THRESHOLD_MS;
      })
    : [];

  const anonData = live.map(p => Math.max(0, (p.viewers || 0) - (p.chattersCount || 0)));
  const maxAnon = anonData.length ? Math.max(...anonData) : 0;
  const avgAnon = anonData.length ? Math.round(anonData.reduce((s,v) => s+v, 0) / anonData.length) : 0;
  const lastAnonCount = lastSnap ? Math.max(0, (lastSnap.viewers || 0) - (lastSnap.chattersCount || 0)) : 0;

  const anonDataJson = JSON.stringify(anonData);
  const activeDataJson = JSON.stringify(activeData);

  const labels = live.map(p => fmtTime(p.timestamp));
  const viewersData = live.map(p => p.viewers);
  const chattersData = live.map(p => p.chattersCount);

  const allMsgsFlat = [];
  for (const snap of pollHistory) {
    if (snap.recentMessages) {
      for (const m of snap.recentMessages) {
        if (m.ts) allMsgsFlat.push(m.ts);
      }
    }
  }
  allMsgsFlat.sort((a, b) => a - b);

  const mpmData = live.map((snap, i) => {
    const windowEnd = snap.timestamp;
    const windowStart = i > 0 ? live[i - 1].timestamp : (windowEnd - 60000);
    const windowMin = (windowEnd - windowStart) / 60000;
    if (windowMin <= 0) return 0;
    const count = allMsgsFlat.filter(ts => ts > windowStart && ts <= windowEnd).length;
    return Math.round(count / windowMin);
  });
  const maxMpm = mpmData.length ? Math.max(...mpmData) : 0;

  const game = currentStats?.game || live[live.length-1]?.game || '—';
  const title = currentStats?.title || live[live.length-1]?.title || '—';

  const msgMapJson = JSON.stringify(messagesByLogin)
    .replace(/<\/script>/gi, '<\\/script>');

  const silentChatters = [];
  for (const [login, msgs] of Object.entries(messagesByLogin)) {
    const msgsWithTs = msgs.filter(m => m.ts);
    if (!msgsWithTs.length) continue;
    const lastTs = Math.max(...msgsWithTs.map(m => m.ts));
    const silentMs = streamEndTs - lastTs;
    if (silentMs >= SILENT_THRESHOLD_MS) {
      const silentMin = Math.round(silentMs / 60000);
      const displayUser = msgs[0].user || login;
      silentChatters.push({ login, user: displayUser, lastTs, silentMin, msgCount: msgs.length });
    }
  }

  silentChatters.sort((a, b) => b.silentMin - a.silentMin);

  const silentSectionHtml = silentChatters.length === 0
    ? `<div style="text-align:center;padding:24px;color:var(--muted);font-size:13px">${t('reportNoSilent')}</div>`
    : `<div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0">
        ${silentChatters.map(s => `<div class="silent-tag" title="${escHtmlStatic(t('reportSilentTip', s.user, new Date(s.lastTs).toLocaleTimeString(t('reportLang') === 'en' ? 'en-GB' : 'ru', {hour:'2-digit',minute:'2-digit'})))}">
          <span class="silent-name">${escHtmlStatic(s.user)}</span>
          <span class="silent-time">${t('reportSilentMinutes', s.silentMin)}</span>
        </div>`).join('')}
      </div>`;

  const html = `<!DOCTYPE html>
<html lang="${t('reportLang')}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${t('reportTitle', displayName, fileDateStr)}</title>
${chartScriptTag}
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Syne:wght@400;600;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0e0f14; --surface: #161720; --surface2: #1e2030;
    --border: rgba(255,255,255,0.08); --purple: #9b59f8;
    --green: #1db954; --red: #e74c3c;
    --text: #e8eaf0; --muted: #6b7280; --accent: #bf7bff;
  }
  body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif;
    font-size: 14px; min-height: 100vh; }
  .container { max-width: 900px; margin: 0 auto; padding: 32px 20px; }
  header { display: flex; align-items: center; gap: 16px; margin-bottom: 28px;
    padding-bottom: 20px; border-bottom: 1px solid var(--border); }
  .logo { width: 44px; height: 44px; background: var(--purple); border-radius: 10px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .logo svg { width: 24px; height: 24px; fill: #fff; }
  .header-info h1 { font-size: 22px; font-weight: 800; }
  .header-info p { font-size: 12px; color: var(--muted); margin-top: 3px; font-family: 'JetBrains Mono', monospace; }
  .live-tag { display: inline-flex; align-items: center; gap: 5px;
    background: rgba(231,76,60,.15); color: var(--red);
    font-size: 10px; font-weight: 800; letter-spacing: .1em;
    padding: 3px 8px; border-radius: 4px; text-transform: uppercase; margin-left: 8px; }
  .meta-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
  .meta-tag { background: var(--surface2); border: 1px solid var(--border);
    border-radius: 6px; padding: 6px 12px; font-size: 12px; color: var(--muted);
    white-space: nowrap; }
  .meta-tag strong { color: var(--text); font-weight: 700; }
  .meta-tag h { font-family: \'JetBrains Mono\', monospace; font-size: 13px;
    font-weight: 600; color: var(--accent); font-style: normal; display: inline; }
  /* ---- Scrollbars ---- */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; border-radius: 3px; }
  ::-webkit-scrollbar-thumb { background: linear-gradient(180deg, var(--purple) 0%, #6b3fa0 100%);
    border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, var(--accent) 0%, var(--purple) 100%); }
  ::-webkit-scrollbar-corner { background: transparent; }
  * { scrollbar-width: thin; scrollbar-color: var(--purple) transparent; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 10px; margin-bottom: 20px; }
  .card { background: var(--surface2); border: 1px solid var(--border);
    border-radius: 10px; padding: 14px 16px; }
  .card-label { font-size: 10px; font-weight: 600; letter-spacing: .08em;
    color: var(--muted); text-transform: uppercase; margin-bottom: 6px; }
  .card-value { font-family: 'JetBrains Mono', monospace; font-size: 26px;
    font-weight: 600; line-height: 1; }
  .card-value.purple { color: var(--accent); }
  .card-value.green { color: var(--green); }
  .card-sub { font-size: 10px; color: var(--muted); margin-top: 4px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 11px; font-weight: 600; letter-spacing: .08em;
    text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
  /* Chart */
  .chart-box { background: var(--surface2); border: 1px solid var(--border);
    border-radius: 10px; padding: 16px; overflow: hidden; }
  .chart-box .chart-inner { position: relative; width: 100%; }
  .chart-btn {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 6px; padding: 4px 10px; font-size: 10px; font-weight: 600;
    font-family: 'Syne', sans-serif; color: var(--muted); cursor: pointer;
    transition: all .15s; letter-spacing: .04em; white-space: nowrap;
  }
  .chart-btn:hover { color: var(--text); border-color: rgba(155,89,248,0.4); }
  .chart-btn.active { background: rgba(155,89,248,0.2); color: var(--accent); border-color: rgba(155,89,248,0.5); }
  .cstat { display: flex; flex-direction: column; gap: 2px; }
  .cstat-label { font-size: 9px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase; color: var(--muted); }
  .cstat-val { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 600; color: var(--text); line-height: 1; }
  .cstat-val.purple { color: var(--accent); }
  .cstat-val.green { color: var(--green); }
  .chatters-grid { display: flex; flex-wrap: wrap; gap: 6px; }
  .chatter-tag { background: var(--surface); border: 1px solid var(--border);
    border-radius: 6px; padding: 5px 11px; font-size: 11px;
    font-family: 'JetBrains Mono', monospace; color: var(--text);
    display: flex; align-items: center; gap: 6px;
    cursor: pointer; transition: border-color .15s, background .15s; }
  .chatter-tag:hover { border-color: var(--purple); background: rgba(155,89,248,0.1); color: var(--accent); }
  .chatter-tag.no-msgs { cursor: default; opacity: .6; }
  .chatter-tag.no-msgs:hover { border-color: var(--border); background: var(--surface); color: var(--text); }
  .chatter-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--green); flex-shrink: 0; }
  .chatter-msg-count { font-size: 9px; color: var(--muted); margin-left: 2px; }
  .history-table { width: 100%; border-collapse: collapse;
    font-family: 'JetBrains Mono', monospace; font-size: 11px; }
  .history-table th { text-align: left; color: var(--muted); font-size: 10px;
    letter-spacing: .07em; text-transform: uppercase; padding: 0 8px 8px; font-weight: 600; }
  .history-table td { padding: 5px 8px; border-bottom: 1px solid var(--border); color: var(--text); }
  .history-table tr:last-child td { border-bottom: none; }
  .table-wrap { background: var(--surface2); border: 1px solid var(--border);
    border-radius: 10px; padding: 10px 4px; max-height: 300px; overflow-y: auto; }
  footer { text-align: center; font-size: 10px; color: var(--muted);
    font-family: 'JetBrains Mono', monospace; padding-top: 20px;
    border-top: 1px solid var(--border); margin-top: 20px; }
  /* Modal */
  .modal-overlay { display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
    z-index: 1000; align-items: center; justify-content: center; }
  .modal-overlay.open { display: flex; }
  .modal { background: var(--surface); border: 1px solid var(--border2, rgba(255,255,255,0.13));
    border-radius: 14px; width: 520px; max-width: 95vw;
    max-height: 80vh; display: flex; flex-direction: column; overflow: hidden; }
  .modal-header { display: flex; align-items: center; gap: 10px;
    padding: 16px 18px 14px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .modal-title { font-size: 15px; font-weight: 800; color: var(--accent); flex: 1; }
  .modal-sub { font-size: 11px; color: var(--muted); font-family: 'JetBrains Mono', monospace; }
  .modal-close { background: none; border: none; color: var(--muted);
    font-size: 20px; cursor: pointer; padding: 0 2px; line-height: 1;
    transition: color .15s; }
  .modal-close:hover { color: var(--text); }
  .modal-body { overflow-y: auto; flex: 1; padding: 8px 0; }

  .modal-msg { padding: 7px 18px; border-bottom: 1px solid var(--border);
    font-size: 12px; line-height: 1.5; }
  .modal-msg:last-child { border-bottom: none; }
  .modal-msg-time { font-family: 'JetBrains Mono', monospace; font-size: 10px;
    color: var(--muted); margin-bottom: 2px; }
  .modal-msg-text { color: var(--text); word-break: break-word; }
  .modal-empty { text-align: center; color: var(--muted); padding: 32px; font-size: 13px; }
  /* Silent chatters */
  .silent-tag {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(231,76,60,0.08); border: 1px solid rgba(231,76,60,0.25);
    border-radius: 6px; padding: 5px 10px; font-size: 11px;
    font-family: 'JetBrains Mono', monospace; cursor: default;
    transition: border-color .15s, background .15s;
  }
  .silent-tag:hover { background: rgba(231,76,60,0.15); border-color: rgba(231,76,60,0.45); }
  .silent-name { color: var(--text); font-weight: 600; }
  .silent-time { color: #e74c3c; font-size: 10px; }
</style>
</head>
<body>
<div class="container">
  <header>
    <div class="logo">
      <svg viewBox="0 0 24 24"><path d="M2.149 0L.537 4.119v16.836h5.731V24h3.224l3.045-3.045h4.657l6.269-6.269V0H2.149zm19.164 13.612l-3.582 3.582H12.9L9.852 20.24v-3.046H4.119V2.987H21.313v10.625zm-3.582-6.269v5.373h-2.985V7.343h2.985zm-7.343 0v5.373H7.403V7.343h2.985z"/></svg>
    </div>
    <div class="header-info">
      <h1>${escHtmlStatic(displayName)} <span class="live-tag">${t('reportHeaderTag')}</span></h1>
      <p>${t('reportExportedAt', dateStr)} &nbsp;|&nbsp; ${t('reportChannel', escHtmlStatic(channel))}</p>
    </div>
  </header>

  <div class="meta-row">
    <div class="meta-tag">🎮 <strong>${escHtmlStatic(game)}</strong></div>
    <div class="meta-tag">📝 <strong>${escHtmlStatic(title)}</strong></div>
    <div class="meta-tag">▶ ${t('reportStart')}&nbsp;<h>${streamStart}</h></div>
    <div class="meta-tag">⏹ ${t('reportEnd')}&nbsp;<h>${streamEnd}</h></div>
    <div class="meta-tag">⏱ ${t('reportUptime')}&nbsp;<h>${fmtUptime(totalUptimeSec)}</h></div>
  </div>

  <div class="cards">
    <div class="card">
      <div class="card-label">${t('reportCardPeakV')}</div>
      <div class="card-value purple">${maxViewers.toLocaleString()}</div>
      <div class="card-sub">${t('reportCardPeakVSub')}</div>
    </div>
    <div class="card">
      <div class="card-label">${t('reportCardAvgV')}</div>
      <div class="card-value purple">${avgViewers.toLocaleString()}</div>
      <div class="card-sub">${t('reportCardAvgVSub')}</div>
    </div>
    <div class="card">
      <div class="card-label">${t('reportCardPeakC')}</div>
      <div class="card-value green">${maxChatters.toLocaleString()}</div>
      <div class="card-sub">${t('reportCardPeakCSub')}</div>
    </div>
    <div class="card">
      <div class="card-label">${t('reportCardUniqueC')}</div>
      <div class="card-value green">${chattersArr.length.toLocaleString()}</div>
      <div class="card-sub">${t('reportCardUniqueCSub')}</div>
    </div>
    <div class="card">
      <div class="card-label">${t('reportCardSnaps')}</div>
      <div class="card-value">${live.length}</div>
      <div class="card-sub">${t('reportCardSnapsSub')}</div>
    </div>
    <div class="card">
      <div class="card-label">${t('reportCardPeakMpm')}</div>
      <div class="card-value" style="color:#f59e0b">${maxMpm}</div>
      <div class="card-sub">${t('reportCardPeakMpmSub')}</div>
    </div>
    <div class="card">
      <div class="card-label">${t('reportCardPeakActive')}</div>
      <div class="card-value" style="color:#1db954">${maxActive.toLocaleString()}</div>
      <div class="card-sub">${t('reportCardPeakActiveSub', avgActive.toLocaleString())}</div>
    </div>
    <div class="card">
      <div class="card-label">${t('reportCardAnon')}</div>
      <div class="card-value" style="color:#6b7280">${maxAnon.toLocaleString()}</div>
      <div class="card-sub">${t('reportCardAnonSub', avgAnon.toLocaleString())}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <span>${t('reportSectionDynamic')}</span>
      <div style="display:flex;gap:6px;flex-wrap:wrap" id="chartToolbar">
        <button class="chart-btn active" data-mode="both">${t('reportBtnBoth')}</button>
        <button class="chart-btn" data-mode="viewers">${t('reportBtnViewers')}</button>
        <button class="chart-btn" data-mode="chatters">${t('reportBtnChatters')}</button>
        <span style="width:1px;background:rgba(255,255,255,0.1);margin:0 2px"></span>
        <button class="chart-btn" data-range="all">${t('reportBtnAll')}</button>
        <button class="chart-btn" data-range="25">25%</button>
        <button class="chart-btn" data-range="50">50%</button>
        <button class="chart-btn" data-range="75">75%</button>
        <span style="width:1px;background:rgba(255,255,255,0.1);margin:0 2px"></span>
        <button class="chart-btn" id="resetZoomBtn">${t('reportBtnReset')}</button>
      </div>
    </div>
    <div class="chart-box">
      <div id="chartStats" style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.07)">
        <div class="cstat"><div class="cstat-label">${t('reportCsLabelPeakV')}</div><div class="cstat-val purple" id="cs-peak-v">—</div></div>
        <div class="cstat"><div class="cstat-label">${t('reportCsLabelAvgV')}</div><div class="cstat-val purple" id="cs-avg-v">—</div></div>
        <div class="cstat"><div class="cstat-label">${t('reportCsLabelPeakC')}</div><div class="cstat-val green" id="cs-peak-c">—</div></div>
        <div class="cstat"><div class="cstat-label">${t('reportCsLabelAvgC')}</div><div class="cstat-val green" id="cs-avg-c">—</div></div>
        <div class="cstat"><div class="cstat-label">${t('reportCsLabelPoints')}</div><div class="cstat-val" id="cs-points">—</div></div>
        <div id="rangeInfo" style="margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);align-self:flex-end"></div>
      </div>
      <div class="chart-inner" style="height:220px;position:relative">
        <canvas id="mainChart"></canvas>
        <div id="chartTooltip" style="display:none;position:absolute;pointer-events:none;
          background:rgba(14,15,20,0.95);border:1px solid rgba(155,89,248,0.5);border-radius:8px;
          padding:8px 12px;font-family:'JetBrains Mono',monospace;font-size:11px;
          color:#e8eaf0;min-width:160px;z-index:10;box-shadow:0 4px 20px rgba(0,0,0,0.5)">
        </div>
      </div>
      <div style="margin-top:10px">
        <div style="font-size:10px;color:var(--muted);margin-bottom:4px;font-family:'JetBrains Mono',monospace">${t('reportRangeLabel')}</div>
        <div style="position:relative;height:36px;background:var(--bg);border:1px solid rgba(255,255,255,0.08);border-radius:7px;overflow:hidden">
          <canvas id="miniChart" style="width:100%;height:100%"></canvas>
          <div id="rangeSelector" style="position:absolute;top:0;left:0;height:100%;
            background:rgba(155,89,248,0.15);border-left:2px solid #9b59f8;border-right:2px solid #9b59f8;
            cursor:ew-resize;user-select:none">
            <div id="rangeLH" style="position:absolute;left:-4px;top:0;width:8px;height:100%;cursor:ew-resize;z-index:2"></div>
            <div id="rangeRH" style="position:absolute;right:-4px;top:0;width:8px;height:100%;cursor:ew-resize;z-index:2"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <span>${t('reportSectionMpm')}</span>
    </div>
    <div class="chart-box">
      <div id="mpmStats" style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.07)">
        <div class="cstat"><div class="cstat-label">${t('reportMpmPeak')}</div><div class="cstat-val" style="color:#f59e0b" id="cs-peak-mpm">—</div></div>
        <div class="cstat"><div class="cstat-label">${t('reportMpmAvg')}</div><div class="cstat-val" style="color:#f59e0b" id="cs-avg-mpm">—</div></div>
        <div id="mpmRangeInfo" style="margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);align-self:flex-end"></div>
      </div>
      <div class="chart-inner" style="height:160px;position:relative">
        <canvas id="mpmChart"></canvas>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <span>${t('reportSectionChatters', chattersArr.length)}</span>
      <input id="chatterSearch" type="text" placeholder="${t('reportChatterSearch')}" autocomplete="off"
        style="background:#0e0f14;border:1px solid rgba(255,255,255,0.13);border-radius:7px;
               padding:5px 12px;color:#e8eaf0;font-family:'JetBrains Mono',monospace;
               font-size:12px;outline:none;width:200px;transition:border .15s"
        onfocus="this.style.borderColor='#9b59f8'" onblur="this.style.borderColor='rgba(255,255,255,0.13)'" />
    </div>
    <div class="chatters-grid" id="chattersGrid">
      ${chattersArr.map(n => {
        const msgs = messagesByLogin[n.toLowerCase()] || [];
        const hasMsgs = msgs.length > 0;
        return `<div class="chatter-tag${hasMsgs ? '' : ' no-msgs'}" data-login="${escHtmlStatic(n.toLowerCase())}">
          <div class="chatter-dot"></div>${escHtmlStatic(n)}${hasMsgs ? `<span class="chatter-msg-count">${msgs.length}</span>` : ''}
        </div>`;
      }).join('')}
    </div>
  </div>

  <div class="section">
    <div class="section-title" style="display:flex;align-items:center;gap:10px">
      <span>${t('reportSectionSilent')}</span>
      <span style="background:rgba(231,76,60,0.15);color:#e74c3c;font-size:11px;font-weight:700;
        padding:2px 9px;border-radius:5px;font-family:'JetBrains Mono',monospace">${silentChatters.length}</span>
    </div>
    ${silentSectionHtml}
  </div>

  <div class="section">
    <div class="section-title" style="display:flex;align-items:center;gap:10px">
      <span>${t('reportSectionActive')}</span>
      <span style="background:rgba(29,185,84,0.15);color:#1db954;font-size:11px;font-weight:700;
        padding:2px 9px;border-radius:5px;font-family:'JetBrains Mono',monospace">${t('reportActiveNow', lastActiveChatters.length)}</span>
    </div>
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:10px">
      <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.07)">
        <div class="cstat"><div class="cstat-label">${t('reportActivePeak')}</div><div class="cstat-val green">${maxActive.toLocaleString()}</div></div>
        <div class="cstat"><div class="cstat-label">${t('reportActiveAvg')}</div><div class="cstat-val green">${avgActive.toLocaleString()}</div></div>
        <div class="cstat"><div class="cstat-label">${t('reportActiveAtEnd')}</div><div class="cstat-val green">${lastActiveChatters.length}</div></div>
        <div class="cstat"><div class="cstat-label">${t('reportActiveTotalChat')}</div><div class="cstat-val" style="color:var(--text)">${chattersArr.length}</div></div>
      </div>
      <div style="height:4px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden;margin-bottom:4px">
        ${chattersArr.length > 0 ? `<div style="height:100%;width:${Math.min(100,Math.round((maxActive/chattersArr.length)*100))}%;background:linear-gradient(90deg,#1db954,#17a344);border-radius:2px"></div>` : ''}
      </div>
      <div style="font-size:10px;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-bottom:10px">
        ${chattersArr.length > 0 ? t('reportActivePeakPct', Math.min(100,Math.round((maxActive/chattersArr.length)*100))) : ''}
      </div>
      <div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:.06em;text-transform:uppercase">
        ${t('reportActiveAtEndLabel', lastActiveChatters.length)}
      </div>
      ${lastActiveChatters.length === 0
        ? `<div style="text-align:center;padding:16px;color:var(--muted);font-size:12px">${t('reportActiveNoData')}</div>`
        : `<div style="display:flex;flex-wrap:wrap;gap:6px">
            ${lastActiveChatters.map(n => {
              const msgs = messagesByLogin[n.toLowerCase()] || [];
              return `<div class="chatter-tag${msgs.length ? '' : ' no-msgs'}" data-login="${escHtmlStatic(n.toLowerCase())}"
                style="border-color:rgba(29,185,84,0.3);background:rgba(29,185,84,0.06)">
                <div class="chatter-dot" style="background:#1db954"></div>${escHtmlStatic(n)}
                ${msgs.length ? `<span class="chatter-msg-count">${msgs.length}</span>` : ''}
              </div>`;
            }).join('')}
          </div>`
      }
    </div>
    <div class="chart-box">
      <div style="font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">
        ${t('reportActiveChartTitle')}
      </div>
      <div class="chart-inner" style="height:140px;position:relative">
        <canvas id="activeChart"></canvas>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title" style="display:flex;align-items:center;gap:10px">
      <span>${t('reportSectionAnon')}</span>
      <span style="background:rgba(107,114,128,0.2);color:#9ca3af;font-size:11px;font-weight:700;
        padding:2px 9px;border-radius:5px;font-family:'JetBrains Mono',monospace">${t('reportAnonAtEnd', lastAnonCount.toLocaleString())}</span>
    </div>
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:10px">
      <div style="font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.6">
        ${t('reportAnonDesc', t('reportAnonFormula'))}
      </div>
      <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.07)">
        <div class="cstat"><div class="cstat-label">${t('reportAnonPeak')}</div><div class="cstat-val" style="color:#9ca3af">${maxAnon.toLocaleString()}</div></div>
        <div class="cstat"><div class="cstat-label">${t('reportAnonAvg')}</div><div class="cstat-val" style="color:#9ca3af">${avgAnon.toLocaleString()}</div></div>
        <div class="cstat"><div class="cstat-label">${t('reportAnonAtEndLabel')}</div><div class="cstat-val" style="color:#9ca3af">${lastAnonCount.toLocaleString()}</div></div>
        <div class="cstat"><div class="cstat-label">${t('reportAnonPct')}</div><div class="cstat-val" style="color:#9ca3af">${maxViewers > 0 ? Math.round((maxAnon/maxViewers)*100) : 0}%</div></div>
      </div>
      <div style="margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-bottom:4px">
          <span>${t('reportAnonLabelAnon')}</span><span style="color:#9ca3af">${maxAnon.toLocaleString()} ${t('reportAnonPeakSuffix')}</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${maxViewers > 0 ? Math.round((maxAnon/maxViewers)*100) : 0}%;background:linear-gradient(90deg,#6b7280,#9ca3af);border-radius:3px"></div>
        </div>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-bottom:4px">
          <span>${t('reportAnonLabelAuth')}</span><span style="color:var(--green)">${maxChatters.toLocaleString()} ${t('reportAnonPeakSuffix')}</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${maxViewers > 0 ? Math.round((maxChatters/maxViewers)*100) : 0}%;background:linear-gradient(90deg,#1db954,#17a344);border-radius:3px"></div>
        </div>
      </div>
    </div>
    <div class="chart-box">
      <div style="font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">
        ${t('reportAnonChartTitle')}
      </div>
      <div class="chart-inner" style="height:140px;position:relative">
        <canvas id="anonChart"></canvas>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${t('reportSectionHistory')}</div>
    <div class="table-wrap">
      <table class="history-table">
        <thead><tr>
          <th>${t('reportHistoryTime')}</th><th>${t('reportHistoryViewers')}</th><th>${t('reportHistoryChatters')}</th><th>${t('reportHistoryStatus')}</th><th>${t('reportHistoryUptime')}</th>
        </tr></thead>
        <tbody>
          ${pollHistory.slice().reverse().map(r => `<tr>
            <td>${fmtDate(r.timestamp)}</td>
            <td style="color:#bf7bff">${r.isLive ? r.viewers.toLocaleString() : '—'}</td>
            <td style="color:#1db954">${r.isLive ? r.chattersCount : '—'}</td>
            <td>${r.isLive ? '<span style="color:#e74c3c">● Live</span>' : '<span style="color:#6b7280">○ Off</span>'}</td>
            <td>${r.isLive ? fmtUptime(r.uptimeSeconds) : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <footer>${t('reportFooter', escHtmlStatic(channel), dateStr)}</footer>
</div>

<!-- Modal -->
<div class="modal-overlay" id="modalOverlay">
  <div class="modal">
    <div class="modal-header">
      <div>
        <div class="modal-title" id="modalTitle"></div>
        <div class="modal-sub" id="modalSub"></div>
      </div>
      <button class="modal-close" id="modalClose">✕</button>
    </div>
    <div class="modal-body" id="modalBody"></div>
  </div>
</div>

<script>
const labels = ${JSON.stringify(labels)};
const viewersData = ${JSON.stringify(viewersData)};
const chattersData = ${JSON.stringify(chattersData)};
const mpmData = ${JSON.stringify(mpmData)};
const maxMpm = ${JSON.stringify(maxMpm)};
const messagesByLogin = ${msgMapJson};
const anonData = ${anonDataJson};
const activeData = ${activeDataJson};

// ---- Interactive unified chart ----
const N = labels.length;
let zoomStart = 0, zoomEnd = N - 1;
let mode = 'both'; // 'both' | 'viewers' | 'chatters'
let mainChart, miniChart;
let isDragging = false, dragTarget = null, dragX0 = 0, rangeS0 = 0, rangeE0 = 0;

function slice(arr) { return arr.slice(zoomStart, zoomEnd + 1); }

function calcStats(s, e) {
  const vd = viewersData.slice(s, e + 1).filter(v => v != null);
  const cd = chattersData.slice(s, e + 1).filter(v => v != null);
  const peakV = vd.length ? Math.max(...vd) : 0;
  const avgV = vd.length ? Math.round(vd.reduce((a,b)=>a+b,0)/vd.length) : 0;
  const peakC = cd.length ? Math.max(...cd) : 0;
  const avgC = cd.length ? Math.round(cd.reduce((a,b)=>a+b,0)/cd.length) : 0;
  return { peakV, avgV, peakC, avgC };
}

function fmt(n) { return n >= 1000 ? (n/1000).toFixed(1)+'k' : String(n); }

function updateStatsBar() {
  const s = calcStats(zoomStart, zoomEnd);
  document.getElementById('cs-peak-v').textContent = fmt(s.peakV);
  document.getElementById('cs-avg-v').textContent = fmt(s.avgV);
  document.getElementById('cs-peak-c').textContent = fmt(s.peakC);
  document.getElementById('cs-avg-c').textContent = fmt(s.avgC);
  document.getElementById('cs-points').textContent = (zoomEnd - zoomStart + 1);
  const ri = document.getElementById('rangeInfo');
  ri.textContent = zoomStart === 0 && zoomEnd === N-1 ? '${t("reportRangeFull")}' :
    labels[zoomStart] + ' → ' + labels[zoomEnd];
}

function buildDatasets() {
  const peakVIdx = viewersData.indexOf(Math.max(...viewersData));
  const peakCIdx = chattersData.indexOf(Math.max(...chattersData));
  const sliceLabels = slice(labels);
  const localPeakV = peakVIdx >= zoomStart && peakVIdx <= zoomEnd ? peakVIdx - zoomStart : -1;
  const localPeakC = peakCIdx >= zoomStart && peakCIdx <= zoomEnd ? peakCIdx - zoomStart : -1;

  const vPts = slice(viewersData).map((v,i) => ({
    x: i, y: v,
    pointRadius: i === localPeakV ? 6 : (sliceLabels.length > 60 ? 0 : 3),
    pointBackgroundColor: i === localPeakV ? '#fff' : '#9b59f8',
    pointBorderColor: i === localPeakV ? '#9b59f8' : undefined,
    pointBorderWidth: i === localPeakV ? 2 : 0,
  }));

  const cPts = slice(chattersData).map((v,i) => ({
    x: i, y: v,
    pointRadius: i === localPeakC ? 6 : (sliceLabels.length > 60 ? 0 : 3),
    pointBackgroundColor: i === localPeakC ? '#fff' : '#1db954',
    pointBorderColor: i === localPeakC ? '#1db954' : undefined,
    pointBorderWidth: i === localPeakC ? 2 : 0,
  }));

  const datasets = [];
  if (mode !== 'chatters') {
    datasets.push({
      label: '${t('reportChartViewers')}', data: vPts,
      borderColor: '#9b59f8',
      backgroundColor: mode === 'viewers' ? 'rgba(155,89,248,0.15)' : 'rgba(155,89,248,0.07)',
      borderWidth: 2, fill: mode === 'viewers', tension: 0.35,
      yAxisID: mode === 'both' ? 'y' : 'y',
      parsing: { xAxisKey: 'x', yAxisKey: 'y' },
    });
  }
  if (mode !== 'viewers') {
    datasets.push({
      label: '${t('reportChartChatters')}', data: cPts,
      borderColor: '#1db954',
      backgroundColor: mode === 'chatters' ? 'rgba(29,185,84,0.15)' : 'rgba(29,185,84,0.07)',
      borderWidth: 2, fill: mode === 'chatters', tension: 0.35,
      yAxisID: mode === 'both' ? 'y2' : 'y',
      parsing: { xAxisKey: 'x', yAxisKey: 'y' },
    });
  }
  return { datasets, sliceLabels };
}

function buildScales(sliceLabels) {
  const tickFont = { size: 9, family: 'JetBrains Mono' };
  const gridColor = 'rgba(255,255,255,0.05)';
  const xScale = {
    type: 'category', labels: sliceLabels,
    ticks: { color: '#6b7280', font: tickFont, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
    grid: { color: gridColor }
  };
  if (mode === 'both') {
    return {
      x: xScale,
      y: {
        position: 'left',
        ticks: { color: '#bf7bff', font: tickFont, maxTicksLimit: 6, callback: v => fmt(v) },
        grid: { color: gridColor }, title: { display: true, text: '${t('reportChartViewersAxis')}', color: '#bf7bff', font: { size: 9, family:'JetBrains Mono' } }
      },
      y2: {
        position: 'right',
        ticks: { color: '#1db954', font: tickFont, maxTicksLimit: 6, callback: v => fmt(v) },
        grid: { drawOnChartArea: false },
        title: { display: true, text: '${t('reportChartChatAxis')}', color: '#1db954', font: { size: 9, family:'JetBrains Mono' } }
      }
    };
  }
  const isViewers = mode === 'viewers';
  return {
    x: xScale,
    y: {
      position: 'left',
      ticks: { color: isViewers ? '#bf7bff' : '#1db954', font: tickFont, maxTicksLimit: 6, callback: v => fmt(v) },
      grid: { color: gridColor },
      beginAtZero: false
    }
  };
}

function renderMainChart() {
  const canvas = document.getElementById('mainChart');
  const { datasets, sliceLabels } = buildDatasets();

  // Peak annotation plugin
  const peakVIdx = viewersData.indexOf(Math.max(...viewersData));
  const peakCIdx = chattersData.indexOf(Math.max(...chattersData));

  const peakAnnotations = {};
  if (mode !== 'chatters' && peakVIdx >= zoomStart && peakVIdx <= zoomEnd) {
    peakAnnotations.peakV = {
      type: 'line', scaleID: 'x', value: peakVIdx - zoomStart,
      borderColor: 'rgba(155,89,248,0.4)', borderWidth: 1, borderDash: [4,3],
      label: { display: true, content: '${t('reportPeakViewersAnnotation')}', position: 'start',
        backgroundColor: 'rgba(155,89,248,0.15)', color: '#bf7bff',
        font: { size: 9, family: 'JetBrains Mono' }, padding: { x: 6, y: 3 },
        borderRadius: 4, borderColor: 'rgba(155,89,248,0.3)', borderWidth: 1 }
    };
  }
  if (mode !== 'viewers' && peakCIdx >= zoomStart && peakCIdx <= zoomEnd) {
    peakAnnotations.peakC = {
      type: 'line', scaleID: 'x', value: peakCIdx - zoomStart,
      borderColor: 'rgba(29,185,84,0.4)', borderWidth: 1, borderDash: [4,3],
      label: { display: true, content: '${t('reportPeakChatAnnotation')}', position: 'end',
        backgroundColor: 'rgba(29,185,84,0.12)', color: '#1db954',
        font: { size: 9, family: 'JetBrains Mono' }, padding: { x: 6, y: 3 },
        borderRadius: 4, borderColor: 'rgba(29,185,84,0.3)', borderWidth: 1 }
    };
  }

  if (mainChart) mainChart.destroy();
  mainChart = new Chart(canvas, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 200 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: mode === 'both',
          labels: { color: '#6b7280', font: { size: 10, family: 'JetBrains Mono' }, boxWidth: 10, padding: 12 }
        },
        tooltip: {
          backgroundColor: 'rgba(14,15,20,0.95)',
          borderColor: 'rgba(155,89,248,0.5)', borderWidth: 1,
          titleFont: { size: 10, family: 'JetBrains Mono' }, titleColor: '#6b7280',
          bodyFont: { size: 11, family: 'JetBrains Mono' }, bodyColor: '#e8eaf0',
          padding: 10, cornerRadius: 7,
          callbacks: {
            title: items => labels[zoomStart + items[0].dataIndex],
            label: ctx => {
              const suffix = ctx.dataset.label === '${t('reportChartViewers')}' ? '${t('reportChartViewersSuffix')}' : '${t('reportChartChattersSuffix')}';
              return \` \${ctx.parsed.y.toLocaleString()}\${suffix}\`;
            }
          }
        },
      },
      scales: buildScales(sliceLabels)
    }
  });
}

function renderMiniChart() {
  const canvas = document.getElementById('miniChart');
  if (miniChart) miniChart.destroy();
  miniChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: viewersData, borderColor: 'rgba(155,89,248,0.6)',
        backgroundColor: 'rgba(155,89,248,0.1)', borderWidth: 1,
        pointRadius: 0, fill: true, tension: 0.4
      }]
    },
    options: {
      responsive: false, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false },
        y: { display: false, beginAtZero: false }
      }
    }
  });
  updateRangeSelector();
}

function updateRangeSelector() {
  const rs = document.getElementById('rangeSelector');
  const pct = i => (i / Math.max(N-1, 1)) * 100;
  rs.style.left = pct(zoomStart) + '%';
  rs.style.width = (pct(zoomEnd) - pct(zoomStart)) + '%';
}

function updateAll() {
  renderMainChart();
  updateRangeSelector();
  updateStatsBar();
  updateMpmChart();
}

// ---- Range selector drag ----
const rangeEl = document.getElementById('rangeSelector');
const rangeLH = document.getElementById('rangeLH');
const rangeRH = document.getElementById('rangeRH');
const miniWrap = rangeEl.parentElement;

function getIdx(clientX) {
  const rect = miniWrap.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return Math.round(pct * (N - 1));
}

function startDrag(e, target) {
  isDragging = true; dragTarget = target;
  dragX0 = e.clientX || e.touches[0].clientX;
  rangeS0 = zoomStart; rangeE0 = zoomEnd;
  e.preventDefault();
}

rangeLH.addEventListener('mousedown', e => startDrag(e, 'left'));
rangeRH.addEventListener('mousedown', e => startDrag(e, 'right'));
rangeEl.addEventListener('mousedown', e => {
  if (e.target === rangeLH || e.target === rangeRH) return;
  startDrag(e, 'both');
});
rangeLH.addEventListener('touchstart', e => startDrag(e, 'left'), {passive:false});
rangeRH.addEventListener('touchstart', e => startDrag(e, 'right'), {passive:false});
rangeEl.addEventListener('touchstart', e => {
  if (e.target === rangeLH || e.target === rangeRH) return;
  startDrag(e, 'both');
}, {passive:false});

function onMove(e) {
  if (!isDragging) return;
  const cx = e.clientX ?? e.touches[0].clientX;
  const rect = miniWrap.getBoundingClientRect();
  const dx = (cx - dragX0) / rect.width * (N - 1);
  const ddx = Math.round(dx);
  if (dragTarget === 'left') {
    zoomStart = Math.max(0, Math.min(rangeE0 - 5, rangeS0 + ddx));
  } else if (dragTarget === 'right') {
    zoomEnd = Math.min(N-1, Math.max(rangeS0 + 5, rangeE0 + ddx));
  } else {
    const span = rangeE0 - rangeS0;
    zoomStart = Math.max(0, Math.min(N-1-span, rangeS0 + ddx));
    zoomEnd = zoomStart + span;
  }
  updateAll();
}
function onUp() { isDragging = false; dragTarget = null; }
document.addEventListener('mousemove', onMove);
document.addEventListener('mouseup', onUp);
document.addEventListener('touchmove', onMove, {passive:false});
document.addEventListener('touchend', onUp);

// ---- Toolbar ----
document.querySelectorAll('[data-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mode = btn.dataset.mode;
    renderMainChart();
  });
});
document.querySelectorAll('[data-range]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-range]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const r = btn.dataset.range;
    if (r === 'all') { zoomStart = 0; zoomEnd = N-1; }
    else {
      const pct = parseInt(r) / 100;
      const span = Math.round(N * pct);
      zoomStart = Math.max(0, N - span);
      zoomEnd = N - 1;
    }
    updateAll();
  });
});
document.getElementById('resetZoomBtn').addEventListener('click', () => {
  zoomStart = 0; zoomEnd = N-1;
  document.querySelectorAll('[data-range]').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-range="all"]').classList.add('active');
  updateAll();
});

// Keyboard zoom
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  const span = zoomEnd - zoomStart;
  const step = Math.max(1, Math.round(span * 0.1));
  if (e.key === 'ArrowRight') { zoomEnd = Math.min(N-1, zoomEnd+step); updateAll(); }
  if (e.key === 'ArrowLeft') { zoomStart = Math.max(0, zoomStart-step); updateAll(); }
  if (e.key === '+' || e.key === '=') {
    const pad = Math.max(1, Math.round(span*0.1));
    zoomStart = Math.min(zoomEnd-5, zoomStart+pad);
    zoomEnd = Math.max(zoomStart+5, zoomEnd-pad);
    updateAll();
  }
  if (e.key === '-') {
    const pad = Math.max(1, Math.round(span*0.1));
    zoomStart = Math.max(0, zoomStart-pad);
    zoomEnd = Math.min(N-1, zoomEnd+pad);
    updateAll();
  }
});

// ---- MPM Chart ----
let mpmChartInst = null;

function updateMpmStats() {
  const sliceMpm = mpmData.slice(zoomStart, zoomEnd + 1).filter(v => v != null && v >= 0);
  const peak = sliceMpm.length ? Math.max(...sliceMpm) : 0;
  const avg = sliceMpm.length ? Math.round(sliceMpm.reduce((a,b)=>a+b,0)/sliceMpm.length) : 0;
  document.getElementById('cs-peak-mpm').textContent = peak;
  document.getElementById('cs-avg-mpm').textContent = avg;
  const ri = document.getElementById('mpmRangeInfo');
  ri.textContent = zoomStart === 0 && zoomEnd === N-1 ? '${t("reportRangeFull")}' : labels[zoomStart] + ' → ' + labels[zoomEnd];
}

function initMpmChart() {
  const canvas = document.getElementById('mpmChart');
  if (!canvas || !mpmData.length) return;

  // Найдём индекс пика для аннотации
  const peakIdx = mpmData.indexOf(Math.max(...mpmData));

  mpmChartInst = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: '${t('reportMpmDataset')}',
        data: mpmData,
        backgroundColor: mpmData.map((v, i) => {
          if (i === peakIdx) return 'rgba(245,158,11,0.9)';
          return v > maxMpm * 0.7 ? 'rgba(245,158,11,0.55)' : 'rgba(245,158,11,0.28)';
        }),
        borderColor: mpmData.map((v, i) => i === peakIdx ? '#f59e0b' : 'transparent'),
        borderWidth: 1,
        borderRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: ctx => labels[ctx[0].dataIndex],
            label: ctx => ' ' + ctx.parsed.y + '${t('reportMpmSuffix')}'
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#6b7280', font: { size: 9, family: 'JetBrains Mono' }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
          grid: { color: 'rgba(255,255,255,0.04)' }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#6b7280', font: { size: 9, family: 'JetBrains Mono' }, stepSize: 1 },
          grid: { color: 'rgba(255,255,255,0.04)' }
        }
      }
    }
  });
  updateMpmStats();
}

function updateMpmChart() {
  if (!mpmChartInst) return;
  const sliced = mpmData.slice(zoomStart, zoomEnd + 1);
  const slicedLabels = labels.slice(zoomStart, zoomEnd + 1);
  const peakIdx = sliced.indexOf(Math.max(...sliced));
  mpmChartInst.data.labels = slicedLabels;
  mpmChartInst.data.datasets[0].data = sliced;
  mpmChartInst.data.datasets[0].backgroundColor = sliced.map((v, i) => {
    const localMax = Math.max(...sliced);
    if (i === peakIdx) return 'rgba(245,158,11,0.9)';
    return v > localMax * 0.7 ? 'rgba(245,158,11,0.55)' : 'rgba(245,158,11,0.28)';
  });
  mpmChartInst.data.datasets[0].borderColor = sliced.map((v, i) => i === peakIdx ? '#f59e0b' : 'transparent');
  mpmChartInst.update('none');
  updateMpmStats();
}

if (N > 1) { renderMiniChart(); updateAll(); initMpmChart(); initActiveChart(); initAnonChart(); }
else { document.getElementById('mainChart').closest('.chart-box').innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)">${t('reportInsufficientData')}</div>'; }

function initActiveChart() {
  const canvas = document.getElementById('activeChart');
  if (!canvas || !activeData.length) return;
  const peakIdx = activeData.indexOf(Math.max(...activeData));
  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '${t('reportActiveDataset')}',
        data: activeData,
        borderColor: '#1db954',
        backgroundColor: 'rgba(29,185,84,0.12)',
        borderWidth: 2, fill: true, tension: 0.35,
        pointRadius: activeData.map((_, i) => i === peakIdx ? 5 : (activeData.length > 40 ? 0 : 2)),
        pointBackgroundColor: activeData.map((_, i) => i === peakIdx ? '#fff' : '#1db954'),
        pointBorderColor: activeData.map((_, i) => i === peakIdx ? '#1db954' : undefined),
        pointBorderWidth: activeData.map((_, i) => i === peakIdx ? 2 : 0),
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { title: ctx => labels[ctx[0].dataIndex], label: ctx => ' ' + ctx.parsed.y.toLocaleString() + '${t('reportActiveSuffix')}' } }
      },
      scales: {
        x: { ticks: { color: '#6b7280', font: { size: 9, family: 'JetBrains Mono' }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { beginAtZero: true, ticks: { color: '#1db954', font: { size: 9, family: 'JetBrains Mono' }, callback: v => fmt(v) }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });
}

function initAnonChart() {
  const canvas = document.getElementById('anonChart');
  if (!canvas || !anonData.length) return;
  const peakIdx = anonData.indexOf(Math.max(...anonData));
  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '${t('reportAnonDataset')}',
        data: anonData,
        borderColor: '#6b7280',
        backgroundColor: 'rgba(107,114,128,0.1)',
        borderWidth: 2, fill: true, tension: 0.35,
        pointRadius: anonData.map((_, i) => i === peakIdx ? 5 : (anonData.length > 40 ? 0 : 2)),
        pointBackgroundColor: anonData.map((_, i) => i === peakIdx ? '#fff' : '#6b7280'),
        pointBorderColor: anonData.map((_, i) => i === peakIdx ? '#6b7280' : undefined),
        pointBorderWidth: anonData.map((_, i) => i === peakIdx ? 2 : 0),
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { title: ctx => labels[ctx[0].dataIndex], label: ctx => ' ' + ctx.parsed.y.toLocaleString() + '${t('reportAnonSuffix')}' } }
      },
      scales: {
        x: { ticks: { color: '#6b7280', font: { size: 9, family: 'JetBrains Mono' }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { beginAtZero: true, ticks: { color: '#9ca3af', font: { size: 9, family: 'JetBrains Mono' }, callback: v => fmt(v) }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });
}

document.getElementById('chatterSearch').addEventListener('input', function() {
  const q = this.value.trim().toLowerCase();
  document.querySelectorAll('#chattersGrid .chatter-tag').forEach(el => {
    el.style.display = (!q || el.dataset.login.includes(q)) ? '' : 'none';
  });
});

// ---- Chatter modal ----
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
const _reportLocale = '${t('reportLang') === 'en' ? 'en-GB' : 'ru'}';
function fmtTs(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString(_reportLocale,{day:'2-digit',month:'2-digit',year:'numeric'})
    + ' ' + d.toLocaleTimeString(_reportLocale,{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
function fmtMsgCount(n) {
  ${t('reportLang') === 'en'
    ? "return n + ' message' + (n === 1 ? '' : 's') + ' in stream';"
    : "return n + ' сообщени' + (n===1?'е':n<5?'я':'й') + ' за стрим';"
  }
}

const overlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalSub = document.getElementById('modalSub');
const modalBody = document.getElementById('modalBody');

function openModal(login) {
  const msgs = messagesByLogin[login] || [];
  if (!msgs.length) return;
  const displayName = msgs[0].user || login;
  modalTitle.textContent = displayName;
  modalSub.textContent = fmtMsgCount(msgs.length);
  modalBody.innerHTML = msgs.map(m => \`
    <div class="modal-msg">
      <div class="modal-msg-time">\${fmtTs(m.ts)}</div>
      <div class="modal-msg-text">\${esc(m.text)}</div>
    </div>
  \`).join('');
  overlay.classList.add('open');
}

document.getElementById('chattersGrid').addEventListener('click', e => {
  const tag = e.target.closest('.chatter-tag');
  if (!tag || tag.classList.contains('no-msgs')) return;
  openModal(tag.dataset.login);
});

// Active chatters grid (click to see messages)
document.querySelectorAll('.chatter-tag[data-login]').forEach(el => {
  if (el.closest('#chattersGrid')) return; // already handled
  el.addEventListener('click', () => {
    if (el.classList.contains('no-msgs')) return;
    openModal(el.dataset.login);
  });
});

document.getElementById('modalClose').addEventListener('click', () => overlay.classList.remove('open'));
overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.classList.remove('open'); });
<\/script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `twitch-report-${channel}-${fileDateStr}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function escHtmlStatic(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function loadData() {
  chrome.runtime.sendMessage({ type: 'GET_HISTORY' }, data => {
    if (!data) {
      document.getElementById('statsContent').innerHTML = `<div class="empty"><span>📡</span>${t('statsEmpty')}</div>`;
      document.getElementById('chattersContent').innerHTML = `<div class="empty"><span>💬</span>${t('chatEmpty')}</div>`;
      document.getElementById('historyContent').innerHTML = `<div class="empty"><span>📊</span>${t('historyEmpty')}</div>`;
      return;
    }
    pollHistory = data.pollHistory || [];
    const stats = data.lastStats;
    if (stats) {
      renderStats(stats);
      if (document.querySelector('.tab[data-tab="chatters"]').classList.contains('active')) renderChatters();
      if (document.querySelector('.tab[data-tab="history"]').classList.contains('active')) renderHistory();
      if (document.querySelector('.tab[data-tab="settings"]').classList.contains('active')) renderArchive();
    } else {
      document.getElementById('statsContent').innerHTML = `<div class="empty"><span>📡</span>${t('statsEmpty')}</div>`;
      document.getElementById('chattersContent').innerHTML = `<div class="empty"><span>💬</span>${t('chatEmpty')}</div>`;
      document.getElementById('historyContent').innerHTML = `<div class="empty"><span>📊</span>${t('historyEmpty')}</div>`;
    }
    if (data.channel) {
      document.getElementById('channelInput').value = data.channel;
      document.getElementById('toggleBtn').disabled = false;
      chrome.runtime.sendMessage({ type: 'GET_PARSING_STATE' }, res => {
        if (res) applyToggleState(res.parsingActive);
      });
    }
    if (data.pollInterval) document.getElementById('intervalInput').value = data.pollInterval;
  });
}

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'STATS_UPDATED') {
    const alreadyExists = pollHistory.length > 0 &&
      pollHistory[pollHistory.length - 1].timestamp === msg.stats.timestamp;
    if (!alreadyExists) {
      pollHistory.push(msg.stats);
      if (pollHistory.length > 200) pollHistory = pollHistory.slice(-200);
    }
    renderStats(msg.stats);
    if (document.querySelector('.tab[data-tab="chatters"]').classList.contains('active')) renderChatters();
    if (document.querySelector('.tab[data-tab="history"]').classList.contains('active')) renderHistory();
  }
  if (msg.type === 'PARSING_STOPPED') {
    if (document.querySelector('.tab[data-tab="settings"]').classList.contains('active')) renderArchive();
  }
});

// ---- Language buttons ----
document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.lang === getLang()) return;
    setLang(btn.dataset.lang);
    applyI18nUI();
  });
});

// ---- Init ----
initLang().then(() => {
  applyI18nUI();
  loadData();
});
// ---- Archive ----

function fmtShortDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(startTs, endTs) {
  if (!startTs || !endTs) return '—';
  const sec = Math.floor((endTs - startTs) / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return t('hours', h, m);
  return t('mins', m, 0).split(' ')[0]; // just "Xm" part
}

function renderArchive() {
  const el = document.getElementById('archiveContent');
  el.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  chrome.runtime.sendMessage({ type: 'GET_ARCHIVE' }, ({ savedSessions = [] }) => {
    const clearBtn = document.getElementById('clearArchiveBtn');

    if (savedSessions.length === 0) {
      el.innerHTML = `<div class="empty" style="padding:16px 0"><span>🗂</span>${t('archiveEmpty')}</div>`;
      if (clearBtn) clearBtn.style.display = 'none';
      return;
    }

    if (clearBtn) {
      clearBtn.style.display = '';
      clearBtn.onclick = () => {
        if (confirm(t('confirmClearArchive'))) {
          chrome.runtime.sendMessage({ type: 'CLEAR_ARCHIVE' }, () => renderArchive());
        }
      };
    }

    el.innerHTML = `<div id="sessionList">${savedSessions.map(s => renderSessionCard(s)).join('')}</div>`;

    document.querySelectorAll('.session-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        if (confirm(t('confirmDeleteSession'))) {
          chrome.runtime.sendMessage({ type: 'DELETE_SESSION', id }, () => renderArchive());
        }
      });
    });

    document.querySelectorAll('.session-json-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const session = savedSessions.find(s => s.id === id);
        if (session) exportSessionJson(session);
      });
    });

    document.querySelectorAll('.session-html-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const session = savedSessions.find(s => s.id === id);
        if (session) exportSessionHtml(session);
      });
    });
  });
}

function renderSessionCard(s) {
  const avatarHtml = s.avatar
    ? `<img class="session-avatar" src="${escHtml(s.avatar)}" alt="${escHtml(s.displayName)}">`
    : `<div class="session-avatar-placeholder">📡</div>`;

  const gameStr = s.game ? escHtml(s.game) : '—';
  const titleStr = s.title ? escHtml(s.title) : '—';

  return `
    <div class="session-card">
      <div class="session-head">
        ${avatarHtml}
        <div class="session-meta">
          <div class="session-name">${escHtml(s.displayName || s.channel)}</div>
          <div class="session-date">${fmtShortDate(s.savedAt)} · ${fmtDuration(s.streamStart, s.streamEnd)}</div>
        </div>
        <button class="session-del" data-id="${s.id}" title="${t('confirmDeleteSession').replace('?','')}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>

      <div class="session-stats">
        <div class="session-stat">
          <div class="session-stat-label">${t('archivePeakViewers')}</div>
          <div class="session-stat-val">${s.maxViewers > 0 ? fmtNum(s.maxViewers) : '—'}</div>
        </div>
        <div class="session-stat">
          <div class="session-stat-label">${t('archiveAvgViewers')}</div>
          <div class="session-stat-val">${s.avgViewers > 0 ? fmtNum(s.avgViewers) : '—'}</div>
        </div>
        <div class="session-stat">
          <div class="session-stat-label">${t('archiveSnapshots')}</div>
          <div class="session-stat-val">${s.snapshots}</div>
        </div>
      </div>

      <div class="session-info" title="${titleStr}">
        🎮 <strong>${gameStr}</strong> &nbsp;·&nbsp; ${titleStr}
      </div>

      <div class="session-btns">
        <button class="btn-ghost session-json-btn" data-id="${s.id}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          JSON
        </button>
        <button class="btn-ghost html-btn session-html-btn" data-id="${s.id}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          HTML отчёт
        </button>
      </div>
    </div>
  `;
}

function exportSessionJson(session) {
  const history = session.pollHistory || [];
  const allChatters = new Set();
  const allMessages = [];
  const seenMsgKeys = new Set();
  for (const snap of history) {
    if (snap.chatters) snap.chatters.forEach(n => allChatters.add(n));
    if (snap.recentMessages) {
      for (const m of snap.recentMessages) {
        const key = `${m.ts}|${(m.login || m.user) || ''}|${m.text}`;
        if (seenMsgKeys.has(key)) continue;
        seenMsgKeys.add(key);
        if (m.login) allChatters.add(m.login);
        allMessages.push({ time: fmtDate(m.ts), user: m.user, login: m.login || m.user, text: m.text });
      }
    }
  }
  const data = {
    exportedAt: fmtDate(Date.now()),
    channel: session.channel,
    displayName: session.displayName,
    savedAt: fmtDate(session.savedAt),
    maxViewers: session.maxViewers,
    avgViewers: session.avgViewers,
    maxChatters: session.maxChatters,
    game: session.game,
    title: session.title,
    streamStart: fmtDate(session.streamStart),
    streamEnd: fmtDate(session.streamEnd),
    uptimeSeconds: session.uptimeSeconds,
    totalSnapshots: session.snapshots,
    uniqueChatters: [...allChatters],
    viewerHistory: history.map(p => ({
      time: fmtDate(p.timestamp), timestamp: p.timestamp,
      isLive: p.isLive, viewers: p.viewers,
      chattersCount: p.chattersCount, uptimeSeconds: p.uptimeSeconds,
      game: p.game, title: p.title
    })),
    recentMessages: allMessages.slice(-500)
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `twitch-stats-${session.channel}-${new Date(session.savedAt).toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportSessionHtml(session) {
  const _stats = currentStats;
  const _history = pollHistory;
  try {
    currentStats = {
      channel: session.channel,
      displayName: session.displayName,
      avatar: session.avatar,
      game: session.game,
      title: session.title
    };
    pollHistory = session.pollHistory || [];
    await exportHtmlReport(session.channel, new Date(session.savedAt).toISOString().slice(0,10));
  } finally {
    currentStats = _stats;
    pollHistory = _history;
  }
}
