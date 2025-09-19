import { clamp, max, min } from "../utils/utils.js";
// action types:
//  request:
//      sync, sync:{..sync_types}
//  set:{...set_types}
//  add:{...add_types}
//
//
//
//

export function handle_message(wm,conn,action){
    if(action.type.startsWith("request:")){
        handle_request_type(wm,conn,action)
    } else if(action.type.startsWith("set:")){
        handle_set_type(wm,conn,action)
    } else if(action.type.startsWith("add:")){
        handle_add_type(wm,conn,action)
    } else if(action.type == "ping"){
        conn.send_action("pong",{},action)
    }
}

function handle_request_type(wm, conn, action) {
    if(conn.auth.role !== "admin" && conn.auth.role !== "scoreboard"){
        conn.send_action("error", { message: "Unauthorized" }, action);
        return;
    }
    let payload = action.payload
    let sm = wm.sm;
    if (action.type == "request:sync") {
        conn.send_action("sync", sm.sync_getters["sync"](), action)
    } else if (action.type.startsWith("request:sync:")) {
        const syncType = action.type.replace("request:", "");
        if (sm.sync_getters[syncType]) {
            conn.send_action(syncType, sm.sync_getters[syncType](), action);
        }
    }
}

function handle_set_type(wm, conn, action) {
    if(conn.auth.role !== "admin"){
        conn.send_action("error", { message: "Unauthorized" }, action);
        return;
    }
    let payload = action.payload;
    let sm = wm.sm;
    let scoreboard = sm.scoreboard;
    switch (action.type) {
        case "set:team_score": {
            if (payload.team === "home") {
                scoreboard.team_home.score = clamp(payload.score, 0, 9999);
            } else if (payload.team === "away") {
                scoreboard.team_away.score = clamp(payload.score, 0, 9999);
            }
            wm.broadcast_action("sync:score", sm.sync_getters["sync:score"](), action);
            break;
        }
        case "set:team_name": {
            if (payload.team === "home") {
                scoreboard.team_home.name = payload.name;
            } else if (payload.team === "away") {
                scoreboard.team_away.name = payload.name;
            }
            wm.broadcast_action("sync:name", sm.sync_getters["sync:name"](), action);
            break;
        }
        case "set:team_color": {
            if (payload.team === "home") {
                scoreboard.team_home.color = payload.color;
            } else if (payload.team === "away") {
                scoreboard.team_away.color = payload.color;
            }
            wm.broadcast_action("sync:color", sm.sync_getters["sync:color"](), action);
            break;
        }
        case "set:clock_state": {
            if (payload.clock === "game") {
                scoreboard.time.is_game_clock_running = payload.is_running;
            }
            if (payload.clock === "play") {
                scoreboard.time.is_play_clock_running = payload.is_running;
            }
            wm.broadcast_action("sync:time", sm.sync_getters["sync:time"](), action);
            break;
        }
        case "set:clock_time": {
            if (payload.clock === "game") {
                scoreboard.time.game_clock_current_time = payload.time;
            }
            if (payload.clock === "play") {
                scoreboard.time.play_clock_current_time = payload.time;
            }
            wm.broadcast_action("sync:time", sm.sync_getters["sync:time"](), action);
            break;
        }
        case "set:down": {
            scoreboard.down = clamp(payload.down, 1, 4);
            wm.broadcast_action("sync:down", sm.sync_getters["sync:down"](), action);
            break;
        }
        case "set:distance": {
            scoreboard.distance = Math.max(payload.distance, -1);
            wm.broadcast_action("sync:down", sm.sync_getters["sync:down"](), action);
            break;
        }
        case "set:quarter": {
            scoreboard.quarter = clamp(payload.quarter, 0, 5);
            wm.broadcast_action("sync:quarter", sm.sync_getters["sync:quarter"](), action);
            break;
        }
        case "set:possession": {
            scoreboard.possession = payload.possession;
            wm.broadcast_action("sync:possession", sm.sync_getters["sync:possession"](), action);
            break;
        }
        case "set:team_timeouts": {
            if (payload.team === "home") {
                scoreboard.team_home.timeouts_remaining = clamp(payload.timeouts, 0, 3);
            } else if (payload.team === "away") {
                scoreboard.team_away.timeouts_remaining = clamp(payload.timeouts, 0, 3);
            }
            wm.broadcast_action("sync:timeouts", sm.sync_getters["sync:timeouts"](), action);
            break;
        }
        case "set:flag": {
            scoreboard.flag = {
                is_flag_emitted: payload.is_flag_emitted,
                team: payload.team,
                status: payload.status,
                player_blame: payload.player_blame,
            };
            wm.broadcast_action("sync:flag", sm.sync_getters["sync:flag"](), action);
            break;
        }
        default:
            break;
    }
}
function handle_add_type(wm, conn, action) {
    if(conn.auth.role !== "admin"){
        conn.send_action("error", { message: "Unauthorized" }, action);
        return;
    }
    let payload = action.payload;
    let sm = wm.sm;
    let scoreboard = sm.scoreboard;
    switch (action.type) {
        case "add:team_score": {
            let team = payload.team === "home" ? scoreboard.team_home : scoreboard.team_away;
            let prev = team.score;
            team.score += payload.amount;
            team.score = clamp(team.score, 0, 9999);
            wm.broadcast_action("event:team_score", {
                team: payload.team,
                animation: payload.animation,
                animation_type: payload.animation_type,
                amount: payload.amount,
                previous_score: prev,
                new_score: team.score,
            }, action);
            break;
        }
        case "add:down": {
            let prev = scoreboard.down;
            scoreboard.down += payload.amount;
            scoreboard.down = clamp(scoreboard.down, 1, 4);
            wm.broadcast_action("sync:down", sm.sync_getters["sync:down"](), action);
            break;
        }
        case "add:distance": {
            let prev = scoreboard.distance;
            scoreboard.distance += payload.amount;
            scoreboard.distance = Math.max(scoreboard.distance, -1);
            wm.broadcast_action("sync:down", sm.sync_getters["sync:down"](), action);
            break;
        }
        case "add:quarter": {
            let prev = scoreboard.quarter;
            scoreboard.quarter = clamp(scoreboard.quarter + payload.amount, 0, 5);
            wm.broadcast_action("sync:quarter", sm.sync_getters["sync:quarter"](), action);
            break;
        }
        case "add:clock_time": {
            if (payload.clock === "game") {
                scoreboard.time.game_clock_current_time += payload.amount;
                scoreboard.time.game_clock_current_time = max(scoreboard.time.game_clock_current_time, 0);
            }
            if (payload.clock === "play") {
                scoreboard.time.play_clock_current_time += payload.amount;
                scoreboard.time.play_clock_current_time = max(scoreboard.time.play_clock_current_time, 0);
            }
            wm.broadcast_action("sync:time", sm.sync_getters["sync:time"](), action);
            break;
        }
        case "add:team_timeouts": {
            if (payload.team === "home") {
                scoreboard.team_home.timeouts_remaining = clamp(scoreboard.team_home.timeouts_remaining + payload.amount, 0, 3);
            } else if (payload.team === "away") {
                scoreboard.team_away.timeouts_remaining = clamp(scoreboard.team_away.timeouts_remaining + payload.amount, 0, 3);
            }
            wm.broadcast_action("sync:timeouts", sm.sync_getters["sync:timeouts"](), action);
            break;
        }
        default:
            break;
    }
}
