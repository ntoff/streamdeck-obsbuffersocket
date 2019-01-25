#### OBS Replay Buffer Control (via obs-websocket)

Connects to obs via the obs-websockets plugin to show the status of the replay buffer, and allow starting / stopping / saving.

There is no binary release of this plugin for the reason(s) listed below under the warning / attention header.

#### Usage

The plugin may show a yellow alert triangle if it's not connected to OBS studio, the plugin does not automatically connect. To connect, just press either the replay toggle button or the replay save button and the plugin will attempt to connect to obs-studio via websockets. You may see a "new connection from....." notification from OBS studio itself (if enabled). For now, you can only control obs installed on the same machine, the host is hardwired to "localhost", though you could possibly change that in the code to control a remote obs instance.

Once connected, you should be able to press the toggle button to turn on / off the replay buffer. While on, the center of the toggle button will turn green to indicate it's recording.

The save replay button should show a check mark if no error is detected (although this is not a 100% indication of success, just that OBS didn't return an error), or a yellow alert triangle if the buffer couldn't be saved.

#### Warning / Attention

This plugin relies on a custom built version of obs-websockets that adds a new request for ```GetReplayBufferStatus``` and therefore will not work (properly) with the official release of the websockets plugin.

My own secret special sauce aadditions to obs-websockets can be found here: https://github.com/ntoff/obs-websocket if you would like to compile it yourself. I offer no technical support for this code, compile and use it at your own risk.