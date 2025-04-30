/**
 * app.js
 * Fichier principal de l'application
 * Application de Gestion des Salaires Le Sims
 * (Updated for DataManager integration & enhanced UI feedback)
 */

const App = {
    /**
     * Initialisation de l'application
     */
    init: async function() {
        console.log("App.init starting...");

        try {
            // Initialize the DataManager first - it handles DB initializations
            const dataManagerInitialized = await DataManager.init(); // DataManager now calls DB._ensureInitialized() if online

            if (!dataManagerInitialized) {
                // DataManager init handles critical errors like IndexedDB failure.
                // Further app execution might be compromised.
                console.error("App Init Aborted: DataManager initialization failed.");
                // Optionally display a more prominent error to the user here
                return false; // Stop app initialization
            }

            // At this point, DataManager is initialized, Supabase *might* be initialized if online.

            // Check if we need to fetch initial data (e.g., first run or after clearing cache)
            const hasLocalData = await DataManager.hasInitialData();
            if (!hasLocalData && DataManager.isOnline && window.DB?.isInitialized()) { // Check online and DB ready
                console.log("Fetching initial data from remote...");
                await DataManager.fetchInitialData(); // Fetch and cache
            } else if (!hasLocalData && !DataManager.isOnline) {
                 console.warn("Cannot fetch initial data: App is offline and no local data found.");
                 // Maybe display a message to the user?
            } else {
                console.log("Initial data check complete.");
            }

            // Continue with UI updates and module initialization
            await this.updateDynamicElements(); // Uses DataManager for settings
            console.log("Dynamic elements updated.");

            this.setupNavigation();
            console.log("Navigation setup complete.");

            // Initialize feature modules (assuming they use DataManager now)
            await this.initModules();
            console.log("All modules initialized.");

            this.bindGlobalEvents();
            console.log("Global events bound.");

            await this.loadDashboard(); // Load initial dashboard view (uses DataManager)
            console.log("Dashboard loaded.");

            console.log('Application initialisée (avec support hors ligne)');
            return true;
        } catch (error) {
            console.error("Fatal error during app initialization:", error);
            window.hideLoader(); // Ensure loader is hidden on fatal error
            document.body.innerHTML = `<div style="padding: 20px; text-align: center; color: red;"><h1>Erreur Critique</h1><p>L'application n'a pas pu démarrer.</p><p>${error.message}</p></div>`;
            return false;
        }
    },

    /**
     * Initialise les modules de l'application séquentiellement.
     * Assumes modules now use DataManager internally.
     */
    initModules: async function() {
        console.log("Initializing modules...");
        window.showLoader("Initialisation des modules..."); // Show loader

        const managers = [
            { name: 'EmployeesManager', manager: window.EmployeesManager },
            { name: 'SalariesManager', manager: window.SalariesManager },
            { name: 'AdvancesManager', manager: window.AdvancesManager },
            { name: 'SanctionsManager', manager: window.SanctionsManager },
            { name: 'DebtsManager', manager: window.DebtsManager },
            { name: 'ReportsManager', manager: window.ReportsManager }
            // Add other managers if they exist
        ];

        for (const item of managers) {
            if (item.manager && typeof item.manager.init === 'function') {
                console.log(`Initializing ${item.name}...`);
                window.showLoader(`Initialisation: ${item.name}...`);
                try {
                    await item.manager.init(); // Call init (should use DataManager)
                    console.log(`${item.name} initialized.`);
                } catch (error) {
                    console.error(`Error initializing ${item.name}:`, error);
                    alert(`Erreur lors de l'initialisation du module ${item.name}. Certaines fonctionnalités pourraient être indisponibles.`);
                }
            } else {
                console.warn(`${item.name} not found or does not have an init method.`);
            }
        }
        window.hideLoader(); // Hide loader after all modules attempt init
        console.log("Module initialization complete.");
    },

    /**
     * Configure la navigation entre les pages
     */
    setupNavigation: function() {
        const menuItems = document.querySelectorAll('.sidebar-menu li');
        const pages = document.querySelectorAll('.page'); // Cache pages NodeList

        menuItems.forEach(item => {
            item.addEventListener('click', async (event) => {
                // Check if already active to prevent unnecessary reloads
                if (item.classList.contains('active')) return;

                // Deactivate other items and pages
                menuItems.forEach(mi => mi.classList.remove('active'));
                pages.forEach(page => page.classList.remove('active'));

                // Activate clicked item and corresponding page
                item.classList.add('active');
                const pageName = item.getAttribute('data-page');
                const pageToShow = document.getElementById(`${pageName}-page`);

                if (pageToShow) {
                    pageToShow.classList.add('active');
                    console.log(`Navigating to ${pageName}`);
                    // Load/refresh content for the page
                    await this.loadPageContent(pageName);
                } else {
                    console.warn(`Page element not found for: ${pageName}`);
                }

                // Close sidebar on mobile after navigation
                 const sidebar = document.querySelector('.sidebar');
                 const isMobile = window.innerWidth <= 992;
                 if (isMobile && sidebar && sidebar.classList.contains('active')) {
                     sidebar.classList.remove('active');
                 }
            });
        });

        // Sidebar toggle logic
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content'); // Need main content to add listener

        if (sidebarToggle && sidebar && mainContent) {
            sidebarToggle.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent click from propagating to document
                sidebar.classList.toggle('active');
            });

            // Close sidebar if clicking outside on mobile
            mainContent.addEventListener('click', (event) => {
                 const isMobile = window.innerWidth <= 992;
                 // Close only if sidebar is active, on mobile, and click target is not the toggle button or inside the sidebar
                if (isMobile && sidebar.classList.contains('active') && !sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
                    sidebar.classList.remove('active');
                }
            });
        }
    },


    /**
     * Charge le contenu spécifique à une page (refreshes data using DataManager)
     */
    loadPageContent: async function(pageName) {
        console.log(`Loading content for page: ${pageName}`);
        window.showLoader(`Chargement: ${pageName}...`);
        try {
            // Use DataManager wrappers or ensure managers use DataManager internally
            switch (pageName) {
                case 'dashboard':
                    await this.loadDashboard(); // Uses DataManager internally now
                    break;
                case 'employees':
                    if (window.EmployeesManager?.loadEmployees) await window.EmployeesManager.loadEmployees();
                    else console.warn("EmployeesManager not ready or loadEmployees not found");
                    break;
                case 'salaries':
                    if (window.SalariesManager?.loadSalariesData) {
                         window.SalariesManager.updateCurrentMonthDisplay();
                         await window.SalariesManager.loadSalariesData();
                    } else console.warn("SalariesManager not ready or loadSalariesData not found");
                    break;
                case 'advances':
                    if (window.AdvancesManager?.loadAdvances) await window.AdvancesManager.loadAdvances();
                    else console.warn("AdvancesManager not ready or loadAdvances not found");
                    break;
                case 'sanctions':
                    if (window.SanctionsManager?.loadSanctions) await window.SanctionsManager.loadSanctions();
                     else console.warn("SanctionsManager not ready or loadSanctions not found");
                    break;
                case 'debts':
                    if (window.DebtsManager?.loadDebts) await window.DebtsManager.loadDebts();
                     else console.warn("DebtsManager not ready or loadDebts not found");
                    break;
                case 'reports':
                    if (window.ReportsManager?.loadReportsPage) await window.ReportsManager.loadReportsPage();
                     else console.warn("ReportsManager not ready or loadReportsPage not found");
                    break;
                case 'settings':
                    await this.loadSettingsPage(); // Uses DataManager internally now
                    break;
                default:
                    console.warn(`No specific content load logic for page: ${pageName}`);
            }
        } catch (error) {
            console.error(`Error loading page content for ${pageName}:`, error);
            const pageElement = document.getElementById(`${pageName}-page`);
            if (pageElement) pageElement.innerHTML = `<p class="error-message">Erreur chargement contenu.</p>`;
             alert(`Erreur lors du chargement de la page ${pageName}.`); // User feedback
        } finally {
             window.hideLoader();
        }
    },

    /**
     * Charge le tableau de bord (Using DataManager)
     */
    loadDashboard: async function() {
        console.log("Loading dashboard data...");
        try {
             await this.updateDashboardStats(); // Uses DataManager
             await this.loadRecentActivities(); // Uses DataManager
             this.initDashboardCharts(); // Placeholder, sync
             console.log("Dashboard data loaded.");
        } catch (error) {
             console.error("Error loading dashboard data:", error);
             // Update dashboard elements to show error state
             const elements = ['total-employees', 'total-salary', 'total-advances', 'total-debts'];
             elements.forEach(id => {
                const el = document.getElementById(id);
                if(el) el.textContent = 'Erreur';
             });
             const activitiesContainer = document.getElementById('recent-activities');
             if(activitiesContainer) activitiesContainer.innerHTML = '<div class="empty-message">Erreur chargement activités</div>';
        }
    },

    /**
     * Met à jour les statistiques du tableau de bord (Using DataManager)
     */
    updateDashboardStats: async function() {
        const totalEmployeesElement = document.getElementById('total-employees');
        const totalSalaryElement = document.getElementById('total-salary');
        const totalAdvancesElement = document.getElementById('total-advances');
        const totalDebtsElement = document.getElementById('total-debts');
        if (!totalEmployeesElement || !totalSalaryElement || !totalAdvancesElement || !totalDebtsElement) return;

        // Reset to loading state
        totalEmployeesElement.textContent = '...';
        totalSalaryElement.textContent = '...';
        totalAdvancesElement.textContent = '...';
        totalDebtsElement.textContent = '...';

        try {
            // Fetch data using DataManager
            const [employees, settings] = await Promise.all([
                DataManager.employees.getAll(),
                DataManager.settings.get() // Use DataManager for settings
            ]);

            if (!Array.isArray(employees)) throw new Error("Données employés invalides");
            if (!settings) throw new Error("Données paramètres invalides");

            const totalEmployees = employees.length;
            const currencySymbol = settings.currency || 'FCFA';

            // Calculate base salary sum locally from fetched employees
            const totalSalary = employees.reduce((sum, emp) => sum + (emp.baseSalary || 0), 0);

            // Fetch totals for advances and debts using DataManager (which handles offline)
            const unpaidAdvancesPromises = employees.map(emp => DataManager.advances.getTotalUnpaidByEmployeeId(emp.id));
            const unpaidDebtsPromises = employees.map(emp => DataManager.debts.getTotalUnpaidByEmployeeId(emp.id));

            // Await all promises
            const [unpaidAdvancesResults, unpaidDebtsResults] = await Promise.all([
                Promise.all(unpaidAdvancesPromises),
                Promise.all(unpaidDebtsPromises)
            ]);

            // Sum the results
            const totalAdvances = unpaidAdvancesResults.reduce((sum, amount) => sum + (amount || 0), 0);
            const totalDebts = unpaidDebtsResults.reduce((sum, amount) => sum + (amount || 0), 0);

            // Update DOM
            totalEmployeesElement.textContent = totalEmployees;
            totalSalaryElement.textContent = `${totalSalary.toLocaleString('fr-FR')} ${currencySymbol}`;
            totalAdvancesElement.textContent = `${totalAdvances.toLocaleString('fr-FR')} ${currencySymbol}`;
            totalDebtsElement.textContent = `${totalDebts.toLocaleString('fr-FR')} ${currencySymbol}`;

        } catch (error) {
            console.error("Error updating dashboard stats:", error);
            totalEmployeesElement.textContent = 'Erreur';
            totalSalaryElement.textContent = 'Erreur';
            totalAdvancesElement.textContent = 'Erreur';
            totalDebtsElement.textContent = 'Erreur';
        }
    },

    /**
     * Charge les activités récentes (Using DataManager)
     */
    loadRecentActivities: async function() {
        const activitiesContainer = document.getElementById('recent-activities');
        if (!activitiesContainer) return;
        activitiesContainer.innerHTML = '<div class="loading-spinner-inline"></div> Chargement activités...';

        try {
            // Use DataManager to get recent activities (handles offline fallback)
            const recentActivities = await DataManager.activities.getRecent(5);

            if (!Array.isArray(recentActivities)) throw new Error("Données activités récentes invalides");

            if (recentActivities.length === 0) {
                activitiesContainer.innerHTML = '<div class="empty-message">Aucune activité récente</div>';
                return;
            }

            // Build activity list HTML (same logic as before)
            const activitiesHTML = recentActivities.map(activity => {
                let iconClass = 'info-circle'; // Default icon
                 const type = activity.type?.toLowerCase();
                 if (type === 'add' || type === 'create') iconClass = 'plus';
                 else if (type === 'edit' || type === 'update') iconClass = 'edit';
                 else if (type === 'delete' || type === 'remove') iconClass = 'trash';
                 else if (type === 'import' || type === 'upload') iconClass = 'upload';
                 else if (type === 'login' || type === 'sign-in-alt') iconClass = 'sign-in-alt';
                 else if (type === 'sync') iconClass = 'sync';

                const date = new Date(activity.timestamp);
                // Check if date is valid before formatting
                const formattedDate = !isNaN(date)
                    ? date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
                    : 'Date invalide';


                return `
                    <div class="activity-item">
                        <div class="activity-icon ${activity.type || 'edit'}"><i class="fas fa-${iconClass}"></i></div>
                        <div class="activity-content">
                           <div class="activity-title">${activity.description || 'N/A'}</div>
                           <div class="activity-time">${formattedDate}</div>
                        </div>
                    </div>`;
            }).join('');
            activitiesContainer.innerHTML = activitiesHTML;

        } catch (error) {
            console.error("Error loading recent activities:", error);
            activitiesContainer.innerHTML = '<div class="empty-message">Erreur chargement activités</div>';
        }
    },

    /**
     * Initialise les graphiques du tableau de bord (Placeholder)
     */
    initDashboardCharts: function() {
        const salaryChartContainer = document.getElementById('salary-chart');
        const monthlyChartContainer = document.getElementById('monthly-chart');
        if (salaryChartContainer) salaryChartContainer.innerHTML = `<div class="chart-placeholder"><i class="fas fa-chart-pie"></i><p>Graphique répartition salaires</p></div>`;
        if (monthlyChartContainer) monthlyChartContainer.innerHTML = `<div class="chart-placeholder"><i class="fas fa-chart-line"></i><p>Graphique évolution mensuelle</p></div>`;
        // TODO: Implement actual chart logic using a library like Chart.js or ApexCharts
        // Fetch data needed for charts using DataManager
    },

    /**
     * Charge la page des paramètres (Using DataManager)
     */
    loadSettingsPage: async function() {
        const settingsPage = document.getElementById('settings-page');
        if (!settingsPage) return;
        settingsPage.innerHTML = '<div class="loading-spinner-inline"></div> Chargement paramètres...';

        try {
            // Get settings using DataManager (handles offline)
            const settings = await DataManager.settings.get();
            if (!settings) throw new Error("Impossible de charger les paramètres.");

            // Build settings page HTML (same as before)
            settingsPage.innerHTML = `
                 <div class="page-header"><h1>Paramètres</h1></div>
                 <div class="card mb-4">
                     <div class="card-body">
                         <form id="settings-form">
                            <div class="form-group"><label for="company-name">Nom Entreprise</label><input type="text" id="company-name" class="form-control" value="${settings.companyName || ''}"></div>
                            <div class="form-grid">
                                <div class="form-group"><label for="currency">Devise</label><input type="text" id="currency" class="form-control" value="${settings.currency || 'FCFA'}"></div>
                                <div class="form-group"><label for="working-days">Jours / Mois</label><input type="number" id="working-days" class="form-control" value="${settings.workingDays || 26}" min="1" max="31"></div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group"><label for="language">Langue</label><select id="language" class="form-control"><option value="fr" ${settings.language === 'fr' ? 'selected' : ''}>Français</option><option value="en" ${settings.language === 'en' ? 'selected' : ''}>Anglais</option></select></div>
                                <div class="form-group"><label for="date-format">Format Date</label><select id="date-format" class="form-control"><option value="DD/MM/YYYY" ${settings.dateFormat === 'DD/MM/YYYY' ? 'selected' : ''}>JJ/MM/AAAA</option><option value="MM/DD/YYYY" ${settings.dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}>MM/JJ/AAAA</option><option value="YYYY-MM-DD" ${settings.dateFormat === 'YYYY-MM-DD' ? 'selected' : ''}>AAAA-MM-JJ</option></select></div>
                            </div>
                            <div class="form-group"><label for="theme">Thème</label><select id="theme" class="form-control"><option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Sombre</option><option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Clair</option></select></div>
                            <div class="form-actions mt-4"><button type="button" id="save-settings" class="btn btn-primary">Enregistrer</button></div>
                         </form>
                     </div>
                 </div>
                 <div class="card mb-4">
                     <div class="card-header"><h3>Gestion Données</h3></div>
                     <div class="card-body"><div class="data-actions" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
                         <div><h4>Exporter Données</h4><p>Exporter toutes les données locales.</p><button id="export-data-btn" class="btn btn-outline"><i class="fas fa-download"></i> Exporter JSON</button></div>
                         <div class="mt-4 mt-md-0"><h4>Importer Données</h4><p>Importer depuis un fichier JSON.</p><input type="file" id="import-file" accept=".json" style="display: none;"><button id="import-data-trigger" class="btn btn-outline"><i class="fas fa-upload"></i> Choisir Fichier</button></div>
                         <div class="mt-4 mt-md-0"><h4>Réinitialiser Données Locales</h4><p class="text-danger">Supprime toutes les données locales.</p><button id="reset-local-data-btn" class="btn btn-danger"><i class="fas fa-trash"></i> Réinitialiser</button></div>
                     </div></div>
                 </div>`;

            await this.bindSettingsEvents(); // Bind events AFTER rendering

        } catch (error) {
             console.error("Error loading settings page:", error);
             settingsPage.innerHTML = `<p class="error-message">Erreur chargement paramètres.</p>`;
        }
    },

    /**
     * Attache les gestionnaires d'événements pour la page des paramètres
     */
    bindSettingsEvents: async function() {
        const saveSettingsBtn = document.getElementById('save-settings');
        if (saveSettingsBtn) {
             saveSettingsBtn.removeEventListener('click', this.handleSaveSettings); // Remove previous listener
             saveSettingsBtn.addEventListener('click', this.handleSaveSettings); // Assign named handler
        }

        // Data management buttons
        const exportBtn = document.getElementById('export-data-btn');
        const importTriggerBtn = document.getElementById('import-data-trigger');
        const importFileEl = document.getElementById('import-file');
        const resetBtn = document.getElementById('reset-local-data-btn');

        if(exportBtn) exportBtn.addEventListener('click', this.handleExportData);
        if(importTriggerBtn && importFileEl) {
            importTriggerBtn.addEventListener('click', () => importFileEl.click());
            importFileEl.addEventListener('change', this.handleImportData);
        }
        if(resetBtn) resetBtn.addEventListener('click', this.handleResetLocalData);

    },

    /**
     * Handler for Saving Settings (Using DataManager)
     */
    handleSaveSettings: async () => {
        const settingsForm = document.getElementById('settings-form');
        if (!settingsForm) return;

        const companyName = settingsForm.querySelector('#company-name').value;
        const currency = settingsForm.querySelector('#currency').value;
        const workingDays = parseInt(settingsForm.querySelector('#working-days').value, 10);
        const language = settingsForm.querySelector('#language').value;
        const dateFormat = settingsForm.querySelector('#date-format').value;
        const theme = settingsForm.querySelector('#theme').value;

        // Basic validation
        if (!companyName || !currency || isNaN(workingDays) || workingDays < 1 || workingDays > 31) {
            alert("Veuillez vérifier les valeurs des paramètres.");
            return;
        }

        // Get current settings ID (should be 'app-settings')
        const currentSettings = await DataManager.settings.get();

        const updatedSettings = {
             id: currentSettings?.id || 'app-settings', // Preserve ID
             companyName, currency, workingDays, language, dateFormat, theme
        };

        window.showLoader("Enregistrement...");
        try {
             // Save using DataManager (handles offline queuing)
             const saved = await DataManager.settings.save(updatedSettings);
             if (saved) {
                 alert('Paramètres enregistrés.');
                 // Update UI elements immediately
                 await App.updateDynamicElements(); // Use App context
                 // Apply theme immediately
                 document.body.classList.toggle('light-theme', theme === 'light');

             } else {
                 alert('Erreur enregistrement.');
             }
        } catch (error) {
             console.error("Error saving settings:", error);
             alert(`Erreur enregistrement: ${error.message}`);
        } finally {
             window.hideLoader();
        }
    },

    // --- Data Management Handlers ---
    handleExportData: async () => {
        console.log("Exporting local data...");
        window.showLoader("Exportation...");
        try {
            const exportData = {};
            const storesToExport = ['employees', 'salaries', 'advances', 'sanctions', 'debts', 'settings', 'activities']; // Add other stores if needed
            for (const storeName of storesToExport) {
                 if (LocalDB[storeName] && typeof LocalDB[storeName].getAll === 'function') {
                    exportData[storeName] = await LocalDB[storeName].getAll();
                } else if(storeName === 'settings'){ // Handle settings specifically
                    exportData[storeName] = await LocalDB.settings.get();
                }
            }

            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `le_sims_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                window.hideLoader();
                alert("Données locales exportées avec succès.");
            }, 0);

        } catch(error) {
            console.error("Error exporting data:", error);
            window.hideLoader();
            alert(`Erreur lors de l'exportation: ${error.message}`);
        }
    },

    handleImportData: async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!confirm("ATTENTION ! L'importation remplacera toutes les données locales existantes. Voulez-vous continuer ?")) {
            event.target.value = null; // Reset file input
            return;
        }

        console.log("Importing local data...");
        window.showLoader("Importation...");

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                const storesToImport = ['employees', 'salaries', 'advances', 'sanctions', 'debts', 'settings', 'activities']; // Match export stores

                // Clear existing local data first
                 await Promise.all(storesToImport.map(storeName => {
                     if(LocalDB[storeName] && typeof LocalDB.clear === 'function'){
                         console.log(`Clearing store: ${storeName}`);
                         return LocalDB.clear(storeName);
                     }
                     return Promise.resolve();
                 }));

                // Import new data
                for (const storeName of storesToImport) {
                    if (importedData[storeName]) {
                        console.log(`Importing data for store: ${storeName}`);
                        if(storeName === 'settings') {
                            // Settings is a single object
                             await LocalDB.settings.save(importedData[storeName]);
                        } else if (Array.isArray(importedData[storeName])) {
                            await LocalDB[storeName].saveAll(importedData[storeName]);
                        }
                    }
                }

                // Clear pending changes as they are likely invalid now
                 await LocalDB.clear('pendingChanges');
                 await DataManager.loadPendingChanges(); // Reload empty pending changes

                window.hideLoader();
                alert("Données importées avec succès. Rechargement de l'application nécessaire.");
                // Force reload to reflect imported data everywhere
                window.location.reload();

            } catch (error) {
                console.error("Error importing data:", error);
                window.hideLoader();
                alert(`Erreur lors de l'importation: ${error.message}`);
            } finally {
                 event.target.value = null; // Reset file input
            }
        };
        reader.readAsText(file);
    },

    handleResetLocalData: async () => {
        if (!confirm("Êtes-vous absolument sûr de vouloir supprimer TOUTES les données locales ? Cette action est IRREVERSIBLE et les données non synchronisées seront perdues.")) {
            return;
        }
        if (!confirm("Seconde confirmation : Vraiment supprimer toutes les données locales ?")) {
            return;
        }

        console.warn("Resetting all local data...");
        window.showLoader("Réinitialisation...");
        try {
             const storesToClear = ['employees', 'salaries', 'advances', 'sanctions', 'debts', 'settings', 'activities', 'pendingChanges'];
             await Promise.all(storesToClear.map(storeName => {
                 if (LocalDB[storeName] && typeof LocalDB.clear === 'function') {
                     console.log(`Clearing store: ${storeName}`);
                     return LocalDB.clear(storeName);
                 }
                 return Promise.resolve();
             }));

             // Clear pending changes array in memory
             DataManager.pendingChanges = [];
             DataManager.updatePendingCountUI();

             window.hideLoader();
             alert("Données locales réinitialisées. L'application va se recharger.");
             window.location.reload(); // Reload to fetch initial data if online

        } catch(error) {
             console.error("Error resetting local data:", error);
             window.hideLoader();
             alert(`Erreur lors de la réinitialisation: ${error.message}`);
        }
    },
    // --- End Data Management Handlers ---


    /**
     * Met à jour les éléments dynamiques de l'interface (Using DataManager)
     */
    updateDynamicElements: async function() {
        // Update date (sync)
        const currentDateElement = document.getElementById('current-date');
        if (currentDateElement) {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            currentDateElement.textContent = new Date().toLocaleDateString('fr-FR', options);
        }
        // Update year (sync)
        const currentYearElement = document.getElementById('current-year');
        if (currentYearElement) currentYearElement.textContent = new Date().getFullYear();

        // Update currency and theme based on settings (async, using DataManager)
        try {
            const settings = await DataManager.settings.get(); // Get settings via DataManager
            const currencySymbol = settings?.currency || 'FCFA';
            const theme = settings?.theme || 'dark';

            // Update currency symbols (ensure elements exist)
            document.querySelectorAll('.currency-symbol').forEach(el => el.textContent = currencySymbol);

            // Update dashboard/other stats currency symbols
            document.querySelectorAll('#total-salary, #total-advances, #total-debts, #total-advances-amount, #paid-advances-amount, #unpaid-advances-amount, #total-debts-amount, #paid-debts-amount, #unpaid-debts-amount').forEach(el => {
                 if (!el) return; // Skip if element doesn't exist on current page
                 const currentText = el.textContent;
                 if (currentText && currentText !== 'Erreur' && currentText !== '...') {
                     // Attempt to preserve numeric value, update symbol
                     const valueMatch = currentText.match(/^-?[\d,.\s]+/);
                     const value = valueMatch ? valueMatch[0].trim() : '0';
                     el.textContent = `${value} ${currencySymbol}`;
                 } else if (currentText === '...') { // Handle loading state
                     el.textContent = `0 ${currencySymbol}`;
                 }
             });

             // Update theme on body
             document.body.classList.toggle('light-theme', theme === 'light');

        } catch (error) {
            console.error("Error updating dynamic elements based on settings:", error);
            // Apply default fallback if settings fail
            document.querySelectorAll('.currency-symbol').forEach(el => el.textContent = 'FCFA');
            document.body.classList.remove('light-theme'); // Default to dark theme on error
        }
    },

    /**
     * Attache les gestionnaires d'événements globaux
     */
    bindGlobalEvents: function() {
        // Header search functionality
        const searchBox = document.querySelector('.header .search-box input');
        if (searchBox) {
             // Use 'keypress' for Enter or 'input' for live search
            searchBox.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    const searchValue = searchBox.value.trim();
                    if (searchValue) {
                        console.log(`Global search triggered for: ${searchValue}`);
                        // Navigate to employees page and trigger search there
                        const employeesMenuItem = document.querySelector('.sidebar-menu li[data-page="employees"]');
                        if (employeesMenuItem && !employeesMenuItem.classList.contains('active')) {
                             employeesMenuItem.click(); // Navigate if not already there
                             // Use setTimeout to allow navigation/page load before setting value
                             setTimeout(() => {
                                 const employeeSearchBox = document.getElementById('employee-search');
                                 if (employeeSearchBox) {
                                     employeeSearchBox.value = searchValue;
                                     // Trigger input event for EmployeesManager listener
                                     employeeSearchBox.dispatchEvent(new Event('input', { bubbles: true }));
                                 }
                             }, 400); // Adjust delay if needed
                        } else if (employeesMenuItem && employeesMenuItem.classList.contains('active')) {
                             // Already on employees page, just trigger search
                             const employeeSearchBox = document.getElementById('employee-search');
                             if (employeeSearchBox) {
                                 employeeSearchBox.value = searchValue;
                                 employeeSearchBox.dispatchEvent(new Event('input', { bubbles: true }));
                             }
                        }
                    } else {
                         // If search is cleared, potentially reload employee list without filter
                          const employeesMenuItem = document.querySelector('.sidebar-menu li[data-page="employees"]');
                          if (employeesMenuItem && employeesMenuItem.classList.contains('active')) {
                              const employeeSearchBox = document.getElementById('employee-search');
                              if (employeeSearchBox) {
                                  employeeSearchBox.value = '';
                                  employeeSearchBox.dispatchEvent(new Event('input', { bubbles: true }));
                              }
                          }
                    }
                     searchBox.blur(); // Remove focus after search
                }
            });
        }

         // Header action buttons (Import/Export are now in settings)
         const exportDataBtn = document.getElementById('export-data'); // In header
         const importDataBtn = document.getElementById('import-data'); // In header
         if(exportDataBtn) exportDataBtn.addEventListener('click', () => {
             // Navigate to settings page or directly trigger export? Let's navigate.
             document.querySelector('.sidebar-menu li[data-page="settings"]')?.click();
             setTimeout(() => document.getElementById('export-data-btn')?.click(), 200); // Trigger export on settings page
         });
         if(importDataBtn) importDataBtn.addEventListener('click', () => {
              document.querySelector('.sidebar-menu li[data-page="settings"]')?.click();
               setTimeout(() => document.getElementById('import-data-trigger')?.click(), 200); // Trigger import on settings page
         });


         // Window resize listener for sidebar (keep as is)
         window.addEventListener('resize', () => {
             const sidebar = document.querySelector('.sidebar');
             if (window.innerWidth > 992 && sidebar) {
                 sidebar.classList.remove('active');
             }
         });
    },

    // --- UI Update Function Definitions ---
    // Moved from index.html inline script for better organization

    updateSyncStatusUI: function(status, message = '') {
         const syncIndicator = document.getElementById('sync-indicator');
         if (syncIndicator) {
             syncIndicator.textContent = message || status; // Display message or status
             // Clear previous classes
             syncIndicator.classList.remove('syncing', 'synced', 'sync-error', 'idle');
             if (status && status !== 'idle') {
                 syncIndicator.classList.add(status);
                 syncIndicator.style.display = 'inline-flex'; // Use flex for icon alignment
             } else {
                 syncIndicator.classList.add('idle');
                 syncIndicator.style.display = 'none';
             }
             // Optionally hide the "Synced" message after a delay
             if (status === 'synced') {
                 setTimeout(() => {
                      if (syncIndicator.classList.contains('synced')) { // Check if still synced
                          syncIndicator.classList.remove('synced');
                          syncIndicator.classList.add('idle');
                          syncIndicator.style.display = 'none';
                      }
                 }, 3000); // Hide after 3 seconds
             }
         }
    },

    updatePendingCountUI: function() {
         // Use DataManager's state if available
         const count = window.DataManager?.pendingChanges?.length || 0;
         const pendingCountElement = document.getElementById('pending-changes-count');
         if (pendingCountElement) {
             pendingCountElement.textContent = count > 0 ? count : '';
             pendingCountElement.style.display = count > 0 ? 'inline-flex' : 'none'; // Use flex for alignment
         }
    },


};

// Initialisation de l'application au chargement du DOM
document.addEventListener('DOMContentLoaded', async function() {
    console.log("DOMContentLoaded event fired.");
    try {
        await App.init(); // Call the async init function
    } catch (error) {
        // Catch any unhandled errors during init (though init itself has try/catch)
        console.error("Erreur fatale non interceptée lors de l'initialisation:", error);
        window.hideLoader(); // Ensure loader is hidden
        document.body.innerHTML = `<div style="padding: 20px; text-align: center; color: red;"><h1>Erreur Critique</h1><p>L'application n'a pas pu démarrer.</p><p>${error.message}</p></div>`;
    }
});