let ws = undefined;
let is_connected = false;
let is_authenticated = false;
let auto_reconnect_interval = undefined;
let role = "none"; // none, admin, scoreboard
let server_time_sync_found = false;
let server_time_offset = 0; // in ms, positive if server is ahead of client
let ping = 0; // in ms
function sel(value){
    return document.querySelector(value)
}
function connect() {

    ws = new WebSocket(`ws://${window.location.host}`);
    ws.sendData = (data) => {return ws.send(JSON.stringify(data,null,4))}
    ws.onopen = () => {
        // console.clear()
        // console.log('WebSocket connection opened');
        if(auto_reconnect_interval) {
            clearTimeout(auto_reconnect_interval)
            auto_reconnect_interval = undefined;
        }
        is_connected = true;
        ws.sendData({
            type:"auth:scoreboard",
            payload: {}
        });
        update_debug_info();
    };
    
    ws.onmessage = (event) => {
        console.log('Message from server:', event.data);
        try {
            let action = JSON.parse(event.data)
            if(is_authenticated) {
                if(action.type == "pong"){
                    handle_pong_response(action.payload)
                }
                if(action.type == "sync") {
                    sync_state(action.payload)
                }
                if(action.type == "sync:name") {
                    sync_name_state(action.payload)
                }
                if(action.type == "sync:score") {
                    sync_score_state(action.payload)
                }
                if(action.type == "sync:color") {
                    sync_color_state(action.payload)
                }
                if(action.type == "sync:time") {
                    sync_time_state(action.payload)
                }
                if(action.type == "add_team_score"){
                    add_team_score_event_reducer(action.payload);
                }
                if(action.type == "sync:down"){
                    sync_down_state(action.payload)
                }
                if(action.type == "sync:quarter"){
                    sync_quarter_state(action.payload)
                }
                if(action.type == "sync:possession"){
                    sync_possession_state(action.payload)
                }
                if(action.type == "sync:timeouts"){
                    sync_timeouts_state(action.payload)
                }
                if(action.type == "sync:flag"){
                    sync_flag_state(action.payload)
                }

            } else if(action.type == "auth:success"){
                is_authenticated = true;
                role = action.payload.role;
                update_debug_info();

            }
        } catch (error) {
            console.log("Error On Message:")
            console.log(error)
            console.log("Message:")
            console.log(event.data.toString())
        }

    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
        sel("#connection-status").innerHTML = "Offline"
        // console.log('WebSocket connection closed');
        is_connected = false;
        is_authenticated = false;
        role = "none";
        update_debug_info();
        if(auto_reconnect_interval !== undefined) clearTimeout(auto_reconnect_interval)
        auto_reconnect_interval = setTimeout( () => {
            // window.location.reload();
            
            connect()
        }, 100)

    };
}
connect();
update_debug_info()
function update_debug_info(){
    let output = "";
    if (is_connected) {
        if (is_authenticated) {
            output = `Online (${role})`;
            if(server_time_sync_found){
                output += `, Ping: ${ping.toFixed(0)} ms, Offset: ${server_time_offset.toFixed(0)} ms`
            }

        } else {
            output = "Authenticating...";
        }
    } else {
        output = "Offline";
    }
    sel("#connection-status").innerHTML = output;

}
function handle_pong_response(payload){
    let now = Date.now();
    ping = (now - payload.timestamp)/2;
    server_time_offset = now + ping - payload.timestamp;
    server_time_sync_found = true;
    update_debug_info();
}
function ping_issuer(){
    if(!is_connected || !is_authenticated) return;
    ws.sendData({
        type: "ping",
        payload: {
            timestamp: Date.now()
        }
    });
}
setInterval(ping_issuer, 5 * 60 * 1000);

function sync_state(state){
    team_home_roster = state.team_home.roster
    team_away_roster = state.team_away.roster
    set_team_score("home", state.team_home.score)
    set_team_score("away", state.team_away.score)
    set_team_name("home", state.team_home.name)
    set_team_name("away", state.team_away.name)
    set_team_color("home", state.team_home.color)
    set_team_color("away", state.team_away.color)
    set_team_icon("home", state.team_home.image)
    set_team_icon("away", state.team_away.image)
    set_team_possession(state.possession)
    set_timeouts("home", state.team_home.timeouts_remaining)
    set_timeouts("away", state.team_away.timeouts_remaining)
    set_game_quarter(state.quarter)

    sync_down_state({ down: state.down, distance: state.distance });
    sync_time_state(state.time)
    sync_flag_state(state.flag)

}
function sync_time_state(time_state){
    play_clock_seconds = time_state.play_clock_current_time / 1000
    game_clock_seconds = time_state.game_clock_current_time / 1000
    update_game_clock_display();
    update_play_clock_display();
    if(time_state.is_game_clock_running){
        start_game_clock();
    } else {
        stop_game_clock();
    }
    if(time_state.is_play_clock_running && time_state.is_game_clock_running){
        start_play_clock();
    } else {
        stop_play_clock();
    }
}
function sync_name_state(name_state){
    set_team_name("home", name_state.home_name);
    set_team_name("away", name_state.away_name);
}
function sync_score_state(score_state) {
    set_team_score("home", score_state.home_score);
    set_team_score("away", score_state.away_score);
}

function sync_color_state(color_state) {
    set_team_color("home", color_state.home_color);
    set_team_color("away", color_state.away_color);
}

function sync_down_state(down_state) {
    set_game_down(down_state.down);
    set_game_to_go(down_state.distance == -1 ? "Goal" : down_state.distance, down_state.distance == -1 ? "" : down_state.distance == 0 ? "INCHES" : "YDS");
}

function sync_quarter_state(quarter_state) {
    set_game_quarter(quarter_state.quarter);
}

function sync_possession_state(possession_state) {
    set_team_possession(possession_state.possession);
}

function sync_timeouts_state(timeouts_state) {
    set_timeouts("home", timeouts_state.home_timeouts);
    set_timeouts("away", timeouts_state.away_timeouts);
}

function sync_flag_state(flag_state) {
    // TODO: Implement flag state synchronization
    // flag_state contains: is_flag_emitted, team, status, player_blame
    if(flag_state.is_flag_emitted){
        emit_flag(flag_state.status, flag_state.team, flag_state.player_blame)
    } else {
        clear_flag();
    }
}

function add_team_score_event_reducer(payload){
    set_team_score(payload.team, payload.previous_score)
    add_points_to_team(payload.team, payload.amount, payload.animation ? payload.animation_type : "none")
}

