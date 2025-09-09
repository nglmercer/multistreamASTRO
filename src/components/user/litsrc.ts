import { UserProfileComponent, UserConnectEvent } from "@litcomponents/user/userprofile.ts"
import { BrowserLogger, LogLevel } from '@utils/Logger';
import { socket } from '@utils/socketManager.ts';
import { onUserInteraction, hasUserInteracted } from "@utils/user/userInt"
// Uso básico

const logger = new BrowserLogger('userConnect')
   .setLevel(LogLevel.LOG);
const kiklogin = document.querySelector(".kicklogin") as UserProfileComponent;
const tiktoklogin = document.querySelector(".tiktoklogin") as UserProfileComponent;
let CompleteConnect = false as any;
async function initialize() {
    if (!kiklogin || !tiktoklogin) return;
    [kiklogin,tiktoklogin ].forEach(e =>{
        e.addEventListener('connect',(e)=>{
            const data = (e as UserConnectEvent).detail;
            socket.emit('join-platform', { uniqueId: data.username, platform: data.platform });
            console.log("data",data)
        })
        console.log("loginsState",e.getState())
        const loginData = e.getState()
        if (loginData && loginData.connected){
/*             window.showQueuedDialog({
                title: `Connect to ${loginData.platform}`,
                message: `Are you sure you want to connect as ${loginData.username}?`,
                rejectText: 'Cancel',
                acceptText: 'Connect',
                onClose: (result) => {
                  console.log('Dialog closed with result:', result);
                  if (result) {
                    // Aquí podrías llamar a connect() si es necesario
                    socket.emit('join-platform', { uniqueId: loginData.username, platform: loginData.platform });
                  } else {
                    e.disconnect();
                  }
                }
                
            })
            .then(result => {
              console.log('Dialog result:', result);
            })
            .catch(error => {
              console.error('Dialog error:', error);
            }); */
            
            const Joincallback = () => {
              console.log("callback EXECUTED")
              socket.emit('join-platform', { uniqueId: loginData.username, platform: loginData.platform });
              CompleteConnect = setInterval(()=>{
                if (CompleteConnect !== true){
                  socket.emit('join-platform', { uniqueId: loginData.username, platform: loginData.platform });
                  console.log("callback INTERVAL",CompleteConnect, typeof CompleteConnect)
                }
              },3000)
              
            }
            if (hasUserInteracted()){
              Joincallback()
            } else {
              onUserInteraction(Joincallback);
            }
          }
          socket.on('connected',(data)=>{
            console.log('CALLBACK connected')
            if (typeof CompleteConnect === 'function'){
              CompleteConnect();
            }
            CompleteConnect = true
          })
    })
}
document.addEventListener("DOMContentLoaded",async ()=>{
    initialize()
})