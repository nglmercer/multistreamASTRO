import { io } from 'socket.io-client';
import Emitter, { emitter } from './Emitter.js';
import logger from '../utils/logger.js';
const baseUrl = 'http://localhost:9001';
const wsBaseUrl = 'ws://localhost:21213/';
const socket = io(baseUrl);
const TiktokEmitter = new Emitter();
const ws = new WebSocket(wsBaseUrl);
console.log("event",'Socket Manager Loaded', baseUrl, socket);
socket.on('connect', () => {
    console.log("event",'Connected to server');
});
const tiktokLiveEvents = [
    'chat', 'gift', 'connected', 'disconnected',
    'websocketConnected', 'error', 'member', 'roomUser',
    'like', 'social', 'emote', 'envelope', 'questionNew',
    'subscribe', 'follow', 'share', 'streamEnd'
  ];
ws.onopen = () => {
    console.log("event",'WebSocket connected');
};
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  logger.log("event",'Received message from server:', data);
  tiktokhandlerdata(data.event, data.data);
};
tiktokLiveEvents.forEach(event => {
    socket.on(event, async (data) => {
    if (event === 'roomUser'){
        emitter.emit(event,data);
        localStorage.setItem('lastRoomUser',JSON.stringify(data));
    }
      tiktokhandlerdata(event,data)
 });
});
function tiktokhandlerdata(event,data){
    logger.log("event",event,data,'TiktokLive');
    TiktokEmitter.emit(event,data);
}
// temporal test joinRoom
socket.emit('joinRoom', { uniqueId: 'yayopio', platform: 'tiktok' });
export { Emitter, TiktokEmitter, socket };
export default socket;