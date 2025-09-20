function sel(value){
    return document.querySelector(value)
}
let cm = new connection_manager({role: "scoreboard", reconnectIntervalTime: 200});


cm.onAuth = () => {
    update_debug_info();
}
cm.onPong = () => {
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
    play_clock_seconds = time_state.playClockCurrentTime / 1000
    game_clock_seconds = time_state.gameClockCurrentTime / 1000
    update_game_clock_display();
    update_play_clock_display();
    if(time_state.isGameClockRunning){
        start_game_clock();
    } else {
        stop_game_clock();
    }
    if(time_state.isPlayClockRunning && time_state.isGameClockRunning){
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
    if(flag_state.isFlagEmitted){
        emit_flag(flag_state.status, flag_state.team, flag_state.playerBlame)
    } else {
        clear_flag();
    }
}

cm.reducers["event:team_score"] = (team_score_event) => {
    set_team_score(team_score_event.team, team_score_event.previous_score)
    add_points_to_team(team_score_event.team, team_score_event.amount, team_score_event.animation ? team_score_event.animation_type : "none")
}

cm.reducers["sync:roster"] = (roster_state) => {
    homeTeam_roster = roster_state.home_roster
    awayTeam_roster = roster_state.away_roster
}

cm.reducers["sync"] = (state) => {
    homeTeam_roster = state.homeTeam.roster
    awayTeam_roster = state.awayTeam.roster
    set_team_score("home", state.homeTeam.score)
    set_team_score("away", state.awayTeam.score)
    set_team_name("home", state.homeTeam.name)
    set_team_name("away", state.awayTeam.name)
    set_team_color("home", state.homeTeam.color)
    set_team_color("away", state.awayTeam.color)
    set_team_icon("home", state.homeTeam.image)
    set_team_icon("away", state.awayTeam.image)
    set_team_possession(state.possession)
    set_timeouts("home", state.homeTeam.timeouts_remaining)
    set_timeouts("away", state.awayTeam.timeouts_remaining)
    set_game_quarter(state.quarter)

    cm.reducers["sync:down"]({ down: state.down, distance: state.distance });
    cm.reducers["sync:time"](state.time)
    cm.reducers["sync:flag"](state.flag)
}

cm.connect();
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

