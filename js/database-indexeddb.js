/**
 * database-indexeddb.js
 * Gestion du stockage des données avec IndexedDB
 * Application de Gestion des Salaires Le Sims
 */

const DB = {
    /**
     * Nom et version de la base de données
     */
    DB_NAME: 'LeSims_SalaryManager',
    DB_VERSION: 1,
    
    /**
     * Objets de stockage (object stores)
     */
    STORES: {
        EMPLOYEES: 'employees',
        SALARIES: 'salaries',
        ADVANCES: 'advances',
        SANCTIONS: 'sanctions',
        DEBTS: 'debts',
        ACTIVITIES: 'activities',
        SETTINGS: 'settings',
    },
    
    /**
     * Instance de la base de données
     */
    db: null,
    
    /**
     * Ouvre la connexion à la base de données
     * @returns {Promise} Promise qui résout avec l'instance de la base de données
     */
    openDB: function() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
                return;
            }
            
            // Vérifier si IndexedDB est disponible
            if (!window.indexedDB) {
                reject('Votre navigateur ne supporte pas IndexedDB. L\'application ne fonctionnera pas correctement.');
                return;
            }
            
            // Ouvrir la base de données
            const request = window.indexedDB.open(this.DB_NAME, this.DB_VERSION);
            
            // Gérer la création/mise à jour de la structure de la base de données
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Créer les object stores s'ils n'existent pas
                if (!db.objectStoreNames.contains(this.STORES.EMPLOYEES)) {
                    const employeesStore = db.createObjectStore(this.STORES.EMPLOYEES, { keyPath: 'id' });
                    employeesStore.createIndex('by_lastName', 'lastName', { unique: false });
                    employeesStore.createIndex('by_position', 'position', { unique: false });
                }
                
                if (!db.objectStoreNames.contains(this.STORES.SALARIES)) {
                    const salariesStore = db.createObjectStore(this.STORES.SALARIES, { keyPath: 'id' });
                    salariesStore.createIndex('by_employeeId', 'employeeId', { unique: false });
                    salariesStore.createIndex('by_paymentDate', 'paymentDate', { unique: false });
                }
                
                if (!db.objectStoreNames.contains(this.STORES.ADVANCES)) {
                    const advancesStore = db.createObjectStore(this.STORES.ADVANCES, { keyPath: 'id' });
                    advancesStore.createIndex('by_employeeId', 'employeeId', { unique: false });
                    advancesStore.createIndex('by_date', 'date', { unique: false });
                    advancesStore.createIndex('by_isPaid', 'isPaid', { unique: false });
                }
                
                if (!db.objectStoreNames.contains(this.STORES.SANCTIONS)) {
                    const sanctionsStore = db.createObjectStore(this.STORES.SANCTIONS, { keyPath: 'id' });
                    sanctionsStore.createIndex('by_employeeId', 'employeeId', { unique: false });
                    sanctionsStore.createIndex('by_date', 'date', { unique: false });
                    sanctionsStore.createIndex('by_type', 'type', { unique: false });
                }
                
                if (!db.objectStoreNames.contains(this.STORES.DEBTS)) {
                    const debtsStore = db.createObjectStore(this.STORES.DEBTS, { keyPath: 'id' });
                    debtsStore.createIndex('by_employeeId', 'employeeId', { unique: false });
                    debtsStore.createIndex('by_date', 'date', { unique: false });
                    debtsStore.createIndex('by_isPaid', 'isPaid', { unique: false });
                    debtsStore.createIndex('by_clientName', 'clientName', { unique: false });
                }
                
                if (!db.objectStoreNames.contains(this.STORES.ACTIVITIES)) {
                    const activitiesStore = db.createObjectStore(this.STORES.ACTIVITIES, { keyPath: 'id' });
                    activitiesStore.createIndex('by_timestamp', 'timestamp', { unique: false });
                    activitiesStore.createIndex('by_type', 'type', { unique: false });
                }
                
                if (!db.objectStoreNames.contains(this.STORES.SETTINGS)) {
                    db.createObjectStore(this.STORES.SETTINGS, { keyPath: 'id' });
                }
            };
            
            // Gérer les erreurs
            request.onerror = (event) => {
                console.error('Erreur lors de l\'ouverture de la base de données:', event.target.error);
                reject(event.target.error);
            };
            
            // Succès de l'ouverture
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
        });
    },
    
    /**
     * Initialise la base de données avec les valeurs par défaut si nécessaire
     */
    init: async function() {
        try {
            // Ouvrir la connexion à la base de données
            await this.openDB();
            
            // Vérifier et initialiser les paramètres
            const settings = await this.settings.get();
            
            if (!settings || Object.keys(settings).length === 0) {
                const defaultSettings = {
                    id: 'app-settings',
                    companyName: 'Le Sims',
                    currency: 'FCFA',
                    workingDays: 26, // Jours travaillés par mois par défaut
                    language: 'fr',
                    dateFormat: 'DD/MM/YYYY',
                    theme: 'dark'
                };
                
                await this.settings.save(defaultSettings);
            }
            
            console.log('Base de données initialisée avec succès');
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'initialisation de la base de données:', error);
            return false;
        }
    },
    
    /**
     * Effectue une opération de lecture sur la base de données
     * @param {string} storeName - Nom de l'object store
     * @param {string} method - Méthode à utiliser (getAll, get, index)
     * @param {any} [param] - Paramètre pour la méthode (clé ou nom d'index)
     * @param {any} [value] - Valeur pour la recherche par index
     * @returns {Promise} Promise qui résout avec les données
     */
    read: function(storeName, method, param = null, value = null) {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await this.openDB();
                const transaction = db.transaction(storeName, 'readonly');
                const store = transaction.objectStore(storeName);
                
                let request;
                
                if (method === 'getAll') {
                    request = store.getAll();
                } else if (method === 'get') {
                    request = store.get(param);
                } else if (method === 'index') {
                    const index = store.index(param);
                    request = index.getAll(value);
                } else {
                    reject(new Error('Méthode non supportée'));
                    return;
                }
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
                
            } catch (error) {
                reject(error);
            }
        });
    },
    
    /**
     * Effectue une opération d'écriture sur la base de données
     * @param {string} storeName - Nom de l'object store
     * @param {string} method - Méthode à utiliser (add, put, delete, clear)
     * @param {any} [data] - Données à écrire
     * @returns {Promise} Promise qui résout avec le résultat
     */
    write: function(storeName, method, data = null) {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await this.openDB();
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                
                let request;
                
                if (method === 'add') {
                    request = store.add(data);
                } else if (method === 'put') {
                    request = store.put(data);
                } else if (method === 'delete') {
                    request = store.delete(data);
                } else if (method === 'clear') {
                    request = store.clear();
                } else {
                    reject(new Error('Méthode non supportée'));
                    return;
                }
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
                
            } catch (error) {
                reject(error);
            }
        });
    },
    
    /**
     * Méthodes CRUD pour les employés
     */
    employees: {
        getAll: async function() {
            try {
                return await DB.read(DB.STORES.EMPLOYEES, 'getAll') || [];
            } catch (error) {
                console.error('Erreur lors de la récupération des employés:', error);
                return [];
            }
        },
        
        getById: async function(id) {
            try {
                return await DB.read(DB.STORES.EMPLOYEES, 'get', id) || null;
            } catch (error) {
                console.error(`Erreur lors de la récupération de l'employé ${id}:`, error);
                return null;
            }
        },
        
        save: async function(employee) {
            try {
                // Génération d'un nouvel ID si l'employé est nouveau
                if (!employee.id) {
                    employee.id = Date.now().toString();
                    employee.createdAt = new Date().toISOString();
                    
                    // Ajouter une activité
                    await DB.activities.add({
                        type: 'add',
                        entity: 'employee',
                        entityId: employee.id,
                        description: `Employé ajouté: ${employee.firstName} ${employee.lastName}`
                    });
                } else {
                    // Mise à jour d'un employé existant
                    employee.updatedAt = new Date().toISOString();
                    
                    // Ajouter une activité
                    await DB.activities.add({
                        type: 'edit',
                        entity: 'employee',
                        entityId: employee.id,
                        description: `Employé modifié: ${employee.firstName} ${employee.lastName}`
                    });
                }
                
                await DB.write(DB.STORES.EMPLOYEES, 'put', employee);
                return employee;
            } catch (error) {
                console.error(`Erreur lors de l'enregistrement de l'employé:`, error);
                return null;
            }
        },
        
        delete: async function(id) {
            try {
                const employeeToDelete = await this.getById(id);
                
                if (!employeeToDelete) return false;
                
                // Ajouter une activité
                await DB.activities.add({
                    type: 'delete',
                    entity: 'employee',
                    entityId: id,
                    description: `Employé supprimé: ${employeeToDelete.firstName} ${employeeToDelete.lastName}`
                });
                
                await DB.write(DB.STORES.EMPLOYEES, 'delete', id);
                return true;
            } catch (error) {
                console.error(`Erreur lors de la suppression de l'employé ${id}:`, error);
                return false;
            }
        },
        
        search: async function(query) {
            if (!query) return this.getAll();
            
            try {
                const employees = await this.getAll();
                query = query.toLowerCase().trim();
                
                return employees.filter(employee => {
                    const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
                    const position = employee.position ? employee.position.toLowerCase() : '';
                    const email = employee.email ? employee.email.toLowerCase() : '';
                    const phone = employee.phone || '';
                    
                    return fullName.includes(query) || 
                           position.includes(query) || 
                           email.includes(query) || 
                           phone.includes(query);
                });
            } catch (error) {
                console.error('Erreur lors de la recherche d\'employés:', error);
                return [];
            }
        }
    },
    
    /**
     * Méthodes CRUD pour les salaires
     */
    salaries: {
        getAll: async function() {
            try {
                return await DB.read(DB.STORES.SALARIES, 'getAll') || [];
            } catch (error) {
                console.error('Erreur lors de la récupération des salaires:', error);
                return [];
            }
        },
        
        getById: async function(id) {
            try {
                return await DB.read(DB.STORES.SALARIES, 'get', id) || null;
            } catch (error) {
                console.error(`Erreur lors de la récupération du salaire ${id}:`, error);
                return null;
            }
        },
        
        getByEmployeeId: async function(employeeId) {
            try {
                const salaries = await this.getAll();
                return salaries.filter(salary => salary.employeeId === employeeId);
            } catch (error) {
                console.error(`Erreur lors de la récupération des salaires de l'employé ${employeeId}:`, error);
                return [];
            }
        },
        
        getByMonth: async function(year, month) {
            try {
                const salaries = await this.getAll();
                return salaries.filter(salary => {
                    const date = new Date(salary.paymentDate);
                    return date.getFullYear() === year && date.getMonth() === month;
                });
            } catch (error) {
                console.error(`Erreur lors de la récupération des salaires pour ${month}/${year}:`, error);
                return [];
            }
        },
        
        save: async function(salary) {
            try {
                // Génération d'un nouvel ID si le salaire est nouveau
                if (!salary.id) {
                    salary.id = Date.now().toString();
                    salary.createdAt = new Date().toISOString();
                    
                    // Ajouter une activité
                    const employee = await DB.employees.getById(salary.employeeId);
                    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Inconnu';
                    
                    await DB.activities.add({
                        type: 'add',
                        entity: 'salary',
                        entityId: salary.id,
                        description: `Salaire enregistré pour ${employeeName} (${new Date(salary.paymentDate).toLocaleDateString()})`
                    });
                } else {
                    // Mise à jour d'un salaire existant
                    salary.updatedAt = new Date().toISOString();
                    
                    // Ajouter une activité
                    const employee = await DB.employees.getById(salary.employeeId);
                    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Inconnu';
                    
                    await DB.activities.add({
                        type: 'edit',
                        entity: 'salary',
                        entityId: salary.id,
                        description: `Salaire modifié pour ${employeeName} (${new Date(salary.paymentDate).toLocaleDateString()})`
                    });
                }
                
                await DB.write(DB.STORES.SALARIES, 'put', salary);
                return salary;
            } catch (error) {
                console.error(`Erreur lors de l'enregistrement du salaire:`, error);
                return null;
            }
        },
        
        delete: async function(id) {
            try {
                const salaryToDelete = await this.getById(id);
                
                if (!salaryToDelete) return false;
                
                // Ajouter une activité
                const employee = await DB.employees.getById(salaryToDelete.employeeId);
                const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Inconnu';
                
                await DB.activities.add({
                    type: 'delete',
                    entity: 'salary',
                    entityId: id,
                    description: `Salaire supprimé pour ${employeeName} (${new Date(salaryToDelete.paymentDate).toLocaleDateString()})`
                });
                
                await DB.write(DB.STORES.SALARIES, 'delete', id);
                return true;
            } catch (error) {
                console.error(`Erreur lors de la suppression du salaire ${id}:`, error);
                return false;
            }
        }
    },
    
    /**
     * Méthodes CRUD pour les avances sur salaire
     */
    advances: {
        getAll: async function() {
            try {
                return await DB.read(DB.STORES.ADVANCES, 'getAll') || [];
            } catch (error) {
                console.error('Erreur lors de la récupération des avances:', error);
                return [];
            }
        },
        
        getById: async function(id) {
            try {
                return await DB.read(DB.STORES.ADVANCES, 'get', id) || null;
            } catch (error) {
                console.error(`Erreur lors de la récupération de l'avance ${id}:`, error);
                return null;
            }
        },
        
        getByEmployeeId: async function(employeeId) {
            try {
                const advances = await this.getAll();
                return advances.filter(advance => advance.employeeId === employeeId);
            } catch (error) {
                console.error(`Erreur lors de la récupération des avances de l'employé ${employeeId}:`, error);
                return [];
            }
        },
        
        getUnpaidByEmployeeId: async function(employeeId) {
            try {
                const advances = await this.getByEmployeeId(employeeId);
                return advances.filter(advance => !advance.isPaid);
            } catch (error) {
                console.error(`Erreur lors de la récupération des avances non remboursées de l'employé ${employeeId}:`, error);
                return [];
            }
        },
        
        getTotalUnpaidByEmployeeId: async function(employeeId) {
            try {
                const unpaidAdvances = await this.getUnpaidByEmployeeId(employeeId);
                return unpaidAdvances.reduce((total, advance) => total + advance.amount, 0);
            } catch (error) {
                console.error(`Erreur lors du calcul du total des avances non remboursées de l'employé ${employeeId}:`, error);
                return 0;
            }
        },
        
        save: async function(advance) {
            try {
                // Génération d'un nouvel ID si l'avance est nouvelle
                if (!advance.id) {
                    advance.id = Date.now().toString();
                    advance.createdAt = new Date().toISOString();
                    advance.isPaid = advance.isPaid || false;
                    
                    // Ajouter une activité
                    const employee = await DB.employees.getById(advance.employeeId);
                    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Inconnu';
                    
                    await DB.activities.add({
                        type: 'add',
                        entity: 'advance',
                        entityId: advance.id,
                        description: `Avance de ${advance.amount} FCFA accordée à ${employeeName}`
                    });
                } else {
                    // Mise à jour d'une avance existante
                    advance.updatedAt = new Date().toISOString();
                    
                    // Ajouter une activité
                    const employee = await DB.employees.getById(advance.employeeId);
                    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Inconnu';
                    
                    const activityDesc = advance.isPaid 
                        ? `Avance de ${advance.amount} FCFA marquée comme remboursée pour ${employeeName}`
                        : `Avance modifiée pour ${employeeName}`;
                    
                    await DB.activities.add({
                        type: 'edit',
                        entity: 'advance',
                        entityId: advance.id,
                        description: activityDesc
                    });
                }
                
                await DB.write(DB.STORES.ADVANCES, 'put', advance);
                return advance;
            } catch (error) {
                console.error(`Erreur lors de l'enregistrement de l'avance:`, error);
                return null;
            }
        },
        
        delete: async function(id) {
            try {
                const advanceToDelete = await this.getById(id);
                
                if (!advanceToDelete) return false;
                
                // Ajouter une activité
                const employee = await DB.employees.getById(advanceToDelete.employeeId);
                const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Inconnu';
                
                await DB.activities.add({
                    type: 'delete',
                    entity: 'advance',
                    entityId: id,
                    description: `Avance de ${advanceToDelete.amount} FCFA supprimée pour ${employeeName}`
                });
                
                await DB.write(DB.STORES.ADVANCES, 'delete', id);
                return true;
            } catch (error) {
                console.error(`Erreur lors de la suppression de l'avance ${id}:`, error);
                return false;
            }
        }
    },
    
    /**
     * Méthodes CRUD pour les sanctions
     */
    sanctions: {
        getAll: async function() {
            try {
                return await DB.read(DB.STORES.SANCTIONS, 'getAll') || [];
            } catch (error) {
                console.error('Erreur lors de la récupération des sanctions:', error);
                return [];
            }
        },
        
        getById: async function(id) {
            try {
                return await DB.read(DB.STORES.SANCTIONS, 'get', id) || null;
            } catch (error) {
                console.error(`Erreur lors de la récupération de la sanction ${id}:`, error);
                return null;
            }
        },
        
        getByEmployeeId: async function(employeeId) {
            try {
                const sanctions = await this.getAll();
                return sanctions.filter(sanction => sanction.employeeId === employeeId);
            } catch (error) {
                console.error(`Erreur lors de la récupération des sanctions de l'employé ${employeeId}:`, error);
                return [];
            }
        },
        
        getByMonth: async function(year, month) {
            try {
                const sanctions = await this.getAll();
                return sanctions.filter(sanction => {
                    const date = new Date(sanction.date);
                    return date.getFullYear() === year && date.getMonth() === month;
                });
            } catch (error) {
                console.error(`Erreur lors de la récupération des sanctions pour ${month}/${year}:`, error);
                return [];
            }
        },
        
        save: async function(sanction) {
            try {
                // Génération d'un nouvel ID si la sanction est nouvelle
                if (!sanction.id) {
                    sanction.id = Date.now().toString();
                    sanction.createdAt = new Date().toISOString();
                    
                    // Ajouter une activité
                    const employee = await DB.employees.getById(sanction.employeeId);
                    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Inconnu';
                    
                    await DB.activities.add({
                        type: 'add',
                        entity: 'sanction',
                        entityId: sanction.id,
                        description: `Sanction de ${sanction.amount} FCFA enregistrée pour ${employeeName}: ${sanction.reason}`
                    });
                } else {
                    // Mise à jour d'une sanction existante
                    sanction.updatedAt = new Date().toISOString();
                    
                    // Ajouter une activité
                    const employee = await DB.employees.getById(sanction.employeeId);
                    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Inconnu';
                    
                    await DB.activities.add({
                        type: 'edit',
                        entity: 'sanction',
                        entityId: sanction.id,
                        description: `Sanction modifiée pour ${employeeName}`
                    });
                }
                
                await DB.write(DB.STORES.SANCTIONS, 'put', sanction);
                return sanction;
            } catch (error) {
                console.error(`Erreur lors de l'enregistrement de la sanction:`, error);
                return null;
            }
        },
        
        delete: async function(id) {
            try {
                const sanctionToDelete = await this.getById(id);
                
                if (!sanctionToDelete) return false;
                
                // Ajouter une activité
                const employee = await DB.employees.getById(sanctionToDelete.employeeId);
                const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Inconnu';
                
                await DB.activities.add({
                    type: 'delete',
                    entity: 'sanction',
                    entityId: id,
                    description: `Sanction supprimée pour ${employeeName}`
                });
                
                await DB.write(DB.STORES.SANCTIONS, 'delete', id);
                return true;
            } catch (error) {
                console.error(`Erreur lors de la suppression de la sanction ${id}:`, error);
                return false;
            }
        }
    },
    
    /**
     * Méthodes CRUD pour les dettes clients
     */
    debts: {
        getAll: async function() {
            try {
                return await DB.read(DB.STORES.DEBTS, 'getAll') || [];
            } catch (error) {
                console.error('Erreur lors de la récupération des dettes:', error);
                return [];
            }
        },
        
        getById: async function(id) {
            try {
                return await DB.read(DB.STORES.DEBTS, 'get', id) || null;
            } catch (error) {
                console.error(`Erreur lors de la récupération de la dette ${id}:`, error);
                return null;
            }
        },
        
        getByEmployeeId: async function(employeeId) {
            try {
                const debts = await this.getAll();
                return debts.filter(debt => debt.employeeId === employeeId);
            } catch (error) {
                console.error(`Erreur lors de la récupération des dettes de l'employé ${employeeId}:`, error);
                return [];
            }
        },
        
        getUnpaidByEmployeeId: async function(employeeId) {
            try {
                const debts = await this.getByEmployeeId(employeeId);
                return debts.filter(debt => !debt.isPaid);
            } catch (error) {
                console.error(`Erreur lors de la récupération des dettes non payées de l'employé ${employeeId}:`, error);
                return [];
            }
        },
        
        getTotalUnpaidByEmployeeId: async function(employeeId) {
            try {
                const unpaidDebts = await this.getUnpaidByEmployeeId(employeeId);
                return unpaidDebts.reduce((total, debt) => total + debt.amount, 0);
            } catch (error) {
                console.error(`Erreur lors du calcul du total des dettes non payées de l'employé ${employeeId}:`, error);
                return 0;
            }
        },
        
        save: async function(debt) {
            try {
                // Génération d'un nouvel ID si la dette est nouvelle
                if (!debt.id) {
                    debt.id = Date.now().toString();
                    debt.createdAt = new Date().toISOString();
                    debt.isPaid = debt.isPaid || false;
                    
                    // Ajouter une activité
                    const employee = await DB.employees.getById(debt.employeeId);
                    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Inconnu';
                    
                    await DB.activities.add({
                        type: 'add',
                        entity: 'debt',
                        entityId: debt.id,
                        description: `Dette client de ${debt.amount} FCFA enregistrée, responsable: ${employeeName}`
                    });
                } else {
                    // Mise à jour d'une dette existante
                    debt.updatedAt = new Date().toISOString();
                    
                    // Ajouter une activité
                    const employee = await DB.employees.getById(debt.employeeId);
                    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Inconnu';
                    
                    const activityDesc = debt.isPaid 
                        ? `Dette client de ${debt.amount} FCFA marquée comme payée (${employeeName})`
                        : `Dette client modifiée (${employeeName})`;
                    
                    await DB.activities.add({
                        type: 'edit',
                        entity: 'debt',
                        entityId: debt.id,
                        description: activityDesc
                    });
                }
                
                await DB.write(DB.STORES.DEBTS, 'put', debt);
                return debt;
            } catch (error) {
                console.error(`Erreur lors de l'enregistrement de la dette:`, error);
                return null;
            }
        },
        
        delete: async function(id) {
            try {
                const debtToDelete = await this.getById(id);
                
                if (!debtToDelete) return false;
                
                // Ajouter une activité
                const employee = await DB.employees.getById(debtToDelete.employeeId);
                const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Inconnu';
                
                await DB.activities.add({
                    type: 'delete',
                    entity: 'debt',
                    entityId: id,
                    description: `Dette client de ${debtToDelete.amount} FCFA supprimée (${employeeName})`
                });
                
                await DB.write(DB.STORES.DEBTS, 'delete', id);
                return true;
            } catch (error) {
                console.error(`Erreur lors de la suppression de la dette ${id}:`, error);
                return false;
            }
        }
    },
    
    /**
     * Méthodes pour les activités récentes
     */
    activities: {
        getAll: async function() {
            try {
                return await DB.read(DB.STORES.ACTIVITIES, 'getAll') || [];
            } catch (error) {
                console.error('Erreur lors de la récupération des activités:', error);
                return [];
            }
        },
        
        getRecent: async function(limit = 10) {
            try {
                const activities = await this.getAll();
                return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
            } catch (error) {
                console.error(`Erreur lors de la récupération des activités récentes:`, error);
                return [];
            }
        },
        
        add: async function(activity) {
            try {
                activity.id = Date.now().toString();
                activity.timestamp = new Date().toISOString();
                
                await DB.write(DB.STORES.ACTIVITIES, 'put', activity);
                
                // Limiter le nombre d'activités stockées (faire cela périodiquement)
                const activities = await this.getAll();
                if (activities.length > 100) {
                    const sortedActivities = activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    const idsToDelete = sortedActivities.slice(100).map(a => a.id);
                    
                    // Supprimer les activités en trop (en pratique, il faudrait le faire par lots)
                    for (const id of idsToDelete) {
                        await DB.write(DB.STORES.ACTIVITIES, 'delete', id);
                    }
                }
                
                return activity;
            } catch (error) {
                console.error(`Erreur lors de l'ajout d'une activité:`, error);
                return null;
            }
        },
        
        clear: async function() {
            try {
                await DB.write(DB.STORES.ACTIVITIES, 'clear');
                return true;
            } catch (error) {
                console.error(`Erreur lors de la suppression des activités:`, error);
                return false;
            }
        }
    },
    
    /**
     * Paramètres de l'application
     */
    settings: {
        get: async function() {
            try {
                return await DB.read(DB.STORES.SETTINGS, 'get', 'app-settings') || {};
            } catch (error) {
                console.error('Erreur lors de la récupération des paramètres:', error);
                return {};
            }
        },
        
        save: async function(settings) {
            try {
                settings.id = 'app-settings';
                await DB.write(DB.STORES.SETTINGS, 'put', settings);
                return settings;
            } catch (error) {
                console.error(`Erreur lors de l'enregistrement des paramètres:`, error);
                return null;
            }
        }
    },
    
    /**
     * Fonctions d'exportation et d'importation des données
     */
    export: async function() {
        try {
            const data = {
                employees: await this.employees.getAll(),
                salaries: await this.salaries.getAll(),
                advances: await this.advances.getAll(),
                sanctions: await this.sanctions.getAll(),
                debts: await this.debts.getAll(),
                settings: await this.settings.get(),
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
            
            return JSON.stringify(data);
        } catch (error) {
            console.error('Erreur lors de l\'exportation des données:', error);
            return null;
        }
    },
    
    import: async function(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            // Vérifier que les données nécessaires sont présentes
            if (!data.employees || !data.salaries || !data.advances || 
                !data.sanctions || !data.debts || !data.settings) {
                throw new Error('Les données importées sont incomplètes ou invalides.');
            }
            
            // Effacer les données existantes
            await DB.write(DB.STORES.EMPLOYEES, 'clear');
            await DB.write(DB.STORES.SALARIES, 'clear');
            await DB.write(DB.STORES.ADVANCES, 'clear');
            await DB.write(DB.STORES.SANCTIONS, 'clear');
            await DB.write(DB.STORES.DEBTS, 'clear');
            
            // Importer les données
            for (const employee of data.employees) {
                await DB.write(DB.STORES.EMPLOYEES, 'put', employee);
            }
            
            for (const salary of data.salaries) {
                await DB.write(DB.STORES.SALARIES, 'put', salary);
            }
            
            for (const advance of data.advances) {
                await DB.write(DB.STORES.ADVANCES, 'put', advance);
            }
            
            for (const sanction of data.sanctions) {
                await DB.write(DB.STORES.SANCTIONS, 'put', sanction);
            }
            
            for (const debt of data.debts) {
                await DB.write(DB.STORES.DEBTS, 'put', debt);
            }
            
            // Enregistrer les paramètres
            await this.settings.save(data.settings);
            
            // Ajouter une activité d'importation
            await this.activities.add({
                type: 'import',
                entity: 'database',
                description: `Données importées avec succès (${data.employees.length} employés, ${data.salaries.length} salaires, etc.)`
            });
            
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'importation des données:', error);
            return false;
        }
    },
    
    /**
     * Réinitialiser les données (utile pour le développement ou en cas de problème)
     */
    reset: async function() {
        try {
            // Effacer toutes les données
            await DB.write(DB.STORES.EMPLOYEES, 'clear');
            await DB.write(DB.STORES.SALARIES, 'clear');
            await DB.write(DB.STORES.ADVANCES, 'clear');
            await DB.write(DB.STORES.SANCTIONS, 'clear');
            await DB.write(DB.STORES.DEBTS, 'clear');
            await DB.write(DB.STORES.ACTIVITIES, 'clear');
            await DB.write(DB.STORES.SETTINGS, 'clear');
            
            // Réinitialiser la base de données
            await this.init();
            
            return true;
        } catch (error) {
            console.error('Erreur lors de la réinitialisation de la base de données:', error);
            return false;
        }
    }
};

// Exportation du module DB
window.DB = DB;