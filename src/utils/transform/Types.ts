// ./Types.ts

// Interface for the raw gift object structure likely coming from TikTok/localStorage
export interface TikTokGiftRaw {
    name: string;
    diamond_count: number;
    id: number | string; // ID could be a number or string
    icon: {
        url_list: string[];
        // Potentially other properties in icon object
    };
    // Add any other properties if they exist on the raw gift object
}

// Interface for the structure stored in localStorage under 'TiktokEvents'
export interface TiktokLocalStorageStore {
    availableGifts?: TikTokGiftRaw[];
    connected?: {
        availableGifts?: TikTokGiftRaw[];
    };
    // Potentially other properties in the store
    [key: string]: any; // Allows for other dynamic keys if necessary
}

// Interface for the mapped gift object that the functions will produce
export interface MappedGift {
    name: string;
    label: string;
    value: number | string; // This will hold either id or diamond_count
    image: string;
    cost: number;
}

// Type for the 'by' parameter in getGiftList
export type GiftListCriteria = 'gift' | 'cost';

// Type for the 'orderBy' parameter in mapping functions
export type GiftSortCriteria = 'name' | 'cost';

// Interface for a TikTok User, based on the provided data
export interface TikTokUser {
    followRole: number;
    gifterLevel: number;
    isModerator: boolean;
    isNewGifter: boolean;
    isSubscriber: boolean;
    lastEventType: string; // e.g., "member", "like", "gift"
    lastSeenAt: string; // ISO date string
    nickname: string;
    profilePictureUrl: string;
    teamMemberLevel: number;
    totalDiamondsGiven: number;
    totalLikesGiven: number;
    uniqueId: string;
    userId: string;
}
export interface SelectOption {
    value: string | number; // Puede ser string (para userId) o number si se usa para otra cosa
    label: string;
    [key: string]: string | number | boolean | undefined; // Permite otras propiedades opcionales
}