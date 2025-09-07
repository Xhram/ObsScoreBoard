function sel(value){
    return document.querySelector(value)
}
let cm = new connection_manager({role: "scoreboard", reconnect_interval_time: 2000});


cm.on_auth = () => {
    update_debug_info();
}
cm.on_pong = () => {
    update_debug_info();
}

// Set up reducers
cm.reducers["sync:name"] = (name_state) => {
    set_team_name("home", name_state.home_name);
    set_team_name("away", name_state.away_name);
}

cm.reducers["sync:score"] = (score_state) => {
    set_team_score("home", score_state.home_score);
    set_team_score("away", score_state.away_score);
}

cm.reducers["sync:color"] = (color_state) => {
    set_team_color("home", color_state.home_color);
    set_team_color("away", color_state.away_color);
}

cm.reducers["sync:time"] = (time_state) => {
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

cm.reducers["sync:down"] = (down_state) => {
    set_game_down(down_state.down);
    set_game_to_go(down_state.distance == -1 ? "Goal" : down_state.distance, down_state.distance == -1 ? "" : down_state.distance == 0 ? "INCHES" : "YDS");
}

cm.reducers["sync:quarter"] = (quarter_state) => {
    set_game_quarter(quarter_state.quarter);
}

cm.reducers["sync:possession"] = (possession_state) => {
    set_team_possession(possession_state.possession);
}

cm.reducers["sync:timeouts"] = (timeouts_state) => {
    set_timeouts("home", timeouts_state.home_timeouts);
    set_timeouts("away", timeouts_state.away_timeouts);
}

cm.reducers["sync:flag"] = (flag_state) => {
    if(flag_state.is_flag_emitted){
        emit_flag(flag_state.status, flag_state.team, flag_state.player_blame)
    } else {
        clear_flag();
    }
}

cm.reducers["event:team_score"] = (team_score_event) => {
    set_team_score(team_score_event.team, team_score_event.previous_score)
    add_points_to_team(team_score_event.team, team_score_event.amount, team_score_event.animation ? team_score_event.animation_type : "none")
}

cm.reducers["sync:roster"] = (roster_state) => {
    team_home_roster = roster_state.home_roster
    team_away_roster = roster_state.away_roster
}

cm.reducers["sync"] = (state) => {
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

    cm.reducers["sync:down"]({ down: state.down, distance: state.distance });
    cm.reducers["sync:time"](state.time)
    cm.reducers["sync:flag"](state.flag)
}

cm.connect();
update_debug_info()
function update_debug_info(){
    let output = "";
    if (cm.is_connected) {
        if (cm.is_authenticated) {
            output = `Online (${cm.role}), IPR: ${cm._intelligent_predictive_rendering ? "Enabled" : "Disabled"}`;
            if(cm.server_time_sync_found){
                output += `, Ping: ${(cm.ping * 2).toFixed(0)} ms, Offset: ${cm.server_time_offset.toFixed(0)} ms`
            }

        } else {
            output = "Authenticating...";
        }
    } else {
        output = "Offline";
    }
    sel("#connection-status").innerHTML = output;

}

