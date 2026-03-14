(function () {
    const authPane = document.getElementById('auth');
    const controlsPane = document.getElementById('controls');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login');
    const connectionStatus = document.getElementById('connection-status');

    const homeColumn = document.querySelector('.bb-team-column[data-team="home"]');
    const awayColumn = document.querySelector('.bb-team-column[data-team="away"]');
    const homeTitle = document.getElementById('bb-home-title');
    const awayTitle = document.getElementById('bb-away-title');
    const homeTeamLabelInput = document.getElementById('bb-home-team-label');
    const awayTeamLabelInput = document.getElementById('bb-away-team-label');
    const homeTeamColorInput = document.getElementById('bb-home-team-color');
    const awayTeamColorInput = document.getElementById('bb-away-team-color');

    const homeForm = document.getElementById('bb-home-add-form');
    const awayForm = document.getElementById('bb-away-add-form');
    const homeRoster = document.getElementById('bb-home-roster');
    const awayRoster = document.getElementById('bb-away-roster');
    const clearFlagButton = document.getElementById('bb-clear-flag');

    if (
        !authPane || !controlsPane || !passwordInput || !loginButton || !connectionStatus
        || !homeColumn || !awayColumn || !homeTitle || !awayTitle
        || !homeTeamLabelInput || !awayTeamLabelInput || !homeTeamColorInput || !awayTeamColorInput
        || !homeForm || !awayForm || !homeRoster || !awayRoster
    ) {
        return;
    }

    const cm = new connection_manager({
        role: 'admin',
        reconnectIntervalTime: 2000,
        password: localStorage.getItem('password') || '',
    });

    passwordInput.value = cm.password;

    function updateConnectionStatus() {
        if (cm.isConnected && cm.isAuthenticated) {
            connectionStatus.textContent = `Online (${cm.role})`;
            return;
        }
        if (cm.isConnected) {
            connectionStatus.textContent = 'Authenticating...';
            return;
        }
        connectionStatus.textContent = 'Offline';
    }

    function normalizeTeamName(value, fallback) {
        const next = String(value || '').trim();
        return next || fallback;
    }

    function normalizeHexColor(value, fallback) {
        return /^#[0-9a-fA-F]{6}$/.test(String(value || '')) ? value : fallback;
    }

    function applyTeamMeta(team, teamMeta) {
        const isHome = team === 'home';
        const fallbackName = isHome ? 'Home Team' : 'Away Team';
        const fallbackColor = isHome ? '#0055ff' : '#ff5500';

        const name = normalizeTeamName(teamMeta && teamMeta.name, fallbackName);
        const color = normalizeHexColor(teamMeta && teamMeta.color, fallbackColor);

        if (isHome) {
            homeTitle.textContent = name;
            homeTeamLabelInput.value = name;
            homeTeamColorInput.value = color;
            homeColumn.style.setProperty('--team-accent', color);
        } else {
            awayTitle.textContent = name;
            awayTeamLabelInput.value = name;
            awayTeamColorInput.value = color;
            awayColumn.style.setProperty('--team-accent', color);
        }
    }

    cm.onAuth = () => {
        authPane.classList.add('hide');
        controlsPane.classList.remove('hide');
        updateConnectionStatus();
        refreshAllData();
    };

    cm.onClose = () => {
        authPane.classList.remove('hide');
        controlsPane.classList.add('hide');
        updateConnectionStatus();
    };

    cm.onPong = updateConnectionStatus;

    function connectWithPassword() {
        cm.password = passwordInput.value;
        localStorage.setItem('password', cm.password);
        cm.connect();
        updateConnectionStatus();
    }

    loginButton.addEventListener('click', connectWithPassword);
    passwordInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            connectWithPassword();
        }
    });
    passwordInput.addEventListener('input', (event) => {
        localStorage.setItem('password', event.target.value);
        cm.password = event.target.value;
    });

    connectWithPassword();

    const STAT_ACTIONS = [
        { label: '+REB', type: 'stat', stat: 'rebounds', amount: 1 },
        { label: '+AST', type: 'stat', stat: 'assists', amount: 1 },
        { label: '+STL', type: 'stat', stat: 'steals', amount: 1 },
        { label: '+BLK', type: 'stat', stat: 'blocks', amount: 1 },
        { label: '+TO', type: 'stat', stat: 'turnovers', amount: 1 },
        { label: '+Foul', type: 'stat', stat: 'fouls', amount: 1 },
        { label: '+1 PT', type: 'stat', stat: 'points', amount: 1 },
        { label: '+2 FG', type: 'shot', shotType: '2', made: true },
        { label: '+3 3PT', type: 'shot', shotType: '3', made: true },
        { label: '+1 FT', type: 'shot', shotType: 'ft', made: true },
        { label: 'Miss 2', type: 'shot-miss', shotType: '2', made: false },
        { label: 'Miss 3', type: 'shot-miss', shotType: '3', made: false },
        { label: 'Miss FT', type: 'shot-miss', shotType: 'ft', made: false },
    ];

    function normalizePlayers(players) {
        return (players || []).slice().sort((a, b) => {
            const aNum = Number.parseInt(a.jersey, 10);
            const bNum = Number.parseInt(b.jersey, 10);
            if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
                return aNum - bNum;
            }
            return String(a.jersey).localeCompare(String(b.jersey));
        });
    }

    function playerSummary(player) {
        const fg = player.fieldGoals || { made: 0, attempted: 0 };
        const tp = player.threePointers || { made: 0, attempted: 0 };
        const ft = player.freeThrows || { made: 0, attempted: 0 };
        return `PTS ${player.points || 0} | REB ${player.rebounds || 0} | AST ${player.assists || 0} | STL ${player.steals || 0} | BLK ${player.blocks || 0} | TO ${player.turnovers || 0} | F ${player.fouls || 0} | FG ${fg.made}/${fg.attempted} | 3PT ${tp.made}/${tp.attempted} | FT ${ft.made}/${ft.attempted}`;
    }

    function makeActionButton(action) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `bb-btn ${action.type === 'stat' ? 'stat' : action.type === 'shot' ? 'shot' : 'miss'}`;
        button.textContent = action.label;

        if (action.type === 'stat') {
            button.dataset.actionType = 'add:player_stat';
            button.dataset.stat = action.stat;
            button.dataset.amount = String(action.amount);
        } else {
            button.dataset.actionType = 'add:player_shot';
            button.dataset.shotType = action.shotType;
            button.dataset.made = String(action.made);
        }

        return button;
    }

    function renderTeam(container, team, players) {
        container.innerHTML = '';

        if (!players.length) {
            const empty = document.createElement('div');
            empty.className = 'bb-empty';
            empty.textContent = 'No players added';
            container.appendChild(empty);
            return;
        }

        players.forEach((player) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'bb-player-row';
            wrapper.dataset.team = team;
            wrapper.dataset.jersey = String(player.jersey);

            const head = document.createElement('div');
            head.className = 'bb-player-head';

            const name = document.createElement('div');
            name.className = 'bb-player-name';
            name.textContent = `#${player.jersey} ${player.name || 'Unknown'}`;

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'bb-btn remove';
            removeButton.dataset.actionType = 'delete:player';
            removeButton.textContent = 'Remove';

            const flagButton = document.createElement('button');
            flagButton.type = 'button';
            flagButton.className = 'bb-btn warn';
            flagButton.dataset.actionType = 'set:player_flag';
            flagButton.dataset.flagStatus = 'flag';
            flagButton.textContent = 'Flag';

            const reviewButton = document.createElement('button');
            reviewButton.type = 'button';
            reviewButton.className = 'bb-btn review';
            reviewButton.dataset.actionType = 'set:player_flag';
            reviewButton.dataset.flagStatus = 'review';
            reviewButton.textContent = 'Review';

            head.appendChild(name);
            head.appendChild(flagButton);
            head.appendChild(reviewButton);
            head.appendChild(removeButton);

            const line = document.createElement('div');
            line.className = 'bb-player-line';
            line.textContent = playerSummary(player);

            const actionGrid = document.createElement('div');
            actionGrid.className = 'bb-action-grid';
            STAT_ACTIONS.forEach((action) => actionGrid.appendChild(makeActionButton(action)));

            wrapper.appendChild(head);
            wrapper.appendChild(line);
            wrapper.appendChild(actionGrid);
            container.appendChild(wrapper);
        });
    }

    async function fetchTeam(team) {
        const response = await fetch(`/api/player-stats/${team}`, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Failed to fetch ${team} team: ${response.status}`);
        }
        const players = await response.json();
        return normalizePlayers(players);
    }

    async function fetchTeamMeta() {
        const response = await fetch('/api/player-stats/meta', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Failed to fetch team metadata: ${response.status}`);
        }
        return response.json();
    }

    async function refreshAllData() {
        try {
            const [homePlayers, awayPlayers, teamMeta] = await Promise.all([
                fetchTeam('home'),
                fetchTeam('away'),
                fetchTeamMeta(),
            ]);

            renderTeam(homeRoster, 'home', homePlayers);
            renderTeam(awayRoster, 'away', awayPlayers);

            applyTeamMeta('home', teamMeta.home);
            applyTeamMeta('away', teamMeta.away);
        } catch (error) {
            console.error(error);
        }
    }

    function bindAddForm(form, team) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();

            const jerseyInput = form.querySelector('input[type="number"]');
            const nameInput = form.querySelector('input[type="text"]');

            const jersey = (jerseyInput.value || '').trim();
            const name = (nameInput.value || '').trim();

            if (!/^\d{1,3}$/.test(jersey)) {
                alert('Jersey number must be numeric.');
                return;
            }
            if (!name) {
                alert('Player name is required.');
                return;
            }

            cm.sendAction('set:player_name', { team, jersey, name });
            jerseyInput.value = '';
            nameInput.value = '';
            setTimeout(refreshAllData, 120);
        });
    }

    function handleRosterAction(event, team) {
        const button = event.target.closest('button[data-action-type]');
        if (!button) {
            return;
        }

        const row = button.closest('.bb-player-row');
        if (!row) {
            return;
        }

        const jersey = row.dataset.jersey;
        const actionType = button.dataset.actionType;

        if (actionType === 'delete:player') {
            cm.sendAction('delete:player', { team, jersey });
            setTimeout(refreshAllData, 120);
            return;
        }

        if (actionType === 'add:player_stat') {
            cm.sendAction('add:player_stat', {
                team,
                jersey,
                stat: button.dataset.stat,
                amount: Number(button.dataset.amount || 1),
            });
            setTimeout(refreshAllData, 120);
            return;
        }

        if (actionType === 'add:player_shot') {
            cm.sendAction('add:player_shot', {
                team,
                jersey,
                shotType: button.dataset.shotType,
                made: button.dataset.made === 'true',
            });
            setTimeout(refreshAllData, 120);
            return;
        }

        if (actionType === 'set:player_flag') {
            cm.sendAction('set:flag', {
                isFlagEmitted: true,
                status: button.dataset.flagStatus || 'flag',
                team,
                playerBlame: Number.parseInt(jersey, 10),
            });
        }
    }

    function commitTeamName(team, input) {
        const name = normalizeTeamName(input.value, team === 'home' ? 'Home Team' : 'Away Team');
        input.value = name;
        cm.sendAction('set:team_name', { team, name });
        setTimeout(refreshAllData, 120);
    }

    function commitTeamColor(team, input) {
        const color = normalizeHexColor(input.value, team === 'home' ? '#0055ff' : '#ff5500');
        input.value = color;
        cm.sendAction('set:team_color', { team, color });
        setTimeout(refreshAllData, 120);
    }

    bindAddForm(homeForm, 'home');
    bindAddForm(awayForm, 'away');

    homeRoster.addEventListener('click', (event) => handleRosterAction(event, 'home'));
    awayRoster.addEventListener('click', (event) => handleRosterAction(event, 'away'));

    homeTeamLabelInput.addEventListener('change', () => commitTeamName('home', homeTeamLabelInput));
    awayTeamLabelInput.addEventListener('change', () => commitTeamName('away', awayTeamLabelInput));
    homeTeamColorInput.addEventListener('change', () => commitTeamColor('home', homeTeamColorInput));
    awayTeamColorInput.addEventListener('change', () => commitTeamColor('away', awayTeamColorInput));

    homeTeamLabelInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            commitTeamName('home', homeTeamLabelInput);
        }
    });

    awayTeamLabelInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            commitTeamName('away', awayTeamLabelInput);
        }
    });

    if (clearFlagButton) {
        clearFlagButton.addEventListener('click', () => {
            cm.sendAction('set:flag', {
                isFlagEmitted: false,
                status: 'none',
                team: 'none',
                playerBlame: -2,
            });
        });
    }

    cm.reducers['sync:player_stats'] = refreshAllData;
    cm.reducers['sync:name'] = refreshAllData;
    cm.reducers['sync:color'] = refreshAllData;
})();
