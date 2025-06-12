/**
 * accounting.js
 * AccountingManager for the Le Sims Accounting Module
 * Handles tracking of income and expenses, categorization, and reporting
 * (Updated with deduplication logic for categories)
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
        { name: 'Salaires' }, { name: 'Loyer' }, { name: 'Services Publics' },
        { name: 'Fournitures' }, { name: 'Équipement' }, { name: 'Maintenance' },
        { name: 'Marketing' }, { name: 'Transport' }, { name: 'Nourriture' },
        { name: 'Taxes' }, { name: 'Boisson' }, { name: 'Autres' }
    ],
    DEFAULT_INCOME_CATEGORIES: [
        { name: 'Ventes' }, { name: 'Services' }, { name: 'Remboursements' },
        { name: 'Investissements' }, { name: 'Autres' }
    ],

    /**
     * Initialize the AccountingManager
     */
    init: async function() {
        if (this.isInitialized) return true;
        console.log('Initializing AccountingManager...');

        try {
            window.showLoader('Chargement du module comptabilité...');
            
            const accountingPage = document.getElementById('accounting-page');
            if (!accountingPage.innerHTML.trim()) {
                const response = await fetch('html/accounting.html');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                accountingPage.innerHTML = await response.text();
            }

            // Setup default categories if needed (now more robust)
            await this.setupDefaultCategories();

            // Load all necessary initial data (now with deduplication)
            await this.loadInitialData();

            // Setup UI elements and listeners
            this.setupTabs();
            this.setupEventListeners();
            this.initializeFilters();

            // Load initial data for the default tab
            await this.refreshData();

            this.isInitialized = true;
            console.log('AccountingManager initialized successfully.');
            return true;

        } catch (error) {
            console.error('Error initializing AccountingManager:', error);
            const accountingPage = document.getElementById('accounting-page');
            if(accountingPage) accountingPage.innerHTML = `<p class="error-message">Erreur initialisation comptabilité: ${error.message}</p>`;
            return false;
        } finally {
            window.hideLoader();
        }
    },

    /**
     * FIX: This function is now more robust. It checks for categories by name before inserting,
     * preventing duplicates from ever being created in the database.
     */
    setupDefaultCategories: async function() {
        console.log("Checking for existing accounting categories...");

        try {
            const [existingExpenseCategories, existingIncomeCategories] = await Promise.all([
                DataManager.expenseCategories.getAll(),
                DataManager.incomeCategories.getAll()
            ]);

            const existingExpenseNames = new Set((existingExpenseCategories || []).map(c => c.name.trim().toLowerCase()));
            const existingIncomeNames = new Set((existingIncomeCategories || []).map(c => c.name.trim().toLowerCase()));

            let newCategoriesAdded = false;

            const expenseCategoriesToCreate = this.DEFAULT_EXPENSE_CATEGORIES.filter(
                defaultCat => !existingExpenseNames.has(defaultCat.name.trim().toLowerCase())
            );

            if (expenseCategoriesToCreate.length > 0) {
                console.log(`Creating ${expenseCategoriesToCreate.length} missing default expense categories...`);
                for (const category of expenseCategoriesToCreate) {
                    await DataManager.expenseCategories.save({ name: category.name });
                }
                newCategoriesAdded = true;
            }

            const incomeCategoriesToCreate = this.DEFAULT_INCOME_CATEGORIES.filter(
                defaultCat => !existingIncomeNames.has(defaultCat.name.trim().toLowerCase())
            );

            if (incomeCategoriesToCreate.length > 0) {
                console.log(`Creating ${incomeCategoriesToCreate.length} missing default income categories...`);
                for (const category of incomeCategoriesToCreate) {
                    await DataManager.incomeCategories.save({ name: category.name });
                }
                newCategoriesAdded = true;
            }

            if (newCategoriesAdded) {
                console.log("New categories were added, will reload data in loadInitialData.");
            }

            return { success: true };
        } catch (error) {
            console.error("Error setting up default accounting data:", error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * FIX: This function now de-duplicates the categories fetched from the database
     * before storing them internally. This ensures the UI is always clean.
     */
    loadInitialData: async function() {
        console.log("Loading initial accounting config data...");
        try {
            const [settings, fetchedExpCats, fetchedIncCats] = await Promise.all([
                DataManager.settings.get(),
                DataManager.expenseCategories.getAll(),
                DataManager.incomeCategories.getAll(),
            ]);

            this.currencySymbol = settings?.currency || 'FCFA';

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

            this.expenseCategories = deduplicate(fetchedExpCats);
            this.incomeCategories = deduplicate(fetchedIncCats);
            this.departments = [...this.DEPARTMENT_TYPES];

            console.log(`Initial config loaded: ${this.expenseCategories.length} unique expense cats, ${this.incomeCategories.length} unique income cats.`);
            return true;

        } catch (error) {
            console.error('Error loading initial accounting config data:', error);
            this.expenseCategories = this.DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({...c, id: `default_exp_${i}`}));
            this.incomeCategories = this.DEFAULT_INCOME_CATEGORIES.map((c, i) => ({...c, id: `default_inc_${i}`}));
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
                if (this.currentTab === tabId) return;

                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                tab.classList.add('active');
                const contentElement = document.getElementById(`acc-${tabId}-tab-content`);
                if (contentElement) contentElement.classList.add('active');

                this.currentTab = tabId;
                this.refreshTabData(tabId);
            });
        });
    },

    /**
     * Set up event listeners for the accounting module
     */
    setupEventListeners: function() {
        const page = document.getElementById('accounting-page');
        if (!page) return;

        page.addEventListener('click', (event) => {
            const target = event.target.closest('button');
            if (!target) return;

            const actionMap = {
                'add-expense-btn': () => this.showExpenseModal(),
                'add-first-expense-btn': () => this.showExpenseModal(),
                'add-income-btn': () => this.showIncomeModal(),
                'add-first-income-btn': () => this.showIncomeModal(),
                'generate-report-btn': () => this.generateReport(),
                'edit-expense': () => this.showExpenseModal(target.dataset.id),
                'delete-expense': () => this.showDeleteConfirmation(target.dataset.id, 'expense'),
                'edit-income': () => this.showIncomeModal(target.dataset.id),
                'delete-income': () => this.showDeleteConfirmation(target.dataset.id, 'income'),
            };

            const action = actionMap[target.id] || actionMap[target.classList[1]];
            if (action) action();

            if (target.closest('.pagination-controls') && !target.disabled && !target.classList.contains('active')) {
                const type = target.closest('.pagination-controls').id.includes('expense') ? 'expense' : 'income';
                const pageAction = target.dataset.page;
                const filters = type === 'expense' ? this.expenseFilters : this.incomeFilters;
                const totalPages = parseInt(target.closest('.pagination-controls').dataset.totalPages || '1');

                if (pageAction === 'prev') filters.page = Math.max(1, filters.page - 1);
                else if (pageAction === 'next') filters.page = Math.min(totalPages, filters.page + 1);
                else filters.page = parseInt(pageAction);

                this.refreshTabData(type === 'expense' ? 'expenses' : 'income');
            }
        });

        this.setupFilterListeners('expense');
        this.setupFilterListeners('income');

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
        const elements = {
            month: document.getElementById(`${type}-month-filter`),
            year: document.getElementById(`${type}-year-filter`),
            category: document.getElementById(`${type}-category-filter`),
            department: document.getElementById(`${type}-department-filter`),
            search: document.getElementById(`${type}-search`),
        };

        let debounceTimeout;
        const debouncedRefresh = () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                const filters = type === 'expense' ? this.expenseFilters : this.incomeFilters;
                filters.month = parseInt(elements.month?.value ?? filters.month);
                filters.year = parseInt(elements.year?.value ?? filters.year);
                filters.category = elements.category?.value ?? 'all';
                filters.department = elements.department?.value ?? 'all';
                filters.search = elements.search?.value.trim().toLowerCase() ?? '';
                filters.page = 1; // Reset to first page on filter change
                this.refreshTabData(type === 'expense' ? 'expenses' : 'income');
            }, 300);
        };

        Object.values(elements).forEach(el => {
            if (el) {
                const eventType = el.tagName === 'INPUT' ? 'input' : 'change';
                el.addEventListener(eventType, debouncedRefresh);
            }
        });
    },

    /**
     * Initialize filters with current date and categories/departments
     */
    initializeFilters: function() {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        this.populateYearOptions('expense-year-filter', currentYear);
        this.populateYearOptions('income-year-filter', currentYear);

        document.getElementById('expense-month-filter').value = currentMonth;
        document.getElementById('expense-year-filter').value = currentYear;
        document.getElementById('income-month-filter').value = currentMonth;
        document.getElementById('income-year-filter').value = currentYear;

        this.populateCategoryOptions('expense-category-filter', this.expenseCategories);
        this.populateCategoryOptions('income-category-filter', this.incomeCategories);

        this.populateDepartmentOptions('expense-department-filter', this.departments);
        this.populateDepartmentOptions('income-department-filter', this.departments.filter(d => d.id !== 'general'));

        const startDate = new Date(currentYear, currentMonth, 1);
        const endDate = new Date(currentYear, currentMonth + 1, 0);
        document.getElementById('report-start-date').valueAsDate = startDate;
        document.getElementById('report-end-date').valueAsDate = endDate;
    },

    populateYearOptions: function(selectId, currentYear) {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '';
        for (let year = currentYear + 1; year >= currentYear - 3; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            select.appendChild(option);
        }
        select.value = currentYear;
    },
    
    populateCategoryOptions: function(selectId, categories) {
        const select = document.getElementById(selectId);
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="all">Toutes les catégories</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
        if (select.querySelector(`option[value="${currentVal}"]`)) {
             select.value = currentVal;
        }
    },
    
    populateDepartmentOptions: function(selectId, departments) {
        const select = document.getElementById(selectId);
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="all">Tous les départements</option>';
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.id;
            option.textContent = dept.name;
            select.appendChild(option);
        });
         if (select.querySelector(`option[value="${currentVal}"]`)) {
             select.value = currentVal;
        }
    },
    
    refreshData: async function() { await this.refreshTabData(this.currentTab); },

    refreshTabData: async function(tabId) {
        if (tabId === 'expenses') await this.loadExpensesUI();
        else if (tabId === 'income') await this.loadIncomeUI();
    },

    loadExpensesUI: async function() {
        const tbody = document.getElementById('acc-expenses-tbody');
        const noExpensesMessage = document.getElementById('no-expenses-message');
        const paginationControls = document.getElementById('acc-expense-pagination-controls');
        if (!tbody || !noExpensesMessage || !paginationControls) return;

        tbody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner-inline"></div> Chargement...</td></tr>';
        noExpensesMessage.style.display = 'none';
        paginationControls.innerHTML = '';

        try {
            const filters = this.expenseFilters;
            let fetchedExpenses = await DataManager.expenses.getByMonth(filters.year, filters.month);

            if (filters.category !== 'all') fetchedExpenses = fetchedExpenses.filter(e => e.categoryId === filters.category);
            if (filters.department !== 'all') fetchedExpenses = fetchedExpenses.filter(e => e.departmentId === filters.department);
            if (filters.search) fetchedExpenses = fetchedExpenses.filter(e => e.description?.toLowerCase().includes(filters.search));

            fetchedExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
            this.updateExpenseSummary(fetchedExpenses);

            const totalItems = fetchedExpenses.length;
            const totalPages = Math.ceil(totalItems / filters.itemsPerPage);
            filters.page = Math.max(1, Math.min(filters.page, totalPages || 1));
            const pageItems = fetchedExpenses.slice((filters.page - 1) * filters.itemsPerPage, filters.page * filters.itemsPerPage);

            this.expenses = pageItems;

            if (pageItems.length === 0) {
                tbody.innerHTML = '';
                noExpensesMessage.style.display = 'flex';
            } else {
                tbody.innerHTML = this.renderExpenseTableRows(pageItems);
                this.renderPaginationControls('expense', { currentPage: filters.page, totalPages });
            }
        } catch (error) {
            console.error('Error loading expenses UI:', error);
            tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Erreur chargement: ${error.message}</td></tr>`;
            this.updateExpenseSummary([]);
        }
    },

    loadIncomeUI: async function() {
        const tbody = document.getElementById('acc-income-tbody');
        const noIncomeMessage = document.getElementById('no-income-message');
        const paginationControls = document.getElementById('acc-income-pagination-controls');
        if (!tbody || !noIncomeMessage || !paginationControls) return;

        tbody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner-inline"></div> Chargement...</td></tr>';
        noIncomeMessage.style.display = 'none';
        paginationControls.innerHTML = '';

        try {
            const filters = this.incomeFilters;
            let fetchedIncomes = await DataManager.incomes.getByMonth(filters.year, filters.month);

            if (filters.category !== 'all') fetchedIncomes = fetchedIncomes.filter(i => i.categoryId === filters.category);
            if (filters.department !== 'all') fetchedIncomes = fetchedIncomes.filter(i => i.departmentId === filters.department);
            if (filters.search) fetchedIncomes = fetchedIncomes.filter(i => i.description?.toLowerCase().includes(filters.search));

            fetchedIncomes.sort((a, b) => new Date(b.date) - new Date(a.date));
            this.updateIncomeSummary(fetchedIncomes);

            const totalItems = fetchedIncomes.length;
            const totalPages = Math.ceil(totalItems / filters.itemsPerPage);
            filters.page = Math.max(1, Math.min(filters.page, totalPages || 1));
            const pageItems = fetchedIncomes.slice((filters.page - 1) * filters.itemsPerPage, filters.page * filters.itemsPerPage);

            this.incomes = pageItems;

            if (pageItems.length === 0) {
                tbody.innerHTML = '';
                noIncomeMessage.style.display = 'flex';
            } else {
                tbody.innerHTML = this.renderIncomeTableRows(pageItems);
                this.renderPaginationControls('income', { currentPage: filters.page, totalPages });
            }
        } catch (error) {
            console.error('Error loading income UI:', error);
            tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Erreur chargement: ${error.message}</td></tr>`;
            this.updateIncomeSummary([]);
        }
    },

    renderPaginationControls: function(type, { currentPage, totalPages }) {
        const container = document.getElementById(`acc-${type}-pagination-controls`);
        if (!container || totalPages <= 1) { if(container) container.innerHTML = ''; return; }
        
        container.dataset.totalPages = totalPages;
        let html = `<button data-page="prev" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<button data-page="${i}" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
        }
        html += `<button data-page="next" ${currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
        container.innerHTML = html;
    },

    updateExpenseSummary: function(filteredExpenses) {
        const total = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        document.getElementById('total-expenses').textContent = this.formatCurrency(total);
        document.getElementById('expense-count').textContent = filteredExpenses.length;
        // Other summary logic can be added here
    },

    updateIncomeSummary: function(filteredIncome) {
        const total = filteredIncome.reduce((sum, inc) => sum + (inc.amount || 0), 0);
        document.getElementById('total-income').textContent = this.formatCurrency(total);
        document.getElementById('income-count').textContent = filteredIncome.length;
        // Other summary logic can be added here
    },

    renderExpenseTableRows: function(expenses) {
        return expenses.map(expense => `
            <tr>
                <td>${new Date(expense.date).toLocaleDateString('fr-FR')}</td>
                <td>${this.escapeHtml(expense.description || '-')}</td>
                <td>${this.escapeHtml(expense.categoryName || '-')}</td>
                <td>${this.escapeHtml(this.departments.find(d => d.id === expense.departmentId)?.name || '-')}</td>
                <td class="expense-amount">${this.formatCurrency(expense.amount || 0)}</td>
                <td class="table-actions">
                    <button class="action-btn edit-expense" title="Modifier" data-id="${expense.id}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-expense" title="Supprimer" data-id="${expense.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`).join('');
    },

    renderIncomeTableRows: function(incomes) {
        return incomes.map(income => `
            <tr>
                <td>${new Date(income.date).toLocaleDateString('fr-FR')}</td>
                <td>${this.escapeHtml(income.description || '-')}</td>
                <td>${this.escapeHtml(income.categoryName || '-')}</td>
                <td>${this.escapeHtml(this.departments.find(d => d.id === income.departmentId)?.name || '-')}</td>
                <td class="income-amount">${this.formatCurrency(income.amount || 0)}</td>
                <td class="table-actions">
                    <button class="action-btn edit-income" title="Modifier" data-id="${income.id}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-income" title="Supprimer" data-id="${income.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`).join('');
    },
    
    // All other methods like showExpenseModal, saveTransaction, generateReport, etc.
    // should be copied from the original file you provided.
    showExpenseModal: async function(expenseId = null) { /* ... implementation from original ... */ },
    showIncomeModal: async function(incomeId = null) { /* ... implementation from original ... */ },
    populateSelectWithOptions: function(selectElement, optionsArray, defaultOptionText = '', selectedValue = '') { /* ... implementation from original ... */ },
    setupModalButtons: function(modalContainer, type) { /* ... implementation from original ... */ },
    collectExpenseFormData: function() { /* ... implementation from original ... */ },
    collectIncomeFormData: function() { /* ... implementation from original ... */ },
    saveTransaction: async function(data, type) { /* ... implementation from original ... */ },
    showDeleteConfirmation: async function(id, type) { /* ... implementation from original ... */ },
    deleteTransaction: async function(id, type) { /* ... implementation from original ... */ },
    generateReport: async function() { /* ... implementation from original ... */ },
    getDateRangeForPeriod: function(period) { /* ... implementation from original ... */ },
    displayGeneratedReport: function(title, htmlContent) { /* ... implementation from original ... */ },
    generateReportTableHtml: function(headers, rows, totals, emptyMessage) { /* ... implementation from original ... */ },
    generateExpensesByCategoryReport: async function(startDate, endDate) { /* ... implementation from original ... */ },
    generateExpensesByDepartmentReport: async function(startDate, endDate) { /* ... implementation from original ... */ },
    generateIncomeByCategoryReport: async function(startDate, endDate) { /* ... implementation from original ... */ },
    generateIncomeByDepartmentReport: async function(startDate, endDate) { /* ... implementation from original ... */ },
    generateProfitAndLossReport: async function(startDate, endDate) { /* ... implementation from original ... */ },
    groupTransactionsBy: function(transactions, key) { /* ... implementation from original ... */ },
    generateReportHeader: function(startDate, endDate, summaryText = '') { /* ... implementation from original ... */ },
    getExpensesByDateRange: async function(startDate, endDate) { /* ... implementation from original ... */ },
    getIncomeByDateRange: async function(startDate, endDate) { /* ... implementation from original ... */ },
    exportReport: async function(format = 'pdf') { /* ... implementation from original ... */ },
    loadHtml2PdfScript: function() { /* ... implementation from original ... */ },
    generatePDF: function(reportTitle, contentElement) { /* ... implementation from original ... */ },
    showCategoriesModal: async function(type) { /* ... implementation from original ... */ },
    _renderCategoriesList: function(categories, type) { /* ... implementation from original ... */ },
    _bindCategoryModalEvents: function(type) { /* ... implementation from original ... */ },
    _refreshCategories: async function(type) { /* ... implementation from original ... */ },
    _refreshUIComponents: function() { /* ... implementation from original ... */ },
    formatCurrency: function(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) return '0 ' + this.currencySymbol;
        return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', currencyDisplay: 'code', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount).replace('XAF', this.currencySymbol);
    },
    escapeHtml: function(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    },
    closeModal: function() {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
            modalContainer.classList.remove('active');
            modalContainer.innerHTML = '';
        }
    }
};

window.AccountingManager = AccountingManager;

