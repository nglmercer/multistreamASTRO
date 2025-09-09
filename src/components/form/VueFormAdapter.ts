import type { FormData } from '../../config/actionsconfig'
import { actionEmitter } from '@components/actionsjs/actionemitter.ts'
import { IndexedDBManager, databases } from '../../utils/idb.ts'
import { seleccionarYParsearJSON } from '@utils/jsonbackups/import.ts'
import { exportarJSON } from '@utils/jsonbackups/export.ts'
import { safeParse } from '@utils/jsonutils/safeparse.ts'

/**
 * Adaptador para integrar el componente Vue MainForm con el sistema existente de actions.ts
 * Mantiene la compatibilidad con el código JavaScript legacy
 */
export class VueFormAdapter {
  private actionDatabase: IndexedDBManager
  private vueFormRef: any = null
  private modalElement: any = null

  constructor() {
    this.actionDatabase = new IndexedDBManager(databases.ActionsDB)
    this.setupEventListeners()
    this.handleQueryParams()
  }

  /**
   * Registra la referencia del componente Vue
   */
  registerVueForm(vueFormRef: any) {
    this.vueFormRef = vueFormRef
    console.log('Vue form registered:', vueFormRef)
  }

  /**
   * Registra la referencia del modal
   */
  registerModal(modalElement: any) {
    this.modalElement = modalElement
  }

  /**
   * Abre el modal
   */
  openModal(): void {
    if (!this.modalElement) {
      console.warn('Modal element not found')
      return
    }
    console.log('Opening modal')
    this.modalElement.show()
  }

  /**
   * Cierra el modal
   */
  closeModal(): void {
    if (!this.modalElement) {
      console.warn('Modal element not found')
      return
    }
    this.modalElement.hide()
  }

  /**
   * Resetea el formulario
   */
  resetForm(): void {
    if (this.vueFormRef?.resetForm) {
      this.vueFormRef.resetForm()
      console.log('Form reset')
    }
  }

  /**
   * Obtiene los datos del formulario
   */
  getFormData(): Record<string, any> | null {
    if (!this.vueFormRef?.formData) {
      console.warn('Vue form not available')
      return null
    }

    const formData = { ...this.vueFormRef.formData }
    
    // Obtener elementos adicionales (compatibilidad con código legacy)
    const fetchForm = document.querySelector('#fetchForm_check') as HTMLInputElement
    const fetchConfig = document.querySelector('#fetchForm_config') as any
    const fetchConfigValue = fetchConfig ? (fetchConfig.getConfig?.() || fetchConfig.config) : {}

    return {
      ...formData,
      fetchForm_check: fetchForm?.value || '',
      fetchForm_value: fetchConfigValue || {},
      id: formData.id
    }
  }

  /**
   * Establece los datos del formulario
   */
  setFormData(data: Record<string, any>): void {
    if (!data || Object.keys(data).length === 0) {
      console.warn('No data provided to setFormData')
      return
    }

    try {
      // Establecer datos en el componente Vue
      if (this.vueFormRef?.setFormData) {
        this.vueFormRef.setFormData(data)
      }

      // Configurar elementos adicionales (compatibilidad con código legacy)
      const fetchForm = document.querySelector('#fetchForm_check') as any
      if (fetchForm?.setVal) {
        fetchForm.setVal(data.fetchForm_check)
      }

      const fetchConfig = document.querySelector('#fetchForm_config') as any
      if (fetchConfig?.setConfig) {
        fetchConfig.setConfig(data.fetchForm_value || {})
      }

      console.log('Form data set successfully:', data)
    } catch (error) {
      console.error('Error setting form data:', error)
    }
  }

  /**
   * Maneja el envío del formulario
   */
  async handleSubmit(formData: FormData): Promise<void> {
    try {
      const data = this.getFormData()
      if (!data) {
        console.error('No form data found')
        return
      }

      if (typeof data.id === 'string') {
        data.id = parseInt(data.id, 10)
      }

      const result = await this.actionDatabase.saveData(data)
      if (result) {
        this.closeModal()
        console.log('Form submitted successfully:', result)
        actionEmitter.emit('actionFormSubmit', result)
      }
    } catch (error) {
      console.error('Error submitting form:', error)
    }
  }

  /**
   * Maneja la exportación de datos
   */
  async handleExport(formData: FormData): Promise<void> {
    try {
      const data = this.getFormData()
      if (!data) {
        console.error('No form data found')
        return
      }

      if (typeof data.id === 'string') {
        data.id = parseInt(data.id, 10)
      }

      const result = await exportarJSON(data, {
        mode: 'download',
        filename: data.name || 'action-export'
      })
      console.log('Export completed:', data)
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  /**
   * Maneja la importación de datos
   */
  async handleImport(): Promise<void> {
    try {
      const result = await seleccionarYParsearJSON()
      console.log('Import result:', result)
      if (!result) return
      
      this.setFormData(result)
    } catch (error) {
      console.error('Error importing data:', error)
    }
  }

  /**
   * Configura los event listeners para mantener compatibilidad
   */
  private setupEventListeners(): void {
    // Listener para el botón de abrir modal (compatibilidad)
    document.addEventListener('DOMContentLoaded', () => {
      const actionsDBButton = document.getElementById('ActionsDBButton')
      if (actionsDBButton) {
        actionsDBButton.addEventListener('click', () => {
          this.openModal()
          this.resetForm()
        })
      }
    })
  }

  /**
   * Maneja los parámetros de query para importación automática
   */
  private handleQueryParams(): void {
    const queryParams = new URLSearchParams(window.location.search)
    const queryObject = Object.fromEntries(queryParams.entries())
    
    if (!queryObject || !queryObject.data) return
    
    if (queryObject.import === 'action') {
      // Esperar a que el componente Vue esté listo
      setTimeout(() => {
        this.openModal()
        const queryData = safeParse(queryObject.data)
        this.setFormData(queryData)
        console.log('Auto-imported data:', queryObject, queryData)
      }, 100)
    }
  }
}

// Instancia global del adaptador
export const vueFormAdapter = new VueFormAdapter()

// Exponer funciones globales para compatibilidad con actions.ts
;(window as any).setFormData = (data: Record<string, any>) => vueFormAdapter.setFormData(data)
;(window as any).openModal = () => vueFormAdapter.openModal()
;(window as any).resetForm = () => vueFormAdapter.resetForm()
;(window as any).closeModal = () => vueFormAdapter.closeModal()
;(window as any).getFormData = () => vueFormAdapter.getFormData()

console.log('VueFormAdapter initialized')