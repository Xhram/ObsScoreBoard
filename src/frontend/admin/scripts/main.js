// Minimal admin client: authenticate, send updates, reset
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${protocol}//${window.location.host}`;
const ws = new WebSocket(wsUrl);

const els = {
	status: document.getElementById('status'),
	login: document.getElementById('login'),
	password: document.getElementById('password'),
	controls: document.getElementById('controls'),
	// team fields
	homeName: document.getElementById('homeName'),
	homeLogo: document.getElementById('homeLogo'),
	homeScore: document.getElementById('homeScore'),
	homeTO: document.getElementById('homeTO'),
	homePoss: document.getElementById('homePoss'),
	awayName: document.getElementById('awayName'),
	awayLogo: document.getElementById('awayLogo'),
	awayScore: document.getElementById('awayScore'),
	awayTO: document.getElementById('awayTO'),
	awayPoss: document.getElementById('awayPoss'),
	// game fields
	period: document.getElementById('period'),
	clock: document.getElementById('clock'),
	playClock: document.getElementById('playClock'),
	down: document.getElementById('down'),
	distance: document.getElementById('distance'),
	send: document.getElementById('send'),
	reset: document.getElementById('reset'),
};

let authed = false;

ws.addEventListener('open', () => {
	els.status.textContent = 'Connected';
});

ws.addEventListener('message', (evt) => {
	const msg = safeParse(evt.data);
	if (!msg) return;
	if (msg.type === 'auth:ok') {
		if (msg.payload?.role === 'admin') {
			authed = true;
			els.status.textContent = 'Authenticated as admin';
			els.controls.style.display = 'block';
		}
	} else if (msg.type === 'auth:error') {
		els.status.textContent = msg.payload?.reason || 'Auth failed';
	} else if (msg.type === 'state') {
		// preload current state into form
		const s = msg.payload || {};
		setField(els.homeName, s.home?.name);
		setField(els.homeLogo, s.home?.logo);
		setField(els.homeScore, s.home?.score);
		setField(els.homeTO, s.home?.timeouts);
		setChecked(els.homePoss, s.home?.possession);
		setField(els.awayName, s.away?.name);
		setField(els.awayLogo, s.away?.logo);
		setField(els.awayScore, s.away?.score);
		setField(els.awayTO, s.away?.timeouts);
		setChecked(els.awayPoss, s.away?.possession);
		setField(els.period, s.period);
		setField(els.clock, s.clock);
		setField(els.playClock, s.playClock);
		setField(els.down, s.down);
		setField(els.distance, s.distance);
	}
});

els.login?.addEventListener('click', () => {
	const password = els.password.value;
	ws.send(JSON.stringify({ type: 'auth', payload: { role: 'admin', password } }));
});

els.send?.addEventListener('click', () => {
	if (!authed) return;
	const patch = buildPatchFromForm();
	ws.send(JSON.stringify({ type: 'update', payload: patch }));
});

els.reset?.addEventListener('click', () => {
	if (!authed) return;
	ws.send(JSON.stringify({ type: 'reset' }));
});

function buildPatchFromForm() {
	const num = (v) => (v === '' || v == null ? undefined : Number(v));
	const str = (v) => (v == null ? undefined : String(v));
	const patch = {
		home: {
			name: str(els.homeName.value),
			logo: str(els.homeLogo.value),
			score: num(els.homeScore.value),
			timeouts: num(els.homeTO.value),
			possession: !!els.homePoss.checked,
		},
		away: {
			name: str(els.awayName.value),
			logo: str(els.awayLogo.value),
			score: num(els.awayScore.value),
			timeouts: num(els.awayTO.value),
			possession: !!els.awayPoss.checked,
		},
		period: num(els.period.value),
		clock: str(els.clock.value),
		playClock: num(els.playClock.value),
		down: num(els.down.value),
		distance: num(els.distance.value),
	};
	// prune undefined
	const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));
	return {
		home: clean(patch.home),
		away: clean(patch.away),
		...clean({
			period: patch.period,
			clock: patch.clock,
			playClock: patch.playClock,
			down: patch.down,
			distance: patch.distance,
		}),
	};
}

function setField(input, value) {
	if (!input) return;
	if (value === undefined || value === null) return;
	input.value = value;
}
function setChecked(input, value) {
	if (!input) return;
	input.checked = !!value;
}

function safeParse(t) { try { return JSON.parse(t); } catch { return null; } }
