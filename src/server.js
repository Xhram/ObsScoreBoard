import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import fs from "fs";
import { error } from "console";

dotenv.config();
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "Server is running" });
});
app.use("/scoreboard", express.static("./src/frontend/scoreboard"));
app.use("/admin", express.static("./src/frontend/admin"));

// WebSocket connection handling

let connections = [];
function broadcast(data) {
    connections.forEach((ws) => {
        if (ws.readyState === ws.OPEN && ws.auth.is_authenticated) {
            ws.sendData(data);
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

let scoreboard_state = {
    team_home: {
        name: "Palatine",
        initals: "PHS",
        image: imageToDataURL("./src/assets/phs_ptv_64.png"),
        score: 67,
        color: "#35ffa1",
        timeouts_remaining: 3,
        roster: {
            "-1": "Home Player Name",
        },
    },
    team_away: {
        name: "Away Team",
        initals: "AT",
        image: imageToDataURL("./src/assets/phs_ptv_64.png"),
        score: 41,
        color: "#ff6c32",
        timeouts_remaining: 3,
        roster: {
            "-1": "Home Player Name",
        },
    },
    possession: "none", // can be home or away or none
    quarter: 4,
    distance: 67,
    down: 1,
    time: {
        //time in ms
        play_clock_current_time: 45 * 1000,
        game_clock_current_time: 15 * 60 * 1000,
        is_game_clock_running: false,
        is_play_clock_running: false,
    },
    // flag: {
    //     is_flag_emitted: false,
    //     team: "none", // team is either 'home' or 'away' or 'none'
    //     status: "none", // status is either 'flag' or 'review'
    //     // flag_color
    // }
};

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
            ws.sendData({
                type: "sync",
                payload: scoreboard_state,
            });
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

wss.on("connection", (ws) => {
    console.log("New WebSocket connection");
    ws.sendData = (data) => {
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

    ws.on("message", (data) => {
        try {
            let action = JSON.parse(data);

            if (!ws.auth.is_authenticated) {
                authenticate_ws(ws, action);
                return;
            }

            if (!ws.auth.is_authenticated || ws.auth.role !== "admin") {
                throw new error("Invalid Auth");
                return;
            }

            if (action.type == "set_team_score") {
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
            if (action.type == "set_team_name") {
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
            if (action.type == "set_team_color") {
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
            if (action.type == "add_team_score") {
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
                    type: "add_team_score",
                    payload: {
                        team: action.payload.team,
                        animation: action.payload.animation,
                        animation_type: action.payload.animation_type,
                        amount: action.payload.amount,
                        previous_score:
                            target_team_state.score - action.payload.amount,
                        new_score: target_team_state.score,
                    },
                });
            }
            if (action.type == "set_clock_state") {
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
            if (action.type == "add_clock_time") {
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
            if (action.type == "set_clock_time") {
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
            if (action.type == "set_down") {
                scoreboard_state.down = clamp(action.payload.down, 1, 4);
                broadcast({
                    type: "sync:down",
                    payload: {
                        down: scoreboard_state.down,
                        distance: scoreboard_state.distance,
                    },
                });
            }
            if (action.type == "set_distance") {
                scoreboard_state.distance = Math.max(action.payload.distance, -1);
                broadcast({
                    type: "sync:down",
                    payload: {
                        down: scoreboard_state.down,
                        distance: scoreboard_state.distance,
                    },
                });
            }
            if (action.type == "add_down") {
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
            if (action.type == "add_distance") {
                scoreboard_state.distance += action.payload.amount;
                //scoreboard_state.distance = clamp(scoreboard_state.distance, 0, 100); // I low key don't want to clamp this to got to ask norbs
                broadcast({
                    type: "sync:down",
                    payload: {
                        down: scoreboard_state.down,
                        distance: scoreboard_state.distance,
                    },
                });
            }
            if (action.type == "set_quarter") {
                scoreboard_state.quarter = clamp(action.payload.quarter, 0, 5);
                broadcast({
                    type: "sync:quarter",
                    payload: { quarter: scoreboard_state.quarter },
                });
            }
            if (action.type == "add_quarter") {
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
            if (action.type == "set_possession") {
                scoreboard_state.possession = action.payload.team; // "home", "away", or "none"
                broadcast({
                    type: "sync:possession",
                    payload: { possession: scoreboard_state.possession },
                });
            }
            if (action.type == "set_team_timeouts") {
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
            if (action.type == "add_team_timeouts") {
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
