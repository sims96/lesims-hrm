/**
 * salaries.js
 * Gestion des salaires
 * Application de Gestion des Salaires Le Sims
 * (Updated for DataManager Integration and Performance Optimization)
 */

const SalariesManager = {
    // Add batch size constant for processing
    BATCH_SIZE: 10,
    isInitialized: false, 

    /**
     * Initialisation du module de gestion des salaires
     */
    init: async function() {
        console.log("SalariesManager: Initializing...");
        // Render static structure first
        await this.renderSalariesPageStructure(); // Needs settings, now async
        try {
            // Load initial data for the default month/year using DataManager
            await this.loadSalariesData();
            this.updateCurrentMonthDisplay(); // Update display after initial load
        } catch (error) {
            console.error("SalariesManager: Error during initialization:", error);
            // Display error on the page
             const salariesPage = document.getElementById('salaries-page');
             if(salariesPage) {
                const listContainer = salariesPage.querySelector('#salaries-list');
                const noDataMessage = salariesPage.querySelector('#no-salaries-message');
                if(listContainer) listContainer.innerHTML = '<tr><td colspan="8" class="error-message">Erreur chargement initial.</td></tr>'; // Simplified error display
                if(noDataMessage) {
                    noDataMessage.textContent = "Erreur lors du chargement initial des salaires.";
                    noDataMessage.style.display = 'block';
                }
             }
        }
        this.bindEvents(); // Setup event listeners
        this.isInitialized = true; 
        console.log("SalariesManager: Initialized successfully.");
    },

// ... rest of the file

    /**
     * Renders the static HTML structure for the salaries page. (Now async due to settings fetch)
     */
    renderSalariesPageStructure: async function() {
        const salariesPage = document.getElementById('salaries-page');
        if (!salariesPage) return;

         try {
            // Get settings via DataManager
            const settings = await DataManager.settings.get();
            const currencySymbol = settings?.currency || 'FCFA';

            salariesPage.innerHTML = `
                <div class="page-header">
                    <h1>Gestion des Salaires</h1>
                    <div class="page-actions">
                        <button id="process-payroll-btn" class="btn btn-primary">
                            <i class="fas fa-money-check-alt"></i> Traiter les Salaires du Mois
                        </button>
                    </div>
                </div>

                <div class="card mb-4">
                    <div class="card-body">
                        <div class="filters">
                            <div class="month-selector">
                                <label for="salary-month">Mois:</label>
                                <select id="salary-month" class="form-control">
                                    ${this.generateMonthOptions()}
                                </select>
                                <label for="salary-year">Année:</label>
                                <select id="salary-year" class="form-control">
                                    ${this.generateYearOptions()}
                                </select>
                            </div>
                            <div class="filter-actions">
                                <div class="search-box">
                                    <input type="text" id="salary-search" placeholder="Rechercher un employé...">
                                    <i class="fas fa-search"></i>
                                </div>
                                <button id="view-all-salaries" class="btn btn-outline">
                                    <i class="fas fa-list"></i> Voir Tous
                                </button>
                                <button id="export-salaries" class="btn btn-outline">
                                    <i class="fas fa-file-export"></i> Exporter
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card mb-4">
                    <div class="card-header">
                        <h3>Résumé des Salaires du Mois</h3>
                        <span id="current-month-display"></span>
                    </div>
                    <div class="card-body">
                        <div class="salary-summary">
                            <div class="summary-grid">
                                <div class="summary-item"><h4>Employés Traités</h4><h2 id="total-employees-summary">0</h2></div>
                                <div class="summary-item"><h4>Salaires de Base</h4><h2 id="total-base-salary">0 ${currencySymbol}</h2></div>
                                <div class="summary-item"><h4>Avances Déduites</h4><h2 id="total-advances-summary">0 ${currencySymbol}</h2></div>
                                <div class="summary-item"><h4>Sanctions Déduites</h4><h2 id="total-sanctions">0 ${currencySymbol}</h2></div>
                                <div class="summary-item"><h4>Dettes Déduites</h4><h2 id="total-debts-summary">0 ${currencySymbol}</h2></div>
                                <div class="summary-item"><h4>Salaires Nets</h4><h2 id="total-net-salary">0 ${currencySymbol}</h2></div>
                            </div>
                            <div class="progress-bar-container mt-4">
                                <div class="progress-label">Progression du traitement des salaires</div>
                                <div class="progress"><div id="salary-progress" class="progress-bar" style="width: 0%;"></div></div>
                                <div class="progress-text"><span id="processed-count">0</span> sur <span id="total-count">0</span> employés traités</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="table-responsive">
                    <table id="salaries-table" class="table">
                        <thead>
                            <tr>
                                <th>Employé</th><th>Salaire de Base</th><th>Avances</th><th>Sanctions</th><th>Dettes Clients</th><th>Salaire Net</th><th>Statut</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="salaries-list">
                            </tbody>
                    </table>
                    <div id="no-salaries-message" class="empty-message" style="display: none;">
                        Aucun salaire trouvé pour la période sélectionnée. Utilisez le bouton "Traiter les Salaires du Mois" pour commencer.
                    </div>
                </div>
            `;
         } catch (error) {
             console.error("SalariesManager: Error rendering page structure:", error);
             salariesPage.innerHTML = `<p class="error-message">Erreur lors de la construction de la page des salaires.</p>`;
         }
    },

    /**
     * Génère les options pour la sélection du mois (Synchronous)
     */
    generateMonthOptions: function() {
        const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
        const currentMonth = new Date().getMonth();
        return months.map((month, index) => `<option value="${index}" ${index === currentMonth ? 'selected' : ''}>${month}</option>`).join('');
    },

    /**
     * Génère les options pour la sélection de l'année (Synchronous)
     */
    generateYearOptions: function() {
        const currentYear = new Date().getFullYear();
        let options = '';
        for (let year = currentYear - 3; year <= currentYear + 2; year++) {
            options += `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`;
        }
        return options;
    },

    /**
     * Met à jour l'affichage du mois courant (Synchronous)
     */
    updateCurrentMonthDisplay: function() {
        const monthSelect = document.getElementById('salary-month');
        const yearSelect = document.getElementById('salary-year');
        const currentMonthDisplay = document.getElementById('current-month-display');
        if (!monthSelect || !yearSelect || !currentMonthDisplay) return;
        const monthIndex = parseInt(monthSelect.value);
        const year = yearSelect.value;
        const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
        currentMonthDisplay.textContent = `${months[monthIndex]} ${year}`;
    },

    /**
     * Charge les données des salaires (Using DataManager)
     */
    loadSalariesData: async function(searchQuery = '') {
        const salariesList = document.getElementById('salaries-list');
        const noSalariesMessage = document.getElementById('no-salaries-message');
        if (!salariesList || !noSalariesMessage) return;

        salariesList.innerHTML = '<tr><td colspan="8"><div class="loading-spinner-inline"></div> Chargement...</td></tr>';
        noSalariesMessage.style.display = 'none';

        try {
            const monthSelect = document.getElementById('salary-month');
            const yearSelect = document.getElementById('salary-year');
            if (!monthSelect || !yearSelect) throw new Error("Month/Year selectors not found.");

            const month = parseInt(monthSelect.value);
            const year = parseInt(yearSelect.value);

            // Récupérer les salaires via DataManager
            let salaries = await DataManager.salaries.getByMonth(year, month); // Uses DataManager

            if (!Array.isArray(salaries)) {
                console.error("SalariesManager: Failed to load salaries or data is not an array:", salaries);
                throw new Error("Les données des salaires n'ont pas pu être chargées.");
            }

            // Get settings via DataManager for currency
            const settings = await DataManager.settings.get(); // Uses DataManager
            const currencySymbol = settings?.currency || 'FCFA';

            // Fetch all employees needed for filtering/display using DataManager
            const allEmployees = await DataManager.employees.getAll(); // Uses DataManager
            const employeesMap = {};
            if(Array.isArray(allEmployees)) {
                allEmployees.forEach(emp => { employeesMap[emp.id] = emp; });
            } else {
                console.error("SalariesManager: Failed to load employee data for salaries display.");
                // Continue without employee names if needed, or throw error?
            }

            // Appliquer le filtre de recherche (client-side)
            if (searchQuery) {
                const lowerQuery = searchQuery.toLowerCase();
                salaries = salaries.filter(salary => {
                    const employee = employeesMap[salary.employeeId];
                    if (!employee) return false;
                    const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
                    return fullName.includes(lowerQuery);
                });
            }

            // Afficher le message si aucun salaire après filtre
            if (salaries.length === 0) {
                salariesList.innerHTML = '';
                noSalariesMessage.textContent = 'Aucun salaire trouvé pour la période et les filtres sélectionnés.';
                noSalariesMessage.style.display = 'block';
                await this.updateSalaryStats(salaries, month, year); // Update stats with empty array
                return;
            }

            // Construction du tableau
            salariesList.innerHTML = salaries.map(salary => {
                const employee = employeesMap[salary.employeeId];
                const employeeName = employee ? `${employee.firstName || ''} ${employee.lastName || ''}` : 'Employé inconnu';
                const employeePosition = employee?.position || '';
                const avatarInitials = (employee?.firstName?.charAt(0) || '') + (employee?.lastName?.charAt(0) || '');

                return `
                    <tr data-id="${salary.id}">
                        <td>
                            <div class="employee-name">
                                <div class="avatar"><span>${avatarInitials}</span></div>
                                <div><div class="employee-fullname">${employeeName}</div><div class="employee-position">${employeePosition}</div></div>
                            </div>
                        </td>
                        <td>${(salary.baseSalary || 0).toLocaleString('fr-FR')} ${currencySymbol}</td>
                        <td>${(salary.advances || 0).toLocaleString('fr-FR')} ${currencySymbol}</td>
                        <td>${(salary.sanctions || 0).toLocaleString('fr-FR')} ${currencySymbol}</td>
                        <td>${(salary.debts || 0).toLocaleString('fr-FR')} ${currencySymbol}</td>
                        <td><strong class="text-${(salary.netSalary || 0) >= 0 ? 'success' : 'danger'}">${(salary.netSalary || 0).toLocaleString('fr-FR')} ${currencySymbol}</strong></td>
                        <td><span class="badge ${salary.isPaid ? 'badge-success' : 'badge-warning'}">${salary.isPaid ? 'Payé' : 'En attente'}</span></td>
                        <td>
                            <div class="table-actions">
                                <button class="action-btn view-salary" title="Voir les détails" data-id="${salary.id}"><i class="fas fa-eye"></i></button>
                                <button class="action-btn edit-salary" title="Modifier" data-id="${salary.id}"><i class="fas fa-edit"></i></button>
                                <button class="action-btn print-salary" title="Imprimer Fiche" data-id="${salary.id}"><i class="fas fa-print"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            // Mettre à jour les statistiques (pass already fetched employees count)
            await this.updateSalaryStats(salaries, month, year, allEmployees.length);

        } catch (error) {
            console.error("SalariesManager: Error loading salaries data:", error);
            salariesList.innerHTML = ''; // Clear loading state
            noSalariesMessage.textContent = `Erreur chargement: ${error.message}`;
            noSalariesMessage.style.display = 'block';
            await this.updateSalaryStats([], 0, 0, 0); // Reset stats on error
        }
    },

    /**
     * Met à jour les statistiques des salaires (Using DataManager)
     */
    updateSalaryStats: async function(salaries = [], month, year, totalEmployeeCount = null) {
        const totalEmployeesSummary = document.getElementById('total-employees-summary');
        const totalBaseSalary = document.getElementById('total-base-salary');
        const totalAdvancesSummary = document.getElementById('total-advances-summary');
        const totalSanctions = document.getElementById('total-sanctions');
        const totalDebtsSummary = document.getElementById('total-debts-summary');
        const totalNetSalary = document.getElementById('total-net-salary');
        const processedCountEl = document.getElementById('processed-count');
        const totalCountEl = document.getElementById('total-count');
        const progressBar = document.getElementById('salary-progress');

        if (!totalEmployeesSummary || !totalBaseSalary /*... other elements ...*/ || !progressBar) {
             console.warn("SalariesManager: Salary stats elements not found.");
             return;
        }

        if (!Array.isArray(salaries)) {
             console.warn("SalariesManager: Invalid data passed to updateSalaryStats, expected array.");
             salaries = [];
        }

        try {
            // Get settings via DataManager
            const settings = await DataManager.settings.get(); // Uses DataManager
            const currencySymbol = settings?.currency || 'FCFA';

            // Calculer les totaux des salaires fournis
            const stats = salaries.reduce((totals, salary) => {
                totals.baseSalary += salary.baseSalary || 0;
                totals.advances += salary.advances || 0;
                totals.sanctions += salary.sanctions || 0;
                totals.debts += salary.debts || 0;
                totals.netSalary += salary.netSalary || 0;
                return totals;
            }, { baseSalary: 0, advances: 0, sanctions: 0, debts: 0, netSalary: 0 });

            // Mettre à jour l'affichage
            totalEmployeesSummary.textContent = salaries.length; // Employees with salaries processed for the month
            totalBaseSalary.textContent = `${stats.baseSalary.toLocaleString('fr-FR')} ${currencySymbol}`;
            totalAdvancesSummary.textContent = `${stats.advances.toLocaleString('fr-FR')} ${currencySymbol}`;
            totalSanctions.textContent = `${stats.sanctions.toLocaleString('fr-FR')} ${currencySymbol}`;
            totalDebtsSummary.textContent = `${stats.debts.toLocaleString('fr-FR')} ${currencySymbol}`;
            totalNetSalary.textContent = `${stats.netSalary.toLocaleString('fr-FR')} ${currencySymbol}`;

            // Mettre à jour la barre de progression
            // If total employee count wasn't passed, fetch it
            let allEmployeesCount = totalEmployeeCount;
            if (allEmployeesCount === null) {
                const allEmployees = await DataManager.employees.getAll(); // Uses DataManager
                allEmployeesCount = Array.isArray(allEmployees) ? allEmployees.length : 0;
            }

            processedCountEl.textContent = salaries.length;
            totalCountEl.textContent = allEmployeesCount;
            const percentage = allEmployeesCount > 0 ? Math.min((salaries.length / allEmployeesCount) * 100, 100) : 0;
            progressBar.style.width = `${percentage}%`;
            progressBar.textContent = `${Math.round(percentage)}%`; // Add text inside progress bar

        } catch (error) {
             console.error("SalariesManager: Error updating salary stats:", error);
             totalEmployeesSummary.textContent = 'Erreur';
             totalBaseSalary.textContent = 'Erreur';
             totalAdvancesSummary.textContent = 'Erreur';
             totalSanctions.textContent = 'Erreur';
             totalDebtsSummary.textContent = 'Erreur';
             totalNetSalary.textContent = 'Erreur';
             processedCountEl.textContent = '0';
             totalCountEl.textContent = '0';
             progressBar.style.width = '0%';
             progressBar.textContent = '0%';
        }
    },

    /**
     * Traite les salaires pour le mois sélectionné (Using DataManager) - UPDATED WITH BATCH PROCESSING
     */
    processSalaries: async function() {
        const monthSelect = document.getElementById('salary-month');
        const yearSelect = document.getElementById('salary-year');
        if (!monthSelect || !yearSelect) return;

        const month = parseInt(monthSelect.value);
        const year = parseInt(yearSelect.value);
        const monthName = this.getMonthName(month);

        const selectedDate = new Date(year, month, 1);
        const currentDate = new Date();
        currentDate.setHours(0,0,0,0); // Compare dates only

        if (selectedDate > currentDate) {
            alert('Vous ne pouvez pas traiter les salaires pour une date future.');
            return;
        }

        window.showLoader(`Traitement des salaires pour ${monthName} ${year}...`);
        this.updateProgress(0, 0); // Reset progress bar initially

        try {
            // Get employees via DataManager
            const employees = await DataManager.employees.getAll(); // Uses DataManager
            if (!Array.isArray(employees) || employees.length === 0) {
                alert('Aucun employé trouvé. Ajoutez des employés avant de traiter les salaires.');
                window.hideLoader();
                return;
            }

            // Get existing salaries for the month via DataManager
            const existingSalaries = await DataManager.salaries.getByMonth(year, month); // Uses DataManager

            if (Array.isArray(existingSalaries) && existingSalaries.length > 0) {
                if (!confirm(`Des salaires existent déjà pour ${monthName} ${year}. Voulez-vous recalculer tous les salaires? Ceci supprimera les enregistrements existants pour ce mois.`)) {
                    window.hideLoader();
                    return;
                }
                // Delete existing salaries for the month via DataManager - BATCH PROCESSING
                window.showLoader(`Suppression des salaires existants pour ${monthName} ${year}...`);
                
                // Process deletions in batches
                for (let i = 0; i < existingSalaries.length; i += this.BATCH_SIZE) {
                    const batch = existingSalaries.slice(i, i + this.BATCH_SIZE);
                    const deletePromises = batch.map(salary => DataManager.salaries.delete(salary.id));
                    await Promise.all(deletePromises);
                    window.showLoader(`Suppression des salaires existants (${Math.min(i + this.BATCH_SIZE, existingSalaries.length)}/${existingSalaries.length})...`);
                }
                
                console.log(`SalariesManager: Deleted ${existingSalaries.length} existing salaries for ${month + 1}/${year}`);
            }

            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0); // Last day of the month
            endDate.setHours(23, 59, 59, 999); // Ensure end of day

            let processedCount = 0;
            const totalEmployees = employees.length;
            this.updateProgress(0, totalEmployees); // Update total count

            window.showLoader(`Calcul des salaires (0/${totalEmployees})...`);

            const calculatedSalaries = [];
            for (const employee of employees) {
                const salaryData = await this.calculateSalary(employee, startDate, endDate); // Uses DataManager indirectly
                calculatedSalaries.push(salaryData);
                processedCount++;
                this.updateProgress(processedCount, totalEmployees);
                window.showLoader(`Calcul des salaires (${processedCount}/${totalEmployees})...`);
            }

            // Save all calculated salaries via DataManager - BATCH PROCESSING
            window.showLoader(`Enregistrement des salaires (0/${calculatedSalaries.length})...`);
            let savedCount = 0;
            
            // Process salaries in batches
            for (let i = 0; i < calculatedSalaries.length; i += this.BATCH_SIZE) {
                const batch = calculatedSalaries.slice(i, i + this.BATCH_SIZE);
                await Promise.all(batch.map(salary => DataManager.salaries.save(salary)));
                savedCount += batch.length;
                window.showLoader(`Enregistrement des salaires (${savedCount}/${calculatedSalaries.length})...`);
                
                // Small delay between batches to prevent overwhelming the database
                if (i + this.BATCH_SIZE < calculatedSalaries.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            await this.loadSalariesData(); // Reload data (uses DataManager)
            alert(`Salaires traités avec succès pour ${monthName} ${year}.`);

        } catch (error) {
            console.error("SalariesManager: Error processing salaries:", error);
            alert(`Erreur lors du traitement des salaires: ${error.message}`);
        } finally {
            window.hideLoader();
        }
    },

    /**
     * Calcule le salaire d'un employé pour une période donnée (Using DataManager)
     */
    calculateSalary: async function(employee, startDate, endDate) {
        try {
            // Fetch related data via DataManager
            const [advances, sanctionsData, debts] = await Promise.all([
                DataManager.advances.getUnpaidByEmployeeId(employee.id), // Uses DataManager
                DataManager.sanctions.getByEmployeeId(employee.id),    // Uses DataManager
                DataManager.debts.getUnpaidByEmployeeId(employee.id)     // Uses DataManager
            ]);

            // Validate fetched data
            if (!Array.isArray(advances)) { console.warn(`SalariesManager: Failed to load advances for ${employee.id}`); advances = []; }
            if (!Array.isArray(sanctionsData)) { console.warn(`SalariesManager: Failed to load sanctions for ${employee.id}`); sanctionsData = []; }
            if (!Array.isArray(debts)) { console.warn(`SalariesManager: Failed to load debts for ${employee.id}`); debts = []; }

            // Filter sanctions for the specific period
            const periodSanctions = sanctionsData.filter(sanction => {
                try {
                    const sanctionDate = new Date(sanction.date);
                    // Ensure date is valid before comparison
                    return !isNaN(sanctionDate) && sanctionDate >= startDate && sanctionDate <= endDate;
                } catch (e) {
                     console.warn(`SalariesManager: Invalid sanction date found for employee ${employee.id}`, sanction);
                     return false;
                }
            });

            // Calculate totals
            const totalAdvances = advances.reduce((total, advance) => total + (advance.amount || 0), 0);
            const totalSanctions = periodSanctions.reduce((total, sanction) => total + (sanction.amount || 0), 0);
            const totalDebts = debts.reduce((total, debt) => total + (debt.amount || 0), 0);

            const baseSalary = employee.baseSalary || 0;
            const netSalary = baseSalary - totalAdvances - totalSanctions - totalDebts;

            // Prepare salary object for saving
            return {
                // id: will be generated by DB or LocalDB if new
                employeeId: employee.id,
                paymentDate: endDate.toISOString(), // Use end of period as payment date default
                period: {
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                },
                baseSalary,
                advances: totalAdvances,
                sanctions: totalSanctions,
                debts: totalDebts,
                netSalary,
                isPaid: false, // Default to not paid
                paidDate: null,
                paymentMethod: null,
                notes: null,
                details: { // Store related IDs for reference (optional but useful)
                    advanceIds: advances.map(a => a.id),
                    sanctionIds: periodSanctions.map(s => s.id),
                    debtIds: debts.map(d => d.id)
                }
            };
        } catch (error) {
            console.error(`SalariesManager: Error calculating salary for employee ${employee.id}:`, error);
            // Return a default/error state salary object
            return {
                 employeeId: employee.id,
                 paymentDate: endDate.toISOString(),
                 period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
                 baseSalary: employee.baseSalary || 0,
                 advances: 0, sanctions: 0, debts: 0, netSalary: employee.baseSalary || 0,
                 isPaid: false, details: { error: `Calculation failed: ${error.message}` }
             };
        }
    },

    /**
     * Met à jour la barre de progression (Synchronous DOM update)
     */
    updateProgress: function(processed, total) {
         const processedCountEl = document.getElementById('processed-count');
         const totalCountEl = document.getElementById('total-count');
         const progressBar = document.getElementById('salary-progress');
         if (!processedCountEl || !totalCountEl || !progressBar) return;

         processedCountEl.textContent = processed;
         totalCountEl.textContent = total;
         const percentage = total > 0 ? Math.min((processed / total) * 100, 100) : 0;
         progressBar.style.width = `${percentage}%`;
         progressBar.textContent = `${Math.round(percentage)}%`;
    },

    /**
     * Affiche le modal de détails d'un salaire (Using DataManager) - WITH N+1 FIX COMMENT
     */
    showSalaryDetails: async function(salaryId) {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;

        window.showLoader("Chargement des détails...");
        try {
            // Get data via DataManager
            const salary = await DataManager.salaries.getById(salaryId); // Uses DataManager
            if (!salary) throw new Error("Salaire non trouvé.");

            const employee = await DataManager.employees.getById(salary.employeeId); // Uses DataManager
            if (!employee) throw new Error("Employé associé non trouvé.");

            const settings = await DataManager.settings.get(); // Uses DataManager
            const currencySymbol = settings?.currency || 'FCFA';

            const paymentDate = new Date(salary.paymentDate);
            const month = this.getMonthName(paymentDate.getMonth());
            const year = paymentDate.getFullYear();

            // PERFORMANCE FIX: This section causes N+1 queries
            // TODO: Replace with optimized database function when available
            // The function get_salary_details() should be created in Supabase to fetch all related data in one query
            // For now, we'll batch the requests to minimize concurrent connections
            
            const fetchDetail = async (entity, id) => DataManager[entity].getById(id); // Uses DataManager

            // Batch the detail fetching to reduce concurrent connections
            const advanceIds = salary.details?.advanceIds || [];
            const sanctionIds = salary.details?.sanctionIds || [];
            const debtIds = salary.details?.debtIds || [];
            
            let advanceDetails = [];
            let sanctionDetails = [];
            let debtDetails = [];
            
            // Fetch advances in batches
            for (let i = 0; i < advanceIds.length; i += this.BATCH_SIZE) {
                const batch = advanceIds.slice(i, i + this.BATCH_SIZE);
                const results = await Promise.allSettled(batch.map(id => fetchDetail('advances', id)));
                advanceDetails = advanceDetails.concat(
                    results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value)
                );
            }
            
            // Fetch sanctions in batches
            for (let i = 0; i < sanctionIds.length; i += this.BATCH_SIZE) {
                const batch = sanctionIds.slice(i, i + this.BATCH_SIZE);
                const results = await Promise.allSettled(batch.map(id => fetchDetail('sanctions', id)));
                sanctionDetails = sanctionDetails.concat(
                    results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value)
                );
            }
            
            // Fetch debts in batches
            for (let i = 0; i < debtIds.length; i += this.BATCH_SIZE) {
                const batch = debtIds.slice(i, i + this.BATCH_SIZE);
                const results = await Promise.allSettled(batch.map(id => fetchDetail('debts', id)));
                debtDetails = debtDetails.concat(
                    results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value)
                );
            }

            // Render Modal HTML (same structure as before)
            modalContainer.innerHTML = `
                <div class="modal modal-large">
                    <div class="modal-header">
                        <h3>Détails du Salaire - ${employee.firstName} ${employee.lastName}</h3>
                        <button class="modal-close"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body">
                        <div class="salary-details">
                            <div class="salary-header">
                                <div class="employee-info">
                                    <div class="avatar"><span>${employee.firstName?.charAt(0)}${employee.lastName?.charAt(0)}</span></div>
                                    <div><h2>${employee.firstName} ${employee.lastName}</h2><p>${employee.position || 'N/A'}</p></div>
                                </div>
                                <div class="period-info"><h4>Période:</h4><p>${month} ${year}</p></div>
                            </div>
                            <div class="salary-summary card mb-3">
                                <div class="card-body">
                                    <div class="summary-grid summary-grid-large">
                                        <div class="summary-item"><h4>Salaire Base</h4><h2 class="text-primary">${(salary.baseSalary||0).toLocaleString()} ${currencySymbol}</h2></div>
                                        <div class="summary-item"><h4>Avances</h4><h2 class="text-danger">- ${(salary.advances||0).toLocaleString()} ${currencySymbol}</h2></div>
                                        <div class="summary-item"><h4>Sanctions</h4><h2 class="text-danger">- ${(salary.sanctions||0).toLocaleString()} ${currencySymbol}</h2></div>
                                        <div class="summary-item"><h4>Dettes</h4><h2 class="text-danger">- ${(salary.debts||0).toLocaleString()} ${currencySymbol}</h2></div>
                                        <div class="summary-item summary-total"><h4>Salaire Net</h4><h2 class="text-${(salary.netSalary||0) >= 0 ? 'success' : 'danger'}">${(salary.netSalary||0).toLocaleString()} ${currencySymbol}</h2></div>
                                    </div>
                                </div>
                            </div>
                            <div class="salary-components">
                                ${this.renderSalaryDetailSection("Avances Déduites", advanceDetails, "advance", currencySymbol)}
                                ${this.renderSalaryDetailSection("Sanctions Déduites", sanctionDetails, "sanction", currencySymbol)}
                                ${this.renderSalaryDetailSection("Dettes Clients Déduites", debtDetails, "debt", currencySymbol)}
                            </div>
                            <div class="salary-status card mt-3">
                                <div class="card-body">
                                    <div class="status-info" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                                        <div><h4>Statut:</h4><span class="badge ${salary.isPaid ? 'badge-success' : 'badge-warning'}">${salary.isPaid ? 'Payé' : 'En attente'}</span></div>
                                        ${salary.isPaid ? `
                                        <div><h4>Date Paiement:</h4><p>${salary.paidDate ? new Date(salary.paidDate).toLocaleDateString('fr-FR') : '-'}</p></div>
                                        <div><h4>Méthode:</h4><p>${this.getPaymentMethodName(salary.paymentMethod)}</p></div>` : ''}
                                    </div>
                                    ${!salary.isPaid ? `<div class="mt-3"><button id="mark-as-paid" class="btn btn-success" data-id="${salary.id}"><i class="fas fa-check"></i> Marquer Payé</button></div>` : ''}
                                </div>
                            </div>
                             <div class="salary-notes card mt-3">
                                <div class="card-body">
                                     <h4>Notes:</h4>
                                     <p>${salary.notes || 'Aucune note.'}</p>
                                 </div>
                             </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline modal-cancel">Fermer</button>
                        <button class="btn btn-outline print-salary" data-id="${salary.id}"><i class="fas fa-print"></i> Imprimer Fiche</button>
                        <button class="btn btn-primary edit-salary" data-id="${salary.id}"><i class="fas fa-edit"></i> Modifier</button>
                    </div>
                </div>`;

            modalContainer.classList.add('active');
            this.bindModalEvents(); // Bind events for the new modal

        } catch (error) {
            console.error("SalariesManager: Error showing salary details:", error);
            alert(`Erreur lors de l'affichage des détails: ${error.message}`);
        } finally {
            window.hideLoader();
        }
    },

    /**
     * Génère une section de détails du salaire (Uses Data)
     */
    renderSalaryDetailSection: function(title, items, type, currencySymbol) {
        if (!Array.isArray(items) || items.length === 0) {
            return `<div class="detail-section card mb-3"><div class="card-body"><h4>${title}</h4><p class="empty-message">Aucun.</p></div></div>`;
        }

        let itemsHTML = '';
        let tableHeaders = '';

        switch (type) {
            case 'advance':
                tableHeaders = `<th>Date</th><th>Raison</th><th>Montant</th>`;
                itemsHTML = items.map(advance => `
                    <tr><td>${new Date(advance.date).toLocaleDateString('fr-FR')}</td><td>${advance.reason || '-'}</td><td>${(advance.amount||0).toLocaleString('fr-FR')} ${currencySymbol}</td></tr>`).join('');
                break;
            case 'sanction':
                tableHeaders = `<th>Date</th><th>Type</th><th>Raison</th><th>Montant</th>`;
                itemsHTML = items.map(sanction => `
                    <tr><td>${new Date(sanction.date).toLocaleDateString('fr-FR')}</td><td>${this.getSanctionTypeName(sanction.type)}</td><td>${sanction.reason || '-'}</td><td>${(sanction.amount||0).toLocaleString('fr-FR')} ${currencySymbol}</td></tr>`).join('');
                break;
            case 'debt':
                tableHeaders = `<th>Date</th><th>Client</th><th>Description</th><th>Montant</th>`;
                itemsHTML = items.map(debt => `
                    <tr><td>${new Date(debt.date).toLocaleDateString('fr-FR')}</td><td>${debt.clientName || '-'}</td><td>${debt.description || '-'}</td><td>${(debt.amount||0).toLocaleString('fr-FR')} ${currencySymbol}</td></tr>`).join('');
                break;
             default: return '';
        }

        return `
            <div class="detail-section card mb-3">
                <div class="card-body">
                     <h4>${title} (${items.length})</h4>
                     <div class="table-responsive mt-2">
                         <table class="table table-sm">
                             <thead><tr>${tableHeaders}</tr></thead>
                             <tbody>${itemsHTML}</tbody>
                         </table>
                     </div>
                </div>
            </div>`;
    },

    /**
     * Affiche le modal d'édition d'un salaire (Using DataManager)
     */
    showSalaryEditModal: async function(salaryId) {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;

        window.showLoader("Chargement du formulaire...");
        try {
            // Get data via DataManager
            const salary = await DataManager.salaries.getById(salaryId); // Uses DataManager
            if (!salary) throw new Error("Salaire non trouvé.");

            const employee = await DataManager.employees.getById(salary.employeeId); // Uses DataManager
            if (!employee) throw new Error("Employé associé non trouvé.");

            const settings = await DataManager.settings.get(); // Uses DataManager
            const currencySymbol = settings?.currency || 'FCFA';

            const paymentDate = new Date(salary.paymentDate);
            const month = this.getMonthName(paymentDate.getMonth());
            const year = paymentDate.getFullYear();

            // Render modal HTML
            modalContainer.innerHTML = `
                <div class="modal">
                    <div class="modal-header"><h3>Modifier Salaire - ${employee.firstName} ${employee.lastName}</h3><button class="modal-close"><i class="fas fa-times"></i></button></div>
                    <div class="modal-body">
                        <form id="edit-salary-form">
                            <input type="hidden" id="salary-id" value="${salary.id}">
                            <p><strong>Employé:</strong> ${employee.firstName} ${employee.lastName}</p>
                            <p><strong>Période:</strong> ${month} ${year}</p>
                            <div class="form-group"><label for="base-salary">Salaire Base (${currencySymbol})</label><input type="number" id="base-salary" class="form-control" value="${salary.baseSalary || 0}" min="0" step="any" required></div>
                            <div class="form-group"><label for="advances-total">Total Avances Déduites (${currencySymbol})</label><input type="number" id="advances-total" class="form-control" value="${salary.advances || 0}" min="0" step="any" required></div>
                            <div class="form-group"><label for="sanctions-total">Total Sanctions Déduites (${currencySymbol})</label><input type="number" id="sanctions-total" class="form-control" value="${salary.sanctions || 0}" min="0" step="any" required></div>
                            <div class="form-group"><label for="debts-total">Total Dettes Déduites (${currencySymbol})</label><input type="number" id="debts-total" class="form-control" value="${salary.debts || 0}" min="0" step="any" required></div>
                            <div class="form-group"><label>Salaire Net Calculé:</label><h3 id="net-salary-display" class="mt-1"></h3></div>
                            <hr>
                            <div class="form-group"><label for="payment-status">Statut Paiement</label><select id="payment-status" class="form-control"><option value="0" ${!salary.isPaid ? 'selected' : ''}>En attente</option><option value="1" ${salary.isPaid ? 'selected' : ''}>Payé</option></select></div>
                            <div id="payment-details" style="${salary.isPaid ? '' : 'display: none;'}">
                                <div class="form-group"><label for="payment-date">Date Paiement</label><input type="date" id="payment-date" class="form-control" value="${salary.paidDate ? new Date(salary.paidDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}"></div>
                                <div class="form-group"><label for="payment-method">Méthode</label><select id="payment-method" class="form-control">...</select></div>
                            </div>
                            <div class="form-group"><label for="salary-notes">Notes</label><textarea id="salary-notes" class="form-control" rows="3">${salary.notes || ''}</textarea></div>
                        </form>
                    </div>
                    <div class="modal-footer"><button class="btn btn-outline modal-cancel">Annuler</button><button class="btn btn-primary" id="save-salary">Enregistrer</button></div>
                </div>`;

             // Populate payment method options
             const paymentMethodSelect = modalContainer.querySelector('#payment-method');
             if (paymentMethodSelect) {
                const methods = { cash: 'Espèces', bank_transfer: 'Virement', mobile_money: 'Mobile Money', other: 'Autre' };
                paymentMethodSelect.innerHTML = Object.entries(methods).map(([value, text]) =>
                    `<option value="${value}" ${salary.paymentMethod === value ? 'selected' : ''}>${text}</option>`
                ).join('');
             }

            modalContainer.classList.add('active');
            this.bindModalEvents(); // Bind events for the new modal (includes net salary calculation)

        } catch (error) {
            console.error("SalariesManager: Error showing salary edit modal:", error);
            alert(`Erreur: ${error.message}`);
        } finally {
            window.hideLoader();
        }
    },

    /**
     * Binds events specific to the currently open modal.
     */
    bindModalEvents: function() {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer || !modalContainer.classList.contains('active')) return;

        const closeBtn = modalContainer.querySelector('.modal-close');
        const cancelBtn = modalContainer.querySelector('.modal-cancel');

        if(closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
        if(cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());

        // Edit Salary Modal Specifics
        const saveSalaryBtn = modalContainer.querySelector('#save-salary');
        const editSalaryForm = modalContainer.querySelector('#edit-salary-form');
        const paymentStatusSelect = modalContainer.querySelector('#payment-status');
        const paymentDetailsDiv = modalContainer.querySelector('#payment-details');
        const netSalaryDisplay = modalContainer.querySelector('#net-salary-display');
        const inputsForNetCalc = ['#base-salary', '#advances-total', '#sanctions-total', '#debts-total'];

        const updateNetSalaryDisplay = () => {
            if (!editSalaryForm || !netSalaryDisplay) return;
            const base = parseFloat(editSalaryForm.querySelector('#base-salary')?.value) || 0;
            const adv = parseFloat(editSalaryForm.querySelector('#advances-total')?.value) || 0;
            const sanc = parseFloat(editSalaryForm.querySelector('#sanctions-total')?.value) || 0;
            const debt = parseFloat(editSalaryForm.querySelector('#debts-total')?.value) || 0;
            const net = base - adv - sanc - debt;
            // Attempt to get currency symbol reliably (e.g., from a global setting or another element)
            const currencySymbol = document.getElementById('total-base-salary')?.textContent.match(/([^\d,\.\s]+)$/)?.[0] || 'FCFA';
            netSalaryDisplay.textContent = `${net.toLocaleString('fr-FR')} ${currencySymbol}`;
            netSalaryDisplay.className = `net-salary-display mt-1 text-${net >= 0 ? 'success' : 'danger'}`;
        };

        if (editSalaryForm) {
            inputsForNetCalc.forEach(selector => {
                const input = editSalaryForm.querySelector(selector);
                if (input) input.addEventListener('input', updateNetSalaryDisplay);
            });
            updateNetSalaryDisplay(); // Initial calculation
        }

        if (paymentStatusSelect && paymentDetailsDiv) {
            paymentStatusSelect.addEventListener('change', () => {
                paymentDetailsDiv.style.display = paymentStatusSelect.value === '1' ? '' : 'none';
            });
        }

        if (saveSalaryBtn && editSalaryForm) {
             saveSalaryBtn.addEventListener('click', async (e) => {
                 e.preventDefault(); // Prevent default form submission if it's inside a form
                 if (editSalaryForm.checkValidity()) {
                    await this.saveSalary(); // Uses DataManager
                 } else {
                     editSalaryForm.reportValidity();
                 }
             });
         }

        // Details Salary Modal Specifics
        const markAsPaidBtn = modalContainer.querySelector('#mark-as-paid');
        if (markAsPaidBtn) {
            markAsPaidBtn.addEventListener('click', async () => {
                await this.markSalaryAsPaid(markAsPaidBtn.dataset.id); // Uses DataManager
                // Optionally refresh details view or close modal
                this.closeModal();
                await this.loadSalariesData(); // Refresh main list
            });
        }
         const printBtn = modalContainer.querySelector('.print-salary');
         if(printBtn) {
             printBtn.addEventListener('click', async () => await this.printSalarySlip(printBtn.dataset.id)); // Uses DataManager indirectly
         }
         const editBtn = modalContainer.querySelector('.edit-salary');
         if(editBtn) {
             editBtn.addEventListener('click', async () => {
                 this.closeModal();
                 await this.showSalaryEditModal(editBtn.dataset.id); // Uses DataManager indirectly
             });
         }

         // View All Salaries Modal Specifics
          const viewPeriodBtn = modalContainer.querySelector('.view-period');
          if(viewPeriodBtn) {
               // Listener added in bindEvents
               console.log("View period button found, listener should be in bindEvents");
          }
    },


    /**
     * Enregistre les modifications d'un salaire (Using DataManager)
     */
    saveSalary: async function() {
        const salaryId = document.getElementById('salary-id').value;
        const baseSalaryInput = document.getElementById('base-salary');
        const advancesInput = document.getElementById('advances-total');
        const sanctionsInput = document.getElementById('sanctions-total');
        const debtsInput = document.getElementById('debts-total');
        const isPaid = document.getElementById('payment-status').value === '1';
        const notes = document.getElementById('salary-notes').value.trim();
        const paymentDateInput = document.getElementById('payment-date');
        const paymentMethodSelect = document.getElementById('payment-method');

         // Validation
         if (!baseSalaryInput || !advancesInput || !sanctionsInput || !debtsInput) {
             alert("Erreur: Impossible de trouver les champs du formulaire.");
             return;
         }
         const baseSalary = parseFloat(baseSalaryInput.value) || 0;
         const advances = parseFloat(advancesInput.value) || 0;
         const sanctions = parseFloat(sanctionsInput.value) || 0;
         const debts = parseFloat(debtsInput.value) || 0;
         if (isNaN(baseSalary) || isNaN(advances) || isNaN(sanctions) || isNaN(debts)) {
              alert("Veuillez entrer des montants numériques valides.");
              return;
         }

        const netSalary = baseSalary - advances - sanctions - debts;

        window.showLoader("Enregistrement...");
        try {
            // Get existing salary via DataManager to preserve other fields
            const existingSalary = await DataManager.salaries.getById(salaryId); // Uses DataManager
            if (!existingSalary) throw new Error("Salaire original non trouvé.");

            const updatedSalaryData = {
                ...existingSalary, // Preserve employeeId, period, details, etc.
                baseSalary,
                advances,
                sanctions,
                debts,
                netSalary,
                isPaid,
                notes: notes || null,
                paidDate: isPaid && paymentDateInput?.value ? new Date(paymentDateInput.value).toISOString() : null,
                paymentMethod: isPaid && paymentMethodSelect ? paymentMethodSelect.value : null
            };

            // Save using DataManager
            const saved = await DataManager.salaries.save(updatedSalaryData); // Uses DataManager

            if (saved) {
                this.closeModal();
                await this.loadSalariesData(); // Uses DataManager
                alert("Salaire modifié avec succès.");
            } else {
                 alert("Erreur lors de l'enregistrement des modifications.");
            }

        } catch (error) {
            console.error("SalariesManager: Error saving salary:", error);
            alert(`Erreur: ${error.message}`);
        } finally {
            window.hideLoader();
        }
    },

    /**
     * Marque un salaire comme payé (Using DataManager)
     */
    markSalaryAsPaid: async function(salaryId) {
         window.showLoader("Mise à jour du statut...");
         try {
            // Get salary via DataManager
            const salary = await DataManager.salaries.getById(salaryId); // Uses DataManager
            if (!salary) throw new Error("Salaire non trouvé.");

            if (salary.isPaid) {
                 alert("Ce salaire est déjà marqué comme payé.");
                 window.hideLoader();
                 return;
            }

            // Prompt for payment details? Or use defaults?
            // For simplicity, let's use defaults now. Add prompts if needed.
            const paymentDate = new Date().toISOString(); // Default to now
            const paymentMethod = 'cash'; // Default to cash

            const updatedSalary = {
                ...salary,
                isPaid: true,
                paidDate: paymentDate,
                paymentMethod: paymentMethod
            };

            // Save using DataManager
            const saved = await DataManager.salaries.save(updatedSalary); // Uses DataManager

            if(saved) {
                // Refresh the list (or just update the row in the DOM for performance)
                await this.loadSalariesData(); // Uses DataManager
                alert("Salaire marqué comme payé.");
            } else {
                 alert("Erreur lors de la mise à jour du statut.");
            }
         } catch(error) {
             console.error("SalariesManager: Error marking salary as paid:", error);
             alert(`Erreur: ${error.message}`);
         } finally {
             window.hideLoader();
         }
    },

    /**
     * Génère et imprime une fiche de paie (Using DataManager)
     */
    printSalarySlip: async function(salaryId) {
         window.showLoader("Génération de la fiche de paie...");
         try {
            // Get data via DataManager
            const salary = await DataManager.salaries.getById(salaryId); // Uses DataManager
            if (!salary) throw new Error("Salaire non trouvé.");
            const employee = await DataManager.employees.getById(salary.employeeId); // Uses DataManager
            if (!employee) throw new Error("Employé non trouvé.");
            const settings = await DataManager.settings.get(); // Uses DataManager
            const currencySymbol = settings?.currency || 'FCFA';

            const paymentDate = new Date(salary.paymentDate);
            const month = this.getMonthName(paymentDate.getMonth());
            const year = paymentDate.getFullYear();

            // HTML for print window (remains the same structure)
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                 <!DOCTYPE html><html><head><title>Fiche Paie - ${employee.firstName} ${employee.lastName}</title>
                 <style>
                     body{font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height:1.6; color:#333; margin:20px;}
                     .header{text-align:center; margin-bottom:30px; padding-bottom:15px; border-bottom:2px solid #666;}
                     .company-name{font-size:24px; font-weight:600; margin-bottom:5px; color: #9c27b0;}
                     .document-title{font-size:20px; margin-bottom:5px; font-weight:bold;}
                     .period{font-size:16px; color:#555;}
                     .employee-section{margin-bottom:25px; padding-bottom:15px; border-bottom: 1px dashed #ccc;}
                     .employee-name{font-size:19px; font-weight:600; margin-bottom:8px;}
                     .employee-details{font-size:14px; line-height:1.7;}
                     .employee-details strong{display:inline-block; min-width:120px; color:#444;}
                     .salary-section{margin-bottom:25px;}
                     .salary-section h3{font-size:17px; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px; color:#9c27b0;}
                     .salary-table{width:100%; border-collapse:collapse; margin-bottom:20px;}
                     .salary-table th, .salary-table td{border:1px solid #ddd; padding:10px; font-size: 14px;}
                     .salary-table th{background-color:#f2f2f2; text-align:left; font-weight:600;}
                     .salary-table td:last-child{text-align:right;}
                     .total-row td{font-weight:bold; background-color:#f9f9f9; font-size:15px;}
                     .payment-section p {margin: 5px 0; font-size: 14px;}
                     .footer{margin-top:40px; padding-top:15px; text-align:center; font-size:12px; color:#777;}
                     .signature-section{margin-top:60px; display:flex; justify-content:space-around; padding-top: 10px;}
                     .signature-box{border-top:1px solid #555; width:220px; padding-top:8px; text-align:center; font-size:13px;}
                     @media print{@page{margin:15mm;} body{margin:0;}}
                 </style></head><body>
                 <div class="header"><div class="company-name">${settings?.companyName || 'Le Sims'}</div><div class="document-title">FICHE DE PAIE</div><div class="period">Période: ${month} ${year}</div></div>
                 <div class="employee-section"><div class="employee-name">${employee.firstName} ${employee.lastName}</div><div class="employee-details">
                     <p><strong>ID Employé:</strong> ${employee.employeeId || '-'}</p>
                     <p><strong>Poste:</strong> ${employee.position || '-'}</p>
                     <p><strong>Date Embauche:</strong> ${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('fr-FR') : '-'}</p>
                 </div></div>
                 <div class="salary-section"><h3>Détails du Salaire</h3><table class="salary-table"><thead><tr><th>Description</th><th>Montant (${currencySymbol})</th></tr></thead><tbody>
                 <tr><td>Salaire de Base</td><td>${(salary.baseSalary||0).toLocaleString('fr-FR')}</td></tr>
                 ${salary.advances > 0 ? `<tr><td>Avances Déduites</td><td>- ${(salary.advances||0).toLocaleString('fr-FR')}</td></tr>` : ''}
                 ${salary.sanctions > 0 ? `<tr><td>Sanctions Déduites</td><td>- ${(salary.sanctions||0).toLocaleString('fr-FR')}</td></tr>` : ''}
                 ${salary.debts > 0 ? `<tr><td>Dettes Clients Déduites</td><td>- ${(salary.debts||0).toLocaleString('fr-FR')}</td></tr>` : ''}
                 <tr class="total-row"><td>Salaire Net</td><td>${(salary.netSalary||0).toLocaleString('fr-FR')}</td></tr>
                 </tbody></table></div>
                 <div class="payment-section"><h3>Informations Paiement</h3><p><strong>Statut:</strong> ${salary.isPaid ? 'Payé' : 'En attente'}</p>${salary.isPaid ? `<p><strong>Date Paiement:</strong> ${salary.paidDate ? new Date(salary.paidDate).toLocaleDateString('fr-FR') : '-'}</p><p><strong>Méthode:</strong> ${this.getPaymentMethodName(salary.paymentMethod)}</p>` : ''}</div>
                 <div class="signature-section"><div class="signature-box">Signature Employeur</div><div class="signature-box">Signature Employé</div></div>
                 <div class="footer"><p>Généré le ${new Date().toLocaleString('fr-FR')}</p><p>${settings?.companyName || 'Le Sims'}</p></div>
                 <script>window.onload=function(){setTimeout(function(){window.print(); window.close();}, 100);} </script></body></html>
             `);
             printWindow.document.close();

         } catch (error) {
             console.error("SalariesManager: Error printing salary slip:", error);
             alert(`Erreur impression: ${error.message}`);
         } finally {
             window.hideLoader();
         }
    },

    /**
     * Ferme le modal actif (Synchronous)
     */
    closeModal: function() {
         const modalContainer = document.getElementById('modal-container');
         if (modalContainer) {
             modalContainer.classList.remove('active');
             modalContainer.innerHTML = ''; // Clear content
         }
    },

    /**
     * Obtient le nom du mois à partir de son index (Synchronous)
     */
    getMonthName: function(monthIndex) {
         const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
         return months[monthIndex] || '';
    },

    /**
     * Obtient le nom de la méthode de paiement (Synchronous)
     */
    getPaymentMethodName: function(method) {
          switch (method) {
             case 'cash': return 'Espèces';
             case 'bank_transfer': return 'Virement';
             case 'mobile_money': return 'Mobile Money';
             case 'other': return 'Autre';
             default: return 'Non spécifié';
         }
    },

    /**
     * Gets the name of a sanction type (Synchronous)
     */
     getSanctionTypeName: function(type) {
        switch (type) {
            case 'late': return 'Retard';
            case 'absence': return 'Absence';
            case 'misconduct': return 'Faute';
            case 'other': return 'Autre';
            default: return type || 'Inconnu';
        }
    },

    /**
     * Exporte les salaires du mois sélectionné (Using DataManager)
     */
    exportSalaries: async function() {
        const monthSelect = document.getElementById('salary-month');
        const yearSelect = document.getElementById('salary-year');
        if (!monthSelect || !yearSelect) return;

        const month = parseInt(monthSelect.value);
        const year = parseInt(yearSelect.value);
        const monthName = this.getMonthName(month);

        window.showLoader("Exportation des salaires...");
        try {
            // Get salaries via DataManager
            const salaries = await DataManager.salaries.getByMonth(year, month); // Uses DataManager

            if (!Array.isArray(salaries) || salaries.length === 0) {
                alert('Aucun salaire à exporter pour la période sélectionnée.');
                window.hideLoader();
                return;
            }

            // Fetch employee data via DataManager
            const allEmployees = await DataManager.employees.getAll(); // Uses DataManager
            const employeesMap = {};
            if(Array.isArray(allEmployees)) {
                allEmployees.forEach(emp => { employeesMap[emp.id] = emp; });
            }

            // Prepare data for CSV
            const salariesWithEmployeeInfo = salaries.map(salary => {
                const employee = employeesMap[salary.employeeId];
                return {
                    employeeId: employee?.employeeId || '',
                    firstName: employee?.firstName || '',
                    lastName: employee?.lastName || '',
                    position: employee?.position || '',
                    baseSalary: salary.baseSalary || 0,
                    advances: salary.advances || 0,
                    sanctions: salary.sanctions || 0,
                    debts: salary.debts || 0,
                    netSalary: salary.netSalary || 0,
                    isPaid: salary.isPaid ? 'Oui' : 'Non',
                    paidDate: salary.paidDate ? new Date(salary.paidDate).toLocaleDateString('fr-FR') : '',
                    paymentMethod: salary.paymentMethod ? this.getPaymentMethodName(salary.paymentMethod) : '',
                    notes: salary.notes || '' // Include notes
                };
            });

            // Convert to CSV
            const headers = ["ID Employé", "Prénom", "Nom", "Poste", "Salaire Base", "Avances", "Sanctions", "Dettes", "Salaire Net", "Payé", "Date Paiement", "Méthode Paiement", "Notes"];
            let csv = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n'; // Header row

            salariesWithEmployeeInfo.forEach(s => {
                const row = [
                    s.employeeId, s.firstName, s.lastName, s.position,
                    s.baseSalary, s.advances, s.sanctions, s.debts, s.netSalary,
                    s.isPaid, s.paidDate, s.paymentMethod, s.notes
                ];
                csv += row.map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(',') + '\n';
            });

            // Download CSV
            const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `salaires_${monthName}_${year}.csv`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);

        } catch (error) {
             console.error("SalariesManager: Error exporting salaries:", error);
             alert(`Erreur lors de l'exportation: ${error.message}`);
        } finally {
             window.hideLoader();
        }
    },

    /**
     * Affiche tous les salaires de tous les mois (Using DataManager)
     */
    viewAllSalaries: async function() {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;

        window.showLoader("Chargement de l'historique...");
        try {
            // Get all salaries via DataManager
            const allSalaries = await DataManager.salaries.getAll(); // Uses DataManager

            if (!Array.isArray(allSalaries) || allSalaries.length === 0) {
                alert('Aucun salaire enregistré.');
                window.hideLoader();
                return;
            }

            // Get settings via DataManager
            const settings = await DataManager.settings.get(); // Uses DataManager
            const currencySymbol = settings?.currency || 'FCFA';

            // Sort and group salaries
            allSalaries.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
            const groupedSalaries = {};
            allSalaries.forEach(salary => {
                try {
                    const date = new Date(salary.paymentDate);
                     if(isNaN(date)) throw new Error(`Invalid paymentDate: ${salary.paymentDate}`); // Check for invalid dates
                    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // Key format YYYY-MM
                    if (!groupedSalaries[key]) {
                        groupedSalaries[key] = { month: date.getMonth(), year: date.getFullYear(), salaries: [] };
                    }
                    groupedSalaries[key].salaries.push(salary);
                } catch (e) {
                     console.warn(`SalariesManager: Skipping salary due to invalid date:`, salary, e);
                }
            });

            // Sort groups by year then month (descending)
            const sortedGroups = Object.values(groupedSalaries).sort((a, b) => {
                 if (b.year !== a.year) return b.year - a.year;
                 return b.month - a.month;
            });

            // Generate HTML for periods
            let periodsHTML = '';
            sortedGroups.forEach(group => {
                const monthName = this.getMonthName(group.month);
                const totalNetSalary = group.salaries.reduce((sum, s) => sum + (s.netSalary || 0), 0);
                const totalPaidCount = group.salaries.filter(s => s.isPaid).length;
                periodsHTML += `
                    <tr class="period-row" data-month="${group.month}" data-year="${group.year}">
                        <td><div class="period-name"><i class="fas fa-calendar-alt"></i><span>${monthName} ${group.year}</span></div></td>
                        <td>${group.salaries.length}</td>
                        <td>${totalPaidCount} / ${group.salaries.length}</td>
                        <td>${totalNetSalary.toLocaleString('fr-FR')} ${currencySymbol}</td>
                        <td><button class="btn btn-outline btn-sm view-period" data-month="${group.month}" data-year="${group.year}"><i class="fas fa-eye"></i> Voir Mois</button></td>
                    </tr>`;
            });

            // Render modal HTML
            modalContainer.innerHTML = `
                <div class="modal modal-large">
                    <div class="modal-header"><h3>Historique des Salaires</h3><button class="modal-close"><i class="fas fa-times"></i></button></div>
                    <div class="modal-body">
                        <p>Cliquez sur "Voir Mois" pour charger les détails d'une période spécifique.</p>
                        <div class="table-responsive mt-3">
                            <table class="table table-hover">
                                <thead><tr><th>Période</th><th>Employés Traités</th><th>Payés</th><th>Total Net Période</th><th>Actions</th></tr></thead>
                                <tbody>${periodsHTML}</tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer"><button class="btn btn-outline modal-cancel">Fermer</button></div>
                </div>`;

            modalContainer.classList.add('active');
            // Modal events (close, cancel) are bound in bindModalEvents
            // The 'view-period' button click is handled in bindEvents

        } catch (error) {
             console.error("SalariesManager: Error viewing all salaries:", error);
             alert(`Erreur: ${error.message}`);
        } finally {
             window.hideLoader();
        }
    },

    /**
     * Attache les événements (using DataManager)
     */
    bindEvents: function() {
        const pageContainer = document.getElementById('salaries-page');
        const modalContainer = document.getElementById('modal-container');

        // --- Page Level Events ---
        if (pageContainer) {
             pageContainer.addEventListener('click', async (event) => {
                const targetId = event.target.id || event.target.closest('button')?.id;
                switch (targetId) {
                     case 'process-payroll-btn':
                         await this.processSalaries(); // Uses DataManager
                         break;
                     case 'export-salaries':
                         await this.exportSalaries(); // Uses DataManager
                         break;
                     case 'view-all-salaries':
                         await this.viewAllSalaries(); // Uses DataManager
                         break;
                }
             });

             pageContainer.addEventListener('change', async (event) => {
                const targetId = event.target.id;
                if (targetId === 'salary-month' || targetId === 'salary-year') {
                    this.updateCurrentMonthDisplay();
                    const searchInput = pageContainer.querySelector('#salary-search');
                    await this.loadSalariesData(searchInput?.value || ''); // Uses DataManager
                }
             });

             pageContainer.addEventListener('input', async (event) => {
                 const targetId = event.target.id;
                 if (targetId === 'salary-search') {
                    // Add debounce here if needed for performance
                    await this.loadSalariesData(event.target.value); // Uses DataManager
                 }
             });

             // --- Table Actions Delegation ---
             const tableBody = pageContainer.querySelector('#salaries-list');
             if (tableBody) {
                 tableBody.addEventListener('click', async (event) => {
                     const viewBtn = event.target.closest('.view-salary');
                     if (viewBtn) { await this.showSalaryDetails(viewBtn.dataset.id); return; }

                     const editBtn = event.target.closest('.edit-salary');
                     if (editBtn) { await this.showSalaryEditModal(editBtn.dataset.id); return; }

                     const printBtn = event.target.closest('.print-salary');
                     if (printBtn) { await this.printSalarySlip(printBtn.dataset.id); return; }
                 });
             }
        }

         // --- Modal Level Events ---
         // General modal events (close, cancel) and specific actions inside modals
         // are handled by bindModalEvents, which is called after a modal is shown.
         // Add specific listener for 'View All Salaries' modal button here:
         if(modalContainer) {
             modalContainer.addEventListener('click', async (event) => {
                 // Handle 'View Period' button click from the history modal
                 const viewPeriodBtn = event.target.closest('.view-period');
                 if (viewPeriodBtn) {
                     const month = parseInt(viewPeriodBtn.dataset.month);
                     const year = parseInt(viewPeriodBtn.dataset.year);
                     const monthSelect = document.getElementById('salary-month');
                     const yearSelect = document.getElementById('salary-year');
                     // Check if selectors exist (they should on the salaries page)
                     if (monthSelect) monthSelect.value = month;
                     if (yearSelect) yearSelect.value = year;
                     this.closeModal(); // Close the history modal
                     this.updateCurrentMonthDisplay(); // Update header display
                     await this.loadSalariesData(); // Load data for selected period
                 }
             });
         }
    }
};

// Expose to global scope
window.SalariesManager = SalariesManager;