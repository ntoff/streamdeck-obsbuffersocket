/* Wassup
This plugin here controls the obs studio replay buffer via the obs-websocket plugin.
Unfortunately it relies on a custom built version of said plugin, with added functionality for checking the status of the buffer.

"GetReplayBufferStatus" is necessary to determine whether the buffer is on or off when switching pages, unfortunately this request
doesn't exist in the vanilla obs-websockets.

Without this feature, when switching pages in this plugin, the replay buffer button will become de-synchronised from OBS's actual buffer status.

Some of this code was lifted from the Elgato analog clock example.
*/
var obsHost = "localhost"
    obsWebsocket = null,
    obsIsLaunched = 0,
    DestinationEnum = Object.freeze({
    HARDWARE_AND_SOFTWARE: 0,
    HARDWARE_ONLY: 1,
    SOFTWARE_ONLY: 2
    });

$SD.on('connected', conn => connected(conn));

function connected (jsn) {
    
    $SD.on('applicationDidLaunch', jsonObj =>
        this.obsLaunched(jsonObj)
    );
    $SD.on('applicationDidTerminate', jsonObj =>
        this.obsLaunched(jsonObj)
    );
    //toggle buffer feature
    $SD.on('com.obsbuffersocket.toggle.willAppear', jsonObj =>
        toggleBuffer.onToggleAppear(jsonObj)
    );
    $SD.on('com.obsbuffersocket.toggle.keyDown', jsonObj =>
        toggleBuffer.onToggleKeyDown(jsonObj)
    );
    $SD.on('com.obsbuffersocket.toggle.keyUp', jsonObj =>
        toggleBuffer.onToggleKeyUp(jsonObj)
    );
    $SD.on('com.obsbuffersocket.toggle.willDisappear', jsonObj =>
        toggleBuffer.onWillDisappear(jsonObj)
    );
    //save buffer feature
    $SD.on('com.obsbuffersocket.save.willAppear', jsonObj =>
        saveBuffer.onSaveAppear(jsonObj)
    );
    $SD.on('com.obsbuffersocket.save.keyDown', jsonObj =>
        saveBuffer.onSaveKeyDown(jsonObj)
    );
    $SD.on('com.obsbuffersocket.save.keyUp', jsonObj =>
        saveBuffer.onSaveKeyUp(jsonObj)
    );
    $SD.on('com.obsbuffersocket.save.willDisappear', jsonObj =>
        saveBuffer.onWillDisappear(jsonObj)
    );
}

var toggleBuffer = {
    type: 'com.obsbuffersocket.toggle',
    cache: {},
    getContextFromCache: function (ctx) {
        return this.cache[ctx];
    },
    onToggleAppear: function (toggleJson) {
        if (!obsWebsocket) {
            SDApi.send(toggleJson.context, 'showAlert', {});
            return;
        }
        else {
            getReplayStatus(toggleJson);
        }
    },
    onToggleKeyDown: function (toggleJson) {
        if (obsWebsocket) {
            if (toggleJson.payload.state == 1) {
                obsWebsocket.send(JSON.stringify({"message-id": "2", "request-type": "StopReplayBuffer"}));
            }
            else if (toggleJson.payload.state == 0) {
                obsWebsocket.send(JSON.stringify({"message-id": "2", "request-type": "StartReplayBuffer"}));
            }
            getReplayStatus(toggleJson); 
        }
        else { 
            SDApi.send(toggleJson.context, 'showAlert', {});
        }
    },
    onToggleKeyUp: function (toggleJson) {
        getReplayStatus(toggleJson);
    },
    onWillDisappear: function (toggleJson) {
        let found = this.getContextFromCache(toggleJson.context);
        if (found) {
            delete this.cache[toggleJson.context];
        }
    },
};

var saveBuffer = {
    type: 'com.obsbuffersocket.save',
    cache: {},
    getContextFromCache: function (ctx) {
        return this.cache[ctx];
    },
    onSaveAppear: function (saveJson) {
        if (!obsWebsocket) {
            SDApi.send(saveJson.context, 'showAlert', {});
            return;
        }
    },
    onSaveKeyDown: function (saveJson) {
        if (obsIsLaunched) {
            connectOBS();
        }
        else {
            console.log("Can't connect, OBS doesn't appear to be running.");
        }
    },
    onSaveKeyUp: function (saveJson) {
        if (!obsWebsocket) {
            SDApi.send(saveJson.context, 'showAlert', {});
            return;
        }
        try{
            obsWebsocket.send(JSON.stringify({"message-id": "3", "request-type": "SaveReplayBuffer"}));

            obsWebsocket.onmessage = function (evt) { 
                var jsonObj = JSON.parse(evt.data);
                if (jsonObj.hasOwnProperty('status')) {
                    status = jsonObj['status'];
                    msgid = jsonObj['message-id'];
                    if (status == "ok" && msgid == "3") {
                        SDApi.send(saveJson.context, 'showOk', {});
                        return;
                    }
                    if (status == "error" && msgid == "3") {
                        SDApi.send(saveJson.context, 'showAlert', {});
                        console.log(jsonObj);
                        return;
                    }
                }
            }
        }
        catch(error) {
            SDApi.send(saveJson.context, 'showAlert', {});
        }
    },
    onWillDisappear: function (saveJson) {
        let found = this.getContextFromCache(saveJson.context);
        if (found) {
            delete this.cache[saveJson.context];
        }
    },
};

function getReplayStatus(toggleJson) {
    if (!obsWebsocket) {
        SDApi.send(toggleJson.context, 'setState', {
            payload: {
                "state": 0
            }
        });
        SDApi.send(toggleJson.context, 'showAlert', {});
        return;
    }
    try{
        obsWebsocket.send(JSON.stringify({"message-id": "2", "request-type": "GetReplayBufferStatus"}));
    }
    catch(error) {
    }
    
    obsWebsocket.onmessage = function (evt) { 
        var jsonObj = JSON.parse(evt.data);
        //console.log(jsonObj);
        if (jsonObj.hasOwnProperty('replay-active') || jsonObj.hasOwnProperty('update-type')) {
            replayActive = jsonObj['replay-active'] || false;
            updateType =  jsonObj['update-type'];
            if (replayActive == true || updateType == "ReplayStarted") {
                SDApi.send(toggleJson.context, 'setState', {
                    payload: {
                        "state": 1
                    }
                });
                return;
            }
            else if (!replayActive || replayActive == false || updateType == "ReplayStopped") {
                SDApi.send(toggleJson.context, 'setState', {
                    payload: {
                        "state": 0
                    }
                });
                return;
            }
        }
        else if (jsonObj.hasOwnProperty('status')) {
            status = jsonObj['status'];
            msgid = jsonObj['message-id'];
            if (status == "error" && msgid == "2") {
                SDApi.send(toggleJson.context, 'setState', {
                    payload: {
                        "state": 0
                    }
                });
                SDApi.send(toggleJson.context, 'showAlert', {});
                console.log(JSON.parse(evt.data)); //spit out the error in the console
                return;
            }
        }
    }
};

function connectOBS() {
    //if there's no connection, create one
    if (!obsWebsocket){
        try{
            obsWebsocket = new WebSocket("ws://"+obsHost+":4444");
        }
        catch(error){}
    }
    obsWebsocket.onopen = function() {
        obsWebsocket.send(JSON.stringify({"message-id": "1", "request-type": "GetAuthRequired"}));
        console.log("Socket Opened");
    };
    obsWebsocket.onerror = function(event) {
        console.log("Socket Error")
        obsWebsocket = null;
    }
    //in case we can't connect and the socket is closed
    obsWebsocket.onclose = function() { 
        console.log("Socket Closed")
        obsWebsocket = null; //nullify the socket if obs is closed
    };
};

//not currently used
function disconnectOBS() {
    obsWebsocket.onclose = function() { 
        obsWebsocket = null; //nullify the socket if obs is closed
    };
};

function obsLaunched(jsonObj){
    var event = jsonObj.event;
    if (event == "applicationDidLaunch") {
        console.log("OBS has been started");
        obsIsLaunched = 1;
    }
    else if (event == "applicationDidTerminate") {
        console.log("OBS has been terminated")
        obsIsLaunched = 0;
    }
};