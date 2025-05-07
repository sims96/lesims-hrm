/**
 * database-indexeddb.js
 * Gestion du stockage des données avec IndexedDB
 * Application de Gestion des Salaires Le Sims
 * (Updated with Accounting Module support)
 */

const DB = {
    /**
     * Nom et version de la base de données
     */
    DB_NAME: 'LeSims_SalaryManager',
    DB_VERSION: 2, // Incremented version for new accounting stores
    
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
        // New stores for accounting module
        EXPENSES: 'expenses',
        INCOMES: 'incomes',
        EXPENSE_CATEGORIES: 'expenseCategories',
        INCOME_CATEGORIES: 'incomeCategories',
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
                const oldVersion = event.oldVersion;
                
                console.log(`Upgrading IndexedDB from version ${oldVersion} to ${this.DB_VERSION}`);
                
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
                
                // New object stores for accounting module
                if (!db.objectStoreNames.contains(this.STORES.EXPENSES)) {
                    const expensesStore = db.createObjectStore(this.STORES.EXPENSES, { keyPath: 'id' });
                    expensesStore.createIndex('by_date', 'date', { unique: false });
                    expensesStore.createIndex('by_categoryId', 'categoryId', { unique: false });
                    expensesStore.createIndex('by_departmentId', 'departmentId', { unique: false });
                    expensesStore.createIndex('by_isGeneral', 'isGeneral', { unique: false });
                }
                
                if (!db.objectStoreNames.contains(this.STORES.INCOMES)) {
                    const incomesStore = db.createObjectStore(this.STORES.INCOMES, { keyPath: 'id' });
                    incomesStore.createIndex('by_date', 'date', { unique: false });
                    incomesStore.createIndex('by_categoryId', 'categoryId', { unique: false });
                    incomesStore.createIndex('by_departmentId', 'departmentId', { unique: false });
                }
                
                if (!db.objectStoreNames.contains(this.STORES.EXPENSE_CATEGORIES)) {
                    db.createObjectStore(this.STORES.EXPENSE_CATEGORIES, { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains(this.STORES.INCOME_CATEGORIES)) {
                    db.createObjectStore(this.STORES.INCOME_CATEGORIES, { keyPath: 'id' });
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
     * Méthodes CRUD pour les dépenses (module comptabilité)
     */
    expenses: {
        getAll: async function() {
            try {
                return await DB.read(DB.STORES.EXPENSES, 'getAll') || [];
            } catch (error) {
                console.error('Erreur lors de la récupération des dépenses:', error);
                return [];
            }
        },
        
        getById: async function(id) {
            try {
                return await DB.read(DB.STORES.EXPENSES, 'get', id) || null;
            } catch (error) {
                console.error(`Erreur lors de la récupération de la dépense ${id}:`, error);
                return null;
            }
        },
        
        getByMonth: async function(year, month) {
            try {
                const startDate = new Date(year, month, 1).toISOString();
                const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString(); // Dernier jour du mois
                
                // Récupérer toutes les dépenses et filtrer par date
                const expenses = await this.getAll();
                return expenses.filter(expense => {
                    const expenseDate = new Date(expense.date).toISOString();
                    return expenseDate >= startDate && expenseDate <= endDate;
                });
            } catch (error) {
                console.error(`Erreur lors de la récupération des dépenses pour ${month}/${year}:`, error);
                return [];
            }
        },
        
        getByDateRange: async function(startDate, endDate) {
            try {
                const start = new Date(startDate).toISOString();
                const end = new Date(endDate).toISOString();
                
                // Récupérer toutes les dépenses et filtrer par date
                const expenses = await this.getAll();
                return expenses.filter(expense => {
                    const expenseDate = new Date(expense.date).toISOString();
                    return expenseDate >= start && expenseDate <= end;
                });
            } catch (error) {
                console.error(`Erreur lors de la récupération des dépenses par plage de dates:`, error);
                return [];
            }
        },
        
        getByCategory: async function(categoryId) {
            try {
                // Récupérer toutes les dépenses et filtrer par catégorie
                const expenses = await this.getAll();
                return expenses.filter(expense => expense.categoryId === categoryId);
            } catch (error) {
                console.error(`Erreur lors de la récupération des dépenses par catégorie:`, error);
                return [];
            }
        },
        
        getByDepartment: async function(departmentId) {
            try {
                // Récupérer toutes les dépenses et filtrer par département
                const expenses = await this.getAll();
                return expenses.filter(expense => expense.departmentId === departmentId);
            } catch (error) {
                console.error(`Erreur lors de la récupération des dépenses par département:`, error);
                return [];
            }
        },
        
        save: async function(expense) {
            try {
                // Get category name for display purposes
                let categoryName = '';
                if (expense.categoryId) {
                    const category = await DB.expenseCategories.getById(expense.categoryId);
                    if (category) {
                        categoryName = category.name;
                    }
                }
                
                // Get department name based on departmentId
                let departmentName = '';
                if (expense.departmentId === 'general') {
                    departmentName = 'Général/Admin';
                } else {
                    // You might want to implement a proper department lookup here
                    // For now, we're using a simple mapping
                    const departmentMapping = {
                        'shawarma': 'Shawarma',
                        'ice-cream': 'Crème Glacée',
                        'pizza': 'Pizza',
                        'kitchen': 'Cuisine',
                        'bar': 'Bar',
                        'billard': 'Billard',
                        'chicha': 'Chicha',
                        'general': 'Général/Admin'
                    };
                    departmentName = departmentMapping[expense.departmentId] || expense.departmentId;
                }
                
                // Génération d'un nouvel ID si la dépense est nouvelle
                if (!expense.id) {
                    expense.id = Date.now().toString();
                    expense.createdAt = new Date().toISOString();
                    
                    // Log activity
                    await DB.activities.add({
                        type: 'add',
                        entity: 'expense',
                        entityId: expense.id,
                        description: `Dépense de ${expense.amount} FCFA ajoutée: ${expense.description} (${categoryName})`
                    });
                } else {
                    // Mise à jour d'une dépense existante
                    expense.updatedAt = new Date().toISOString();
                    
                    // Log activity
                    await DB.activities.add({
                        type: 'edit',
                        entity: 'expense',
                        entityId: expense.id,
                        description: `Dépense modifiée: ${expense.description} (${categoryName})`
                    });
                }
                
                // Store category name and department name for easier access
                expense.categoryName = categoryName;
                expense.departmentName = departmentName;
                
                await DB.write(DB.STORES.EXPENSES, 'put', expense);
                return expense;
            } catch (error) {
                console.error(`Erreur lors de l'enregistrement de la dépense:`, error);
                return null;
            }
        },
        
        delete: async function(id) {
            try {
                const expenseToDelete = await this.getById(id);
                
                if (!expenseToDelete) return false;
                
                // Log activity
                await DB.activities.add({
                    type: 'delete',
                    entity: 'expense',
                    entityId: id,
                    description: `Dépense supprimée: ${expenseToDelete.description} (${expenseToDelete.amount} FCFA)`
                });
                
                await DB.write(DB.STORES.EXPENSES, 'delete', id);
                return true;
            } catch (error) {
                console.error(`Erreur lors de la suppression de la dépense ${id}:`, error);
                return false;
            }
        }
    },
    
    /**
     * Méthodes CRUD pour les revenus (module comptabilité)
     */
    incomes: {
        getAll: async function() {
            try {
                return await DB.read(DB.STORES.INCOMES, 'getAll') || [];
            } catch (error) {
                console.error('Erreur lors de la récupération des revenus:', error);
                return [];
            }
        },
        
        getById: async function(id) {
            try {
                return await DB.read(DB.STORES.INCOMES, 'get', id) || null;
            } catch (error) {
                console.error(`Erreur lors de la récupération du revenu ${id}:`, error);
                return null;
            }
        },
        
        getByMonth: async function(year, month) {
            try {
                const startDate = new Date(year, month, 1).toISOString();
                const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString(); // Dernier jour du mois
                
                // Récupérer tous les revenus et filtrer par date
                const incomes = await this.getAll();
                return incomes.filter(income => {
                    const incomeDate = new Date(income.date).toISOString();
                    return incomeDate >= startDate && incomeDate <= endDate;
                });
            } catch (error) {
                console.error(`Erreur lors de la récupération des revenus pour ${month}/${year}:`, error);
                return [];
            }
        },
        
        getByDateRange: async function(startDate, endDate) {
            try {
                const start = new Date(startDate).toISOString();
                const end = new Date(endDate).toISOString();
                
                // Récupérer tous les revenus et filtrer par date
                const incomes = await this.getAll();
                return incomes.filter(income => {
                    const incomeDate = new Date(income.date).toISOString();
                    return incomeDate >= start && incomeDate <= end;
                });
            } catch (error) {
                console.error(`Erreur lors de la récupération des revenus par plage de dates:`, error);
                return [];
            }
        },
        
        getByCategory: async function(categoryId) {
            try {
                // Récupérer tous les revenus et filtrer par catégorie
                const incomes = await this.getAll();
                return incomes.filter(income => income.categoryId === categoryId);
            } catch (error) {
                console.error(`Erreur lors de la récupération des revenus par catégorie:`, error);
                return [];
            }
        },
        
        getByDepartment: async function(departmentId) {
            try {
                // Récupérer tous les revenus et filtrer par département
                const incomes = await this.getAll();
                return incomes.filter(income => income.departmentId === departmentId);
            } catch (error) {
                console.error(`Erreur lors de la récupération des revenus par département:`, error);
                return [];
            }
        },
        
        save: async function(income) {
            try {
                // Get category name for display purposes
                let categoryName = '';
                if (income.categoryId) {
                    const category = await DB.incomeCategories.getById(income.categoryId);
                    if (category) {
                        categoryName = category.name;
                    }
                }
                
                // Get department name based on departmentId
                let departmentName = '';
                // Department mapping (exclude 'general' for incomes as they're typically associated with a business unit)
                const departmentMapping = {
                    'shawarma': 'Shawarma',
                    'ice-cream': 'Crème Glacée',
                    'pizza': 'Pizza',
                    'kitchen': 'Cuisine',
                    'bar': 'Bar',
                    'billard': 'Billard',
                    'chicha': 'Chicha'
                };
                departmentName = departmentMapping[income.departmentId] || income.departmentId;
                
                // Génération d'un nouvel ID si le revenu est nouveau
                if (!income.id) {
                    income.id = Date.now().toString();
                    income.createdAt = new Date().toISOString();
                    
                    // Log activity
                    await DB.activities.add({
                        type: 'add',
                        entity: 'income',
                        entityId: income.id,
                        description: `Revenu de ${income.amount} FCFA ajouté: ${income.description} (${categoryName})`
                    });
                } else {
                    // Mise à jour d'un revenu existant
                    income.updatedAt = new Date().toISOString();
                    
                    // Log activity
                    await DB.activities.add({
                        type: 'edit',
                        entity: 'income',
                        entityId: income.id,
                        description: `Revenu modifié: ${income.description} (${categoryName})`
                    });
                }
                
                // Store category name and department name for easier access
                income.categoryName = categoryName;
                income.departmentName = departmentName;
                
                await DB.write(DB.STORES.INCOMES, 'put', income);
                return income;
            } catch (error) {
                console.error(`Erreur lors de l'enregistrement du revenu:`, error);
                return null;
            }
        },
        
        delete: async function(id) {
            try {
                const incomeToDelete = await this.getById(id);
                
                if (!incomeToDelete) return false;
                
                // Log activity
                await DB.activities.add({
                    type: 'delete',
                    entity: 'income',
                    entityId: id,
                    description: `Revenu supprimé: ${incomeToDelete.description} (${incomeToDelete.amount} FCFA)`
                });
                
                await DB.write(DB.STORES.INCOMES, 'delete', id);
                return true;
            } catch (error) {
                console.error(`Erreur lors de la suppression du revenu ${id}:`, error);
                return false;
            }
        }
    },
    
    /**
     * Méthodes CRUD pour les catégories de dépenses
     */
    expenseCategories: {
        getAll: async function() {
            try {
                return await DB.read(DB.STORES.EXPENSE_CATEGORIES, 'getAll') || [];
            } catch (error) {
                console.error('Erreur lors de la récupération des catégories de dépenses:', error);
                return [];
            }
        },
        
        getById: async function(id) {
            try {
                return await DB.read(DB.STORES.EXPENSE_CATEGORIES, 'get', id) || null;
            } catch (error) {
                console.error(`Erreur lors de la récupération de la catégorie de dépense ${id}:`, error);
                return null;
            }
        },
        
        save: async function(category) {
            try {
                // Génération d'un nouvel ID si la catégorie est nouvelle
                if (!category.id) {
                    category.id = Date.now().toString();
                    category.createdAt = new Date().toISOString();
                    
                    // Log activity
                    await DB.activities.add({
                        type: 'add',
                        entity: 'expenseCategory',
                        entityId: category.id,
                        description: `Catégorie de dépense ajoutée: ${category.name}`
                    });
                } else {
                    // Mise à jour d'une catégorie existante
                    category.updatedAt = new Date().toISOString();
                    
                    // Log activity
                    await DB.activities.add({
                        type: 'edit',
                        entity: 'expenseCategory',
                        entityId: category.id,
                        description: `Catégorie de dépense modifiée: ${category.name}`
                    });
                }
                
                await DB.write(DB.STORES.EXPENSE_CATEGORIES, 'put', category);
                return category;
            } catch (error) {
                console.error(`Erreur lors de l'enregistrement de la catégorie de dépense:`, error);
                return null;
            }
        },
        
        delete: async function(id) {
            try {
                const categoryToDelete = await this.getById(id);
                
                if (!categoryToDelete) return false;
                
                // Check if any expenses use this category
                const relatedExpenses = await DB.expenses.getByCategory(id);
                if (relatedExpenses.length > 0) {
                    console.error(`Impossible de supprimer la catégorie: ${relatedExpenses.length} dépenses y sont associées.`);
                    return false;
                }
                
                // Log activity
                await DB.activities.add({
                    type: 'delete',
                    entity: 'expenseCategory',
                    entityId: id,
                    description: `Catégorie de dépense supprimée: ${categoryToDelete.name}`
                });
                
                await DB.write(DB.STORES.EXPENSE_CATEGORIES, 'delete', id);
                return true;
            } catch (error) {
                console.error(`Erreur lors de la suppression de la catégorie de dépense ${id}:`, error);
                return false;
            }
        }
    },
    
    /**
     * Méthodes CRUD pour les catégories de revenus
     */
    incomeCategories: {
        getAll: async function() {
            try {
                return await DB.read(DB.STORES.INCOME_CATEGORIES, 'getAll') || [];
            } catch (error) {
                console.error('Erreur lors de la récupération des catégories de revenus:', error);
                return [];
            }
        },
        
        getById: async function(id) {
            try {
                return await DB.read(DB.STORES.INCOME_CATEGORIES, 'get', id) || null;
            } catch (error) {
                console.error(`Erreur lors de la récupération de la catégorie de revenu ${id}:`, error);
                return null;
            }
        },
        
        save: async function(category) {
            try {
                // Génération d'un nouvel ID si la catégorie est nouvelle
                if (!category.id) {
                    category.id = Date.now().toString();
                    category.createdAt = new Date().toISOString();
                    
                    // Log activity
                    await DB.activities.add({
                        type: 'add',
                        entity: 'incomeCategory',
                        entityId: category.id,
                        description: `Catégorie de revenu ajoutée: ${category.name}`
                    });
                } else {
                    // Mise à jour d'une catégorie existante
                    category.updatedAt = new Date().toISOString();
                    
                    // Log activity
                    await DB.activities.add({
                        type: 'edit',
                        entity: 'incomeCategory',
                        entityId: category.id,
                        description: `Catégorie de revenu modifiée: ${category.name}`
                    });
                }
                
                await DB.write(DB.STORES.INCOME_CATEGORIES, 'put', category);
                return category;
            } catch (error) {
                console.error(`Erreur lors de l'enregistrement de la catégorie de revenu:`, error);
                return null;
            }
        },
        
        delete: async function(id) {
            try {
                const categoryToDelete = await this.getById(id);
                
                if (!categoryToDelete) return false;
                
                // Check if any incomes use this category
                const relatedIncomes = await DB.incomes.getByCategory(id);
                if (relatedIncomes.length > 0) {
                    console.error(`Impossible de supprimer la catégorie: ${relatedIncomes.length} revenus y sont associés.`);
                    return false;
                }
                
                // Log activity
                await DB.activities.add({
                    type: 'delete',
                    entity: 'incomeCategory',
                    entityId: id,
                    description: `Catégorie de revenu supprimée: ${categoryToDelete.name}`
                });
                
                await DB.write(DB.STORES.INCOME_CATEGORIES, 'delete', id);
                return true;
            } catch (error) {
                console.error(`Erreur lors de la suppression de la catégorie de revenu ${id}:`, error);
                return false;
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
                // Include accounting data
                expenses: await this.expenses.getAll(),
                incomes: await this.incomes.getAll(),
                expenseCategories: await this.expenseCategories.getAll(),
                incomeCategories: await this.incomeCategories.getAll(),
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
            
            // Clear accounting data if present in import
            if (data.expenses) await DB.write(DB.STORES.EXPENSES, 'clear');
            if (data.incomes) await DB.write(DB.STORES.INCOMES, 'clear');
            if (data.expenseCategories) await DB.write(DB.STORES.EXPENSE_CATEGORIES, 'clear');
            if (data.incomeCategories) await DB.write(DB.STORES.INCOME_CATEGORIES, 'clear');
            
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
            
            // Import accounting data if present
            if (data.expenses) {
                for (const expense of data.expenses) {
                    await DB.write(DB.STORES.EXPENSES, 'put', expense);
                }
            }
            
            if (data.incomes) {
                for (const income of data.incomes) {
                    await DB.write(DB.STORES.INCOMES, 'put', income);
                }
            }
            
            if (data.expenseCategories) {
                for (const category of data.expenseCategories) {
                    await DB.write(DB.STORES.EXPENSE_CATEGORIES, 'put', category);
                }
            }
            
            if (data.incomeCategories) {
                for (const category of data.incomeCategories) {
                    await DB.write(DB.STORES.INCOME_CATEGORIES, 'put', category);
                }
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
            
            // Clear accounting data
            await DB.write(DB.STORES.EXPENSES, 'clear');
            await DB.write(DB.STORES.INCOMES, 'clear');
            await DB.write(DB.STORES.EXPENSE_CATEGORIES, 'clear');
            await DB.write(DB.STORES.INCOME_CATEGORIES, 'clear');
            
            // Réinitialiser la base de données
            await this.init();
            
            return true;
        } catch (error) {
            console.error('Erreur lors de la réinitialisation de la base de données:', error);
            return false;
        }
    },
    
    /**
     * Initialize default categories for accounting if needed
     */
    initAccountingDefaults: async function() {
        try {
            // Check if we already have expense categories
            let expenseCategories = await this.expenseCategories.getAll();
            if (expenseCategories.length === 0) {
                console.log("Initializing default expense categories...");
                const defaultExpenseCategories = [
                    { name: 'Salaires' },
                    { name: 'Loyer' },
                    { name: 'Services Publics' },
                    { name: 'Fournitures' },
                    { name: 'Équipement' },
                    { name: 'Maintenance' },
                    { name: 'Marketing' },
                    { name: 'Transport' },
                    { name: 'Nourriture' },
                    { name: 'Taxes' },
                    { name: 'Assurance' },
                    { name: 'Autres' }
                ];
                
                for (const category of defaultExpenseCategories) {
                    await this.expenseCategories.save(category);
                }
                console.log("Default expense categories created.");
            }
            
            // Check if we already have income categories
            let incomeCategories = await this.incomeCategories.getAll();
            if (incomeCategories.length === 0) {
                console.log("Initializing default income categories...");
                const defaultIncomeCategories = [
                    { name: 'Ventes' },
                    { name: 'Services' },
                    { name: 'Remboursements' },
                    { name: 'Investissements' },
                    { name: 'Autres' }
                ];
                
                for (const category of defaultIncomeCategories) {
                    await this.incomeCategories.save(category);
                }
                console.log("Default income categories created.");
            }
            
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'initialisation des catégories par défaut:', error);
            return false;
        }
    }
};

// Exportation du module DB
window.DB = DB;