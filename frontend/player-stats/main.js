const homeBody = document.getElementById('home-players');
const awayBody = document.getElementById('away-players');
const updatedAt = document.getElementById('updated-at');
const emptyMessage = document.getElementById('obs-empty');

function renderTeam(tableBody, players) {
    tableBody.innerHTML = '';

    if (!players.length) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="9" class="no-data">No players</td>';
        tableBody.appendChild(row);
        return;
    }

    players.forEach((player) => {
        const row = document.createElement('tr');
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
        `;
        tableBody.appendChild(row);
    });
}

function sortPlayers(players) {
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

async function refreshStats() {
    try {
        const response = await fetch('/api/player-stats/both', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        const homePlayers = sortPlayers(payload.home);
        const awayPlayers = sortPlayers(payload.away);

        renderTeam(homeBody, homePlayers);
        renderTeam(awayBody, awayPlayers);

        const hasPlayers = homePlayers.length > 0 || awayPlayers.length > 0;
        emptyMessage.classList.toggle('hide', hasPlayers);
        updatedAt.textContent = `Updated ${new Date().toLocaleTimeString()}`;
    } catch (error) {
        updatedAt.textContent = `Update failed: ${error.message}`;
        console.error('Failed to refresh OBS stats:', error);
    }
}

refreshStats();
setInterval(refreshStats, 1500);
