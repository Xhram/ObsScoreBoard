import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'Server is running' });
});
app.use('/scoreboard', express.static('./src/frontend/scoreboard'));
app.use('/admin', express.static('./src/frontend/admin'));

// WebSocket connection handling

let connections = [];


wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    ws.sendData = (data) => {return ws.send(JSON.stringify(data,null,4))}
    ws.auth = {
        isAuthenticated: false,
        noAuthAutoCloseTimer:undefined,
        role: "none",
    }

    console.log("Ws Open")
    let noAuthAutoCloseTimer = setTimeout(()=> {
        console.log("Client Failed to send auth in time")
        ws.close()
    }, 5000)

    ws.auth.noAuthAutoCloseTimer = noAuthAutoCloseTimer;



    ws.on('message', (data) => {
        try {
            
            let action = JSON.parse(data)
            
            if(ws.auth.isAuthenticated){
                
            } else {
                if(action.type == "auth:admin"){
                    if(action.payload.password == process.env.ADMIN_PASSWORD){
                        ws.auth.isAuthenticated = true
                        ws.auth.role = "admin"
                        ws.sendData({
                            type: "auth:success",
                            payload:{role:"admin"}
                        })
                        connections.push(ws)
                    } else {
                        ws.close()
                    }
                    clearTimeout(ws.auth.noAuthAutoCloseTimer)
                } else if(action.type == "auth:scoreboard"){
                    ws.auth.isAuthenticated = true
                    ws.auth.role = "scoreboard"
                    ws.sendData({
                        type: "auth:success",
                        payload:{role:"scoreboard"}
                    })
                    clearTimeout(ws.auth.noAuthAutoCloseTimer)

                }
            }
        } catch (error) {
            console.log("Error On Message:")
            console.log(error)
            console.log("Message:")
            console.log(data.toString())
            

        }

    });
    
    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});