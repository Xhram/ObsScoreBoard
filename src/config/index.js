import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;
const SCOREBOARD_STATE_FILE = process.env.SCOREBOARD_STATE_FILE || "./scoreboard_state.json";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ARTIFICIAL_NETWORK_DELAY = process.env.ARTIFICIAL_NETWORK_DELAY === "true";
function random_internet_delay(){
    return Math.floor(Math.random() * 0) + 800;
}

export { PORT, SCOREBOARD_STATE_FILE, ADMIN_PASSWORD, ARTIFICIAL_NETWORK_DELAY, random_internet_delay };