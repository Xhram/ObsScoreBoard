
class connection_manager {
    is_connected = false;
    is_authenticated = false;
    ws = undefined;
    auto_reconnect_interval = undefined;
    role = "none";
    password = "";
    has_successfully_authenticated_before = false;
    server_time_sync_found = true;
    server_time_offset = 0;
    ping = 0;
    reconnect_interval_time = 2000;

    intelligent_predictive_rendering = false;
    //this allows the client to perdict the servers response optmisticly and with greater accercy event at large ping values
    //it fakes imideate sync events from the server and uses its knowlage of the network's speed to predict desync between time of server and client
    

    _predicted_state = {
        team_home: {
            name: "Palatine",
            initals: "PHS",
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
            initals: "AT",
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
        this.role = options.role || "none";
        this.reconnect_interval_time = options.reconnect_interval_time || 2000;
        this.password = options.password || "";
        this.intelligent_predictive_rendering = options.intelligent_predictive_rendering || false;
    }
    //hooks
    on_connect = () => {};
    on_auth = () => {};
    on_close = () => {};

    //reducer hooks
    reducers = {
        "sync:name": () => {},
        "sync:score": () => {},
        "sync:color": () => {},
        "sync:time": () => {},
        "sync:down": () => {},
        "sync:quarter": () => {},
        "sync:possession": () => {},
        "sync:timeout": () => {},
        "sync:flag": () => {},
        "event:team_score": () => {},
    }
    //action issuers
    actions = {
        "add:team_score": (team, amount, options = {}) => {
            const payload = { team, amount, ...options };
            this.send_action("add:team_score", payload)
        },
        "add:clock_time": (clock, amount) => {
            this.send_action("add:clock_time", { clock, amount })
        },
        "add:down": (amount) => {
            this.send_action("add:down", { amount })
        },
        "add:distance": (amount) => {
            this.send_action("add:distance", { amount })
        },
        "add:quarter": (amount) => {
            this.send_action("add:quarter", { amount })
        },
        "add:team_timeout": (team, amount) => {
            this.send_action("add:team_timeout", { team, amount })
        },
        "add:team_timeouts": (team, amount) => {
            this.send_action("add:team_timeouts", { team, amount })
        },
        "set:team_score": (team, score) => {
            this.send_action("set:team_score", { team, score })
        },
        "set:team_name": (team, name) => {
            this.send_action("set:team_name", { team, name })
        },
        "set:team_color": (team, color) => {
            this.send_action("set:team_color", { team, color })
        },
        "set:clock_state": (clock, new_state) => {
            this.send_action("set:clock_state", { clock, new_state })
        },
        "set:clock_time": (clock, time) => {
            this.send_action("set:clock_time", { clock, time })
        },
        "set:down": (down) => {
            this.send_action("set:down", { down })
        },
        "set:distance": (distance) => {
            this.send_action("set:distance", { distance })
        },
        "set:quarter": (quarter) => {
            this.send_action("set:quarter", { quarter })
        },
        "set:possession": (team) => {
            this.send_action("set:possession", { team })
        },
        "set:team_timeouts": (team, timeouts) => {
            this.send_action("set:team_timeouts", { team, timeouts })
        },
        "set:flag": (flag_state) => {
            this.send_action("set:flag", flag_state)
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
        this.send_data({type: action_type, payload: payload});
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
            this.on_auth();
        }
    }

    connect = () => {
        if(this.is_connected){ return; }
        this.ws = new WebSocket(`ws://${window.location.host}`);
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
            this._handle_pong_response(action.payload);
            return;
        }
        if(action.type == "sync"){
            this._sync_breakdown_reducer(action.payload);
        } else if(this.reducers[action.type]){
            this.reducers[action.type](action.payload);
        }
        if(intelligent_predictive_rendering){
            _predicted_state_reducer(action)
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
            default:
                break;
        }
    }
    _predict_time_state = (action) => {
        if(!this.server_time_sync_found){ this._predict_time_state.time = action.payload;console.log("Can not predict time state, because sync not found"); return; }
        let payload = action.payload
        let now = Date.now();
        let timestamp = action.timestamp - this.server_time_offset
        let time_sense_send = now - timestamp;
        if(payload.is_game_clock_running){
            this._predicted_state.time.game_clock_current_time = payload.game_clock_current_time - time_sense_send
        } else {
            this._predicted_state.time.game_clock_current_time = payload.game_clock_current_time
        }
        if(payload.is_play_clock_running){
            this._predicted_state.time.play_clock_current_time = payload.play_clock_current_time - time_sense_send
        } else {
            this._predicted_state.time.play_clock_current_time = payload.play_clock_current_time
        }

    }
    //need to call ping
    _handle_pong_response = (payload) => {
        let current_time = Date.now();
        let sent_time = payload.ping_issuer_timestamp;
        let server_time = payload.timestamp;
        this.ping = (current_time - sent_time)/2;
        this.server_time_offset = server_time + this.ping - current_time;
        this.server_time_sync_found = true;
    }
    _sync_breakdown_reducer = (state) => {
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
        this.reducers["sync:time"](state.time);
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
    }
}