/** Injected in ESPN WebView after sign-in to read session cookies and resolve league(s). */
export function buildEspnCaptureScript(knownLeagueId?: string) {
  const knownId = knownLeagueId?.trim() || '';
  return `
(function () {
  if (!window.ReactNativeWebView || !window.ReactNativeWebView.postMessage) return true;

  function parseCookies(str) {
    var out = {};
    (str || '').split(';').forEach(function (part) {
      var i = part.indexOf('=');
      if (i < 0) return;
      out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1));
    });
    return out;
  }

  function collectIdsFromText(text, set) {
    if (!text) return;
    var re = /leagueId[=:"'](\\d{4,})/g;
    var m;
    while ((m = re.exec(text)) !== null) set.add(m[1]);
  }

  function leagueIdFromUrl() {
    try {
      var params = new URL(window.location.href).searchParams;
      var id = params.get('leagueId') || params.get('league_id');
      if (id && /^\\d{4,}$/.test(id)) return id;
    } catch (e) {}
    var m = /leagueId[=:\\/](\\d{4,})/i.exec(window.location.href);
    return m ? m[1] : null;
  }

  function post(payload) {
    window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  }

  async function fetchLeague(id, season) {
    var urls = [
      'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/' + season + '/segments/0/leagues/' + id + '?view=mSettings&view=mTeam',
      'https://fantasy.espn.com/apis/v3/games/ffl/seasons/' + season + '/segments/0/leagues/' + id + '?view=mSettings&view=mTeam',
      'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/leagueHistory/' + id + '?seasonId=' + season + '&view=mSettings&view=mTeam',
    ];
    for (var u = 0; u < urls.length; u++) {
      try {
        var res = await fetch(urls[u], { credentials: 'include' });
        if (!res.ok) continue;
        var data = await res.json();
        if (Array.isArray(data)) data = data[0];
        if (!data || !data.settings) continue;
        return {
          externalId: String(id),
          provider: 'espn',
          name: data.settings.name || ('ESPN League ' + id),
          season: data.seasonId || season,
          teamCount: data.teams ? data.teams.length : undefined,
        };
      } catch (e) {}
    }
    return null;
  }

  async function discover() {
    var cookies = parseCookies(document.cookie);
    var swid = cookies.SWID || cookies.swid || '';
    var espnS2 = cookies.espn_s2 || '';
    var leagueIds = new Set();
    var known = ${JSON.stringify(knownId)};
    var fromUrl = leagueIdFromUrl();
    if (known) leagueIds.add(known);
    if (fromUrl) leagueIds.add(fromUrl);

    var year = new Date().getFullYear();
    var seasons = [year, year - 1, year - 2, year - 3];

    try {
      var lobby = await fetch('https://fantasy.espn.com/football', { credentials: 'include' });
      if (lobby.ok) collectIdsFromText(await lobby.text(), leagueIds);
    } catch (e) {}

    try {
      var history = await fetch('https://fantasy.espn.com/football/history', { credentials: 'include' });
      if (history.ok) collectIdsFromText(await history.text(), leagueIds);
    } catch (e) {}

    for (var si = 0; si < seasons.length; si++) {
      try {
        var mod = await fetch(
          'https://fantasy.espn.com/apis/v3/games/ffl/seasons/' + seasons[si] + '?view=modular&platformVersion=espn.ffl.web.production',
          { credentials: 'include' }
        );
        if (mod.ok) collectIdsFromText(JSON.stringify(await mod.json()), leagueIds);
      } catch (e) {}
    }

    var leagues = [];
    var idList = Array.from(leagueIds);
    for (var i = 0; i < idList.length; i++) {
      var id = idList[i];
      for (var sj = 0; sj < seasons.length; sj++) {
        var league = await fetchLeague(id, seasons[sj]);
        if (league) {
          leagues.push(league);
          break;
        }
      }
    }

    post({
      type: 'espn-session',
      swid: swid,
      espnS2: espnS2,
      leagues: leagues,
      pageUrl: window.location.href,
    });
  }

  discover().catch(function (err) {
    post({
      type: 'espn-session',
      swid: '',
      espnS2: '',
      leagues: [],
      error: String(err && err.message ? err.message : err),
    });
  });
  return true;
})();
`;
}
