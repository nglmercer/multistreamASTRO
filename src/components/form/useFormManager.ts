import { ref, reactive, computed, nextTick, onMounted, onUnmounted } from 'vue'
import type { FormData, FormConfig } from '../../config/actionsconfig'
import { defaultFormConfig, defaultData } from '../../config/actionsconfig'

export interface UseFormManagerOptions {
  formId: string
  initialData?: Partial<FormData>
  formConfig?: FormConfig
  onSubmit?: (data: FormData) => void | Promise<void>
  onReset?: () => void
  onChange?: (fieldName: string, value: any, formData: FormData) => void
}

export function useFormManager(options: UseFormManagerOptions) {
  const {
    formId,
    initialData = {},
    formConfig = defaultFormConfig,
    onSubmit,
    onReset,
    onChange
  } = options

  // Estado reactivo del formulario
  const formData = reactive<FormData>({ ...defaultData, ...initialData })
  const validationErrors = reactive<Record<string, string>>({})
  const isSubmitting = ref(false)
  const isValid = ref(true)

  // Referencias DOM
  const formElement = ref<HTMLElement | null>(null)

  // Función para parsear valores según el tipo
  function parseValueByType(value: any, type: string): any {
    if (!value && value !== '0' && value !== 0) {
      return type === 'number' ? null : ''
    }
    
    switch (type) {
      case 'switch':
      case 'checkbox':
      case 'boolean':
        return coerceToBoolean(value)
      case 'number':
      case 'range':
        const num = Number(value)
        return isNaN(num) ? null : num
      default:
        return String(value)
    }
  }

  function coerceToBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      return !['false', '0', '', 'null', 'undefined'].includes(value.toLowerCase())
    }
    return Boolean(value)
  }

  // Función para evaluar condiciones de visibilidad
  function evaluateShowCondition(condition: any): boolean {
    if (!condition?.field) return true
    
    const triggerValue = formData[condition.field as keyof FormData]
    const expectedValue = condition.value
    const negate = condition.negate === true
    
    let matches: boolean
    if (Array.isArray(expectedValue)) {
      matches = expectedValue.some(val => compareValues(triggerValue, val))
    } else {
      matches = compareValues(triggerValue, expectedValue)
    }
    
    return negate ? !matches : matches
  }

  function compareValues(actual: any, expected: any): boolean {
    // Comparación para booleanos
    if (typeof expected === 'boolean') {
      const actualBool = coerceToBoolean(actual)
      return String(actualBool) === String(expected)
    }
    
    // Comparación para null/undefined
    if (actual == null) {
      return expected == null || expected === ''
    }
    
    // Comparación de strings
    return String(actual) === String(expected)
  }

  // Computed para campos visibles
  const visibleFields = computed(() => {
    return Object.entries(formConfig).filter(([fieldKey, fieldConfig]) => {
      if (fieldConfig.hidden) return false
      if (!fieldConfig.showIf) return true
      return evaluateShowCondition(fieldConfig.showIf)
    })
  })

  // Función para actualizar un campo
  function updateField(fieldName: string, value: any) {
    const oldValue = formData[fieldName as keyof FormData]
    ;(formData as any)[fieldName] = value
    
    // Limpiar error de validación si existe
    if (validationErrors[fieldName]) {
      delete validationErrors[fieldName]
    }
    
    // Llamar callback de cambio
    if (onChange) {
      onChange(fieldName, value, formData)
    }
  }

  // Función para validar un campo
  function validateField(fieldName: string): boolean {
    const fieldConfig = formConfig[fieldName]
    if (!fieldConfig) return true
    
    const value = formData[fieldName as keyof FormData]
    
    // Validación de campo requerido
    if (fieldConfig.required && (!value && value !== 0)) {
      validationErrors[fieldName] = 'Este campo es requerido'
      return false
    }
    
    // Validación de patrón
    if (fieldConfig.pattern && value) {
      const regex = new RegExp(fieldConfig.pattern)
      if (!regex.test(String(value))) {
        validationErrors[fieldName] = 'El formato no es válido'
        return false
      }
    }
    
    // Validación de rango para números
    if (fieldConfig.type === 'number' && value !== null && value !== '') {
      const numValue = Number(value)
      if (fieldConfig.min !== undefined && numValue < fieldConfig.min) {
        validationErrors[fieldName] = `El valor mínimo es ${fieldConfig.min}`
        return false
      }
      if (fieldConfig.max !== undefined && numValue > fieldConfig.max) {
        validationErrors[fieldName] = `El valor máximo es ${fieldConfig.max}`
        return false
      }
    }
    
    return true
  }

  // Función para validar todo el formulario
  function validateForm(): boolean {
    let formIsValid = true
    
    // Limpiar errores previos
    Object.keys(validationErrors).forEach(key => {
      delete validationErrors[key]
    })
    
    // Validar solo campos visibles
    visibleFields.value.forEach(([fieldName]) => {
      if (!validateField(fieldName)) {
        formIsValid = false
      }
    })
    
    isValid.value = formIsValid
    return formIsValid
  }

  // Función para enviar el formulario
  async function submitForm() {
    if (isSubmitting.value) return
    
    if (!validateForm()) {
      console.warn('Formulario inválido')
      return
    }
    
    isSubmitting.value = true
    
    try {
      if (onSubmit) {
        await onSubmit(formData)
      }
    } catch (error) {
      console.error('Error al enviar formulario:', error)
    } finally {
      isSubmitting.value = false
    }
  }

  // Función para resetear el formulario
  function resetForm() {
    // Resetear datos
    Object.keys(formData).forEach(key => {
      if (key in defaultData) {
        const typedKey = key as keyof FormData;
        (formData[typedKey] as any) = (defaultData as any)[typedKey];
      }
    })
    
    // Limpiar errores
    Object.keys(validationErrors).forEach(key => {
      delete validationErrors[key]
    })
    
    isValid.value = true
    
    // Resetear web components
    if (formElement.value) {
      const inputs = formElement.value.querySelectorAll('c-input')
      inputs.forEach((input: any) => {
        if (input.reset) {
          input.reset()
        }
      })
    }
    
    if (onReset) {
      onReset()
    }
  }

  // Función para establecer datos del formulario
  function setFormData(data: Partial<FormData>) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in formData) {
        ;(formData as any)[key] = value
      }
    })
    
    // Actualizar web components
    nextTick(() => {
      if (formElement.value) {
        const inputs = formElement.value.querySelectorAll('c-input')
        inputs.forEach((input: any) => {
          const fieldName = input.getAttribute('data-field-name')
          if (fieldName && data[fieldName as keyof FormData] !== undefined) {
            if (input.setVal) {
              input.setVal(data[fieldName as keyof FormData])
            }
          }
        })
      }
    })
  }

  // Event listeners para web components
  function setupEventListeners() {
    if (!formElement.value) return
    
    const handleInputChange = (event: Event) => {
      const target = event.target as any
      if (target.tagName === 'C-INPUT') {
        const fieldName = target.getAttribute('data-field-name')
        if (fieldName) {
          const value = target.getVal ? target.getVal() : target.value
          updateField(fieldName, value)
        }
      }
    }
    
    formElement.value.addEventListener('change', handleInputChange)
    formElement.value.addEventListener('input', handleInputChange)
    
    return () => {
      if (formElement.value) {
        formElement.value.removeEventListener('change', handleInputChange)
        formElement.value.removeEventListener('input', handleInputChange)
      }
    }
  }

  // Lifecycle hooks
  onMounted(() => {
    const cleanup = setupEventListeners()
    onUnmounted(() => {
      if (cleanup) cleanup()
    })
  })

  return {
    // Estado reactivo
    formData,
    validationErrors,
    isSubmitting,
    isValid,
    visibleFields,
    
    // Referencias
    formElement,
    
    // Métodos
    updateField,
    validateField,
    validateForm,
    submitForm,
    resetForm,
    setFormData,
    
    // Utilidades
    parseValueByType,
    evaluateShowCondition
  }
}