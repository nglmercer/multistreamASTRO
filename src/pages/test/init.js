// index.js - Archivo de demostración para la integración de la lista negra
import { BlacklistChecker } from './blacklist-middleware.js';
import { IndexedDBManager, DBObserver } from './idb.js';

// Configuración de la base de datos
const dbConfig = {
  name: 'blacklistDB',
  version: 1,
  store: 'blacklistedItems'
};

// Inicializar observador y gestor de base de datos
const dbObserver = new DBObserver();
const dbManager = new IndexedDBManager(dbConfig, dbObserver);

// Función para poblar la base de datos con datos de ejemplo
async function populateSampleData() {
  console.log('Checking if sample data needs to be added...');
  
  try {
    // Verificar si ya hay datos en la base de datos
    const existingData = await dbManager.getAllData();
    
    if (existingData.length === 0) {
      console.log('No existing data found. Adding sample data...');
      
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      
      const lastWeek = new Date();
      lastWeek.setDate(today.getDate() - 7);
      
      // Datos de ejemplo
      const sampleItems = [
        {
          name: 'Spam IP Address',
          value: '192.168.1.100',
          type: 'ip',
          description: 'Known spam source',
          banType: 'permanent',
          banStartDate: today.toISOString().split('T')[0]
        },
        {
          name: 'Temporary Blocked User',
          value: 'user123',
          type: 'user',
          description: 'Violated terms of service',
          banType: 'temporary',
          banStartDate: today.toISOString().split('T')[0],
          banEndDate: nextWeek.toISOString().split('T')[0]
        },
        {
          name: 'Malicious Domain',
          value: 'malware.site',
          type: 'domain',
          description: 'Distributes malware',
          banType: 'permanent',
          banStartDate: today.toISOString().split('T')[0]
        },
        {
          name: 'Expired Ban',
          value: '10.0.0.1',
          type: 'ip',
          description: 'Temporary block that has expired',
          banType: 'temporary',
          banStartDate: lastWeek.toISOString().split('T')[0],
          banEndDate: today.toISOString().split('T')[0]
        },
        {
          name: 'Short Term Block',
          value: 'alice',
          type: 'user',
          description: 'Spam comments',
          banType: 'temporary',
          banStartDate: today.toISOString().split('T')[0],
          banEndDate: tomorrow.toISOString().split('T')[0]
        },
        {
          name: 'Blocked Keyword',
          value: 'hack',
          type: 'keyword',
          description: 'Potentially malicious keyword',
          banType: 'permanent',
          banStartDate: today.toISOString().split('T')[0]
        }
      ];
      
      // Guardar cada elemento en la base de datos
      for (const item of sampleItems) {
        await dbManager.saveData(item);
        console.log(`Added sample item: ${item.name}`);
      }
      
      console.log('Sample data added successfully!');
    } else {
      console.log(`Database already contains ${existingData.length} items. Skipping sample data.`);
    }
  } catch (error) {
    console.error('Error populating sample data:', error);
  }
}

// Función para iniciar una simulación de tráfico en segundo plano
async function runBackgroundSimulation() {
  const checker = new BlacklistChecker();
  
  // Simular solicitudes periódicas
  setInterval(async () => {
    // Generar una IP de cierto rango no bloqueado del uno al 10
    const numberONETOFIVE = Math.floor(Math.random() * 5);
    const ip = `192.168.111.${numberONETOFIVE}`;
    
    // Verificar si está bloqueada
    const result = await checker.isBlocked(ip, 'ip');
    
    // Registrar en la consola con un estilo diferente para distinguirlo
    console.log('%c[Background Simulation] IP Check: ' + ip, 
      'color: ' + (result.blocked ? '#ff5252' : '#4caf50'), 
      result.blocked ? 'BLOCKED' : 'ALLOWED');
  }, 10000); // Ejecutar cada 10 segundos
  
  // Simular solicitudes con datos de ejemplo cada minuto
  const sampleUsers = ['user123', 'admin', 'john_doe', 'alice', 'malicious_user'];
  const sampleDomains = ['example.com', 'test.org', 'malware.site', 'google.com'];
  
  setInterval(async () => {
    // Seleccionar un usuario aleatorio
    const userId = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
    // Seleccionar un dominio aleatorio
    const domain = sampleDomains[Math.floor(Math.random() * sampleDomains.length)];
    
    const requestData = {
      ip: `10.0.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
      userId,
      domain,
      content: Math.random() > 0.8 ? 'This contains the hack keyword' : 'Normal content here'
    };
    
    console.log('%c[Background Simulation] Complex Request', 'color: #2196f3', requestData);
    
    const result = await checker.checkRequest(requestData);
    
    console.log('%c[Background Simulation] Request Result: ' + (result.blocked ? 'BLOCKED' : 'ALLOWED'), 
      'color: ' + (result.blocked ? '#ff5252' : '#4caf50'),
      result);
  }, 60000); // Ejecutar cada minuto
}
populateSampleData();
runBackgroundSimulation();