function sel(value){
    return document.querySelector(value)
}
function selall(value){
    return document.querySelectorAll(value)
}

let cm = new connection_manager({
    role: "admin",
    reconnectIntervalTime: 2000,
    password: localStorage.getItem("password")
});


cm.onAuth = () => {
    sel("#auth").classList.add("hide")
    sel("#controls").classList.remove("hide")
    update_debug_info();
}
cm.onPong = () => {
    update_debug_info();
}
sel("#password").value = localStorage.getItem("password")
sel("#login").addEventListener("click", cm.connect);
cm.connect();
sel("#password").addEventListener("input",(input_event)=>{localStorage.setItem("password", input_event.srcElement.value); cm.password = input_event.srcElement.value;});
sel("#password").addEventListener("keydown", (event) => {if (event.key === "Enter") {cm.password = sel("#password").value; cm.connect()}});


update_debug_info()
function update_debug_info(){
    let output = "";
    if (cm.isConnected) {
        if (cm.isAuthenticated) {
            output = `Online (${cm.role}), IPR: ${cm._intelligentPredictiveRendering ? "Enabled" : "Disabled"}`;
            if(cm.serverTimeSyncFound){
                output += `, Ping: ${(cm.ping * 2).toFixed(0)} ms, Offset: ${cm.serverTimeOffset.toFixed(0)} ms`
            }

        } else {
            output = "Authenticating...";
        }
    } else {
        output = "Offline";
    }
    sel("#connection-status").innerHTML = output;

}

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



cm.reducers["sync:name"] = (name_state) => {
    elm.home_team_name.value = name_state.home_name;
    elm.away_team_name.value = name_state.away_name;
}

cm.reducers["sync:score"] = (score_state) => {
    if(elm.home_team_score.value != score_state.home_score){
        elm.home_team_score.value = score_state.home_score;

    }
    if(elm.away_team_score.value != score_state.away_score){
        elm.away_team_score.value = score_state.away_score;
    }
}

cm.reducers["sync:color"] = (color_state) => {
    elm.home_team_color.value = color_state.home_color;
    elm.home_team_color_hex.value = color_state.home_color;
    elm.away_team_color.value = color_state.away_color;
    elm.away_team_color_hex.value = color_state.away_color;
}

cm.reducers["sync:down"] = (down_state) => {
    elm.down.value = down_state.down;
    elm.distance.value = down_state.distance;
}

cm.reducers["sync:quarter"] = (quarter_state) => {
    elm.quarter.value = quarter_state.quarter;
}

cm.reducers["sync:possession"] = (possession_state) => {
    // Update possession visual indicators if needed
    // Note: Admin panel might not have visual possession indicators like the scoreboard does
    console.log("Possession updated to:", possession_state.possession);
}

cm.reducers["sync:timeouts"] = (timeouts_state) => {
    elm.home_timeouts.value = timeouts_state.home_timeouts;
    elm.away_timeouts.value = timeouts_state.away_timeouts;
}

cm.reducers["sync:flag"] = (flag_state) => {
    // TODO: Implement flag state synchronization
    // flag_state contains: isFlagEmitted, team, status, playerBlame
}

cm.reducers["event:team_score"] = (payload) => {
    if(payload.team === "home"){
        elm.home_team_score.value = payload.new_score;
    }
    if(payload.team === "away"){
        elm.away_team_score.value = payload.new_score;
    }
}

// Clock Managment
let game_clock_interval = undefined;
let play_clock_interval = undefined;
let game_clock_seconds = 15 * 60 * 1000;
let play_clock_seconds = 45 * 1000;
cm.reducers["sync:time"] = (time_state) => {
    game_clock_seconds = time_state.gameClockCurrentTime
    play_clock_seconds = time_state.playClockCurrentTime
    update_clock_display();
    if(time_state.isGameClockRunning){
        start_game_clock();
    } else {
        stop_game_clock();
    }
    if(time_state.isPlayClockRunning && time_state.isGameClockRunning){
        start_play_clock();
    } else {
        stop_play_clock();
        // this will show it if the shot clock is queued to be running
        // but it low key looks a bit jank
        // if(time_state.isPlayClockRunning){
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
        cm.actions["add:team_score"]("home", amount, {
            animation: elm.classList.contains("animation-field-goal") || elm.classList.contains("animation-touchdown"),
            animation_type: animation_type
        });
    });
});
selall(".home .team-score .decrement").forEach((elm) => {
    elm.addEventListener("click", (event) => {
        let amount = -parseInt(event.srcElement.innerText.replace("-", ""));
        cm.actions["add:team_score"]("home", amount, { animation: false, animation_type: "none" });
    });
});

selall(".away .team-score .increment").forEach((elm) => {
    elm.addEventListener("click", (event) => {
        let amount = parseInt(event.srcElement.innerText.replace("+", ""));
        let animation_type = "none";
        if (elm.classList.contains("animation-field-goal")) {animation_type = "field goal";}
        if (elm.classList.contains("animation-touchdown")) {animation_type = "touchdown";}
        cm.actions["add:team_score"]("away", amount, {
            animation: elm.classList.contains("animation-field-goal") || elm.classList.contains("animation-touchdown"),
            animation_type: animation_type
        });
    });
});
selall(".away .team-score .decrement").forEach((elm) => {
    elm.addEventListener("click", (event) => {
        let amount = -parseInt(event.srcElement.innerText.replace("-", ""));
        cm.actions["add:team_score"]("away", amount, { animation: false, animation_type: "none" });
    });
});
// Timer Event Listeners
elm.game_timer_toggle_button.addEventListener("click", (event) => {
    if (elm.game_timer_toggle_button.classList.contains("running")) {
        cm.actions["set:clock_state"]("game", false);
        return;
    }    
    if (elm.game_timer_toggle_button.classList.contains("paused")) {
        cm.actions["set:clock_state"]("game", true);
        return;
    }
});
elm.shot_clock_toggle_button.addEventListener("click", (event) => {
    if (elm.shot_clock_toggle_button.classList.contains("running")) {
        cm.actions["set:clock_state"]("play", false);
        return;
    }    
    if (elm.shot_clock_toggle_button.classList.contains("paused")) {
        cm.actions["set:clock_state"]("play", true);
        return;
    }
});
// Timer Input Listeners
function add_clock_time_action_issuer(clock,amount){
    cm.actions["add:clock_time"](clock, amount)
}
function add_clock_time_to_game_timer_action_issuer(amount){
    add_clock_time_action_issuer("game",amount)
}
function add_clock_time_to_play_clock_action_issuer(amount){
    add_clock_time_action_issuer("play",amount)
}

function set_play_clock_to_default_action_issuer(){
    cm.actions["set:clock_time"]("play", parseInt(elm.shot_clock_duration_default.value) * 1000);
}
function set_play_clock_to_value_action_issuer(time){
    cm.actions["set:clock_time"]("play", time);
}
function set_game_clock_to_default_action_issuer(){
    cm.actions["set:clock_time"]("game", parseInt(elm.game_timer_duration_default.value) * 1000);
}
// Down & Distance Event Listeners
function set_down_action_issuer(down){
    cm.actions["set:down"](down);
}
function set_distance_action_issuer(distance){
    cm.actions["set:distance"](distance);
}
function add_down_action_issuer(amount){
    cm.actions["add:down"](amount);
}
function add_distance_action_issuer(amount){
    cm.actions["add:distance"](amount);
}

// Quarter & Period Event Listeners
function set_quarter_action_issuer(quarter){
    cm.actions["set:quarter"](quarter);
}
function add_quarter_action_issuer(amount){
    cm.actions["add:quarter"](amount);
}

// Possession Event Listeners
function set_possession_action_issuer(team){
    cm.actions["set:possession"](team);
}

// Timeouts Event Listeners
function set_team_timeouts_action_issuer(team, timeouts){
    cm.actions["set:team_timeouts"](team, timeouts);
}
function add_team_timeouts_action_issuer(team, amount){
    cm.actions["add:team_timeouts"](team, amount);
}


// Input Box Event Listeners
function set_team_score_action_issuer(team, score){
    cm.actions["set:team_score"](team, score);
}

elm.home_team_score.addEventListener("change", (event) => {
    let value = elm.home_team_score.value
    let new_score = parseInt(value);
    if (!isNaN(new_score) && new_score >= 0) {
        set_team_score_action_issuer("home", new_score);
    }

});
elm.away_team_score.addEventListener("change", (event) => {
    let value = elm.away_team_score.value
    let new_score = parseInt(value);
    if (!isNaN(new_score) && new_score >= 0) {
        set_team_score_action_issuer("away", new_score);
    }

});

// Down input box listener
elm.down.addEventListener("change", (event) => {
    let value = elm.down.value;
    let new_down = parseInt(value);
    if (!isNaN(new_down) && new_down >= 1 && new_down <= 4) {
        set_down_action_issuer(new_down);
    }
});

// Distance input box listener
elm.distance.addEventListener("change", (event) => {
    let value = elm.distance.value;
    let new_distance = parseInt(value);
    if (!isNaN(new_distance)) {
        set_distance_action_issuer(new_distance);
    }
});

// Quarter input box listener
elm.quarter.addEventListener("change", (event) => {
    let value = elm.quarter.value;
    let new_quarter = parseInt(value);
    if (!isNaN(new_quarter) && new_quarter >= 0 && new_quarter <= 5) {
        set_quarter_action_issuer(new_quarter);
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
        cm.actions["set:clock_time"]("game", new_time_seconds * 1000);
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
        cm.actions["set:clock_time"]("play", new_time_seconds * 1000);
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
        cm.actions["set:team_name"]("home", value);
    }
});

elm.away_team_name.addEventListener("change", (event) => {
    let value = elm.away_team_name.value;
    if (value.trim() !== "") {
        cm.actions["set:team_name"]("away", value);
    }
});

// Team Color input box listeners
elm.home_team_color.addEventListener("change", (event) => {
    let value = elm.home_team_color.value;
    elm.home_team_color_hex.value = value; 
    cm.actions["set:team_color"]("home", value);
});

elm.home_team_color_hex.addEventListener("change", (event) => {
    let value = elm.home_team_color_hex.value;
    if (value.match(/^#[0-9A-F]{6}$/i)) { // I totally wrote this regex myself :P
        elm.home_team_color.value = value; 
        cm.actions["set:team_color"]("home", value);
    }
});

elm.away_team_color.addEventListener("change", (event) => {
    let value = elm.away_team_color.value;
    elm.away_team_color_hex.value = value;
    cm.actions["set:team_color"]("away", value);
});

elm.away_team_color_hex.addEventListener("change", (event) => {
    let value = elm.away_team_color_hex.value;
    if (value.match(/^#[0-9A-F]{6}$/i)) { 
        elm.away_team_color.value = value; 
        cm.actions["set:team_color"]("away", value);
    }
});

// Timeouts input box listeners
elm.home_timeouts.addEventListener("change", (event) => {
    let value = elm.home_timeouts.value;
    let new_timeouts = parseInt(value);
    if (!isNaN(new_timeouts) && new_timeouts >= 0 && new_timeouts <= 3) {
        set_team_timeouts_action_issuer("home", new_timeouts);
    }
});

elm.away_timeouts.addEventListener("change", (event) => {
    let value = elm.away_timeouts.value;
    let new_timeouts = parseInt(value);
    if (!isNaN(new_timeouts) && new_timeouts >= 0 && new_timeouts <= 3) {
        set_team_timeouts_action_issuer("away", new_timeouts);
    }
});

// Flags

function set_flag_state_action_issuer(flag_state) {
    cm.actions["set:flag"](flag_state);
}