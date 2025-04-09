/**
 * Clase base para clasificar datos de usuarios provenientes de diferentes proveedores.
 * Permite definir reglas de clasificación basadas en la estructura de datos específica de cada proveedor.
 */
class UserClassifier {
    /**
     * Constructor de la clase UserClassifier.
     * @param {string} classifierName - Un nombre descriptivo para este clasificador (útil para debugging/logging).
     */
    constructor(classifierName) {
      this.classifierName = classifierName;
      this.rules = []; // Inicializa el array de reglas.
    }
  
    /**
     * Agrega una regla de clasificación para un proveedor específico.
     * @param {object} rule - Objeto que define la regla de clasificación.
     *                          Debe tener la siguiente estructura:
     *                          {
     *                              provider: string,  // Nombre del proveedor.
     *                              keys: string[],    // Array de keys a buscar en los datos del usuario.
     *                              conditions: object[], // Array de condiciones (ver documentación de `classifyUser`).
     *                          }
     */
    addRule(rule) {
      if (!rule || typeof rule !== 'object') {
        console.warn(`[${this.classifierName}] addRule: Regla inválida proporcionada. Se ignorará.`);
        return;
      }
  
      if (!rule.provider || typeof rule.provider !== 'string') {
        console.warn(`[${this.classifierName}] addRule: La regla no tiene un 'provider' válido. Se ignorará.`);
        return;
      }
  
      if (!rule.keys || !Array.isArray(rule.keys)) {
        console.warn(`[${this.classifierName}] addRule: La regla no tiene 'keys' válidas. Se ignorará.`);
        return;
      }
  
      if (!rule.conditions || !Array.isArray(rule.conditions)) {
        console.warn(`[${this.classifierName}] addRule: La regla no tiene 'conditions' válidas. Se ignorará.`);
        return;
      }
  
      this.rules.push(rule);
    }
  
    /**
     * Clasifica un usuario basándose en los datos proporcionados y las reglas configuradas.
     * @param {object} userData - Objeto con datos del usuario (proveniente de uno de los proveedores).
     * @param {string} providerName - Nombre del proveedor de datos.
     * @returns {object|null} - Objeto con las propiedades de clasificación (ej. { isModerator: true, isVip: false }).
     *                           Retorna `null` si no se puede clasificar al usuario.
     */
    classifyUser(userData, providerName) {
      if (!userData || typeof userData !== 'object') {
        console.warn(`[${this.classifierName}] classifyUser: Datos de usuario inválidos del proveedor ${providerName}.  Recibido:`, userData);
        return null;
      }
  
      const classifications = {}; // Inicializa un objeto vacío para las clasificaciones.
  
      // Encuentra las reglas correspondientes al proveedor actual
      const providerRules = this.rules.find(rule => rule.provider === providerName);
  
      if (!providerRules) {
        console.warn(`[${this.classifierName}] classifyUser: No se encontraron reglas para el proveedor ${providerName}.`);
        return null;
      }
  
      // Itera sobre las condiciones y aplica las clasificaciones
      for (const condition of providerRules.conditions) {
        if (userData.hasOwnProperty(condition.key) && userData[condition.key] === condition.value) {
          // Define la propiedad en el objeto classifications.  Si ya existe, la sobrescribe.
          classifications[condition.classification] = true;
        }
      }
  
  
      // Verifica si alguna clasificación se estableció (si el objeto no está vacío).
      if (Object.keys(classifications).length > 0) {
        return classifications; // Retorna el objeto de clasificación si al menos una propiedad fue establecida.
      } else {
        return null; // Retorna null si no se pudo clasificar al usuario.
      }
    }
  }
  
  // Ejemplo de uso:
  
  // 1. Crear una instancia del clasificador
  const userClassifier = new UserClassifier("MyUserClassifier");
  
  // 2. Agregar reglas para diferentes proveedores
  userClassifier.addRule({
    provider: "ProveedorA",
    keys: ["role", "user_level"],
    conditions: [
      { key: "role", value: "moderator", classification: "isModerator" },
      { key: "user_level", value: "admin", classification: "isOwner" },
      { key: "role", value: "vip", classification: "isVip" },
    ],
  });
  
  userClassifier.addRule({
    provider: "ProveedorB",
    keys: ["access_level", "premium"],
    conditions: [
      { key: "access_level", value: "moderator", classification: "isModerator" },
      { key: "access_level", value: "owner", classification: "isOwner" },
      { key: "premium", value: true, classification: "isVip" },
    ],
  });
  
  // 3. Clasificar usuarios con diferentes datos y proveedores
  const userDataA = { role: "moderator", name: "Alice" };
  const userDataB = { access_level: "owner", email: "bob@example.com" };
  const userDataC = { permissions: "read", account_type: "vip" };
  
  
  const classificationA = userClassifier.classifyUser(userDataA, "ProveedorA");
  const classificationB = userClassifier.classifyUser(userDataB, "ProveedorB");
  const classificationC = userClassifier.classifyUser(userDataC, "ProveedorC"); // No hay regla para "ProveedorC"
  
  console.log("Clasificación A (ProveedorA):", classificationA); // Output: { isModerator: true }
  console.log("Clasificación B (ProveedorB):", classificationB); // Output: { isOwner: true }
  console.log("Clasificación C (ProveedorC):", classificationC); // Output: null
  
  
  
  // Ejemplo con un clasificador diferente
  const productClassifier = new UserClassifier("ProductClassifier");
  productClassifier.addRule({
    provider: "ProveedorProductos",
    keys: ["type", "price"],
    conditions: [
      { key: "type", value: "electronic", classification: "isElectronic" },
      { key: "price", value: "expensive", classification: "isHighPriced" }
    ]
  });
  
  const productData1 = {type: "electronic", price: "expensive"};
  const productClassification = productClassifier.classifyUser(productData1, "ProveedorProductos");
  console.log("Product Classification:", productClassification); // Output: { isElectronic: true, isHighPriced: true }