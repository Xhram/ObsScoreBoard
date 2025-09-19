import { WebSocketServer } from "ws";
import { handle_message } from "./handlers.js";
import { state_manager } from "../utils/state_manager.js";
import { connection } from "./connection.js";
import { json } from "express";

export class wss_manager {
    connections = [];
    wss;
    server;
    sm;

    get scoreboard() {
        return this.sm.scoreboard;
    }
    constructor(options = {}) {
        if (!options.server) {
            throw new Error("Server option is required");
        }
        this.server = options.server;
        this.sm = options.state_manager || new state_manager();
        this.wss = new WebSocketServer({ server: this.server });
        this.wss.on("connection", this._on_connection);
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
    _on_connection = (ws) => {
        let conn = new connection(ws, this)
        conn.on_auth = () => {
            this.connections.push(conn);
        }
        conn.on_disconnect = () => {
            let index = this.connections.indexOf(conn);
            if (index > -1) {
                this.connections.splice(index, 1);
            }
        }
        conn.on_message = this._on_message;
    }

    _on_message = async (conn, action) => {
        try {
            handle_message(this, conn, action);
        } catch (error) {
            console.log("message error")
            console.log("message:" + JSON.stringify(action,null,4))
            console.log("error:" + error)
        }
    }
    _on_close = async (conn) => {

    }


}

