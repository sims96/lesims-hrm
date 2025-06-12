/**
 * app.js
 * Fichier principal de l'application
 * Application de Gestion des Salaires Le Sims
 * (Updated with Authentication Logic and initialization fix)
 */

const App = {
    // --- NEW: Admin credentials (replace with your actual admin user created in Supabase Auth) ---
    ADMIN_EMAIL: 'admin@lesims.com',

    /**
     * Initialisation de l'application
     */
    init: async function() {
        console.log("App.init starting...");

        try {
            // Initialize the DataManager first - it handles DB initializations
            const dataManagerInitialized = await DataManager.init();

            if (!dataManagerInitialized) {
                console.error("App Init Aborted: DataManager initialization failed.");
                return false; // Stop app initialization
            }

            // --- NEW: Set up auth state change handler ---
            // This ensures that whenever the user logs in or out, the UI will update.
            if(window.DB && typeof window.DB.onAuthStateChange === 'function') {
                DB.onAuthStateChange(this.updateAuthUI.bind(this));
            }

            // At this point, DataManager is initialized, Supabase *might* be initialized if online.
            const hasLocalData = await DataManager.hasInitialData();
            if (!hasLocalData && DataManager.isOnline && window.DB?.isInitialized()) {
                console.log("Fetching initial data from remote...");
                await DataManager.fetchInitialData();
            } else if (!hasLocalData && !DataManager.isOnline) {
                 console.warn("Cannot fetch initial data: App is offline and no local data found.");
            } else {
                console.log("Initial data check complete.");
            }

            // Continue with UI updates and module initialization
            await this.updateDynamicElements();
            console.log("Dynamic elements updated.");

            this.setupNavigation();
            console.log("Navigation setup complete.");

            await this.initModules();
            console.log("All modules initialized.");

            this.bindGlobalEvents(); // This now includes auth event binding
            console.log("Global events bound.");
            
            // --- NEW: Initial UI update for authentication state on load ---
            this.updateAuthUI(window.DB?.currentUser);

            await this.loadDashboard();
            console.log("Dashboard loaded.");

            console.log('Application initialisée (avec support hors ligne)');
            return true;
        } catch (error) {
            console.error("Fatal error during app initialization:", error);
            window.hideLoader();
            document.body.innerHTML = `<div style="padding: 20px; text-align: center; color: red;"><h1>Erreur Critique</h1><p>L'application n'a pas pu démarrer.</p><p>${error.message}</p></div>`;
            return false;
        }
    },
    
    // --- START: NEW AUTHENTICATION METHODS ---
    
    /**
     * Handles the login process by prompting for a password.
     */
    handleLogin: async function() {
        const password = prompt("Veuillez entrer le mot de passe administrateur:");
        if (password === null || password === "") {
            // User cancelled or entered nothing
            return;
        }

        window.showLoader('Connexion...');
        try {
            const user = await DB.signIn(this.ADMIN_EMAIL, password);
            if (user) {
                alert('Connexion réussie! Le mode administrateur est activé.');
            } else {
                alert('Mot de passe incorrect. Veuillez réessayer.');
            }
        } catch (error) {
            console.error("Login error:", error);
            alert("Une erreur s'est produite lors de la connexion.");
        } finally {
            window.hideLoader();
        }
    },

    /**
     * Handles the logout process.
     */
    handleLogout: async function() {
        if (!confirm("Êtes-vous sûr de vouloir vous déconnecter? Vous perdrez les droits de modification.")) {
            return;
        }
        
        window.showLoader('Déconnexion...');
        await DB.signOut();
        window.hideLoader();
        alert('Déconnexion réussie. Le mode lecture seule est activé.');
    },

    /**
     * Updates the UI based on authentication status (logged in or out).
     * This function shows/hides buttons and updates text.
     * @param {object|null} user - The current user object from Supabase, or null.
     */
    updateAuthUI: function(user) {
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const userEmailSpan = document.getElementById('user-email');

        // Ensure all elements exist before proceeding
        if (!loginBtn || !logoutBtn || !userEmailSpan) {
            console.warn("Auth UI elements not found, skipping UI update.");
            return;
        }

        if (user) {
            // User is LOGGED IN
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-block';
            userEmailSpan.textContent = user.email;
            userEmailSpan.style.display = 'inline';
            
            // Add 'admin-mode' class to enable features via CSS if needed
            // This class can be used to show/hide edit/delete buttons throughout the app
            document.body.classList.add('admin-mode');
            console.log("UI updated for AUTHENTICATED user (Admin Mode).");

        } else {
            // User is LOGGED OUT
            loginBtn.style.display = 'inline-block';
            logoutBtn.style.display = 'none';
            userEmailSpan.style.display = 'none';
            
            // Remove 'admin-mode' class to disable features
            document.body.classList.remove('admin-mode');
            console.log("UI updated for ANONYMOUS user (Read-only Mode).");
        }
    },
    
    // --- END: NEW AUTHENTICATION METHODS ---

    /**
     * Initialise les modules de l'application séquentiellement.
     */
    initModules: async function() {
        console.log("Initializing modules...");
        window.showLoader("Initialisation des modules...");

        const managers = [
            { name: 'EmployeesManager', manager: window.EmployeesManager },
            { name: 'SalariesManager', manager: window.SalariesManager },
            { name: 'AdvancesManager', manager: window.AdvancesManager },
            { name: 'SanctionsManager', manager: window.SanctionsManager },
            { name: 'DebtsManager', manager: window.DebtsManager },
            { name: 'ReportsManager', manager: window.ReportsManager },
            { name: 'AccountingManager', manager: window.AccountingManager }
        ];

        for (const item of managers) {
            if (item.manager && typeof item.manager.init === 'function') {
                console.log(`Initializing ${item.name}...`);
                window.showLoader(`Initialisation: ${item.name}...`);
                try {
                    await item.manager.init();
                    // Set initialized flag after successful init to prevent re-initialization
                    item.manager.isInitialized = true; 
                    console.log(`${item.name} initialized.`);
                } catch (error) {
                    console.error(`Error initializing ${item.name}:`, error);
                    alert(`Erreur lors de l'initialisation du module ${item.name}.`);
                }
            } else if (item.manager) {
                // If manager exists but has no init, mark as initialized to prevent re-init issues
                item.manager.isInitialized = true;
                console.log(`${item.name} found, but no init method detected. Marked as ready.`);
            } else {
                console.warn(`${item.name} not found.`);
            }
        }
        window.hideLoader();
        console.log("Module initialization complete.");
    },


    /**
     * Configure la navigation entre les pages
     */
    setupNavigation: function() {
        const menuItems = document.querySelectorAll('.sidebar-menu li');
        const pages = document.querySelectorAll('.page');

        menuItems.forEach(item => {
            item.addEventListener('click', async (event) => {
                if (item.classList.contains('active')) return;

                menuItems.forEach(mi => mi.classList.remove('active'));
                pages.forEach(page => page.classList.remove('active'));

                item.classList.add('active');
                const pageName = item.getAttribute('data-page');
                const pageToShow = document.getElementById(`${pageName}-page`);

                if (pageToShow) {
                    pageToShow.classList.add('active');
                    console.log(`Navigating to ${pageName}`);
                    await this.loadPageContent(pageName);
                } else {
                    console.warn(`Page element not found for: ${pageName}`);
                    await this.loadPageContent(pageName);
                }

                const sidebar = document.querySelector('.sidebar');
                if (window.innerWidth <= 992 && sidebar && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                    document.body.classList.remove('sidebar-active');
                }
            });
        });

        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');

        if (sidebarToggle && sidebar && mainContent) {
            sidebarToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                sidebar.classList.toggle('active');
                if (window.innerWidth <= 992) {
                    document.body.classList.toggle('sidebar-active');
                }
            });

            mainContent.addEventListener('click', (event) => {
                if (window.innerWidth <= 992 && sidebar.classList.contains('active') && !sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
                    sidebar.classList.remove('active');
                    document.body.classList.remove('sidebar-active');
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
            let pageElement = document.getElementById(`${pageName}-page`);
            if (!pageElement) {
                 console.warn(`Page div #${pageName}-page not found, attempting load anyway.`);
            } else {
                 document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                 pageElement.classList.add('active');
            }

            const getManager = (name) => window[name];

            const managerName = `${pageName.charAt(0).toUpperCase() + pageName.slice(1)}Manager`;
            const manager = getManager(managerName);
            // Construct the conventional load function name, e.g., 'loadEmployees', 'loadAdvances'
            const loadFunction = `load${managerName.replace('Manager', 's')}`;

            switch (pageName) {
                case 'dashboard':
                    await this.loadDashboard();
                    break;
                case 'salaries':
                    if (manager?.isInitialized) {
                        manager.updateCurrentMonthDisplay();
                        await manager.loadSalariesData();
                    } else if (manager?.init) {
                        await manager.init();
                    }
                    break;
                case 'settings':
                    await this.loadSettingsPage();
                    break;
                case 'accounting':
                    if (manager?.isInitialized) {
                        await manager.refreshData();
                    } else if (manager?.init) {
                        await manager.init();
                    }
                    break;
                default:
                    // Generic handler for most managers (employees, advances, sanctions, debts, reports)
                    if (manager?.isInitialized && typeof manager[loadFunction] === 'function') {
                        await manager[loadFunction]();
                    } else if (manager?.init) {
                        console.log(`${managerName} not initialized, calling init...`);
                        await manager.init();
                    } else {
                        console.warn(`No specific content load logic for page: ${pageName}`);
                    }
            }
        } catch (error) {
            console.error(`Error loading page content for ${pageName}:`, error);
            let targetPageElement = document.getElementById(`${pageName}-page`);
            if (targetPageElement) {
                 targetPageElement.innerHTML = `<div class="error-message">Erreur chargement contenu: ${error.message}</div>`;
                 targetPageElement.classList.add('active');
            }
             alert(`Erreur lors du chargement de la page ${pageName}.`);
        } finally {
             window.hideLoader();
        }
    },
    
    /**
     * Attache les gestionnaires d'événements globaux
     */
    bindGlobalEvents: function() {
        // --- NEW: Auth Buttons Event Listeners ---
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleLogin());
        }
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }


        // Header search functionality (existing)
        const searchBox = document.querySelector('.header .search-box input');
        if (searchBox) {
            searchBox.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    const searchValue = searchBox.value.trim();
                    if (searchValue) {
                        console.log(`Global search triggered for: ${searchValue}`);
                        // Navigate to employees page and trigger search there
                        const employeesMenuItem = document.querySelector('.sidebar-menu li[data-page="employees"]');
                        if (employeesMenuItem && !employeesMenuItem.classList.contains('active')) {
                             employeesMenuItem.click(); // Navigate if not already there
                             setTimeout(() => {
                                 const employeeSearchBox = document.getElementById('employee-search');
                                 if (employeeSearchBox) {
                                     employeeSearchBox.value = searchValue;
                                     employeeSearchBox.dispatchEvent(new Event('input', { bubbles: true }));
                                 }
                             }, 400); 
                        } else if (employeesMenuItem && employeesMenuItem.classList.contains('active')) {
                             const employeeSearchBox = document.getElementById('employee-search');
                             if (employeeSearchBox) {
                                 employeeSearchBox.value = searchValue;
                                 employeeSearchBox.dispatchEvent(new Event('input', { bubbles: true }));
                             }
                        }
                    }
                     searchBox.blur();
                }
            });
        }

         // Header Action Buttons
         const exportDataBtn = document.getElementById('export-data');
         const importDataBtn = document.getElementById('import-data');

         if(exportDataBtn) {
             exportDataBtn.addEventListener('click', () => {
                 document.querySelector('.sidebar-menu li[data-page="settings"]')?.click();
                 setTimeout(() => document.getElementById('export-data-btn')?.click(), 300);
             });
         }
         if(importDataBtn) {
             importDataBtn.addEventListener('click', () => {
                  document.querySelector('.sidebar-menu li[data-page="settings"]')?.click();
                  setTimeout(() => document.getElementById('import-data-trigger')?.click(), 300);
             });
         }


         // Window resize listener
         window.addEventListener('resize', () => {
             const sidebar = document.querySelector('.sidebar');
             if (window.innerWidth > 992 && sidebar) {
                 sidebar.classList.remove('active');
                 document.body.classList.remove('sidebar-active');
             }
         });
    },

    /**
     * Charge le tableau de bord (Using DataManager)
     */
    loadDashboard: async function() {
        console.log("Loading dashboard data...");
        try {
             await this.updateDashboardStats(); // Uses DataManager
             await this.loadRecentActivities(); // Uses DataManager
             await this.initDashboardCharts(); // Now async to fetch data
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
             const salaryChartContainer = document.getElementById('salary-chart');
             const monthlyChartContainer = document.getElementById('monthly-chart');
             if (salaryChartContainer) salaryChartContainer.innerHTML = `<div class="chart-placeholder"><i class="fas fa-chart-pie"></i><p>Erreur chargement graphique</p></div>`;
             if (monthlyChartContainer) monthlyChartContainer.innerHTML = `<div class="chart-placeholder"><i class="fas fa-chart-line"></i><p>Erreur chargement graphique</p></div>`;
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

        totalEmployeesElement.textContent = '...';
        totalSalaryElement.textContent = '...';
        totalAdvancesElement.textContent = '...';
        totalDebtsElement.textContent = '...';

        try {
            const [employees, settings, expenses, incomes] = await Promise.all([
                DataManager.employees.getAll(),
                DataManager.settings.get(),
                DataManager.expenses?.getAll() || [],
                DataManager.incomes?.getAll() || []
            ]);

            if (!Array.isArray(employees)) throw new Error("Données employés invalides");
            if (!settings) throw new Error("Données paramètres invalides");

            const totalEmployees = employees.length;
            const currencySymbol = settings.currency || 'FCFA';
            const totalSalary = employees.reduce((sum, emp) => sum + (emp.baseSalary || 0), 0);
            
             const unpaidAdvancesResults = await Promise.allSettled(employees.map(emp => DataManager.advances.getTotalUnpaidByEmployeeId(emp.id)));
             const unpaidDebtsResults = await Promise.allSettled(employees.map(emp => DataManager.debts.getTotalUnpaidByEmployeeId(emp.id)));

             const totalAdvances = unpaidAdvancesResults.reduce((sum, result) => sum + (result.status === 'fulfilled' ? result.value : 0), 0);
             const totalDebts = unpaidDebtsResults.reduce((sum, result) => sum + (result.status === 'fulfilled' ? result.value : 0), 0);

            totalEmployeesElement.textContent = totalEmployees;
             totalSalaryElement.textContent = this.formatCurrency(totalSalary, settings.locale, currencySymbol);
             totalAdvancesElement.textContent = this.formatCurrency(totalAdvances, settings.locale, currencySymbol);
             totalDebtsElement.textContent = this.formatCurrency(totalDebts, settings.locale, currencySymbol);

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
            const recentActivities = await DataManager.activities.getRecent(5);

            if (!Array.isArray(recentActivities) || recentActivities.length === 0) {
                activitiesContainer.innerHTML = '<div class="empty-message">Aucune activité récente</div>';
                return;
            }

            activitiesContainer.innerHTML = recentActivities.map(activity => {
                let iconClass = 'info-circle';
                 const type = activity.type?.toLowerCase();
                 if (type?.includes('add') || type?.includes('create')) iconClass = 'plus';
                 else if (type?.includes('edit') || type?.includes('update')) iconClass = 'edit';
                 else if (type?.includes('delete') || type?.includes('remove')) iconClass = 'trash';
                 
                const formattedDate = new Date(activity.timestamp).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

                return `
                    <div class="activity-item">
                        <div class="activity-icon ${activity.type || 'edit'}"><i class="fas fa-${iconClass}"></i></div>
                        <div class="activity-content">
                           <div class="activity-title">${activity.description || 'N/A'}</div>
                           <div class="activity-time">${formattedDate}</div>
                        </div>
                    </div>`;
            }).join('');

        } catch (error) {
            console.error("Error loading recent activities:", error);
            activitiesContainer.innerHTML = '<div class="empty-message">Erreur chargement activités</div>';
        }
    },

    /**
     * Initialise les graphiques du tableau de bord
     */
    initDashboardCharts: async function() {
         const salaryChartContainer = document.getElementById('salary-chart');
         const monthlyChartContainer = document.getElementById('monthly-chart');

         if (!salaryChartContainer || !monthlyChartContainer || typeof Chart === 'undefined') {
             console.warn("Chart containers or Chart.js library not found.");
             return;
         }

         salaryChartContainer.innerHTML = '<canvas id="salary-chart-canvas"></canvas>';
         monthlyChartContainer.innerHTML = '<canvas id="monthly-chart-canvas"></canvas>';
         const salaryCtx = document.getElementById('salary-chart-canvas')?.getContext('2d');
         const monthlyCtx = document.getElementById('monthly-chart-canvas')?.getContext('2d');

         if (!salaryCtx || !monthlyCtx) return;

         window.showLoader('Chargement des graphiques...');
         try {
             const employees = await DataManager.employees.getAll();
             if (Array.isArray(employees) && employees.length > 0) {
                 const positions = {};
                 employees.forEach(emp => {
                     const pos = emp.position || 'Non défini';
                     positions[pos] = (positions[pos] || 0) + 1;
                 });

                 if (salaryCtx.chartInstance) salaryCtx.chartInstance.destroy();
                 salaryCtx.chartInstance = new Chart(salaryCtx, {
                     type: 'doughnut',
                     data: {
                         labels: Object.keys(positions),
                         datasets: [{
                             label: 'Répartition par Poste',
                             data: Object.values(positions),
                             backgroundColor: ['rgba(156, 39, 176, 0.7)', 'rgba(103, 58, 183, 0.7)', 'rgba(63, 81, 181, 0.7)', 'rgba(33, 150, 243, 0.7)'],
                             borderColor: 'var(--dark-card, #2a2a3e)',
                             borderWidth: 2
                         }]
                     },
                     options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels:{color:'var(--text-secondary, #ccc)'} } } }
                 });
             }
             
             const [allSalaries, allExpenses] = await Promise.all([ DataManager.salaries.getAll(), DataManager.expenses.getAll() ]);
             const monthlyTotals = {};
             const labels = [];
             for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                labels.push(d.toLocaleString('fr-FR', { month: 'short', year: '2-digit' }));
                monthlyTotals[key] = { netSalary: 0, expenses: 0 };
             }

             allSalaries.forEach(s => {
                 const d = new Date(s.paymentDate);
                 const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                 if(monthlyTotals[key]) monthlyTotals[key].netSalary += (s.netSalary || 0);
             });
             allExpenses.forEach(e => {
                 const d = new Date(e.date);
                 const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                 if(monthlyTotals[key]) monthlyTotals[key].expenses += (e.amount || 0);
             });

             if (monthlyCtx.chartInstance) monthlyCtx.chartInstance.destroy();
             monthlyCtx.chartInstance = new Chart(monthlyCtx, {
                 type: 'line',
                 data: {
                     labels: labels,
                     datasets: [
                         { label: 'Salaires Nets Payés', data: Object.values(monthlyTotals).map(m => m.netSalary), borderColor: 'rgba(75, 192, 192, 1)', fill: true, tension: 0.2 },
                         { label: 'Dépenses Totales', data: Object.values(monthlyTotals).map(m => m.expenses), borderColor: 'rgba(255, 99, 132, 1)', fill: true, tension: 0.2 }
                     ]
                 },
                 options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks:{color:'var(--text-secondary, #ccc)'}, grid:{color:'rgba(255,255,255,0.1)'} }, x: { ticks:{color:'var(--text-secondary, #ccc)'}, grid:{color:'rgba(255,255,255,0.1)'} } }, plugins: { legend: { position: 'bottom', labels:{color:'var(--text-secondary, #ccc)'} } } }
             });

         } catch (error) {
             console.error("Error initializing dashboard charts:", error);
         } finally {
              window.hideLoader();
         }
     },


    /**
     * Charge la page des paramètres
     */
    loadSettingsPage: async function() {
        const settingsPage = document.getElementById('settings-page');
        if (!settingsPage) return;
        settingsPage.innerHTML = '<div class="loading-spinner-inline"></div> Chargement paramètres...';
        try {
            const settings = await DataManager.settings.get();
            if (!settings) throw new Error("Impossible de charger les paramètres.");
            
            settingsPage.innerHTML = `
                 <div class="page-header"><h1>Paramètres</h1></div>
                 <div class="card mb-4"><div class="card-header"><h3>Général</h3></div>
                     <div class="card-body"><form id="settings-form">
                        <div class="form-group"><label for="company-name">Nom Entreprise</label><input type="text" id="company-name" class="form-control" value="${settings.companyName || ''}"></div>
                        <div class="form-grid">
                            <div class="form-group"><label for="currency">Devise</label><input type="text" id="currency" class="form-control" value="${settings.currency || 'FCFA'}"></div>
                            <div class="form-group"><label for="working-days">Jours / Mois (Paie)</label><input type="number" id="working-days" class="form-control" value="${settings.workingDays || 26}" min="1" max="31"></div>
                        </div>
                        <div class="form-group"><label for="theme">Thème</label><select id="theme" class="form-control"><option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Sombre</option><option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Clair</option></select></div>
                        <div class="form-actions mt-4"><button type="button" id="save-settings" class="btn btn-primary">Enregistrer</button></div>
                     </form></div>
                 </div>
                 <div class="card mb-4"><div class="card-header"><h3>Gestion Données</h3></div>
                     <div class="card-body"><div class="data-actions">
                         <div><h4>Exporter Données</h4><p>Exporter toutes les données.</p><button id="export-data-btn" class="btn btn-outline"><i class="fas fa-download"></i> Exporter JSON</button></div>
                         <div><h4>Importer Données</h4><p>Importer depuis un fichier JSON.</p><input type="file" id="import-file" accept=".json" style="display: none;"><button id="import-data-trigger" class="btn btn-outline"><i class="fas fa-upload"></i> Choisir Fichier</button></div>
                         <div><h4>Réinitialiser Données</h4><p class="text-danger">Supprime TOUTES les données.</p><button id="reset-local-data-btn" class="btn btn-danger"><i class="fas fa-trash"></i> Réinitialiser</button></div>
                     </div></div>
                 </div>`;
            await this.bindSettingsEvents();
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
        if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => this.handleSaveSettings());

        const exportBtn = document.getElementById('export-data-btn');
        if(exportBtn) exportBtn.onclick = this.handleExportData.bind(this);
        
        const importTriggerBtn = document.getElementById('import-data-trigger');
        const importFileEl = document.getElementById('import-file');
        if(importTriggerBtn && importFileEl) {
            importTriggerBtn.onclick = () => importFileEl.click();
            importFileEl.onchange = this.handleImportData.bind(this);
        }

        const resetBtn = document.getElementById('reset-local-data-btn');
        if(resetBtn) resetBtn.onclick = this.handleResetLocalData.bind(this);
    },

    /**
     * Handler for Saving Settings
     */
    handleSaveSettings: async function() {
        const companyName = document.getElementById('company-name').value;
        const currency = document.getElementById('currency').value;
        const workingDays = parseInt(document.getElementById('working-days').value, 10);
        const theme = document.getElementById('theme').value;

        if (!companyName || !currency || isNaN(workingDays)) {
            alert("Veuillez vérifier les valeurs.");
            return;
        }

        const currentSettings = await DataManager.settings.get();
        const updatedSettings = { ...currentSettings, companyName, currency, workingDays, theme };

        window.showLoader("Enregistrement...");
        try {
             const saved = await DataManager.settings.save(updatedSettings);
             if (saved) {
                 alert('Paramètres enregistrés.');
                 await App.updateDynamicElements();
                 document.body.classList.toggle('light-theme', theme === 'light');
             } else {
                 alert('Erreur enregistrement.');
             }
        } catch (error) {
             alert(`Erreur: ${error.message}`);
        } finally {
             window.hideLoader();
        }
    },

    handleExportData: async function() {
        window.showLoader("Exportation...");
        try {
            const exportData = {};
            const stores = ['employees', 'salaries', 'advances', 'sanctions', 'debts', 'settings', 'activities', 'expenses', 'incomes', 'expenseCategories', 'incomeCategories'];
            for (const store of stores) {
                exportData[store] = await DataManager[store].getAll ? await DataManager[store].getAll() : await DataManager[store].get();
            }
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `le_sims_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch(error) {
            alert(`Erreur: ${error.message}`);
        } finally {
            window.hideLoader();
        }
    },

    handleImportData: async function(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!confirm("ATTENTION ! Ceci remplacera toutes les données. Continuer ?")) return;

        window.showLoader("Importation...");
        try {
            const data = JSON.parse(await file.text());
            for (const storeName in data) {
                if (Array.isArray(data[storeName])) {
                    await DataManager[storeName].saveAll(data[storeName]);
                } else if (typeof data[storeName] === 'object') {
                    await DataManager[storeName].save(data[storeName]);
                }
            }
            alert("Importation réussie. Rechargement de l'application.");
            location.reload();
        } catch (error) {
            alert(`Erreur: ${error.message}`);
        } finally {
            window.hideLoader();
        }
    },

    handleResetLocalData: async function() {
        if (!confirm("ATTENTION IRREVERSIBLE: Sûr de vouloir supprimer TOUTES les données?")) return;

        window.showLoader("Réinitialisation...");
        try {
            await Promise.all(Object.keys(LocalDB).map(store => LocalDB[store]?.clear ? LocalDB[store].clear() : Promise.resolve()));
            alert("Données réinitialisées. Rechargement.");
            location.reload();
        } catch (error) {
            alert(`Erreur: ${error.message}`);
        } finally {
            window.hideLoader();
        }
    },

    updateDynamicElements: async function() {
        const dateEl = document.getElementById('current-date');
        if (dateEl) dateEl.textContent = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

        const yearEl = document.getElementById('current-year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        try {
            const settings = await DataManager.settings.get();
            if(settings) document.body.classList.toggle('light-theme', settings.theme === 'light');
        } catch (error) {
            console.error("Error updating theme:", error);
        }
    },

    updateSyncStatusUI: function(status, message = '') {
         const syncIndicator = document.getElementById('sync-indicator');
         if (syncIndicator) {
             syncIndicator.textContent = message || status;
             syncIndicator.classList.remove('syncing', 'synced', 'sync-error', 'idle');
             if (status && status !== 'idle') {
                 syncIndicator.classList.add(status);
                 syncIndicator.style.display = 'inline-flex';
             } else {
                 syncIndicator.classList.add('idle');
                 syncIndicator.style.display = 'none';
             }
             if (status === 'synced') {
                 setTimeout(() => {
                      if (syncIndicator.classList.contains('synced')) {
                          syncIndicator.classList.remove('synced');
                          syncIndicator.classList.add('idle');
                          syncIndicator.style.display = 'none';
                      }
                 }, 3000);
             }
         }
    },

    updatePendingCountUI: function() {
         const count = window.DataManager?.pendingChanges?.length || 0;
         const pendingCountElement = document.getElementById('pending-changes-count');
         if (pendingCountElement) {
             pendingCountElement.textContent = count > 0 ? count : '';
             pendingCountElement.style.display = count > 0 ? 'inline-flex' : 'none';
         }
    },

     formatCurrency(amount, locale = 'fr-CM', displaySymbol = 'FCFA') {
        if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
        try {
            const formattedAmount = new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: 'XAF', // ISO code for FCFA
                currencyDisplay: 'code',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(amount);
            return formattedAmount.replace('XAF', displaySymbol);
        } catch (e) {
            console.error("Currency formatting error:", e);
            return `${amount} ${displaySymbol}`;
        }
    },

}; // End of App Object


// Initialisation de l'application au chargement du DOM
document.addEventListener('DOMContentLoaded', async function() {
    console.log("DOMContentLoaded event fired.");
    try {
        // Assign UI update functions to window scope so DataManager can call them
        window.updateSyncStatusUI = App.updateSyncStatusUI.bind(App);
        window.updatePendingCountUI = App.updatePendingCountUI.bind(App);

        await App.init(); // Call the async init function

    } catch (error) {
        console.error("Erreur fatale non interceptée lors de l'initialisation:", error);
        window.hideLoader(); // Ensure loader is hidden
        document.body.innerHTML = `<div style="padding: 20px; text-align: center; color: red;"><h1>Erreur Critique</h1><p>L'application n'a pas pu démarrer.</p><p>${error.message}</p></div>`;
    }
});
