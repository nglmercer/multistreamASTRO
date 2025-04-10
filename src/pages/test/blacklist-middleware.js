// blacklist-checker.js
import { IndexedDBManager, databases } from './idb.js';

export class BlacklistChecker {
    constructor(dbManager = null) {
        // Usa el manager pasado o crea uno nuevo para la DB de baneos
        this.idb = dbManager || new IndexedDBManager(databases.banDB);
        this.cache = { items: [], lastUpdate: null, ttl: 60000 }; // Cache de 1 min
        this.loadingPromise = null; // Para evitar cargas concurrentes
    }

    async getBlacklistItems(forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && this.cache.lastUpdate && (now - this.cache.lastUpdate < this.cache.ttl)) {
            // console.log('[BlChk] Using cached data');
            return this.cache.items;
        }

        // Evitar cargas múltiples simultáneas
        if (!this.loadingPromise) {
             // console.log('[BlChk] Fetching fresh data');
             this.loadingPromise = this.idb.getAllData()
                .then(items => {
                    this.cache.items = items || [];
                    this.cache.lastUpdate = Date.now();
                    // console.log('[BlChk] Cache updated');
                    return this.cache.items;
                })
                .catch(err => {
                    console.error('[BlChk] Error fetching data:', err);
                    // Devolver cache antigua si existe en caso de error
                    return this.cache.items.length > 0 ? this.cache.items : Promise.reject(err);
                })
                .finally(() => {
                    this.loadingPromise = null; // Liberar el bloqueo
                });
        }
        return this.loadingPromise;
    }

    _isBanActive(item) {
        if (!item) return false;
        if (item.banType === 'permanent') return true;
        if (item.banType === 'temporary' && item.banEndDate) {
            try {
                return new Date(item.banEndDate) > new Date();
            } catch (e) { return false; /* Fecha inválida */ }
        }
        return false;
    }

    async isBlocked(val, typ) {
        try {
            const items = await this.getBlacklistItems();
            const match = items.find(i => i.type === typ && i.value === val && this._isBanActive(i));

            if (match) {
                const reason = match.banType === 'permanent'
                    ? `Permanently banned: ${match.reason || 'N/A'}`
                    : `Temporarily banned until ${new Date(match.banEndDate).toLocaleString()}: ${match.reason || 'N/A'}`;
                // console.log(`[BlChk] BLOCKED ${typ}=${val}: ${reason}`);
                return { blocked: true, reason, item: match };
            } else {
                // console.log(`[BlChk] ALLOWED ${typ}=${val}`);
                return { blocked: false, reason: 'Not found or ban expired' };
            }
        } catch (error) {
            console.error(`[BlChk] Error checking ${typ}=${val}:`, error);
            return { blocked: false, reason: `Error checking: ${error.message}`, error };
        }
    }

    // checkRequest (sin cambios funcionales mayores, usa isBlocked)
    async checkRequest(req) {
        const results = { blocked: false, checks: [] };
        const checksToRun = [
            { type: 'ip', value: req.ip },
            { type: 'user', value: req.userId },
            { type: 'domain', value: req.domain }
        ].filter(c => c.value); // Filtrar los que tienen valor

        for (const { type, value } of checksToRun) {
            const checkRes = await this.isBlocked(value, type);
            results.checks.push({ type, value, result: checkRes });
            if (checkRes.blocked && !results.blocked) {
                results.blocked = true;
                results.reason = checkRes.reason;
                results.blockedBy = { type, value };
            }
        }

        // Chequeo de Keywords (si es necesario)
        if (req.content) {
            try {
                 const items = await this.getBlacklistItems();
                 const keywords = items.filter(i => i.type === 'keyword' && this._isBanActive(i));
                 for (const kw of keywords) {
                    if (req.content.includes(kw.value)) {
                         const kwCheck = { blocked: true, reason: `Keyword '${kw.value}': ${kw.reason || 'N/A'}`, item: kw };
                         results.checks.push({ type: 'keyword', value: kw.value, result: kwCheck });
                          if (!results.blocked) {
                             results.blocked = true;
                             results.reason = kwCheck.reason;
                             results.blockedBy = { type: 'keyword', value: kw.value };
                          }
                         break; // Opcional: parar al encontrar la primera keyword
                    }
                 }
            } catch(e) { console.error("Error checking keywords", e); }
        }

        // console.log(`[BlChk] Request check result: ${results.blocked ? 'BLOCKED' : 'ALLOWED'}`, results.blockedBy || '');
        return results;
    }

    clearCache() {
        this.cache = { items: [], lastUpdate: null, ttl: 60000 };
        this.loadingPromise = null;
        console.log('[BlChk] Cache cleared');
    }

    // Método para notificar al checker que los datos cambiaron (llamado por el observer)
    handleDbUpdate() {
        console.log('[BlChk] DB changed, clearing cache.');
        this.clearCache();
        // Opcional: Recargar inmediatamente si se desea
        // this.getBlacklistItems(true);
    }
}