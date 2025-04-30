/**
 * data-manager.js
 * Gestionnaire de données avec support hors ligne (Enhanced Version)
 * Utilise IndexedDB en mode hors ligne et Supabase en ligne
 */

const DataManager = {
    // State
    isOnline: navigator.onLine,
    pendingChanges: [],
    syncInProgress: false,
    syncTag: 'database-sync', // Tag for Background Sync

    /**
     * Initialisation
     */
    init: async function() {
        console.log("DataManager initializing...");

        // Setup online/offline event listeners
        window.addEventListener('online', () => this.handleOnlineStatusChange(true));
        window.addEventListener('offline', () => this.handleOnlineStatusChange(false));

        // Initialize IndexedDB (must succeed)
        try {
            await LocalDB.init();
        } catch (error) {
             console.error("CRITICAL: Failed to initialize LocalDB (IndexedDB). Offline mode will not work.", error);
             alert("Erreur critique: Base de données locale inaccessible. Le mode hors ligne est désactivé.");
             // Optionally, disable offline features entirely if LocalDB fails
             return false; // Stop initialization
        }

        // Try to initialize Supabase (might fail if offline)
        await this.initSupabaseConnection(); // Initialize Supabase connection attempt

        // Load pending changes from IndexedDB
        await this.loadPendingChanges();
        this.updatePendingCountUI(); // Update UI with initial pending count

        // Initial status & UI update
        this.isOnline = navigator.onLine;
        this.updateOnlineStatusUI(); // Update online/offline UI

        // If we're online, try to sync any pending changes
        if (this.isOnline && this.pendingChanges.length > 0) {
            this.syncChanges(); // Start sync automatically if online with pending changes
        }

        console.log(`DataManager initialized in ${this.isOnline ? 'online' : 'offline'} mode with ${this.pendingChanges.length} pending changes.`);
        return true;
    },

    /**
     * Initialize Supabase connection if online
     */
    initSupabaseConnection: async function() {
        if (navigator.onLine) {
            try {
                await window.DB._ensureInitialized(); // From database-supabase.js
                 console.log("Supabase connection initialized successfully.");
                 return true;
            } catch (error) {
                console.warn("Supabase initialization failed (might be offline or config issue):", error);
                this.isOnline = false; // Assume offline if Supabase init fails
                return false;
            }
        } else {
            console.log("Supabase initialization skipped (offline).");
            return false;
        }
    },

    /**
     * Handle online/offline status changes
     */
    handleOnlineStatusChange: async function(online) {
        if (online === this.isOnline) return; // No change

        console.log(`Network status changed: ${online ? 'Online' : 'Offline'}`);
        this.isOnline = online;
        this.updateOnlineStatusUI(); // Update UI immediately

        if (online) {
            // Attempt to re-initialize Supabase connection if it wasn't ready
            if (!window.DB || !window.DB.isInitialized()) {
               await this.initSupabaseConnection();
            }

            // Try to sync pending changes ONLY if Supabase is now initialized
            if (window.DB && window.DB.isInitialized() && this.pendingChanges.length > 0) {
                // Use Background Sync if available, otherwise trigger directly
                if ('serviceWorker' in navigator && 'SyncManager' in window) {
                    this.registerBackgroundSync();
                } else {
                    this.syncChanges();
                }
            }
        }
    },

    // --- UI Update Functions (Placeholders - Implement in app.js or similar) ---

    /**
     * Updates UI elements related to online/offline status (banner, indicator)
     */
    updateOnlineStatusUI: function() {
        const online = this.isOnline;
        const offlineBanner = document.getElementById('offline-banner'); // Assumes an element with this ID exists
        const offlineIndicator = document.getElementById('offline-indicator'); // From index.html

        if (offlineIndicator) {
             offlineIndicator.style.display = online ? 'none' : 'block';
        }

        if (offlineBanner) {
            offlineBanner.style.display = online ? 'none' : 'block';
        } else if (!online) {
             // Create banner if it doesn't exist and we are offline
             this.createOfflineBanner();
        }
        console.log(`UI updated for ${online ? 'online' : 'offline'} status.`);
    },

    /**
     * Creates the offline banner dynamically if needed
     */
     createOfflineBanner: function() {
        if (document.getElementById('offline-banner')) return; // Already exists

        const banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%;
            background-color: #ff9800; color: white; padding: 8px;
            text-align: center; z-index: 3000; font-size: 0.9em;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
        banner.innerHTML = '<i class="fas fa-wifi"></i> Mode hors ligne. Les modifications seront synchronisées.';
        document.body.insertBefore(banner, document.body.firstChild);
        console.log("Offline banner created.");
    },


    /**
     * Updates UI elements related to sync status (e.g., shows a spinner/message)
     */
    updateSyncStatusUI: function(status, message = '') {
        // Example: Add/remove a class, show/hide a sync icon, display message
        const syncIndicator = document.getElementById('sync-indicator'); // Assumes an element exists
        if (syncIndicator) {
            syncIndicator.textContent = message;
            syncIndicator.className = `sync-status ${status}`; // e.g., 'syncing', 'synced', 'sync-error'
            syncIndicator.style.display = status === 'idle' ? 'none' : 'inline-block';
        }
        if (status === 'syncing') {
            window.showLoader(message || 'Synchronisation...');
        } else {
            window.hideLoader();
            if (status === 'synced') {
                // Maybe show a temporary success message
                console.log("Sync successful UI update triggered.");
            } else if (status === 'sync-error') {
                 console.error("Sync error UI update triggered:", message);
                 // Optionally show a persistent error message
                 alert("Erreur de synchronisation: " + message);
            }
        }
        console.log(`Sync status UI updated: ${status} - ${message}`);
    },

    /**
     * Updates UI element showing the count of pending changes
     */
    updatePendingCountUI: function() {
        const count = this.pendingChanges.length;
        const pendingCountElement = document.getElementById('pending-changes-count'); // Assumes an element exists
        if (pendingCountElement) {
            pendingCountElement.textContent = count > 0 ? count : '';
            pendingCountElement.style.display = count > 0 ? 'inline-block' : 'none'; // Show only if > 0
        }
        console.log(`Pending count UI updated: ${count}`);
    },

    // --- End UI Update Functions ---


    /**
     * Load pending changes from IndexedDB
     */
    loadPendingChanges: async function() {
        try {
            this.pendingChanges = await LocalDB.pendingChanges.getAll() || [];
            console.log(`Loaded ${this.pendingChanges.length} pending changes from LocalDB.`);
            // Sort by timestamp to process in order?
            this.pendingChanges.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        } catch (error) {
            console.error("Error loading pending changes:", error);
            this.pendingChanges = [];
        }
        this.updatePendingCountUI(); // Ensure UI is updated after loading
    },

    /**
     * Save a pending change to be synced later
     */
    savePendingChange: async function(change) {
        try {
            // Add timestamp and unique ID
            change.timestamp = new Date().toISOString();
            change.pendingId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            change.attempts = 0; // Add attempt counter

            // Add context like user ID if available/needed
            // change.userId = getCurrentUserId();

            // Save to IndexedDB
            await LocalDB.pendingChanges.save(change);

            // Update in-memory array
            this.pendingChanges.push(change);
            this.updatePendingCountUI(); // Update UI

            console.log("Pending change saved:", change);

            // If online, attempt background sync registration
            if (this.isOnline && 'serviceWorker' in navigator && 'SyncManager' in window) {
                this.registerBackgroundSync();
            }

            return true;
        } catch (error) {
            console.error("Error saving pending change:", error);
            return false;
        }
    },

    /**
     * Register for Background Sync
     */
     registerBackgroundSync: async function() {
        if (!('serviceWorker' in navigator && 'SyncManager' in window)) {
            console.log("Background Sync not supported.");
            return;
        }
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register(this.syncTag);
            console.log(`Background Sync registered with tag: ${this.syncTag}`);
        } catch (error) {
            console.error(`Background Sync registration failed:`, error);
             // Fallback: If registration fails, maybe trigger immediate sync if online?
             if (this.isOnline && !this.syncInProgress) {
                 console.log("Fallback: Triggering immediate sync after failed background sync registration.");
                 this.syncChanges();
             }
        }
    },

    /**
     * Sync changes with Supabase when online
     * Can be called directly or by the Background Sync event
     */
    syncChanges: async function() {
        if (!this.isOnline || this.syncInProgress || this.pendingChanges.length === 0) {
            if(this.syncInProgress) console.log("Sync already in progress.");
            if(!this.isOnline) console.log("Cannot sync: Offline.");
            if(this.pendingChanges.length === 0) console.log("No pending changes to sync.");
            return false;
        }

        // Ensure Supabase is initialized before starting sync
        if (!window.DB || !window.DB.isInitialized()) {
            console.log("Attempting Supabase initialization before sync...");
            const initialized = await this.initSupabaseConnection();
            if (!initialized) {
                console.error("Cannot sync: Supabase connection failed.");
                this.updateSyncStatusUI('sync-error', 'Connexion échouée');
                return false;
            }
        }

        this.syncInProgress = true;
        console.log(`Starting sync of ${this.pendingChanges.length} changes...`);
        this.updateSyncStatusUI('syncing', `Synchronisation (${this.pendingChanges.length})...`);

        // Create a copy to iterate over, allowing removal from original array
        const changesToProcess = [...this.pendingChanges];
        let successCount = 0;
        let errorCount = 0;
        const MAX_ATTEMPTS = 3; // Max attempts per change before marking as failed

        for (const change of changesToProcess) {
            try {
                console.log(`Processing change ${change.pendingId} (Attempt ${change.attempts + 1})`, change);
                await this.processChange(change);
                // If successful, remove from pending changes (both DB and memory)
                await LocalDB.pendingChanges.delete(change.pendingId);
                this.pendingChanges = this.pendingChanges.filter(c => c.pendingId !== change.pendingId);
                successCount++;
                console.log(`Successfully processed change ${change.pendingId}`);
            } catch (error) {
                errorCount++;
                change.attempts = (change.attempts || 0) + 1;
                console.error(`Error processing change ${change.pendingId} (Attempt ${change.attempts}):`, error);

                if (error.message === "Conflict detected") {
                    // Handle conflict specifically - e.g., mark for manual resolution
                    change.status = 'conflict';
                    await LocalDB.pendingChanges.save(change); // Update status in DB
                     console.warn(`Change ${change.pendingId} marked as conflict.`);
                     // Remove from immediate retry queue, requires manual intervention
                     this.pendingChanges = this.pendingChanges.filter(c => c.pendingId !== change.pendingId);
                } else if (change.attempts >= MAX_ATTEMPTS) {
                    // Mark as failed after max attempts
                    change.status = 'failed';
                    change.error = error.message;
                    await LocalDB.pendingChanges.save(change); // Update status in DB
                    console.error(`Change ${change.pendingId} failed after ${MAX_ATTEMPTS} attempts. Marked as failed.`);
                    // Remove from memory queue for this sync cycle
                    this.pendingChanges = this.pendingChanges.filter(c => c.pendingId !== change.pendingId);
                } else {
                    // Save incremented attempt count back to DB for next sync cycle
                    await LocalDB.pendingChanges.save(change);
                     console.log(`Change ${change.pendingId} failed, will retry later (Attempt ${change.attempts}/${MAX_ATTEMPTS}).`);
                     // Keep it in the in-memory list for the UI count, but it wasn't processed this cycle
                }

                // If a network error occurred, stop the current sync cycle
                if (!navigator.onLine) {
                    console.warn("Sync interrupted due to going offline.");
                    this.isOnline = false;
                    this.updateOnlineStatusUI();
                    break; // Exit the loop
                }
            } finally {
                 this.updatePendingCountUI(); // Update UI after each attempt
            }
        }

        this.syncInProgress = false;
        console.log(`Sync cycle completed: ${successCount} succeeded, ${errorCount} failed/retrying.`);

        if (errorCount > 0 && this.pendingChanges.length > 0) {
             this.updateSyncStatusUI('sync-error', `${this.pendingChanges.length} modification(s) en attente.`);
             // Maybe re-register background sync if errors occurred but we are still online
             if (this.isOnline) this.registerBackgroundSync();
        } else if (this.pendingChanges.length === 0) {
             this.updateSyncStatusUI('synced', 'Synchronisé');
             setTimeout(() => this.updateSyncStatusUI('idle'), 3000); // Hide after 3 seconds
        } else {
             // Some changes might be left (e.g., conflicts, failed)
             this.updateSyncStatusUI('idle'); // Or show remaining count?
        }

        return successCount > 0 && errorCount === 0;
    },

    /**
     * Process a single change - applying it to Supabase
     */
    processChange: async function(change) {
        // Ensure online and Supabase is ready
        if (!this.isOnline || !window.DB || !window.DB.isInitialized()) {
            throw new Error("Cannot process change: Offline or Supabase unavailable.");
        }

        const { entity, action, data } = change;
        let result;

        // --- CONFLICT RESOLUTION (Placeholder - Requires Timestamps) ---
        // if (action === 'update' && data.id && data.updated_at) {
        //     const serverRecord = await window.DB[entity].getById(data.id);
        //     if (serverRecord && serverRecord.updated_at && new Date(data.updated_at) < new Date(serverRecord.updated_at)) {
        //         console.warn(`Conflict detected for ${entity} ID ${data.id}. Local data is older.`);
        //         throw new Error("Conflict detected"); // Let syncChanges handle marking it
        //     }
        // }
        // --- END CONFLICT RESOLUTION PLACEHOLDER ---

        // Add/Update 'updated_at' before saving to remote
        const dataToSave = { ...data, updated_at: new Date().toISOString() };


        switch (action) {
            case 'create':
                 // Ensure local ID is removed if it exists before sending to Supabase
                 const { id: localId, ...createData } = dataToSave;
                 result = await window.DB[entity].save(createData);
                 if (result && result.id && localId) {
                     // Optional: Update related local items if they used the temporary localId
                     console.log(`Mapping local ID ${localId} to remote ID ${result.id} for ${entity}`);
                     // await this.updateLocalReferences(entity, localId, result.id);
                 }
                break;
            case 'update':
                // Ensure ID exists
                if (!dataToSave.id) throw new Error(`Cannot update ${entity}: Missing ID.`);
                result = await window.DB[entity].save(dataToSave);
                break;
            case 'delete':
                // Ensure ID exists
                if (!data.id) throw new Error(`Cannot delete ${entity}: Missing ID.`);
                result = await window.DB[entity].delete(data.id);
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
        }

        if (!result) {
             // Throw an error if the Supabase operation itself failed (returned null/false/error)
             // Supabase client might throw its own errors which will also be caught by syncChanges
            throw new Error(`Supabase operation ${action} on ${entity} failed.`);
        }
        return result;
    },

    /**
     * Generic data operation handler - Decides whether to use LocalDB or Supabase
     */
    performOperation: async function(entity, action, data) {
        if (this.isOnline && window.DB && window.DB.isInitialized()) {
            try {
                // --- ONLINE: Try Supabase first ---
                let result;
                switch (action) {
                    case 'getAll':
                        result = await window.DB[entity].getAll();
                        // Cache results locally in background (don't await)
                        if (result) LocalDB[entity].saveAll(result).catch(e => console.warn(`Failed to cache ${entity} locally:`, e));
                        break;
                    case 'getById':
                        result = await window.DB[entity].getById(data); // data is the ID here
                        // Cache result locally in background
                        if (result) LocalDB[entity].save(result).catch(e => console.warn(`Failed to cache ${entity} ID ${data} locally:`, e));
                        break;
                    case 'save': // Handles both create and update
                         // Add/Update timestamp before saving
                        const dataToSaveOnline = { ...data, updated_at: new Date().toISOString() };
                        result = await window.DB[entity].save(dataToSaveOnline);
                        // Update local cache with the saved data (which includes server ID/timestamps)
                        if (result) await LocalDB[entity].save(result); // Await here to ensure cache is updated before returning
                        break;
                    case 'delete':
                        result = await window.DB[entity].delete(data); // data is the ID here
                        // Update local cache
                        if (result) await LocalDB[entity].delete(data); // Await cache update
                        break;
                    // Add other specific read operations like getByMonth if needed
                    case 'getByMonth': // Example for salaries
                        if (entity === 'salaries' && data?.year !== undefined && data?.month !== undefined) {
                            result = await window.DB.salaries.getByMonth(data.year, data.month);
                            // Optionally cache this specific query result - complex, might skip
                        } else {
                             throw new Error(`Invalid parameters for ${entity}.${action}`);
                        }
                        break;
                     // Add getUnpaidByEmployeeId etc. if they should check remote first
                    case 'getUnpaidByEmployeeId': // Example for advances/debts
                         if ((entity === 'advances' || entity === 'debts') && data) { // data is employeeId
                             result = await window.DB[entity].getUnpaidByEmployeeId(data);
                             // Optionally cache
                         } else {
                             throw new Error(`Invalid parameters for ${entity}.${action}`);
                         }
                         break;
                    case 'getTotalUnpaidByEmployeeId': // Example for advances/debts
                         if ((entity === 'advances' || entity === 'debts') && data) { // data is employeeId
                             result = await window.DB[entity].getTotalUnpaidByEmployeeId(data);
                             // This is a calculation, usually not cached directly
                         } else {
                              throw new Error(`Invalid parameters for ${entity}.${action}`);
                         }
                         break;
                    // Settings are special - usually fetch remote and update local
                    case 'getSettings':
                         result = await window.DB.settings.get();
                         if(result) await LocalDB.settings.save(result);
                         else result = await LocalDB.settings.get(); // Fallback to local if remote fails
                         break;
                    case 'saveSettings':
                         result = await window.DB.settings.save(data);
                         if(result) await LocalDB.settings.save(result);
                         break;
                    case 'getRecentActivities':
                         result = await window.DB.activities.getRecent(data); // data is limit
                         // Don't usually cache recent activities aggressively
                         break;
                    case 'addActivity':
                         result = await window.DB.activities.add(data);
                         // Optionally cache locally
                         if(result) await LocalDB.activities.save(result);
                         break;

                    default:
                        throw new Error(`Unsupported online action: ${action} for ${entity}`);
                }
                return result; // Return result from Supabase

            } catch (error) {
                console.error(`Error in remote operation (${entity}.${action}):`, error);
                // Check if it's a network error or Supabase specific issue
                const isNetworkError = !navigator.onLine || error.message.toLowerCase().includes('network error') || error.message.toLowerCase().includes('failed to fetch');
                if (isNetworkError) {
                    console.warn(`Network error detected during ${entity}.${action}. Switching to offline mode.`);
                    this.isOnline = false; // Force offline mode
                    this.updateOnlineStatusUI();
                    // Fall through to offline logic
                } else {
                    // For other Supabase errors (permissions, data validation etc.), rethrow
                    throw error;
                }
            }
        }

        // --- OFFLINE or Fallback: Use LocalDB ---
        console.log(`Performing offline operation: ${entity}.${action}`);
        try {
            let result;
            switch (action) {
                case 'getAll':
                    result = await LocalDB[entity].getAll();
                    break;
                case 'getById':
                    result = await LocalDB[entity].getById(data); // data is ID
                    break;
                case 'save': // Handles both create and update locally
                     // Add/Update timestamp before saving locally
                     const dataToSaveLocal = { ...data, updated_at: new Date().toISOString() };
                    // Save to local DB first (will generate local ID if needed)
                    result = await LocalDB[entity].save(dataToSaveLocal);
                    // Create pending change to sync later
                    await this.savePendingChange({
                        entity,
                        action: data.id ? 'update' : 'create', // Determine action based on original data
                        data: result // Queue the data *as saved locally* (including local ID if generated)
                    });
                    break;
                case 'delete':
                    const itemToDelete = await LocalDB[entity].getById(data); // data is ID
                    // Delete from local DB
                    result = await LocalDB[entity].delete(data);
                    // Create pending change *only if item existed locally*
                    if (itemToDelete) {
                        await this.savePendingChange({
                            entity,
                            action: 'delete',
                            data: { id: data } // Only need ID for delete queue
                        });
                    }
                    break;
                 // Add local implementations for other read operations
                 case 'getByMonth': // Example for salaries
                     if (entity === 'salaries' && data?.year !== undefined && data?.month !== undefined) {
                         const allLocalSalaries = await LocalDB.salaries.getAll();
                         result = allLocalSalaries.filter(salary => {
                             // Ensure period exists and has startDate
                             if(!salary.period?.startDate) return false;
                             const date = new Date(salary.period.startDate); // Use period start date for month check
                             return date.getFullYear() === data.year && date.getMonth() === data.month;
                         });
                     } else {
                          throw new Error(`Invalid parameters for local ${entity}.${action}`);
                     }
                     break;
                 case 'getUnpaidByEmployeeId': // Example for advances/debts
                     if ((entity === 'advances' || entity === 'debts') && data) { // data is employeeId
                         const allLocal = await LocalDB[entity].getAll();
                         result = allLocal.filter(item => item.employeeId === data && !item.isPaid);
                     } else {
                         throw new Error(`Invalid parameters for local ${entity}.${action}`);
                     }
                     break;
                 case 'getTotalUnpaidByEmployeeId': // Example for advances/debts
                     if ((entity === 'advances' || entity === 'debts') && data) { // data is employeeId
                         const unpaidItems = await this.performOperation(entity, 'getUnpaidByEmployeeId', data); // Use the local version
                         result = unpaidItems.reduce((sum, item) => sum + (item.amount || 0), 0);
                     } else {
                          throw new Error(`Invalid parameters for local ${entity}.${action}`);
                     }
                     break;
                 case 'getSettings':
                     result = await LocalDB.settings.get();
                     break;
                 case 'saveSettings':
                     result = await LocalDB.settings.save(data);
                     await this.savePendingChange({ entity: 'settings', action: 'update', data: result }); // Settings are always update
                     break;
                 case 'getRecentActivities':
                     const localActivities = await LocalDB.activities.getAll();
                     result = localActivities.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, data); // data is limit
                     break;
                 case 'addActivity':
                     const localActivity = { ...data, id: `local_${Date.now()}`, timestamp: new Date().toISOString()};
                     result = await LocalDB.activities.save(localActivity);
                     // Don't typically queue activities added offline unless critical
                     // await this.savePendingChange({ entity: 'activities', action: 'create', data: data });
                     break;

                default:
                    throw new Error(`Unsupported offline action: ${action} for ${entity}`);
            }
            return result; // Return result from LocalDB
        } catch (error) {
            console.error(`Error in local operation (${entity}.${action}):`, error);
            throw error; // Rethrow local errors
        }
    },

    // --- Entity-specific methods that use performOperation ---
    // These provide a cleaner API for the rest of the app

    employees: {
        getAll: async function() { return await DataManager.performOperation('employees', 'getAll'); },
        getById: async function(id) { return await DataManager.performOperation('employees', 'getById', id); },
        save: async function(data) { return await DataManager.performOperation('employees', 'save', data); },
        delete: async function(id) { return await DataManager.performOperation('employees', 'delete', id); }
    },

    salaries: {
        getAll: async function() { return await DataManager.performOperation('salaries', 'getAll'); },
        getById: async function(id) { return await DataManager.performOperation('salaries', 'getById', id); },
        save: async function(data) { return await DataManager.performOperation('salaries', 'save', data); },
        delete: async function(id) { return await DataManager.performOperation('salaries', 'delete', id); },
        // Pass year/month in data object for performOperation
        getByMonth: async function(year, month) { return await DataManager.performOperation('salaries', 'getByMonth', { year, month }); }
    },

    advances: {
        getAll: async function() { return await DataManager.performOperation('advances', 'getAll'); },
        getById: async function(id) { return await DataManager.performOperation('advances', 'getById', id); },
        save: async function(data) { return await DataManager.performOperation('advances', 'save', data); },
        delete: async function(id) { return await DataManager.performOperation('advances', 'delete', id); },
        // Pass employeeId in data argument for performOperation
        getUnpaidByEmployeeId: async function(employeeId) { return await DataManager.performOperation('advances', 'getUnpaidByEmployeeId', employeeId); },
        getTotalUnpaidByEmployeeId: async function(employeeId) { return await DataManager.performOperation('advances', 'getTotalUnpaidByEmployeeId', employeeId); },
        // You might need getByEmployeeId as well
        getByEmployeeId: async function(employeeId) {
             // This wasn't explicitly in performOperation, add if needed or implement locally
             if (DataManager.isOnline && window.DB?.isInitialized()) {
                 try { return await window.DB.advances.getByEmployeeId(employeeId); } catch (e) { /* fallback? */ }
             }
             const allLocal = await LocalDB.advances.getAll();
             return allLocal.filter(item => item.employeeId === employeeId);
         }
    },

    sanctions: {
        getAll: async function() { return await DataManager.performOperation('sanctions', 'getAll'); },
        getById: async function(id) { return await DataManager.performOperation('sanctions', 'getById', id); },
        save: async function(data) { return await DataManager.performOperation('sanctions', 'save', data); },
        delete: async function(id) { return await DataManager.performOperation('sanctions', 'delete', id); },
         // Add getByEmployeeId if needed (similar to advances)
         getByEmployeeId: async function(employeeId) {
             if (DataManager.isOnline && window.DB?.isInitialized()) {
                 try { return await window.DB.sanctions.getByEmployeeId(employeeId); } catch (e) { /* fallback? */ }
             }
             const allLocal = await LocalDB.sanctions.getAll();
             return allLocal.filter(item => item.employeeId === employeeId);
         }
    },

    debts: {
        getAll: async function() { return await DataManager.performOperation('debts', 'getAll'); },
        getById: async function(id) { return await DataManager.performOperation('debts', 'getById', id); },
        save: async function(data) { return await DataManager.performOperation('debts', 'save', data); },
        delete: async function(id) { return await DataManager.performOperation('debts', 'delete', id); },
        // Pass employeeId in data argument for performOperation
        getUnpaidByEmployeeId: async function(employeeId) { return await DataManager.performOperation('debts', 'getUnpaidByEmployeeId', employeeId); },
        getTotalUnpaidByEmployeeId: async function(employeeId) { return await DataManager.performOperation('debts', 'getTotalUnpaidByEmployeeId', employeeId); },
        // Add getByEmployeeId if needed (similar to advances)
         getByEmployeeId: async function(employeeId) {
             if (DataManager.isOnline && window.DB?.isInitialized()) {
                 try { return await window.DB.debts.getByEmployeeId(employeeId); } catch (e) { /* fallback? */ }
             }
             const allLocal = await LocalDB.debts.getAll();
             return allLocal.filter(item => item.employeeId === employeeId);
         }
    },

    settings: {
        get: async function() { return await DataManager.performOperation('settings', 'getSettings'); },
        save: async function(data) { return await DataManager.performOperation('settings', 'saveSettings', data); }
    },

    activities: {
        // Pass limit in data argument for performOperation
        getRecent: async function(limit = 10) { return await DataManager.performOperation('activities', 'getRecentActivities', limit); },
        add: async function(activityData) { return await DataManager.performOperation('activities', 'addActivity', activityData); }
    },

    // --- Initial Data Load ---
    hasInitialData: async function() {
        try {
            // Check if a few essential stores have data
            const employees = await LocalDB.employees.getAll();
            const settings = await LocalDB.settings.get(); // Check settings existence
            return employees.length > 0 && settings && settings.id === 'app-settings';
        } catch (error) {
             console.error("Error checking for initial data:", error);
             return false;
        }
    },

    fetchInitialData: async function() {
        if (!this.isOnline || !window.DB || !window.DB.isInitialized()) {
            console.warn("Cannot fetch initial data: Offline or Supabase not ready.");
            return false;
        }

        console.log("Fetching initial data from Supabase...");
        window.showLoader("Téléchargement des données initiales...");
        try {
            // Fetch essential data concurrently
            const [employees, settings, salaries, advances, sanctions, debts] = await Promise.all([
                window.DB.employees.getAll(),
                window.DB.settings.get(),
                window.DB.salaries.getAll(), // Fetch all or just recent? Fetching all might be large.
                window.DB.advances.getAll(),
                window.DB.sanctions.getAll(),
                window.DB.debts.getAll()
                // Add other essential data fetches here
            ]);

            // Cache fetched data locally using Promise.all for concurrency
            await Promise.all([
                 LocalDB.employees.saveAll(employees || []),
                 settings ? LocalDB.settings.save(settings) : Promise.resolve(),
                 LocalDB.salaries.saveAll(salaries || []),
                 LocalDB.advances.saveAll(advances || []),
                 LocalDB.sanctions.saveAll(sanctions || []),
                 LocalDB.debts.saveAll(debts || [])
                 // Add other caching operations here
            ]);

            console.log("Initial data fetched and cached locally.");
            window.hideLoader();
            return true;
        } catch (error) {
            console.error("Error fetching initial data:", error);
            window.hideLoader();
            alert("Erreur lors du téléchargement des données initiales.");
            return false;
        }
    }
};

// ==============================================
//            LocalDB (IndexedDB Wrapper)
// ==============================================
// No changes needed to the LocalDB structure itself
// Re-paste the LocalDB object code from your original file here.
// ... (Paste LocalDB object code here) ...
const LocalDB = {
    // Database connection
    db: null,
    dbName: 'LeSims_OfflineData',
    dbVersion: 1, // Increment this if you change schema (e.g., add indexes)

    // Initialize the IndexedDB database
    init: async function() {
        return new Promise((resolve, reject) => {
            if (this.db) { // Already initialized
                resolve(this.db);
                return;
            }
            console.log(`Opening IndexedDB: ${this.dbName} v${this.dbVersion}`);
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                console.log("IndexedDB upgrade needed.");
                const db = event.target.result;
                const transaction = event.target.transaction; // Get transaction for upgrades

                // List of expected stores and their keyPaths/indexes
                const stores = {
                    employees: { keyPath: 'id', indexes: [['lastName', 'lastName'], ['position', 'position']] },
                    salaries: { keyPath: 'id', indexes: [['employeeId', 'employeeId'], ['paymentDate', 'paymentDate']] },
                    advances: { keyPath: 'id', indexes: [['employeeId', 'employeeId'], ['date', 'date'], ['isPaid', 'isPaid']] },
                    sanctions: { keyPath: 'id', indexes: [['employeeId', 'employeeId'], ['date', 'date']] },
                    debts: { keyPath: 'id', indexes: [['employeeId', 'employeeId'], ['date', 'date'], ['isPaid', 'isPaid']] },
                    activities: { keyPath: 'id', indexes: [['timestamp', 'timestamp']] },
                    settings: { keyPath: 'id' },
                    pendingChanges: { keyPath: 'pendingId', indexes: [['timestamp', 'timestamp']] }
                };

                Object.entries(stores).forEach(([storeName, config]) => {
                    let store;
                    if (!db.objectStoreNames.contains(storeName)) {
                        console.log(`Creating object store: ${storeName}`);
                        store = db.createObjectStore(storeName, { keyPath: config.keyPath });
                    } else {
                         console.log(`Object store ${storeName} already exists.`);
                         // Get existing store for potential index updates within the upgrade transaction
                         store = transaction.objectStore(storeName);
                    }

                    // Create indexes if they don't exist
                    if (config.indexes) {
                        config.indexes.forEach(([indexName, keyPath, options = {}]) => {
                            if (!store.indexNames.contains(indexName)) {
                                console.log(`Creating index '${indexName}' on store '${storeName}'`);
                                store.createIndex(indexName, keyPath, options);
                            } else {
                                 console.log(`Index '${indexName}' on store '${storeName}' already exists.`);
                            }
                        });
                    }
                });
                 console.log("IndexedDB upgrade complete.");
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("IndexedDB initialized successfully.");

                // Error handling for the connection itself
                this.db.onerror = (event) => {
                    console.error("IndexedDB database error:", event.target.error);
                };

                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error("Error initializing IndexedDB:", event.target.error);
                reject(event.target.error);
            };

            request.onblocked = () => {
                 console.warn("IndexedDB open request blocked - another tab might have an older version open.");
                 alert("L'application est ouverte dans un autre onglet avec une version différente. Veuillez fermer les autres onglets et rafraîchir.");
                 reject(new Error("IndexedDB blocked"));
            };
        });
    },

    // Generic method to get a transaction and object store
    getStore: function(storeName, mode = 'readonly') {
        if (!this.db) {
            console.error("IndexedDB connection not available.");
            throw new Error("IndexedDB not initialized");
        }
        try {
            const transaction = this.db.transaction(storeName, mode);
            // Optional: Add error handling for the transaction itself
             transaction.onerror = (event) => {
                 console.error(`IndexedDB transaction error on store ${storeName}:`, event.target.error);
             };
            return transaction.objectStore(storeName);
        } catch (error) {
             console.error(`Failed to get store ${storeName}:`, error);
             throw error;
        }
    },

    // --- Generic CRUD Operations ---
    // Wrap requests in Promises for async/await usage

    /** Get single item by ID */
    getById: function(storeName, id) {
        return new Promise((resolve, reject) => {
            try {
                if (!id) return resolve(null); // Return null if ID is invalid/missing
                const store = this.getStore(storeName);
                const request = store.get(id);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = (e) => { console.error(`LocalDB.getById (${storeName}) error:`, e.target.error); reject(e.target.error); };
            } catch (error) { reject(error); }
        });
    },

    /** Get all items from a store */
    getAll: function(storeName) {
        return new Promise((resolve, reject) => {
            try {
                const store = this.getStore(storeName);
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = (e) => { console.error(`LocalDB.getAll (${storeName}) error:`, e.target.error); reject(e.target.error); };
            } catch (error) { reject(error); }
        });
    },

    /** Save (add or update) an item */
    save: function(storeName, data) {
        return new Promise((resolve, reject) => {
            try {
                 // Basic validation
                 if (!data || typeof data !== 'object') return reject(new Error("Invalid data provided to LocalDB.save"));

                 const store = this.getStore(storeName, 'readwrite');
                 const keyPath = store.keyPath;

                // Ensure item has an ID if it's not settings or pendingChanges (auto-generated key)
                // Only generate ID if it doesn't exist and keyPath is 'id'
                 if (keyPath === 'id' && !data.id && storeName !== 'settings') {
                     data.id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                     console.log(`Generated local ID for ${storeName}: ${data.id}`);
                 } else if (!data[keyPath] && storeName !== 'pendingChanges' && storeName !== 'settings') {
                      // Reject if keyPath is something else and value is missing
                      return reject(new Error(`Missing keyPath value '${keyPath}' for store '${storeName}'`));
                 }

                const request = store.put(data);
                request.onsuccess = () => resolve(data); // Resolve with the potentially modified data (with ID)
                request.onerror = (e) => { console.error(`LocalDB.save (${storeName}) error:`, e.target.error); reject(e.target.error); };
            } catch (error) { reject(error); }
        });
    },

    /** Save multiple items efficiently */
    saveAll: function(storeName, items) {
        return new Promise((resolve, reject) => {
            if (!Array.isArray(items)) return reject(new Error("Invalid items array provided to LocalDB.saveAll"));
            if (items.length === 0) return resolve(true); // Nothing to save

            try {
                const store = this.getStore(storeName, 'readwrite');
                const keyPath = store.keyPath;
                let savedCount = 0;
                let errors = [];

                items.forEach(item => {
                     // Ensure ID generation similar to single save
                     if (keyPath === 'id' && !item.id && storeName !== 'settings') {
                         item.id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                     } else if (!item[keyPath] && storeName !== 'pendingChanges' && storeName !== 'settings') {
                         console.error(`Skipping item in saveAll: Missing keyPath value '${keyPath}' for store '${storeName}'`, item);
                         return; // Skip this item
                     }

                    const request = store.put(item);
                    request.onsuccess = () => {
                        savedCount++;
                        if (savedCount === items.length) {
                             if(errors.length > 0) reject(new Error(`${errors.length} errors occurred during saveAll for ${storeName}`));
                             else resolve(true);
                        }
                    };
                    request.onerror = (e) => {
                        console.error(`LocalDB.saveAll (${storeName}) error for item:`, item, e.target.error);
                        errors.push(e.target.error);
                        savedCount++; // Still increment to ensure promise resolves/rejects
                         if (savedCount === items.length) {
                             reject(new Error(`${errors.length} errors occurred during saveAll for ${storeName}`));
                         }
                    };
                });

            } catch (error) { reject(error); }
        });
    },

    /** Delete an item by ID */
    delete: function(storeName, id) {
        return new Promise((resolve, reject) => {
            try {
                 if (!id) return reject(new Error("Invalid ID provided to LocalDB.delete"));
                const store = this.getStore(storeName, 'readwrite');
                const request = store.delete(id);
                request.onsuccess = () => resolve(true); // Indicate success
                request.onerror = (e) => { console.error(`LocalDB.delete (${storeName}) error:`, e.target.error); reject(e.target.error); };
            } catch (error) { reject(error); }
        });
    },

     /** Clear all items from a store */
    clear: function(storeName) {
        return new Promise((resolve, reject) => {
            try {
                const store = this.getStore(storeName, 'readwrite');
                const request = store.clear();
                request.onsuccess = () => resolve(true);
                request.onerror = (e) => { console.error(`LocalDB.clear (${storeName}) error:`, e.target.error); reject(e.target.error); };
            } catch (error) { reject(error); }
        });
    },

    // --- Entity-specific wrappers ---
    employees: {
        getAll: async function() { return await LocalDB.getAll('employees'); },
        getById: async function(id) { return await LocalDB.getById('employees', id); },
        save: async function(data) { return await LocalDB.save('employees', data); },
        saveAll: async function(items) { return await LocalDB.saveAll('employees', items); },
        delete: async function(id) { return await LocalDB.delete('employees', id); }
    },
    salaries: {
        getAll: async function() { return await LocalDB.getAll('salaries'); },
        getById: async function(id) { return await LocalDB.getById('salaries', id); },
        save: async function(data) { return await LocalDB.save('salaries', data); },
        saveAll: async function(items) { return await LocalDB.saveAll('salaries', items); },
        delete: async function(id) { return await LocalDB.delete('salaries', id); }
    },
    advances: {
        getAll: async function() { return await LocalDB.getAll('advances'); },
        getById: async function(id) { return await LocalDB.getById('advances', id); },
        save: async function(data) { return await LocalDB.save('advances', data); },
        saveAll: async function(items) { return await LocalDB.saveAll('advances', items); },
        delete: async function(id) { return await LocalDB.delete('advances', id); }
    },
    sanctions: {
        getAll: async function() { return await LocalDB.getAll('sanctions'); },
        getById: async function(id) { return await LocalDB.getById('sanctions', id); },
        save: async function(data) { return await LocalDB.save('sanctions', data); },
        saveAll: async function(items) { return await LocalDB.saveAll('sanctions', items); },
        delete: async function(id) { return await LocalDB.delete('sanctions', id); }
    },
    debts: {
        getAll: async function() { return await LocalDB.getAll('debts'); },
        getById: async function(id) { return await LocalDB.getById('debts', id); },
        save: async function(data) { return await LocalDB.save('debts', data); },
        saveAll: async function(items) { return await LocalDB.saveAll('debts', items); },
        delete: async function(id) { return await LocalDB.delete('debts', id); }
    },
    activities: {
        getAll: async function() { return await LocalDB.getAll('activities'); },
        getById: async function(id) { return await LocalDB.getById('activities', id); },
        save: async function(data) { return await LocalDB.save('activities', data); },
        saveAll: async function(items) { return await LocalDB.saveAll('activities', items); },
        delete: async function(id) { return await LocalDB.delete('activities', id); }
    },
    settings: {
        get: async function() {
            // Settings uses a fixed key 'app-settings'
            return await LocalDB.getById('settings', 'app-settings') || {
                id: 'app-settings', // Default structure if not found
                companyName: 'Le Sims', currency: 'FCFA', workingDays: 26,
                language: 'fr', dateFormat: 'DD/MM/YYYY', theme: 'dark'
            };
        },
        save: async function(data) {
            data.id = 'app-settings'; // Ensure the fixed key
            return await LocalDB.save('settings', data);
        }
    },
    pendingChanges: {
        getAll: async function() { return await LocalDB.getAll('pendingChanges'); },
        save: async function(data) { return await LocalDB.save('pendingChanges', data); },
        delete: async function(id) { return await LocalDB.delete('pendingChanges', id); }
    }
};
// ==============================================
//            End LocalDB
// ==============================================


// Export to window
window.DataManager = DataManager;
window.LocalDB = LocalDB; // Expose LocalDB if needed directly elsewhere, though DataManager should be the primary interface