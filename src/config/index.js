import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;
const SCOREBOARD_STATE_FILE = process.env.SCOREBOARD_STATE_FILE || "./scoreboard_state.json";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export { PORT, SCOREBOARD_STATE_FILE, ADMIN_PASSWORD };