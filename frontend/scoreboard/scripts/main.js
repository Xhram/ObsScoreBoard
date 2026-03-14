const homeRoster = document.getElementById('home-roster');
const awayRoster = document.getElementById('away-roster');
const homeTitle = document.getElementById('home-title');
const awayTitle = document.getElementById('away-title');
const homeColumn = document.getElementById('home-column');
const awayColumn = document.getElementById('away-column');
const emptyMessage = document.getElementById('empty');

function normalize(players) {
    return (players || []).slice().sort((a, b) => {
        const aNum = Number.parseInt(a.jersey, 10);
        const bNum = Number.parseInt(b.jersey, 10);
        if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
            return aNum - bNum;
        }
        return String(a.jersey).localeCompare(String(b.jersey));
    });
}

function normalizeTeamName(value, fallback) {
    const next = String(value || '').trim();
    return next || fallback;
}

function normalizeHexColor(value, fallback) {
    return /^#[0-9a-fA-F]{6}$/.test(String(value || '')) ? value : fallback;
}

function playerSummary(player) {
    const fg = player.fieldGoals || { made: 0, attempted: 0 };
    const tp = player.threePointers || { made: 0, attempted: 0 };
    const ft = player.freeThrows || { made: 0, attempted: 0 };
    return `PTS ${player.points || 0} | REB ${player.rebounds || 0} | AST ${player.assists || 0} | STL ${player.steals || 0} | BLK ${player.blocks || 0} | TO ${player.turnovers || 0} | F ${player.fouls || 0} | FG ${fg.made}/${fg.attempted} | 3PT ${tp.made}/${tp.attempted} | FT ${ft.made}/${ft.attempted}`;
}

function renderTeam(container, players) {
    container.innerHTML = '';

    if (!players.length) {
        const empty = document.createElement('div');
        empty.className = 'bb-empty-inline';
        empty.textContent = 'No players added';
        container.appendChild(empty);
        return;
    }

    players.forEach((player) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'bb-player-row';

        const head = document.createElement('div');
        head.className = 'bb-player-head';

        const name = document.createElement('div');
        name.className = 'bb-player-name';
        name.textContent = `#${player.jersey} ${player.name || 'Unknown'}`;

        const line = document.createElement('div');
        line.className = 'bb-player-line';
        line.textContent = playerSummary(player);

        head.appendChild(name);
        wrapper.appendChild(head);
        wrapper.appendChild(line);
        container.appendChild(wrapper);
    });
}

function applyMeta(meta) {
    const homeName = normalizeTeamName(meta && meta.home && meta.home.name, 'Home Team');
    const awayName = normalizeTeamName(meta && meta.away && meta.away.name, 'Away Team');
    const homeColor = normalizeHexColor(meta && meta.home && meta.home.color, '#0055ff');
    const awayColor = normalizeHexColor(meta && meta.away && meta.away.color, '#ff5500');

    homeTitle.textContent = homeName;
    awayTitle.textContent = awayName;

    homeColumn.style.setProperty('--team-accent', homeColor);
    awayColumn.style.setProperty('--team-accent', awayColor);
}

async function refresh() {
    try {
        const [statsResponse, metaResponse] = await Promise.all([
            fetch('/api/player-stats/both', { cache: 'no-store' }),
            fetch('/api/player-stats/meta', { cache: 'no-store' }),
        ]);

        if (!statsResponse.ok) {
            throw new Error(`Stats HTTP ${statsResponse.status}`);
        }
        if (!metaResponse.ok) {
            throw new Error(`Meta HTTP ${metaResponse.status}`);
        }

        const stats = await statsResponse.json();
        const meta = await metaResponse.json();
        const homePlayers = normalize(stats.home);
        const awayPlayers = normalize(stats.away);

        applyMeta(meta);
        renderTeam(homeRoster, homePlayers);
        renderTeam(awayRoster, awayPlayers);

        const hasPlayers = homePlayers.length > 0 || awayPlayers.length > 0;
        emptyMessage.classList.toggle('hide', hasPlayers);
    } catch (error) {
        console.error('Failed to refresh scoreboard player stats:', error);
    }
}

refresh();
setInterval(refresh, 1500);
