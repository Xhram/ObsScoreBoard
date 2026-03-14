const homeBody = document.getElementById('home-body');
const awayBody = document.getElementById('away-body');
const emptyMessage = document.getElementById('empty');

function normalize(players) {
    return (players || []).slice().sort((a, b) => {
        if ((b.points || 0) !== (a.points || 0)) {
            return (b.points || 0) - (a.points || 0);
        }
        const aNum = Number.parseInt(a.jersey, 10);
        const bNum = Number.parseInt(b.jersey, 10);
        if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
            return aNum - bNum;
        }
        return String(a.jersey).localeCompare(String(b.jersey));
    });
}

function safePercent(value) {
    if (value === undefined || value === null) {
        return '0.0';
    }
    return String(value);
}

function renderTeam(bodyEl, players) {
    bodyEl.innerHTML = '';

    if (!players.length) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="12" class="no-data">No players</td>';
        bodyEl.appendChild(row);
        return;
    }

    players.forEach((player) => {
        const row = document.createElement('tr');
        const percentages = player.percentages || {};
        row.innerHTML = `
            <td>#${player.jersey}</td>
            <td>${player.name || 'Unknown'}</td>
            <td>${player.points || 0}</td>
            <td>${player.rebounds || 0}</td>
            <td>${player.assists || 0}</td>
            <td>${player.steals || 0}</td>
            <td>${player.blocks || 0}</td>
            <td>${player.turnovers || 0}</td>
            <td>${player.fouls || 0}</td>
            <td>${safePercent(percentages.fieldGoalPercentage)}%</td>
            <td>${safePercent(percentages.threePointPercentage)}%</td>
            <td>${safePercent(percentages.freeThrowPercentage)}%</td>
        `;
        bodyEl.appendChild(row);
    });
}

async function refresh() {
    try {
        const response = await fetch('/api/player-stats/both', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        const home = normalize(payload.home);
        const away = normalize(payload.away);

        renderTeam(homeBody, home);
        renderTeam(awayBody, away);

        const hasPlayers = home.length > 0 || away.length > 0;
        emptyMessage.classList.toggle('hide', hasPlayers);
    } catch (error) {
        console.error('Failed to refresh announcer stats:', error);
    }
}

refresh();
setInterval(refresh, 1500);
