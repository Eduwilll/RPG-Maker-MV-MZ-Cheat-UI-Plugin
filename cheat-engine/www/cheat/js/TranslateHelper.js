import { KeyValueStorage } from './KeyValueStorage.js'
import { Alert } from './AlertHelper.js'

// Translation Bank for caching translations
class TranslationBank {
    constructor() {
        this.storage = new KeyValueStorage('./www/cheat-settings/translation-bank.json')
        this.cache = this.loadCache()
    }

    loadCache() {
        try {
            const data = this.storage.getItem('translations')
            return data ? JSON.parse(data) : {}
        } catch (error) {
            console.warn('Failed to load translation cache:', error)
            return {}
        }
    }

    saveCache() {
        try {
            this.storage.setItem('translations', JSON.stringify(this.cache))
            console.log(`Translation bank saved with ${Object.keys(this.cache).length} entries`)
        } catch (error) {
            console.error('Failed to save translation cache:', error)
        }
    }

    // Get cached translation
    get(originalText) {
        if (!originalText || typeof originalText !== 'string') return null
        const key = this.createKey(originalText)
        return this.cache[key] || null
    }

    // Store successful translation
    set(originalText, translatedText) {
        if (!originalText || !translatedText || typeof originalText !== 'string') return
        if (originalText === translatedText) return // Don't cache unchanged text

        const key = this.createKey(originalText)
        this.cache[key] = {
            original: originalText,
            translated: translatedText,
            timestamp: Date.now(),
            source: 'lingva'
        }
        this.saveCache()
    }

    // Create consistent cache key
    createKey(text) {
        if (!text || typeof text !== 'string') return ''
        // Normalize whitespace and newlines for consistent lookup
        return text.trim().toLowerCase().replace(/\s+/g, ' ')
    }

    // Get cache statistics
    getStats() {
        const entries = Object.values(this.cache)
        return {
            totalEntries: entries.length,
            oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : null,
            newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : null
        }
    }

    // Clear old entries (optional maintenance)
    clearOldEntries(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days default
        const cutoff = Date.now() - maxAge
        const oldSize = Object.keys(this.cache).length

        Object.keys(this.cache).forEach(key => {
            if (this.cache[key].timestamp < cutoff) {
                delete this.cache[key]
            }
        })

        const newSize = Object.keys(this.cache).length
        if (oldSize !== newSize) {
            this.saveCache()
            console.log(`Cleaned translation bank: ${oldSize} → ${newSize} entries`)
        }
    }

    // Export/import for backup
    export() {
        return JSON.stringify(this.cache, null, 2)
    }

    import(jsonData) {
        try {
            const imported = JSON.parse(jsonData)
            this.cache = { ...this.cache, ...imported }
            this.saveCache()
            return true
        } catch (error) {
            console.error('Failed to import translation data:', error)
            return false
        }
    }
}

// Global translation bank instance
export const TRANSLATION_BANK = new TranslationBank()

export const END_POINT_URL_PATTERN_TEXT_SYMBOL = '${TEXT}'

export const DEFAULT_END_POINTS = {
    ezTransWeb: {
        id: 'ezTransWeb',
        name: 'ezTransWeb (JP → KR)',
        helpUrl: 'https://github.com/HelloKS/ezTransWeb',
        data: {
            method: 'get',
            urlPattern: `http://localhost:5000/translate?text=${END_POINT_URL_PATTERN_TEXT_SYMBOL}`
        }
    },

    ezTransServer: {
        id: 'ezTransServer',
        name: 'eztrans-server (JP → KR)',
        helpUrl: 'https://github.com/nanikit/eztrans-server',
        data: {
            method: 'post',
            urlPattern: `http://localhost:8000`,
            body: END_POINT_URL_PATTERN_TEXT_SYMBOL
        }
    },

    lingva: {
        id: 'lingva',
        name: 'Lingva Translate (Auto-detect → EN)',
        helpUrl: 'https://github.com/thedaviddelta/lingva-translate',
        data: {
            method: 'get',
            urlPattern: `https://lingva.ml/api/v1/auto/en/${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
            isLingva: true,
            sourceLang: 'auto'
        }
    },
    lingvaJa: {
        id: 'lingvaJa',
        name: 'Lingva Translate (JA → EN)',
        helpUrl: 'https://github.com/thedaviddelta/lingva-translate',
        data: {
            method: 'get',
            urlPattern: `https://lingva.ml/api/v1/ja/en/${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
            isLingva: true,
            sourceLang: 'ja'
        }
    },
    lingvaLocal: {
        id: 'lingvaLocal',
        name: 'Local Lingva Docker (localhost:3000, JA → EN)',
        helpUrl: 'https://github.com/thedaviddelta/lingva-translate',
        data: {
            method: 'get',
            urlPattern: `http://localhost:3000/api/v1/ja/en/${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
            isLingva: true,
            sourceLang: 'ja',
            isLocal: true
        }
    },
    lingvaLocalAuto: {
        id: 'lingvaLocalAuto',
        name: 'Local Lingva Docker (localhost:3000, Auto-detect → EN)',
        helpUrl: 'https://github.com/thedaviddelta/lingva-translate',
        data: {
            method: 'get',
            urlPattern: `http://localhost:3000/api/v1/auto/en/${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
            isLingva: true,
            sourceLang: 'auto',
            isLocal: true,
            localDomain: 'http://localhost:3000'
        }
    },
    lingvaLocalBalanced: {
        id: 'lingvaLocalBalanced',
        name: 'Local Lingva Docker (Ports 3000, 3001, 3002 Load Balanced, JA → EN)',
        helpUrl: 'https://github.com/thedaviddelta/lingva-translate',
        data: {
            method: 'get',
            urlPattern: `http://localhost:3000/api/v1/ja/en/${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
            isLingva: true,
            sourceLang: 'ja',
            isLocal: true,
            localDomain: 'http://localhost:3000,http://localhost:3001,http://localhost:3002'
        }
    },
    lingvaLocalBalancedAuto: {
        id: 'lingvaLocalBalancedAuto',
        name: 'Local Lingva Docker (Ports 3000, 3001, 3002 Load Balanced, Auto → EN)',
        helpUrl: 'https://github.com/thedaviddelta/lingva-translate',
        data: {
            method: 'get',
            urlPattern: `http://localhost:3000/api/v1/auto/en/${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
            isLingva: true,
            sourceLang: 'auto',
            isLocal: true,
            localDomain: 'http://localhost:3000,http://localhost:3001,http://localhost:3002'
        }
    }
}

export const RECOMMEND_CHUNK_SIZE = {
    ezTransWeb: 500,
    ezTransServer: 100,
    lingva: 10,
    lingvaJa: 10,
    lingvaLocal: 50,
    lingvaLocalAuto: 50,
    lingvaLocalBalanced: 100,
    lingvaLocalBalancedAuto: 100
}

// Maximum safe chunk sizes for different services
export const MAX_CHUNK_SIZE = {
    ezTransWeb: 1000,
    ezTransServer: 500,
    lingva: 20,  // Lingva has stricter limits
    lingvaJa: 20,
    lingvaLocal: 100,
    lingvaLocalAuto: 100,
    lingvaLocalBalanced: 200,
    lingvaLocalBalancedAuto: 200
}

// Optimal parallel request limits
export const MAX_PARALLEL_REQUESTS = {
    ezTransWeb: 50,
    ezTransServer: 20,
    lingva: 5,   // Conservative for public API
    lingvaJa: 5,
    lingvaLocal: 30,
    lingvaLocalAuto: 30,
    lingvaLocalBalanced: 100, // Maximized concurrency for heavy load balancing mapping
    lingvaLocalBalancedAuto: 100
}

// Batch translation settings
export const BATCH_TRANSLATION = {
    // Delimiter to separate multiple texts in one request
    delimiter: ' ⟨SEP⟩ ',

    // Maximum characters per batch request
    maxBatchLength: {
        lingva: 1500,      // Conservative for URL length
        lingvaJa: 1500,
        // Note: ezTrans services use original method, not batch
    },

    // Maximum items per batch
    maxBatchItems: {
        lingva: 50,        // Can fit many short variable names
        lingvaJa: 50,
        // Note: ezTrans services use original method, not batch
    },

    // Services that should NOT use batch translation
    excludeFromBatch: ['ezTransWeb', 'ezTransServer']
}


class Translator {
    constructor(settings) {
        this.settings = settings
    }

    async isAvailable() {
        try {
            await this.__translate('test')
            return true
        } catch (e) {
            return false
        }

    }

    async __translate(text) {
        const epData = this.settings.getEndPointData()

        // For Lingva API, try multiple endpoints with fallbacks
        if (epData.isLingva) {
            return await this.__translateLingva(text)
        }

        // For other APIs, use the original logic
        let encodedText = encodeURI(text)
        const realUrl = epData.urlPattern.replace(END_POINT_URL_PATTERN_TEXT_SYMBOL, encodedText)

        let response
        try {
            if (epData.method === 'get') {
                response = (await axios.get(realUrl)).data
            } else if (epData.method === 'post') {
                const body = epData.body ? epData.body : ''
                response = (await axios.post(realUrl, body.replace(END_POINT_URL_PATTERN_TEXT_SYMBOL, text))).data
            } else {
                return text
            }
        } catch (error) {
            console.warn('Translation request failed:', error.message)
            return text
        }

        return response || text
    }

    async __translateLingva(text) {
        const epData = this.settings.getEndPointData();
        const sourceLang = epData.sourceLang || 'auto';

        // Load balancing router for local docker arrays
        let baseDomain = 'https://lingva.ml';
        if (epData.isLocal) {
            const domains = (epData.localDomain || 'http://localhost:3000').split(',');
            if (typeof this._rrIndex === 'undefined') {
                this._rrIndex = 0;
            }
            baseDomain = domains[this._rrIndex % domains.length].trim();
            console.log(`[Load Balancer] Sending bulk query chunk to: ${baseDomain}`);
            this._rrIndex++;
        }

        const primaryEndpoint = `${baseDomain}/api/v1/${sourceLang}/en/${encodeURIComponent(text)}`

        try {
            const response = await axios.get(primaryEndpoint, {
                timeout: epData.isLocal ? 5000 : 15000, // Shorter timeout for local since it should be instant
                headers: {
                    'Accept': 'application/json'
                }
            })

            if (response.data && response.data.translation && response.data.translation !== text) {
                return response.data.translation
            }
        } catch (error) {
            console.warn('Lingva primary API failed:', error.message);

            // If local failed, drop out early (no fallback)
            if (epData.isLocal) return text;

            // Quick fallback to plausibility cloud for public endpoints
            try {
                const fallbackEndpoint = `https://translate.plausibility.cloud/api/v1/${sourceLang}/en/${encodeURIComponent(text)}`
                const response = await axios.get(fallbackEndpoint, {
                    timeout: 10000,
                    headers: { 'Accept': 'application/json' }
                })

                if (response.data && response.data.translation && response.data.translation !== text) {
                    return response.data.translation
                }
            } catch (fallbackError) {
                console.warn('Lingva fallback API failed:', fallbackError.message);
                // If both fail, return original quickly
            }
        }

        return text
    }

    async __translateBulk(texts) {
        return (await this.translate(texts.join('\n'))).split('\n')
    }

    async translate(text) {
        try {
            // Check translation bank first
            const cached = TRANSLATION_BANK.get(text)
            if (cached) {
                console.log(`Cache hit: "${text}" → "${cached.translated}"`)
                return cached.translated
            }

            // If not in cache, translate and store
            const translated = await this.__translate(text)

            // Store successful translation in bank
            if (translated && translated !== text) {
                TRANSLATION_BANK.set(text, translated)
                console.log(`Cached: "${text}" → "${translated}"`)
            }

            return translated
        } catch (err) {
            return text
        }
    }

    // async translateBulk (texts) {
    //     texts = texts.map(text => text.replace('\n', ''))
    //
    //     const chunkSize = 100
    //     const textsChunk = []
    //
    //     for (let i = 0; i < texts.length; i += chunkSize) {
    //         textsChunk.push(texts.slice(i, Math.min(texts.length, i + chunkSize)))
    //     }
    //
    //     const ret = [].concat(...await Promise.all(textsChunk.map(chunk => this.__translateBulk(chunk))))
    //     return ret
    // }

    getAdaptiveChunkSize(requestedSize, endPointId) {
        const maxSafe = MAX_CHUNK_SIZE[endPointId] || 50
        const maxParallel = MAX_PARALLEL_REQUESTS[endPointId] || 10

        if (requestedSize <= maxSafe) {
            return requestedSize
        }

        console.warn(`Chunk size ${requestedSize} too large for ${endPointId}. Using safe limit: ${maxSafe}`)
        return maxSafe
    }

    async translateBulk(texts) {
        // Handle empty or invalid input
        if (!texts || !Array.isArray(texts) || texts.length === 0) {
            console.warn('translateBulk: Invalid or empty texts array')
            return []
        }

        // Clean up texts and preserve original indices
        const cleanedTexts = texts.map(text => text ? text.trim() : text)

        const epData = this.settings.getEndPointData()
        const requestedChunkSize = this.settings.getBulkTranslateChunkSize()

        // Check if this is a JP→KR endpoint (ezTrans services)
        const isJpToKr = epData.id === 'ezTransWeb' || epData.id === 'ezTransServer'

        if (isJpToKr) {
            console.log(`Using original translation method for JP→KR endpoint: ${epData.id}`)
            return await this.translateBulkOriginal(cleanedTexts)
        }

        // For other endpoints, use the new batch system
        const safeChunkSize = this.getAdaptiveChunkSize(requestedChunkSize, epData.id || 'unknown')
        console.log(`Requested chunk size: ${requestedChunkSize}, Using safe size: ${safeChunkSize}`)

        // Check cache statistics
        const cacheHits = cleanedTexts.filter(text => TRANSLATION_BANK.get(text)).length
        console.log(`Translating ${cleanedTexts.length} texts (${cacheHits} cached, ${cleanedTexts.length - cacheHits} new)`)

        const textsChunk = []

        for (let i = 0; i < cleanedTexts.length; i += safeChunkSize) {
            const chunk = cleanedTexts.slice(i, Math.min(cleanedTexts.length, i + safeChunkSize))

            // For Lingva API, use controlled parallel translation
            if (epData.isLingva) {
                const translatedChunk = await this.translateLingvaChunk(chunk)
                textsChunk.push(translatedChunk)
            } else {
                // Use bulk translation for other services
                textsChunk.push(await this.__translateBulk(chunk))
            }
        }

        const result = [].concat(...textsChunk)
        console.log(`Translation completed. Input: ${texts.length}, Output: ${result.length}`)
        return result
    }

    async translateBulkOriginal(texts) {
        console.log(`🔄 Using original translation method for ${texts.length} texts`)

        // Use the original repository's bulk translation logic
        const chunkSize = this.settings.getBulkTranslateChunkSize()
        const textsChunk = []

        for (let i = 0; i < texts.length; i += chunkSize) {
            const chunk = texts.slice(i, Math.min(texts.length, i + chunkSize))
            console.log(`Processing chunk ${Math.floor(i / chunkSize) + 1}: ${chunk.length} items`)

            // Use the original __translateBulk method
            textsChunk.push(await this.__translateBulk(chunk))
        }

        const result = [].concat(...textsChunk)
        console.log(`✅ Original translation completed. Input: ${texts.length}, Output: ${result.length}`)
        return result
    }

    createBatches(texts, endPointId) {
        const config = BATCH_TRANSLATION
        const maxLength = config.maxBatchLength[endPointId] || 1000
        const maxItems = config.maxBatchItems[endPointId] || 20
        const delimiter = config.delimiter

        const batches = []
        let currentBatch = []
        let currentLength = 0

        for (const text of texts) {
            if (!text || !text.trim()) {
                currentBatch.push('')
                continue
            }

            const textLength = text.length + delimiter.length

            // Check if adding this text would exceed limits
            if (currentBatch.length > 0 &&
                (currentLength + textLength > maxLength || currentBatch.length >= maxItems)) {

                // Start new batch
                batches.push(currentBatch)
                currentBatch = [text]
                currentLength = text.length
            } else {
                // Add to current batch
                currentBatch.push(text)
                currentLength += textLength
            }
        }

        // Add final batch if not empty
        if (currentBatch.length > 0) {
            batches.push(currentBatch)
        }

        return batches
    }

    async translateBatch(batch) {
        const delimiter = BATCH_TRANSLATION.delimiter

        // Filter out empty texts but remember their positions
        const textMap = []
        const nonEmptyTexts = []

        batch.forEach((text, index) => {
            if (text && text.trim()) {
                textMap.push({ originalIndex: index, batchIndex: nonEmptyTexts.length })
                nonEmptyTexts.push(text)
            } else {
                textMap.push({ originalIndex: index, batchIndex: -1 })
            }
        })

        if (nonEmptyTexts.length === 0) {
            return batch // All empty, return as-is
        }

        // Combine texts with delimiter
        const combinedText = nonEmptyTexts.join(delimiter)
        console.log(`🔗 Batch translation: ${nonEmptyTexts.length} items in one request`)
        console.log(`📏 Combined length: ${combinedText.length} characters`)

        try {
            // Translate the combined text
            const translatedCombined = await this.translate(combinedText)

            // Split the result back
            const translatedParts = translatedCombined.split(delimiter)

            // Reconstruct the original array with translations
            const results = new Array(batch.length)
            textMap.forEach(mapping => {
                const originalStr = batch[mapping.originalIndex];

                if (mapping.batchIndex >= 0 && mapping.batchIndex < translatedParts.length) {
                    const translatedStr = translatedParts[mapping.batchIndex].trim();
                    results[mapping.originalIndex] = translatedStr;

                    // The core bugfix! We must cache the granular strings back into the bank so other tabs skip them
                    TRANSLATION_BANK.set(originalStr, translatedStr);
                } else {
                    results[mapping.originalIndex] = batch[mapping.originalIndex] || ''
                }
            })

            console.log(`✅ Batch translation successful: ${nonEmptyTexts.length} → ${translatedParts.length}`)
            return results

        } catch (error) {
            console.warn('Batch translation failed, falling back to individual translation:', error)

            // Fallback: translate individually
            const results = new Array(batch.length)
            for (let i = 0; i < batch.length; i++) {
                if (batch[i] && batch[i].trim()) {
                    try {
                        results[i] = await this.translate(batch[i])
                        await new Promise(resolve => setTimeout(resolve, 100)) // Small delay
                    } catch (individualError) {
                        results[i] = batch[i] // Keep original on failure
                    }
                } else {
                    results[i] = batch[i] || ''
                }
            }
            return results
        }
    }

    async translateLingvaChunk(chunk) {
        const endPointId = this.settings.getEndPointSelection();

        // Use batch translation for efficiency
        const batches = this.createBatches(chunk, endPointId)
        console.log(`📦 Created ${batches.length} batches from ${chunk.length} items`)

        const allResults = new Array(batches.length)
        const maxParallel = MAX_PARALLEL_REQUESTS[endPointId] || 5;
        let currentIndex = 0;

        // Concurrent processing pool
        const worker = async () => {
            while (currentIndex < batches.length) {
                const i = currentIndex++;
                const batch = batches[i];
                console.log(`🔄 Processing batch ${i + 1}/${batches.length} (${batch.length} items) on parallel thread`);

                try {
                    allResults[i] = await this.translateBatch(batch);
                } catch (error) {
                    console.error('Batch failed:', error);
                    allResults[i] = batch; // fallback securely
                }

                // Add a micro-delay inside threads for local stability
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        };

        const workers = [];
        for (let j = 0; j < Math.min(maxParallel, batches.length); j++) {
            workers.push(worker());
        }

        // Wait for all workers to complete processing batches concurrently
        await Promise.all(workers);

        return allResults.flat()
    }

    async translateAllGlobals() {
        const targets = this.settings.getTargets()
        const epData = this.settings.getEndPointData()
        const isJpToKr = epData.id === 'ezTransWeb' || epData.id === 'ezTransServer'
        const chunkSize = this.settings.getBulkTranslateChunkSize()
        const useBatch = localStorage.getItem('useBatchTranslation') !== 'false'

        let toTranslate = [];

        if (targets.variables && window.$dataSystem && window.$dataSystem.variables) {
            toTranslate.push({ type: 'Variables', list: window.$dataSystem.variables.slice() })
        }
        if (targets.switches && window.$dataSystem && window.$dataSystem.switches) {
            toTranslate.push({ type: 'Switches', list: window.$dataSystem.switches.slice() })
        }
        if (targets.maps && window.$dataMapInfos) {
            const rawNames = window.$dataMapInfos.map(m => m ? m.name : '')
            toTranslate.push({ type: 'Maps', list: rawNames })
        }

        // Comprehensive Database Extraction
        const extractText = (arr) => arr.filter(i => i).flatMap(i => [i.name, i.description].filter(Boolean));

        // Extended extraction: name, description, nickname, profile, messages
        const extractTextFull = (arr) => arr.filter(i => i).flatMap(i => {
            const texts = [i.name, i.description, i.nickname, i.profile]
            for (let m = 1; m <= 4; m++) {
                if (i[`message${m}`]) texts.push(i[`message${m}`])
            }
            return texts.filter(Boolean)
        });

        if (targets.items && window.$dataItems) {
            toTranslate.push({ type: 'Items', list: extractText(window.$dataItems) })
        }
        if (targets.weapons && window.$dataWeapons) {
            toTranslate.push({ type: 'Weapons', list: extractText(window.$dataWeapons) })
        }
        if (targets.armors && window.$dataArmors) {
            toTranslate.push({ type: 'Armors', list: extractText(window.$dataArmors) })
        }
        if (targets.skills && window.$dataSkills) {
            toTranslate.push({ type: 'Skills', list: extractTextFull(window.$dataSkills) })
        }
        if (targets.states && window.$dataStates) {
            toTranslate.push({ type: 'States', list: extractTextFull(window.$dataStates) })
        }
        if (targets.classes && window.$dataClasses) {
            toTranslate.push({ type: 'Classes', list: extractText(window.$dataClasses) })
        }
        if (targets.enemies && window.$dataEnemies) {
            toTranslate.push({ type: 'Enemies', list: extractText(window.$dataEnemies) })
        }

        // === NEW: Actors (names, nicknames, profiles) ===
        if (targets.actors && window.$dataActors) {
            toTranslate.push({ type: 'Actors', list: extractTextFull(window.$dataActors) })
        }

        // === NEW: System Terms (menu commands, battle messages, params, etc.) ===
        if (targets.system && window.$dataSystem) {
            const systemTexts = this.extractSystemTerms()
            if (systemTexts.length > 0) {
                toTranslate.push({ type: 'System Terms', list: systemTexts })
            }
        }

        // === NEW: Event Dialogues from ALL maps ===
        if (targets.dialogues) {
            TRANSLATE_PROGRESS.update(true, 0, 'Scanning map files...')
            const dialogueTexts = await this.extractAllEventDialogues()
            if (dialogueTexts.length > 0) {
                toTranslate.push({ type: 'Dialogues', list: dialogueTexts })
            }
        }

        // === NEW: Common Events ===
        if (targets.dialogues && window.$dataCommonEvents) {
            const commonEventTexts = this.extractCommonEventTexts()
            if (commonEventTexts.length > 0) {
                toTranslate.push({ type: 'Common Events', list: commonEventTexts })
            }
        }

        let totalUncached = 0;
        let uncachedItemsMap = new Map();

        toTranslate.forEach(target => {
            const uncachedSet = new Set();
            target.list.forEach((item) => {
                if (item && typeof item === 'string' && item.trim()) {
                    if (!TRANSLATION_BANK.get(item)) {
                        uncachedSet.add(item);
                    }
                }
            })
            if (uncachedSet.size > 0) {
                uncachedItemsMap.set(target.type, Array.from(uncachedSet));
                totalUncached += uncachedSet.size;
            }
        });

        if (totalUncached === 0) {
            TRANSLATE_PROGRESS.update(false, 100, 'All Cached');
            Alert.success('All text already translated! Applying to game...');
            window.dispatchEvent(new CustomEvent('cheat-translate-finish'))
            setTimeout(() => TRANSLATE_PROGRESS.update(false, 0, ''), 2000);
            return;
        }

        console.log(`[Translator] Total strings to translate: ${totalUncached}`);
        toTranslate.forEach(t => {
            const uncached = uncachedItemsMap.get(t.type)
            if (uncached) console.log(`  ${t.type}: ${uncached.length} new strings`)
        });

        let completed = 0;

        for (const [type, uncached] of uncachedItemsMap.entries()) {
            TRANSLATE_PROGRESS.update(true, Math.round((completed / totalUncached) * 100), `${type} (${completed}/${totalUncached})`)
            try {
                if (isJpToKr || (epData.isLingva && !useBatch)) {
                    for (let i = 0; i < uncached.length; i++) {
                        await this.translate(uncached[i]);
                        completed++;
                        TRANSLATE_PROGRESS.update(true, Math.round((completed / totalUncached) * 100), `${type} (${completed}/${totalUncached})`)
                    }
                } else {
                    for (let i = 0; i < uncached.length; i += chunkSize) {
                        const chunk = uncached.slice(i, i + chunkSize);
                        await this.translateBulk(chunk);
                        completed += chunk.length;
                        TRANSLATE_PROGRESS.update(true, Math.round((completed / totalUncached) * 100), `${type} (${completed}/${totalUncached})`)
                    }
                }
            } catch (err) {
                console.warn(`Failed global translation for ${type}`, err);
            }
        }

        TRANSLATE_PROGRESS.update(false, 100, 'Complete — Applying to game...');
        Alert.success('Translation Complete! Applying to in-game text...');
        window.dispatchEvent(new CustomEvent('cheat-translate-finish'))
        setTimeout(() => TRANSLATE_PROGRESS.update(false, 0, ''), 3000);
    }

    /**
     * Extract all system terms for translation:
     * basic terms, commands, params, messages, type names
     */
    extractSystemTerms() {
        const texts = []
        const sys = window.$dataSystem
        if (!sys) return texts

        // Basic terms (Level, HP, MP, etc.)
        if (sys.terms && sys.terms.basic) {
            texts.push(...sys.terms.basic.filter(t => t && typeof t === 'string' && t.trim()))
        }

        // Commands (Fight, Escape, Item, Skill, etc.)
        if (sys.terms && sys.terms.commands) {
            texts.push(...sys.terms.commands.filter(t => t && typeof t === 'string' && t.trim()))
        }

        // Params (Max HP, Max MP, Attack, Defense, etc.)
        if (sys.terms && sys.terms.params) {
            texts.push(...sys.terms.params.filter(t => t && typeof t === 'string' && t.trim()))
        }

        // Messages (battle messages like "%1 attacks!", etc.)
        if (sys.terms && sys.terms.messages) {
            for (const key in sys.terms.messages) {
                const text = sys.terms.messages[key]
                if (text && typeof text === 'string' && text.trim()) {
                    texts.push(text)
                }
            }
        }

        // Type names
        const typeArrays = ['armorTypes', 'weaponTypes', 'skillTypes', 'elements']
        for (const arrayName of typeArrays) {
            if (sys[arrayName]) {
                texts.push(...sys[arrayName].filter(t => t && typeof t === 'string' && t.trim()))
            }
        }

        // Game title
        if (sys.gameTitle) texts.push(sys.gameTitle)

        return texts
    }

    /**
     * Extract event dialogue text from a single event's command list.
     * RPG Maker event commands:
     *   Code 101 = Show Text header (face, position, background)
     *   Code 401 = Show Text content line
     *   Code 102 = Show Choices
     *   Code 355 = Script (first line)
     *   Code 655 = Script (continuation)
     *   Code 105 = Show Scrolling Text header
     *   Code 405 = Show Scrolling Text content line
     *   Code 320 = Change Actor Name
     *   Code 324 = Change Actor Nickname
     *   Code 325 = Change Profile
     */
    extractEventCommandTexts(commands) {
        const texts = []
        if (!commands || !Array.isArray(commands)) return texts

        for (let i = 0; i < commands.length; i++) {
            const cmd = commands[i]
            if (!cmd || !cmd.parameters) continue

            switch (cmd.code) {
                case 401: // Show Text content line
                case 405: // Show Scrolling Text content line
                    if (cmd.parameters[0] && typeof cmd.parameters[0] === 'string' && cmd.parameters[0].trim()) {
                        texts.push(cmd.parameters[0])
                    }
                    break

                case 102: // Show Choices
                    if (Array.isArray(cmd.parameters[0])) {
                        for (const choice of cmd.parameters[0]) {
                            if (choice && typeof choice === 'string' && choice.trim()) {
                                texts.push(choice)
                            }
                        }
                    }
                    break

                case 320: // Change Actor Name
                case 324: // Change Actor Nickname
                    if (cmd.parameters[1] && typeof cmd.parameters[1] === 'string' && cmd.parameters[1].trim()) {
                        texts.push(cmd.parameters[1])
                    }
                    break

                case 325: // Change Profile
                    if (cmd.parameters[1] && typeof cmd.parameters[1] === 'string' && cmd.parameters[1].trim()) {
                        texts.push(cmd.parameters[1])
                    }
                    break

                case 356: // Plugin Command (some games store text here)
                    // Skip — plugin-specific, too variable
                    break
            }
        }

        return texts
    }

    /**
     * Extract dialogue text from Common Events.
     */
    extractCommonEventTexts() {
        const texts = []
        if (!window.$dataCommonEvents) return texts

        for (const event of window.$dataCommonEvents) {
            if (!event || !event.list) continue
            texts.push(...this.extractEventCommandTexts(event.list))

            // Also translate the common event name
            if (event.name && typeof event.name === 'string' && event.name.trim()) {
                texts.push(event.name)
            }
        }

        console.log(`[Translator] Extracted ${texts.length} strings from Common Events`)
        return texts
    }

    /**
     * Extract dialogue text from ALL map JSON files.
     * Reads MapXXX.json files from the game's data directory.
     */
    async extractAllEventDialogues() {
        const allTexts = []

        // Only works in NW.js (desktop) environment
        if (!Utils.isNwjs()) {
            console.warn('[Translator] Event dialogue extraction requires NW.js (desktop game)')
            return allTexts
        }

        try {
            const fs = require('fs')
            const path = require('path')

            // Determine the data directory
            const isMV = Utils.RPGMAKER_NAME === 'MV'
            const baseDir = isMV ? 'www' : '.'
            const dataDir = path.join(baseDir, 'data')

            if (!fs.existsSync(dataDir)) {
                console.warn(`[Translator] Data directory not found: ${dataDir}`)
                return allTexts
            }

            // Find all MapXXX.json files
            const files = fs.readdirSync(dataDir)
            const mapFiles = files.filter(f => /^Map\d+\.json$/i.test(f))

            console.log(`[Translator] Found ${mapFiles.length} map files to scan`)

            for (let fileIdx = 0; fileIdx < mapFiles.length; fileIdx++) {
                const mapFile = mapFiles[fileIdx]
                TRANSLATE_PROGRESS.update(true, 0, `Scanning ${mapFile} (${fileIdx + 1}/${mapFiles.length})...`)

                try {
                    const filePath = path.join(dataDir, mapFile)
                    const mapData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

                    // Map display name
                    if (mapData.displayName && typeof mapData.displayName === 'string' && mapData.displayName.trim()) {
                        allTexts.push(mapData.displayName)
                    }

                    // Extract from all events on this map
                    if (mapData.events) {
                        for (const event of mapData.events) {
                            if (!event || !event.pages) continue

                            // Event name (sometimes used for display)
                            // if (event.name && event.name.trim()) allTexts.push(event.name)

                            for (const page of event.pages) {
                                if (!page || !page.list) continue
                                allTexts.push(...this.extractEventCommandTexts(page.list))
                            }
                        }
                    }
                } catch (err) {
                    console.warn(`[Translator] Failed to read ${mapFile}:`, err.message)
                }
            }

            // Also extract from Troops (battle events)
            try {
                const troopsPath = path.join(dataDir, 'Troops.json')
                if (fs.existsSync(troopsPath)) {
                    const troopsData = JSON.parse(fs.readFileSync(troopsPath, 'utf-8'))
                    for (const troop of troopsData) {
                        if (!troop || !troop.pages) continue
                        for (const page of troop.pages) {
                            if (!page || !page.list) continue
                            allTexts.push(...this.extractEventCommandTexts(page.list))
                        }
                    }
                    console.log(`[Translator] Also scanned Troops.json for battle events`)
                }
            } catch (err) {
                console.warn('[Translator] Failed to scan Troops.json:', err.message)
            }

            console.log(`[Translator] Extracted ${allTexts.length} dialogue strings from ${mapFiles.length} maps`)
        } catch (err) {
            console.error('[Translator] Failed to scan map files:', err)
        }

        return allTexts
    }
}


class TranslateSettings {
    constructor() {
        this.kvStorage = new KeyValueStorage('./www/cheat-settings/translate.json')
        this.__readSettings()
    }

    __readSettings() {
        const json = this.kvStorage.getItem('data')

        if (!json) {
            this.data = {
                enabled: false,

                endPointSelection: 'lingva',

                customEndPointData: {
                    method: 'get',
                    urlPattern: `http://localhost:5000/translate?text=${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
                    body: ''
                },

                targets: {
                    items: true,
                    weapons: true,
                    armors: true,
                    skills: true,
                    states: true,
                    classes: true,
                    enemies: true,
                    variables: true,
                    switches: true,
                    maps: true,
                    actors: true,
                    system: true,
                    dialogues: true,
                },

                bulkTranslateChunkSize: 10
            }
            return
        }

        this.data = JSON.parse(json)

        // Backwards compatibility: add new target keys if missing from old settings
        if (this.data.targets) {
            if (this.data.targets.actors === undefined) this.data.targets.actors = true
            if (this.data.targets.system === undefined) this.data.targets.system = true
            if (this.data.targets.dialogues === undefined) this.data.targets.dialogues = true
        }
    }

    __writeSettings() {
        this.kvStorage.setItem('data', JSON.stringify(this.data))
    }

    getEndPointData() {
        if (this.getEndPointSelection() === 'custom') {
            return this.getCustomEndPointData()
        }

        return DEFAULT_END_POINTS[this.getEndPointSelection()].data
    }

    setEnabled(flag) {
        this.data.enabled = flag
        this.__writeSettings()
    }

    isEnabled() {
        return this.data.enabled
    }


    getEndPointSelection() {
        return this.data.endPointSelection
    }

    setEndPointSelection(endPointId) {
        this.data.endPointSelection = endPointId
        this.__writeSettings()
    }

    getCustomEndPointData() {
        return this.data.customEndPointData
    }

    setCustomEndPointMethod(method) {
        this.data.customEndPointData.method = method
        this.__writeSettings()
    }

    setCustomEndPointUrlPattern(urlPattern) {
        this.data.customEndPointData.urlPattern = urlPattern
        this.__writeSettings()
    }

    setCustomEndPointBody(body) {
        this.data.customEndPointData.body = body
        this.__writeSettings()
    }

    getBulkTranslateChunkSize() {
        return this.data.bulkTranslateChunkSize
    }

    setBulkTranslateChunkSize(chunkSize) {
        this.data.bulkTranslateChunkSize = chunkSize
        this.__writeSettings()
    }

    getTargets() {
        return this.data.targets
    }

    setTargets(targets) {
        this.data.targets = targets
        this.__writeSettings()
    }

    isItemTranslateEnabled() {
        return this.isEnabled() && this.getTargets().items
    }

    isWeaponTranslateEnabled() {
        return this.isEnabled() && this.getTargets().weapons
    }

    isArmorTranslateEnabled() {
        return this.isEnabled() && this.getTargets().armors
    }

    isSkillTranslateEnabled() {
        return this.isEnabled() && this.getTargets().skills
    }

    isStateTranslateEnabled() {
        return this.isEnabled() && this.getTargets().states
    }

    isClassTranslateEnabled() {
        return this.isEnabled() && this.getTargets().classes
    }

    isEnemyTranslateEnabled() {
        return this.isEnabled() && this.getTargets().enemies
    }

    isVariableTranslateEnabled() {
        return this.isEnabled() && this.getTargets().variables
    }

    isSwitchTranslateEnabled() {
        return this.isEnabled() && this.getTargets().switches
    }

    isMapTranslateEnabled() {
        return this.isEnabled() && this.getTargets().maps
    }

    isActorTranslateEnabled() {
        return this.isEnabled() && this.getTargets().actors
    }

    isSystemTranslateEnabled() {
        return this.isEnabled() && this.getTargets().system
    }

    isDialogueTranslateEnabled() {
        return this.isEnabled() && this.getTargets().dialogues
    }
}

export const TRANSLATE_PROGRESS = {
    isTranslating: false,
    progress: 0,
    text: '',
    callbacks: [],

    update(isTranslating, progress, text) {
        this.isTranslating = isTranslating;
        this.progress = progress;
        this.text = text;
        this.callbacks.forEach(cb => cb(this));
    },

    subscribe(cb) {
        this.callbacks.push(cb);
    },

    unsubscribe(cb) {
        this.callbacks = this.callbacks.filter(c => c !== cb);
    }
}

export const TRANSLATE_SETTINGS = new TranslateSettings()
export const TRANSLATOR = new Translator(TRANSLATE_SETTINGS)

// Initialize translation bank cleanup on load
setTimeout(() => {
    TRANSLATION_BANK.clearOldEntries()
}, 1000)
