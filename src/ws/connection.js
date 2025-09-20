import { ADMIN_PASSWORD, ARTIFICIAL_NETWORK_DELAY, random_internet_delay } from "../config/index.js";


export class Connection {
    webSocket = undefined;
    webSocketServerManager = undefined;
    auth;
    constructor(webSocket,webSocketServerManager){
        this.webSocket = webSocket
        this.webSocketServerManager = webSocketServerManager
        this.auth = {
            is_authenticated: false,
            role: "none", // can be admin or scoreboard
            noAuthAutoDisconnectTimer: null,
        }
        this.auth.noAuthAutoDisconnectTimer = setTimeout(() => {
            if (!this.auth.is_authenticated) {
                this._onAuthFail()
            }
        }, 10000);
        this.webSocket.on("message", this._onMessage)
        this.webSocket.on("close",this._onClose)
    }
    //hooks
    onAuth = (connection) => {}
    onAuthFail = (connection) => {}
    onMessage = (connection,action) => {}
    onDisconnect = (connection) => {}


    //public functions
    send_data = async (data) => {
        if(ARTIFICIAL_NETWORK_DELAY){
            await new Promise(resolve => setTimeout(resolve, random_internet_delay()));
        }
        this.webSocket.send(JSON.stringify(data,null,4))
    }
    sendAction = async (type, payload, actionInitiator) => {
        let data = {
            type,
            payload,
            timings:{
                ...actionInitiator.timings,
                server_send_time: Date.now()
            }
        }
        this.send_data(data);
    }

    //interal hooks
    _onMessage = async (data) => {
        try {
            let action = JSON.parse(data)
            if(!this.auth.is_authenticated){
                this._authenticate(action);
                return;
            }
            if(ARTIFICIAL_NETWORK_DELAY){
                await new Promise(resolve => setTimeout(resolve, random_internet_delay()));
            }
            this.onMessage(this, action);
        } catch (error) {
            console.error("Error handling incoming WebSocket message.");
            console.error("Raw message data:", data.toString());
            console.error("Error details:", error && error.stack ? error.stack : error);
        }
    }
    _onClose = async () => {
        this.on_disconnect(this)
    }
    //internal functions
    _onAuthFail = () => {
        this.webSocket.close(1008, "Authentication timeout");
        this.onAuthFail();
    }

    _authenticate = (action) => {
        if(action.type == "auth:admin"){
            if(action.payload.password === ADMIN_PASSWORD){
                this.auth.is_authenticated = true;
                this.auth.role = "admin";
                this.sendAction("auth:success", {role: "admin"}, action);
                this.on_auth(this);
            } else {
                this._onAuthFail();
                return;
            }
        }
        if(action.type == "auth:scoreboard"){
            this.auth.is_authenticated = true;
            this.auth.role = "scoreboard";
            this.sendAction("auth:success", {role: "scoreboard"}, action);
            this.on_auth(this);
        }
    }

}
