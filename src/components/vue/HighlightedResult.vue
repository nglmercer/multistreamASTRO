<template>
  <div class="highlighted-result-container">
    <div class="test-result-output success highlighted">
      <div v-if="formattedContent.type === 'json'" class="json-container">
        <div 
          v-for="(line, index) in formattedContent.lines" 
          :key="index"
          class="json-line"
        >
          <span class="line-number">{{ index + 1 }}</span>
          <span class="json-content" v-html="processText(line)"></span>
        </div>
      </div>
      <div v-else class="text-content" v-html="processText(formattedContent.content)"></div>
    </div>
    
    <!-- Color legend -->
    <div v-if="replacementMap && replacementMap.size > 0" class="replacement-legend">
      <div class="legend-title">Valores Reemplazados:</div>
      <div class="legend-items">
        <div 
          v-for="([replacedValue, info], index) in replacementEntries" 
          :key="index"
          class="legend-item"
        >
          <span class="legend-text">
            <code>"{{ info.original }}"</code> → <strong>"{{ replacedValue }}"</strong>
            <small> ({{ info.dataKey }})</small>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import './HighlightedResult.css'

type ReplacementInfo = {
  original: string;
  dataKey: string;
};

const props = defineProps<{
  result: string;
  replacementMap: Map<string, ReplacementInfo>;
}>();

// Helper function to escape special characters in regex
const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Function to process text and highlight replaced values
const processText = (text:string) => {
  if (!text || !props.replacementMap || props.replacementMap.size === 0) {
    return text
  }

  const replacements: {
    start: number;
    end: number;
    value: string;
    original: string;
    dataKey: string;
  }[] = []
  
  // Create a map of all values that were replaced
  props.replacementMap.forEach((info, replacedValue) => {
    const regex = new RegExp(`(${escapeRegExp(replacedValue)})`, 'g');
    let match;

    while ((match = regex.exec(text)) !== null) {
      replacements.push({
        start: match.index,
        end: match.index + match[1].length,
        value: match[1],
        original: (info as ReplacementInfo).original,
        dataKey: (info as ReplacementInfo).dataKey
      });
    }
  });
  // Sort replacements by position to process them correctly
  replacements.sort((a, b) => a.start - b.start)

  // If no replacements, return normal text
  if (replacements.length === 0) {
    return text
  }

  // Build HTML string with highlighting
  let result = ''
  let lastIndex = 0

  replacements.forEach((replacement, index) => {
    // Add text before the replacement
    if (replacement.start > lastIndex) {
      result += text.slice(lastIndex, replacement.start)
    }

    // Add the replaced value with highlighting
    result += `<span 
      class="highlighted-value" 
      title="Original: &quot;${replacement.original}&quot; → DataKey: &quot;${replacement.dataKey}&quot;"
      data-original="${replacement.original}"
      data-datakey="${replacement.dataKey}"
    >${replacement.value}</span>`

    lastIndex = replacement.end
  })

  // Add the rest of the text
  if (lastIndex < text.length) {
    result += text.slice(lastIndex)
  }

  return result
}

// Reactive computed property for formatted content
const formattedContent = computed(() => {
  console.log('HighlightedResult re-rendering with:', {
    result: props.result,
    mapSize: props.replacementMap?.size || 0
  })

  try {
    // Try to parse to verify if it's valid JSON
    const parsed = JSON.parse(props.result)
    
    // Format JSON with indentation
    const formatted = JSON.stringify(parsed, null, 2)
    
    // Split into lines to process each one
    const lines = formatted.split('\n')
    
    return {
        type: 'json',
        lines: lines,
        content: formatted
    }
  } catch (e) {
    // If not valid JSON, process as normal text
    return {
      type: 'text',
      content: props.result
    }
  }
})

// Reactive computed property for replacement map entries
const replacementEntries = computed(() => {
  if (!props.replacementMap || props.replacementMap.size === 0) {
    return []
  }
  return Array.from(props.replacementMap.entries())
})
</script>

<style scoped>
@import './HighlightedResult.css';
</style>