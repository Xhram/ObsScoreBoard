import { WebSocketServer } from "ws";
import { handleMessage } from "./handlers.js";
import { StateManager } from "../utils/state_manager.js";
import { Connection } from "./connection.js";
import { json } from "express";

export class WebSocketServerManager {
    connections = [];
    webSocketServer;
    server;
    stateManager;

    get scoreboard() {
        return this.stateManager.scoreboard;
    }
    constructor(options = {}) {
        if (!options.server) {
            throw new Error("Server option is required");
        }
        this.server = options.server;
        this.stateManager = options.stateManager || new StateManager();
        this.webSocketServer = new WebSocketServer({ server: this.server });
        this.webSocketServer.on("connection", this._on_connection);
    }
    
    //public functions
    broadcast_action = async (type, payload, action_initiator) => {
        this.connections.forEach((conn) => {
            conn.send_action(type, payload, action_initiator);
        })
    }
    send_action = async (conn, type, payload, action_initiator) => {
        return conn.send_action(type, payload, action_initiator)
    }

    //internal hooks
    _on_connection = (webSocket) => {
        let connection = new Connection(webSocket, this)
        connection.on_auth = () => {
            this.connections.push(connection);
        }
        connection.on_disconnect = () => {
            let index = this.connections.indexOf(connection);
            if (index > -1) {
                this.connections.splice(index, 1);
            }
        }
        connection.on_message = this._on_message;
    }

    _on_message = async (conn, action) => {
        try {
            handleMessage(this, conn, action);
        } catch (error) {
            console.log("message error")
            console.log("message:" + JSON.stringify(action,null,4))
            console.log("error:" + error)
        }
    }
    _on_close = async (conn) => {

    }


}

