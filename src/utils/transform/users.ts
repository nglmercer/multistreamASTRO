import type {
    TikTokUser, // Importa TikTokUser
    SelectOption  // Importa SelectOption
} from './Types';

// ... (tus otras funciones: geticonfromarray, getAgifts, mapgifts, etc.)

// --- User Utility Functions ---

/**
 * Transforma un array de objetos TikTokUser a un formato adecuado para un select.
 * @param users Array de objetos TikTokUser.
 * @returns Array de objetos con 'value' (userId) y 'label' (uniqueId).
 */
export function mapUsersToSelectOptions(users?: TikTokUser[]): SelectOption[] {
    if (!users || !Array.isArray(users) || users.length === 0) {
        return []; // Retorna un array vacío si no hay usuarios o la entrada es inválida
    }

    return users.map(user => ({
        value: user.userId,   // userId como el valor para el select
        label: user.uniqueId  // uniqueId como la etiqueta visible en el select
    }));
}

