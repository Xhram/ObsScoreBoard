let ws = undefined;
let isConnected = false;
let isAuthenticated = false;
function sel(value){
    return document.querySelector(value)
}
function connect() {

    ws = new WebSocket(`ws://${window.location.host}`);
    ws.sendData = (data) => {return ws.send(JSON.stringify(data,null,4))}
    ws.onopen = () => {
        console.log('WebSocket connection opened');
        isConnected = true;
        ws.sendData({
            type:"auth:admin",
            payload: {
                password: sel("#password").value
            }
        });
    };
    
    ws.onmessage = (event) => {
        console.log('Message from server:', event.data);
        try {
            let action = JSON.parse(event.data)
            if(isAuthenticated) {

            } else if(action.type == "auth:success"){
                isAuthenticated = true;
                sel("#auth").classList.toggle("hide")
                sel("#controls").classList.toggle("hide")
            }
        } catch (error) {
            console.log("Error On Message:")
            console.log(error)
            console.log("Message:")
            console.log(event.data.toString())
        }

    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
        console.log('WebSocket connection closed');
        isConnected = false;
        isAuthenticated = false;
    };
}
sel("#login").addEventListener("click",connect);