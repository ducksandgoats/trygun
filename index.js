import Gun from 'gun/gun'
import 'gun/sea'
import 'gun/lib/radix'
import 'gun/lib/radisk'
import 'gun/lib/store'
import 'gun/lib/rindexed'
import Channel from 'trystereo'

function GunProxy(opts) {
    let urlProxy

    const channel = new Channel(opts.url, opts.hash, opts.max, opts.min, opts.trystereo)

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
        websocketproxy.send = channel.onSend;

        return websocketproxy
    }

    function attachGun(gun){
        channel.on('data', gun._.opt.peers[urlProxy].wire.onmessage)
    }

    // function shutdown(gun){
    //     channel.off('connect', connect)
    //     channel.off('data', gun._.opt.peers[urlProxy].wire.onmessage)
    //     channel.off('error', err)
    //     channel.off('disconnect', disconnect)
    //     var mesh = gun.back('opt.mesh'); // DAM
    //     var peers = gun.back('opt.peers');
    //     Object.keys(peers).forEach((id) => {mesh.bye(id)});
    //     channel.quit()
    // }

    return {WebSocketProxy, attachGun}
};

export default function(config){
    // instantiate module
    const {WebSocketProxy, attachGun} = GunProxy(config)
    // configure websocket
    // const proxyWebSocket = WebSocketProxy(config)
    // pass websocket as custom websocket to gun instance
    // make sure localStorage / indexedDB is on
    const gun = Gun({ ...config.gun, peers: ["proxy:websocket"], WebSocket: WebSocketProxy })
    setTimeout(() => {attachGun(gun)}, config.attach || 10000)
    return gun
}