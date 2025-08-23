import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'Server is running' });
});
app.use('/scoreboard', express.static('./src/frontend/scoreboard'));
app.use('/admin', express.static('./src/frontend/admin'));

// In-memory scoreboard state (single game/room for now)
const defaultState = () => ({
    home: { name: 'Home', logo: '', score: 0, timeouts: 3, possession: false },
    away: { name: 'Away', logo: '', score: 0, timeouts: 3, possession: false },
    period: 1,
    clock: '12:00',
    playClock: 40,
    down: 1,
    distance: 10,
});

let state = defaultState();

// Simple REST snapshot for debugging
app.get('/api/state', (_req, res) => {
    res.json(state);
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';

function safeJsonParse(data) {
    try {
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

function broadcast(type, payload, filterFn = () => true) {
    const message = JSON.stringify({ type, payload });
    wss.clients.forEach((client) => {
        if (client.readyState === 1 /* WebSocket.OPEN */ && filterFn(client)) {
            client.send(message);
        }
    });
}

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New WebSocket connection');

    // connection metadata
    ws.role = 'viewer'; // 'viewer' | 'admin'
    ws.authenticated = false;

    // On connect, send a welcome and current state to help clients bootstrap
    ws.send(JSON.stringify({ type: 'hello', payload: { serverTime: Date.now() } }));
    ws.send(JSON.stringify({ type: 'state', payload: state }));

    ws.on('message', (data) => {
        const text = data.toString();
        const msg = safeJsonParse(text);
        if (!msg || typeof msg.type !== 'string') {
            console.warn('Invalid message, ignoring');
            return;
        }

        switch (msg.type) {
            case 'auth': {
                const { role, password } = msg.payload || {};
                if (role === 'admin') {
                    if (password && password === ADMIN_PASSWORD) {
                        ws.role = 'admin';
                        ws.authenticated = true;
                        ws.send(JSON.stringify({ type: 'auth:ok', payload: { role: 'admin' } }));
                    } else {
                        ws.send(JSON.stringify({ type: 'auth:error', payload: { reason: 'Invalid password' } }));
                    }
                } else {
                    // viewers don't need password
                    ws.role = 'viewer';
                    ws.authenticated = true;
                    ws.send(JSON.stringify({ type: 'auth:ok', payload: { role: 'viewer' } }));
                }
                return;
            }
            case 'ping': {
                ws.send(JSON.stringify({ type: 'pong', payload: { t: Date.now() } }));
                return;
            }
            case 'update': {
                // Only admins can update
                if (ws.role !== 'admin' || !ws.authenticated) {
                    ws.send(JSON.stringify({ type: 'error', payload: { reason: 'Unauthorized' } }));
                    return;
                }
                const patch = msg.payload || {};
                // Shallow-merge top-level and team sub-objects safely
                const next = { ...state };
                if (patch.home) next.home = { ...next.home, ...patch.home };
                if (patch.away) next.away = { ...next.away, ...patch.away };
                const keys = ['period', 'clock', 'playClock', 'down', 'distance'];
                keys.forEach((k) => {
                    if (k in patch) next[k] = patch[k];
                });
                state = next;
                // Broadcast new state to everyone
                broadcast('state', state);
                return;
            }
            case 'reset': {
                if (ws.role !== 'admin' || !ws.authenticated) {
                    ws.send(JSON.stringify({ type: 'error', payload: { reason: 'Unauthorized' } }));
                    return;
                }
                state = defaultState();
                broadcast('state', state);
                return;
            }
            default:
                console.log('Unhandled message type:', msg.type);
                return;
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});