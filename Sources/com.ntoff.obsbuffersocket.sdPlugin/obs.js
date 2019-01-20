//obs socket
//clearly I have no clue what I'm doing....
var obsWebsocket = null;

function connectOBS() {
    //if there's no connection, create one
    if (!obsWebsocket){
        obsWebsocket = new WebSocket("ws://localhost:4444");
    }
    obsWebsocket.onopen = function() {
        obsWebsocket.send(JSON.stringify({"message-id": "1", "request-type": "GetAuthRequired"}));
    };
    //in case we can't connect and the socket is closed
    obsWebsocket.onclose = function() { 
        obsWebsocket = null; //nullify the socket if obs is closed
    };
};

function disconnectOBS() {
    obsWebsocket.onclose = function() { 
        obsWebsocket = null; //nullify the socket if obs is closed
    };
};