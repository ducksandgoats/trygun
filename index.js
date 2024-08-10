import Gun from 'gun/gun'
import 'gun/sea'
import 'gun/lib/radix'
import 'gun/lib/radisk'
import 'gun/lib/store'
import 'gun/lib/rindexed'
import Channel from 'trystereo'

function GunProxy(opts) {
    const debug = opts.debug
    let urlProxy

    const channel = new Channel(opts.url, opts.hash, opts.trystereo)

    const connect = (chan) => {console.log('connected: ' + chan.id)}
    const err = (e) => {console.error(e)}
    const disconnect = (chan) => {console.log('disconnected: ' + chan.id)}
    channel.on('connect', connect)
    channel.on('error', err)
    channel.on('disconnect', disconnect)

    // WebSocketProxy definition

    const WebSocketProxy = function (url) {
        const websocketproxy = {};

        websocketproxy.url = url || 'ws:proxy';
        urlProxy = url || 'ws:proxy';
        websocketproxy.CONNECTING = 0;
        websocketproxy.OPEN = 1;
        websocketproxy.CLOSING = 2;
        websocketproxy.CLOSED = 3;
        websocketproxy.readyState = 1;
        websocketproxy.bufferedAmount = 0;
        websocketproxy.onopen = function () { };
        websocketproxy.onerror = function () { };
        websocketproxy.onclose = function () { };
        websocketproxy.extensions = '';
        websocketproxy.protocol = '';
        websocketproxy.close = { code: '4', reason: 'Closed' };
        websocketproxy.onmessage = function () { }; //overwritten by gun
        websocketproxy.binaryType = 'blob';
        websocketproxy.send = sendMessage;

        return websocketproxy
    }

    let gunMessage

    function attachGun(gun){
        setTimeout(() => {
            if(urlProxy){
                if(debug){
                    console.log('proxy', urlProxy)
                }
                gunMessage = gun._.opt.peers[urlProxy].wire.onmessage
                channel.on('data', onMessage)
                gun.shutdown = shutdown(gun)
                gun.status = true
            } else {
                setTimeout(() => {attachGun(gun)}, 5000)
            }
        }, 5000)
    }

    function sendMessage(data){
        if(debug){
            console.log('Sending Data: ', typeof(data), data)
        }
        channel.onSend(data)
    }

    function onMessage(data){
        if(debug){
            console.log('Received Message: ', typeof(data), data)
        }
        gunMessage(data)
    }

    function shutdown(gun){
        return function(){
            channel.off('connect', connect)
            channel.off('data', onMessage)
            channel.off('error', err)
            channel.off('disconnect', disconnect)
            var mesh = gun.back('opt.mesh'); // DAM
            var peers = gun.back('opt.peers');
            Object.keys(peers).forEach((id) => {mesh.bye(id)});
            gun.status = false
            channel.quit()
        }
    }

    return {WebSocketProxy, attachGun, shutdown}
};

export default function(config){
    // instantiate module
    const {WebSocketProxy, attachGun} = GunProxy(config)
    // configure websocket
    // const proxyWebSocket = WebSocketProxy(config)
    // pass websocket as custom websocket to gun instance
    // make sure localStorage / indexedDB is on
    const gun = Gun({ ...config.gun, peers: ["proxy:websocket"], WebSocket: WebSocketProxy })
    attachGun(gun)
    return gun
}