import express from "express";
import { createServer } from "http";
import { setupRoutes } from "./routes/index.js";
import { PORT } from "./config/index.js";
import { wss_manager } from "./ws/wss_manager.js";
import { state_manager } from "./utils/state_manager.js";

const app = express();
const server = createServer(app);
const sm = new state_manager();
const wm = new wss_manager({
    server,
    state_manager:sm
})

app.use(express.json());

setupRoutes(app);

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
