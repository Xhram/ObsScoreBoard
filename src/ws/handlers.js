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

export function handleMessage(webSocketServerManager,connection,action){
    if(action.type.startsWith("request:")){
        handleRequestType(webSocketServerManager,connection,action)
    } else if(action.type.startsWith("set:")){
        handleSetType(webSocketServerManager,connection,action)
    } else if(action.type.startsWith("add:")){
        handleAddType(webSocketServerManager,connection,action)
    } else if(action.type == "ping"){
        connection.sendAction("pong",{},action)
    }
}

function handleRequestType(webSocketServerManager, connection, action) {
    if(connection.auth.role !== "admin" && connection.auth.role !== "scoreboard"){
        connection.sendAction("error", { message: "Unauthorized" }, action);
        return;
    }
    let payload = action.payload
    let stateManager = webSocketServerManager.stateManager;
    if (action.type == "request:sync") {
        connection.sendAction("sync", stateManager.sync_getters["sync"](), action)
    } else if (action.type.startsWith("request:sync:")) {
        const syncType = action.type.replace("request:", "");
        if (stateManager.sync_getters[syncType]) {
            connection.sendAction(syncType, stateManager.sync_getters[syncType](), action);
        }
    }
}

function handleSetType(webSocketServerManager, connection, action) {
    if(connection.auth.role !== "admin"){
        connection.sendAction("error", { message: "Unauthorized" }, action);
        return;
    }
    let payload = action.payload;
    let stateManager = webSocketServerManager.stateManager;
    let scoreboard = stateManager.scoreboard;
    switch (action.type) {
        case "set:team_score": {
            if (payload.team === "home") {
                scoreboard.team_home.score = clamp(payload.score, 0, 9999);
            } else if (payload.team === "away") {
                scoreboard.team_away.score = clamp(payload.score, 0, 9999);
            }
            webSocketServerManager.broadcastAction("sync:score", stateManager.sync_getters["sync:score"](), action);
            break;
        }
        case "set:team_name": {
            if (payload.team === "home") {
                scoreboard.team_home.name = payload.name;
            } else if (payload.team === "away") {
                scoreboard.team_away.name = payload.name;
            }
            webSocketServerManager.broadcastAction("sync:name", stateManager.sync_getters["sync:name"](), action);
            break;
        }
        case "set:team_color": {
            if (payload.team === "home") {
                scoreboard.team_home.color = payload.color;
            } else if (payload.team === "away") {
                scoreboard.team_away.color = payload.color;
            }
            webSocketServerManager.broadcastAction("sync:color", stateManager.sync_getters["sync:color"](), action);
            break;
        }
        case "set:clock_state": {
            if (payload.clock === "game") {
                scoreboard.time.is_game_clock_running = payload.is_running;
            }
            if (payload.clock === "play") {
                scoreboard.time.is_play_clock_running = payload.is_running;
            }
            webSocketServerManager.broadcastAction("sync:time", stateManager.sync_getters["sync:time"](), action);
            break;
        }
        case "set:clock_time": {
            if (payload.clock === "game") {
                scoreboard.time.game_clock_current_time = payload.time;
            }
            if (payload.clock === "play") {
                scoreboard.time.play_clock_current_time = payload.time;
            }
            webSocketServerManager.broadcastAction("sync:time", stateManager.sync_getters["sync:time"](), action);
            break;
        }
        case "set:down": {
            scoreboard.down = clamp(payload.down, 1, 4);
            webSocketServerManager.broadcastAction("sync:down", stateManager.sync_getters["sync:down"](), action);
            break;
        }
        case "set:distance": {
            scoreboard.distance = Math.max(payload.distance, -1);
            webSocketServerManager.broadcastAction("sync:down", stateManager.sync_getters["sync:down"](), action);
            break;
        }
        case "set:quarter": {
            scoreboard.quarter = clamp(payload.quarter, 0, 5);
            webSocketServerManager.broadcastAction("sync:quarter", stateManager.sync_getters["sync:quarter"](), action);
            break;
        }
        case "set:possession": {
            scoreboard.possession = payload.possession;
            webSocketServerManager.broadcastAction("sync:possession", stateManager.sync_getters["sync:possession"](), action);
            break;
        }
        case "set:team_timeouts": {
            if (payload.team === "home") {
                scoreboard.team_home.timeouts_remaining = clamp(payload.timeouts, 0, 3);
            } else if (payload.team === "away") {
                scoreboard.team_away.timeouts_remaining = clamp(payload.timeouts, 0, 3);
            }
            webSocketServerManager.broadcastAction("sync:timeouts", stateManager.sync_getters["sync:timeouts"](), action);
            break;
        }
        case "set:flag": {
            if(payload.is_flag_emitted != undefined){
                scoreboard.flag.is_flag_emitted = payload.is_flag_emitted;
            }
            if(payload.team != undefined){
                scoreboard.flag.team = payload.team;
            }
            if(payload.status != undefined){
                scoreboard.flag.status = payload.status;
            }
            if(payload.player_blame != undefined){
                scoreboard.flag.player_blame = payload.player_blame;
            }
            webSocketServerManager.broadcastAction("sync:flag", stateManager.sync_getters["sync:flag"](), action);
            break;
        }
        default:
            break;
    }
}
function handleAddType(webSocketServerManager, connection, action) {
    if(connection.auth.role !== "admin"){
        connection.sendAction("error", { message: "Unauthorized" }, action);
        return;
    }
    let payload = action.payload;
    let stateManager = webSocketServerManager.stateManager;
    let scoreboard = stateManager.scoreboard;
    switch (action.type) {
        case "add:team_score": {
            let team = payload.team === "home" ? scoreboard.team_home : scoreboard.team_away;
            let prev = team.score;
            team.score += payload.amount;
            team.score = clamp(team.score, 0, 9999);
            webSocketServerManager.broadcastAction("event:team_score", {
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
            webSocketServerManager.broadcastAction("sync:down", stateManager.sync_getters["sync:down"](), action);
            break;
        }
        case "add:distance": {
            let prev = scoreboard.distance;
            scoreboard.distance += payload.amount;
            scoreboard.distance = Math.max(scoreboard.distance, -1);
            webSocketServerManager.broadcastAction("sync:down", stateManager.sync_getters["sync:down"](), action);
            break;
        }
        case "add:quarter": {
            let prev = scoreboard.quarter;
            scoreboard.quarter = clamp(scoreboard.quarter + payload.amount, 0, 5);
            webSocketServerManager.broadcastAction("sync:quarter", stateManager.sync_getters["sync:quarter"](), action);
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
            webSocketServerManager.broadcastAction("sync:time", stateManager.sync_getters["sync:time"](), action);
            break;
        }
        case "add:team_timeouts": {
            if (payload.team === "home") {
                scoreboard.team_home.timeouts_remaining = clamp(scoreboard.team_home.timeouts_remaining + payload.amount, 0, 3);
            } else if (payload.team === "away") {
                scoreboard.team_away.timeouts_remaining = clamp(scoreboard.team_away.timeouts_remaining + payload.amount, 0, 3);
            }
            webSocketServerManager.broadcastAction("sync:timeouts", stateManager.sync_getters["sync:timeouts"](), action);
            break;
        }
        default:
            break;
    }
}
