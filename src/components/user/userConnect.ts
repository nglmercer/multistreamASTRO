import { UserProfile } from './usercomponent.ts';
import {socket} from '../../utils/socketManager.ts';

function initListeners(){
    const allElements = document.querySelectorAll('user-profile');
    allElements.forEach((element) => {
        const existElement = element as UserProfile;
        if (!existElement)  return;
    existElement.addEventListener('userConnected', event => {
        const { detail } = event as CustomEvent;
        console.log('User connected:', detail);
        socket.emit('join-platform', { uniqueId: detail.username, platform:detail.state.platform });
    });
    existElement.addEventListener('userDisconnected', event => {
                const { detail } = event as CustomEvent;
        console.log('User disconnected:', detail);
    });
    existElement.addEventListener('connectionStatusChanged', event => {
                const { detail } = event as CustomEvent;
        console.log('Connection status changed:', detail);
    });
    });

}
document.addEventListener('DOMContentLoaded', () => {
    initListeners();
    const tiktok_Login = document.getElementById('tiktok_login') as UserProfile;
    const kick_Login = document.getElementById('kick_login') as UserProfile;
    if (tiktok_Login) {}
    if (kick_Login) {
        kick_Login.setPlatform('kick');
    }
    console.log({
        tiktok_Login,
        kick_Login
    })
});