const CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';

let ircWs = null;
let ircChannel = null;
let chatPresence = new Set();
let recentMessages = [];
let recentMsgKeys = new Set();
let lastMessageTime = new Map();

const SILENT_THRESHOLD_MS = 10 * 60 * 1000;

function parseIrcTags(raw) {

  const tags = {};
  if (!raw || raw[0] !== '@') return tags;
  const tagStr = raw.slice(1, raw.indexOf(' '));
  for (const part of tagStr.split(';')) {
    const eq = part.indexOf('=');
    if (eq !== -1) tags[part.slice(0, eq)] = part.slice(eq + 1);
  }
  return tags;
}

function ircConnect(channel) {
  if (ircWs) {
    try { ircWs.close(); } catch(_) {}
    ircWs = null;
  }
  chatPresence = new Set();
  recentMessages = [];
  recentMsgKeys = new Set();
  lastMessageTime = new Map();
  ircChannel = channel.toLowerCase();

  const nick = 'justinfan' + Math.floor(Math.random() * 80000 + 1000);
  const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
  ircWs = ws;

  ws.onopen = () => {
    ws.send('CAP REQ :twitch.tv/membership twitch.tv/tags twitch.tv/commands');
    ws.send(`NICK ${nick}`);
    ws.send(`JOIN #${ircChannel}`);
  };

  ws.onmessage = (event) => {
    const lines = event.data.split('\r\n').filter(Boolean);
    for (const line of lines) {
      if (line.startsWith('PING')) {
        ws.send('PONG :tmi.twitch.tv');
        continue;
      }

      let rest = line;
      let tags = {};
      if (rest.startsWith('@')) {
        const spaceIdx = rest.indexOf(' ');
        tags = parseIrcTags(rest.slice(0, spaceIdx));
        rest = rest.slice(spaceIdx + 1);
      }

      const joinMatch = rest.match(/^:(\w+)!\w+@\S+ JOIN #/);
      if (joinMatch) {
        const user = joinMatch[1].toLowerCase();
        if (!user.startsWith('justinfan')) chatPresence.add(user);
        continue;
      }

      const partMatch = rest.match(/^:(\w+)!\w+@\S+ PART #/);
      if (partMatch) {
        chatPresence.delete(partMatch[1].toLowerCase());
        continue;
      }

      const msgMatch = rest.match(/^:([^!]+)![^ ]+ PRIVMSG #[^ ]+ :(.+)/);
      if (msgMatch) {
        const login = msgMatch[1].toLowerCase();
        const text = msgMatch[2];

        const displayName = (tags['display-name'] || login).replace(/[^\w\d_\-\.]/g, '');
        if (!login.startsWith('justinfan')) {
          chatPresence.add(login);
          lastMessageTime.set(login, Date.now());

          const msgKey = `${login}|${text}|${Math.floor(Date.now() / 2000)}`;
          if (!recentMsgKeys.has(msgKey)) {
            recentMsgKeys.add(msgKey);
            recentMessages.push({
              user: displayName || login,
              login,
              text,
              ts: Date.now()
            });
            if (recentMessages.length > 200) recentMessages.shift();

            if (recentMsgKeys.size > 500) {
              const arr = [...recentMsgKeys];
              recentMsgKeys = new Set(arr.slice(arr.length - 300));
            }
          }
        }
        continue;
      }
    }
  };

  ws.onerror = () => {};
  ws.onclose = () => {
    if (ircWs === ws) {
      setTimeout(() => { if (ircChannel === channel) ircConnect(channel); }, 5000);
    }
  };
}

function getChatStats() {
  const now = Date.now();
  const list = [...chatPresence];

  let activeCount = 0;
  let silentCount = 0;
  for (const login of list) {
    const t = lastMessageTime.get(login);
    if (t && (now - t) < SILENT_THRESHOLD_MS) {
      activeCount++;
    } else {
      silentCount++;
    }
  }

  const uniqueAuthors = lastMessageTime.size;

  return {
    list: list.length > 0 ? list.slice(0, 100) : [...lastMessageTime.keys()].slice(0, 100),
    count: Math.max(chatPresence.size, uniqueAuthors),
    activeCount,
    silentCount,
    uniqueAuthors,
    recentMessages: recentMessages.slice(-50)
  };
}

async function fetchGqlChattersCount(channelName) {
  try {
    const res = await fetch('https://gql.twitch.tv/gql', {
      method: 'POST',
      headers: { 'Client-Id': CLIENT_ID, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operationName: 'ChatViewers',
        variables: { channelLogin: channelName },
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: 'e0761ef5444ee3acccee5cfc5b834cbfd7dc220133aa5fbefe1b66120f506250'
          }
        }
      })
    });
    if (!res.ok) return null;
    const json = await res.json();

    const count = json?.data?.channel?.chatters?.count;
    return typeof count === 'number' ? count : null;
  } catch (e) { return null; }
}

async function fetchGqlMain(channelName) {
  try {
    const res = await fetch('https://gql.twitch.tv/gql', {
      method: 'POST',
      headers: { 'Client-Id': CLIENT_ID, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query {
          user(login: "${channelName}") {
            login displayName
            profileImageURL(width: 70)
            stream {
              id title viewersCount createdAt
              game { name }
            }
          }
        }`
      })
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.user || null;
  } catch (e) { return null; }
}

async function fetchGqlViewerCount(channelName) {
  try {
    const res = await fetch('https://gql.twitch.tv/gql', {
      method: 'POST',
      headers: { 'Client-Id': CLIENT_ID, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        {
          operationName: 'VideoPlayerStreamInfoOverlayChannel',
          variables: { channel: channelName },
          extensions: { persistedQuery: { version: 1, sha256Hash: '198d52cbfb5445e2424aa7382d5d85a56a30a8eddadf9bc61e4c5b6942b0cf58' } }
        },
        {
          operationName: 'UseViewCount',
          variables: { channelLogin: channelName },
          extensions: { persistedQuery: { version: 1, sha256Hash: '00b11c9c428f79ae228f30080a06ffd8226a1f068d6f52985125151f7e5df89f' } }
        }
      ])
    });
    if (!res.ok) return null;
    const json = await res.json();
    const vc = json?.[1]?.data?.channel?.stream?.viewersCount;
    return typeof vc === 'number' ? vc : null;
  } catch (e) { return null; }
}

async function fetchHelixViewerCount(channelName) {
  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(channelName)}`,
      { headers: { 'Client-Id': CLIENT_ID } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const stream = json?.data?.[0];
    return stream ? stream.viewer_count : null;
  } catch (e) { return null; }
}

async function fetchViewerCountAggregated(channelName, baseCount) {
  const [vcGql2, vcHelix] = await Promise.all([
    fetchGqlViewerCount(channelName),
    fetchHelixViewerCount(channelName)
  ]);
  const sources = [baseCount, vcGql2, vcHelix].filter(v => typeof v === 'number' && v > 0);
  if (sources.length === 0) return { viewers: baseCount || 0, viewerSources: null };

  const viewers = Math.max(...sources);
  const minVal = Math.min(...sources);
  return {
    viewers,
    viewerSources: { gql: baseCount, gql2: vcGql2, helix: vcHelix, spread: viewers - minVal }
  };
}

async function collectStats(channelName) {
  const user = await fetchGqlMain(channelName);
  if (!user) return null;

  const now = Date.now();
  const stream = user.stream;
  let uptime = 0;
  if (stream?.createdAt) {
    uptime = Math.floor((now - new Date(stream.createdAt).getTime()) / 1000);
  }

  const chat = getChatStats();
  let viewers = stream?.viewersCount || 0;
  let viewerSources = null;

  if (stream) {
    const [agg, gqlChattersCount] = await Promise.all([
      fetchViewerCountAggregated(channelName, viewers),
      fetchGqlChattersCount(channelName)
    ]);
    viewers = agg.viewers;
    viewerSources = agg.viewerSources;

    const chattersCount = (typeof gqlChattersCount === 'number' && gqlChattersCount > 0)
      ? gqlChattersCount
      : (chat.count > 0 ? chat.count : (chat.uniqueAuthors || 0));

    return {
      timestamp: now,
      channel: user.login,
      displayName: user.displayName,
      avatar: user.profileImageURL,
      isLive: !!stream,
      title: stream?.title || '',
      game: stream?.game?.name || '',
      viewers,
      viewerSources,
      uptimeSeconds: uptime,
      chatters: chat.list,
      chattersCount,
      chatActive: chat.activeCount,
      chatSilent: chat.silentCount,
      chattersCountSource: (typeof gqlChattersCount === 'number' && gqlChattersCount > 0) ? 'gql' : 'irc',
      recentMessages: chat.recentMessages
    };
  }

  return {
    timestamp: now,
    channel: user.login,
    displayName: user.displayName,
    avatar: user.profileImageURL,
    isLive: false,
    title: '', game: '', viewers: 0, viewerSources: null, uptimeSeconds: 0,
    chatters: chat.list, chattersCount: chat.count, recentMessages: chat.recentMessages
  };
}

async function runPoll() {
  const { channel, pollHistory = [], parsingActive } = await chrome.storage.local.get(['channel', 'pollHistory', 'parsingActive']);
  if (!channel || parsingActive === false) return;

  const stats = await collectStats(channel);
  if (!stats) return;

  const updated = [...pollHistory, stats].slice(-200);
  await chrome.storage.local.set({ pollHistory: updated, lastStats: stats });
  chrome.runtime.sendMessage({ type: 'STATS_UPDATED', stats }).catch(() => {});

  if (!stats.isLive) {
    const wasLive = pollHistory.some(p => p.isLive);
    if (wasLive) {

      chrome.alarms.clear('pollStats');
      if (ircWs) { try { ircWs.close(); } catch(_) {} ircWs = null; }
      chatPresence = new Set();
      recentMessages = [];
      recentMsgKeys = new Set();
      lastMessageTime = new Map();
      await chrome.storage.local.set({ parsingActive: false });

      const { savedSessions = [] } = await chrome.storage.local.get('savedSessions');
      const live = updated.filter(p => p.isLive);
      if (live.length > 0) {
        const session = {
          id: Date.now(),
          channel,
          displayName: stats.displayName || channel,
          avatar: stats.avatar || null,
          savedAt: Date.now(),
          snapshots: updated.length,
          liveSnapshots: live.length,
          maxViewers: Math.max(...live.map(p => p.viewers)),
          avgViewers: Math.round(live.reduce((s,p) => s+p.viewers,0) / live.length),
          maxChatters: Math.max(...live.map(p => p.chattersCount)),
          game: live[live.length-1]?.game || '',
          title: live[live.length-1]?.title || '',
          streamStart: live[0].timestamp,
          streamEnd: live[live.length-1].timestamp,
          uptimeSeconds: live[live.length-1].uptimeSeconds || 0,
          pollHistory: [...updated]
        };
        await chrome.storage.local.set({ savedSessions: [session, ...savedSessions].slice(0, 50) });
      }

      chrome.runtime.sendMessage({ type: 'PARSING_STOPPED' }).catch(() => {});
    }
  }
}

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'pollStats') runPoll();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SET_CHANNEL') {
    const ch = msg.channel.toLowerCase();

    chrome.storage.local.get(['parsingActive', 'pollInterval'], async ({ parsingActive, pollInterval }) => {
      // Stop any active parsing for the old channel first
      if (parsingActive) {
        chrome.alarms.clear('pollStats');
        if (ircWs) { try { ircWs.close(); } catch(_) {} ircWs = null; }
        chatPresence = new Set();
        recentMessages = [];
        recentMsgKeys = new Set();
        lastMessageTime = new Map();
      }

      await chrome.storage.local.set({ channel: ch, pollHistory: [], lastStats: null, parsingActive: true });
      ircConnect(ch);
      const minutes = pollInterval || 5;
      chrome.alarms.create('pollStats', { periodInMinutes: minutes });
      runPoll();
      sendResponse({ ok: true });
    });
    return true;
  }
  if (msg.type === 'TOGGLE_PARSING') {
    chrome.storage.local.get(['parsingActive', 'channel', 'pollInterval'], async ({ parsingActive, channel, pollInterval }) => {
      const nowActive = !parsingActive;
      await chrome.storage.local.set({ parsingActive: nowActive });
      if (nowActive) {
        if (channel) {
          ircConnect(channel);
          const minutes = pollInterval || 5;
          chrome.alarms.create('pollStats', { periodInMinutes: minutes });
          runPoll();
        }
      } else {
        chrome.alarms.clear('pollStats');
        if (ircWs) { try { ircWs.close(); } catch(_) {} ircWs = null; }
        chatPresence = new Set();
        recentMessages = [];
        recentMsgKeys = new Set();
        lastMessageTime = new Map();

        const { pollHistory = [], lastStats, savedSessions = [] } = await chrome.storage.local.get(['pollHistory', 'lastStats', 'savedSessions']);
        if (pollHistory.length > 0 && channel) {
          const live = pollHistory.filter(p => p.isLive);
          const session = {
            id: Date.now(),
            channel,
            displayName: lastStats?.displayName || channel,
            avatar: lastStats?.avatar || null,
            savedAt: Date.now(),
            snapshots: pollHistory.length,
            liveSnapshots: live.length,
            maxViewers: live.length ? Math.max(...live.map(p => p.viewers)) : 0,
            avgViewers: live.length ? Math.round(live.reduce((s,p) => s+p.viewers,0) / live.length) : 0,
            maxChatters: live.length ? Math.max(...live.map(p => p.chattersCount)) : 0,
            game: lastStats?.game || live[live.length-1]?.game || '',
            title: lastStats?.title || live[live.length-1]?.title || '',
            streamStart: live.length ? live[0].timestamp : (pollHistory[0]?.timestamp || Date.now()),
            streamEnd: live.length ? live[live.length-1].timestamp : (pollHistory[pollHistory.length-1]?.timestamp || Date.now()),
            uptimeSeconds: live.length ? live[live.length-1].uptimeSeconds : 0,
            pollHistory: [...pollHistory]
          };
          const updated = [session, ...savedSessions].slice(0, 50);
          await chrome.storage.local.set({ savedSessions: updated });
        }
      }
      sendResponse({ parsingActive: nowActive });
    });
    return true;
  }
  if (msg.type === 'GET_PARSING_STATE') {
    chrome.storage.local.get('parsingActive', ({ parsingActive }) => {
      sendResponse({ parsingActive: parsingActive !== false });
    });
    return true;
  }
  if (msg.type === 'SET_INTERVAL') {
    chrome.alarms.clear('pollStats');
    const minutes = Math.max(0.5, Number(msg.minutes));
    chrome.alarms.create('pollStats', { periodInMinutes: minutes });
    chrome.storage.local.set({ pollInterval: minutes });
    sendResponse({ ok: true });
  }
  if (msg.type === 'POLL_NOW') {
    runPoll().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'GET_HISTORY') {
    chrome.storage.local.get(['pollHistory', 'lastStats', 'channel', 'pollInterval']).then(data => {
      sendResponse(data);
    });
    return true;
  }
  if (msg.type === 'GET_CHAT_LIVE') {

    const chat = getChatStats();
    chrome.storage.local.get('lastStats', ({ lastStats }) => {
      const gqlCount = lastStats?.chattersCount;
      const gqlFresh = lastStats?.timestamp && (Date.now() - lastStats.timestamp) < 10 * 60 * 1000;
      if (typeof gqlCount === 'number' && gqlCount > 0 && gqlFresh) {

        chat.count = gqlCount;
      } else if (chat.count === 0 && chat.uniqueAuthors > 0) {

        chat.count = chat.uniqueAuthors;
      }
      sendResponse({ chatters: chat, recentMessages });
    });
    return true;
  }
  if (msg.type === 'GET_ARCHIVE') {
    chrome.storage.local.get('savedSessions', ({ savedSessions = [] }) => {
      sendResponse({ savedSessions });
    });
    return true;
  }
  if (msg.type === 'DELETE_SESSION') {
    chrome.storage.local.get('savedSessions', ({ savedSessions = [] }) => {
      const updated = savedSessions.filter(s => s.id !== msg.id);
      chrome.storage.local.set({ savedSessions: updated }, () => sendResponse({ ok: true }));
    });
    return true;
  }
  if (msg.type === 'CLEAR_ARCHIVE') {
    chrome.storage.local.set({ savedSessions: [] }, () => sendResponse({ ok: true }));
    return true;
  }
  return true;
});

chrome.runtime.onInstalled.addListener(async () => {
  const { pollInterval, channel } = await chrome.storage.local.get(['pollInterval', 'channel']);
  const minutes = pollInterval || 5;
  chrome.alarms.create('pollStats', { periodInMinutes: minutes });
  chrome.storage.local.set({ pollInterval: minutes });
  if (channel) ircConnect(channel);
});

chrome.storage.local.get('channel', ({ channel }) => {
  if (channel && !ircWs) ircConnect(channel);
});
