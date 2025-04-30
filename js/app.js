    /**
     * app.js
     * Fichier principal de l'application
     * Application de Gestion des Salaires Le Sims
     * (Updated for Supabase & Centralized Init)
     */

    const App = {
        /**
         * Initialisation de l'application
         */
        init: async function() {
            console.log("App.init starting...");
            // Check if Supabase initialized correctly in database-supabase.js
            if (!window.DB || !DB.isInitialized()) {
                 console.error("CRITICAL: Supabase DB object not found or not initialized. Cannot start App.");
                 alert("Erreur critique: Impossible de se connecter à la base de données. L'application ne peut pas démarrer.");
                 document.body.innerHTML = `<div style="padding: 20px; text-align: center; color: red;"><h1>Erreur Critique</h1><p>Connexion base de données échouée.</p></div>`; // Stop further execution
                 return;
            }
            console.log("DB is initialized.");

            // Mettre à jour les éléments dynamiques (like theme, currency symbols) first
            await this.updateDynamicElements();
            console.log("Dynamic elements updated.");

            // Gérer la navigation entre les pages (synchronous)
            this.setupNavigation();
            console.log("Navigation setup complete.");

            // Initialiser les modules séquentiellement
            await this.initModules();
            console.log("All modules initialized.");

            // Gestion des événements globaux (synchronous for now)
            this.bindGlobalEvents();
            console.log("Global events bound.");

            // Charger le tableau de bord par défaut (now async)
            // This should be called AFTER modules are initialized if it depends on them
            // Or ensure loadDashboard fetches its own required data directly
            await this.loadDashboard();
            console.log("Dashboard loaded.");

            console.log('Application initialisée (avec Supabase)');
        },

        /**
         * Initialise les modules de l'application séquentiellement.
         * Ensures DB is ready before modules try to use it.
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
            ];

            for (const item of managers) {
                if (item.manager && typeof item.manager.init === 'function') {
                    console.log(`Initializing ${item.name}...`);
                    window.showLoader(`Initialisation: ${item.name}...`);
                    try {
                        // Ensure the manager's init function is async
                        await item.manager.init();
                        console.log(`${item.name} initialized.`);
                    } catch (error) {
                        console.error(`Error initializing ${item.name}:`, error);
                        // Optionally display an error to the user or disable related UI
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

            menuItems.forEach(item => {
                // Remove existing listener if any to prevent duplicates
                // A more robust way is needed if setupNavigation can be called multiple times
                // item.removeEventListener('click', this.handleNavClick); // Need a named function or store handler

                // Use an async handler directly
                item.addEventListener('click', async (event) => {
                    // Prevent default if it's a link
                    // event.preventDefault();

                    // Retirer la classe active de tous les éléments du menu
                    menuItems.forEach(mi => mi.classList.remove('active'));

                    // Ajouter la classe active à l'élément cliqué
                    item.classList.add('active');

                    // Masquer toutes les pages
                    const pages = document.querySelectorAll('.page');
                    pages.forEach(page => page.classList.remove('active'));

                    // Afficher la page correspondante
                    const pageName = item.getAttribute('data-page');
                    const pageToShow = document.getElementById(`${pageName}-page`);

                    if (pageToShow) {
                        pageToShow.classList.add('active');
                        console.log(`Navigating to ${pageName}`);
                        // Charger le contenu spécifique de la page (now async)
                        await this.loadPageContent(pageName);
                    } else {
                        console.warn(`Page element not found for: ${pageName}`);
                    }
                });
            });

            // Sidebar toggle logic (remains synchronous)
            const sidebarToggle = document.getElementById('sidebar-toggle');
            const sidebar = document.querySelector('.sidebar');
            if (sidebarToggle && sidebar) {
                sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('active'));
                document.addEventListener('click', (event) => {
                    const isMobile = window.innerWidth <= 992;
                    if (isMobile && sidebar.classList.contains('active') && !sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
                        sidebar.classList.remove('active');
                    }
                });
            }
        },


        /**
         * Charge le contenu spécifique à une page
         * Assumes the corresponding Manager's init has already run
         * and rendered the basic page structure. This focuses on loading/reloading data.
         */
        loadPageContent: async function(pageName) {
            console.log(`Loading content for page: ${pageName}`);
            window.showLoader(`Chargement: ${pageName}...`);
            try {
                // For most pages, the content loading is handled by the manager's load functions
                // called during navigation or filtering. We might just need to ensure the manager exists.
                switch (pageName) {
                    case 'dashboard':
                        await this.loadDashboard();
                        break;
                    case 'employees':
                        if (window.EmployeesManager?.loadEmployees) await window.EmployeesManager.loadEmployees(); else console.warn("EmployeesManager not ready");
                        break;
                    case 'salaries':
                        if (window.SalariesManager?.loadSalariesData) {
                             window.SalariesManager.updateCurrentMonthDisplay(); // Ensure month display is correct
                             await window.SalariesManager.loadSalariesData();
                        } else console.warn("SalariesManager not ready");
                        break;
                    case 'advances':
                        if (window.AdvancesManager?.loadAdvances) await window.AdvancesManager.loadAdvances(); else console.warn("AdvancesManager not ready");
                        break;
                    case 'sanctions':
                        if (window.SanctionsManager?.loadSanctions) await window.SanctionsManager.loadSanctions(); else console.warn("SanctionsManager not ready");
                        break;
                    case 'debts':
                        if (window.DebtsManager?.loadDebts) await window.DebtsManager.loadDebts(); else console.warn("DebtsManager not ready");
                        break;
                    case 'reports':
                        // Reports page might just need structure, generation is on demand
                        if (window.ReportsManager?.loadReportsPage) await window.ReportsManager.loadReportsPage(); else console.warn("ReportsManager not ready");
                        break;
                    case 'settings':
                        // Settings page loads its content within its own load function
                        await this.loadSettingsPage();
                        break;
                    default:
                        console.warn(`No specific content load logic for page: ${pageName}`);
                }
            } catch (error) {
                console.error(`Error loading page content for ${pageName}:`, error);
                const pageElement = document.getElementById(`${pageName}-page`);
                if (pageElement) pageElement.innerHTML = `<p class="error-message">Erreur chargement contenu.</p>`;
            } finally {
                 window.hideLoader();
            }
        },

        /**
         * Charge le tableau de bord
         */
        loadDashboard: async function() {
            console.log("Loading dashboard data...");
            try {
                 await this.updateDashboardStats();
                 await this.loadRecentActivities();
                 this.initDashboardCharts(); // Assumed synchronous
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
         * Met à jour les statistiques du tableau de bord
         */
        updateDashboardStats: async function() {
            const totalEmployeesElement = document.getElementById('total-employees');
            const totalSalaryElement = document.getElementById('total-salary');
            const totalAdvancesElement = document.getElementById('total-advances');
            const totalDebtsElement = document.getElementById('total-debts');
            if (!totalEmployeesElement || !totalSalaryElement || !totalAdvancesElement || !totalDebtsElement) return;

            // Reset to loading state or keep previous value? Resetting might be clearer.
             totalEmployeesElement.textContent = '...';
             totalSalaryElement.textContent = '...';
             totalAdvancesElement.textContent = '...';
             totalDebtsElement.textContent = '...';

            try {
                // Fetch data concurrently
                const [employees, settings] = await Promise.all([
                    DB.employees.getAll(),
                    DB.settings.get()
                ]);

                if (!Array.isArray(employees)) throw new Error("Employee data invalid");
                if (!settings) throw new Error("Settings data invalid");

                const totalEmployees = employees.length;
                const currencySymbol = settings.currency || 'FCFA';

                const totalSalary = employees.reduce((sum, emp) => sum + (emp.baseSalary || 0), 0);

                // Fetch totals concurrently using Promise.all
                const unpaidAdvancesPromises = employees.map(emp => DB.advances.getTotalUnpaidByEmployeeId(emp.id));
                const unpaidDebtsPromises = employees.map(emp => DB.debts.getTotalUnpaidByEmployeeId(emp.id));

                const [unpaidAdvancesResults, unpaidDebtsResults] = await Promise.all([
                    Promise.all(unpaidAdvancesPromises),
                    Promise.all(unpaidDebtsPromises)
                ]);

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
         * Charge les activités récentes
         */
        loadRecentActivities: async function() {
            const activitiesContainer = document.getElementById('recent-activities');
            if (!activitiesContainer) return;
            activitiesContainer.innerHTML = '<div class="loading-spinner-inline"></div> Chargement activités...'; // Loading state

            try {
                const recentActivities = await DB.activities.getRecent(5);
                 if (!Array.isArray(recentActivities)) throw new Error("Recent activities data invalid");

                if (recentActivities.length === 0) {
                    activitiesContainer.innerHTML = '<div class="empty-message">Aucune activité récente</div>';
                    return;
                }

                // Build activity list HTML (same logic as before)
                 const activitiesHTML = recentActivities.map(activity => {
                    let iconClass = 'edit';
                    if (activity.type === 'add') iconClass = 'plus';
                    else if (activity.type === 'delete') iconClass = 'trash';
                    else if (activity.type === 'import') iconClass = 'upload';
                    else if (activity.type === 'login') iconClass = 'sign-in-alt';

                    const date = new Date(activity.timestamp);
                    const formattedDate = date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

                    return `
                        <div class="activity-item">
                            <div class="activity-icon ${activity.type || 'edit'}"><i class="fas fa-${iconClass}"></i></div>
                            <div class="activity-content"><div class="activity-title">${activity.description || 'N/A'}</div><div class="activity-time">${formattedDate}</div></div>
                        </div>`;
                }).join('');
                activitiesContainer.innerHTML = activitiesHTML;

            } catch (error) {
                console.error("Error loading recent activities:", error);
                activitiesContainer.innerHTML = '<div class="empty-message">Erreur chargement activités</div>';
            }
        },

        /**
         * Initialise les graphiques du tableau de bord
         */
        initDashboardCharts: function() {
            // ... (remains the same placeholder logic) ...
            const salaryChartContainer = document.getElementById('salary-chart');
            const monthlyChartContainer = document.getElementById('monthly-chart');
            if (salaryChartContainer) salaryChartContainer.innerHTML = `<div class="chart-placeholder"><i class="fas fa-chart-pie"></i><p>Graphique répartition salaires</p></div>`;
            if (monthlyChartContainer) monthlyChartContainer.innerHTML = `<div class="chart-placeholder"><i class="fas fa-chart-line"></i><p>Graphique évolution mensuelle</p></div>`;
        },

        /**
         * Charge la page des paramètres
         */
        loadSettingsPage: async function() {
            const settingsPage = document.getElementById('settings-page');
            if (!settingsPage) return;
            settingsPage.innerHTML = '<div class="loading-spinner-inline"></div> Chargement paramètres...'; // Loading state

            try {
                const settings = await DB.settings.get();
                if (!settings) throw new Error("Failed to load settings");

                // Build settings page HTML (same as before)
                 settingsPage.innerHTML = `
                     <div class="page-header"><h1>Paramètres</h1></div>
                     <div class="card mb-4">
                         <div class="card-body">
                             <form id="settings-form">
                                 {/* ... form groups from previous version ... */}
                                <div class="form-group"><label for="company-name">Nom Entreprise</label><input type="text" id="company-name" class="form-control" value="${settings.companyName || ''}"></div>
                                <div class="form-grid">
                                    <div class="form-group"><label for="currency">Devise</label><input type="text" id="currency" class="form-control" value="${settings.currency || ''}"></div>
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
                         <div class="card-body"><div class="data-actions">
                             <div><h4>Exporter</h4><p>(Non implémenté)</p><button id="export-data-btn" class="btn btn-outline" disabled><i class="fas fa-download"></i> Exporter</button></div>
                             <div class="mt-4"><h4>Importer</h4><p>(Non implémenté)</p><input type="file" id="import-file" accept=".json" style="display: none;"><button id="import-data-btn" class="btn btn-outline" disabled><i class="fas fa-upload"></i> Importer</button></div>
                             <div class="mt-4"><h4 class="text-danger">Réinitialiser</h4><p>(Non implémenté)</p><button id="reset-data-btn" class="btn btn-danger" disabled><i class="fas fa-trash"></i> Réinitialiser</button></div>
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
                 // Remove previous listener if any to avoid duplicates
                 // saveSettingsBtn.removeEventListener('click', this.handleSaveSettings); // Requires named handler

                 saveSettingsBtn.addEventListener('click', this.handleSaveSettings); // Assign named handler
            }
            // Export/Import/Reset buttons are disabled, no listeners needed for now
        },

        // --- Event Handler for Saving Settings ---
        handleSaveSettings: async () => { // Use arrow function or bind 'this' if needed
            const companyName = document.getElementById('company-name').value;
            const currency = document.getElementById('currency').value;
            const workingDays = parseInt(document.getElementById('working-days').value, 10);
            const language = document.getElementById('language').value;
            const dateFormat = document.getElementById('date-format').value;
            const theme = document.getElementById('theme').value;

            // Basic validation
            if (!companyName || !currency || isNaN(workingDays) || workingDays < 1 || workingDays > 31) {
                alert("Veuillez vérifier les valeurs des paramètres.");
                return;
            }

            const updatedSettings = { companyName, currency, workingDays, language, dateFormat, theme };

            window.showLoader("Enregistrement...");
            try {
                 const saved = await DB.settings.save(updatedSettings);
                 if (saved) {
                     alert('Paramètres enregistrés.');
                     // Update UI elements immediately that depend on settings
                     await App.updateDynamicElements(); // Use App context
                 } else {
                     alert('Erreur enregistrement.');
                 }
            } catch (error) {
                 console.error("Error saving settings:", error);
                 alert('Erreur enregistrement.');
            } finally {
                 window.hideLoader();
            }
        },


        /**
         * Met à jour les éléments dynamiques de l'interface
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

            // Update currency and theme (async)
            try {
                const settings = await DB.settings.get();
                const currencySymbol = settings?.currency || 'FCFA';
                document.querySelectorAll('.currency-symbol').forEach(el => el.textContent = currencySymbol);
                // Update all currency displays, e.g., on dashboard stats
                 document.querySelectorAll('#total-salary, #total-advances, #total-debts').forEach(el => {
                     if (el.textContent !== 'Erreur' && el.textContent !== '...') { // Avoid replacing error messages
                        const value = el.textContent.split(' ')[0]; // Keep existing value if loaded
                        el.textContent = `${value} ${currencySymbol}`;
                     } else if (el.textContent === '...') { // If loading, set default
                         el.textContent = `0 ${currencySymbol}`;
                     }
                 });


                 const theme = settings?.theme || 'dark';
                 document.body.classList.toggle('light-theme', theme === 'light');

            } catch (error) {
                console.error("Error updating dynamic elements based on settings:", error);
                 document.querySelectorAll('.currency-symbol').forEach(el => el.textContent = 'FCFA'); // Fallback
            }
        },

        /**
         * Attache les gestionnaires d'événements globaux
         */
        bindGlobalEvents: function() {
            // Disable header buttons for now
            const exportDataBtn = document.getElementById('export-data');
            if (exportDataBtn) exportDataBtn.disabled = true;
            const importDataBtn = document.getElementById('import-data');
            if (importDataBtn) importDataBtn.disabled = true;

            // Resize listener (sync)
            window.addEventListener('resize', () => {
                const sidebar = document.querySelector('.sidebar');
                if (window.innerWidth > 992 && sidebar) sidebar.classList.remove('active');
            });

            // Global search (sync setup, async action via click handler)
            const searchBox = document.querySelector('.header .search-box input');
            if (searchBox) {
                searchBox.addEventListener('keyup', (event) => {
                    if (event.key === 'Enter') {
                        const searchValue = searchBox.value.trim();
                        if (searchValue) {
                            const employeesMenuItem = document.querySelector('.sidebar-menu li[data-page="employees"]');
                            if (employeesMenuItem) {
                                // Trigger navigation click (which is now async)
                                employeesMenuItem.click();
                                // The search itself will be handled by EmployeesManager.loadEmployees
                                // We need to ensure the value is passed or read correctly there.
                                // A slight delay might still be needed if navigation takes time.
                                setTimeout(() => {
                                    const employeeSearchBox = document.getElementById('employee-search');
                                    if (employeeSearchBox) {
                                        employeeSearchBox.value = searchValue;
                                        // Trigger input event for EmployeesManager listener
                                        employeeSearchBox.dispatchEvent(new Event('input', { bubbles: true }));
                                    }
                                }, 300); // Delay to allow page switch/load
                            }
                        }
                    }
                });
            }
        }
    };

    // Initialisation de l'application au chargement du DOM (now async)
    document.addEventListener('DOMContentLoaded', async function() {
        console.log("DOMContentLoaded event fired.");
        try {
            // App.init now handles DB check and module initialization
            await App.init();
        } catch (error) {
            console.error("Erreur fatale lors de l'initialisation de l'application:", error);
            document.body.innerHTML = `<div style="padding: 20px; text-align: center; color: red;"><h1>Erreur Critique</h1><p>L'application n'a pas pu démarrer.</p><p>${error.message}</p></div>`;
        }
    });
    