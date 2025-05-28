
console.log('UserProfile imported',customElements.get('user-profile'));
import {socket} from '../../utils/socketManager';

function initListeners(){
    const allElements = document.querySelectorAll('user-profile');
    allElements.forEach(element => {
    element.addEventListener('userConnected', event => {
        console.log('User connected:', event.detail);
        socket.emit('join-platform', { uniqueId: event.detail.username, platform:event.detail.state.platform });
    });
    element.addEventListener('userDisconnected', event => {
        console.log('User disconnected:', event.detail);
    });
    element.addEventListener('connectionStatusChanged', event => {
        console.log('Connection status changed:', event.detail);
    });
    });

}
document.addEventListener('DOMContentLoaded', () => {
    initListeners();
    const tiktok_Login = document.getElementById('tiktok_login');
    const kick_Login = document.getElementById('kick_login');
    if (tiktok_Login) {}
    if (kick_Login) {
        kick_Login.setPlatform('kick');
    }
    console.log({
        tiktok_Login,
        kick_Login
    })
});