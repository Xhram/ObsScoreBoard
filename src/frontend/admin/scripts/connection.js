let ws = undefined;
let is_connected = false;
let is_authenticated = false;
let has_successfully_authenticated = false;
function sel(value){
    return document.querySelector(value)
}
function selall(value){
    return document.querySelectorAll(value)
}
function connect() {

    ws = new WebSocket(`ws://${window.location.host}`);
    ws.sendData = (data) => {return ws.send(JSON.stringify(data,null,4))}
    ws.onopen = () => {
        console.log('WebSocket connection opened');
        is_connected = true;
        ws.sendData({
            type:"auth:admin",
            payload: {
                password: sel("#password").value
            }
        });
        sel("#connection-status").innerHTML = "Online, Auth:false"
    };
    
    ws.onmessage = (event) => {
        console.log('Message from server:', event.data);
        try {
            let action = JSON.parse(event.data)
            if(is_authenticated) {
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
            } else if(action.type == "auth:success"){
                is_authenticated = true;
                has_successfully_authenticated = true;
                sel("#connection-status").innerHTML = `Online, Auth:true, Role:${action.payload.role}`
                sel("#auth").classList.add("hide")
                sel("#controls").classList.remove("hide")
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
        console.log('WebSocket connection closed');
        is_connected = false;
        is_authenticated = false;
        sel("#connection-status").innerHTML = "Offline"
        if(has_successfully_authenticated){
            setTimeout(()=>{
                connect()
            },2000)
        }
    };
}
sel("#login").addEventListener("click",connect);
sel("#password").value = localStorage.getItem("password")
connect();
sel("#password").addEventListener("input",(input_event)=>{localStorage.setItem("password", input_event.srcElement.value)});
sel("#password").addEventListener("keydown", (event) => {if (event.key === "Enter") {connect()}});


let elm = {
    // Team Scores
    home_team_score: sel("#home-team-score"),
    away_team_score: sel("#away-team-score"),
    
    // Game Timer
    game_timer_duration: sel("#game-timer-duration"),
    game_timer_duration_default: sel("#game-timer-duration-default"),


    // Shot Clock
    shot_clock_duration: sel("#shot-clock-duration"),
    shot_clock_duration_default: sel("#shot-clock-duration-default"),
    
    // Start stop buttons for clocks
    game_timer_toggle_button: sel("#game-timer-toggle"),
    shot_clock_toggle_button: sel("#shot-clock-toggle"),

    // Down & Distance
    down: sel("#down"),
    distance: sel("#distance"),
    
    // Quarter & Period
    quarter: sel("#quarter"),
    
    // Home Team Management
    home_team_name: sel("#home-team-name"),
    home_team_logo: sel("#home-team-logo"),
    home_team_color: sel("#home-team-color"),
    home_team_color_hex: sel("#home-team-color-hex"),
    home_timeouts: sel("#home-timeouts"),
    
    // Away Team Management
    away_team_name: sel("#away-team-name"),
    away_team_logo: sel("#away-team-logo"),
    away_team_color: sel("#away-team-color"),
    away_team_color_hex: sel("#away-team-color-hex"),
    away_timeouts: sel("#away-timeouts"),
    
    // Player Numbers
    home_player_number: sel("#home-player-number"),
    away_player_number: sel("#away-player-number"),
    
    // Display Settings
    theme_selector: sel("#theme-selector")
}

function sync_state(state){
    console.log("Sync State Called")
    console.log(state)  
    // Team Scores
    elm.home_team_score.value = state.team_home.score
    elm.away_team_score.value = state.team_away.score
    
    // Timer values
    sync_time_state(state.time)
    
    // Down & Distance
    elm.down.value = state.down
    elm.distance.value = state.distance
    elm.quarter.value = state.quarter
    
    // Home Team Management
    elm.home_team_name.value = state.team_home.name
    elm.home_team_color_hex.value = state.team_home.color
    elm.home_team_color.value = state.team_home.color
    elm.home_timeouts.value = state.team_home.timeouts_remaining
    
    // Away Team Management
    elm.away_team_name.value = state.team_away.name
    elm.away_team_color_hex.value = state.team_away.color
    elm.away_team_color.value = state.team_away.color
    elm.away_timeouts.value = state.team_away.timeouts_remaining
}
function sync_name_state(name_state) {
    elm.home_team_name.value = name_state.home_name;
    elm.away_team_name.value = name_state.away_name;
}

function sync_score_state(score_state) {
    if(elm.home_team_score.value != score_state.home_score){
        elm.home_team_score.value = score_state.home_score;

    }
    if(elm.away_team_score.value != score_state.away_score){
        elm.away_team_score.value = score_state.away_score;
    }
}

function sync_color_state(color_state) {
    elm.home_team_color.value = color_state.home_color;
    elm.home_team_color_hex.value = color_state.home_color;
    elm.away_team_color.value = color_state.away_color;
    elm.away_team_color_hex.value = color_state.away_color;
}

function sync_down_state(down_state) {
    elm.down.value = down_state.down;
    elm.distance.value = down_state.distance;
}

function sync_quarter_state(quarter_state) {
    elm.quarter.value = quarter_state.quarter;
}

function sync_possession_state(possession_state) {
    // Update possession visual indicators if needed
    // Note: Admin panel might not have visual possession indicators like the scoreboard does
    console.log("Possession updated to:", possession_state.possession);
}

function sync_timeouts_state(timeouts_state) {
    elm.home_timeouts.value = timeouts_state.home_timeouts;
    elm.away_timeouts.value = timeouts_state.away_timeouts;
}

function add_team_score_event_reducer(payload){
    if(payload.team === "home"){
        elm.home_team_score.value = payload.new_score;
    }
    if(payload.team === "away"){
        elm.away_team_score.value = payload.new_score;
    }
}
function send_action(type, payload){
    if(is_connected && is_authenticated){
        console.log("Sending Action from Admin:");
        console.log({type, payload});
        console.log(JSON.stringify({type, payload}, null, 4));
        ws.sendData({
            type,
            payload
        })
    } else {
        console.log("Not connected or authenticated, cannot send action")
    }
}

// Clock Managment
let game_clock_interval = undefined;
let play_clock_interval = undefined;
let game_clock_seconds = 15 * 60 * 1000;
let play_clock_seconds = 45 * 1000;
function sync_time_state(time_state){
    game_clock_seconds = time_state.game_clock_current_time
    play_clock_seconds = time_state.play_clock_current_time
    update_clock_display();
    if(time_state.is_game_clock_running){
        start_game_clock();
    } else {
        stop_game_clock();
    }
    if(time_state.is_play_clock_running && time_state.is_game_clock_running){
        start_play_clock();
    } else {
        stop_play_clock();
        // this will show it if the shot clock is queued to be running
        // but it low key looks a bit jank
        // if(time_state.is_play_clock_running){
        //     elm.shot_clock_duration.classList.add("running-clock");
        // }
    }
}
function update_clock_display(){
    update_game_clock_display();
    update_play_clock_display();
}
function update_game_clock_display(){
    elm.game_timer_duration.value = (game_clock_seconds / 1000).toFixed(1);
}
function update_play_clock_display(){
    elm.shot_clock_duration.value = (play_clock_seconds / 1000).toFixed(1);
}


function start_game_clock(){
    if(game_clock_interval === undefined){
        elm.game_timer_duration.classList.add("running-clock");
        elm.game_timer_toggle_button.classList.add("running")
        elm.game_timer_toggle_button.classList.remove("paused")

        let last_time = Date.now();
        game_clock_interval = setInterval(()=>{
            game_clock_seconds -= Date.now() - last_time;
            game_clock_seconds = Math.max(game_clock_seconds, 0);
            last_time = Date.now();
            update_game_clock_display();
        }, 10);
    }
}
function stop_game_clock(){
    if(game_clock_interval !== undefined){
        elm.game_timer_duration.classList.remove("running-clock");
        elm.game_timer_toggle_button.classList.remove("running")
        elm.game_timer_toggle_button.classList.add("paused")
        clearInterval(game_clock_interval);
        game_clock_interval = undefined;
    }
}

function start_play_clock(){
    if(play_clock_interval === undefined){
        let last_time = Date.now();
        play_clock_interval = setInterval(()=>{
            elm.shot_clock_duration.classList.add("running-clock");
            elm.shot_clock_toggle_button.classList.add("running")
            elm.shot_clock_toggle_button.classList.remove("paused")
            play_clock_seconds -= Date.now() - last_time;
            play_clock_seconds = Math.max(play_clock_seconds, 0);
            last_time = Date.now();
            update_play_clock_display();
        }, 10);
    }
}
function stop_play_clock(){
    if(play_clock_interval !== undefined){
        elm.shot_clock_duration.classList.remove("running-clock");
        elm.shot_clock_toggle_button.classList.remove("running")
        elm.shot_clock_toggle_button.classList.add("paused")
        clearInterval(play_clock_interval);
        play_clock_interval = undefined;
    }
}

// Score event Listeners
selall(".home .team-score .increment").forEach((elm) => {
    elm.addEventListener("click", (event) => {
        let amount = parseInt(event.srcElement.innerText.replace("+", ""));
        let animation_type = "none";
        if (elm.classList.contains("animation-field-goal")) {animation_type = "field goal";}
        if (elm.classList.contains("animation-touchdown")) {animation_type = "touchdown";}
        send_action("add_team_score", {
            team: "home",
            amount,
            animation: elm.classList.contains("animation-field-goal") || elm.classList.contains("animation-touchdown"),
            animation_type: animation_type
        });
    });
});
selall(".home .team-score .decrement").forEach((elm) => {
    elm.addEventListener("click", (event) => {
        let amount = -parseInt(event.srcElement.innerText.replace("-", ""));
        send_action("add_team_score", { team: "home", amount, animation: false, animation_type: "none" });
    });
});

selall(".away .team-score .increment").forEach((elm) => {
    elm.addEventListener("click", (event) => {
        let amount = parseInt(event.srcElement.innerText.replace("+", ""));
        let animation_type = "none";
        if (elm.classList.contains("animation-field-goal")) {animation_type = "field goal";}
        if (elm.classList.contains("animation-touchdown")) {animation_type = "touchdown";}
        send_action("add_team_score", {
            team: "away",
            amount,
            animation: elm.classList.contains("animation-field-goal") || elm.classList.contains("animation-touchdown"),
            animation_type: animation_type
        });
    });
});
selall(".away .team-score .decrement").forEach((elm) => {
    elm.addEventListener("click", (event) => {
        let amount = -parseInt(event.srcElement.innerText.replace("-", ""));
        send_action("add_team_score", { team: "away", amount, animation: false, animation_type: "none"  });
    });
});
// Timer Event Listeners
elm.game_timer_toggle_button.addEventListener("click", (event) => {
    if (elm.game_timer_toggle_button.classList.contains("running")) {
        send_action("set_clock_state", { clock:"game", new_state: false });
        return;
    }    
    if (elm.game_timer_toggle_button.classList.contains("paused")) {
        send_action("set_clock_state", { clock:"game", new_state: true });
        return;
    }
});
elm.shot_clock_toggle_button.addEventListener("click", (event) => {
    if (elm.shot_clock_toggle_button.classList.contains("running")) {
        send_action("set_clock_state", { clock:"play", new_state: false });
        return;
    }    
    if (elm.shot_clock_toggle_button.classList.contains("paused")) {
        send_action("set_clock_state", { clock:"play", new_state: true });
        return;
    }
});
// Timer Input Listeners
function add_clock_time_action_issure(clock,amount){
    send_action("add_clock_time",{clock,amount})
}
function add_clock_time_to_game_timer_action_issure(amount){
    add_clock_time_action_issure("game",amount)
}
function add_clock_time_to_play_clock_action_issure(amount){
    add_clock_time_action_issure("play",amount)
}

function set_play_clock_to_default_action_issure(){
    send_action("set_clock_time", { clock: "play", time: parseInt(elm.shot_clock_duration_default.value) * 1000 });
}
function set_play_clock_to_value_action_issure(time){
    send_action("set_clock_time", { clock: "play", time: time });
}
function set_game_clock_to_default_action_issure(){
    send_action("set_clock_time", { clock: "game", time: parseInt(elm.game_timer_duration_default.value) * 1000 });
}
// Down & Distance Event Listeners
function set_down_action_issure(down){
    send_action("set_down", { down });
}
function set_distance_action_issure(distance){
    send_action("set_distance", { distance });
}
function add_down_action_issure(amount){
    send_action("add_down", { amount });
}
function add_distance_action_issure(amount){
    send_action("add_distance", { amount });
}

// Quarter & Period Event Listeners
function set_quarter_action_issure(quarter){
    send_action("set_quarter", { quarter });
}
function add_quarter_action_issure(amount){
    send_action("add_quarter", { amount });
}

// Possession Event Listeners
function set_possession_action_issure(team){
    send_action("set_possession", { team });
}

// Timeouts Event Listeners
function set_team_timeouts_action_issure(team, timeouts){
    send_action("set_team_timeouts", { team, timeouts });
}
function add_team_timeouts_action_issure(team, amount){
    send_action("add_team_timeouts", { team, amount });
}


// Input Box Event Listeners
function set_team_score_action_issure(team, score){
    send_action("set_team_score", { team, score });
}

elm.home_team_score.addEventListener("change", (event) => {
    let value = elm.home_team_score.value
    let new_score = parseInt(value);
    if (!isNaN(new_score) && new_score >= 0) {
        set_team_score_action_issure("home", new_score);
    }

});
elm.away_team_score.addEventListener("change", (event) => {
    let value = elm.away_team_score.value
    let new_score = parseInt(value);
    if (!isNaN(new_score) && new_score >= 0) {
        set_team_score_action_issure("away", new_score);
    }

});

// Down input box listener
elm.down.addEventListener("change", (event) => {
    let value = elm.down.value;
    let new_down = parseInt(value);
    if (!isNaN(new_down) && new_down >= 1 && new_down <= 4) {
        set_down_action_issure(new_down);
    }
});

// Distance input box listener
elm.distance.addEventListener("change", (event) => {
    let value = elm.distance.value;
    let new_distance = parseInt(value);
    if (!isNaN(new_distance)) {
        set_distance_action_issure(new_distance);
    }
});

// Quarter input box listener
elm.quarter.addEventListener("change", (event) => {
    let value = elm.quarter.value;
    let new_quarter = parseInt(value);
    if (!isNaN(new_quarter) && new_quarter >= 0 && new_quarter <= 5) {
        set_quarter_action_issure(new_quarter);
    }
});

// Game Timer input box listener
elm.game_timer_duration.addEventListener("change", (event) => {
    if (game_clock_interval !== undefined) {
        event.preventDefault();
        update_game_clock_display();
        return;
    }
    let value = elm.game_timer_duration.value;
    let new_time_seconds = parseFloat(value);
    if (!isNaN(new_time_seconds) && new_time_seconds >= 0) {
        send_action("set_clock_time", { clock: "game", time: new_time_seconds * 1000 });
    }
});

// Game Timer keydown/input prevention when running
elm.game_timer_duration.addEventListener("keydown", (event) => {
    if (game_clock_interval !== undefined) {
        event.preventDefault();
    }
});

elm.game_timer_duration.addEventListener("input", (event) => {
    if (game_clock_interval !== undefined) {
        event.preventDefault();
        update_game_clock_display();
    }
});

// Shot Clock input box listener
elm.shot_clock_duration.addEventListener("change", (event) => {
    if (play_clock_interval !== undefined) {
        event.preventDefault();
        update_play_clock_display();
        return;
    }
    let value = elm.shot_clock_duration.value;
    let new_time_seconds = parseFloat(value);
    if (!isNaN(new_time_seconds) && new_time_seconds >= 0) {
        send_action("set_clock_time", { clock: "play", time: new_time_seconds * 1000 });
    }
});

// Shot Clock keydown/input prevention when running
elm.shot_clock_duration.addEventListener("keydown", (event) => {
    if (play_clock_interval !== undefined) {
        event.preventDefault();
    }
});

elm.shot_clock_duration.addEventListener("input", (event) => {
    if (play_clock_interval !== undefined) {
        event.preventDefault();
        update_play_clock_display(); 
    }
});

// Team Name input box listeners
elm.home_team_name.addEventListener("change", (event) => {
    let value = elm.home_team_name.value;
    if (value.trim() !== "") {
        send_action("set_team_name", { team: "home", name: value });
    }
});

elm.away_team_name.addEventListener("change", (event) => {
    let value = elm.away_team_name.value;
    if (value.trim() !== "") {
        send_action("set_team_name", { team: "away", name: value });
    }
});

// Team Color input box listeners
elm.home_team_color.addEventListener("change", (event) => {
    let value = elm.home_team_color.value;
    elm.home_team_color_hex.value = value; 
    send_action("set_team_color", { team: "home", color: value });
});

elm.home_team_color_hex.addEventListener("change", (event) => {
    let value = elm.home_team_color_hex.value;
    if (value.match(/^#[0-9A-F]{6}$/i)) { // I totally wrote this regex myself :P
        elm.home_team_color.value = value; 
        send_action("set_team_color", { team: "home", color: value });
    }
});

elm.away_team_color.addEventListener("change", (event) => {
    let value = elm.away_team_color.value;
    elm.away_team_color_hex.value = value;
    send_action("set_team_color", { team: "away", color: value });
});

elm.away_team_color_hex.addEventListener("change", (event) => {
    let value = elm.away_team_color_hex.value;
    if (value.match(/^#[0-9A-F]{6}$/i)) { 
        elm.away_team_color.value = value; 
        send_action("set_team_color", { team: "away", color: value });
    }
});

// Timeouts input box listeners
elm.home_timeouts.addEventListener("change", (event) => {
    let value = elm.home_timeouts.value;
    let new_timeouts = parseInt(value);
    if (!isNaN(new_timeouts) && new_timeouts >= 0 && new_timeouts <= 3) {
        set_team_timeouts_action_issure("home", new_timeouts);
    }
});

elm.away_timeouts.addEventListener("change", (event) => {
    let value = elm.away_timeouts.value;
    let new_timeouts = parseInt(value);
    if (!isNaN(new_timeouts) && new_timeouts >= 0 && new_timeouts <= 3) {
        set_team_timeouts_action_issure("away", new_timeouts);
    }
});