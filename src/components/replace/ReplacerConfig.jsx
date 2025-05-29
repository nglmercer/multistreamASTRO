// ReplacerConfig.jsx - Componente Principal
import { createSignal, createEffect } from 'solid-js';
import './ReplacerConfig.css';
import { ConfigurableReplacer } from './ConfigurableReplacer';
import TestReplacer from './TestReplacer';
import ReplacerConfigForm from './ReplacerConfigForm';

export default function ReplacerConfig() {
  const [instanceId, setInstanceId] = createSignal("default");
  const [removeBackslashes, setRemoveBackslashes] = createSignal(true);
  const [useLocalStorage, setUseLocalStorage] = createSignal(true);
  const [replacements, setReplacements] = createSignal([]);

  // Inicializar con valores por defecto
  createEffect(() => {
    const tempReplacer = new ConfigurableReplacer();
    const defaultReplacements = Object.entries(tempReplacer.getDefaultReplacements()).map(([pattern, config]) => ({
      id: Date.now() + Math.random(),
      pattern,
      dataKey: config.dataKey,
      defaultValue: config.defaultValue
    }));
    setReplacements(defaultReplacements);
    loadSavedConfig();
  });

  const loadSavedConfig = () => {
    try {
      const savedConfig = localStorage.getItem(`configReplacer_${instanceId()}`);
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        setInstanceId(config.instanceId || "default");
        setRemoveBackslashes(config.removeBackslashes === undefined ? true : config.removeBackslashes);
        setUseLocalStorage(config.useLocalStorage === undefined ? true : config.useLocalStorage);
        
        if (config.replacements) {
          const loadedReplacements = Object.entries(config.replacements).map(([pattern, options]) => ({
            id: Date.now() + Math.random(),
            pattern,
            dataKey: options.dataKey,
            defaultValue: options.defaultValue
          }));
          setReplacements(loadedReplacements);
        }
      }
    } catch (e) {
      console.error('Error loading saved config:', e);
    }
  };

  return (
    <div class="replacer-app-container">
      <div class="config-card">
        <div class="config-card-header">
          <h1 class="main-title">Configurador de Reemplazos</h1>
          <p class="subtitle">Gestiona patrones de reemplazo dinámicamente con SolidJS</p>
        </div>
        
        <div class="config-card-body">
          {/* Componente de Pruebas */}
          <TestReplacer 
            instanceId={instanceId()}
            removeBackslashes={removeBackslashes()}
            useLocalStorage={useLocalStorage()}
            replacements={replacements()}
          />

          {/* Componente del Formulario */}
          <ReplacerConfigForm
            instanceId={instanceId()}
            removeBackslashes={removeBackslashes()}
            useLocalStorage={useLocalStorage()}
            replacements={replacements()}
            onInstanceIdChange={setInstanceId}
            onRemoveBackslashesChange={setRemoveBackslashes}
            onUseLocalStorageChange={setUseLocalStorage}
            onReplacementsChange={setReplacements}
          />
        </div>
      </div>
    </div>
  );
}