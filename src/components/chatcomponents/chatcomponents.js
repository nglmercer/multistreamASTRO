/**
 * 
 * [
  {
    "type": "image",
    "badgeSceneType": 6,
    "displayType": 1,
    "url": "https://p19-webcast.tiktokcdn.com/webcast-sg/new_top_gifter_version_2.png~tplv-obj.image"
  },
  {
    "type": "privilege",
    "privilegeId": "7138381176787539748",
    "level": 7,
    "badgeSceneType": 8
  },
  {
    "type": "privilege",
    "privilegeId": "7196929090442513157",
    "level": 1,
    "badgeSceneType": 10
  }
]
 */
import { webcomponentevent, appendMessage, handlechat, handlegift, mapEvent, arrayevents,lastElement,handlekickChat } from 'src/utils/chat.js';

import { TiktokEmitter, socket, KickEmitter,socketManager  } from 'src/utils/socketManager';
import { openPopup, returnexploreroptions, setPopupOptions,returnOptions } from 'src/components/menu/menuutils.js';
import {
    playTextwithproviderInfo
} from 'src/components/voicecomponents/initconfig.js';	
import { MessageContainer } from './messagecomponent.ts';
import { downloadJSON } from '@utils/idb';
//const TiktokEvents = localStorage.getItem('TiktokEvents') ? JSON.parse(localStorage.getItem('TiktokEvents')) : [];
const CHATOPTIONS = {
  userFilter: "userFilter",
  wordFilter: "wordFilter",
  whitelist: "whitelist",
}
TiktokEmitter.on('chat', async (data) => {
//  console.log("TiktokEmitter",data);
  handlechat(data);
});
TiktokEmitter.on('gift', async (data) => {
//  console.log("TiktokEmitter",data);
  handlegift(data);
});
TiktokEmitter.on('play_arrow', async (data) => {
//  console.log("TiktokEmitter",data);
});
KickEmitter.onAny((event, data) => {
  const obj = socketManager.kickLiveEvents.reduce((acc, curr) => {
    acc[curr] = curr;
    return acc;
  }, {});
  if (event === obj.ChatMessage){
    console.log("KickEmitter.onAny ChatMessage",data);
    handlekickChat(data);
  } else {
    console.log("KickEmitter.onAny else",event, data);
  }
});
const chatcontainer = document.getElementById('chatcontainer');
chatcontainer.addEventListener('message-menu',(event)=>{
    console.log("event chatcontainer",event.detail);
    const messageData = event.detail;
    const optionsName = {
      "play_arrow": returnexploreroptions('play_arrow','play_arrow','play_arrow',()=>{
        TiktokEmitter.emit('play_arrow',messageData);
    }),
    }
    const menuOptions = [
      // emit array and foreach
      optionsName['play_arrow'],
        returnexploreroptions('block-comment','block comment','block',()=>{
          addnewFilterItem(CHATOPTIONS.wordFilter,messageData.user)
        }),
        returnexploreroptions('block-user','block User','block',()=>{
          addnewFilterItem(CHATOPTIONS.userFilter,messageData.user)
        }),
        returnexploreroptions('whitelist','add whitelist','favorite',()=>{
          addnewFilterItem(CHATOPTIONS.whitelist,messageData.user)
        })
    ];
    setPopupOptions(returnOptions(menuOptions));
    console.log("messageData.element",messageData.element)
    openPopup(messageData.element?.originalTarget ||messageData.element?.target);
});
const giftcontainer = document.getElementById('giftcontainer');
giftcontainer.addEventListener('message-menu',(event)=>{
    console.log("event giftcontainer",event.detail);
    const messageData = event.detail;
    const optionsName = {
      "play_arrow": returnexploreroptions('play_arrow','play_arrow','play_arrow',()=>{
    }),

    }
    const menuOptions = [
      // emit array and foreach
      optionsName['play_arrow'],
    ];
    setPopupOptions(returnOptions(menuOptions));
    openPopup(messageData.element?.originalTarget ||messageData.element?.target);
});
const eventscontainer = document.getElementById('eventscontainer');
eventscontainer.addEventListener('message-menu',(event)=>{
    console.log("event eventscontainer",event.detail);
    const messageData = event.detail;
    const optionsName = {
      "play_arrow": returnexploreroptions('play_arrow','play_arrow','play_arrow',()=>{
    }),
    }
    const menuOptions = [
      // emit array and foreach
      optionsName['play_arrow'],
    ];
    setPopupOptions(returnOptions(menuOptions));
    openPopup(messageData.element?.originalTarget ||messageData.element?.target);
});
async function addnewFilterItem(elementname, data) {
  const allowedItems = {
     userFilter : document.querySelector("user-filter"),
     wordFilter : document.querySelector("word-filter"),
     whitelist : document.querySelector("whitelist-filter"),
  }
  if (!elementname || !data)return;
  const filterItem = allowedItems[elementname]
  if (!filterItem || !('addItemProgrammatically'in filterItem))return;
  console.log("filterItem",filterItem)
    switch (elementname){
      case CHATOPTIONS.userFilter:
      case CHATOPTIONS.whitelist:
      console.log(elementname,data)
      filterItem.addItemProgrammatically(data.name)
      break
      case CHATOPTIONS.wordFilter:
        console.log(elementname,data)
        filterItem.addItemProgrammatically(data.data.comment)
      break
      }
}
document.addEventListener('DOMContentLoaded', () => {
    lastElement();
});