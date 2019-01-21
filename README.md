#### OBS Replay Buffer Control (via obs-websocket)

Connects to obs via the obs-websockets plugin to show the status of the replay buffer, and allow starting / stopping / saving.

There is no binary release of this plugin for the reason(s) listed below under the warning / attention header.

#### Warning / Attention

This plugin relies on a custom built version of obs-websockets that adds a new request for ```GetReplayBufferStatus``` and therefore will not work (properly) with the official release of the websockets plugin.

My own secret special sauce aadditions to obs-websockets can be found here: https://github.com/ntoff/obs-websocket if you would like to compile it yourself. I offer no technical support for this code, compile and use it at your own risk.