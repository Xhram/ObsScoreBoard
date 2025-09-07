import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import fs from "fs";
import postcss from "postcss";
import postcssNested from "postcss-nested";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Allow CORS for all domains and handle preflight
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With"
    );
    res.setHeader("Access-Control-Allow-Credentials", "false");
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    next();
});

app.get("/", (req, res) => {
    res.json({ message: "Server is running" });
});

// Custom PostCSS middleware for scoreboard CSS files
app.get("/scoreboard/style/:filename", async (req, res) => {
    try {
        const filename = req.params.filename;
        if (!filename.endsWith('.css')) {
            return res.status(400).send('Invalid file type');
        }
        
        const cssPath = path.join(__dirname, 'frontend', 'scoreboard', 'style', filename);
        
        if (!fs.existsSync(cssPath)) {
            return res.status(404).send('CSS file not found');
        }
        
        const css = fs.readFileSync(cssPath, 'utf8');
        const result = await postcss([postcssNested]).process(css, { from: cssPath });
        
        res.setHeader('Content-Type', 'text/css');
        res.send(result.css);
    } catch (error) {
        console.error('PostCSS processing error:', error);
        res.status(500).send('CSS processing error');
    }
});

app.use("/scoreboard", express.static("./src/frontend/scoreboard"));
app.use("/admin", express.static("./src/frontend/admin"));
app.use("/common", express.static("./src/frontend/common"));

// WebSocket connection handling

let connections = [];
function broadcast(data) {
    
    connections.forEach((ws) => {
        if (ws.readyState === ws.OPEN && ws.auth.is_authenticated) {
            ws.sendData({...data,timestamp: Date.now()});
        }
    });
}
function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}
// Load image as data URL
function imageToDataURL(imagePath) {
    const imageBuffer = fs.readFileSync(imagePath);
    const mimeType = "image/png";
    const base64 = imageBuffer.toString("base64");
    return `data:${mimeType};base64,${base64}`;
}
function load_scoreboard_state() {
    // return undefined
    try {
        const data = fs.readFileSync(process.env.SCOREBOARD_STATE_FILE || "./scoreboard_state.json", "utf-8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Error loading scoreboard state:", error);
        return undefined;
    }
}
function save_scoreboard_state(state) {
    try {
        fs.writeFileSync(process.env.SCOREBOARD_STATE_FILE || "./scoreboard_state.json", JSON.stringify(state, null, 4));
    } catch (error) {
        console.error("Error saving scoreboard state:", error);
    }
}

let scoreboard_state = load_scoreboard_state() || {
    team_home: {
        name: "Palatine",
        initals: "PHS",
        image: imageToDataURL("./src/assets/phs_ptv_64.png"),
        score: 0,
        color: "#35ffa1",
        timeouts_remaining: 3,
        roster: {
            "-1": "Home Player Name".split(' '),
        },
    },
    team_away: {
        name: "Away Team",
        initals: "AT",
        image: imageToDataURL("./src/assets/phs_ptv_64.png"),
        score: 0,
        color: "#ff6c32",
        timeouts_remaining: 3,
        roster: {
            "-1": "Away Player Name".split(' '),
        },
    },
    possession: "none", // can be home or away or none
    quarter: 1,
    distance: 0,
    down: 1,
    time: {
        //time in ms
        play_clock_current_time: 45 * 1000,
        game_clock_current_time: 15 * 60 * 1000,
        is_game_clock_running: false,
        is_play_clock_running: false,
    },
    flag: {
        is_flag_emitted: false,
        team: "none", // team is either 'home' or 'away' or 'none'
        status: "none", // status is either 'flag' or 'review'
        player_blame: -2, // player number who threw the flag
    }
};
save_scoreboard_state(scoreboard_state);
function update_clock(delta) {
    if (scoreboard_state.time.is_game_clock_running) {
        scoreboard_state.time.game_clock_current_time -= delta;
        scoreboard_state.time.game_clock_current_time = Math.max(
            scoreboard_state.time.game_clock_current_time,
            0
        );
        if (scoreboard_state.time.game_clock_current_time <= 0) {
            scoreboard_state.time.is_game_clock_running = false;
            broadcast({
                type: "sync:time",
                payload: scoreboard_state.time,
            });
        }
    }
    if (
        scoreboard_state.time.is_play_clock_running &&
        scoreboard_state.time.is_game_clock_running
    ) {
        scoreboard_state.time.play_clock_current_time -= delta;
        scoreboard_state.time.play_clock_current_time = Math.max(
            scoreboard_state.time.play_clock_current_time,
            0
        );
        if (scoreboard_state.time.play_clock_current_time <= 0) {
            scoreboard_state.time.is_play_clock_running = false;
            broadcast({
                type: "sync:time",
                payload: scoreboard_state.time,
            });
        }
    }
}
let last_time = Date.now();
setInterval(() => {
    update_clock(Date.now() - last_time);
    last_time = Date.now();
}, 10);
setInterval(() => {
    console.log("Auto-saving & Auto-sync scoreboard state");
    save_scoreboard_state(scoreboard_state);
    broadcast({ type: "sync", payload: scoreboard_state });
}, 60000);
function authenticate_ws(ws, action) {
    if (action.type == "auth:admin") {
        if (action.payload.password === process.env.ADMIN_PASSWORD) {
            ws.auth.is_authenticated = true;
            ws.auth.role = "admin";
            ws.sendData({
                type: "auth:success",
                payload: { role: "admin" },
            });
            connections.push(ws);
        } else {
            ws.close();
        }
        clearTimeout(ws.auth.no_auth_auto_close_timer);
    } else if (action.type == "auth:scoreboard") {
        ws.auth.is_authenticated = true;
        ws.auth.role = "scoreboard";
        ws.sendData({
            type: "auth:success",
            payload: { role: "scoreboard" },
        });
        clearTimeout(ws.auth.no_auth_auto_close_timer);
        connections.push(ws);
        ws.sendData({
            type: "sync",
            payload: scoreboard_state,
        });
    }
}
async function randomDelay() {
    console.warn("Adding random delay for testing");
    await new Promise(resolve => setTimeout(resolve, Math.random() * 30 + 900));
}

wss.on("connection", (ws) => {
    console.log("New WebSocket connection");
    ws.sendData = async (data) => {
        await randomDelay();
        return ws.send(JSON.stringify(data, null, 4));
    };
    ws.auth = {
        is_authenticated: false,
        no_auth_auto_close_timer: undefined,
        role: "none",
    };

    console.log("Ws Open");
    let no_auth_auto_close_timer = setTimeout(() => {
        console.log("Client Failed to send auth in time");
        ws.close();
    }, 5000);

    ws.auth.no_auth_auto_close_timer = no_auth_auto_close_timer;

    ws.on("message", async (data) => {
        try {
            let action = JSON.parse(data);

            if (!ws.auth.is_authenticated) {
                authenticate_ws(ws, action);
                return;
            }
            // add random delay for testing
            await randomDelay();

            if(action.type == "auth:success"){
                ws.sendData({
                    type: "sync",
                    payload: scoreboard_state,
                });
                return
            }

            if(ws.auth.role === "scoreboard" || ws.auth.role === "admin") {
                if(action.type === "ping") {
                    ws.sendData({ type: "pong", payload: { timestamp: Date.now(), ping_issuer_timestamp: action.payload.ping_issuer_timestamp } });
                    return;
                }
            }
            if (ws.auth.role !== "admin") {
                throw new Error("Invalid Auth");
                return;
            }

            if (action.type == "set:team_score") {
                if (action.payload.team === "home") {
                    scoreboard_state.team_home.score = clamp(
                        action.payload.score,
                        0,
                        9999
                    );
                } else if (action.payload.team === "away") {
                    scoreboard_state.team_away.score = clamp(
                        action.payload.score,
                        0,
                        9999
                    );
                }
                broadcast({
                    type: "sync:score",
                    payload: {
                        home_score: scoreboard_state.team_home.score,
                        away_score: scoreboard_state.team_away.score,
                    },
                });
            }
            if (action.type == "set:team_name") {
                if (action.payload.team === "home") {
                    scoreboard_state.team_home.name = action.payload.name;
                } else if (action.payload.team === "away") {
                    scoreboard_state.team_away.name = action.payload.name;
                }
                broadcast({
                    type: "sync:name",
                    payload: {
                        home_name: scoreboard_state.team_home.name,
                        away_name: scoreboard_state.team_away.name,
                    },
                });
            }
            if (action.type == "set:team_color") {
                if (action.payload.team === "home") {
                    scoreboard_state.team_home.color = action.payload.color;
                } else if (action.payload.team === "away") {
                    scoreboard_state.team_away.color = action.payload.color;
                }
                broadcast({
                    type: "sync:color",
                    payload: {
                        home_color: scoreboard_state.team_home.color,
                        away_color: scoreboard_state.team_away.color,
                    },
                });
            }
            if (action.type == "add:team_score") {
                let target_team_state =
                    action.payload.team === "home"
                        ? scoreboard_state.team_home
                        : scoreboard_state.team_away;
                target_team_state.score += action.payload.amount;
                target_team_state.score = clamp(
                    target_team_state.score,
                    0,
                    9999
                );
                broadcast({
                    type: "event:team_score",
                    payload: {
                        team: action.payload.team,
                        animation: action.payload.animation,
                        animation_type: action.payload.animation_type,
                        amount: action.payload.amount,
                        previous_score: target_team_state.score - action.payload.amount,
                        new_score: target_team_state.score,
                    },
                });
            }
            if (action.type == "set:clock_state") {
                if (action.payload.clock == "game") {
                    scoreboard_state.time.is_game_clock_running =
                        action.payload.new_state;
                }
                if (action.payload.clock == "play") {
                    scoreboard_state.time.is_play_clock_running =
                        action.payload.new_state;
                }
                broadcast({
                    type: "sync:time",
                    payload: scoreboard_state.time,
                });
            }
            if (action.type == "add:clock_time") {
                if (action.payload.clock == "game") {
                    scoreboard_state.time.game_clock_current_time = Math.max(
                        scoreboard_state.time.game_clock_current_time +
                            action.payload.amount,
                        0
                    );
                }
                if (action.payload.clock == "play") {
                    scoreboard_state.time.play_clock_current_time = clamp(
                        scoreboard_state.time.play_clock_current_time +
                            action.payload.amount,
                        0,
                        60 * 1000
                    );
                }
                broadcast({
                    type: "sync:time",
                    payload: scoreboard_state.time,
                });
            }
            if (action.type == "set:clock_time") {
                if (action.payload.clock == "game") {
                    scoreboard_state.time.game_clock_current_time = Math.max(
                        action.payload.time,
                        0
                    );
                }
                if (action.payload.clock == "play") {
                    scoreboard_state.time.play_clock_current_time = clamp(
                        action.payload.time,
                        0,
                        60 * 1000
                    );
                }
                broadcast({
                    type: "sync:time",
                    payload: scoreboard_state.time,
                });
            }
            if (action.type == "set:down") {
                scoreboard_state.down = clamp(action.payload.down, 1, 4);
                broadcast({
                    type: "sync:down",
                    payload: {
                        down: scoreboard_state.down,
                        distance: scoreboard_state.distance,
                    },
                });
            }
            if (action.type == "set:distance") {
                scoreboard_state.distance = Math.max(action.payload.distance, -1);
                broadcast({
                    type: "sync:down",
                    payload: {
                        down: scoreboard_state.down,
                        distance: scoreboard_state.distance,
                    },
                });
            }
            if (action.type == "add:down") {
                scoreboard_state.down += action.payload.amount;
                scoreboard_state.down = clamp(scoreboard_state.down, 1, 4);
                broadcast({
                    type: "sync:down",
                    payload: {
                        down: scoreboard_state.down,
                        distance: scoreboard_state.distance,
                    },
                });
            }
            if (action.type == "add:distance") {
                scoreboard_state.distance += action.payload.amount;
                scoreboard_state.distance = Math.max(scoreboard_state.distance, -1);
                broadcast({
                    type: "sync:down",
                    payload: {
                        down: scoreboard_state.down,
                        distance: scoreboard_state.distance,
                    },
                });
            }
            if (action.type == "set:quarter") {
                scoreboard_state.quarter = clamp(action.payload.quarter, 0, 5);
                broadcast({
                    type: "sync:quarter",
                    payload: { quarter: scoreboard_state.quarter },
                });
            }
            if (action.type == "add:quarter") {
                scoreboard_state.quarter += action.payload.amount;
                scoreboard_state.quarter = clamp(
                    scoreboard_state.quarter,
                    0,
                    5
                );
                broadcast({
                    type: "sync:quarter",
                    payload: { quarter: scoreboard_state.quarter },
                });
            }
            if (action.type == "set:possession") {
                scoreboard_state.possession = action.payload.team; // "home", "away", or "none"
                broadcast({
                    type: "sync:possession",
                    payload: { possession: scoreboard_state.possession },
                });
            }
            if (action.type == "set:team_timeouts") {
                if (action.payload.team === "home") {
                    scoreboard_state.team_home.timeouts_remaining = clamp(
                        action.payload.timeouts,
                        0,
                        3
                    );
                } else if (action.payload.team === "away") {
                    scoreboard_state.team_away.timeouts_remaining = clamp(
                        action.payload.timeouts,
                        0,
                        3
                    );
                }
                broadcast({
                    type: "sync:timeouts",
                    payload: {
                        home_timeouts:
                            scoreboard_state.team_home.timeouts_remaining,
                        away_timeouts:
                            scoreboard_state.team_away.timeouts_remaining,
                    },
                });
            }
            if (action.type == "add:team_timeouts") {
                let target_team_state =
                    action.payload.team === "home"
                        ? scoreboard_state.team_home
                        : scoreboard_state.team_away;
                target_team_state.timeouts_remaining += action.payload.amount;
                target_team_state.timeouts_remaining = clamp(
                    target_team_state.timeouts_remaining,
                    0,
                    3
                );
                broadcast({
                    type: "sync:timeouts",
                    payload: {
                        home_timeouts:
                            scoreboard_state.team_home.timeouts_remaining,
                        away_timeouts:
                            scoreboard_state.team_away.timeouts_remaining,
                    },
                });
            }
            if (action.type == "set:flag") {
                if (action.payload.is_flag_emitted != undefined) {
                    scoreboard_state.flag.is_flag_emitted = action.payload.is_flag_emitted;
                }
                if (action.payload.team != undefined) {
                    scoreboard_state.flag.team = action.payload.team; // "home", "away", or "none"
                }
                if (action.payload.status != undefined) {
                    scoreboard_state.flag.status = action.payload.status; // "flag", "review", or "none"
                }
                if (action.payload.player_blame != undefined) {
                    scoreboard_state.flag.player_blame = action.payload.player_blame;
                }
                broadcast({
                    type: "sync:flag",
                    payload: {
                        is_flag_emitted: scoreboard_state.flag.is_flag_emitted,
                        team: scoreboard_state.flag.team,
                        status: scoreboard_state.flag.status,
                        player_blame: scoreboard_state.flag.player_blame,
                    },
                });
            }
            save_scoreboard_state(scoreboard_state);
        } catch (error) {
            console.log("Error On Message:");
            console.log(error);
            console.log("Message:");
            console.log(data.toString());
        }
    });

    ws.on("close", () => {
        console.log("WebSocket connection closed");
        const idx = connections.indexOf(ws);
        if (idx !== -1) {
            connections.splice(idx, 1);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
