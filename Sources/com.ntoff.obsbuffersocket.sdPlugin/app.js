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
        //connectOBS() 
        
        /* connecting immediately seems to crash obs, not sure if it's trying to connect too soon after launching, or just because
        * "reasons" (custom built obs-websocket plugin with added functionality this plugin relies on).
        * For now all it does is show something in the console log.
        */
        
        console.log("OBS has been launched, praise the sun!")
    );
    //shared features
    $SD.on('com.ntoff.obsbuffersocket.toggle.keyDown', jsonObj =>
        sharedButtons.onKeyDown(jsonObj)
    );
    $SD.on('com.ntoff.obsbuffersocket.save.keyDown', jsonObj =>
        sharedButtons.onKeyDown(jsonObj)
    );
    //toggle buffer feature
    $SD.on('com.ntoff.obsbuffersocket.toggle.willAppear', jsonObj =>
        toggleBuffer.onToggleAppear(jsonObj)
    );
    $SD.on('com.ntoff.obsbuffersocket.toggle.keyUp', jsonObj =>
        toggleBuffer.onToggleKeyUp(jsonObj)
    );
    //save buffer feature
    $SD.on('com.ntoff.obsbuffersocket.save.willAppear', jsonObj =>
        saveBuffer.onSaveAppear(jsonObj)
    );
    $SD.on('com.ntoff.obsbuffersocket.save.keyUp', jsonObj =>
        saveBuffer.onSaveKeyUp(jsonObj)
    );
}

var sharedButtons = {
    //type: 'com.ntoff.obsbuffersocket.sharedButtons',
    cache: {},
    
    onKeyDown: function (jsn) {
        connectOBS();
    }
};

var toggleBuffer = {
    type: 'com.ntoff.obsbuffersocket.toggle',
    cache: {},

    onToggleAppear: function (jsn) {
        buttonHandler(jsn, "GetReplayBufferStatus");
    },

    onToggleKeyUp: function (jsn) {
        buttonHandler(jsn, "StartStopReplayBuffer");
    }
};

var saveBuffer = {
    type: 'com.ntoff.obsbuffersocket.save',
    cache: {},
    
    onSaveAppear: function (jsn) {
        buttonHandler(jsn, "GetReplayBufferStatus");
    },
    
    onSaveKeyUp: function (jsn) {
        buttonHandler(jsn, "SaveReplayBuffer");
    }

};

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
};

function buttonHandler(jsn, controlType) {
    var controlType = controlType;

    if (!obsWebsocket) {
        SDApi.send(jsn.context, 'showAlert', {});
        return;
    }

    try{
        obsWebsocket.send(JSON.stringify({"message-id": "2", "request-type": controlType}));
    }
    catch(error) {
        SDApi.send(jsn.context, 'showAlert', {});
    }

    obsWebsocket.onmessage = function (evt) { 

        var jsonObj = JSON.parse(evt.data),
            imageName = "",
            replayActive = "";
            var status = "";

        if (jsonObj.hasOwnProperty('replay-active') || jsonObj.hasOwnProperty('update-type')) {
            replayActive = jsonObj['replay-active'] || jsonObj['update-type'];
        }
        else if (jsonObj.hasOwnProperty('status')) {
            status = jsonObj['status'];
        }
        else {
            return;
        }
        
        if (status == "ok") {
            SDApi.send(jsn.context, 'showOk', {});
            return;
        }
        else if (status == "error") {
            SDApi.send(jsn.context, 'showAlert', {});
            console.log(JSON.parse(evt.data)); //spit out an error in the console
            return;
        }
        else if (replayActive == true || replayActive == "ReplayStarted") {
            imageName = "obsbufferon"
        }
        else if (replayActive == false || replayActive == "ReplayStopped") {
            imageName = "obsbuffer"
        }
        else {
            return;
        }

        loadImageAsDataUri(`${imageName}.png`, function (imgUrl) {

            SDApi.send(jsn.context, 'setImage', {
                payload: {
                    image: imgUrl || "",
                    target: DestinationEnum.HARDWARE_AND_SOFTWARE
                }
            });
        });
    };
};