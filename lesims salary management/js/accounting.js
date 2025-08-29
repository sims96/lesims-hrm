/**
 * accounting.js
 * AccountingManager for the Le Sims Accounting Module
 * Handles tracking of income and expenses, categorization, and reporting
 * (Updated with enhanced DataManager integration and Category Management Modal)
 */

const AccountingManager = {
    // State management
    isInitialized: false,
    currentTab: 'expenses',
    currencySymbol: 'FCFA', // Default, will be updated from settings

    // Data storage (Categories/Departments loaded once, transactions loaded on demand)
    expenses: [], // Holds currently displayed/filtered expenses
    incomes: [], // Holds currently displayed/filtered incomes
    expenseCategories: [],
    incomeCategories: [],
    departments: [],

    // Filter state
    expenseFilters: {
        month: new Date().getMonth(),
        year: new Date().getFullYear(),
        category: 'all',
        department: 'all',
        search: '',
        page: 1,
        itemsPerPage: 10 // Adjust as needed
    },

    incomeFilters: {
        month: new Date().getMonth(),
        year: new Date().getFullYear(),
        category: 'all',
        department: 'all',
        search: '',
        page: 1,
        itemsPerPage: 10 // Adjust as needed
    },

    // Report state
    reportConfig: {
        type: 'expenses',
        period: 'month',
        startDate: null,
        endDate: null
    },

    // Constants for default categories/departments (used as fallback)
    DEPARTMENT_TYPES: [
        { id: 'general', name: 'Général/Admin' },
        { id: 'shawarma', name: 'Shawarma' },
        { id: 'ice-cream', name: 'Crème Glacée' },
        { id: 'pizza', name: 'Pizza' },
        { id: 'kitchen', name: 'Cuisine' },
        { id: 'bar', name: 'Bar' },
        { id: 'billard', name: 'Billard' },
        { id: 'chicha', name: 'Chicha' }
    ],
    DEFAULT_EXPENSE_CATEGORIES: [
        { id: 'salaries', name: 'Salaires' }, { id: 'rent', name: 'Loyer' },
        { id: 'utilities', name: 'Services Publics' }, { id: 'supplies', name: 'Fournitures' },
        { id: 'equipment', name: 'Équipement' }, { id: 'maintenance', name: 'Maintenance' },
        { id: 'marketing', name: 'Marketing' }, { id: 'transportation', name: 'Transport' },
        { id: 'food', name: 'Nourriture' }, { id: 'taxes', name: 'Taxes' },
        { id: 'drinks', name: 'Boisson' }, { id: 'other', name: 'Autres' }
    ],
    DEFAULT_INCOME_CATEGORIES: [
        { id: 'sales', name: 'Ventes' }, { id: 'services', name: 'Services' },
        { id: 'refunds', name: 'Remboursements' }, { id: 'investments', name: 'Investissements' },
        { id: 'other', name: 'Autres' }
    ],

    /**
     * Initialize the AccountingManager
     */
    init: async function() {
        console.log('Initializing AccountingManager...');
        if (this.isInitialized) {
            console.log('AccountingManager already initialized.');
            return true;
        }

        // Ensure DataManager is available
        if (typeof DataManager === 'undefined' || typeof LocalDB === 'undefined') {
             console.error("CRITICAL: DataManager or LocalDB not found. Accounting module cannot function.");
             alert("Erreur critique: Le gestionnaire de données est manquant.");
             // Display error on page
             const accountingPage = document.getElementById('accounting-page');
             if (accountingPage) accountingPage.innerHTML = '<p class="error-message">Erreur critique: Gestionnaire de données manquant.</p>';
             return false;
        }

        try {
            window.showLoader('Chargement du module comptabilité...');

            // Load HTML structure (same as before)
            const accountingPage = document.getElementById('accounting-page');
            if (!accountingPage) {
                console.error('Accounting page container not found!');
                window.hideLoader();
                return false;
            }
            const htmlPath = 'html/accounting.html';
            try {
                const response = await fetch(htmlPath);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                accountingPage.innerHTML = await response.text();
            } catch (fetchError) {
                console.warn(`Couldn't fetch HTML template (${htmlPath}): ${fetchError.message}. Trying template element...`);
                const template = document.getElementById('accounting-template');
                if (template) {
                    accountingPage.innerHTML = template.innerHTML;
                } else {
                    accountingPage.innerHTML = `<div class="page-header"><h1>Comptabilité</h1></div><div class="card"><div class="card-body"><p class="error-message">Erreur lors du chargement de la structure du module.</p></div></div>`;
                    throw new Error('Failed to load accounting module HTML structure.');
                }
            }

            // Setup default categories if none exist
            await this.setupDefaultCategories();

            // Load initial configuration data (categories, departments, settings)
            await this.loadInitialData();

            // Setup UI elements and listeners
            this.setupTabs();
            this.setupEventListeners();
            this.initializeFilters(); // Populates dropdowns using loaded data

            // Load initial data for the default tab (expenses)
            await this.refreshData();

            this.isInitialized = true;
            console.log('AccountingManager initialized successfully.');
            window.hideLoader();
            return true;

        } catch (error) {
            console.error('Error initializing AccountingManager:', error);
            const accountingPage = document.getElementById('accounting-page');
            if(accountingPage) accountingPage.innerHTML = `<p class="error-message">Erreur initialisation comptabilité: ${error.message}</p>`;
            window.hideLoader();
            return false;
        }
    },

    /**
     * Setup default expense and income categories if none exist
     */
    setupDefaultCategories: async function() {
        console.log("Checking for existing accounting categories...");

        try {
            // Check if categories already exist
            const expenseCategories = await DataManager.expenseCategories.getAll();
            const incomeCategories = await DataManager.incomeCategories.getAll();

            let createdExpenseCategories = 0;
            let createdIncomeCategories = 0;

            // Create default expense categories if none exist
            if (!expenseCategories || expenseCategories.length === 0) {
                console.log("No expense categories found. Creating defaults...");

                const defaultExpenseCategories = [
                    { name: 'Salaires' }, { name: 'Loyer' }, { name: 'Services Publics' },
                    { name: 'Fournitures' }, { name: 'Équipement' }, { name: 'Maintenance' },
                    { name: 'Marketing' }, { name: 'Transport' }, { name: 'Nourriture' },
                    { name: 'Taxes' }, { name: 'Boisson' }, { name: 'Autres' }
                ];

                for (const category of defaultExpenseCategories) {
                    await DataManager.expenseCategories.save(category);
                    createdExpenseCategories++;
                }

                console.log(`Created ${createdExpenseCategories} default expense categories.`);
            } else {
                console.log(`Found ${expenseCategories.length} existing expense categories.`);
                
                // Check if we need to add any missing default categories
                const existingExpenseNames = new Set(
                    expenseCategories.map(cat => cat.name.trim().toLowerCase())
                );
                
                const defaultExpenseCategories = [
                    'Salaires', 'Loyer', 'Services Publics', 'Fournitures', 
                    'Équipement', 'Maintenance', 'Marketing', 'Transport', 
                    'Nourriture', 'Taxes', 'Boisson', 'Autres'
                ];
                
                for (const categoryName of defaultExpenseCategories) {
                    if (!existingExpenseNames.has(categoryName.toLowerCase())) {
                        await DataManager.expenseCategories.save({ name: categoryName });
                        createdExpenseCategories++;
                        console.log(`Added missing expense category: ${categoryName}`);
                    }
                }
            }

            // Create default income categories if none exist
            if (!incomeCategories || incomeCategories.length === 0) {
                console.log("No income categories found. Creating defaults...");

                const defaultIncomeCategories = [
                    { name: 'Ventes' }, { name: 'Services' }, { name: 'Remboursements' },
                    { name: 'Investissements' }, { name: 'Autres' }
                ];

                for (const category of defaultIncomeCategories) {
                    await DataManager.incomeCategories.save(category);
                    createdIncomeCategories++;
                }

                console.log(`Created ${createdIncomeCategories} default income categories.`);
            } else {
                console.log(`Found ${incomeCategories.length} existing income categories.`);
                
                // Check if we need to add any missing default categories
                const existingIncomeNames = new Set(
                    incomeCategories.map(cat => cat.name.trim().toLowerCase())
                );
                
                const defaultIncomeCategories = [
                    'Ventes', 'Services', 'Remboursements', 'Investissements', 'Autres'
                ];
                
                for (const categoryName of defaultIncomeCategories) {
                    if (!existingIncomeNames.has(categoryName.toLowerCase())) {
                        await DataManager.incomeCategories.save({ name: categoryName });
                        createdIncomeCategories++;
                        console.log(`Added missing income category: ${categoryName}`);
                    }
                }
            }

            // Ensure local state is updated if defaults were created
            if (createdExpenseCategories > 0 || createdIncomeCategories > 0) {
                await this.loadInitialData(); // Reload all initial data to get the new IDs
            }

            return {
                success: true,
                createdExpenseCategories,
                createdIncomeCategories
            };
        } catch (error) {
            console.error("Error setting up default accounting data:", error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Load initial configuration data (categories, departments, settings) using DataManager
     */
    loadInitialData: async function() {
        console.log("Loading initial accounting config data...");
        try {
            // Fetch concurrently
            const [settings, fetchedExpCats, fetchedIncCats, fetchedDepts] = await Promise.all([
                DataManager.settings.get(),
                DataManager.expenseCategories.getAll(),
                DataManager.incomeCategories.getAll(),
                // Assuming departments are stored/managed elsewhere or use defaults
                Promise.resolve(this.DEPARTMENT_TYPES) // Using defaults for now
                // If departments are managed via DataManager, use: DataManager.departments.getAll()
            ]);

            // Set currency symbol
            this.currencySymbol = settings?.currency || 'FCFA';

            // --- Deduplication Logic ---
            const deduplicate = (categories) => {
                if (!Array.isArray(categories)) return [];
                const seen = new Map();
                categories.forEach(cat => {
                    if (cat && cat.name) {
                        const name = cat.name.trim().toLowerCase();
                        if (!seen.has(name)) {
                            seen.set(name, cat);
                        }
                    }
                });
                return Array.from(seen.values());
            };

            // Use fetched categories with deduplication or defaults if empty/error
            this.expenseCategories = (fetchedExpCats && fetchedExpCats.length > 0) 
                ? deduplicate(fetchedExpCats) 
                : [...this.DEFAULT_EXPENSE_CATEGORIES];
            this.incomeCategories = (fetchedIncCats && fetchedIncCats.length > 0) 
                ? deduplicate(fetchedIncCats) 
                : [...this.DEFAULT_INCOME_CATEGORIES];
            this.departments = (fetchedDepts && fetchedDepts.length > 0) ? fetchedDepts : [...this.DEPARTMENT_TYPES];

            console.log(`Initial config loaded: ${this.expenseCategories.length} expense cats, ${this.incomeCategories.length} income cats, ${this.departments.length} depts. Currency: ${this.currencySymbol}`);
            return true;

        } catch (error) {
            console.error('Error loading initial accounting config data:', error);
            // Use defaults as fallback
            this.expenseCategories = [...this.DEFAULT_EXPENSE_CATEGORIES];
            this.incomeCategories = [...this.DEFAULT_INCOME_CATEGORIES];
            this.departments = [...this.DEPARTMENT_TYPES];
            this.currencySymbol = 'FCFA';
            alert("Erreur chargement configuration comptabilité. Utilisation des valeurs par défaut.");
            return false;
        }
    },

    /**
     * Set up tabs navigation
     */
    setupTabs: function() {
        const tabs = document.querySelectorAll('.tab-item');
        const tabContents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                if (this.currentTab === tabId) return; // Do nothing if already active

                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                tab.classList.add('active');
                const contentElement = document.getElementById(`acc-${tabId}-tab-content`);
                if (contentElement) {
                    contentElement.classList.add('active');
                } else {
                    console.error(`Tab content not found for ID: acc-${tabId}-tab-content`);
                }

                this.currentTab = tabId;
                this.refreshTabData(tabId); // Refresh data for the newly activated tab
            });
        });
    },

    /**
     * Set up event listeners for the accounting module
     */
    setupEventListeners: function() {
        const page = document.getElementById('accounting-page');
        if (!page) return;

        // Use event delegation on the page container
        page.addEventListener('click', (event) => {
            const addExpenseBtn = event.target.closest('#add-expense-btn, #add-first-expense-btn');
            if (addExpenseBtn) {
                this.showExpenseModal();
                return;
            }

            const addIncomeBtn = event.target.closest('#add-income-btn, #add-first-income-btn');
            if (addIncomeBtn) {
                this.showIncomeModal();
                return;
            }

            const generateReportBtn = event.target.closest('#generate-report-btn');
            if (generateReportBtn) {
                 this.generateReport(); // Use the dynamic report generation
                 return;
            }

            // --- Table Actions (Delegation) ---
            const editExpenseBtn = event.target.closest('.edit-expense');
            if (editExpenseBtn) {
                this.showExpenseModal(editExpenseBtn.dataset.id);
                return;
            }
            const deleteExpenseBtn = event.target.closest('.delete-expense');
            if (deleteExpenseBtn) {
                this.showDeleteConfirmation(deleteExpenseBtn.dataset.id, 'expense');
                return;
            }
            const editIncomeBtn = event.target.closest('.edit-income');
            if (editIncomeBtn) {
                this.showIncomeModal(editIncomeBtn.dataset.id);
                return;
            }
            const deleteIncomeBtn = event.target.closest('.delete-income');
            if (deleteIncomeBtn) {
                this.showDeleteConfirmation(deleteIncomeBtn.dataset.id, 'income');
                return;
            }
            // View buttons (if implemented)
            const viewExpenseBtn = event.target.closest('.view-expense');
            if(viewExpenseBtn) {
                 console.log("View expense clicked:", viewExpenseBtn.dataset.id);
                 // TODO: Implement view details logic if needed
            }
            const viewIncomeBtn = event.target.closest('.view-income');
             if(viewIncomeBtn) {
                 console.log("View income clicked:", viewIncomeBtn.dataset.id);
                  // TODO: Implement view details logic if needed
            }


            // --- Pagination (Delegation) ---
            const paginationButton = event.target.closest('.pagination-controls button');
             if (paginationButton && !paginationButton.disabled && !paginationButton.classList.contains('active')) {
                 const type = paginationButton.closest('.pagination-controls').id.includes('expense') ? 'expense' : 'income';
                 const pageAction = paginationButton.dataset.page;
                 const filters = type === 'expense' ? this.expenseFilters : this.incomeFilters;
                 const totalPages = parseInt(paginationButton.closest('.pagination-controls').dataset.totalPages || '1'); // Get total pages if stored

                 if (pageAction === 'prev') {
                     filters.page = Math.max(1, filters.page - 1);
                 } else if (pageAction === 'next') {
                     filters.page = Math.min(totalPages, filters.page + 1);
                 } else {
                     filters.page = parseInt(pageAction);
                 }
                 this.refreshTabData(type === 'expense' ? 'expenses' : 'income');
                 return;
             }
        });

        // Filter change/input listeners
        this.setupFilterListeners('expense');
        this.setupFilterListeners('income');

        // Report period change listener
        const reportPeriodSelect = page.querySelector('#report-period');
        const customDateRange = page.querySelector('#custom-date-range');
        if (reportPeriodSelect && customDateRange) {
            reportPeriodSelect.addEventListener('change', () => {
                customDateRange.style.display = reportPeriodSelect.value === 'custom' ? 'grid' : 'none';
            });
        }
    },

    /**
     * Set up filter listeners for expenses or income
     */
    setupFilterListeners: function(type) {
        const monthFilter = document.getElementById(`${type}-month-filter`);
        const yearFilter = document.getElementById(`${type}-year-filter`);
        const categoryFilter = document.getElementById(`${type}-category-filter`);
        const departmentFilter = document.getElementById(`${type}-department-filter`);
        const searchInput = document.getElementById(`${type}-search`);

        // Debounced refresh function
        let debounceTimeout;
        const debouncedRefresh = () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                const filters = type === 'expense' ? this.expenseFilters : this.incomeFilters;
                filters.month = parseInt(monthFilter?.value ?? filters.month);
                filters.year = parseInt(yearFilter?.value ?? filters.year);
                filters.category = categoryFilter?.value ?? 'all';
                filters.department = departmentFilter?.value ?? 'all';
                filters.search = searchInput?.value.trim().toLowerCase() ?? '';
                filters.page = 1; // Reset to first page on filter change
                this.refreshTabData(type === 'expense' ? 'expenses' : 'income');
            }, 300); // 300ms debounce
        };

        // Add event listeners
        if (monthFilter) monthFilter.addEventListener('change', debouncedRefresh);
        if (yearFilter) yearFilter.addEventListener('change', debouncedRefresh);
        if (categoryFilter) categoryFilter.addEventListener('change', debouncedRefresh);
        if (departmentFilter) departmentFilter.addEventListener('change', debouncedRefresh);
        if (searchInput) searchInput.addEventListener('input', debouncedRefresh);
    },

    /**
     * Initialize filters with current date and categories/departments
     */
    initializeFilters: function() {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        // Populate year options
        this.populateYearOptions('expense-year-filter', currentYear);
        this.populateYearOptions('income-year-filter', currentYear);

        // Set current month and year in selects
        const expenseMonthFilter = document.getElementById('expense-month-filter');
        const expenseYearFilter = document.getElementById('expense-year-filter');
        const incomeMonthFilter = document.getElementById('income-month-filter');
        const incomeYearFilter = document.getElementById('income-year-filter');

        if (expenseMonthFilter) expenseMonthFilter.value = currentMonth;
        if (expenseYearFilter) expenseYearFilter.value = currentYear;
        if (incomeMonthFilter) incomeMonthFilter.value = currentMonth;
        if (incomeYearFilter) incomeYearFilter.value = currentYear;

        // Populate category filters using loaded data
        this.populateCategoryOptions('expense-category-filter', this.expenseCategories);
        this.populateCategoryOptions('income-category-filter', this.incomeCategories);

        // Populate department filters using loaded data
        this.populateDepartmentOptions('expense-department-filter', this.departments);
        // Exclude "General" for income department filter
        this.populateDepartmentOptions('income-department-filter', this.departments.filter(d => d.id !== 'general'));

        // Initialize report date range for current month
        const startDate = new Date(currentYear, currentMonth, 1);
        const endDate = new Date(currentYear, currentMonth + 1, 0);
        const reportStartDateInput = document.getElementById('report-start-date');
        const reportEndDateInput = document.getElementById('report-end-date');

        if(reportStartDateInput) reportStartDateInput.valueAsDate = startDate;
        if(reportEndDateInput) reportEndDateInput.valueAsDate = endDate;

        // Set initial filter state
        this.expenseFilters.month = currentMonth;
        this.expenseFilters.year = currentYear;
        this.incomeFilters.month = currentMonth;
        this.incomeFilters.year = currentYear;
    },

    /**
     * Populate year options for a select element
     */
    populateYearOptions: function(selectId, currentYear) {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '';
        const years = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3]; // Example range
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            select.appendChild(option);
        });
        select.value = currentYear;
    },

    /**
     * Populate category options for a select element
     */
    populateCategoryOptions: function(selectId, categories) {
        const select = document.getElementById(selectId);
        if (!select) return;
        const currentVal = select.value; // Preserve selection if possible
        const allOption = select.querySelector('option[value="all"]'); // Preserve "All"
        select.innerHTML = '';
        if (allOption) select.appendChild(allOption);
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
        // Try to restore previous selection
        if (select.querySelector(`option[value="${currentVal}"]`)) {
             select.value = currentVal;
        } else {
             select.value = 'all'; // Default to 'all' if previous value is gone
        }
    },

    /**
     * Populate department options for a select element
     */
    populateDepartmentOptions: function(selectId, departments) {
        const select = document.getElementById(selectId);
        if (!select) return;
        const currentVal = select.value;
        const allOption = select.querySelector('option[value="all"]'); // Preserve "All"
        select.innerHTML = '';
        if (allOption) select.appendChild(allOption);
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.id;
            option.textContent = dept.name;
            select.appendChild(option);
        });
         if (select.querySelector(`option[value="${currentVal}"]`)) {
             select.value = currentVal;
        } else {
             select.value = 'all';
        }
    },

    /**
     * Refresh data for the current tab
     */
    refreshData: async function() {
        await this.refreshTabData(this.currentTab);
    },

    /**
     * Refresh data for a specific tab
     */
    refreshTabData: async function(tabId) {
        switch (tabId) {
            case 'expenses':
                await this.loadExpensesUI();
                break;
            case 'income':
                await this.loadIncomeUI();
                break;
            case 'reports':
                // Reports tab is handled by generate button
                break;
            default:
                console.warn(`Unknown tab: ${tabId}`);
        }
    },

    /**
     * Load expenses UI with data fetched via DataManager based on filters
     */
    loadExpensesUI: async function() {
        const tbody = document.getElementById('acc-expenses-tbody');
        const noExpensesMessage = document.getElementById('no-expenses-message');
        const paginationControls = document.getElementById('acc-expense-pagination-controls');

        if (!tbody || !noExpensesMessage || !paginationControls) {
            console.error('Expense UI elements not found');
            return;
        }

        tbody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner-inline"></div> Chargement des dépenses...</td></tr>';
        noExpensesMessage.style.display = 'none';
        paginationControls.innerHTML = '';

        try {
            window.showLoader('Chargement des dépenses...');
            const filters = this.expenseFilters;

            // --- Fetching Logic ---
            // Fetch by month/year via DataManager
            let fetchedExpenses = await DataManager.expenses.getByMonth(filters.year, filters.month);

            // Client-side filtering (Category, Department, Search)
            if (filters.category !== 'all') {
                fetchedExpenses = fetchedExpenses.filter(exp => exp.categoryId === filters.category);
            }
            if (filters.department !== 'all') {
                fetchedExpenses = fetchedExpenses.filter(exp => exp.departmentId === filters.department);
            }
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                fetchedExpenses = fetchedExpenses.filter(exp =>
                    (exp.description?.toLowerCase() || '').includes(searchLower) ||
                    (exp.categoryName?.toLowerCase() || '').includes(searchLower) ||
                    (exp.departmentName?.toLowerCase() || '').includes(searchLower) ||
                    (exp.notes?.toLowerCase() || '').includes(searchLower)
                );
            }

            // Sort by date descending
            fetchedExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Update summary cards with the filtered data for the month/year
            this.updateExpenseSummary(fetchedExpenses);

            // --- Pagination ---
            const totalItems = fetchedExpenses.length;
            const totalPages = Math.ceil(totalItems / filters.itemsPerPage);
            const currentPage = Math.max(1, Math.min(filters.page, totalPages || 1));
            filters.page = currentPage; // Update state

            const startIndex = (currentPage - 1) * filters.itemsPerPage;
            const endIndex = startIndex + filters.itemsPerPage;
            const pageItems = fetchedExpenses.slice(startIndex, endIndex);

            this.expenses = pageItems; // Store currently displayed items

            // --- Rendering ---
            if (pageItems.length === 0) {
                tbody.innerHTML = '';
                noExpensesMessage.style.display = 'flex';
            } else {
                noExpensesMessage.style.display = 'none';
                tbody.innerHTML = this.renderExpenseTableRows(pageItems);
                this.renderPaginationControls('expense', { currentPage, totalPages });
            }

        } catch (error) {
            console.error('Error loading expenses UI:', error);
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erreur de chargement des dépenses: ${error.message}</td></tr>`;
            noExpensesMessage.style.display = 'none';
            this.updateExpenseSummary([]); // Reset summary on error
        } finally {
            window.hideLoader();
        }
    },

    /**
     * Load income UI with data fetched via DataManager based on filters
     */
    loadIncomeUI: async function() {
        const tbody = document.getElementById('acc-income-tbody');
        const noIncomeMessage = document.getElementById('no-income-message');
        const paginationControls = document.getElementById('acc-income-pagination-controls');

        if (!tbody || !noIncomeMessage || !paginationControls) {
            console.error('Income UI elements not found');
            return;
        }

        tbody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner-inline"></div> Chargement des revenus...</td></tr>';
        noIncomeMessage.style.display = 'none';
        paginationControls.innerHTML = '';

        try {
            window.showLoader('Chargement des revenus...');
            const filters = this.incomeFilters;

            // --- Fetching Logic ---
            let fetchedIncomes = await DataManager.incomes.getByMonth(filters.year, filters.month);

            // Client-side filtering
            if (filters.category !== 'all') {
                fetchedIncomes = fetchedIncomes.filter(inc => inc.categoryId === filters.category);
            }
            if (filters.department !== 'all') {
                fetchedIncomes = fetchedIncomes.filter(inc => inc.departmentId === filters.department);
            }
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                fetchedIncomes = fetchedIncomes.filter(inc =>
                    (inc.description?.toLowerCase() || '').includes(searchLower) ||
                    (inc.categoryName?.toLowerCase() || '').includes(searchLower) ||
                    (inc.departmentName?.toLowerCase() || '').includes(searchLower) ||
                    (inc.notes?.toLowerCase() || '').includes(searchLower)
                );
            }

            // Sort by date descending
            fetchedIncomes.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Update summary cards
            this.updateIncomeSummary(fetchedIncomes);

            // --- Pagination ---
            const totalItems = fetchedIncomes.length;
            const totalPages = Math.ceil(totalItems / filters.itemsPerPage);
            const currentPage = Math.max(1, Math.min(filters.page, totalPages || 1));
            filters.page = currentPage;

            const startIndex = (currentPage - 1) * filters.itemsPerPage;
            const endIndex = startIndex + filters.itemsPerPage;
            const pageItems = fetchedIncomes.slice(startIndex, endIndex);

            this.incomes = pageItems; // Store currently displayed items

            // --- Rendering ---
            if (pageItems.length === 0) {
                tbody.innerHTML = '';
                noIncomeMessage.style.display = 'flex';
            } else {
                noIncomeMessage.style.display = 'none';
                tbody.innerHTML = this.renderIncomeTableRows(pageItems);
                this.renderPaginationControls('income', { currentPage, totalPages });
            }

        } catch (error) {
            console.error('Error loading income UI:', error);
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erreur de chargement des revenus: ${error.message}</td></tr>`;
            noIncomeMessage.style.display = 'none';
            this.updateIncomeSummary([]); // Reset summary on error
        } finally {
            window.hideLoader();
        }
    },

    /**
     * Render pagination controls
     */
    renderPaginationControls: function(type, paginationInfo) {
        const { currentPage, totalPages } = paginationInfo;
        const controlsContainer = document.getElementById(`acc-${type}-pagination-controls`);
        if (!controlsContainer) return;

        // Store total pages for button logic
        controlsContainer.dataset.totalPages = totalPages;

        if (totalPages <= 1) {
            controlsContainer.innerHTML = ''; // No controls needed
            return;
        }

        let html = '';
        // Previous Button
        html += `<button data-page="prev" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;

        // Page Buttons (simplified logic)
        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
        if (endPage - startPage + 1 < maxPagesToShow) { startPage = Math.max(1, endPage - maxPagesToShow + 1); }

        if (startPage > 1) { html += `<button data-page="1">1</button>`; if (startPage > 2) html += `<span>...</span>`; }
        for (let i = startPage; i <= endPage; i++) { html += `<button data-page="${i}" ${i === currentPage ? 'class="active"' : ''}>${i}</button>`; }
        if (endPage < totalPages) { if (endPage < totalPages - 1) html += `<span>...</span>`; html += `<button data-page="${totalPages}">${totalPages}</button>`; }

        // Next Button
        html += `<button data-page="next" ${currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;

        controlsContainer.innerHTML = html;
        // Event listeners are handled by delegation in setupEventListeners
    },

    /**
     * Update expense summary cards (using provided data)
     */
    updateExpenseSummary: function(filteredExpenses) {
        const total = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
        const count = filteredExpenses.length;
        let topCategory = '-'; let topDepartment = '-';

        if (count > 0) {
            const categoryTotals = filteredExpenses.reduce((acc, exp) => { acc[exp.categoryName] = (acc[exp.categoryName] || 0) + (exp.amount || 0); return acc; }, {});
            topCategory = Object.entries(categoryTotals).sort(([,a],[,b]) => b-a)[0]?.[0] || '-';
            const departmentTotals = filteredExpenses.reduce((acc, exp) => { acc[exp.departmentName] = (acc[exp.departmentName] || 0) + (exp.amount || 0); return acc; }, {});
            topDepartment = Object.entries(departmentTotals).sort(([,a],[,b]) => b-a)[0]?.[0] || '-';
        }

        document.getElementById('total-expenses').textContent = this.formatCurrency(total);
        document.getElementById('expense-count').textContent = count;
        document.getElementById('top-expense-category').textContent = topCategory;
        document.getElementById('top-expense-department').textContent = topDepartment;
    },

    /**
     * Update income summary cards (using provided data)
     */
    updateIncomeSummary: function(filteredIncome) {
        const total = filteredIncome.reduce((sum, income) => sum + (income.amount || 0), 0);
        const count = filteredIncome.length;
        let topCategory = '-'; let topDepartment = '-';

        if (count > 0) {
            const categoryTotals = filteredIncome.reduce((acc, inc) => { acc[inc.categoryName] = (acc[inc.categoryName] || 0) + (inc.amount || 0); return acc; }, {});
            topCategory = Object.entries(categoryTotals).sort(([,a],[,b]) => b-a)[0]?.[0] || '-';
            const departmentTotals = filteredIncome.reduce((acc, inc) => { acc[inc.departmentName] = (acc[inc.departmentName] || 0) + (inc.amount || 0); return acc; }, {});
            topDepartment = Object.entries(departmentTotals).sort(([,a],[,b]) => b-a)[0]?.[0] || '-';
        }

        document.getElementById('total-income').textContent = this.formatCurrency(total);
        document.getElementById('income-count').textContent = count;
        document.getElementById('top-income-category').textContent = topCategory;
        document.getElementById('top-income-department').textContent = topDepartment;
    },

    /**
     * Render expense table rows
     */
    renderExpenseTableRows: function(expenses) {
        if (!expenses || expenses.length === 0) {
            return '<tr><td colspan="6" class="text-center">Aucune dépense trouvée</td></tr>';
        }
        return expenses.map(expense => {
            const formattedDate = expense.date ? new Date(expense.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
            const formattedAmount = this.formatCurrency(expense.amount || 0);

            // Find department name - handle case where departmentName might not be populated from server
            let departmentName = expense.departmentName || '-';
            if (departmentName === '-' && expense.departmentId) {
                const department = this.departments.find(d => d.id === expense.departmentId);
                if (department) {
                    departmentName = department.name;
                }
            }

            return `
                <tr>
                    <td>${formattedDate}</td>
                    <td>${this.escapeHtml(expense.description || '-')}</td>
                    <td>${this.escapeHtml(expense.categoryName || '-')}</td>
                    <td>${this.escapeHtml(departmentName)}</td>
                    <td class="expense-amount">${formattedAmount}</td>
                    <td class="table-actions">
                        <button class="action-btn view-expense" title="Voir détails" data-id="${expense.id}"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit-expense" title="Modifier" data-id="${expense.id}"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-expense" title="Supprimer" data-id="${expense.id}"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
        }).join('');
    },

    /**
     * Render income table rows
     */
    renderIncomeTableRows: function(incomes) {
        if (!incomes || incomes.length === 0) {
            return '<tr><td colspan="6" class="text-center">Aucun revenu trouvé</td></tr>';
        }
        return incomes.map(income => {
            const formattedDate = income.date ? new Date(income.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
            const formattedAmount = this.formatCurrency(income.amount || 0);

            // Find department name - handle case where departmentName might not be populated from server
            let departmentName = income.departmentName || '-';
            if (departmentName === '-' && income.departmentId) {
                const department = this.departments.find(d => d.id === income.departmentId);
                if (department) {
                    departmentName = department.name;
                }
            }

            return `
                <tr>
                    <td>${formattedDate}</td>
                    <td>${this.escapeHtml(income.description || '-')}</td>
                    <td>${this.escapeHtml(income.categoryName || '-')}</td>
                    <td>${this.escapeHtml(departmentName)}</td>
                    <td class="income-amount">${formattedAmount}</td>
                    <td class="table-actions">
                        <button class="action-btn view-income" title="Voir détails" data-id="${income.id}"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit-income" title="Modifier" data-id="${income.id}"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-income" title="Supprimer" data-id="${income.id}"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
        }).join('');
    },

    /**
     * Show expense modal for adding or editing (fetches data if editing)
     */
    showExpenseModal: async function(expenseId = null) {
        const modalContainer = document.getElementById('modal-container');
        const modalTemplate = document.getElementById('acc-expense-modal-template')?.innerHTML;
        if (!modalContainer || !modalTemplate) {
            alert('Erreur: Impossible d\'ouvrir le formulaire (template manquant).');
            return;
        }

        window.showLoader("Chargement du formulaire...");
        try {
            let expense = { date: new Date().toISOString().split('T')[0], description: '', amount: '', notes: '', categoryId: '', departmentId: 'general', isGeneral: true };
            let modalTitle = 'Nouvelle Dépense';

            if (expenseId) {
                const fetchedExpense = await DataManager.expenses.getById(expenseId);
                if (fetchedExpense) {
                    expense = { ...fetchedExpense, date: new Date(fetchedExpense.date).toISOString().split('T')[0] }; // Ensure date format
                    modalTitle = 'Modifier la Dépense';
                } else {
                    throw new Error("Dépense non trouvée.");
                }
            }

            const modalContent = modalTemplate
                .replace(/\{\{title\}\}/g, modalTitle)
                .replace(/\{\{id\}\}/g, expense.id || '')
                .replace(/\{\{date\}\}/g, expense.date)
                .replace(/\{\{description\}\}/g, this.escapeHtml(expense.description))
                .replace(/\{\{amount\}\}/g, expense.amount?.toString() || '') // Ensure amount is string for value
                .replace(/\{\{notes\}\}/g, this.escapeHtml(expense.notes));

            modalContainer.innerHTML = modalContent;
            modalContainer.classList.add('active');

            // Populate dropdowns and set values
            const categorySelect = document.getElementById('expense-category');
            const assignmentSelect = document.getElementById('expense-assignment');
            const departmentGroup = document.getElementById('expense-department-group');
            const departmentSelect = document.getElementById('expense-department');

            if (categorySelect) this.populateSelectWithOptions(categorySelect, this.expenseCategories, 'Sélectionner une catégorie');
            if (departmentSelect) this.populateSelectWithOptions(departmentSelect, this.departments.filter(d => d.id !== 'general'), 'Sélectionner un département');

            // Set existing values
            if (expense.categoryId) categorySelect.value = expense.categoryId;
            assignmentSelect.value = expense.isGeneral ? 'general' : 'department';
            departmentGroup.style.display = expense.isGeneral ? 'none' : 'block';
            departmentSelect.required = !expense.isGeneral;
            if (!expense.isGeneral && expense.departmentId) departmentSelect.value = expense.departmentId;

            // Add assignment change listener
            assignmentSelect.addEventListener('change', () => {
                const isNowGeneral = assignmentSelect.value === 'general';
                departmentGroup.style.display = isNowGeneral ? 'none' : 'block';
                departmentSelect.required = !isNowGeneral;
                if (isNowGeneral) departmentSelect.value = '';
            });

            this.setupModalButtons(modalContainer, 'expense'); // Bind save/cancel

        } catch (error) {
            console.error("Error showing expense modal:", error);
            alert(`Erreur: ${error.message}`);
            this.closeModal(); // Close modal on error
        } finally {
            window.hideLoader();
        }
    },

    /**
     * Show income modal for adding or editing (fetches data if editing)
     */
    showIncomeModal: async function(incomeId = null) {
        const modalContainer = document.getElementById('modal-container');
        const modalTemplate = document.getElementById('acc-income-modal-template')?.innerHTML;
        if (!modalContainer || !modalTemplate) {
            alert('Erreur: Impossible d\'ouvrir le formulaire (template manquant).');
            return;
        }

        window.showLoader("Chargement du formulaire...");
        try {
            let income = { date: new Date().toISOString().split('T')[0], description: '', amount: '', notes: '', categoryId: '', departmentId: '' };
            let modalTitle = 'Nouveau Revenu';

            if (incomeId) {
                const fetchedIncome = await DataManager.incomes.getById(incomeId);
                if (fetchedIncome) {
                    income = { ...fetchedIncome, date: new Date(fetchedIncome.date).toISOString().split('T')[0] };
                    modalTitle = 'Modifier le Revenu';
                } else {
                    throw new Error("Revenu non trouvé.");
                }
            }

            const modalContent = modalTemplate
                .replace(/\{\{title\}\}/g, modalTitle)
                .replace(/\{\{id\}\}/g, income.id || '')
                .replace(/\{\{date\}\}/g, income.date)
                .replace(/\{\{description\}\}/g, this.escapeHtml(income.description))
                .replace(/\{\{amount\}\}/g, income.amount?.toString() || '')
                .replace(/\{\{notes\}\}/g, this.escapeHtml(income.notes));

            modalContainer.innerHTML = modalContent;
            modalContainer.classList.add('active');

            // Populate dropdowns and set values
            const categorySelect = document.getElementById('income-category');
            const departmentSelect = document.getElementById('income-department');

            if (categorySelect) this.populateSelectWithOptions(categorySelect, this.incomeCategories, 'Sélectionner une catégorie');
            if (departmentSelect) this.populateSelectWithOptions(departmentSelect, this.departments.filter(d => d.id !== 'general'), 'Sélectionner un département'); // Exclude general

            if (income.categoryId) categorySelect.value = income.categoryId;
            if (income.departmentId) departmentSelect.value = income.departmentId;

            this.setupModalButtons(modalContainer, 'income');

        } catch (error) {
            console.error("Error showing income modal:", error);
            alert(`Erreur: ${error.message}`);
            this.closeModal();
        } finally {
            window.hideLoader();
        }
    },

    /** Helper to populate select elements */
    populateSelectWithOptions: function(selectElement, optionsArray, defaultOptionText = '', selectedValue = '') {
        if (!selectElement) return;
        selectElement.innerHTML = ''; // Clear existing
        if (defaultOptionText) {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = defaultOptionText;
            selectElement.appendChild(defaultOption);
        }
        optionsArray.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.name;
            selectElement.appendChild(option);
        });
         // Set the selected value if provided
        if (selectedValue && selectElement.querySelector(`option[value="${selectedValue}"]`)) {
            selectElement.value = selectedValue;
        }
    },

    /** Helper to setup modal buttons and form submission */
    setupModalButtons: function(modalContainer, type) {
        const form = modalContainer.querySelector(`#${type}-form`); // Use querySelector for robustness
        const closeBtn = modalContainer.querySelector('.modal-close');
        const cancelBtn = modalContainer.querySelector(`#${type}-cancel-btn`); // Use querySelector
        const saveBtn = modalContainer.querySelector(`#${type}-save-btn`); // Use querySelector

        const closeModalHandler = () => this.closeModal();

        if (closeBtn) closeBtn.addEventListener('click', closeModalHandler);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModalHandler);

        if (saveBtn && form) {
            saveBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }

                let data;
                try {
                    if (type === 'expense') {
                        data = this.collectExpenseFormData();
                    } else if (type === 'income') {
                        data = this.collectIncomeFormData();
                    }

                    if (data) {
                        await this.saveTransaction(data, type); // Use async save
                        this.closeModal(); // Close only on success
                    } else {
                         // Error handled within collect functions
                    }
                } catch (saveError) {
                     console.error(`Error during ${type} save operation:`, saveError);
                     alert(`Erreur lors de l'enregistrement: ${saveError.message}`);
                     // Keep modal open on error
                }
            });
        }
    },

    /** Collects data from the expense form */
    collectExpenseFormData: function() {
        // Use try/catch for better error isolation
        try {
            const id = document.getElementById('expense-id').value || undefined; // Undefined for new
            const date = document.getElementById('expense-date').value;
            const description = document.getElementById('expense-description').value.trim();
            const amountStr = document.getElementById('expense-amount').value;
            const categoryId = document.getElementById('expense-category').value;
            const assignment = document.getElementById('expense-assignment').value;
            const departmentId = assignment === 'general' ? 'general' : document.getElementById('expense-department').value;
            const notes = document.getElementById('expense-notes').value.trim();

            // --- Validation ---
            if (!date || !description || !amountStr || !categoryId || (assignment === 'department' && !departmentId)) {
                throw new Error("Veuillez remplir tous les champs obligatoires (*).");
            }
            const amount = parseFloat(amountStr);
            if (isNaN(amount) || amount < 0) { // Allow 0 amount? Maybe not.
                throw new Error("Le montant doit être un nombre positif.");
            }

            const category = this.expenseCategories.find(c => c.id === categoryId);
            const department = this.departments.find(d => d.id === departmentId);

            return {
                id, date, description, amount, categoryId, departmentId, notes,
                // Add names for potential display consistency, though they should be derived from IDs ideally
                categoryName: category ? category.name : 'Inconnue',
                departmentName: department ? department.name : 'Inconnu',
                isGeneral: assignment === 'general'
                // Timestamps (createdAt, updatedAt) will be handled by DataManager/DB
            };
        } catch (error) {
            console.error("Error collecting expense form data:", error);
            alert(`Erreur formulaire: ${error.message}`); // Show specific error
            return null; // Indicate failure
        }
    },

    /** Collects data from the income form */
    collectIncomeFormData: function() {
        try {
            const id = document.getElementById('income-id').value || undefined;
            const date = document.getElementById('income-date').value;
            const description = document.getElementById('income-description').value.trim();
            const amountStr = document.getElementById('income-amount').value;
            const categoryId = document.getElementById('income-category').value;
            const departmentId = document.getElementById('income-department').value;
            const notes = document.getElementById('income-notes').value.trim();

            // --- Validation ---
            if (!date || !description || !amountStr || !categoryId || !departmentId) {
                throw new Error("Veuillez remplir tous les champs obligatoires (*).");
            }
            const amount = parseFloat(amountStr);
            if (isNaN(amount) || amount < 0) {
                throw new Error("Le montant doit être un nombre positif.");
            }

            const category = this.incomeCategories.find(c => c.id === categoryId);
            const department = this.departments.find(d => d.id === departmentId);

            return {
                id, date, description, amount, categoryId, departmentId, notes,
                categoryName: category ? category.name : 'Inconnue',
                departmentName: department ? department.name : 'Inconnu'
            };
        } catch (error) {
            console.error("Error collecting income form data:", error);
            alert(`Erreur formulaire: ${error.message}`);
            return null;
        }
    },

    /** Unified function to save expense or income using DataManager */
    saveTransaction: async function(data, type) {
        const action = data.id ? 'mise à jour' : 'ajouté(e)';
        const itemType = type === 'expense' ? 'Dépense' : 'Revenu';
        window.showLoader(`Enregistrement ${itemType}...`);
        try {
            let savedItem;
            if (type === 'expense') {
                savedItem = await DataManager.expenses.save(data);
            } else {
                savedItem = await DataManager.incomes.save(data);
            }

            if (savedItem) {
                // Refresh the relevant tab's UI
                await this.refreshTabData(type === 'expense' ? 'expenses' : 'income');
                alert(`${itemType} ${action} avec succès.`);
                return true;
            } else {
                 // DataManager might return null/false on certain errors
                 throw new Error("L'enregistrement a échoué côté serveur/local.");
            }
        } catch (error) {
            console.error(`Error saving ${type}:`, error);
            alert(`Erreur lors de l'enregistrement: ${error.message}`);
            throw error; // Rethrow to prevent modal closing
        } finally {
            window.hideLoader();
        }
    },

    /**
     * Show delete confirmation modal (fetches item details)
     */
    showDeleteConfirmation: async function(id, type) {
        const modalContainer = document.getElementById('modal-container');
        const modalTemplate = document.getElementById('acc-delete-modal-template')?.innerHTML;
        if (!modalContainer || !modalTemplate) {
            alert('Erreur: Template de confirmation manquant.');
            return;
        }

        window.showLoader("Chargement...");
        try {
            let item;
            if (type === 'expense') {
                item = await DataManager.expenses.getById(id);
            } else {
                item = await DataManager.incomes.getById(id);
            }

            if (!item) throw new Error("Élément non trouvé.");

            const formattedDate = item.date ? new Date(item.date).toLocaleDateString('fr-FR') : '-';
            const formattedAmount = this.formatCurrency(item.amount || 0);

            const modalContent = modalTemplate
                .replace(/\{\{type\}\}/g, type === 'expense' ? 'dépense' : 'revenu')
                .replace(/\{\{date\}\}/g, formattedDate)
                .replace(/\{\{description\}\}/g, this.escapeHtml(item.description || '-'))
                .replace(/\{\{amount\}\}/g, formattedAmount);

            modalContainer.innerHTML = modalContent;
            modalContainer.classList.add('active');

            // Setup buttons for delete confirmation
            const closeBtn = modalContainer.querySelector('.modal-close');
            const cancelBtn = modalContainer.querySelector('#delete-cancel-btn'); // Use querySelector
            const confirmBtn = modalContainer.querySelector('#delete-confirm-btn'); // Use querySelector

            const closeModalHandler = () => this.closeModal();
            if (closeBtn) closeBtn.addEventListener('click', closeModalHandler);
            if (cancelBtn) cancelBtn.addEventListener('click', closeModalHandler);

            if (confirmBtn) {
                // Clone and replace to remove previous listeners if needed (or use once listener)
                const newConfirmBtn = confirmBtn.cloneNode(true);
                confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
                newConfirmBtn.addEventListener('click', async () => {
                     await this.deleteTransaction(id, type);
                     this.closeModal();
                });
            }
        } catch (error) {
            console.error(`Error showing delete confirmation for ${type} ${id}:`, error);
            alert(`Erreur: ${error.message}`);
            this.closeModal();
        } finally {
            window.hideLoader();
        }
    },

    /** Unified function to delete expense or income using DataManager */
    deleteTransaction: async function(id, type) {
        const itemType = type === 'expense' ? 'Dépense' : 'Revenu';
        window.showLoader(`Suppression ${itemType}...`);
        try {
            let success;
            if (type === 'expense') {
                success = await DataManager.expenses.delete(id);
            } else {
                success = await DataManager.incomes.delete(id);
            }

            if (success) {
                await this.refreshTabData(type === 'expense' ? 'expenses' : 'income');
                alert(`${itemType} supprimé(e) avec succès.`);
                return true;
            } else {
                 // May occur if offline and item didn't exist locally, or remote error
                 alert(`La suppression de ${itemType} a échoué ou l'élément n'existait pas.`);
                 return false;
            }
        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
            alert(`Erreur lors de la suppression: ${error.message}`);
            return false;
        } finally {
            window.hideLoader();
        }
    },

    /**
     * Generate a report based on the current configuration (using dynamic display)
     */
    generateReport: async function() { // Make async
        try {
            window.showLoader('Génération du rapport...');
            const reportType = document.getElementById('report-type')?.value;
            const reportPeriod = document.getElementById('report-period')?.value;
            if (!reportType || !reportPeriod) throw new Error("Options de rapport manquantes.");

            let { startDate, endDate } = this.getDateRangeForPeriod(reportPeriod);
            if (!startDate || !endDate) return; // Error handled in getDateRangeForPeriod

            this.reportConfig = { type: reportType, period: reportPeriod, startDate, endDate };

            let reportHtml = '';
            let reportTitle = '';

            // Fetch data using DataManager within report functions
            switch (reportType) {
                case 'expenses':
                    reportHtml = await this.generateExpensesByCategoryReport(startDate, endDate); // await
                    reportTitle = 'Rapport des Dépenses par Catégorie';
                    break;
                case 'department-expenses':
                    reportHtml = await this.generateExpensesByDepartmentReport(startDate, endDate); // await
                    reportTitle = 'Rapport des Dépenses par Département';
                    break;
                case 'income':
                    reportHtml = await this.generateIncomeByCategoryReport(startDate, endDate); // await
                    reportTitle = 'Rapport des Revenus par Catégorie';
                    break;
                case 'department-income':
                    reportHtml = await this.generateIncomeByDepartmentReport(startDate, endDate); // await
                    reportTitle = 'Rapport des Revenus par Département';
                    break;
                case 'pnl':
                    reportHtml = await this.generateProfitAndLossReport(startDate, endDate); // await
                    reportTitle = 'Rapport de Profit et Perte';
                    break;
                default: throw new Error(`Type de rapport non supporté: ${reportType}`);
            }

            // Use the dynamic display function
            this.displayGeneratedReport(reportTitle, reportHtml);
            console.log("Report generated.");
            return true;

        } catch (error) {
            console.error('Error generating report:', error);
            alert(`Erreur lors de la génération du rapport: ${error.message}`);
            return false;
        } finally {
            window.hideLoader();
        }
    },

    /** Helper to get date range based on selected period */
    getDateRangeForPeriod: function(period) {
        let startDate, endDate;
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        if (period === 'custom') {
            const startInput = document.getElementById('report-start-date');
            const endInput = document.getElementById('report-end-date');
            if (!startInput?.value || !endInput?.value) { alert("Veuillez sélectionner une plage de dates personnalisée."); return {}; }
            startDate = new Date(startInput.value + 'T00:00:00');
            endDate = new Date(endInput.value + 'T23:59:59');
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) { alert("Dates personnalisées invalides."); return {}; }
            if (startDate > endDate) { alert("La date de début doit être antérieure à la date de fin."); return {}; }
        } else if (period === 'month') {
            startDate = new Date(currentYear, currentMonth, 1);
            endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
        } else if (period === 'quarter') {
            const currentQuarter = Math.floor(currentMonth / 3);
            startDate = new Date(currentYear, currentQuarter * 3, 1);
            endDate = new Date(currentYear, (currentQuarter + 1) * 3, 0, 23, 59, 59);
        } else if (period === 'year') {
            startDate = new Date(currentYear, 0, 1);
            endDate = new Date(currentYear, 11, 31, 23, 59, 59);
        } else {
            alert("Période sélectionnée invalide."); return {};
        }
        return { startDate, endDate };
    },

    /** Displays the generated report dynamically */
    displayGeneratedReport: function(title, htmlContent) {
        console.log('[displayGeneratedReport V2] Starting...');
        const reportsTabContent = document.querySelector('#acc-reports-tab-content.active');
        const noReportMessage = document.getElementById('no-report-message');

        if (!reportsTabContent) {
            console.error('[displayGeneratedReport V2] ERROR: Active reports tab content not found.');
            alert("Erreur: Impossible de trouver la zone d'affichage des rapports.");
            return;
        }

        const existingReports = reportsTabContent.querySelectorAll('.dynamic-report-output');
        existingReports.forEach(report => report.remove());
        console.log('[displayGeneratedReport V2] Removed previous dynamic reports.');

        const reportDiv = document.createElement('div');
        reportDiv.className = 'dynamic-report-output card mb-4';
        reportDiv.id = `report-${Date.now()}`;
        reportDiv.style.display = 'block';
        reportDiv.style.visibility = 'visible';
        reportDiv.style.opacity = '1';
        reportDiv.style.border = '1px solid var(--primary, #6200ea)';
        reportDiv.style.padding = '0';
        reportDiv.style.marginTop = '2rem';
        reportDiv.style.backgroundColor = 'var(--dark-card, #2a2a3e)';

        const reportHeaderDiv = document.createElement('div');
        reportHeaderDiv.className = 'dynamic-report-header';
        reportHeaderDiv.style.display = 'flex';
        reportHeaderDiv.style.justifyContent = 'space-between';
        reportHeaderDiv.style.alignItems = 'center';
        reportHeaderDiv.style.padding = '0.8rem 1.2rem';
        reportHeaderDiv.style.borderBottom = '1px solid var(--border-color, rgba(255,255,255,0.1))';

        const reportTitleH2 = document.createElement('h2');
        reportTitleH2.textContent = title;
        reportTitleH2.style.margin = '0';
        reportTitleH2.style.fontSize = '1.2rem';
        reportTitleH2.style.color = 'var(--text-primary, #eee)';

        const exportButton = document.createElement('button');
        exportButton.innerHTML = '<i class="fas fa-download" style="margin-right: 5px;"></i> Exporter';
        exportButton.style.padding = '0.3rem 0.7rem';
        exportButton.style.fontSize = '0.9rem';
        exportButton.style.border = '1px solid var(--primary, #6200ea)';
        exportButton.style.backgroundColor = 'transparent';
        exportButton.style.color = 'var(--primary-light, #bb86fc)';
        exportButton.style.borderRadius = '5px';
        exportButton.style.cursor = 'pointer';
        exportButton.onclick = () => this.exportReport('pdf'); // TODO: Add format choice later

        reportHeaderDiv.appendChild(reportTitleH2);
        reportHeaderDiv.appendChild(exportButton);

        const reportContentDiv = document.createElement('div');
        reportContentDiv.className = 'dynamic-report-content';
        reportContentDiv.style.padding = '1.2rem';
        reportContentDiv.style.overflowX = 'auto';
        reportContentDiv.innerHTML = htmlContent;

        reportDiv.appendChild(reportHeaderDiv);
        reportDiv.appendChild(reportContentDiv);
        reportsTabContent.appendChild(reportDiv);

        console.log('[displayGeneratedReport V2] Dynamically created report div:', reportDiv);

        if (noReportMessage) noReportMessage.style.display = 'none';

        void reportDiv.offsetWidth; // Force reflow
        setTimeout(() => { reportDiv.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);

        console.log('[displayGeneratedReport V2] Finished.');
    },

    /** Helper to generate common report table structure */
    generateReportTableHtml: function(headers, rows, totals, emptyMessage) {
        let html = '<table class="report-table"><thead><tr>';
        headers.forEach(header => html += `<th>${this.escapeHtml(header)}</th>`);
        html += '</tr></thead><tbody>';
        if (rows.length === 0) {
            html += `<tr><td colspan="${headers.length}" class="text-center">${this.escapeHtml(emptyMessage)}</td></tr>`;
        } else {
            rows.forEach(row => {
                html += '<tr>';
                row.forEach((cell, index) => {
                    let cellClass = '';
                    if (headers[index]?.toLowerCase().includes('montant')) {
                        const amountValue = typeof cell === 'string' ? parseFloat(cell.replace(/[^0-9.-]+/g,"")) : cell;
                        if (!isNaN(amountValue)) {
                             cellClass = amountValue >= 0 ? 'positive-value' : 'negative-value';
                        }
                    }
                    html += `<td class="${cellClass}">${cell}</td>`;
                });
                html += '</tr>';
            });
            if (totals && totals.length > 0) {
                html += '<tr class="report-total">';
                totals.forEach((total, index) => {
                     let totalClass = '';
                     if (headers[index]?.toLowerCase().includes('montant')) {
                         const amountValue = typeof total === 'string' ? parseFloat(total.replace(/[^0-9.-]+/g,"")) : total;
                         if (!isNaN(amountValue)) {
                             totalClass = amountValue >= 0 ? 'positive-value' : 'negative-value';
                         }
                     }
                    html += `<td class="${totalClass}">${total}</td>`;
                });
                html += '</tr>';
            }
        }
        html += '</tbody></table>';
        return html;
    },

    /** Generate expenses by category report HTML (now async) */
    generateExpensesByCategoryReport: async function(startDate, endDate) {
        const expenses = await this.getExpensesByDateRange(startDate, endDate); // Use async fetch
        const categoryGroups = this.groupTransactionsBy(expenses, 'categoryName');
        const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const headers = ['Catégorie', 'Nombre', 'Montant', 'Pourcentage'];
        const rows = Object.entries(categoryGroups).map(([name, group]) => ({ name, ...group }))
            .sort((a, b) => b.amount - a.amount)
            .map(group => [
                this.escapeHtml(group.name), group.count, this.formatCurrency(group.amount),
                totalAmount > 0 ? `${((group.amount / totalAmount) * 100).toFixed(1)}%` : '0.0%'
            ]);
        const totals = ['Total', expenses.length, this.formatCurrency(totalAmount), '100.0%'];
        return this.generateReportHeader(startDate, endDate, `Total Dépenses: ${this.formatCurrency(totalAmount)}`) +
               this.generateReportTableHtml(headers, rows, totals, 'Aucune dépense pour cette période.');
    },

    /** Generate expenses by department report HTML (now async) */
    generateExpensesByDepartmentReport: async function(startDate, endDate) {
        const expenses = await this.getExpensesByDateRange(startDate, endDate); // Use async fetch
        const departmentGroups = this.groupTransactionsBy(expenses, 'departmentName');
        const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const headers = ['Département', 'Nombre', 'Montant', 'Pourcentage'];
        const rows = Object.entries(departmentGroups).map(([name, group]) => ({ name, ...group }))
            .sort((a, b) => b.amount - a.amount)
            .map(group => [
                this.escapeHtml(group.name), group.count, this.formatCurrency(group.amount),
                totalAmount > 0 ? `${((group.amount / totalAmount) * 100).toFixed(1)}%` : '0.0%'
            ]);
        const totals = ['Total', expenses.length, this.formatCurrency(totalAmount), '100.0%'];
        return this.generateReportHeader(startDate, endDate, `Total Dépenses: ${this.formatCurrency(totalAmount)}`) +
               this.generateReportTableHtml(headers, rows, totals, 'Aucune dépense pour cette période.');
    },

    /** Generate income by category report HTML (now async) */
    generateIncomeByCategoryReport: async function(startDate, endDate) {
        const incomes = await this.getIncomeByDateRange(startDate, endDate); // Use async fetch
        const categoryGroups = this.groupTransactionsBy(incomes, 'categoryName');
        const totalAmount = incomes.reduce((sum, inc) => sum + inc.amount, 0);
        const headers = ['Catégorie', 'Nombre', 'Montant', 'Pourcentage'];
        const rows = Object.entries(categoryGroups).map(([name, group]) => ({ name, ...group }))
            .sort((a, b) => b.amount - a.amount)
            .map(group => [
                this.escapeHtml(group.name), group.count, this.formatCurrency(group.amount),
                totalAmount > 0 ? `${((group.amount / totalAmount) * 100).toFixed(1)}%` : '0.0%'
            ]);
        const totals = ['Total', incomes.length, this.formatCurrency(totalAmount), '100.0%'];
        return this.generateReportHeader(startDate, endDate, `Total Revenus: ${this.formatCurrency(totalAmount)}`) +
               this.generateReportTableHtml(headers, rows, totals, 'Aucun revenu pour cette période.');
    },

    /** Generate income by department report HTML (now async) */
    generateIncomeByDepartmentReport: async function(startDate, endDate) {
        const incomes = await this.getIncomeByDateRange(startDate, endDate); // Use async fetch
        const departmentGroups = this.groupTransactionsBy(incomes, 'departmentName');
        const totalAmount = incomes.reduce((sum, inc) => sum + inc.amount, 0);
        const headers = ['Département', 'Nombre', 'Montant', 'Pourcentage'];
        const rows = Object.entries(departmentGroups).map(([name, group]) => ({ name, ...group }))
            .sort((a, b) => b.amount - a.amount)
            .map(group => [
                this.escapeHtml(group.name), group.count, this.formatCurrency(group.amount),
                totalAmount > 0 ? `${((group.amount / totalAmount) * 100).toFixed(1)}%` : '0.0%'
            ]);
        const totals = ['Total', incomes.length, this.formatCurrency(totalAmount), '100.0%'];
        return this.generateReportHeader(startDate, endDate, `Total Revenus: ${this.formatCurrency(totalAmount)}`) +
               this.generateReportTableHtml(headers, rows, totals, 'Aucun revenu pour cette période.');
    },

    /** Generate Profit and Loss report HTML (now async) */
    generateProfitAndLossReport: async function(startDate, endDate) {
        // Fetch data concurrently
        const [incomes, expenses] = await Promise.all([
            this.getIncomeByDateRange(startDate, endDate),
            this.getExpensesByDateRange(startDate, endDate)
        ]);

        const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const netProfit = totalIncome - totalExpenses;

        // Income Section
        const incomeCategoryGroups = this.groupTransactionsBy(incomes, 'categoryName');
        const incomeHeaders = ['Catégorie de Revenu', 'Montant'];
        const incomeRows = Object.entries(incomeCategoryGroups).map(([name, group]) => ({ name, ...group }))
            .sort((a, b) => b.amount - a.amount)
            .map(group => [this.escapeHtml(group.name), this.formatCurrency(group.amount)]);
        const incomeTotals = ['Total Revenus', this.formatCurrency(totalIncome)];
        const incomeTableHtml = this.generateReportTableHtml(incomeHeaders, incomeRows, incomeTotals, 'Aucun revenu.');

        // Expense Section
        const expenseCategoryGroups = this.groupTransactionsBy(expenses, 'categoryName');
        const expenseHeaders = ['Catégorie de Dépense', 'Montant'];
        const expenseRows = Object.entries(expenseCategoryGroups).map(([name, group]) => ({ name, ...group }))
            .sort((a, b) => b.amount - a.amount)
            .map(group => [this.escapeHtml(group.name), this.formatCurrency(group.amount)]);
        const expenseTotals = ['Total Dépenses', this.formatCurrency(totalExpenses)];
        const expenseTableHtml = this.generateReportTableHtml(expenseHeaders, expenseRows, expenseTotals, 'Aucune dépense.');

        // Summary Section
        const netProfitClass = netProfit >= 0 ? 'pnl-result-positive' : 'pnl-result-negative';
        const summaryHtml = `
            <div class="pnl-summary">
                <h3>Résumé</h3>
                <table class="report-table"><tbody>
                    <tr><td><strong>Total Revenus</strong></td><td class="positive-value">${this.formatCurrency(totalIncome)}</td></tr>
                    <tr><td><strong>Total Dépenses</strong></td><td class="negative-value">${this.formatCurrency(totalExpenses)}</td></tr>
                    <tr class="report-total"><td><strong>Résultat Net</strong></td><td class="${netProfitClass}">${this.formatCurrency(netProfit)}</td></tr>
                </tbody></table>
            </div>`;

        return this.generateReportHeader(startDate, endDate) + '<h4>Revenus</h4>' + incomeTableHtml + '<h4 class="mt-4">Dépenses</h4>' + expenseTableHtml + summaryHtml;
    },

    /** Helper function to group transactions */
    groupTransactionsBy: function(transactions, key) {
        return transactions.reduce((acc, transaction) => {
            const groupName = transaction[key] || 'Non spécifié';
            if (!acc[groupName]) acc[groupName] = { count: 0, amount: 0 };
            acc[groupName].count++;
            acc[groupName].amount += (transaction.amount || 0);
            return acc;
        }, {});
    },

    /** Helper function to generate report header */
    generateReportHeader: function(startDate, endDate, summaryText = '') {
        const formattedStart = startDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
        const formattedEnd = endDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
        let header = `<div class="report-header"><p><strong>Période:</strong> ${formattedStart} au ${formattedEnd}</p>`;
        if (summaryText) header += `<p><strong>${summaryText}</strong></p>`;
        header += `</div>`;
        return header;
    },

    /** Helper function: Get expenses in a date range using DataManager */
    getExpensesByDateRange: async function(startDate, endDate) {
        try {
            return await DataManager.expenses.getByDateRange(startDate, endDate) || [];
        } catch (error) {
            console.error("Error fetching expenses by date range:", error);
            return []; // Return empty array on error
        }
    },

    /** Helper function: Get income in a date range using DataManager */
    getIncomeByDateRange: async function(startDate, endDate) {
        try {
            return await DataManager.incomes.getByDateRange(startDate, endDate) || [];
        } catch (error) {
            console.error("Error fetching income by date range:", error);
            return [];
        }
    },

    /** Export current report (uses dynamic report content) */
    exportReport: async function(format = 'pdf') {
        try {
            // Find the dynamically generated report content
            const reportContentElement = document.querySelector('.dynamic-report-output .dynamic-report-content');
            const reportTitleElement = document.querySelector('.dynamic-report-output .dynamic-report-header h2');

            if (!reportContentElement || !reportTitleElement || !reportContentElement.innerHTML.trim()) {
                alert("Aucun rapport affiché à exporter. Veuillez d'abord générer un rapport.");
                return;
            }

            const reportTitle = reportTitleElement.textContent || 'Rapport Comptable';
            const reportHtmlContent = reportContentElement.innerHTML; // Get the generated HTML

            if (format === 'pdf') {
                if (typeof html2pdf === 'undefined') {
                    alert("La librairie d'export PDF n'est pas chargée. Tentative de chargement...");
                    await this.loadHtml2PdfScript();
                    if (typeof html2pdf === 'undefined') {
                         alert("Échec du chargement de la librairie PDF. Exportez en HTML."); return;
                    }
                }
                this.generatePDF(reportTitle, reportContentElement); // Pass element for better styling capture
            } else if (format === 'html') {
                const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${this.escapeHtml(reportTitle)}</title><style>body{font-family:sans-serif;margin:20px;}table{border-collapse:collapse;width:100%;margin-bottom:1rem;}th,td{border:1px solid #ccc;padding:8px;text-align:left;}th{background-color:#f2f2f2;}.report-total{font-weight:bold;}.positive-value{color:green;}.negative-value{color:red;}.pnl-summary{margin-top:1rem;background-color:#f8f8f8;padding:15px;border:1px solid #ddd;}.report-header{margin-bottom:1rem;border-bottom:1px solid #ccc;padding-bottom:.5rem;}h4{margin-top:1.5rem;margin-bottom:.5rem;}</style></head><body><h1>${this.escapeHtml(reportTitle)}</h1>${reportHtmlContent}</body></html>`;
                const blob = new Blob([html], { type: 'text/html' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${reportTitle.replace(/[\s/]/g, '_')}.html`;
                link.click(); URL.revokeObjectURL(link.href);
            } else {
                alert(`Format d'exportation non supporté: ${format}`);
            }
        } catch (error) {
            console.error('Error exporting report:', error);
            alert(`Erreur lors de l'exportation: ${error.message}`);
        }
    },

    /** Dynamically loads the html2pdf script */
    loadHtml2PdfScript: function() {
        // (Implementation remains the same as previous versions)
        return new Promise((resolve, reject) => {
            if (typeof html2pdf !== 'undefined') { resolve(); return; }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.integrity = 'sha512-GsLlZN/3F2ErC5ifS5QtgpiJtWd43JWSuIgh7mbzZ8zBps+dvLusV+eNQATqgA/HdeKFVgA5v3S/cIrLF7QnIg==';
            script.crossOrigin = 'anonymous'; script.referrerPolicy = 'no-referrer';
            script.onload = resolve;
            script.onerror = (err) => { console.error("Failed to load html2pdf script:", err); reject(err); };
            document.head.appendChild(script);
        });
    },

    /** Generate PDF from report content element */
    generatePDF: function(reportTitle, contentElement) {
        // (Implementation remains the same as previous versions, using contentElement)
         try {
            window.showLoader('Génération du PDF...');
            const opt = { margin: 10, filename: `${reportTitle.replace(/[\s/]/g, '_')}.pdf`, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
            // Clone the element to avoid modifying the original display
            const elementToPrint = contentElement.cloneNode(true);
            // Add basic styles directly for PDF rendering
            const style = document.createElement('style');
            style.textContent = `body { font-family: Arial, sans-serif; font-size: 10pt; } table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; } th, td { border: 1px solid #ccc; padding: 5px; text-align: left; } th { background-color: #eee; font-weight: bold; } .report-total { font-weight: bold; } .positive-value { color: green; } .negative-value { color: red; } .report-header { margin-bottom: 1rem; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; }`;
            const pdfContainer = document.createElement('div');
            pdfContainer.appendChild(style);
            pdfContainer.appendChild(elementToPrint); // Append the cloned element

            html2pdf().from(pdfContainer).set(opt).save().then(() => { window.hideLoader(); }).catch(err => { console.error("PDF generation error:", err); window.hideLoader(); alert("Erreur PDF."); });
        } catch (error) { window.hideLoader(); console.error('Error in PDF generation:', error); alert(`Erreur PDF: ${error.message}`); }
    },

    // ==============================================
    //          NEW: Category Management
    // ==============================================

    /**
     * Show modal for managing categories (expense or income)
     * @param {string} type - 'expense' or 'income'
     */
    showCategoriesModal: async function(type) {
        if (type !== 'expense' && type !== 'income') {
            console.error("Invalid category type provided:", type);
            return;
        }

        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) {
            alert("Erreur: Conteneur modal introuvable.");
            return;
        }

        const categoryTypeName = type === 'expense' ? 'Dépenses' : 'Revenus';
        const modalTitle = `Gérer les Catégories de ${categoryTypeName}`;

        window.showLoader("Chargement des catégories...");
        try {
            let categories = [];
            if (type === 'expense') {
                categories = await DataManager.expenseCategories.getAll();
            } else {
                categories = await DataManager.incomeCategories.getAll();
            }

            // Sort categories alphabetically
            categories.sort((a, b) => a.name.localeCompare(b.name));

            // Modal HTML Structure
            modalContainer.innerHTML = `
                <div class="modal modal-medium">
                    <div class="modal-header">
                        <h3>${modalTitle}</h3>
                        <button class="modal-close"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body">
                        <div class="category-list-container mb-3" style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border-color); padding: 10px; border-radius: 5px;">
                            <ul id="category-list" class="list-group">
                                ${this._renderCategoriesList(categories, type)}
                            </ul>
                        </div>
                        <div class="add-category-form">
                            <h4>Ajouter une Nouvelle Catégorie</h4>
                            <div class="form-group">
                                <label for="new-category-name">Nom de la Catégorie</label>
                                <input type="text" id="new-category-name" class="form-control" placeholder="Ex: Fournitures de bureau">
                            </div>
                            <button id="add-category-btn" class="btn btn-primary btn-sm mt-2">
                                <i class="fas fa-plus"></i> Ajouter
                            </button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline modal-cancel">Fermer</button>
                    </div>
                </div>
            `;

            modalContainer.classList.add('active');
            this._bindCategoryModalEvents(type); // Bind events for the modal

        } catch (error) {
            console.error(`Error showing ${type} categories modal:`, error);
            alert(`Erreur lors du chargement des catégories: ${error.message}`);
            this.closeModal();
        } finally {
            window.hideLoader();
        }
    },

    /**
     * Renders the HTML list items for categories
     * @param {Array} categories - Array of category objects {id, name}
     * @param {string} type - 'expense' or 'income'
     * @returns {string} HTML string for list items
     */
    _renderCategoriesList: function(categories, type) {
        if (!categories || categories.length === 0) {
            return '<li class="list-group-item text-center text-muted">Aucune catégorie définie.</li>';
        }

        return categories.map(category => `
            <li class="list-group-item d-flex justify-content-between align-items-center" data-id="${category.id}">
                <span class="category-name">${this.escapeHtml(category.name)}</span>
                <div class="category-actions">
                    <button class="btn btn-outline-secondary btn-sm edit-category-btn" title="Modifier">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm delete-category-btn" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="category-edit-inline" style="display: none; width: 100%;">
                     <input type="text" class="form-control form-control-sm d-inline-block w-75 mr-2" value="${this.escapeHtml(category.name)}">
                     <button class="btn btn-success btn-sm save-edit-btn"><i class="fas fa-check"></i></button>
                     <button class="btn btn-secondary btn-sm cancel-edit-btn"><i class="fas fa-times"></i></button>
                 </div>
            </li>
        `).join('');
    },

    /**
     * Binds events for the category management modal
     * @param {string} type - 'expense' or 'income'
     */
    _bindCategoryModalEvents: function(type) {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;

        const addBtn = modalContainer.querySelector('#add-category-btn');
        const newCategoryInput = modalContainer.querySelector('#new-category-name');
        const categoryList = modalContainer.querySelector('#category-list');

        // Add Category Button
        if (addBtn && newCategoryInput) {
            addBtn.addEventListener('click', async () => {
                const newName = newCategoryInput.value.trim();
                if (!newName) {
                    alert("Veuillez entrer un nom pour la nouvelle catégorie.");
                    return;
                }

                window.showLoader("Ajout de la catégorie...");
                try {
                    const dataManager = type === 'expense' ? DataManager.expenseCategories : DataManager.incomeCategories;
                    const savedCategory = await dataManager.save({ name: newName });

                    if (savedCategory) {
                        alert("Catégorie ajoutée avec succès.");
                        newCategoryInput.value = ''; // Clear input
                        // Refresh the list in the modal and internal state
                        await this._refreshCategories(type);
                    } else {
                        throw new Error("L'enregistrement a échoué.");
                    }
                } catch (error) {
                    console.error(`Error adding ${type} category:`, error);
                    alert(`Erreur lors de l'ajout: ${error.message}`);
                } finally {
                    window.hideLoader();
                }
            });
        }

        // Edit/Delete/Save/Cancel Buttons (Event Delegation on list)
        if (categoryList) {
            categoryList.addEventListener('click', async (event) => {
                const target = event.target;
                const listItem = target.closest('li.list-group-item');
                if (!listItem) return;
                const categoryId = listItem.dataset.id;

                // --- Edit Button Clicked ---
                if (target.closest('.edit-category-btn')) {
                     listItem.querySelector('.category-name').style.display = 'none';
                     listItem.querySelector('.category-actions').style.display = 'none';
                     listItem.querySelector('.category-edit-inline').style.display = 'flex';
                     listItem.querySelector('.category-edit-inline input').focus();
                     return; // Prevent other actions
                }

                // --- Cancel Edit Button Clicked ---
                if (target.closest('.cancel-edit-btn')) {
                    listItem.querySelector('.category-edit-inline').style.display = 'none';
                    listItem.querySelector('.category-name').style.display = '';
                    listItem.querySelector('.category-actions').style.display = '';
                    // Reset input value to original (optional, good practice)
                    const originalName = listItem.querySelector('.category-name').textContent;
                    listItem.querySelector('.category-edit-inline input').value = originalName;
                     return;
                }

                // --- Save Edit Button Clicked ---
                if (target.closest('.save-edit-btn')) {
                    const editInput = listItem.querySelector('.category-edit-inline input');
                    const updatedName = editInput.value.trim();
                    const originalName = listItem.querySelector('.category-name').textContent;

                    if (!updatedName) {
                        alert("Le nom de la catégorie ne peut pas être vide.");
                        return;
                    }
                    if (updatedName === originalName) { // No change
                         listItem.querySelector('.category-edit-inline').style.display = 'none';
                         listItem.querySelector('.category-name').style.display = '';
                         listItem.querySelector('.category-actions').style.display = '';
                         return;
                    }


                    window.showLoader("Mise à jour...");
                    try {
                        const dataManager = type === 'expense' ? DataManager.expenseCategories : DataManager.incomeCategories;
                        const savedCategory = await dataManager.save({ id: categoryId, name: updatedName });

                        if (savedCategory) {
                            alert("Catégorie mise à jour.");
                             // Refresh the list in the modal and internal state
                            await this._refreshCategories(type);
                            // Note: _refreshCategories implicitly handles hiding the edit form by re-rendering
                        } else {
                            throw new Error("La mise à jour a échoué.");
                        }
                    } catch (error) {
                        console.error(`Error updating ${type} category ${categoryId}:`, error);
                        alert(`Erreur mise à jour: ${error.message}`);
                    } finally {
                        window.hideLoader();
                    }
                    return;
                }


                // --- Delete Button Clicked ---
                if (target.closest('.delete-category-btn')) {
                    const categoryName = listItem.querySelector('.category-name').textContent;
                    if (!confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${categoryName}" ?\nCette action est irréversible.`)) {
                        return;
                    }

                     // Optional: Basic check if category is used (can be slow)
                     // Add more robust check if needed (e.g., DataManager function)
                     /*
                     let isInUse = false;
                     if (type === 'expense') {
                         const expenses = await DataManager.expenses.getAll();
                         isInUse = expenses.some(exp => exp.categoryId === categoryId);
                     } else {
                          const incomes = await DataManager.incomes.getAll();
                          isInUse = incomes.some(inc => inc.categoryId === categoryId);
                     }
                     if (isInUse) {
                         alert(`Impossible de supprimer "${categoryName}" car elle est utilisée dans des transactions.`);
                         return;
                     }
                     */

                    window.showLoader("Suppression...");
                    try {
                        const dataManager = type === 'expense' ? DataManager.expenseCategories : DataManager.incomeCategories;
                        const success = await dataManager.delete(categoryId);

                        if (success) {
                            alert(`Catégorie "${categoryName}" supprimée.`);
                            // Refresh the list in the modal and internal state
                            await this._refreshCategories(type);
                        } else {
                            // This might happen if LocalDB check prevents deletion, or remote op fails
                            alert(`Impossible de supprimer "${categoryName}". Vérifiez si elle est utilisée.`);
                        }
                    } catch (error) {
                        console.error(`Error deleting ${type} category ${categoryId}:`, error);
                        alert(`Erreur lors de la suppression: ${error.message}. Vérifiez si la catégorie est utilisée.`);
                    } finally {
                        window.hideLoader();
                    }
                     return;
                }
            });
        }

        // Close button (standard modal close)
        const closeBtn = modalContainer.querySelector('.modal-close');
        const cancelBtn = modalContainer.querySelector('.modal-cancel');
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());

    },

    /**
     * Refreshes the category list in the modal and updates internal state and UI components.
     * @param {string} type - 'expense' or 'income'
     */
    _refreshCategories: async function(type) {
        const modalContainer = document.getElementById('modal-container');
        const listElement = modalContainer?.querySelector('#category-list');

        try {
            let categories = [];
            if (type === 'expense') {
                categories = await DataManager.expenseCategories.getAll();
                this.expenseCategories = categories; // Update internal state
            } else {
                categories = await DataManager.incomeCategories.getAll();
                this.incomeCategories = categories; // Update internal state
            }

            categories.sort((a, b) => a.name.localeCompare(b.name));

            // Re-render list in the modal if it's still open
            if (listElement) {
                listElement.innerHTML = this._renderCategoriesList(categories, type);
            }

            // Refresh category dropdowns in the main UI
            this._refreshUIComponents();

        } catch (error) {
            console.error(`Error refreshing ${type} categories:`, error);
            // Handle error appropriately, maybe show a message
        }
    },

    /**
     * Refreshes UI components that depend on categories (e.g., dropdowns)
     */
    _refreshUIComponents: function() {
         console.log("Refreshing UI components with updated categories...");
         // Refresh filter dropdowns
         this.populateCategoryOptions('expense-category-filter', this.expenseCategories);
         this.populateCategoryOptions('income-category-filter', this.incomeCategories);

         // Refresh dropdowns in currently open transaction modals (if any)
         const expenseCategorySelect = document.getElementById('expense-category');
         if (expenseCategorySelect) {
              this.populateSelectWithOptions(expenseCategorySelect, this.expenseCategories, 'Sélectionner une catégorie', expenseCategorySelect.value); // Preserve selection
         }
         const incomeCategorySelect = document.getElementById('income-category');
          if (incomeCategorySelect) {
               this.populateSelectWithOptions(incomeCategorySelect, this.incomeCategories, 'Sélectionner une catégorie', incomeCategorySelect.value); // Preserve selection
          }

          // Add any other UI component updates needed here
    },


    // ==============================================
    //          END: Category Management
    // ==============================================

    /** Format a number as currency using fetched symbol */
    formatCurrency: function(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) return '0 ' + this.currencySymbol;
        return new Intl.NumberFormat('fr-CM', { // Use a relevant locale like Cameroon
            style: 'currency',
            currency: 'XAF', // ISO code for CFA Franc BEAC
            currencyDisplay: 'code', // Display 'XAF' initially
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount).replace('XAF', this.currencySymbol); // Replace code with desired symbol
    },

    /** Basic HTML escaping */
    escapeHtml: function(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    },

    /** Close any active modal */
    closeModal: function() {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
            modalContainer.classList.remove('active');
            modalContainer.innerHTML = ''; // Clear content
        }
    }
};

// Export AccountingManager to window
window.AccountingManager = AccountingManager;