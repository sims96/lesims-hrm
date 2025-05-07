/**
 * app.js
 * Fichier principal de l'application
 * Application de Gestion des Salaires Le Sims
 * (Updated for DataManager integration & enhanced UI feedback & Accounting Module & Charts)
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
            await this.initModules(); // Includes AccountingManager initialization
            console.log("All modules initialized.");

            this.bindGlobalEvents();
            console.log("Global events bound.");

            await this.loadDashboard(); // Load initial dashboard view (uses DataManager)
            console.log("Dashboard loaded.");

            // Setup default accounting categories if needed (assuming setupDefaultAccountingData is defined elsewhere or within AccountingManager)
            if (typeof AccountingManager?.setupDefaultCategories === 'function') {
                 // Check if setupDefaultAccountingData is still needed or if AccountingManager.setupDefaultCategories covers it
                 await AccountingManager.setupDefaultCategories();
                 console.log("Default accounting categories checked/initialized.");
            }

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
            { name: 'ReportsManager', manager: window.ReportsManager },
            // Include AccountingManager
            { name: 'AccountingManager', manager: window.AccountingManager }
        ];

        for (const item of managers) {
            // Check if manager exists and if it has an 'init' function BEFORE calling init
            if (item.manager) {
                 if (typeof item.manager.init === 'function') {
                    console.log(`Initializing ${item.name}...`);
                    window.showLoader(`Initialisation: ${item.name}...`);
                    try {
                         // For most managers, init might load some base data or setup listeners
                         // The main data loading often happens in loadPageContent
                         // For AccountingManager, init *will* fetch its HTML and load initial data
                        await item.manager.init();
                        console.log(`${item.name} initialized.`);
                    } catch (error) {
                        console.error(`Error initializing ${item.name}:`, error);
                        alert(`Erreur lors de l'initialisation du module ${item.name}. Certaines fonctionnalités pourraient être indisponibles.`);
                    }
                 } else {
                     // Manager exists but has no init method - maybe it's purely static or initialized differently
                     console.log(`${item.name} found, but no init method detected. Skipping init call.`);
                     // Ensure it's marked as initialized if necessary for loadPageContent logic
                     if (item.manager.isInitialized !== undefined) {
                         item.manager.isInitialized = true; // Assume ready if no init
                     }
                 }
            } else {
                console.warn(`${item.name} not found.`);
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
                    await this.loadPageContent(pageName); // <<< Handles loading logic
                } else {
                    console.warn(`Page element not found for: ${pageName}`);
                     // If the page container doesn't exist yet (like for accounting before init),
                     // loadPageContent should handle creating/fetching it.
                     // We might need to rethink the active class toggling slightly if init creates the page div.
                     // For now, assume the div exists in index.html or init handles adding it AND the active class.
                     // Let's ensure loadPageContent handles this scenario.
                     await this.loadPageContent(pageName);
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
                 // Add overlay management for mobile
                 if (window.innerWidth <= 992) {
                    document.body.classList.toggle('sidebar-active'); // Toggle body class for overlay
                 }
            });

            // Close sidebar if clicking outside on mobile
            mainContent.addEventListener('click', (event) => {
                 const isMobile = window.innerWidth <= 992;
                 // Close only if sidebar is active, on mobile, and click target is not the toggle button or inside the sidebar
                if (isMobile && sidebar.classList.contains('active') && !sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
                    sidebar.classList.remove('active');
                     document.body.classList.remove('sidebar-active'); // Remove overlay class
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
            // Ensure the target page div exists, especially for dynamically loaded modules
            let pageElement = document.getElementById(`${pageName}-page`);
            if (!pageElement) {
                 console.warn(`Page div #${pageName}-page not found, attempting load anyway.`);
                 // The module's init should create this div or load content into it.
            } else {
                 // Ensure only the current page is active
                 document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                 pageElement.classList.add('active');
            }

            // Use DataManager wrappers or ensure managers use DataManager internally
            switch (pageName) {
                case 'dashboard':
                    await this.loadDashboard(); // Uses DataManager internally now
                    break;
                case 'employees':
                    // Assuming EmployeesManager.init was called earlier
                    if (window.EmployeesManager?.isInitialized && window.EmployeesManager?.loadEmployees) {
                        await window.EmployeesManager.loadEmployees();
                    } else if (window.EmployeesManager?.init) {
                         console.log("EmployeesManager not initialized, calling init...");
                         await window.EmployeesManager.init(); // Initialize first if needed
                         // loadEmployees might be called within init or needs separate call
                    } else {
                        console.warn("EmployeesManager not ready or loadEmployees not found");
                    }
                    break;
                case 'salaries':
                    if (window.SalariesManager?.isInitialized && window.SalariesManager?.loadSalariesData) {
                         window.SalariesManager.updateCurrentMonthDisplay();
                         await window.SalariesManager.loadSalariesData();
                    } else if (window.SalariesManager?.init) {
                         console.log("SalariesManager not initialized, calling init...");
                         await window.SalariesManager.init();
                         // Assuming init now calls loadSalariesData or similar setup
                    } else {
                         console.warn("SalariesManager not ready or loadSalariesData not found");
                    }
                    break;
                case 'advances':
                     if (window.AdvancesManager?.isInitialized && window.AdvancesManager?.loadAdvances) await window.AdvancesManager.loadAdvances();
                     else if (window.AdvancesManager?.init) { await window.AdvancesManager.init(); }
                     else console.warn("AdvancesManager not ready or loadAdvances not found");
                    break;
                case 'sanctions':
                     if (window.SanctionsManager?.isInitialized && window.SanctionsManager?.loadSanctions) await window.SanctionsManager.loadSanctions();
                     else if (window.SanctionsManager?.init) { await window.SanctionsManager.init(); }
                     else console.warn("SanctionsManager not ready or loadSanctions not found");
                    break;
                case 'debts':
                    if (window.DebtsManager?.isInitialized && window.DebtsManager?.loadDebts) await window.DebtsManager.loadDebts();
                     else if (window.DebtsManager?.init) { await window.DebtsManager.init(); }
                     else console.warn("DebtsManager not ready or loadDebts not found");
                    break;
                case 'reports':
                    if (window.ReportsManager?.isInitialized && window.ReportsManager?.loadReportsPage) await window.ReportsManager.loadReportsPage();
                     else if (window.ReportsManager?.init) { await window.ReportsManager.init(); }
                     else console.warn("ReportsManager not ready or loadReportsPage not found");
                    break;
                case 'settings':
                    await this.loadSettingsPage(); // Uses DataManager internally now
                    break;
                // Handle accounting page
                case 'accounting':
                    if (!window.AccountingManager) {
                        console.error("FATAL: AccountingManager script not loaded!");
                         // Display error in the page area
                         if(pageElement) pageElement.innerHTML = `<div class="error-message">Erreur critique: Le module Comptabilité n'a pas pu être chargé.</div>`;
                         break; // Stop further processing for this case
                    }

                    if (window.AccountingManager.isInitialized) {
                        console.log("AccountingManager already initialized, calling refreshData...");
                        await window.AccountingManager.refreshData(); // Refresh data if already initialized
                    } else if (typeof window.AccountingManager.init === 'function') {
                        console.log("AccountingManager not initialized, calling init...");
                        // init() should handle fetching HTML, setting up, and loading initial data
                        await window.AccountingManager.init();
                    } else {
                         console.error("AccountingManager found but init function is missing!");
                         if(pageElement) pageElement.innerHTML = `<div class="error-message">Erreur: Impossible d'initialiser le module Comptabilité.</div>`;
                    }
                    break;
                default:
                    console.warn(`No specific content load logic for page: ${pageName}`);
                    // Ensure the page is active even if no specific load function exists
                     if(pageElement) pageElement.classList.add('active');

            }
        } catch (error) {
            console.error(`Error loading page content for ${pageName}:`, error);
            // Update the specific page element with an error message if it exists
            let targetPageElement = document.getElementById(`${pageName}-page`);
            if (targetPageElement) {
                 targetPageElement.innerHTML = `<div class="error-message">Erreur chargement contenu: ${error.message}</div>`;
                 targetPageElement.classList.add('active'); // Ensure the error is visible
            } else {
                 // If the page div itself failed to load (e.g., accounting.html fetch failed in init)
                 // show error maybe in main content area?
                 document.getElementById('page-content').innerHTML = `<div class="error-message">Erreur chargement page ${pageName}: ${error.message}</div>`;
            }
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

        // Reset to loading state
        totalEmployeesElement.textContent = '...';
        totalSalaryElement.textContent = '...';
        totalAdvancesElement.textContent = '...';
        totalDebtsElement.textContent = '...';

        try {
            // Fetch data using DataManager
            const [employees, settings, expenses, incomes] = await Promise.all([
                DataManager.employees.getAll(),
                DataManager.settings.get(), // Use DataManager for settings
                DataManager.expenses?.getAll() || [], // May not exist yet
                DataManager.incomes?.getAll() || []   // May not exist yet
            ]);

            if (!Array.isArray(employees)) throw new Error("Données employés invalides");
            if (!settings) throw new Error("Données paramètres invalides");

            const totalEmployees = employees.length;
            const currencySymbol = settings.currency || 'FCFA';

            // Calculate base salary sum locally from fetched employees
            const totalSalary = employees.reduce((sum, emp) => sum + (emp.baseSalary || 0), 0);

            // Fetch totals for advances and debts using DataManager (which handles offline)
            // Use Promise.allSettled to handle potential errors fetching individual totals
            const unpaidAdvancesPromises = employees.map(emp => DataManager.advances.getTotalUnpaidByEmployeeId(emp.id));
            const unpaidDebtsPromises = employees.map(emp => DataManager.debts.getTotalUnpaidByEmployeeId(emp.id));

             const unpaidAdvancesResults = await Promise.allSettled(unpaidAdvancesPromises);
             const unpaidDebtsResults = await Promise.allSettled(unpaidDebtsPromises);


            // Sum the results, only counting successful promises
             const totalAdvances = unpaidAdvancesResults.reduce((sum, result) => {
                 return sum + (result.status === 'fulfilled' && result.value ? result.value : 0);
             }, 0);
             const totalDebts = unpaidDebtsResults.reduce((sum, result) => {
                 return sum + (result.status === 'fulfilled' && result.value ? result.value : 0);
             }, 0);

            // Update DOM
            totalEmployeesElement.textContent = totalEmployees;
             // Use helper for formatting
             totalSalaryElement.textContent = this.formatCurrency(totalSalary, settings.locale, currencySymbol);
             totalAdvancesElement.textContent = this.formatCurrency(totalAdvances, settings.locale, currencySymbol);
             totalDebtsElement.textContent = this.formatCurrency(totalDebts, settings.locale, currencySymbol);

            // Update dashboard with accounting stats if available
            try {
                const currentDate = new Date();
                const currentYear = currentDate.getFullYear();
                const currentMonth = currentDate.getMonth();

                // Add accounting summary stats to dashboard if we have AccountingManager
                if (window.AccountingManager && Array.isArray(expenses) && Array.isArray(incomes)) {
                    // Filter for current month
                    const currentMonthExpenses = expenses.filter(exp => {
                        const expDate = new Date(exp.date);
                        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
                    });

                    const currentMonthIncomes = incomes.filter(inc => {
                        const incDate = new Date(inc.date);
                        return incDate.getMonth() === currentMonth && incDate.getFullYear() === currentYear;
                    });

                    // Calculate totals
                    const totalMonthExpenses = currentMonthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
                    const totalMonthIncomes = currentMonthIncomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);

                    // Update dashboard if elements exist
                    const totalExpensesElement = document.getElementById('total-expenses-summary');
                    const totalIncomesElement = document.getElementById('total-incomes-summary');
                    const profitElement = document.getElementById('monthly-profit-summary');

                    if (totalExpensesElement) {
                        totalExpensesElement.textContent = this.formatCurrency(totalMonthExpenses, settings.locale, currencySymbol);
                    }

                    if (totalIncomesElement) {
                        totalIncomesElement.textContent = this.formatCurrency(totalMonthIncomes, settings.locale, currencySymbol);
                    }

                    if (profitElement) {
                        const profit = totalMonthIncomes - totalMonthExpenses;
                        profitElement.textContent = this.formatCurrency(profit, settings.locale, currencySymbol);
                        profitElement.classList.toggle('text-success', profit >= 0);
                        profitElement.classList.toggle('text-danger', profit < 0);
                    }
                }
            } catch (accountingError) {
                console.warn("Error updating accounting stats in dashboard:", accountingError);
                // Non-critical, don't disrupt dashboard display
            }

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
     * Initialise les graphiques du tableau de bord (Enhanced to include accounting and actual charts)
     */
    initDashboardCharts: async function() {
         const salaryChartContainer = document.getElementById('salary-chart');
         const monthlyChartContainer = document.getElementById('monthly-chart');

         // Check if Chart.js is loaded and containers exist
         if (!salaryChartContainer || !monthlyChartContainer || typeof Chart === 'undefined') {
             console.warn("Chart containers or Chart.js library not found.");
             if (salaryChartContainer) salaryChartContainer.innerHTML = `<div class="chart-placeholder"><i class="fas fa-chart-pie"></i><p>Graphique indisponible</p></div>`;
             if (monthlyChartContainer) monthlyChartContainer.innerHTML = `<div class="chart-placeholder"><i class="fas fa-chart-line"></i><p>Graphique indisponible</p></div>`;
             return;
         }

         // Clear placeholders and create canvas elements
         salaryChartContainer.innerHTML = '<canvas id="salary-chart-canvas"></canvas>';
         monthlyChartContainer.innerHTML = '<canvas id="monthly-chart-canvas"></canvas>';
         const salaryCtx = document.getElementById('salary-chart-canvas')?.getContext('2d');
         const monthlyCtx = document.getElementById('monthly-chart-canvas')?.getContext('2d');

         if (!salaryCtx || !monthlyCtx) {
             console.error("Failed to get chart canvas contexts.");
              salaryChartContainer.innerHTML = `<div class="chart-placeholder"><i class="fas fa-chart-pie"></i><p>Erreur Contexte Graphique</p></div>`;
              monthlyChartContainer.innerHTML = `<div class="chart-placeholder"><i class="fas fa-chart-line"></i><p>Erreur Contexte Graphique</p></div>`;
             return;
         }

         window.showLoader('Chargement des graphiques...');
         try {
             // --- Salary Distribution Chart (Example: Doughnut by Position) ---
             const employees = await DataManager.employees.getAll();
             if (Array.isArray(employees) && employees.length > 0) {
                 const positions = {};
                 employees.forEach(emp => {
                     const pos = emp.position || 'Non défini';
                     positions[pos] = (positions[pos] || 0) + 1; // Count employees per position
                 });
                 const salaryLabels = Object.keys(positions);
                 const salaryData = Object.values(positions);

                 // Destroy previous chart instance if it exists
                 if (salaryCtx.chartInstance) salaryCtx.chartInstance.destroy();

                 salaryCtx.chartInstance = new Chart(salaryCtx, {
                     type: 'doughnut',
                     data: {
                         labels: salaryLabels,
                         datasets: [{
                             label: 'Répartition par Poste',
                             data: salaryData,
                             backgroundColor: [ // Example colors - add more or generate dynamically
                               'rgba(156, 39, 176, 0.7)', 'rgba(103, 58, 183, 0.7)',
                               'rgba(63, 81, 181, 0.7)', 'rgba(33, 150, 243, 0.7)',
                               'rgba(0, 188, 212, 0.7)','rgba(0, 150, 136, 0.7)',
                               'rgba(76, 175, 80, 0.7)', 'rgba(255, 152, 0, 0.7)'
                             ],
                             borderColor: 'var(--dark-card, #2a2a3e)', // Use background color for border
                             borderWidth: 2
                         }]
                     },
                     options: {
                          responsive: true, maintainAspectRatio: false,
                          plugins: {
                              legend: { position: 'bottom', labels:{color:'var(--text-secondary, #ccc)'} },
                              tooltip: { backgroundColor: 'rgba(0,0,0,0.8)' }
                           }
                     }
                 });
             } else {
                  salaryChartContainer.innerHTML = `<div class="chart-placeholder"><i class="fas fa-chart-pie"></i><p>Données insuffisantes</p></div>`;
             }

             // --- Monthly Evolution Chart (Example: Net Salary vs Expenses) ---
             const monthsToShow = 6; // Number of past months to display
             const endDate = new Date();
             const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - monthsToShow + 1, 1);

             const [allSalaries, allExpenses] = await Promise.all([
                 DataManager.salaries.getAll(), // Fetches all - could optimize if needed
                 DataManager.expenses.getAll() // Fetches all expenses
             ]);

             const monthlyTotals = {}; // Key: YYYY-MM
             const labels = [];
             const monthLocale = 'fr-FR'; // Or get from settings

             // Initialize months
             for (let i = 0; i < monthsToShow; i++) {
                const monthDate = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
                const year = monthDate.getFullYear();
                const month = monthDate.getMonth();
                const key = `${year}-${String(month + 1).padStart(2, '0')}`;
                labels.unshift(monthDate.toLocaleString(monthLocale, { month: 'short', year: '2-digit' })); // Add label e.g., "mai 25"
                 monthlyTotals[key] = { netSalary: 0, expenses: 0 };
             }

             // Sum salaries for the relevant months
             if(Array.isArray(allSalaries)) {
                 allSalaries.forEach(s => {
                     try {
                         const paymentDate = new Date(s.paymentDate);
                         if (!isNaN(paymentDate) && paymentDate >= startDate && paymentDate <= endDate) {
                             const year = paymentDate.getFullYear();
                             const month = paymentDate.getMonth();
                             const key = `${year}-${String(month + 1).padStart(2, '0')}`;
                             if(monthlyTotals[key]) {
                                monthlyTotals[key].netSalary += (s.netSalary || 0);
                             }
                         }
                     } catch(e){ /* Ignore invalid dates */ }
                 });
             }
              // Sum expenses for the relevant months
             if(Array.isArray(allExpenses)) {
                 allExpenses.forEach(e => {
                      try {
                         const expenseDate = new Date(e.date);
                          if (!isNaN(expenseDate) && expenseDate >= startDate && expenseDate <= endDate) {
                             const year = expenseDate.getFullYear();
                             const month = expenseDate.getMonth();
                             const key = `${year}-${String(month + 1).padStart(2, '0')}`;
                              if(monthlyTotals[key]) {
                                monthlyTotals[key].expenses += (e.amount || 0);
                              }
                         }
                     } catch(e){ /* Ignore invalid dates */ }
                 });
             }

             // Prepare data arrays for the chart in the correct order (matching labels)
             const netSalaryData = labels.map(label => {
                 // Find the key corresponding to the label
                 const monthDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1); // Start reference
                 let foundKey = null;
                 for (const key in monthlyTotals) {
                     const [year, month] = key.split('-');
                     monthDate.setFullYear(parseInt(year));
                     monthDate.setMonth(parseInt(month) - 1);
                     if (monthDate.toLocaleString(monthLocale, { month: 'short', year: '2-digit' }) === label) {
                         foundKey = key;
                         break;
                     }
                 }
                 return foundKey ? monthlyTotals[foundKey].netSalary : 0;
             });

             const expenseData = labels.map(label => {
                 const monthDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
                 let foundKey = null;
                 for (const key in monthlyTotals) {
                     const [year, month] = key.split('-');
                     monthDate.setFullYear(parseInt(year));
                     monthDate.setMonth(parseInt(month) - 1);
                     if (monthDate.toLocaleString(monthLocale, { month: 'short', year: '2-digit' }) === label) {
                         foundKey = key;
                         break;
                     }
                 }
                 return foundKey ? monthlyTotals[foundKey].expenses : 0;
             });

             // Destroy previous chart instance if it exists
             if (monthlyCtx.chartInstance) monthlyCtx.chartInstance.destroy();

             monthlyCtx.chartInstance = new Chart(monthlyCtx, {
                 type: 'line',
                 data: {
                     labels: labels,
                     datasets: [
                         {
                             label: 'Salaires Nets Payés',
                             data: netSalaryData,
                             borderColor: 'rgba(75, 192, 192, 1)',
                             backgroundColor: 'rgba(75, 192, 192, 0.1)',
                             fill: true, tension: 0.2 // Smoother line
                         },
                         {
                              label: 'Dépenses Totales',
                              data: expenseData,
                              borderColor: 'rgba(255, 99, 132, 1)',
                              backgroundColor: 'rgba(255, 99, 132, 0.1)',
                              fill: true, tension: 0.2
                          }
                     ]
                 },
                 options: {
                     responsive: true, maintainAspectRatio: false,
                     scales: {
                        y: {
                            beginAtZero: true,
                            ticks:{color:'var(--text-secondary, #ccc)'},
                            grid:{color:'rgba(255,255,255,0.1)'}
                        },
                        x: {
                            ticks:{color:'var(--text-secondary, #ccc)'},
                            grid:{color:'rgba(255,255,255,0.1)'}
                        }
                     },
                     plugins: {
                         legend: { position: 'bottom', labels:{color:'var(--text-secondary, #ccc)'} },
                         tooltip: { backgroundColor: 'rgba(0,0,0,0.8)' }
                      }
                 }
             });

         } catch (error) {
             console.error("Error initializing dashboard charts:", error);
             salaryChartContainer.innerHTML = `<div class="chart-placeholder"><i class="fas fa-chart-pie"></i><p>Erreur chargement graphique</p></div>`;
             monthlyChartContainer.innerHTML = `<div class="chart-placeholder"><i class="fas fa-chart-line"></i><p>Erreur chargement graphique</p></div>`;
         } finally {
              window.hideLoader();
         }
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
                      <div class="card-header"><h3>Général</h3></div>
                     <div class="card-body">
                         <form id="settings-form">
                            <div class="form-group"><label for="company-name">Nom Entreprise</label><input type="text" id="company-name" class="form-control" value="${settings.companyName || ''}"></div>
                            <div class="form-grid">
                                <div class="form-group"><label for="currency">Devise</label><input type="text" id="currency" class="form-control" value="${settings.currency || 'FCFA'}"></div>
                                <div class="form-group"><label for="working-days">Jours / Mois (Paie)</label><input type="number" id="working-days" class="form-control" value="${settings.workingDays || 26}" min="1" max="31"></div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group"><label for="language">Langue</label><select id="language" class="form-control"><option value="fr" ${settings.language === 'fr' ? 'selected' : ''}>Français</option><option value="en" ${settings.language === 'en' ? 'selected' : ''}>Anglais</option></select></div>
                                <div class="form-group"><label for="date-format">Format Date</label><select id="date-format" class="form-control"><option value="DD/MM/YYYY" ${settings.dateFormat === 'DD/MM/YYYY' ? 'selected' : ''}>JJ/MM/AAAA</option><option value="MM/DD/YYYY" ${settings.dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}>MM/JJ/AAAA</option><option value="YYYY-MM-DD" ${settings.dateFormat === 'YYYY-MM-DD' ? 'selected' : ''}>AAAA-MM-JJ</option></select></div>
                            </div>
                            <div class="form-group"><label for="theme">Thème</label><select id="theme" class="form-control"><option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Sombre</option><option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Clair</option></select></div>
                            <div class="form-actions mt-4"><button type="button" id="save-settings" class="btn btn-primary">Enregistrer Paramètres</button></div>
                         </form>
                     </div>
                 </div>
                 <div class="card mb-4">
                     <div class="card-header"><h3>Gestion Données</h3></div>
                     <div class="card-body"><div class="data-actions" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
                         <div><h4>Exporter Données</h4><p>Exporter toutes les données locales.</p><button id="export-data-btn" class="btn btn-outline"><i class="fas fa-download"></i> Exporter JSON</button></div>
                         <div class="mt-4 mt-md-0"><h4>Importer Données</h4><p>Importer depuis un fichier JSON.</p><input type="file" id="import-file" accept=".json" style="display: none;"><button id="import-data-trigger" class="btn btn-outline"><i class="fas fa-upload"></i> Choisir Fichier</button></div>
                         <div class="mt-4 mt-md-0"><h4>Réinitialiser Données Locales</h4><p class="text-danger">Supprime TOUTES les données locales.</p><button id="reset-local-data-btn" class="btn btn-danger"><i class="fas fa-trash"></i> Réinitialiser</button></div>
                     </div></div>
                 </div>

                 <div class="card mb-4">
                     <div class="card-header"><h3>Paramètres Comptabilité</h3></div>
                     <div class="card-body">
                         <div class="accounting-actions" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
                             <div>
                                 <h4>Catégories de Dépenses</h4>
                                 <p>Gérer les catégories de dépenses</p>
                                 <button id="manage-expense-categories-btn" class="btn btn-outline">
                                     <i class="fas fa-tags"></i> Gérer les Catégories
                                 </button>
                             </div>
                             <div>
                                 <h4>Catégories de Revenus</h4>
                                 <p>Gérer les catégories de revenus</p>
                                 <button id="manage-income-categories-btn" class="btn btn-outline">
                                     <i class="fas fa-tags"></i> Gérer les Catégories
                                 </button>
                             </div>
                             <div>
                                 <h4>Initialiser Données</h4>
                                 <p>Créer des catégories par défaut</p>
                                 <button id="init-accounting-data-btn" class="btn btn-outline">
                                     <i class="fas fa-sync"></i> Initialiser
                                 </button>
                             </div>
                         </div>
                     </div>
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
             // Use a unique handler function name or arrow function to avoid conflicts if called multiple times
             const handleSave = async () => await this.handleSaveSettings();
             saveSettingsBtn.removeEventListener('click', handleSave); // Remove previous if any
             saveSettingsBtn.addEventListener('click', handleSave); // Assign handler
        }

        // Data management buttons (assign directly or use arrow functions)
        const exportBtn = document.getElementById('export-data-btn');
        const importTriggerBtn = document.getElementById('import-data-trigger');
        const importFileEl = document.getElementById('import-file');
        const resetBtn = document.getElementById('reset-local-data-btn');

        if(exportBtn) exportBtn.onclick = this.handleExportData.bind(this); // Use onclick or addEventListener
        if(importTriggerBtn && importFileEl) {
            importTriggerBtn.onclick = () => importFileEl.click();
            importFileEl.onchange = this.handleImportData.bind(this);
        }
        if(resetBtn) resetBtn.onclick = this.handleResetLocalData.bind(this);

        // Accounting settings buttons
        const manageExpenseCategoriesBtn = document.getElementById('manage-expense-categories-btn');
        const manageIncomeCategoriesBtn = document.getElementById('manage-income-categories-btn');
        const initAccountingDataBtn = document.getElementById('init-accounting-data-btn');

        // Ensure AccountingManager and its function exist before adding listener
        if (manageExpenseCategoriesBtn && window.AccountingManager && typeof window.AccountingManager.showCategoriesModal === 'function') {
            manageExpenseCategoriesBtn.addEventListener('click', () => {
                window.AccountingManager.showCategoriesModal('expense');
            });
        } else if(manageExpenseCategoriesBtn) {
             manageExpenseCategoriesBtn.addEventListener('click', () => alert("Fonctionnalité non disponible (AccountingManager manquant)."));
        }

        if (manageIncomeCategoriesBtn && window.AccountingManager && typeof window.AccountingManager.showCategoriesModal === 'function') {
            manageIncomeCategoriesBtn.addEventListener('click', () => {
                window.AccountingManager.showCategoriesModal('income');
            });
        } else if (manageIncomeCategoriesBtn) {
             manageIncomeCategoriesBtn.addEventListener('click', () => alert("Fonctionnalité non disponible (AccountingManager manquant)."));
        }

        // Use AccountingManager's setup function if available
        if (initAccountingDataBtn && window.AccountingManager && typeof window.AccountingManager.setupDefaultCategories === 'function') {
            initAccountingDataBtn.addEventListener('click', async () => {
                try {
                    window.showLoader("Initialisation des catégories comptables...");
                    // Call the setup function within AccountingManager
                    const result = await window.AccountingManager.setupDefaultCategories();
                    window.hideLoader();

                    if (result.success) {
                         if (result.createdExpenseCategories > 0 || result.createdIncomeCategories > 0) {
                             alert(`Catégories par défaut créées/vérifiées: ${result.createdExpenseCategories} dépenses, ${result.createdIncomeCategories} revenus.`);
                         } else {
                             alert("Les catégories par défaut existent déjà.");
                         }
                    } else {
                        alert(`Erreur lors de l'initialisation: ${result.error}`);
                    }
                } catch (error) {
                    window.hideLoader();
                    alert(`Erreur: ${error.message}`);
                }
            });
         } else if (initAccountingDataBtn) {
              initAccountingDataBtn.addEventListener('click', () => alert("Fonctionnalité non disponible (AccountingManager manquant)."));
         }
    },

    /**
     * Handler for Saving Settings (Using DataManager)
     */
    handleSaveSettings: async function() { // Changed to function declaration within object
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
                 await App.updateDynamicElements(); // Use App context via 'this' if called correctly
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
    handleExportData: async function() {
        console.log("Exporting local data...");
        window.showLoader("Exportation...");
        try {
            const exportData = {};
            const storesToExport = [
                'employees', 'salaries', 'advances', 'sanctions', 'debts', 'settings', 'activities',
                // Add accounting stores
                'expenses', 'incomes', 'expenseCategories', 'incomeCategories'
            ];

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
            }, 100); // Small delay might be needed

        } catch(error) {
            console.error("Error exporting data:", error);
            window.hideLoader();
            alert(`Erreur lors de l'exportation: ${error.message}`);
        }
    },

    handleImportData: async function(event) {
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
                const storesToImport = [
                    'employees', 'salaries', 'advances', 'sanctions', 'debts', 'settings', 'activities',
                    // Add accounting stores
                    'expenses', 'incomes', 'expenseCategories', 'incomeCategories'
                ];

                // Clear existing local data first
                 await Promise.all(storesToImport.map(storeName => {
                     if(LocalDB[storeName] && typeof LocalDB.clear === 'function'){
                         console.log(`Clearing store: ${storeName}`);
                         // Use the generic clear method if specific one isn't needed
                         return LocalDB.clear(storeName);
                     } else if (storeName === 'settings' && LocalDB.settings?.save) {
                          // Special handling for settings? Usually just overwrite.
                          // Or maybe clear doesn't exist for single-item store.
                          return Promise.resolve(); // Assume settings save overwrites
                     }
                     return Promise.resolve();
                 }));

                // Import new data
                for (const storeName of storesToImport) {
                    if (importedData[storeName]) {
                        console.log(`Importing data for store: ${storeName}`);
                        if(storeName === 'settings' && LocalDB.settings?.save) {
                            // Settings is a single object
                             await LocalDB.settings.save(importedData[storeName]);
                        } else if (Array.isArray(importedData[storeName]) && LocalDB[storeName]?.saveAll) {
                            await LocalDB[storeName].saveAll(importedData[storeName]);
                        } else {
                             console.warn(`Cannot import data for store: ${storeName}. Invalid data or save method missing.`);
                        }
                    }
                }

                // Clear pending changes as they are likely invalid now
                 if (LocalDB.pendingChanges?.clear) await LocalDB.clear('pendingChanges');
                 await DataManager.loadPendingChanges(); // Reload empty pending changes
                 DataManager.updatePendingCountUI();

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

    handleResetLocalData: async function() {
        if (!confirm("Êtes-vous absolument sûr de vouloir supprimer TOUTES les données locales ? Cette action est IRREVERSIBLE et les données non synchronisées seront perdues.")) {
            return;
        }
        if (!confirm("Seconde confirmation : Vraiment supprimer toutes les données locales ?")) {
            return;
        }

        console.warn("Resetting all local data...");
        window.showLoader("Réinitialisation...");
        try {
             const storesToClear = [
                 'employees', 'salaries', 'advances', 'sanctions', 'debts', 'settings', 'activities', 'pendingChanges',
                 // Add accounting stores
                 'expenses', 'incomes', 'expenseCategories', 'incomeCategories'
             ];

             await Promise.all(storesToClear.map(storeName => {
                 if (LocalDB[storeName] && typeof LocalDB.clear === 'function') {
                     console.log(`Clearing store: ${storeName}`);
                     return LocalDB.clear(storeName);
                 } else if (storeName === 'settings' && LocalDB.settings?.save){
                      // Reset settings to default? Or delete? Let's reset.
                      console.log(`Resetting store: ${storeName}`);
                      const defaultSettings = {
                          id: 'app-settings', companyName: 'Le Sims', currency: 'FCFA',
                          workingDays: 26, language: 'fr', dateFormat: 'DD/MM/YYYY', theme: 'dark'
                      };
                      return LocalDB.settings.save(defaultSettings);
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
            const locale = settings?.language === 'en' ? 'en-US' : 'fr-CM'; // Needed for formatting

            // Update currency symbols globally (using class)
            document.querySelectorAll('.currency-symbol').forEach(el => el.textContent = currencySymbol);

            // Update dashboard/other stats currency symbols specifically
            document.querySelectorAll('#total-salary, #total-advances, #total-debts').forEach(el => {
                 if (!el) return; // Skip if element doesn't exist on current page
                 const currentText = el.textContent;
                 if (currentText && currentText !== 'Erreur' && currentText !== '...') {
                     // Attempt to parse numeric value, update symbol and formatting
                     const valueMatch = currentText.match(/^(-?[\d,.\s]+)/); // More robust match
                     let value = 0;
                     if (valueMatch) {
                          // Attempt to parse potentially localized string back to number
                         try {
                              // Remove spaces, replace comma decimal separator if locale uses it
                              const cleanedValue = valueMatch[0].replace(/\s/g, '').replace(',', '.');
                              value = parseFloat(cleanedValue);
                         } catch {
                              value = 0; // Fallback if parsing fails
                         }
                     }
                     el.textContent = this.formatCurrency(value, locale, currencySymbol);

                 } else if (currentText === '...') { // Handle loading state
                      el.textContent = this.formatCurrency(0, locale, currencySymbol);
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

         // --- Header Action Buttons ---
         // Updated: Point Export/Import to settings page if clicked from header
         const exportDataBtn = document.getElementById('export-data'); // In header
         const importDataBtn = document.getElementById('import-data'); // In header

         if(exportDataBtn) {
             exportDataBtn.addEventListener('click', () => {
                 document.querySelector('.sidebar-menu li[data-page="settings"]')?.click();
                 // Add a small delay to allow page navigation before triggering the settings button
                 setTimeout(() => document.getElementById('export-data-btn')?.click(), 300);
             });
         }
         if(importDataBtn) {
             importDataBtn.addEventListener('click', () => {
                  document.querySelector('.sidebar-menu li[data-page="settings"]')?.click();
                  setTimeout(() => document.getElementById('import-data-trigger')?.click(), 300);
             });
         }


         // Window resize listener for sidebar (keep as is)
         window.addEventListener('resize', () => {
             const sidebar = document.querySelector('.sidebar');
             if (window.innerWidth > 992 && sidebar) {
                 sidebar.classList.remove('active');
                 document.body.classList.remove('sidebar-active'); // Remove overlay class on resize to desktop
             }
         });
    },

    // --- UI Update Function Definitions ---
    // These functions are now primarily called by DataManager or internal App logic

    updateSyncStatusUI: function(status, message = '') {
         const syncIndicator = document.getElementById('sync-indicator');
         if (syncIndicator) {
             syncIndicator.textContent = message || status; // Display message or status
             // Clear previous classes
             syncIndicator.classList.remove('syncing', 'synced', 'sync-error', 'idle');
             if (status && status !== 'idle') {
                 syncIndicator.classList.add(status);
                 syncIndicator.style.display = 'inline-flex'; // Use flex for icon alignment
                 syncIndicator.title = message || status; // Add title attribute
             } else {
                 syncIndicator.classList.add('idle');
                 syncIndicator.style.display = 'none';
                 syncIndicator.title = '';
             }
             // Optionally hide the "Synced" message after a delay
             if (status === 'synced') {
                 setTimeout(() => {
                      if (syncIndicator.classList.contains('synced')) { // Check if still synced
                          syncIndicator.classList.remove('synced');
                          syncIndicator.classList.add('idle');
                          syncIndicator.style.display = 'none';
                          syncIndicator.title = '';
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
             pendingCountElement.title = count > 0 ? `${count} modification(s) en attente` : ''; // Add title
         }
    },

     // --- Formatting Helper ---
     formatCurrency(amount, locale = 'fr-CM', displaySymbol = 'FCFA') { // Changed currency param name for clarity
        if (amount === null || amount === undefined || isNaN(amount)) {
            return 'N/A';
        }
        try {
            // Always use the correct ISO code for formatting
            const formattedAmount = new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: 'XAF', // Use the correct ISO code 'XAF' here
                currencyDisplay: 'code', // Use 'code' to easily replace later
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(amount);

            // Replace the code 'XAF' with the desired display symbol 'FCFA'
            return formattedAmount.replace('XAF', displaySymbol);

        } catch (e) {
            console.error("Currency formatting error:", e);
            // Fallback uses the display symbol directly if formatting fails
            return `${amount} ${displaySymbol}`;
        }
    },

}; // End of App Object


// Initialisation de l'application au chargement du DOM
document.addEventListener('DOMContentLoaded', async function() {
    console.log("DOMContentLoaded event fired.");
    try {
        // Assign UI update functions to window scope if DataManager needs them
        window.updateSyncStatusUI = App.updateSyncStatusUI;
        window.updatePendingCountUI = App.updatePendingCountUI;

        await App.init(); // Call the async init function

    } catch (error) {
        // Catch any unhandled errors during init (though init itself has try/catch)
        console.error("Erreur fatale non interceptée lors de l'initialisation:", error);
        window.hideLoader(); // Ensure loader is hidden
        document.body.innerHTML = `<div style="padding: 20px; text-align: center; color: red;"><h1>Erreur Critique</h1><p>L'application n'a pas pu démarrer.</p><p>${error.message}</p></div>`;
    }
});