import dotenv from "dotenv";

dotenv.config();
const PORT = process.env.PORT || 3000;
const SCOREBOARD_STATE_FILE = process.env.SCOREBOARD_STATE_FILE || "./scoreboard_state.json";
const PLAYER_STATS_STATE_FILE = process.env.PLAYER_STATS_STATE_FILE || "./player_stats_state.json";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ARTIFICIAL_NETWORK_DELAY = process.env.ARTIFICIAL_NETWORK_DELAY === "true";
const PING_INTERVAL_MS = process.env.PING_INTERVAL_MS || 2000;
function random_internet_delay(){
    return Math.floor(Math.random() * 0) + 2000;
}

export { PORT, SCOREBOARD_STATE_FILE, PLAYER_STATS_STATE_FILE, ADMIN_PASSWORD, ARTIFICIAL_NETWORK_DELAY, PING_INTERVAL_MS, random_internet_delay };