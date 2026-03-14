function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max)
}
if(document.querySelector("#connection-status")){
    document.querySelector("#connection-status").classList.add("hide");
    let urlParams = new URLSearchParams(window.location.search);
    let debug = urlParams.has("debug") ? urlParams.get("debug") !== "false" : false;
    if(debug){
        document.querySelector("#connection-status").classList.remove("hide");
    }
}

class connection_manager {
    isConnected = false;
    isAuthenticated = false;
    ws = undefined;
    autoReconnectInterval = undefined;
    role = "none";
    password = "";
    hasSuccessfullyAuthenticatedBefore = false;
    serverTimeSyncFound = true;

    //later on i need to incorporate some form for averaging to smooth these vals
    serverTimeOffset = 0;
    ping = 0;
    samplesCount = 20;
    serverTimeOffsetSamples = [];
    pingSamples = [];

    reconnectIntervalTime;
    pingIntervalTime;

    _intelligentPredictiveRendering = false;
    //this allows the client to perdict the servers response optmisticly and with greater accercy event at large ping values
    //it fakes immediate sync events from the server and uses its knowledge of the network's speed to predict desync between time of server and client
    

    _predictedState = {
        homeTeam: {
            name: "Palatine",
            image: "blank",
            score: 0,
            color: "#35ffa1",
            timeoutsRemaining: 3,
            roster: {
                "-1": "Home Player Name".split(' '),
            },
        },
        awayTeam: {
            name: "Away Team",
            image: "blank",
            score: 0,
            color: "#ff6c32",
            timeoutsRemaining: 3,
            roster: {
                "-1": "Away Player Name".split(' '),
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
        playerStats: {
            home: {},
            away: {},
            display: {
                visible: true,
                team: "home",
                sortBy: "jersey",
            },
        }
    };
    //filled to help vscode and avoid undefined errors

    constructor(options = {}){
        let urlParams = new URLSearchParams(window.location.search);
        let ipr = urlParams.has("ipr") ? urlParams.get("ipr") !== "false" : false;
        this.role = options.role || "none";
        this.reconnectIntervalTime = options.reconnectIntervalTime || 2000;
        this.password = options.password || "";
        this._intelligentPredictiveRendering = options.intelligentPredictiveRendering || ipr;
        this.pingIntervalTime = options.pingIntervalTime || 1000;
        this._sendPing();
        this._fetchConfig();
        if(this._intelligentPredictiveRendering){
            (() => {
                let lastTime = Date.now();
                setInterval(() => {
                    let now = Date.now();
                    this._updateClocks(now - lastTime);
                    lastTime = now;
                })
            })()
        }
    }
    //hooks
    onConnect = () => {};
    onAuth = () => {};
    onClose = () => {};
    onPong = () => {};
    //reducer hooks

    //remember to hook into the sync:time reducer to ajust for server ping

    reducers = {
        "sync:name": (nameState) => {},
        "sync:icon": (iconState) => {},
        "sync:score": (scoreState) => {},
        "sync:color": (colorState) => {},
        "sync:time": (timeState) => {},
        "sync:down": (downState) => {},
        "sync:quarter": (quarterState) => {},
        "sync:possession": (possessionState) => {},
        "sync:timeouts": (timeoutsState) => {},
        "sync:flag": (flagState) => {},
        "sync:roster": (rosterState) => {},
        "sync:player_stats": (playerStatsState) => {},
        "event:team_score": (teamScoreEvent) => {},

    }
    //action issuers
    actions = {
        "add:team_score": (team, amount, options = {}) => {
            const payload = { team, amount, ...options };
            this.sendAction("add:team_score", payload)
            if(this._intelligentPredictiveRendering){
                this._predictedState[team == "home" ? "homeTeam" : "awayTeam"].score += amount;
                this._predictedState[team == "home" ? "homeTeam" : "awayTeam"].score = clamp(this._predictedState[team == "home" ? "homeTeam" : "awayTeam"].score, 0, 9999);
                this.reducers["sync:score"]({
                    home_score: this._predictedState.homeTeam.score,
                    away_score: this._predictedState.awayTeam.score
                });
            }
        },
        "add:clock_time": (clock, amount) => {
            this.sendAction("add:clock_time", { clock, amount })
            if(this._intelligentPredictiveRendering){
                //might be wrong maybe if by the time the request reaches the server the clock has ended
                //but in that case i dont think you can predict that
                //and it will have already triggered the server to stop the timer so
                //the sync form the server will correct this action 
                if(clock == "game"){
                    this._predictedState.time.gameClockCurrentTime += amount;
                    this._predictedState.time.gameClockCurrentTime = Math.max(this._predictedState.time.gameClockCurrentTime, 0);
                } else if(clock == "play"){
                    this._predictedState.time.playClockCurrentTime += amount;
                    this._predictedState.time.playClockCurrentTime = Math.max(this._predictedState.time.playClockCurrentTime, 0);
                }
                this.reducers["sync:time"](this._predictedState.time);
            }
        },
        "add:down": (amount) => {
            this.sendAction("add:down", { amount })
            if(this._intelligentPredictiveRendering){
                this._predictedState.down += amount;
                this._predictedState.down = clamp(this._predictedState.down, 1, 4);
                this.reducers["sync:down"]({ down: this._predictedState.down, distance: this._predictedState.distance });
            }
        },
        "add:distance": (amount) => {
            this.sendAction("add:distance", { amount })
            if(this._intelligentPredictiveRendering){
                this._predictedState.distance += amount;
                this._predictedState.distance = clamp(this._predictedState.distance, -1, Infinity);
                this.reducers["sync:down"]({ down: this._predictedState.down, distance: this._predictedState.distance });
            }
        },
        "add:quarter": (amount) => {
            this.sendAction("add:quarter", { amount })
            if(this._intelligentPredictiveRendering){
                this._predictedState.quarter += amount;
                this._predictedState.quarter = clamp(this._predictedState.quarter, 1, 4);
                this.reducers["sync:quarter"]({ quarter: this._predictedState.quarter });
            }
        },
        "add:team_timeouts": (team, amount) => {
            this.sendAction("add:team_timeouts", { team, amount })
            if(this._intelligentPredictiveRendering){
                this._predictedState[team == "home" ? "homeTeam" : "awayTeam"].timeoutsRemaining += amount;
                this._predictedState[team == "home" ? "homeTeam" : "awayTeam"].timeoutsRemaining = clamp(this._predictedState[team == "home" ? "homeTeam" : "awayTeam"].timeoutsRemaining, 0, 3);
                this.reducers["sync:timeouts"]({
                    home_timeouts: this._predictedState.homeTeam.timeoutsRemaining,
                    away_timeouts: this._predictedState.awayTeam.timeoutsRemaining
                });
            }
        },
        "set:team_score": (team, score) => {
            this.sendAction("set:team_score", { team, score })
            if(this._intelligentPredictiveRendering){
                this._predictedState[team == "home" ? "homeTeam" : "awayTeam"].score = score;
                this.reducers["sync:score"]({
                    home_score: this._predictedState.homeTeam.score,
                    away_score: this._predictedState.awayTeam.score
                });
            }
        },
        "set:team_name": (team, name) => {
            this.sendAction("set:team_name", { team, name })
            if(this._intelligentPredictiveRendering){
                this._predictedState[team == "home" ? "homeTeam" : "awayTeam"].name = name;
                this.reducers["sync:name"]({
                    home_name: this._predictedState.homeTeam.name,
                    away_name: this._predictedState.awayTeam.name
                });
            }
        },
        "set:team_color": (team, color) => {
            this.sendAction("set:team_color", { team, color })
            if(this._intelligentPredictiveRendering){
                this._predictedState[team == "home" ? "homeTeam" : "awayTeam"].color = color;
                this.reducers["sync:color"]({
                    home_color: this._predictedState.homeTeam.color,
                    away_color: this._predictedState.awayTeam.color
                });
            }
        },
        "set:clock_state": (clock, is_running) => {
            this.sendAction("set:clock_state", { clock, is_running })
            if(this._intelligentPredictiveRendering){
                if(clock == "game"){
                    if(is_running == true){
                        //is going to start running
                        this._predictedState.time.gameClockCurrentTime + this.ping
                        this._predictedState.time.isGameClockRunning = true;
                        this.reducers["sync:time"](this._predictedState.time);
                    } else if(is_running == false) {
                        //stoping the clock
                        this._predictedState.time.gameClockCurrentTime - this.ping
                        this._predictedState.time.isGameClockRunning = false;

                        //When switching to desycned game and play clocks please remove following 2 lines
                        this._predictedState.time.playClockCurrentTime - this.ping
                        this._predictedState.time.isPlayClockRunning = false;

                        this.reducers["sync:time"](this._predictedState.time);
                    }
                }
                if(clock == "play"){
                    if(is_running == true){
                        //is going to start running
                        this._predictedState.time.playClockCurrentTime + this.ping
                        this._predictedState.time.isPlayClockRunning = true;
                        this.reducers["sync:time"](this._predictedState.time);
                    } else if(is_running == false) {
                        //stoping the clock
                        this._predictedState.time.playClockCurrentTime - this.ping
                        this._predictedState.time.isPlayClockRunning = false;
                        this.reducers["sync:time"](this._predictedState.time);
                    } 
                }
            }
        },
        "set:clock_time": (clock, time) => {
            this.sendAction("set:clock_time", { clock, time })
            //i dont think there is any perdiction only on reciving
        },
        "set:down": (down) => {
            this.sendAction("set:down", { down })
            if(this._intelligentPredictiveRendering){
                this._predictedState.down = down;
                this.reducers["sync:down"]({ down: this._predictedState.down });
            }
        },
        "set:distance": (distance) => {
            this.sendAction("set:distance", { distance })
            if(this._intelligentPredictiveRendering){
                this._predictedState.distance = distance;
                this.reducers["sync:down"]({ distance: this._predictedState.distance });
            }
        },
        "set:quarter": (quarter) => {
            this.sendAction("set:quarter", { quarter })
            if(this._intelligentPredictiveRendering){
                this._predictedState.quarter = quarter;
                this.reducers["sync:quarter"]({ quarter: this._predictedState.quarter });
            }
        },
        "set:possession": (team) => {
            this.sendAction("set:possession", { team })
            if(this._intelligentPredictiveRendering){
                this._predictedState.possession = team;
                this.reducers["sync:possession"]({ possession: this._predictedState.possession });
            }
        },
        "set:team_timeouts": (team, timeouts) => {
            this.sendAction("set:team_timeouts", { team, timeouts })
            if(this._intelligentPredictiveRendering){
                this._predictedState[team == "home" ? "homeTeam" : "awayTeam"].timeoutsRemaining = timeouts;
                this.reducers["sync:timeouts"]({ timeouts: this._predictedState[team == "home" ? "homeTeam" : "awayTeam"].timeoutsRemaining });
            }
        },
        "set:flag": (flagState) => {
            this.sendAction("set:flag", flagState)
            if(this._intelligentPredictiveRendering){
                this._predictedState.flag = flagState;
                this.reducers["sync:flag"](this._predictedState.flag);
            }
        },
        "set:visibility": (visibilityState) => {
            this.sendAction("set:visibility", visibilityState)
            if(this._intelligentPredictiveRendering){
                Object.assign(this._predictedState.visibility, visibilityState);
                this.reducers["sync:visibility"](this._predictedState.visibility);
            }
        },
        "set:team_icon": (team, icon) => {
            this.sendAction("set:team_icon", { team, icon })
            if(this._intelligentPredictiveRendering){
                this._predictedState[team == "home" ? "homeTeam" : "awayTeam"].icon = icon;
                this.reducers["sync:icon"]({ icon: this._predictedState[team == "home" ? "homeTeam" : "awayTeam"].icon });
            }
        }
    }

    // pull config from server
    _fetchConfig = async () => {
        const response = await fetch("/config");
        if (response.ok) {
            const config = await response.json();
            this.pingIntervalTime = config.PING_INTERVAL_MS;
        } else {
            console.error("Failed to fetch config:", response.statusText);
        }
    }

    //funcs


    clearAutoReconnectInterval = () => {
        if(this.autoReconnectInterval) {
            clearTimeout(this.autoReconnectInterval)
            this.autoReconnectInterval = undefined;
        }
    }

    setAutoReconnectInterval = () => {
        this.clearAutoReconnectInterval();
        if(!this.hasSuccessfullyAuthenticatedBefore){
            if(this.role == "admin"){ return; }
            if(this.role == "scoreboard"){ console.warn("Server Failed to Authenticate, auto reconnect has been premited to continue under scoreboard role."); }
        }
        this.autoReconnectInterval = setInterval(() => {
            this.connect()
        }, this.reconnectIntervalTime)
    }

    sendData = (data) => {
        
        return this.ws.send(JSON.stringify(data,null,4));
    }
    sendAction = (actionType, payload) => {
        if(!this.isAuthenticated){ console.log("Not authenticated, cannot send action"); return; }
        this.sendData({type: actionType, payload: payload, timings: {client_send_time:Date.now()}});
    }

    _sendAuth = () => {
        if(this.role == "admin"){
            this.sendData({
                type:"auth:admin",
                payload:{
                    password: this.password
                }
            })
        }
        if(this.role == "scoreboard"){
            this.sendData({
                type:"auth:scoreboard",
                payload:{}
            })
        }
    }

    _handleAuthMessage = (action) => {
        if(action.type == "auth:success"){
            this.isAuthenticated = true;
            this.hasSuccessfullyAuthenticatedBefore = true;
            this.role = action.payload.role;
            this.sendAction("request:sync",{})
            this._sendPing(true)
            this.onAuth();
        }
    }
    _sendPing = (cancel_timeout = false) => {
        if(this.isConnected && this.isAuthenticated){
            this.sendAction("ping", {});
        }
        if(!cancel_timeout){
            setTimeout(() => { this._sendPing() }, this.pingIntervalTime);

        }
    }


    connect = () => {
        if(this.isConnected){ return; }
        this.ws = new WebSocket(`ws://${window.location.host}/${this.role}_ws`);
        this.ws.onopen = this._onOpen
        this.ws.onmessage = this._onMessage
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        this.ws.onclose = this._onClose;
    }

    _onOpen = () => {
        this.isConnected = true;
        this._sendAuth();
        this.onConnect();
    }

    _onMessage = (event) => {
        try {
            let action = JSON.parse(event.data)

            if(!this.isAuthenticated){
                this._handleAuthMessage(action);
                return;
            }
            if (!action.timings) action.timings = {};
            action.timings.client_receive_time = Date.now();
            this._handleReducerMessage(action);
        } catch (error) {
            console.log("Error On Message:")
            console.log(error)
            console.log("Message:")
            console.log(event.data.toString())
        }
    }
    _onClose = (event) => {
        this.isConnected = false;
        this.isAuthenticated = false;
        this.setAutoReconnectInterval();
        this.onClose();
    }
    _handleReducerMessage = (action) => {
        if(action.type == "pong"){
            this._handlePongResponse(action);
            return;
        }


        if(action.type == "sync"){
            this._syncBreakdownReducer(action);
        } else if(this.reducers[action.type]){
            this.reducers[action.type](action.payload);
        }
        if(this._intelligentPredictiveRendering){
            this._predictedStateReducer(action)
        }
    }

    _predictedStateReducer = (action) => {
        let payload = action.payload;
        switch (action.type) {
            case "sync":
                this._predictedState = payload
                this._predictTimeState({...action, payload: payload.time});
                break;
            case "sync:score":
                this._predictedState.homeTeam.score = payload.home_score;
                this._predictedState.awayTeam.score = payload.away_score;
                break;
            case "sync:name":
                this._predictedState.homeTeam.name = payload.home_name;
                this._predictedState.awayTeam.name = payload.away_name;
                break;
            case "sync:color":
                this._predictedState.homeTeam.color = payload.home_color;
                this._predictedState.awayTeam.color = payload.away_color;
                break;
            case "sync:time":
                this._predictTimeState(action);
                
                break;
            case "sync:down":
                this._predictedState.down = payload.down;
                this._predictedState.distance = payload.distance;
                break;
            case "sync:quarter":
                this._predictedState.quarter = payload.quarter;
                break;
            case "sync:possession":
                this._predictedState.possession = payload.possession;
                break;
            case "sync:timeouts":
                this._predictedState.homeTeam.timeouts = payload.home_timeouts;
                this._predictedState.awayTeam.timeouts = payload.away_timeouts;
                break;
            case "sync:flag":
                this._predictedState.flag = payload;
                break;
            case "sync:roster":
                this._predictedState.homeTeam.roster = payload.home_roster;
                this._predictedState.awayTeam.roster = payload.away_roster;
                break;
            case "sync:player_stats":
                this._predictedState.playerStats = payload;
                break;
            default:
                break;
        }
    }
    _predictTimeState = (action) => {
        if(!this.serverTimeSyncFound){ this._predictTimeState.time = action.payload;console.log("Can not predict time state, because sync not found"); return; }
        let payload = action.payload
        
        let timestamp = action.timings.server_send_time - this.serverTimeOffset
        let time_sense_send = Date.now() - timestamp;
        if(payload.isGameClockRunning){
            console.log("Predicting Game Clock Running Delta:" + (this._predictedState.time.gameClockCurrentTime - (payload.gameClockCurrentTime - time_sense_send)) + "ms")

            this._predictedState.time.gameClockCurrentTime = payload.gameClockCurrentTime - time_sense_send
            
        } else {
            console.log("Predicting Game Clock Stopped Delta:" + (this._predictedState.time.gameClockCurrentTime - payload.gameClockCurrentTime) + "ms")
            this._predictedState.time.gameClockCurrentTime = payload.gameClockCurrentTime
        }
        if(payload.isPlayClockRunning){
            this._predictedState.time.playClockCurrentTime = payload.playClockCurrentTime - time_sense_send
        } else {
            this._predictedState.time.playClockCurrentTime = payload.playClockCurrentTime
        }
        this._predictedState.time.isGameClockRunning = payload.isGameClockRunning;
        this._predictedState.time.isPlayClockRunning = payload.isPlayClockRunning;
        this.reducers["sync:time"](this._predictedState.time);

    }
    //need to call ping -> i think i fixed this
    _handlePongResponse = (action) => {
        let timings = action.timings;
        this.ping = (timings.client_receive_time - timings.client_send_time)/2;
        this.serverTimeOffset = timings.server_send_time + this.ping - timings.client_receive_time;

        // Add samples for averaging
        this.pingSamples.push(this.ping);
        this.serverTimeOffsetSamples.push(this.serverTimeOffset);

        // Keep only the last N samples
        if (this.pingSamples.length > this.samplesCount) {
            this.pingSamples.shift();
        }
        if (this.serverTimeOffsetSamples.length > this.samplesCount) {
            this.serverTimeOffsetSamples.shift();
        }

        // Calculate averages
        const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
        this.ping = avg(this.pingSamples);
        this.serverTimeOffset = avg(this.serverTimeOffsetSamples);
        this.serverTimeSyncFound = true;
        this.onPong();
    }
    _syncBreakdownReducer = (action) => {
        let state = action.payload
        this.reducers["sync:name"]({
            home_name: state.homeTeam.name,
            away_name: state.awayTeam.name
        });
        this.reducers["sync:color"]({
            home_color: state.homeTeam.color,
            away_color: state.awayTeam.color
        });
        this.reducers["sync:score"]({
            home_score: state.homeTeam.score,
            away_score: state.awayTeam.score
        });
        if(this._intelligentPredictiveRendering && this.serverTimeSyncFound){
            this._predictedStateReducer({timestamp:action.timestamp,payload:state.time})
        } else {
            this.reducers["sync:time"](state.time);
        }
        this.reducers["sync:down"]({
            down: state.down,
            distance: state.distance
        });
        this.reducers["sync:quarter"]({
            quarter: state.quarter
        });
        this.reducers["sync:possession"]({
            possession: state.possession
        });
        this.reducers["sync:timeouts"]({
            home_timeouts: state.homeTeam.timeoutsRemaining,
            away_timeouts: state.awayTeam.timeoutsRemaining
        });
        this.reducers["sync:flag"]({
            isFlagEmitted: state.flag.isFlagEmitted,
            team: state.flag.team,
            status: state.flag.status,
            playerBlame: state.flag.playerBlame
        });
        this.reducers["sync:roster"]({
            home_roster: state.homeTeam.roster,
            away_roster: state.awayTeam.roster
        });
        this.reducers["sync:player_stats"](state.playerStats || { home: {}, away: {}, display: {} });
        this.reducers["sync:icon"]({
            home_icon: state.homeTeam.image,
            away_icon: state.awayTeam.image
        });
    }

    //handle clock tick
    _updateClocks = (delta_time) => {
        if(this._predictedState.time.isGameClockRunning){
            this._predictedState.time.gameClockCurrentTime =
                Math.max(this._predictedState.time.gameClockCurrentTime - delta_time, 0);
            if(this._predictedState.time.gameClockCurrentTime == 0){
                this._predictedState.time.isGameClockRunning = false;
                this.reducers["sync:time"](this._predictedState.time)
            }
        }
        if(this._predictedState.time.isPlayClockRunning){//please remove later for update
            this._predictedState.time.playClockCurrentTime =
                Math.max(this._predictedState.time.playClockCurrentTime - delta_time, 0);
            if(this._predictedState.time.playClockCurrentTime == 0){
                this._predictedState.time.isPlayClockRunning = false;
                this.reducers["sync:time"](this._predictedState.time)
            }
        }
    }
}