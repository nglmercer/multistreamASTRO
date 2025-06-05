import { UserProfileComponent, UserConnectEvent } from "@litcomponents/user/userprofile.ts"
import { BrowserLogger, LogLevel } from '@utils/Logger';
import { socket } from '@utils/socketManager.ts';
const logger = new BrowserLogger('userConnect.tsx')
   .setLevel(LogLevel.LOG);
const kiklogin = document.querySelector(".kicklogin") as UserProfileComponent;
const tiktoklogin = document.querySelector(".tiktoklogin") as UserProfileComponent;
async function initialize() {
    if (!kiklogin || !tiktoklogin) return;
    [kiklogin,tiktoklogin ].forEach(e =>{
        e.addEventListener('connect',(e)=>{
            const data = (e as UserConnectEvent).detail;
            console.log("data",data)
            socket.emit('join-platform', { uniqueId: data.username, platform: data.platform });
        })
    })
}
document.addEventListener("DOMContentLoaded",async ()=>{
    initialize()
})