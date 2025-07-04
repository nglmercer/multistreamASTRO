// e.g., ./giftService.ts

import type {
    TikTokGiftRaw,
    TiktokLocalStorageStore,
    MappedGift,
    GiftListCriteria,
    GiftSortCriteria
    // If you plan to use TikTokUser here, import it as well:
    // TikTokUser
} from './Types'; // Assuming Types.ts is in the same directory
import giftJSON from '@utils/transform/gift.json'; // Importing the JSON file directly
// --- Helper Functions ---

function geticonfromarray(array?: string[]): string {
    if (array && Array.isArray(array) && array.length > 0) {
        return array[0];
    }
    return ''; // Return an empty string if no valid icon URL is found
}

// --- Core Logic Functions ---

function getAgifts(): TikTokGiftRaw[] | undefined {
    const storageKeys = {
        gifts: "availableGifts",
        connected: "connected"
    } as const; // Using 'as const' for better type safety with keys

    try {
        const tiktokEventsString = localStorage.getItem('TiktokEvents');
        if (tiktokEventsString) {
            const TStore: TiktokLocalStorageStore = JSON.parse(tiktokEventsString);
            // Prefer direct 'availableGifts', then nested under 'connected'
            const giftStore = TStore[storageKeys.gifts] ?? TStore[storageKeys.connected]?.[storageKeys.gifts];
            
            // Ensure it's an array before returning
            return Array.isArray(giftStore) ? giftStore : undefined;
        }
        return undefined; // No item in localStorage
    } catch (error: unknown) { // Catch unknown type for error
        if (error instanceof Error) {
            console.error("Error in getAgifts:", error.message);
        } else {
            console.error("An unknown error occurred in getAgifts:", error);
        }
        return []; // Return empty array on error, consistent with original logic
    }
}

function mapgifts(
    array: TikTokGiftRaw[] = [], 
    orderBy: GiftSortCriteria = 'cost'
): MappedGift[] {
    if (!Array.isArray(array)) { // Type guard
        return [];
    }

    const mappedArray: MappedGift[] = array.map(obj => ({
        name: obj.name,
        label: `${obj.name} (${obj.diamond_count})`,
        value: obj.id, // For 'gift', value is the gift's ID
        image: geticonfromarray(obj.icon?.url_list), // Added optional chaining for obj.icon
        cost: obj.diamond_count
    }));

    // Create a copy for sorting to avoid mutating the original mappedArray
    const sortedArray = [...mappedArray];

    if (orderBy === 'name') {
        return sortedArray.sort((a, b) => a.name.localeCompare(b.name));
    } else if (orderBy === 'cost') {
        return sortedArray.sort((a, b) => a.cost - b.cost);
    }
    return mappedArray;
}

function mapgiftsbycost(
    array: TikTokGiftRaw[],
    orderBy: GiftSortCriteria = 'cost'
): MappedGift[] {
    if (!Array.isArray(array)) {
        return [];
    }

    const mappedArray: MappedGift[] = array.map(obj => ({
        name: obj.name,
        label: `${obj.name} (${obj.diamond_count})`,
        value: obj.diamond_count, // For 'cost', value is the gift's cost (diamond_count)
        image: geticonfromarray(obj.icon?.url_list),
        cost: obj.diamond_count
    }));

    const sortedArray = [...mappedArray];

    if (orderBy === 'name') {
        return sortedArray.sort((a, b) => a.name.localeCompare(b.name));
    } else if (orderBy === 'cost') {
        return sortedArray.sort((a, b) => a.cost - b.cost);
    }
    return mappedArray;
}

// --- Main Exported Function ---

function getGiftList(by: GiftListCriteria = "gift"): MappedGift[] {
    let gifts: MappedGift[] = [];
    const tiktokEvents: TikTokGiftRaw[] | undefined = getAgifts() || giftJSON;
    console.log("getGiftList called with by:", by, "and tiktokEvents:", tiktokEvents,giftJSON);
    try {
        if (tiktokEvents && Array.isArray(tiktokEvents) && tiktokEvents.length > 0) {
            if (!by || by === 'gift') {
                gifts = mapgifts(tiktokEvents);
            } else if (by === 'cost') {
                gifts = mapgiftsbycost(tiktokEvents);
            }
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("Error in getGiftList:", error.message);
        } else {
            console.error("An unknown error occurred in getGiftList:", error);
        }
        return [];
    }
    // console.log("getGiftList results:", { gifts, tiktokEventsInput: tiktokEvents });
    return gifts;
}

// Exports
export { getGiftList, mapgifts, mapgiftsbycost, geticonfromarray, getAgifts };