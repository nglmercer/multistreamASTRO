<template>
    <section class="config-section">
        <div class="grid responsive-columns gap-10">
            <div class="test-input-group">
                <div class="form-group flex-col">
                    <label for="testInput" class="form-label">Entrada de Prueba</label>
                    <textarea id="testInput" rows="4" v-model="testInput" class="form-textarea"
                        placeholder='Ejemplo: {"usuario": "uniqueId", "mensaje": "comment", "likes": "{likes}"}' />
                </div>
                <div class="form-group flex-col">
                    <label for="testData" class="form-label">Datos de Prueba (JSON)</label>
                    <textarea id="testData" rows="3" v-model="testData" class="form-textarea"
                        placeholder='{"uniqueId": "usuario123", "comment": "¡Hola mundo!", "likeCount": "999"}' />
                </div>
                <button type="button" @click="testReplace" class="button button-info button-full-width">
                    🧪 Probar Reemplazo
                </button>
            </div>

            <div class="test-result-group">
                <label class="form-label">Resultado</label>
                <HighlightedResult v-if="!resultError && testResult" :result="testResult"
                    :replacementMap="replacementMap" />
                <div v-else :class="`test-result-output ${resultError ? 'error' : 'success'}`">
                    {{ testResult || "Resultado aparecerá aquí..." }}
                </div>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
//@ts-ignore
import HighlightedResult from './HighlightedResult.vue'
import { ConfigurableReplacer, type ReplacementOption, type ReplacementConfig, type ReplacementMapping } from '../replace/ConfigurableReplacer'

interface Props {
    replacements: Array<{
        id: string | number
        pattern: {
            defaultValue: string
            dataKey: string
            patternKey: string
        }
    }>
    removeBackslashes?: boolean
    instanceId?: string
}

const props = withDefaults(defineProps<Props>(), {
    removeBackslashes: false,
    instanceId: 'default'
})

const testInput = ref<string>('[{"usuario": "uniqueId", "mensaje": "comment", "likes": "{likes}"},"tanto json como string - uniqueId dio {likes}likes"]')
const testData = ref<string>('{"uniqueId": "usuario123", "comment": "¡Hola mundo!", "likeCount": "999"}')
const testResult = ref<string>("")
const replacementMap = ref<Map<string, ReplacementMapping>>(new Map())
const resultError = ref<boolean>(false)

const replacer = computed(() => {
    const currentReplacements: Record<string, ReplacementOption> = {}

    // Construir el objeto de reemplazos correctamente
    props.replacements.forEach((r) => {
        if (r.pattern.defaultValue?.trim() && r.pattern.dataKey?.trim() && r.pattern.patternKey?.trim()) {
            currentReplacements[r.pattern.patternKey] = {
                dataKey: r.pattern.dataKey,
                defaultValue: r.pattern.defaultValue
            }
        }
    })

    console.log('Current Replacements:', currentReplacements)

    return new ConfigurableReplacer({
        replacements: currentReplacements,
        removeBackslashes: props.removeBackslashes,
        useLocalStorage: true,
        instanceId: props.instanceId
    })
})

const getStorageData = (key: string = "default"): any => {
    if (typeof localStorage === 'undefined') return null
    try {
        const data = localStorage.getItem(`configReplacer_${key}`)
        return data ? JSON.parse(data) : null
    } catch (error) {
        console.error('Error parsing localStorage data:', error)
        return null
    }
}

const testReplace = (): void => {
    try {
        let parsedInput: any
        let testDataObj: Record<string, any> = {}

        if (testData.value.trim()) {
            testDataObj = JSON.parse(testData.value)
        }

        try {
            parsedInput = JSON.parse(testInput.value)
        } catch {
            parsedInput = testInput.value
        }

        console.log('Test Data Object:', testDataObj)
        console.log('Parsed Input:', parsedInput)

        // Usar el replacer reactivo actual
        const currentReplacer = replacer.value
        
        // Cargar datos de localStorage si existen
        const localStorageData = getStorageData(props.instanceId)
        if (localStorageData && typeof localStorageData === 'object') {
            // Fusionar configuración de localStorage
            currentReplacer.config = {
                ...currentReplacer.config,
                ...localStorageData,
                replacements: {
                    ...currentReplacer.config.replacements,
                    ...(localStorageData.replacements || {})
                }
            }
        }

        // Usar el método con tracking para obtener el mapeo de reemplazos
        const { result, replacementMap: newReplacementMap } = currentReplacer.replaceWithTracking(parsedInput, testDataObj)
        
        console.log("Replacement Result:", { result, newReplacementMap })
        console.log("Current Replacer Config:", currentReplacer.config.replacements)
        
        replacementMap.value = newReplacementMap

        if (typeof result === 'object') {
            testResult.value = JSON.stringify(result, null, 2)
        } else {
            testResult.value = String(result)
        }
        resultError.value = false
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        testResult.value = `❌ Error: ${errorMessage}`
        resultError.value = true
        replacementMap.value = new Map()
        console.error('Test Replace Error:', error)
    }
}

onMounted(() => {
    testReplace()
})
</script>