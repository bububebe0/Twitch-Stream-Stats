(function () {
  const path = location.pathname;

  const globalPages = [
    'directory', 'following', 'subscriptions', 'wallet', 'prime',
    'downloads', 'jobs', 'p', 'search', 'videos', 'clips', 'turbo',
    'settings', 'inventory', 'drops', 'friends', 'notifications',
    'payments', 'purchases', 'login', 'signup', 'moderator'
  ];

  const channelSubpages = [
    'videos', 'clips', 'about', 'schedule', 'squad',
    'events', 'followers', 'following', 'moderator'
  ];

  const match = path.match(/^\/([^/]+)\/?$/);
  if (!match) {

    const subMatch = path.match(/^\/([^/]+)\/([^/]+)/);
    if (!subMatch) return;
    const sub = subMatch[2].toLowerCase();
    if (channelSubpages.includes(sub)) return;
    return;
  }

  const channel = match[1].toLowerCase();
  if (globalPages.includes(channel)) return;

  if (!/^\w{3,25}$/.test(channel)) return;

  chrome.storage.local.get('channel', ({ channel: stored }) => {
    if (stored !== channel) {
      chrome.runtime.sendMessage({ type: 'SET_CHANNEL', channel });
    }
  });
})();