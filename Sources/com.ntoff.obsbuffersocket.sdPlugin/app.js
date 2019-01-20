/* Wassup
This plugin here controls the obs studio replay buffer via the obs-websocket plugin.
Unfortunately it relies on a custom built version of said plugin, with added functionality for checking the status of the buffer.

"GetReplayBufferStatus" is necessary to determine whether the buffer is on or off when switching pages, unfortunately this request
doesn't exist in the vanilla obs-websockets.

Without this feature, when switching pages in this plugin, the replay buffer button will become de-synchronised from OBS's actual buffer status.

Some of this code was lifted from the Elgato analog clock example.
*/

var DestinationEnum = Object.freeze({
    HARDWARE_AND_SOFTWARE: 0,
    HARDWARE_ONLY: 1,
    SOFTWARE_ONLY: 2
});
$SD.on('connected', conn => connected(conn));

function connected (jsn) {
    debugLog('Connected Plugin:', jsn);
    $SD.on('applicationDidLaunch', jsonObj =>
        /* this seems to crash obs, not sure if it's trying to connect too soon after launching, or just because
        * "reasons" (custom built obs-websocket plugin with added functionality this plugin relies on).
        * For now all it does is show something in the console log.
        * I wouldn't worry too much about it, the buttons will first attempt to connect (on button down)
        * so if OBS is started after the deck software, it should still work... I hope.
        */
        //connectOBS() 
        console.log("OBS has been launched, praise the sun!")
    );
    //toggle buffer button
    $SD.on('com.ntoff.obsbuffersocket.toggle.willAppear', jsonObj =>
        toggleBuffer.onToggleAppear(jsonObj)
    );
    $SD.on('com.ntoff.obsbuffersocket.toggle.keyUp', jsonObj =>
        toggleBuffer.onToggleKeyUp(jsonObj)
    );
    $SD.on('com.ntoff.obsbuffersocket.toggle.keyDown', jsonObj =>
        toggleBuffer.onKeyDown(jsonObj)
    );
    $SD.on('com.ntoff.obsbuffersocket.toggle.sendToPlugin', jsonObj =>
        toggleBuffer.onSendToPlugin(jsonObj)
    );
    //save buffer button (lots of them are shared)
    $SD.on('com.ntoff.obsbuffersocket.save.willAppear', jsonObj =>
        saveBuffer.onSaveAppear(jsonObj)
    );
    $SD.on('com.ntoff.obsbuffersocket.save.keyUp', jsonObj =>
        saveBuffer.onSaveKeyUp(jsonObj)
    );
    $SD.on('com.ntoff.obsbuffersocket.save.keyDown', jsonObj =>
        toggleBuffer.onKeyDown(jsonObj)
    );
    $SD.on('com.ntoff.obsbuffersocket.save.sendToPlugin', jsonObj =>
        toggleBuffer.onSendToPlugin(jsonObj)
    );
}

var toggleBuffer = {
    type: 'com.ntoff.obsbuffersocket.toggle',
    cache: {},

    getContextFromCache: function (ctx) {
        return this.cache[ctx];
    },//getContextFromCache

    onToggleAppear: function (jsn) {
        try{
            obsWebsocket.send(JSON.stringify({"message-id": "2", "request-type": "GetReplayBufferStatus"}));
        }
        catch(error) {
            SDApi.send(jsn.context, 'showAlert', {});
        }
        if (!obsWebsocket){return;}
        //I <3 duplicated code, though technically it's not 100% the same, the property is different. Could be funcionationalizered.
        obsWebsocket.onmessage = function (evt) { 

            var jsonObj = JSON.parse(evt.data);

            if (jsonObj.hasOwnProperty('replay-active')) {
                var replayActive = jsonObj['replay-active'];
                var imageName = "";
                
                if (replayActive) {
                    imageName = "obsbufferon"
                }
                else if (!replayActive) {
                    imageName = "obsbuffer"
                }
                else { return; }
                
                loadImageAsDataUri(`${imageName}.png`, function (imgUrl) {
                    var json = {
                        "event": "setImage",
                        "context": jsn.context,
                        "payload": {
                            image: imgUrl || "",
                            target: DestinationEnum.HARDWARE_AND_SOFTWARE
                        }
                    };
                    SDApi.send(jsn.context, 'setImage', {
                        payload: {
                            image: imgUrl || "",
                            target: DestinationEnum.HARDWARE_AND_SOFTWARE
                        }
                    });
                });
            }
        };
    },//onWillAppear

    onToggleKeyUp: function (jsn) {
        try{
            obsWebsocket.send(JSON.stringify({"message-id": "2", "request-type": "StartStopReplayBuffer"})); 
        }
        catch(error) {
            SDApi.send(jsn.context, 'showAlert', {});
        }
        //this needs to be separated out to its own function
        obsWebsocket.onmessage = function (evt) { 

            var jsonObj = JSON.parse(evt.data);

            if (jsonObj.hasOwnProperty('update-type')) {
                var replayActive = jsonObj['update-type'];
                var imageName = "";
                
                if (replayActive == "ReplayStarted") {
                    imageName = "obsbufferon"
                }
                else if (replayActive == "ReplayStopped") {
                    imageName = "obsbuffer"
                }
                else { return; }
                
                loadImageAsDataUri(`${imageName}.png`, function (imgUrl) {
                    var json = {
                        "event": "setImage",
                        "context": jsn.context,
                        "payload": {
                            image: imgUrl || "",
                            target: DestinationEnum.HARDWARE_AND_SOFTWARE
                        }
                    };
                    SDApi.send(jsn.context, 'setImage', {
                        payload: {
                            image: imgUrl || "",
                            target: DestinationEnum.HARDWARE_AND_SOFTWARE
                        }
                    });
                });
            }
        };
    },//onKeyUp
    onSendToPlugin: function (jsn) {
        
    },//onSendToPlugin
    onKeyDown: function (jsn) {
        connectOBS();
    }
}; //toggleBuffer

var saveBuffer = {
    type: 'com.ntoff.obsbuffersocket.save',
    cache: {},
    onSaveAppear: function (jsn) {
        //for now we do nothing
    }, //onSaveAppear
    onSaveKeyUp: function (jsn) {
        try{
            obsWebsocket.send(JSON.stringify({"message-id": "2", "request-type": "SaveReplayBuffer"})); 
        }
        catch(error) {
            SDApi.send(jsn.context, 'showAlert', {});
        }
        
        obsWebsocket.onmessage = function (evt) { 

            var jsonObj = JSON.parse(evt.data);
            if (jsonObj.hasOwnProperty('status')) {
                var status = jsonObj['status'];
                if (status == "ok") {
                    SDApi.send(jsn.context, 'showOk', {});
                }
                else if (status == "error") {
                    SDApi.send(jsn.context, 'showAlert', {});
                }
            }
        }
    },//onKeyUp

}; //saveBuffer

function loadImageAsDataUri(url, callback) {
    var image = new Image();

    image.onload = function () {
        var canvas = document.createElement("canvas");

        canvas.width = this.naturalWidth;
        canvas.height = this.naturalHeight;

        var ctx = canvas.getContext("2d");
        ctx.drawImage(this, 0, 0);
        callback(canvas.toDataURL("image/png"));
    };

    image.src = url;
}; //loadImageAsDataUri