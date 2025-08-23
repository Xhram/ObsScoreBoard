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

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    
    ws.on('message', (data) => {
        console.log('Received:', data.toString());
        // Echo message back to client
        ws.send(`Echo: ${data}`);
    });
    
    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});