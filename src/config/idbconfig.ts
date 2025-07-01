interface DatabaseConfig {
    name: string;
    version: number;
    store: string;
  }
  
const databases: Record<string, DatabaseConfig> = {
    commentEventsDB: {
      name: "commentEvents",
      version: 1,
      store: "commentEvents",
    },
    giftEventsDB: { name: "giftEvents", version: 1, store: "giftEvents" },
    bitsEventsDB: { name: "bitsEvents", version: 1, store: "bitsEvents" },
    likesEventsDB: { name: "likesEvents", version: 1, store: "likesEvents" },
    followEventsDB: { name: "followEvents", version: 1, store: "followEvents"},
    eventsDB: { name: "Events", version: 1, store: "events" },
    ActionsDB: { name: "Actions", version: 1, store: "actions" },
    banDB: { name: "Bans", version: 1, store: "bans" },
  };
export {
    databases,
    type DatabaseConfig
}