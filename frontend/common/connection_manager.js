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
    is_connected = false;
    is_authenticated = false;
    ws = undefined;
    auto_reconnect_interval = undefined;
    role = "none";
    password = "";
    has_successfully_authenticated_before = false;
    server_time_sync_found = true;

    //later on i need to incorporate some form for averaging to smooth these vals
    server_time_offset = 0;
    ping = 0;
    samples_count = 20;
    server_time_offset_samples = [];
    ping_samples = [];

    reconnect_interval_time;
    ping_interval_time;

    _intelligent_predictive_rendering = false;
    //this allows the client to perdict the servers response optmisticly and with greater accercy event at large ping values
    //it fakes immediate sync events from the server and uses its knowledge of the network's speed to predict desync between time of server and client
    

    _predicted_state = {
        team_home: {
            name: "Palatine",
            image: "blank",
            score: 0,
            color: "#35ffa1",
            timeouts_remaining: 3,
            roster: {
                "-1": "Home Player Name".split(' '),
            },
        },
        team_away: {
            name: "Away Team",
            image: "blank",
            score: 0,
            color: "#ff6c32",
            timeouts_remaining: 3,
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
        }
    };
    //filled to help vscode and avoid undefined errors

    constructor(options = {}){
        let urlParams = new URLSearchParams(window.location.search);
        let ipr = urlParams.has("ipr") ? urlParams.get("ipr") !== "false" : false;
        this.role = options.role || "none";
        this.reconnect_interval_time = options.reconnect_interval_time || 2000;
        this.password = options.password || "";
        this._intelligent_predictive_rendering = options.intelligent_predictive_rendering || ipr;
        this.ping_interval_time = options.ping_interval_time || 1000;
        this._send_ping();
        if(this._intelligent_predictive_rendering){
            (() => {
                let last_time = Date.now();
                setInterval(() => {
                    let now = Date.now();
                    this._update_clocks(now - last_time);
                    last_time = now;
                })
            })()
        }
    }
    //hooks
    on_connect = () => {};
    on_auth = () => {};
    on_close = () => {};
    on_pong = () => {};
    //reducer hooks

    //remember to hook into the sync:time reducer to ajust for server ping

    reducers = {
        "sync:name": (name_state) => {},
        "sync:score": (score_state) => {},
        "sync:color": (color_state) => {},
        "sync:time": (time_state) => {},
        "sync:down": (down_state) => {},
        "sync:quarter": (quarter_state) => {},
        "sync:possession": (possession_state) => {},
        "sync:timeout": (timeout_state) => {},
        "sync:flag": (flag_state) => {},
        "sync:roster": (roster_state) => {},
        "event:team_score": (team_score_event) => {},

    }
    //action issuers
    actions = {
        "add:team_score": (team, amount, options = {}) => {
            const payload = { team, amount, ...options };
            this.send_action("add:team_score", payload)
            if(this._intelligent_predictive_rendering){
                this._predicted_state[team == "home" ? "team_home" : "team_away"].score += amount;
                this._predicted_state[team == "home" ? "team_home" : "team_away"].score = clamp(this._predicted_state[team == "home" ? "team_home" : "team_away"].score, 0, 9999);
                this.reducers["sync:score"]({
                    home_score: this._predicted_state.team_home.score,
                    away_score: this._predicted_state.team_away.score
                });
            }
        },
        "add:clock_time": (clock, amount) => {
            this.send_action("add:clock_time", { clock, amount })
            if(this._intelligent_predictive_rendering){
                //might be wrong maybe if by the time the request reaches the server the clock has ended
                //but in that case i dont think you can predict that
                //and it will have already triggered the server to stop the timer so
                //the sync form the server will correct this action 
                if(clock == "game"){
                    this._predicted_state.time.game_clock_current_time += amount;
                    this._predicted_state.time.game_clock_current_time = Math.max(this._predicted_state.time.game_clock_current_time, 0);
                } else if(clock == "play"){
                    this._predicted_state.time.play_clock_current_time += amount;
                    this._predicted_state.time.play_clock_current_time = Math.max(this._predicted_state.time.play_clock_current_time, 0);
                }
                this.reducers["sync:time"](this._predicted_state.time);
            }
        },
        "add:down": (amount) => {
            this.send_action("add:down", { amount })
            if(this._intelligent_predictive_rendering){
                this._predicted_state.down += amount;
                this._predicted_state.down = clamp(this._predicted_state.down, 1, 4);
                this.reducers["sync:down"]({ down: this._predicted_state.down, distance: this._predicted_state.distance });
            }
        },
        "add:distance": (amount) => {
            this.send_action("add:distance", { amount })
            if(this._intelligent_predictive_rendering){
                this._predicted_state.distance += amount;
                this._predicted_state.distance = clamp(this._predicted_state.distance, -1, Infinity);
                this.reducers["sync:down"]({ down: this._predicted_state.down, distance: this._predicted_state.distance });
            }
        },
        "add:quarter": (amount) => {
            this.send_action("add:quarter", { amount })
            if(this._intelligent_predictive_rendering){
                this._predicted_state.quarter += amount;
                this._predicted_state.quarter = clamp(this._predicted_state.quarter, 1, 4);
                this.reducers["sync:quarter"]({ quarter: this._predicted_state.quarter });
            }
        },
        "add:team_timeouts": (team, amount) => {
            this.send_action("add:team_timeouts", { team, amount })
            if(this._intelligent_predictive_rendering){
                this._predicted_state[team == "home" ? "team_home" : "team_away"].timeouts_remaining += amount;
                this._predicted_state[team == "home" ? "team_home" : "team_away"].timeouts_remaining = clamp(this._predicted_state[team == "home" ? "team_home" : "team_away"].timeouts_remaining, 0, 3);
                this.reducers["sync:timeouts"]({
                    home_timeouts: this._predicted_state.team_home.timeouts_remaining,
                    away_timeouts: this._predicted_state.team_away.timeouts_remaining
                });
            }
        },
        "set:team_score": (team, score) => {
            this.send_action("set:team_score", { team, score })
            if(this._intelligent_predictive_rendering){
                this._predicted_state[team == "home" ? "team_home" : "team_away"].score = score;
                this.reducers["sync:score"]({
                    home_score: this._predicted_state.team_home.score,
                    away_score: this._predicted_state.team_away.score
                });
            }
        },
        "set:team_name": (team, name) => {
            this.send_action("set:team_name", { team, name })
            if(this._intelligent_predictive_rendering){
                this._predicted_state[team == "home" ? "team_home" : "team_away"].name = name;
                this.reducers["sync:name"]({
                    home_name: this._predicted_state.team_home.name,
                    away_name: this._predicted_state.team_away.name
                });
            }
        },
        "set:team_color": (team, color) => {
            this.send_action("set:team_color", { team, color })
            if(this._intelligent_predictive_rendering){
                this._predicted_state[team == "home" ? "team_home" : "team_away"].color = color;
                this.reducers["sync:color"]({
                    home_color: this._predicted_state.team_home.color,
                    away_color: this._predicted_state.team_away.color
                });
            }
        },
        "set:clock_state": (clock, is_running) => {
            this.send_action("set:clock_state", { clock, is_running })
            if(this._intelligent_predictive_rendering){
                if(clock == "game"){
                    if(is_running == true){
                        //is going to start running
                        this._predicted_state.time.game_clock_current_time + this.ping
                        this._predicted_state.time.is_game_clock_running = true;
                        this.reducers["sync:time"](this._predicted_state.time);
                    } else if(is_running == false) {
                        //stoping the clock
                        this._predicted_state.time.game_clock_current_time - this.ping
                        this._predicted_state.time.is_game_clock_running = false;

                        //When switching to desycned game and play clocks please remove following 2 lines
                        this._predicted_state.time.play_clock_current_time - this.ping
                        this._predicted_state.time.is_play_clock_running = false;

                        this.reducers["sync:time"](this._predicted_state.time);
                    }
                }
                if(clock == "play"){
                    if(is_running == true){
                        //is going to start running
                        this._predicted_state.time.play_clock_current_time + this.ping
                        this._predicted_state.time.is_play_clock_running = true;
                        this.reducers["sync:time"](this._predicted_state.time);
                    } else if(is_running == false) {
                        //stoping the clock
                        this._predicted_state.time.play_clock_current_time - this.ping
                        this._predicted_state.time.is_play_clock_running = false;
                        this.reducers["sync:time"](this._predicted_state.time);
                    } 
                }
            }
        },
        "set:clock_time": (clock, time) => {
            this.send_action("set:clock_time", { clock, time })
            //i dont think there is any perdiction only on reciving
        },
        "set:down": (down) => {
            this.send_action("set:down", { down })
            if(this._intelligent_predictive_rendering){
                this._predicted_state.down = down;
                this.reducers["sync:down"]({ down: this._predicted_state.down });
            }
        },
        "set:distance": (distance) => {
            this.send_action("set:distance", { distance })
            if(this._intelligent_predictive_rendering){
                this._predicted_state.distance = distance;
                this.reducers["sync:down"]({ distance: this._predicted_state.distance });
            }
        },
        "set:quarter": (quarter) => {
            this.send_action("set:quarter", { quarter })
            if(this._intelligent_predictive_rendering){
                this._predicted_state.quarter = quarter;
                this.reducers["sync:quarter"]({ quarter: this._predicted_state.quarter });
            }
        },
        "set:possession": (team) => {
            this.send_action("set:possession", { team })
            if(this._intelligent_predictive_rendering){
                this._predicted_state.possession = team;
                this.reducers["sync:possession"]({ possession: this._predicted_state.possession });
            }
        },
        "set:team_timeouts": (team, timeouts) => {
            this.send_action("set:team_timeouts", { team, timeouts })
            if(this._intelligent_predictive_rendering){
                this._predicted_state[team == "home" ? "team_home" : "team_away"].timeouts_remaining = timeouts;
                this.reducers["sync:timeouts"]({ timeouts: this._predicted_state[team == "home" ? "team_home" : "team_away"].timeouts_remaining });
            }
        },
        "set:flag": (flag_state) => {
            this.send_action("set:flag", flag_state)
            if(this._intelligent_predictive_rendering){
                this._predicted_state.flag = flag_state;
                this.reducers["sync:flag"](this._predicted_state.flag);
            }
        }
    }

    //funcs


    clear_auto_reconnect_interval = () => {
        if(this.auto_reconnect_interval) {
            clearTimeout(this.auto_reconnect_interval)
            this.auto_reconnect_interval = undefined;
        }
    }

    set_auto_reconnect_interval = () => {
        this.clear_auto_reconnect_interval();
        if(!this.has_successfully_authenticated_before){
            if(this.role == "admin"){ return; }
            if(this.role == "scoreboard"){ console.warn("Server Failed to Authenticate, auto reconnect has been premited to continue under scoreboard role."); }
        }
        this.auto_reconnect_interval = setInterval(() => {
            this.connect()
        }, this.reconnect_interval_time)
    }

    send_data = (data) => {
        
        return this.ws.send(JSON.stringify(data,null,4));
    }
    send_action = (action_type, payload) => {
        if(!this.is_authenticated){ console.log("Not authenticated, cannot send action"); return; }
        this.send_data({type: action_type, payload: payload, timings: {client_send_time:Date.now()}});
    }

    _send_auth = () => {
        if(this.role == "admin"){
            this.send_data({
                type:"auth:admin",
                payload:{
                    password: this.password
                }
            })
        }
        if(this.role == "scoreboard"){
            this.send_data({
                type:"auth:scoreboard",
                payload:{}
            })
        }
    }

    _handle_auth_message = (action) => {
        if(action.type == "auth:success"){
            this.is_authenticated = true;
            this.has_successfully_authenticated_before = true;
            this.role = action.payload.role;
            this.send_action("request:sync",{})
            this._send_ping(true)
            this.on_auth();
        }
    }
    _send_ping = (cancel_timeout = false) => {
        if(this.is_connected && this.is_authenticated){
            this.send_action("ping", {});
        }
        if(!cancel_timeout){
            setTimeout(() => { this._send_ping() }, this.ping_interval_time);

        }
    }


    connect = () => {
        if(this.is_connected){ return; }
        this.ws = new WebSocket(`ws://${window.location.host}/${this.role}_ws`);
        this.ws.onopen = this._on_open
        this.ws.onmessage = this._on_message
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        this.ws.onclose = this._on_close;
    }

    _on_open = () => {
        this.is_connected = true;
        this._send_auth();
        this.on_connect();
    }

    _on_message = (event) => {
        try {
            let action = JSON.parse(event.data)

            if(!this.is_authenticated){
                this._handle_auth_message(action);
                return;
            }
            if (!action.timings) action.timings = {};
            action.timings.client_receive_time = Date.now();
            this._handle_reducer_message(action);
        } catch (error) {
            console.log("Error On Message:")
            console.log(error)
            console.log("Message:")
            console.log(event.data.toString())
        }
    }
    _on_close = (event) => {
        this.is_connected = false;
        this.is_authenticated = false;
        this.set_auto_reconnect_interval();
        this.on_close();
    }
    _handle_reducer_message = (action) => {
        if(action.type == "pong"){
            this._handle_pong_response(action);
            return;
        }


        if(action.type == "sync"){
            this._sync_breakdown_reducer(action);
        } else if(this.reducers[action.type]){
            this.reducers[action.type](action.payload);
        }
        if(this._intelligent_predictive_rendering){
            this._predicted_state_reducer(action)
        }
    }

    _predicted_state_reducer = (action) => {
        let payload = action.payload;
        switch (action.type) {
            case "sync":
                this._predicted_state = payload
                this._predict_time_state({...action, payload: payload.time});
                break;
            case "sync:score":
                this._predicted_state.team_home.score = payload.home_score;
                this._predicted_state.team_away.score = payload.away_score;
                break;
            case "sync:name":
                this._predicted_state.team_home.name = payload.home_name;
                this._predicted_state.team_away.name = payload.away_name;
                break;
            case "sync:color":
                this._predicted_state.team_home.color = payload.home_color;
                this._predicted_state.team_away.color = payload.away_color;
                break;
            case "sync:time":
                this._predict_time_state(action);
                
                break;
            case "sync:down":
                this._predicted_state.down = payload.down;
                this._predicted_state.distance = payload.distance;
                break;
            case "sync:quarter":
                this._predicted_state.quarter = payload.quarter;
                break;
            case "sync:possession":
                this._predicted_state.possession = payload.possession;
                break;
            case "sync:timeout":
                this._predicted_state.team_home.timeouts = payload.home_timeouts;
                this._predicted_state.team_away.timeouts = payload.away_timeouts;
                break;
            case "sync:flag":
                this._predicted_state.flag = payload;
                break;
            case "sync:roster":
                this._predicted_state.team_home.roster = payload.home_roster;
                this._predicted_state.team_away.roster = payload.away_roster;
                break;
            default:
                break;
        }
    }
    _predict_time_state = (action) => {
        if(!this.server_time_sync_found){ this._predict_time_state.time = action.payload;console.log("Can not predict time state, because sync not found"); return; }
        let payload = action.payload
        
        let timestamp = action.timings.server_send_time - this.server_time_offset
        let time_sense_send = Date.now() - timestamp;
        if(payload.is_game_clock_running){
            console.log("Predicting Game Clock Running Delta:" + (this._predicted_state.time.game_clock_current_time - (payload.game_clock_current_time - time_sense_send)) + "ms")

            this._predicted_state.time.game_clock_current_time = payload.game_clock_current_time - time_sense_send
            
        } else {
            console.log("Predicting Game Clock Stopped Delta:" + (this._predicted_state.time.game_clock_current_time - payload.game_clock_current_time) + "ms")
            this._predicted_state.time.game_clock_current_time = payload.game_clock_current_time
        }
        if(payload.is_play_clock_running){
            this._predicted_state.time.play_clock_current_time = payload.play_clock_current_time - time_sense_send
        } else {
            this._predicted_state.time.play_clock_current_time = payload.play_clock_current_time
        }
        this._predicted_state.time.is_game_clock_running = payload.is_game_clock_running;
        this._predicted_state.time.is_play_clock_running = payload.is_play_clock_running;
        this.reducers["sync:time"](this._predicted_state.time);

    }
    //need to call ping -> i think i fixed this
    _handle_pong_response = (action) => {
        let timings = action.timings;
        this.ping = (timings.client_receive_time - timings.client_send_time)/2;
        this.server_time_offset = timings.server_send_time + this.ping - timings.client_receive_time;

        // Add samples for averaging
        this.ping_samples.push(this.ping);
        this.server_time_offset_samples.push(this.server_time_offset);

        // Keep only the last N samples
        if (this.ping_samples.length > this.samples_count) {
            this.ping_samples.shift();
        }
        if (this.server_time_offset_samples.length > this.samples_count) {
            this.server_time_offset_samples.shift();
        }

        // Calculate averages
        const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
        this.ping = avg(this.ping_samples);
        this.server_time_offset = avg(this.server_time_offset_samples);
        this.server_time_sync_found = true;
        this.on_pong();
    }
    _sync_breakdown_reducer = (action) => {
        let state = action.payload
        this.reducers["sync:name"]({
            home_name: state.team_home.name,
            away_name: state.team_away.name
        });
        this.reducers["sync:color"]({
            home_color: state.team_home.color,
            away_color: state.team_away.color
        });
        this.reducers["sync:score"]({
            home_score: state.team_home.score,
            away_score: state.team_away.score
        });
        if(this._intelligent_predictive_rendering && this.server_time_sync_found){
            this._predicted_state_reducer({timestamp:action.timestamp,payload:state.time})
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
        this.reducers["sync:timeout"]({
            home_timeouts: state.team_home.timeouts_remaining,
            away_timeouts: state.team_away.timeouts_remaining
        });
        this.reducers["sync:flag"]({
            is_flag_emitted: state.flag.is_flag_emitted,
            team: state.flag.team,
            status: state.flag.status,
            player_blame: state.flag.player_blame
        });
        this.reducers["sync:roster"]({
            home_roster: state.team_home.roster,
            away_roster: state.team_away.roster
        });
    }

    //handle clock tick
    _update_clocks = (delta_time) => {
        if(this._predicted_state.time.is_game_clock_running){
            this._predicted_state.time.game_clock_current_time =
                Math.max(this._predicted_state.time.game_clock_current_time - delta_time, 0);
            if(this._predicted_state.time.game_clock_current_time == 0){
                this._predicted_state.time.is_game_clock_running = false;
                this.reducers["sync:time"](this._predicted_state.time)
            }
        }
        if(this._predicted_state.time.is_play_clock_running && this._predicted_state.time.is_game_clock_running){//please remove later for update
            this._predicted_state.time.play_clock_current_time =
                Math.max(this._predicted_state.time.play_clock_current_time - delta_time, 0);
            if(this._predicted_state.time.play_clock_current_time == 0){
                this._predicted_state.time.is_play_clock_running = false;
                this.reducers["sync:time"](this._predicted_state.time)
            }
        }
    }
}