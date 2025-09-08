import { ADMIN_PASSWORD, ARTIFICAL_NETWORK_DELAY, random_internet_delay } from "../config/index.js";


export class connection {
    ws = undefined;
    wm = undefined;
    auth;
    constructor(ws,wm){
        this.ws = ws
        this.wm = wm
        this.auth = {
            is_authenticated: false,
            role: "none", // can be admin or scoreboard
            no_auth_auto_disconnect_timer: null,
        }
        this.auth.no_auth_auto_disconnect_timer = setTimeout(() => {
            if (!this.auth.is_authenticated) {
                this._auth_fail()
            }
        }, 10000);
        this.ws.on("message", this._on_message)
        this.ws.on("close",this._on_close)
    }
    //hooks
    on_auth = (conn) => {}
    on_auth_fail = (conn) => {}
    on_message = (conn,action) => {}
    on_disconnect = (conn) => {}


    //public functions
    send_data = async (data) => {
        if(ARTIFICAL_NETWORK_DELAY){
            await new Promise(resolve => setTimeout(resolve, random_internet_delay()));
        }
        this.ws.send(JSON.stringify(data,null,4))
    }
    send_action = async (type, payload, action_initiator) => {
        let data = {
            type,
            payload,
            timings:{
                ...action_initiator.timings,
                server_send_time: Date.now()
            }
        }
        this.send_data(data);
    }

    //interal hooks
    _on_message = async (data) => {
        try {
            let action = JSON.parse(data)
            if(!this.auth.is_authenticated){
                this._authenticate(action);
                return;
            }
            if(ARTIFICAL_NETWORK_DELAY){
                await new Promise(resolve => setTimeout(resolve, random_internet_delay()));
            }
            this.on_message(this, action);
        } catch (error) {
            console.error("Error handling incoming WebSocket message.");
            console.error("Raw message data:", data.toString());
            console.error("Error details:", error && error.stack ? error.stack : error);
        }
    }
    _on_close = async () => {
        this.on_disconnect(this)
    }
    //internal functions
    _auth_fail = () => {
        this.ws.close(1008, "Authentication timeout");
        this.on_auth_fail();
    }

    _authenticate = (action) => {
        if(action.type == "auth:admin"){
            if(action.payload.password === ADMIN_PASSWORD){
                this.auth.is_authenticated = true;
                this.auth.role = "admin";
                this.send_action("auth:success", {role: "admin"}, action);
                this.on_auth(this);
            } else {
                this._auth_fail();
                return;
            }
        }
        if(action.type == "auth:scoreboard"){
            this.auth.is_authenticated = true;
            this.auth.role = "scoreboard";
            this.send_action("auth:success", {role: "scoreboard"}, action);
            this.on_auth(this);
        }
    }

}
