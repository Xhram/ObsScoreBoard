import { act } from "react";

class connection_management {
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

    intelligent_predictive_rendering = true;

    _predicted_state = {};


    constructor(role, reconnect_interval_time){
        this.role = role
        this.reconnect_interval_time = reconnect_interval_time || 2000
    }
    //hooks
    on_connect = () => {};
    on_auth = () => {};
    on_close = () => {};

    //reducer hooks
    reducers = {
        "sync": () => {},
        "sync:name": () => {},
        "sync:score": () => {},
        "sync:color": () => {},
        "sync:time": () => {},
        "sync:down": () => {},
        "sync:quarter": () => {},
        "sync:period": () => {},
        "sync:possession": () => {},
        "sync:timeout": () => {},
        "sync:flag": () => {},
    }
    //action issuers
    actions = {
        "add:team_score": (team, amount) => {
            this.send_action("add:team_score", { team, amount })
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
        if(!this.is_authenticated){ return; }
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
        this.ws = new WebSocket(`ws://${window.location.host}`);
        this.ws.onopen = this._on_open
        this.ws.onmessage = this._on_message
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
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
        if(this.reducers[action.type]){
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
                this._predicted_state.time = payload;
                break;
            
            default:
                break;
        }
    }
    _handle_pong_response = (payload) => {
        let current_time = Date.now();
        let sent_time = payload.ping_issuer_timestamp;
        let server_time = payload.timestamp;
        this.ping = current_time - sent_time;
        this.server_time_offset = server_time + (this.ping/2) - current_time;
        this.server_time_sync_found = true;
    }
    
}