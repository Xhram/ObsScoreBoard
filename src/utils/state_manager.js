
import fs from "fs";
import { SCOREBOARD_STATE_FILE, PLAYER_STATS_STATE_FILE } from "../config/index.js";
import { image_to_data_url } from "./image.js";

export class StateManager {
    scoreboard = undefined;
    constructor(){
        this.scoreboard = this.loadScoreboardState() || this.defaultScoreboardState();
        const separatedPlayerStats = this.loadPlayerStatsState();
        if (separatedPlayerStats) {
            this.scoreboard.playerStats = separatedPlayerStats;
        } else if (!this.scoreboard.playerStats) {
            // Backward compatibility for first run after split.
            this.scoreboard.playerStats = this.defaultPlayerStatsState();
        }
        this.normalizePlayerStatsState();
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
        if(this.scoreboard.time.isGameClockRunning){
            this.scoreboard.time.gameClockCurrentTime =
                Math.max(this.scoreboard.time.gameClockCurrentTime - delta_time, 0);
            if(this.scoreboard.time.gameClockCurrentTime == 0){
                this.scoreboard.time.isGameClockRunning = false;
            }
        }
        /**
         * The play clock is updated in parallel with the game clock when both are running.
         * This logic is intentionally duplicated on both the server and client to ensure
         * consistent clock state across platforms, as timing events may not be perfectly
         * synchronized due to network latency or platform-specific event handling.
         */
        if(this.scoreboard.time.isPlayClockRunning){
            this.scoreboard.time.playClockCurrentTime =
                Math.max(this.scoreboard.time.playClockCurrentTime - delta_time, 0);
            if(this.scoreboard.time.playClockCurrentTime == 0){
                this.scoreboard.time.isPlayClockRunning = false;
            }
        }
    }

    
    sync_getters = {
        "sync": () => this.scoreboard,
        "sync:icon": () => ({
            home_icon: this.scoreboard.homeTeam.image,
            away_icon: this.scoreboard.awayTeam.image,
        }),
        "sync:score": () => ({
            home_score: this.scoreboard.homeTeam.score,
            away_score: this.scoreboard.awayTeam.score,
        }),
        "sync:name": () => ({
            home_name: this.scoreboard.homeTeam.name,
            away_name: this.scoreboard.awayTeam.name,
        }),
        "sync:color": () => ({
            home_color: this.scoreboard.homeTeam.color,
            away_color: this.scoreboard.awayTeam.color,
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
        "sync:timeouts": () => ({
            home_timeouts: this.scoreboard.homeTeam.timeoutsRemaining,
            away_timeouts: this.scoreboard.awayTeam.timeoutsRemaining,
        }),
        "sync:flag": () => this.scoreboard.flag,
        "sync:visibility": () => {
            // Initialize visibility object if it doesn't exist (for backwards compatibility)
            if (!this.scoreboard.visibility) {
                this.scoreboard.visibility = {
                    playClock: true,
                    gameClock: true,
                    scores: true,
                    downDistance: true,
                };
            }
            return this.scoreboard.visibility;
        },
        "sync:player_stats": () => this.scoreboard.playerStats,
        "sync:player_stats:home": () => this.scoreboard.playerStats.home,
        "sync:player_stats:away": () => this.scoreboard.playerStats.away,
        "sync:player_stats:display": () => this.scoreboard.playerStats.display,
    }

    loadScoreboardState = () => {
        try {
            const data = fs.readFileSync(SCOREBOARD_STATE_FILE, "utf-8");
            return JSON.parse(data);
        } catch (error) {
            console.error("Error loading scoreboard state:", JSON.stringify(error));
            return undefined;
        }
    }

    loadPlayerStatsState = () => {
        try {
            const data = fs.readFileSync(PLAYER_STATS_STATE_FILE, "utf-8");
            return JSON.parse(data);
        } catch (error) {
            return undefined;
        }
    }

    normalizePlayerStatsState = () => {
        if (!this.scoreboard.playerStats) {
            this.scoreboard.playerStats = this.defaultPlayerStatsState();
        }
        if (!this.scoreboard.playerStats.home) {
            this.scoreboard.playerStats.home = {};
        }
        if (!this.scoreboard.playerStats.away) {
            this.scoreboard.playerStats.away = {};
        }
        if (!this.scoreboard.playerStats.display) {
            this.scoreboard.playerStats.display = {
                visible: true,
                team: "home",
                sortBy: "jersey",
            };
        }
    }

    defaultPlayerStatsState = () => ({
        home: {},
        away: {},
        display: {
            visible: true,
            team: "home",
            sortBy: "jersey",
        },
    })

    savePlayerStatsState = () => {
        try {
            fs.writeFileSync(
                PLAYER_STATS_STATE_FILE,
                JSON.stringify({ ...this.scoreboard.playerStats, saveTimestamp: Date.now() }, null, 4)
            );
        } catch (error) {
            console.error("Error saving player stats state:", error);
        }
    }

    saveScoreboardState = () => {
        try {
            const { playerStats, ...scoreboardWithoutPlayerStats } = this.scoreboard;
            fs.writeFileSync(
                SCOREBOARD_STATE_FILE,
                JSON.stringify({ ...scoreboardWithoutPlayerStats, saveTimestamp: Date.now() }, null, 4)
            );
        } catch (error) {
            console.error("Error saving scoreboard state:", error);
        }
        this.savePlayerStatsState();
    }
    defaultScoreboardState = () => {
        return {
            homeTeam: {
                name: "Palatine",
                image: image_to_data_url("./src/assets/phs_ptv_64.png"),
                score: 0,
                color: "#35ffa1",
                timeoutsRemaining: 3,
                roster: {
                    "-1": "Home Player Name".split(" "),
                },
            },
            awayTeam: {
                name: "Away Team",
                image: image_to_data_url("./src/assets/phs_ptv_64.png"),
                score: 0,
                color: "#ff6c32",
                timeoutsRemaining: 3,
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
                playClockCurrentTime: 45 * 1000,
                gameClockCurrentTime: 15 * 60 * 1000,
                isGameClockRunning: false,
                isPlayClockRunning: false,
            },
            flag: {
                isFlagEmitted: false,
                team: "none", // team is either 'home' or 'away' or 'none'
                status: "none", // status is either 'flag' or 'review'
                playerBlame: -2, // player number who threw the flag
            },
            visibility: {
                playClock: true,
                gameClock: true,
                scores: true,
                downDistance: true,
            },
            playerStats: this.defaultPlayerStatsState(),
        };
    }

    createBlankPlayerStats() {
        return {
            name: "",
            points: 0,
            rebounds: 0,
            assists: 0,
            steals: 0,
            blocks: 0,
            turnovers: 0,
            fouls: 0,
            fieldGoals: { made: 0, attempted: 0 },
            threePointers: { made: 0, attempted: 0 },
            freeThrows: { made: 0, attempted: 0 },
            quarterly: [
                { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0 },
                { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0 },
                { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0 },
                { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0 },
            ],
        };
    }

    getPlayerStatPercentages(stats) {
        return {
            fieldGoalPercentage: stats.fieldGoals.attempted > 0
                ? ((stats.fieldGoals.made / stats.fieldGoals.attempted) * 100).toFixed(1)
                : "0.0",
            threePointPercentage: stats.threePointers.attempted > 0
                ? ((stats.threePointers.made / stats.threePointers.attempted) * 100).toFixed(1)
                : "0.0",
            freeThrowPercentage: stats.freeThrows.attempted > 0
                ? ((stats.freeThrows.made / stats.freeThrows.attempted) * 100).toFixed(1)
                : "0.0",
        };
    }

    getSortedTeamRoster(team) {
        const players = team === "home" ? this.scoreboard.playerStats.home : this.scoreboard.playerStats.away;
        return Object.entries(players)
            .map(([jersey, playerData]) => ({
                jersey,
                ...playerData,
                percentages: this.getPlayerStatPercentages(playerData),
            }))
            .sort((a, b) => {
                const aNum = Number.parseInt(a.jersey, 10);
                const bNum = Number.parseInt(b.jersey, 10);
                if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
                    return aNum - bNum;
                }
                return String(a.jersey).localeCompare(String(b.jersey));
            });
    }
}

