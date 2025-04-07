import { io } from 'socket.io-client';
import Emitter from './Emitter.js';
const baseUrl = 'http://localhost:9001';
const socket = io(baseUrl);
const TiktokEmitter = new Emitter();
console.log('Socket Manager Loaded', baseUrl, socket);
socket.on('connect', () => {
    console.log('Connected to server');
});
const tiktokLiveEvents = [
    'chat', 'gift', 'connected', 'disconnected',
    'websocketConnected', 'error', 'member', 'roomUser',
    'like', 'social', 'emote', 'envelope', 'questionNew',
    'subscribe', 'follow', 'share', 'streamEnd'
  ];
tiktokLiveEvents.forEach(event => {
    socket.on(event, async (data) => {
      tiktokhandlerdata(event,data)
 });
});
function tiktokhandlerdata(event,data){
    console.log(event,data,'TiktokLive');
    TiktokEmitter.emit(event,data);
}
// temporal test joinRoom
socket.emit('joinRoom', { uniqueId: 'foxsabe1', platform: 'tiktok' });
export { Emitter, TiktokEmitter, socket };
export default socket;