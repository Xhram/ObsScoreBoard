import express from "express";
import { createServer } from "http";
import { setupRoutes } from "./routes/index.js";
import { PORT } from "./config/index.js";
import { WebSocketServerManager } from "./ws/web_socket_server_manager.js";
import { StateManager } from "./utils/state_manager.js";

const app = express();
const server = createServer(app);
const stateManager = new StateManager();
const webSocketServerManager = new WebSocketServerManager({
    server,
    stateManager: stateManager
})

app.use(express.json());

setupRoutes(app);

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
