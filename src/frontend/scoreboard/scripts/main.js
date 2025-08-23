// Connect to WebSocket on same origin and render scoreboard state
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${protocol}//${window.location.host}`;
const socket = new WebSocket(wsUrl);

function $(sel, root = document) { return root.querySelector(sel); }

function render(state) {
    const left = $('.team.left');
    const right = $('.team.right');
    // Map "home" to left and "away" to right for now
    const teams = [
        { el: left, data: state.home },
        { el: right, data: state.away },
    ];
    teams.forEach(({ el, data }) => {
        if (!el) return;
        const nameEl = el.querySelector('.name');
        const scoreEl = el.querySelector('.score');
        const logoImg = el.querySelector('.logo img');
        const possEl = el.querySelector('.possession-indicator');
        const timeouts = el.querySelectorAll('.timeouts .timeout');
        if (nameEl) nameEl.textContent = data.name ?? '';
        if (scoreEl) scoreEl.textContent = String(data.score ?? 0);
        if (logoImg && typeof data.logo === 'string') logoImg.src = data.logo || '';
        if (possEl) possEl.classList.toggle('in-possession', !!data.possession);
        if (timeouts && timeouts.length) {
            const used = Math.max(0, 3 - (data.timeouts ?? 0));
            timeouts.forEach((t, i) => t.classList.toggle('used', i < used));
        }
    });

    const qEl = document.querySelector('.game-data-container .quarter');
    const clockEl = document.querySelector('.game-data-container .clock');
    const pclockEl = document.querySelector('.game-data-container .play-clock');
    const downEl = document.querySelector('.game-data-container .down');
    const distEl = document.querySelector('.game-data-container .distance');
    if (qEl) qEl.textContent = `${ordinal(state.period ?? 1)}`;
    if (clockEl) clockEl.textContent = state.clock ?? '12:00';
    if (pclockEl) pclockEl.textContent = `:${String(state.playClock ?? 40).padStart(2, '0')}`;
    if (downEl) downEl.textContent = String(state.down ?? 1);
    if (distEl) distEl.textContent = String(state.distance ?? 10);
}

function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

socket.addEventListener('open', () => {
    // identify as viewer (no password)
    socket.send(JSON.stringify({ type: 'auth', payload: { role: 'viewer' } }));
});

socket.addEventListener('message', (evt) => {
    const msg = safeParse(evt.data);
    if (!msg) return;
    if (msg.type === 'state') {
        render(msg.payload || {});
    }
});

function safeParse(t) {
    try { return JSON.parse(t); } catch { return null; }
}