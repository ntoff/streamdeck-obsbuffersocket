var uuid,
    actionInfo,
    ctx,
    lang;
$SD.on('connected', (jsonObj) => connected(jsonObj));
$SD.on('sendToPropertyInspector', (jsonObj) => receivedDataFromPlugin(jsonObj));
function connected(jsonObj) {
    uuid = jsonObj.uuid;
    actionInfo = jsonObj.actionInfo.action;
    ctx = jsonObj.actionInfo.context;
    var payload = {
        'DATAREQUEST': true
    };
    $SD.api.sendToPlugin(uuid, actionInfo, payload);
};
function receivedDataFromPlugin(jsonObj) {
    if (jsonObj && jsonObj.payload) {
        if (jsonObj.payload.hasOwnProperty('obs_host')) {
            const oobsHost = document.querySelector(".obsHost");
            oobsHost.value = jsonObj.payload['obs_host'];
        }
    }
};
function sendValueToPlugin(value, param) {
    if ($SD && $SD.connection) {
        var payload = {};
        if (param) {
            payload[param] = value;
        }
        $SD.api.sendToPlugin(uuid, actionInfo, payload);
        console.log("SENDING VALUE TO PLUGIN: ", uuid, actionInfo, payload);
    }
};