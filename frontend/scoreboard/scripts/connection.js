function sel(value){
    return document.querySelector(value)
}
let cm = new connection_manager({role: "scoreboard", reconnectIntervalTime: 200});


cm.onAuth = () => {
    updateDebugInfo();
}
cm.onPong = () => {
    updateDebugInfo();
}

// Set up reducers
cm.reducers["sync:name"] = (nameState) => {
    set_team_name("home", nameState.home_name);
    set_team_name("away", nameState.away_name);
}

cm.reducers["sync:score"] = (scoreState) => {
    set_team_score("home", scoreState.home_score);
    set_team_score("away", scoreState.away_score);
}

cm.reducers["sync:color"] = (colorState) => {
    set_team_color("home", colorState.home_color);
    set_team_color("away", colorState.away_color);
}

cm.reducers["sync:time"] = (timeState) => {
    play_clock_seconds = timeState.playClockCurrentTime / 1000
    game_clock_seconds = timeState.gameClockCurrentTime / 1000
    update_game_clock_display();
    update_play_clock_display();
    if(timeState.isGameClockRunning){
        start_game_clock();
    } else {
        stop_game_clock();
    }
    if(timeState.isPlayClockRunning){
        start_play_clock();
    } else {
        stop_play_clock();
    }
}

cm.reducers["sync:down"] = (downState) => {
    set_game_down(downState.down);
    set_game_to_go(downState.distance == -1 ? "Goal" : downState.distance, downState.distance == -1 ? "" : downState.distance == 0 ? "INCHES" : "YDS");
}

cm.reducers["sync:quarter"] = (quarterState) => {
    set_game_quarter(quarterState.quarter);
}

cm.reducers["sync:possession"] = (possessionState) => {
    set_team_possession(possessionState.possession);
}

cm.reducers["sync:timeouts"] = (timeoutsState) => {
    set_timeouts("home", timeoutsState.home_timeouts);
    set_timeouts("away", timeoutsState.away_timeouts);
}

cm.reducers["sync:flag"] = (flagState) => {
    if(flagState.isFlagEmitted){
        emit_flag(flagState.status, flagState.team, flagState.playerBlame)
    } else {
        clear_flag();
    }
}

cm.reducers["event:team_score"] = (teamScoreEvent) => {
    set_team_score(teamScoreEvent.team, teamScoreEvent.previous_score)
    add_points_to_team(teamScoreEvent.team, teamScoreEvent.amount, teamScoreEvent.animation ? teamScoreEvent.animation_type : "none")
}

cm.reducers["sync:roster"] = (rosterState) => {
    homeTeam_roster = rosterState.home_roster
    awayTeam_roster = rosterState.away_roster
}

cm.reducers["sync:player_stats"] = (playerStatsState) => {
    set_player_stats_names("home", playerStatsState && playerStatsState.home);
    set_player_stats_names("away", playerStatsState && playerStatsState.away);
}


cm.reducers["sync:icon"] = (iconState) => {
    set_team_icon("home", iconState.home_icon);
    set_team_icon("away", iconState.away_icon);
}

cm.reducers["sync:visibility"] = (visibilityState) => {
    set_visibility(visibilityState);
}

cm.connect();
updateDebugInfo()
function updateDebugInfo(){
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

