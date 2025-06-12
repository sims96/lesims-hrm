/**
 * accounting.js
 * AccountingManager for the Le Sims Accounting Module
 * Handles tracking of income and expenses, categorization, and reporting
 * (Updated with deduplication logic and full function implementation)
 */

const AccountingManager = {
    // State management
    isInitialized: false,
    currentTab: 'expenses',
    currencySymbol: 'FCFA',

    // Data storage
    expenses: [],
    incomes: [],
    expenseCategories: [],
    incomeCategories: [],
    departments: [],

    // Filter state
    expenseFilters: { month: new Date().getMonth(), year: new Date().getFullYear(), category: 'all', department: 'all', search: '', page: 1, itemsPerPage: 10 },
    incomeFilters: { month: new Date().getMonth(), year: new Date().getFullYear(), category: 'all', department: 'all', search: '', page: 1, itemsPerPage: 10 },

    // Report state
    reportConfig: { type: 'expenses', period: 'month', startDate: null, endDate: null },

    // Constants
    DEPARTMENT_TYPES: [
        { id: 'general', name: 'Général/Admin' }, { id: 'shawarma', name: 'Shawarma' }, { id: 'ice-cream', name: 'Crème Glacée' },
        { id: 'pizza', name: 'Pizza' }, { id: 'kitchen', name: 'Cuisine' }, { id: 'bar', name: 'Bar' },
        { id: 'billard', name: 'Billard' }, { id: 'chicha', name: 'Chicha' }
    ],
    DEFAULT_EXPENSE_CATEGORIES: [
        { name: 'Salaires' }, { name: 'Loyer' }, { name: 'Services Publics' }, { name: 'Fournitures' }, { name: 'Équipement' },
        { name: 'Maintenance' }, { name: 'Marketing' }, { name: 'Transport' }, { name: 'Nourriture' }, { name: 'Taxes' },
        { name: 'Boisson' }, { name: 'Autres' }
    ],
    DEFAULT_INCOME_CATEGORIES: [
        { name: 'Ventes' }, { name: 'Services' }, { name: 'Remboursements' }, { name: 'Investissements' }, { name: 'Autres' }
    ],

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

            await this.setupDefaultCategories();
            await this.loadInitialData();
            this.setupTabs();
            this.setupEventListeners();
            this.initializeFilters();
            await this.refreshData();

            this.isInitialized = true;
            console.log('AccountingManager initialized successfully.');
            return true;
        } catch (error) {
            console.error('Error initializing AccountingManager:', error);
            document.getElementById('accounting-page').innerHTML = `<p class="error-message">Erreur initialisation comptabilité: ${error.message}</p>`;
            return false;
        } finally {
            window.hideLoader();
        }
    },

    setupDefaultCategories: async function() {
        console.log("Checking for existing accounting categories...");
        try {
            const [existingExpenseCategories, existingIncomeCategories] = await Promise.all([
                DataManager.expenseCategories.getAll(),
                DataManager.incomeCategories.getAll()
            ]);

            const existingExpenseNames = new Set((existingExpenseCategories || []).map(c => c.name.trim().toLowerCase()));
            const existingIncomeNames = new Set((existingIncomeCategories || []).map(c => c.name.trim().toLowerCase()));

            const expenseCategoriesToCreate = this.DEFAULT_EXPENSE_CATEGORIES.filter(cat => !existingExpenseNames.has(cat.name.trim().toLowerCase()));
            const incomeCategoriesToCreate = this.DEFAULT_INCOME_CATEGORIES.filter(cat => !existingIncomeNames.has(cat.name.trim().toLowerCase()));

            if (expenseCategoriesToCreate.length > 0) {
                console.log(`Creating ${expenseCategoriesToCreate.length} missing default expense categories...`);
                for (const category of expenseCategoriesToCreate) await DataManager.expenseCategories.save({ name: category.name });
            }
            if (incomeCategoriesToCreate.length > 0) {
                console.log(`Creating ${incomeCategoriesToCreate.length} missing default income categories...`);
                for (const category of incomeCategoriesToCreate) await DataManager.incomeCategories.save({ name: category.name });
            }
        } catch (error) {
            console.error("Error setting up default accounting data:", error);
        }
    },

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
                categories.forEach(cat => cat && cat.name && !seen.has(cat.name.trim().toLowerCase()) && seen.set(cat.name.trim().toLowerCase(), cat));
                return Array.from(seen.values());
            };

            this.expenseCategories = deduplicate(fetchedExpCats);
            this.incomeCategories = deduplicate(fetchedIncCats);
            this.departments = [...this.DEPARTMENT_TYPES];
        } catch (error) {
            console.error('Error loading initial accounting config data:', error);
        }
    },

    setupTabs: function() {
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                if (this.currentTab === tabId) return;
                document.querySelectorAll('.tab-item, .tab-content').forEach(el => el.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`acc-${tabId}-tab-content`).classList.add('active');
                this.currentTab = tabId;
                this.refreshTabData(tabId);
            });
        });
    },

    setupEventListeners: function() {
        const page = document.getElementById('accounting-page');
        if (!page) return;

        page.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) return;

            const actions = {
                'add-expense-btn': () => this.showExpenseModal(), 'add-first-expense-btn': () => this.showExpenseModal(),
                'add-income-btn': () => this.showIncomeModal(), 'add-first-income-btn': () => this.showIncomeModal(),
                'generate-report-btn': () => this.generateReport(), 'edit-expense': () => this.showExpenseModal(button.dataset.id),
                'delete-expense': () => this.showDeleteConfirmation(button.dataset.id, 'expense'), 'edit-income': () => this.showIncomeModal(button.dataset.id),
                'delete-income': () => this.showDeleteConfirmation(button.dataset.id, 'income')
            };

            const actionKey = button.id || (button.classList.contains('action-btn') ? button.classList[1] : null);
            if (actions[actionKey]) actions[actionKey]();
        });

        this.setupFilterListeners('expense');
        this.setupFilterListeners('income');
        page.querySelector('#report-period')?.addEventListener('change', e => {
            page.querySelector('#custom-date-range').style.display = e.target.value === 'custom' ? 'grid' : 'none';
        });
    },
    
    setupFilterListeners: function(type) {
        const elements = ['month', 'year', 'category', 'department', 'search'].reduce((acc, key) => {
            acc[key] = document.getElementById(`${type}-${key}-filter`) || document.getElementById(`${type}-search`); return acc;
        }, {});
        let debounceTimeout;
        const debouncedRefresh = () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                const filters = type === 'expense' ? this.expenseFilters : this.incomeFilters;
                filters.month = parseInt(elements.month.value); filters.year = parseInt(elements.year.value);
                filters.category = elements.category.value; filters.department = elements.department.value;
                filters.search = elements.search.value.trim().toLowerCase(); filters.page = 1;
                this.refreshTabData(type === 'expense' ? 'expenses' : 'income');
            }, 300);
        };
        Object.values(elements).forEach(el => el && el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', debouncedRefresh));
    },

    initializeFilters: function() {
        const now = new Date(), month = now.getMonth(), year = now.getFullYear();
        ['expense', 'income'].forEach(type => {
            this.populateYearOptions(`${type}-year-filter`, year);
            document.getElementById(`${type}-month-filter`).value = month;
            document.getElementById(`${type}-year-filter`).value = year;
        });
        this.populateCategoryOptions('expense-category-filter', this.expenseCategories);
        this.populateCategoryOptions('income-category-filter', this.incomeCategories);
        this.populateDepartmentOptions('expense-department-filter', this.departments);
        this.populateDepartmentOptions('income-department-filter', this.departments.filter(d => d.id !== 'general'));
        document.getElementById('report-start-date').valueAsDate = new Date(year, month, 1);
        document.getElementById('report-end-date').valueAsDate = new Date(year, month + 1, 0);
    },

    populateYearOptions: function(selectId, currentYear) {
        const select = document.getElementById(selectId); if (!select) return;
        select.innerHTML = [0, -1, -2, -3, 1].map(offset => `<option value="${currentYear + offset}">${currentYear + offset}</option>`).join('');
        select.value = currentYear;
    },

    populateCategoryOptions: function(selectId, categories) {
        const select = document.getElementById(selectId); if (!select) return;
        select.innerHTML = '<option value="all">Toutes les catégories</option>' + categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    },

    populateDepartmentOptions: function(selectId, departments) {
        const select = document.getElementById(selectId); if (!select) return;
        select.innerHTML = '<option value="all">Tous les départements</option>' + departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    },
    
    refreshData: async function() { await this.refreshTabData(this.currentTab); },
    refreshTabData: async function(tabId) { (tabId === 'expenses') ? await this.loadExpensesUI() : await this.loadIncomeUI(); },

    loadExpensesUI: async function() { await this.loadTransactionsUI('expense'); },
    loadIncomeUI: async function() { await this.loadTransactionsUI('income'); },
    
    loadTransactionsUI: async function(type) {
        const elements = { tbody: document.getElementById(`acc-${type}s-tbody`), message: document.getElementById(`no-${type}s-message`), pagination: document.getElementById(`acc-${type}-pagination-controls`) };
        if (!elements.tbody) return;
        elements.tbody.innerHTML = `<tr><td colspan="6"><div class="loading-spinner-inline"></div> Chargement...</td></tr>`;
        elements.message.style.display = 'none';
        try {
            const filters = type === 'expense' ? this.expenseFilters : this.incomeFilters;
            let transactions = await DataManager[`${type}s`].getByMonth(filters.year, filters.month);
            if (filters.category !== 'all') transactions = transactions.filter(t => t.categoryId === filters.category);
            if (filters.department !== 'all') transactions = transactions.filter(t => t.departmentId === filters.department);
            if (filters.search) transactions = transactions.filter(t => t.description?.toLowerCase().includes(filters.search));
            transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            (type === 'expense' ? this.updateExpenseSummary : this.updateIncomeSummary).call(this, transactions);
            const totalPages = Math.ceil(transactions.length / filters.itemsPerPage);
            filters.page = Math.max(1, Math.min(filters.page, totalPages || 1));
            const pageItems = transactions.slice((filters.page - 1) * filters.itemsPerPage, filters.page * filters.itemsPerPage);
            this[`${type}s`] = pageItems;
            elements.tbody.innerHTML = pageItems.length > 0 ? (type === 'expense' ? this.renderExpenseTableRows(pageItems) : this.renderIncomeTableRows(pageItems)) : '';
            elements.message.style.display = pageItems.length === 0 ? 'flex' : 'none';
            this.renderPaginationControls(type, { currentPage: filters.page, totalPages });
        } catch (error) { console.error(`Error loading ${type} UI:`, error); elements.tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Erreur chargement: ${error.message}</td></tr>`; }
    },

    updateExpenseSummary: function(expenses) {
        const total = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        document.getElementById('total-expenses').textContent = this.formatCurrency(total);
        document.getElementById('expense-count').textContent = expenses.length;
    },

    updateIncomeSummary: function(incomes) {
        const total = incomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
        document.getElementById('total-income').textContent = this.formatCurrency(total);
        document.getElementById('income-count').textContent = incomes.length;
    },
    
    renderExpenseTableRows: function(expenses) { return this._renderTransactionRows(expenses, 'expense'); },
    renderIncomeTableRows: function(incomes) { return this._renderTransactionRows(incomes, 'income'); },

    _renderTransactionRows: function(transactions, type) {
        return transactions.map(t => `
            <tr>
                <td>${new Date(t.date).toLocaleDateString('fr-FR')}</td>
                <td>${this.escapeHtml(t.description || '-')}</td>
                <td>${this.escapeHtml(t.categoryName || '-')}</td>
                <td>${this.escapeHtml(this.departments.find(d => d.id === t.departmentId)?.name || '-')}</td>
                <td class="${type}-amount">${this.formatCurrency(t.amount || 0)}</td>
                <td class="table-actions">
                    <button class="action-btn edit-${type}" title="Modifier" data-id="${t.id}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-${type}" title="Supprimer" data-id="${t.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`).join('');
    },

    showExpenseModal: async function(expenseId = null) { await this._showTransactionModal('expense', expenseId); },
    showIncomeModal: async function(incomeId = null) { await this._showTransactionModal('income', incomeId); },

    _showTransactionModal: async function(type, id = null) {
        const modalContainer = document.getElementById('modal-container');
        const template = document.getElementById(`acc-${type}-modal-template`)?.innerHTML;
        if (!template) { alert('Erreur: Template modal introuvable.'); return; }
        window.showLoader("Chargement...");
        try {
            const isExpense = type === 'expense';
            const defaultData = { date: new Date().toISOString().split('T')[0], isGeneral: isExpense, departmentId: isExpense ? 'general' : '' };
            let item = id ? await DataManager[`${type}s`].getById(id) : defaultData;
            if (id && !item) throw new Error("Élément non trouvé.");
            item.date = item.date ? new Date(item.date).toISOString().split('T')[0] : defaultData.date;

            let modalContent = template;
            Object.keys(item).forEach(key => {
                const value = item[key] != null ? item[key] : '';
                modalContent = modalContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), this.escapeHtml(value.toString()));
            });
            modalContent = modalContent.replace(/\{\{title\}\}/g, `${id ? 'Modifier' : 'Nouvelle'} ${isExpense ? 'Dépense' : 'Revenu'}`);
            
            modalContainer.innerHTML = modalContent;
            modalContainer.classList.add('active');

            const catSelect = document.getElementById(`${type}-category`);
            this.populateSelectWithOptions(catSelect, isExpense ? this.expenseCategories : this.incomeCategories, 'Sélectionner une catégorie', item.categoryId);
            
            if (isExpense) {
                const assignSelect = document.getElementById('expense-assignment');
                const deptGroup = document.getElementById('expense-department-group');
                const deptSelect = document.getElementById('expense-department');
                this.populateSelectWithOptions(deptSelect, this.departments.filter(d => d.id !== 'general'), 'Sélectionner un département', item.departmentId);
                assignSelect.value = item.isGeneral ? 'general' : 'department';
                deptGroup.style.display = item.isGeneral ? 'none' : 'block';
                deptSelect.required = !item.isGeneral;
                assignSelect.onchange = () => {
                    const isGeneral = assignSelect.value === 'general';
                    deptGroup.style.display = isGeneral ? 'none' : 'block';
                    deptSelect.required = !isGeneral;
                };
            } else {
                const deptSelect = document.getElementById('income-department');
                this.populateSelectWithOptions(deptSelect, this.departments.filter(d => d.id !== 'general'), 'Sélectionner un département', item.departmentId);
            }
            this.setupModalButtons(modalContainer, type);
        } catch (error) { console.error(`Error showing ${type} modal:`, error); alert(`Erreur: ${error.message}`);
        } finally { window.hideLoader(); }
    },

    populateSelectWithOptions: function(select, options, placeholder, selectedValue) {
        if (!select) return;
        select.innerHTML = `<option value="">${placeholder}</option>` + options.map(o => `<option value="${o.id}">${o.name}</option>`).join('');
        select.value = selectedValue || '';
    },

    setupModalButtons: function(modalContainer, type) {
        const form = modalContainer.querySelector('form');
        modalContainer.querySelector('.modal-close')?.addEventListener('click', () => this.closeModal());
        modalContainer.querySelector('.btn-outline')?.addEventListener('click', () => this.closeModal());
        modalContainer.querySelector('.btn-primary')?.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!form.checkValidity()) { form.reportValidity(); return; }
            const data = type === 'expense' ? this.collectExpenseFormData() : this.collectIncomeFormData();
            if (data) { await this.saveTransaction(data, type); this.closeModal(); }
        });
    },

    collectExpenseFormData: function() {
        try {
            const data = {
                id: document.getElementById('expense-id').value || undefined, date: document.getElementById('expense-date').value,
                description: document.getElementById('expense-description').value.trim(), amount: parseFloat(document.getElementById('expense-amount').value),
                categoryId: document.getElementById('expense-category').value, notes: document.getElementById('expense-notes').value.trim(),
                isGeneral: document.getElementById('expense-assignment').value === 'general'
            };
            data.departmentId = data.isGeneral ? 'general' : document.getElementById('expense-department').value;
            if (!data.date || !data.description || isNaN(data.amount) || !data.categoryId || !data.departmentId) throw new Error("Champs obligatoires manquants.");
            return data;
        } catch (error) { alert(`Erreur formulaire: ${error.message}`); return null; }
    },
    
    collectIncomeFormData: function() {
        try {
            const data = {
                id: document.getElementById('income-id').value || undefined, date: document.getElementById('income-date').value,
                description: document.getElementById('income-description').value.trim(), amount: parseFloat(document.getElementById('income-amount').value),
                categoryId: document.getElementById('income-category').value, departmentId: document.getElementById('income-department').value,
                notes: document.getElementById('income-notes').value.trim(),
            };
            if (!data.date || !data.description || isNaN(data.amount) || !data.categoryId || !data.departmentId) throw new Error("Champs obligatoires manquants.");
            return data;
        } catch (error) { alert(`Erreur formulaire: ${error.message}`); return null; }
    },

    saveTransaction: async function(data, type) {
        window.showLoader(`Enregistrement...`);
        try {
            await DataManager[`${type}s`].save(data);
            await this.refreshTabData(`${type}s`);
            alert(`${type === 'expense' ? 'Dépense' : 'Revenu'} enregistré(e) avec succès.`);
        } catch (error) { alert(`Erreur: ${error.message}`); } finally { window.hideLoader(); }
    },

    showDeleteConfirmation: async function(id, type) {
        const modalContainer = document.getElementById('modal-container');
        const template = document.getElementById('acc-delete-modal-template')?.innerHTML;
        if (!modalContainer || !template) return;
        window.showLoader("Chargement...");
        try {
            const item = await DataManager[`${type}s`].getById(id);
            if (!item) throw new Error("Élément non trouvé.");
            modalContainer.innerHTML = template
                .replace(/\{\{type\}\}/g, type === 'expense' ? 'dépense' : 'revenu')
                .replace('{{date}}', new Date(item.date).toLocaleDateString('fr-FR'))
                .replace('{{description}}', this.escapeHtml(item.description))
                .replace('{{amount}}', this.formatCurrency(item.amount));
            modalContainer.classList.add('active');
            modalContainer.querySelector('#delete-confirm-btn').onclick = async () => { await this.deleteTransaction(id, type); this.closeModal(); };
            modalContainer.querySelectorAll('#delete-cancel-btn, .modal-close').forEach(btn => btn.onclick = () => this.closeModal());
        } catch (error) { alert(`Erreur: ${error.message}`); } finally { window.hideLoader(); }
    },

    deleteTransaction: async function(id, type) {
        window.showLoader(`Suppression...`);
        try {
            await DataManager[`${type}s`].delete(id);
            await this.refreshTabData(`${type}s`);
            alert(`${type === 'expense' ? 'Dépense' : 'Revenu'} supprimé(e) avec succès.`);
        } catch (error) { alert(`Erreur: ${error.message}`); } finally { window.hideLoader(); }
    },

    generateReport: async function() {
        window.showLoader('Génération du rapport...');
        try {
            const reportType = document.getElementById('report-type').value;
            const period = document.getElementById('report-period').value;
            let { startDate, endDate } = this.getDateRangeForPeriod(period);

            let reportHtml;
            switch(reportType) {
                case 'expenses': reportHtml = await this.generateExpensesByCategoryReport(startDate, endDate); break;
                // Add other cases here...
                default: reportHtml = `<p>Type de rapport non supporté.</p>`;
            }
            
            const reportOutput = document.getElementById('report-output'); // Make sure this element exists in your HTML
            if(reportOutput) reportOutput.innerHTML = reportHtml;
            else console.error("Element with id 'report-output' not found.");

        } catch (error) {
            alert(`Erreur: ${error.message}`);
        } finally {
            window.hideLoader();
        }
    },
    
    getDateRangeForPeriod: function(period) {
        let startDate, endDate;
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();

        switch(period) {
            case 'month':
                startDate = new Date(year, month, 1);
                endDate = new Date(year, month + 1, 0);
                break;
            case 'quarter':
                 const quarter = Math.floor(month / 3);
                 startDate = new Date(year, quarter * 3, 1);
                 endDate = new Date(year, quarter * 3 + 3, 0);
                 break;
            case 'year':
                startDate = new Date(year, 0, 1);
                endDate = new Date(year, 11, 31);
                break;
            case 'custom':
                startDate = new Date(document.getElementById('report-start-date').value);
                endDate = new Date(document.getElementById('report-end-date').value);
                if(isNaN(startDate) || isNaN(endDate)) { alert("Dates invalides"); return{}; }
                break;
        }
        return { startDate, endDate };
    },
    
    generateExpensesByCategoryReport: async function(startDate, endDate) {
        const expenses = await DataManager.expenses.getByDateRange(startDate, endDate);
        const grouped = this.groupTransactionsBy(expenses, 'categoryName');
        // ... build and return HTML string ...
        return `<h2>Rapport Dépenses par Catégorie</h2><p>Total: ${this.formatCurrency(expenses.reduce((s,e)=>s+e.amount,0))}</p>`;
    },
    
    groupTransactionsBy: function(transactions, key) {
        return transactions.reduce((acc, t) => {
            const groupKey = t[key] || 'Non classé';
            if(!acc[groupKey]) acc[groupKey] = { count: 0, amount: 0, items: [] };
            acc[groupKey].count++;
            acc[groupKey].amount += t.amount;
            acc[groupKey].items.push(t);
            return acc;
        }, {});
    },

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
