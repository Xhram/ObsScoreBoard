
import fs from "fs";
import path from "path";
import { SCOREBOARD_STATE_FILE } from "../config/index.js";
import { image_to_data_url } from "./image.js";

export class state_manager {
    scoreboard = undefined;
    constructor(){
        this.scoreboard = this.load_scoreboard_state() || this.default_scoreboard_state();
        (()=>{
            let last_time = Date.now();
            setInterval(() => {
                let now = Date.now();
                this.update_clocks(now - last_time);
                last_time = now
            },100)
        })()
    }

    update_clocks = (delta_time) => {
        if(this.scoreboard.time.is_game_clock_running){
            this.scoreboard.time.game_clock_current_time =
                Math.max(this.scoreboard.time.game_clock_current_time - delta_time, 0);
            if(this.scoreboard.time.game_clock_current_time == 0){
                this.scoreboard.time.is_game_clock_running = false;
            }
        }
        /**
         * The play clock is updated in parallel with the game clock when both are running.
         * This logic is intentionally duplicated on both the server and client to ensure
         * consistent clock state across platforms, as timing events may not be perfectly
         * synchronized due to network latency or platform-specific event handling.
         */
        if(this.scoreboard.time.is_play_clock_running && this.scoreboard.time.is_game_clock_running){
            this.scoreboard.time.play_clock_current_time =
                Math.max(this.scoreboard.time.play_clock_current_time - delta_time, 0);
            if(this.scoreboard.time.play_clock_current_time == 0){
                this.scoreboard.time.is_play_clock_running = false;
            }
        }
    }

    
    sync_getters = {
        "sync": () => this.scoreboard,
        "sync:score": () => ({
            home_score: this.scoreboard.team_home.score,
            away_score: this.scoreboard.team_away.score,
        }),
        "sync:name": () => ({
            home_name: this.scoreboard.team_home.name,
            away_name: this.scoreboard.team_away.name,
        }),
        "sync:color": () => ({
            home_color: this.scoreboard.team_home.color,
            away_color: this.scoreboard.team_away.color,
        }),
        "sync:time": () => this.scoreboard.time,
        "sync:down": () => ({
            down: this.scoreboard.down,
            distance: this.scoreboard.distance,
        }),
        "sync:quarter": () => ({
            quarter: this.scoreboard.quarter,
        }),
        "sync:possession": () => ({
            possession: this.scoreboard.possession,
        }),
        "sync:timeout": () => ({
            home_timeouts: this.scoreboard.team_home.timeouts_remaining,
            away_timeouts: this.scoreboard.team_away.timeouts_remaining,
        }),
        "sync:flag": () => this.scoreboard.flag,
    }

    load_scoreboard_state = () => {
        try {
            const data = fs.readFileSync(SCOREBOARD_STATE_FILE, "utf-8");
            return JSON.parse(data);
        } catch (error) {
            console.error("Error loading scoreboard state:", error);
            return undefined;
        }
    }
    save_scoreboard_state = () => {
        try {
            fs.writeFileSync(SCOREBOARD_STATE_FILE, JSON.stringify(this.scoreboard, null, 4));
        } catch (error) {
            console.error("Error saving scoreboard state:", error);
        }
    }
    default_scoreboard_state = () => {
        return {
            team_home: {
                name: "Palatine",
                image: image_to_data_url("./src/assets/phs_ptv_64.png"),
                score: 0,
                color: "#35ffa1",
                timeouts_remaining: 3,
                roster: {
                    "-1": "Home Player Name".split(" "),
                },
            },
            team_away: {
                name: "Away Team",
                image: image_to_data_url("./src/assets/phs_ptv_64.png"),
                score: 0,
                color: "#ff6c32",
                timeouts_remaining: 3,
                roster: {
                    "-1": "Away Player Name".split(" "),
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
            },
        };
    }
}

