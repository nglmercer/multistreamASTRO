import socket from '/src/socket/socketmanager.js';
const allElements = document.querySelectorAll('user-profile');
allElements.forEach(element => {
    element.addEventListener('userConnected', event => {
        console.log('User connected:', event.detail);
        socket.emit('joinRoom', { uniqueId: event.detail.username, platform:event.detail.state.platform });
    });
    element.addEventListener('userDisconnected', event => {
        console.log('User disconnected:', event.detail);
    });
    element.addEventListener('connectionStatusChanged', event => {
        console.log('Connection status changed:', event.detail);
    });
});