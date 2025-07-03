// TestReplacer.jsx
import { createSignal, createMemo, onMount } from 'solid-js';
import HighlightedResult from './HighlightedResult';
import { ConfigurableReplacer } from './ConfigurableReplacer';

export default function TestReplacer(props) {
  const [testInput, setTestInput] = createSignal('[{"usuario": "uniqueId", "mensaje": "comment", "likes": "{likes}"},"tanto json como string - uniqueId dio {likes}likes"]');
  const [testData, setTestData] = createSignal('{"uniqueId": "usuario123", "comment": "¡Hola mundo!", "likeCount": "999"}');
  const [testResult, setTestResult] = createSignal("");
  const [replacementMap, setReplacementMap] = createSignal(new Map());
  const [resultError, setResultError] = createSignal(false);
  const currentReplacements = {};

  // Crear una instancia reactiva del replacer basada en las props
  const replacer = createMemo(() => {
    props.replacements.forEach(r => {
        if (r.pattern.trim() && r.dataKey.trim()) {
            currentReplacements[r.pattern] = {
            dataKey: r.dataKey,
            defaultValue: r.defaultValue
            };
        }
    });
    return new ConfigurableReplacer({
            replacements: currentReplacements,
            removeBackslashes: props.removeBackslashes,
            useLocalStorage: true
        });
    });
    const getStorageData =(key="default") => {
        if (!localStorage) return null;
        const data = localStorage.getItem(`configReplacer_${key}`);
        return data ? JSON.parse(data) : null;
    };
  const testReplace = () => {
    try {
      let parsedInput;
      let testDataObj = {};
      
      if (testData().trim()) {
        testDataObj = JSON.parse(testData());
      }
      
      try {
        parsedInput = JSON.parse(testInput());
      } catch {
        parsedInput = testInput();
      }

      // Usar la instancia reactiva actual
      const currentReplacer = replacer();
      const localgetStorageData = getStorageData(props.instanceId);
      if (localgetStorageData && typeof localgetStorageData === 'object') {
        currentReplacer.config = localgetStorageData;
      }
      // Usar el método con tracking para obtener mapeo de reemplazos
      const { result, replacementMap: newReplacementMap } = currentReplacer.replaceWithTracking(parsedInput, testDataObj);
      
      setReplacementMap(newReplacementMap);
      
      if (typeof result === 'object') {
        setTestResult(JSON.stringify(result, null, 2));
      } else {
        setTestResult(result);
      }
      setResultError(false);
    } catch (error) {
      setTestResult(`❌ Error: ${error.message}`);
      setResultError(true);
      setReplacementMap(new Map());
    }
  };
  onMount(()=>{
    testReplace();
  })
  return (
    <section class="config-section">
      <div class="grid responsive-columns gap-10">
        <div class="test-input-group">
          <div class="form-group flex-col">
            <label for="testInput" class="form-label">Entrada de Prueba</label>
            <textarea 
              id="testInput"
              rows="4" 
              value={testInput()}
              onInput={(e) => setTestInput(e.target.value)}
              class="form-textarea"
              placeholder='Ejemplo: {"usuario": "uniqueId", "mensaje": "comment", "likes": "{likes}"}'
            />
          </div>
          <div class="form-group flex-col">
            <label for="testData" class="form-label">Datos de Prueba (JSON)</label>
            <textarea
              id="testData" 
              rows="3" 
              value={testData()}
              onInput={(e) => setTestData(e.target.value)}
              class="form-textarea"
              placeholder='{"uniqueId": "usuario123", "comment": "¡Hola mundo!", "likeCount": "999"}'
            />
          </div>
          <button 
            type="button" 
            onClick={testReplace}
            class="button button-primary button-full-width"
          >
            🧪 Probar Reemplazo
          </button>
        </div>
        
        <div class="test-result-group">
          <label class="form-label">Resultado</label>
          {!resultError() && testResult() ? (
            <HighlightedResult 
              result={testResult()} 
              replacementMap={replacementMap()} 
            />
          ) : (
            <div 
              class={`test-result-output ${resultError() ? 'error' : 'success'}`}
            >
              {testResult() || "Resultado aparecerá aquí..."}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}