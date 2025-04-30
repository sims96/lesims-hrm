    /**
     * salaries.js
     * Gestion des salaires
     * Application de Gestion des Salaires Le Sims
     * (Updated for Supabase)
     */

    const SalariesManager = {
        /**
         * Initialisation du module de gestion des salaires
         */
        init: async function() { // Added async
            // Render static structure first
            this.renderSalariesPageStructure();
            try {
                // Load initial data for the default month/year
                await this.loadSalariesData(); // Added await
                this.updateCurrentMonthDisplay(); // Update display after initial load
            } catch (error) {
                console.error("Error during SalariesManager initialization:", error);
                // Display error on the page
                 const salariesPage = document.getElementById('salaries-page');
                 if(salariesPage) {
                    const listContainer = salariesPage.querySelector('#salaries-list');
                    const noDataMessage = salariesPage.querySelector('#no-salaries-message');
                    if(listContainer) listContainer.innerHTML = '';
                    if(noDataMessage) {
                        noDataMessage.textContent = "Erreur lors du chargement initial des salaires.";
                        noDataMessage.style.display = 'block';
                    }
                 }
            }
            this.bindEvents(); // Setup event listeners
            console.log("SalariesManager initialized successfully.");
        },

        /**
         * Renders the static HTML structure for the salaries page.
         */
        renderSalariesPageStructure: async function() { // Added async
            const salariesPage = document.getElementById('salaries-page');
            if (!salariesPage) return;

             try {
                const settings = await DB.settings.get(); // Added await
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
                                    <div class="summary-item"><h4>Employés</h4><h2 id="total-employees-summary">0</h2></div>
                                    <div class="summary-item"><h4>Salaires de Base</h4><h2 id="total-base-salary">0 ${currencySymbol}</h2></div>
                                    <div class="summary-item"><h4>Avances</h4><h2 id="total-advances-summary">0 ${currencySymbol}</h2></div>
                                    <div class="summary-item"><h4>Sanctions</h4><h2 id="total-sanctions">0 ${currencySymbol}</h2></div>
                                    <div class="summary-item"><h4>Dettes Clients</h4><h2 id="total-debts-summary">0 ${currencySymbol}</h2></div>
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
                                <tr><td colspan="8"><div class="loading-spinner-inline"></div> Chargement...</td></tr>
                            </tbody>
                        </table>
                        <div id="no-salaries-message" class="empty-message" style="display: none;">
                            Aucun salaire trouvé pour la période sélectionnée. Utilisez le bouton "Traiter les Salaires du Mois" pour commencer.
                        </div>
                    </div>
                `;
             } catch (error) {
                 console.error("Error rendering salaries page structure:", error);
                 salariesPage.innerHTML = `<p class="error-message">Erreur lors de la construction de la page des salaires.</p>`;
             }
        },

        /**
         * Génère les options pour la sélection du mois
         */
        generateMonthOptions: function() {
            // ... (no changes needed here, synchronous) ...
            const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
            const currentMonth = new Date().getMonth();
            return months.map((month, index) => `<option value="${index}" ${index === currentMonth ? 'selected' : ''}>${month}</option>`).join('');
        },

        /**
         * Génère les options pour la sélection de l'année
         */
        generateYearOptions: function() {
            // ... (no changes needed here, synchronous) ...
            const currentYear = new Date().getFullYear();
            let options = '';
            for (let year = currentYear - 3; year <= currentYear + 2; year++) {
                options += `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`;
            }
            return options;
        },

        /**
         * Met à jour l'affichage du mois courant
         */
        updateCurrentMonthDisplay: function() {
            // ... (no changes needed here, synchronous) ...
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
         * Charge les données des salaires
         */
        loadSalariesData: async function(searchQuery = '') { // Added async
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

                // Récupérer les salaires du mois sélectionné (using await)
                let salaries = await DB.salaries.getByMonth(year, month);

                // ----> ADDED CHECK <----
                if (!Array.isArray(salaries)) {
                    console.error("Failed to load salaries or data is not an array:", salaries);
                    throw new Error("Les données des salaires n'ont pas pu être chargées.");
                }
                // ----> END CHECK <----

                // Fetch all employees needed for filtering and display (more efficient)
                const employeeIds = [...new Set(salaries.map(s => s.employeeId))];
                let employeesMap = {};
                if (employeeIds.length > 0) {
                     const employees = await DB.employees.getAll(); // Fetch all once if efficient, or fetch by IDs
                     if(Array.isArray(employees)) {
                        employeesMap = employees.reduce((map, emp) => {
                            map[emp.id] = emp;
                            return map;
                        }, {});
                     } else {
                        console.error("Failed to load employee data for salaries display.");
                     }
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

                // Get settings for currency
                const settings = await DB.settings.get(); // Added await
                const currencySymbol = settings?.currency || 'FCFA';

                // Afficher le message si aucun salaire après filtre
                if (salaries.length === 0) {
                    salariesList.innerHTML = '';
                    noSalariesMessage.textContent = 'Aucun salaire trouvé pour la période et les filtres sélectionnés.';
                    noSalariesMessage.style.display = 'block';
                    await this.updateSalaryStats([], month, year); // Update stats with empty array
                    return;
                }

                // Construction du tableau
                salariesList.innerHTML = salaries.map(salary => {
                    const employee = employeesMap[salary.employeeId];
                    if (!employee) return ''; // Should not happen if map is built correctly

                    return `
                        <tr data-id="${salary.id}">
                            <td>
                                <div class="employee-name">
                                    <div class="avatar"><span>${employee.firstName?.charAt(0) || ''}${employee.lastName?.charAt(0) || ''}</span></div>
                                    <div><div class="employee-fullname">${employee.firstName || ''} ${employee.lastName || ''}</div><div class="employee-position">${employee.position || ''}</div></div>
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
                                    <button class="action-btn print-salary" title="Imprimer" data-id="${salary.id}"><i class="fas fa-print"></i></button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');

                // Mettre à jour les statistiques
                await this.updateSalaryStats(salaries, month, year); // Added await

            } catch (error) {
                console.error("Error loading salaries data:", error);
                salariesList.innerHTML = ''; // Clear loading state
                noSalariesMessage.textContent = `Erreur: ${error.message}`;
                noSalariesMessage.style.display = 'block';
                 await this.updateSalaryStats([], 0, 0); // Reset stats on error
            }
        },

        /**
         * Met à jour les statistiques des salaires
         */
        updateSalaryStats: async function(salaries = [], month, year) { // Added async, default salaries to []
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
                 console.warn("Salary stats elements not found.");
                 return;
            }

             // Ensure salaries is an array
             if (!Array.isArray(salaries)) {
                 console.warn("Invalid data passed to updateSalaryStats, expected array.");
                 salaries = [];
             }

            try {
                const settings = await DB.settings.get(); // Added await
                const currencySymbol = settings?.currency || 'FCFA';

                // Calculer les totaux
                const stats = salaries.reduce((totals, salary) => {
                    totals.baseSalary += salary.baseSalary || 0;
                    totals.advances += salary.advances || 0;
                    totals.sanctions += salary.sanctions || 0;
                    totals.debts += salary.debts || 0;
                    totals.netSalary += salary.netSalary || 0;
                    return totals;
                }, { baseSalary: 0, advances: 0, sanctions: 0, debts: 0, netSalary: 0 });

                // Mettre à jour l'affichage
                totalEmployeesSummary.textContent = salaries.length;
                totalBaseSalary.textContent = `${stats.baseSalary.toLocaleString('fr-FR')} ${currencySymbol}`;
                totalAdvancesSummary.textContent = `${stats.advances.toLocaleString('fr-FR')} ${currencySymbol}`;
                totalSanctions.textContent = `${stats.sanctions.toLocaleString('fr-FR')} ${currencySymbol}`;
                totalDebtsSummary.textContent = `${stats.debts.toLocaleString('fr-FR')} ${currencySymbol}`;
                totalNetSalary.textContent = `${stats.netSalary.toLocaleString('fr-FR')} ${currencySymbol}`;

                // Mettre à jour la barre de progression (fetch total employees for the denominator)
                 let allEmployeesCount = 0;
                 const allEmployees = await DB.employees.getAll();
                 if(Array.isArray(allEmployees)) {
                    allEmployeesCount = allEmployees.length;
                 } else {
                    console.warn("Could not get total employee count for progress bar.");
                 }

                processedCountEl.textContent = salaries.length;
                totalCountEl.textContent = allEmployeesCount;
                const percentage = allEmployeesCount > 0 ? (salaries.length / allEmployeesCount) * 100 : 0;
                progressBar.style.width = `${percentage}%`;

            } catch (error) {
                 console.error("Error updating salary stats:", error);
                 // Optionally reset stats to error state
                 totalEmployeesSummary.textContent = 'Erreur';
                 totalBaseSalary.textContent = 'Erreur';
                 // ... reset others ...
                 processedCountEl.textContent = '0';
                 totalCountEl.textContent = '0';
                 progressBar.style.width = '0%';
            }
        },

        /**
         * Traite les salaires pour le mois sélectionné
         */
        processSalaries: async function() { // Added async
            const monthSelect = document.getElementById('salary-month');
            const yearSelect = document.getElementById('salary-year');
            if (!monthSelect || !yearSelect) return;

            const month = parseInt(monthSelect.value);
            const year = parseInt(yearSelect.value);

            const selectedDate = new Date(year, month, 1);
            const currentDate = new Date();
            currentDate.setHours(0,0,0,0); // Compare dates only

            if (selectedDate > currentDate) {
                alert('Vous ne pouvez pas traiter les salaires pour une date future.');
                return;
            }

            window.showLoader(`Traitement des salaires pour ${this.getMonthName(month)} ${year}...`);
            this.updateProgress(0, 0); // Reset progress bar initially

            try {
                const employees = await DB.employees.getAll();
                if (!Array.isArray(employees) || employees.length === 0) {
                    alert('Aucun employé trouvé. Ajoutez des employés avant de traiter les salaires.');
                    window.hideLoader();
                    return;
                }

                const existingSalaries = await DB.salaries.getByMonth(year, month);
                if (Array.isArray(existingSalaries) && existingSalaries.length > 0) {
                    if (!confirm(`Des salaires existent déjà pour ${this.getMonthName(month)} ${year}. Voulez-vous recalculer tous les salaires? Ceci supprimera les enregistrements existants pour ce mois.`)) {
                        window.hideLoader();
                        return;
                    }
                    // Delete existing salaries for the month
                    window.showLoader(`Suppression des salaires existants pour ${this.getMonthName(month)} ${year}...`);
                    const deletePromises = existingSalaries.map(salary => DB.salaries.delete(salary.id));
                    await Promise.all(deletePromises);
                    console.log(`Deleted ${existingSalaries.length} existing salaries for ${month + 1}/${year}`);
                }

                const startDate = new Date(year, month, 1);
                const endDate = new Date(year, month + 1, 0); // Last day of the month
                endDate.setHours(23, 59, 59, 999); // Ensure end of day

                let processedCount = 0;
                const totalEmployees = employees.length;
                this.updateProgress(0, totalEmployees); // Update total count

                window.showLoader(`Calcul des salaires (0/${totalEmployees})...`);

                // Process salaries sequentially or in batches if performance is an issue
                const calculatedSalaries = [];
                for (const employee of employees) {
                    const salaryData = await this.calculateSalary(employee, startDate, endDate); // Added await
                    calculatedSalaries.push(salaryData);
                    processedCount++;
                    this.updateProgress(processedCount, totalEmployees);
                    window.showLoader(`Calcul des salaires (${processedCount}/${totalEmployees})...`); // Update loader message
                }

                // Save all calculated salaries (consider batching for large numbers)
                window.showLoader(`Enregistrement des salaires (0/${calculatedSalaries.length})...`);
                let savedCount = 0;
                const savePromises = calculatedSalaries.map(async (salary) => {
                    await DB.salaries.save(salary);
                    savedCount++;
                    window.showLoader(`Enregistrement des salaires (${savedCount}/${calculatedSalaries.length})...`);
                });
                await Promise.all(savePromises);


                await this.loadSalariesData(); // Reload data (await)
                alert(`Salaires traités avec succès pour ${this.getMonthName(month)} ${year}.`);

            } catch (error) {
                console.error("Error processing salaries:", error);
                alert(`Erreur lors du traitement des salaires: ${error.message}`);
            } finally {
                window.hideLoader();
            }
        },

        /**
         * Calcule le salaire d'un employé pour une période donnée
         */
        calculateSalary: async function(employee, startDate, endDate) { // Added async
            try {
                // Fetch related data concurrently
                const [advances, sanctions, debts] = await Promise.all([
                    DB.advances.getUnpaidByEmployeeId(employee.id),
                    DB.sanctions.getByEmployeeId(employee.id),
                    DB.debts.getUnpaidByEmployeeId(employee.id)
                ]);

                 // Validate fetched data
                if (!Array.isArray(advances)) { console.warn(`Failed to load advances for ${employee.id}`); advances = []; }
                if (!Array.isArray(sanctions)) { console.warn(`Failed to load sanctions for ${employee.id}`); sanctions = []; }
                if (!Array.isArray(debts)) { console.warn(`Failed to load debts for ${employee.id}`); debts = []; }


                // Filter sanctions for the specific period
                const periodSanctions = sanctions.filter(sanction => {
                    const sanctionDate = new Date(sanction.date);
                    return sanctionDate >= startDate && sanctionDate <= endDate;
                });

                // Calculate totals
                const totalAdvances = advances.reduce((total, advance) => total + (advance.amount || 0), 0);
                const totalSanctions = periodSanctions.reduce((total, sanction) => total + (sanction.amount || 0), 0);
                const totalDebts = debts.reduce((total, debt) => total + (debt.amount || 0), 0);

                const baseSalary = employee.baseSalary || 0;
                const netSalary = baseSalary - totalAdvances - totalSanctions - totalDebts;

                // Prepare salary object for saving
                return {
                    employeeId: employee.id,
                    paymentDate: endDate.toISOString(), // Use end of period as payment date default
                    period: { // Store period directly
                        startDate: startDate.toISOString(),
                        endDate: endDate.toISOString()
                    },
                    baseSalary,
                    advances: totalAdvances,
                    sanctions: totalSanctions,
                    debts: totalDebts,
                    netSalary,
                    isPaid: false,
                    details: { // Store related IDs
                        advanceIds: advances.map(a => a.id),
                        sanctionIds: periodSanctions.map(s => s.id),
                        debtIds: debts.map(d => d.id)
                    }
                };
            } catch (error) {
                console.error(`Error calculating salary for employee ${employee.id}:`, error);
                // Return a default/error state salary object?
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
         * Met à jour la barre de progression
         */
        updateProgress: function(processed, total) {
            // ... (no changes needed here, synchronous DOM update) ...
             const processedCountEl = document.getElementById('processed-count');
             const totalCountEl = document.getElementById('total-count');
             const progressBar = document.getElementById('salary-progress');
             if (!processedCountEl || !totalCountEl || !progressBar) return;

             processedCountEl.textContent = processed;
             totalCountEl.textContent = total;
             const percentage = total > 0 ? Math.min((processed / total) * 100, 100) : 0; // Ensure max 100%
             progressBar.style.width = `${percentage}%`;
        },

        /**
         * Affiche le modal de détails d'un salaire
         */
        showSalaryDetails: async function(salaryId) { // Added async
            const modalContainer = document.getElementById('modal-container');
            if (!modalContainer) return;

            window.showLoader("Chargement des détails...");
            try {
                const salary = await DB.salaries.getById(salaryId); // Added await
                if (!salary) throw new Error("Salaire non trouvé.");

                const employee = await DB.employees.getById(salary.employeeId); // Added await
                if (!employee) throw new Error("Employé associé non trouvé.");

                const settings = await DB.settings.get(); // Added await
                const currencySymbol = settings?.currency || 'FCFA';

                const paymentDate = new Date(salary.paymentDate);
                const month = this.getMonthName(paymentDate.getMonth());
                const year = paymentDate.getFullYear();

                // Fetch details for advances, sanctions, debts based on IDs stored in salary.details
                const advanceDetails = salary.details?.advanceIds?.length > 0
                    ? await Promise.all(salary.details.advanceIds.map(id => DB.advances.getById(id)))
                    : [];
                const sanctionDetails = salary.details?.sanctionIds?.length > 0
                    ? await Promise.all(salary.details.sanctionIds.map(id => DB.sanctions.getById(id)))
                    : [];
                 const debtDetails = salary.details?.debtIds?.length > 0
                    ? await Promise.all(salary.details.debtIds.map(id => DB.debts.getById(id)))
                    : [];


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
                                    ${this.renderSalaryDetailSection("Avances Déduites", advanceDetails.filter(Boolean), "advance", currencySymbol)}
                                    ${this.renderSalaryDetailSection("Sanctions Déduites", sanctionDetails.filter(Boolean), "sanction", currencySymbol)}
                                    ${this.renderSalaryDetailSection("Dettes Clients Déduites", debtDetails.filter(Boolean), "debt", currencySymbol)}
                                </div>
                                <div class="salary-status card mt-3">
                                    <div class="card-body">
                                        <div class="status-info">
                                            <div><h4>Statut:</h4><span class="badge ${salary.isPaid ? 'badge-success' : 'badge-warning'}">${salary.isPaid ? 'Payé' : 'En attente'}</span></div>
                                            ${salary.isPaid ? `
                                            <div><h4>Date Paiement:</h4><p>${salary.paidDate ? new Date(salary.paidDate).toLocaleDateString() : '-'}</p></div>
                                            <div><h4>Méthode:</h4><p>${this.getPaymentMethodName(salary.paymentMethod)}</p></div>` : ''}
                                        </div>
                                        ${!salary.isPaid ? `<div class="mt-3"><button id="mark-as-paid" class="btn btn-primary" data-id="${salary.id}"><i class="fas fa-check"></i> Marquer Payé</button></div>` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-outline modal-cancel">Fermer</button>
                            <button class="btn btn-outline print-salary" data-id="${salary.id}"><i class="fas fa-print"></i> Imprimer</button>
                            <button class="btn btn-primary edit-salary" data-id="${salary.id}"><i class="fas fa-edit"></i> Modifier</button>
                        </div>
                    </div>`;

                modalContainer.classList.add('active');
                this.bindModalEvents(); // Bind events for the new modal

            } catch (error) {
                console.error("Error showing salary details:", error);
                alert(`Erreur lors de l'affichage des détails: ${error.message}`);
            } finally {
                window.hideLoader();
            }
        },

        /**
         * Génère une section de détails du salaire (modified to accept data directly)
         */
        renderSalaryDetailSection: function(title, items, type, currencySymbol) { // Accept items array
            if (!Array.isArray(items) || items.length === 0) {
                return `<div class="detail-section"><h4>${title}</h4><p class="empty-message">Aucun.</p></div>`;
            }

            let itemsHTML = '';
            let tableHeaders = '';

            switch (type) {
                case 'advance':
                    tableHeaders = `<th>Date</th><th>Raison</th><th>Montant</th>`;
                    itemsHTML = items.map(advance => `
                        <tr><td>${new Date(advance.date).toLocaleDateString()}</td><td>${advance.reason || '-'}</td><td>${(advance.amount||0).toLocaleString()} ${currencySymbol}</td></tr>`).join('');
                    break;
                case 'sanction':
                    tableHeaders = `<th>Date</th><th>Type</th><th>Raison</th><th>Montant</th>`;
                    itemsHTML = items.map(sanction => `
                        <tr><td>${new Date(sanction.date).toLocaleDateString()}</td><td>${this.getSanctionTypeName(sanction.type)}</td><td>${sanction.reason || '-'}</td><td>${(sanction.amount||0).toLocaleString()} ${currencySymbol}</td></tr>`).join('');
                    break;
                case 'debt':
                    tableHeaders = `<th>Date</th><th>Client</th><th>Description</th><th>Montant</th>`;
                    itemsHTML = items.map(debt => `
                        <tr><td>${new Date(debt.date).toLocaleDateString()}</td><td>${debt.clientName || '-'}</td><td>${debt.description || '-'}</td><td>${(debt.amount||0).toLocaleString()} ${currencySymbol}</td></tr>`).join('');
                    break;
                 default: return '';
            }

            return `
                <div class="detail-section">
                    <h4>${title} (${items.length})</h4>
                    <div class="table-responsive"><table class="table table-sm"><thead><tr>${tableHeaders}</tr></thead><tbody>${itemsHTML}</tbody></table></div>
                </div>`;
        },

        /**
         * Affiche le modal d'édition d'un salaire
         */
        showSalaryEditModal: async function(salaryId) { // Added async
            const modalContainer = document.getElementById('modal-container');
            if (!modalContainer) return;

            window.showLoader("Chargement du formulaire...");
            try {
                const salary = await DB.salaries.getById(salaryId); // Added await
                if (!salary) throw new Error("Salaire non trouvé.");

                const employee = await DB.employees.getById(salary.employeeId); // Added await
                if (!employee) throw new Error("Employé associé non trouvé.");

                const settings = await DB.settings.get(); // Added await
                const currencySymbol = settings?.currency || 'FCFA';

                const paymentDate = new Date(salary.paymentDate);
                const month = this.getMonthName(paymentDate.getMonth());
                const year = paymentDate.getFullYear();

                modalContainer.innerHTML = `
                    <div class="modal">
                        <div class="modal-header"><h3>Modifier Salaire - ${employee.firstName} ${employee.lastName}</h3><button class="modal-close"><i class="fas fa-times"></i></button></div>
                        <div class="modal-body">
                            <form id="edit-salary-form">
                                <input type="hidden" id="salary-id" value="${salary.id}">
                                <p><strong>Employé:</strong> ${employee.firstName} ${employee.lastName}</p>
                                <p><strong>Période:</strong> ${month} ${year}</p>
                                <div class="form-group"><label for="base-salary">Salaire Base (${currencySymbol})</label><input type="number" id="base-salary" class="form-control" value="${salary.baseSalary || 0}" min="0" step="any"></div>
                                <div class="form-group"><label for="advances-total">Total Avances Déduites (${currencySymbol})</label><input type="number" id="advances-total" class="form-control" value="${salary.advances || 0}" min="0" step="any"></div>
                                <div class="form-group"><label for="sanctions-total">Total Sanctions Déduites (${currencySymbol})</label><input type="number" id="sanctions-total" class="form-control" value="${salary.sanctions || 0}" min="0" step="any"></div>
                                <div class="form-group"><label for="debts-total">Total Dettes Déduites (${currencySymbol})</label><input type="number" id="debts-total" class="form-control" value="${salary.debts || 0}" min="0" step="any"></div>
                                <div class="form-group"><label>Salaire Net Calculé:</label><h3 id="net-salary-display"></h3></div>
                                <hr>
                                <div class="form-group"><label for="payment-status">Statut Paiement</label><select id="payment-status" class="form-control"><option value="0" ${!salary.isPaid ? 'selected' : ''}>En attente</option><option value="1" ${salary.isPaid ? 'selected' : ''}>Payé</option></select></div>
                                <div id="payment-details" style="${salary.isPaid ? '' : 'display: none;'}">
                                    <div class="form-group"><label for="payment-date">Date Paiement</label><input type="date" id="payment-date" class="form-control" value="${salary.paidDate ? new Date(salary.paidDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}"></div>
                                    <div class="form-group"><label for="payment-method">Méthode</label><select id="payment-method" class="form-control">...</select></div> {/* Populate options */}
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
                this.bindModalEvents(); // Bind events for the new modal

            } catch (error) {
                console.error("Error showing salary edit modal:", error);
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
                const currency = document.getElementById('total-base-salary')?.textContent.split(' ')[1] || 'FCFA'; // Get currency symbol
                netSalaryDisplay.textContent = `${net.toLocaleString('fr-FR')} ${currency}`;
                netSalaryDisplay.className = `net-salary-display text-${net >= 0 ? 'success' : 'danger'}`;
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

            if (saveSalaryBtn) {
                saveSalaryBtn.addEventListener('click', async () => { // Added async
                    await this.saveSalary(); // Added await
                });
            }

            // Details Salary Modal Specifics
            const markAsPaidBtn = modalContainer.querySelector('#mark-as-paid');
            if (markAsPaidBtn) {
                markAsPaidBtn.addEventListener('click', async () => { // Added async
                    await this.markSalaryAsPaid(markAsPaidBtn.dataset.id); // Added await
                    this.closeModal(); // Close after marking paid
                });
            }
             const printBtn = modalContainer.querySelector('.print-salary');
             if(printBtn) {
                 printBtn.addEventListener('click', async () => await this.printSalarySlip(printBtn.dataset.id)); // Added async/await
             }
             const editBtn = modalContainer.querySelector('.edit-salary');
             if(editBtn) {
                 editBtn.addEventListener('click', async () => { // Added async
                     this.closeModal();
                     await this.showSalaryEditModal(editBtn.dataset.id); // Added await
                 });
             }
        },


        /**
         * Enregistre les modifications d'un salaire
         */
        saveSalary: async function() { // Added async
            const salaryId = document.getElementById('salary-id').value;
            const baseSalary = parseFloat(document.getElementById('base-salary').value) || 0;
            const advances = parseFloat(document.getElementById('advances-total').value) || 0;
            const sanctions = parseFloat(document.getElementById('sanctions-total').value) || 0;
            const debts = parseFloat(document.getElementById('debts-total').value) || 0;
            const isPaid = document.getElementById('payment-status').value === '1';
            const notes = document.getElementById('salary-notes').value.trim();
            const paymentDateInput = document.getElementById('payment-date');
            const paymentMethodSelect = document.getElementById('payment-method');

            const netSalary = baseSalary - advances - sanctions - debts;

            window.showLoader("Enregistrement...");
            try {
                const existingSalary = await DB.salaries.getById(salaryId); // Added await
                if (!existingSalary) throw new Error("Salaire original non trouvé.");

                const updatedSalaryData = {
                    ...existingSalary, // Preserve other fields like employeeId, period, details
                    baseSalary,
                    advances,
                    sanctions,
                    debts,
                    netSalary,
                    isPaid,
                    notes: notes || null, // Use null if empty
                    paidDate: isPaid && paymentDateInput?.value ? new Date(paymentDateInput.value).toISOString() : (isPaid ? new Date().toISOString() : null), // Set paidDate only if paid
                    paymentMethod: isPaid && paymentMethodSelect ? paymentMethodSelect.value : null // Set method only if paid
                };

                const saved = await DB.salaries.save(updatedSalaryData); // Added await
                if (saved) {
                    this.closeModal();
                    await this.loadSalariesData(); // Added await
                    alert("Salaire modifié avec succès.");
                } else {
                     alert("Erreur lors de l'enregistrement des modifications.");
                }

            } catch (error) {
                console.error("Error saving salary:", error);
                alert(`Erreur: ${error.message}`);
            } finally {
                window.hideLoader();
            }
        },

        /**
         * Marque un salaire comme payé
         */
        markSalaryAsPaid: async function(salaryId) { // Added async
             window.showLoader("Mise à jour du statut...");
             try {
                const salary = await DB.salaries.getById(salaryId); // Added await
                if (!salary) throw new Error("Salaire non trouvé.");

                // Prompt for payment method maybe? For now, default or keep existing if any
                const updatedSalary = {
                    ...salary,
                    isPaid: true,
                    paidDate: salary.paidDate || new Date().toISOString(), // Use existing paidDate if available, else now
                    paymentMethod: salary.paymentMethod || 'cash' // Default to cash if not set
                };

                const saved = await DB.salaries.save(updatedSalary); // Added await
                if(saved) {
                    await this.loadSalariesData(); // Added await
                    alert("Salaire marqué comme payé.");
                } else {
                     alert("Erreur lors de la mise à jour du statut.");
                }
             } catch(error) {
                 console.error("Error marking salary as paid:", error);
                 alert(`Erreur: ${error.message}`);
             } finally {
                 window.hideLoader();
             }
        },

        /**
         * Génère et imprime une fiche de paie
         */
        printSalarySlip: async function(salaryId) { // Added async
             window.showLoader("Génération de la fiche de paie...");
             try {
                const salary = await DB.salaries.getById(salaryId); // Added await
                if (!salary) throw new Error("Salaire non trouvé.");
                const employee = await DB.employees.getById(salary.employeeId); // Added await
                if (!employee) throw new Error("Employé non trouvé.");
                const settings = await DB.settings.get(); // Added await
                const currencySymbol = settings?.currency || 'FCFA';

                const paymentDate = new Date(salary.paymentDate);
                const month = this.getMonthName(paymentDate.getMonth());
                const year = paymentDate.getFullYear();

                const printWindow = window.open('', '_blank');
                // --- Print Window HTML (same as before, just ensure data is correct) ---
                 printWindow.document.write(`
                     <!DOCTYPE html><html><head><title>Fiche Paie - ${employee.firstName} ${employee.lastName}</title>
                     <style> /* ... CSS styles ... */
                         body{font-family:Arial,sans-serif;line-height:1.5;color:#333;margin:0;padding:20px}.header{text-align:center;margin-bottom:20px;border-bottom:2px solid #333;padding-bottom:10px}.company-name{font-size:24px;font-weight:bold;margin-bottom:5px}.document-title{font-size:18px;margin-bottom:5px}.period{font-size:16px}.employee-section{margin-bottom:20px}.employee-name{font-size:18px;font-weight:bold;margin-bottom:5px}.employee-details{display:flex;justify-content:space-between}.employee-details div{flex:1}.salary-section{margin-bottom:20px}.salary-table{width:100%;border-collapse:collapse;margin-bottom:20px}.salary-table th,.salary-table td{border:1px solid #ddd;padding:8px}.salary-table th{background-color:#f2f2f2;text-align:left}.total-row{font-weight:bold;background-color:#f9f9f9}.footer{margin-top:30px;border-top:1px solid #ddd;padding-top:10px;text-align:center;font-size:12px}.signature-section{margin-top:40px;display:flex;justify-content:space-between}.signature-box{border-top:1px solid #333;width:200px;padding-top:5px;text-align:center}@media print{@page{margin:15mm}body{padding:0}}
                     </style></head><body>
                     <div class="header"><div class="company-name">${settings?.companyName || 'Le Sims'}</div><div class="document-title">FICHE DE PAIE</div><div class="period">Période: ${month} ${year}</div></div>
                     <div class="employee-section"><div class="employee-name">${employee.firstName} ${employee.lastName}</div><div class="employee-details"><div><p><strong>ID Employé:</strong> ${employee.employeeId || '-'}</p><p><strong>Poste:</strong> ${employee.position || '-'}</p></div><div><p><strong>Date Embauche:</strong> ${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : '-'}</p><p><strong>Adresse:</strong> ${employee.address || '-'}</p></div></div></div>
                     <div class="salary-section"><h3>Détails du Salaire</h3><table class="salary-table"><thead><tr><th>Description</th><th>Montant (${currencySymbol})</th></tr></thead><tbody>
                     <tr><td>Salaire de Base</td><td>${(salary.baseSalary||0).toLocaleString()}</td></tr>
                     <tr><td>Avances</td><td>- ${(salary.advances||0).toLocaleString()}</td></tr>
                     <tr><td>Sanctions</td><td>- ${(salary.sanctions||0).toLocaleString()}</td></tr>
                     <tr><td>Dettes</td><td>- ${(salary.debts||0).toLocaleString()}</td></tr>
                     <tr class="total-row"><td>Salaire Net</td><td>${(salary.netSalary||0).toLocaleString()}</td></tr>
                     </tbody></table></div>
                     <div class="payment-section"><h3>Informations Paiement</h3><p><strong>Statut:</strong> ${salary.isPaid ? 'Payé' : 'En attente'}</p>${salary.isPaid ? `<p><strong>Date Paiement:</strong> ${salary.paidDate ? new Date(salary.paidDate).toLocaleDateString() : '-'}</p><p><strong>Méthode:</strong> ${this.getPaymentMethodName(salary.paymentMethod)}</p>` : ''}</div>
                     <div class="signature-section"><div class="signature-box">Signature Employeur</div><div class="signature-box">Signature Employé</div></div>
                     <div class="footer"><p>Généré le ${new Date().toLocaleString()}</p><p>${settings?.companyName || 'Le Sims'}</p></div>
                     <script>window.onload=function(){window.print();}</script></body></html>
                 `);
                 printWindow.document.close();

             } catch (error) {
                 console.error("Error printing salary slip:", error);
                 alert(`Erreur: ${error.message}`);
             } finally {
                 window.hideLoader();
             }
        },

        /**
         * Ferme le modal actif
         */
        closeModal: function() {
            // ... (no changes needed here) ...
             const modalContainer = document.getElementById('modal-container');
             if (modalContainer) {
                 modalContainer.classList.remove('active');
                 modalContainer.innerHTML = '';
             }
        },

        /**
         * Obtient le nom du mois à partir de son index
         */
        getMonthName: function(monthIndex) {
            // ... (no changes needed here) ...
             const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
             return months[monthIndex] || '';
        },

        /**
         * Obtient le nom de la méthode de paiement
         */
        getPaymentMethodName: function(method) {
            // ... (no changes needed here) ...
              switch (method) {
                 case 'cash': return 'Espèces';
                 case 'bank_transfer': return 'Virement';
                 case 'mobile_money': return 'Mobile Money';
                 case 'other': return 'Autre';
                 default: return 'Non spécifié';
             }
        },

        /**
         * Exporte les salaires du mois sélectionné
         */
        exportSalaries: async function() { // Added async
            const monthSelect = document.getElementById('salary-month');
            const yearSelect = document.getElementById('salary-year');
            if (!monthSelect || !yearSelect) return;

            const month = parseInt(monthSelect.value);
            const year = parseInt(yearSelect.value);

            window.showLoader("Exportation des salaires...");
            try {
                const salaries = await DB.salaries.getByMonth(year, month); // Added await
                if (!Array.isArray(salaries) || salaries.length === 0) {
                    alert('Aucun salaire à exporter pour la période sélectionnée.');
                    window.hideLoader();
                    return;
                }

                // Fetch employee data for all salaries concurrently
                const employeeIds = [...new Set(salaries.map(s => s.employeeId))];
                let employeesMap = {};
                if(employeeIds.length > 0) {
                    const employees = await DB.employees.getAll(); // Or fetch by IDs
                    if(Array.isArray(employees)) {
                        employeesMap = employees.reduce((map, emp) => { map[emp.id] = emp; return map; }, {});
                    }
                }


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
                        paidDate: salary.paidDate ? new Date(salary.paidDate).toLocaleDateString('fr-FR') : '', // Use locale
                        paymentMethod: salary.paymentMethod ? this.getPaymentMethodName(salary.paymentMethod) : ''
                    };
                });

                // Convertir en CSV
                let csv = '"ID Employé","Prénom","Nom","Poste","Salaire Base","Avances","Sanctions","Dettes","Salaire Net","Payé","Date Paiement","Méthode Paiement"\n';
                salariesWithEmployeeInfo.forEach(s => {
                    // Escape double quotes within fields if necessary
                    csv += `"${s.employeeId}","${s.firstName}","${s.lastName}","${s.position}",${s.baseSalary},${s.advances},${s.sanctions},${s.debts},${s.netSalary},"${s.isPaid}","${s.paidDate}","${s.paymentMethod}"\n`;
                });

                // Télécharger le fichier CSV
                const monthName = this.getMonthName(month);
                const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `salaires_${monthName}_${year}.csv`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);

            } catch (error) {
                 console.error("Error exporting salaries:", error);
                 alert(`Erreur lors de l'exportation: ${error.message}`);
            } finally {
                 window.hideLoader();
            }
        },

        /**
         * Affiche tous les salaires de tous les mois
         */
        viewAllSalaries: async function() { // Added async
            const modalContainer = document.getElementById('modal-container');
            if (!modalContainer) return;

            window.showLoader("Chargement de l'historique...");
            try {
                const allSalaries = await DB.salaries.getAll(); // Added await
                if (!Array.isArray(allSalaries) || allSalaries.length === 0) {
                    alert('Aucun salaire enregistré.');
                    window.hideLoader();
                    return;
                }

                const settings = await DB.settings.get(); // Added await
                const currencySymbol = settings?.currency || 'FCFA';

                allSalaries.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

                const groupedSalaries = {};
                allSalaries.forEach(salary => {
                    const date = new Date(salary.paymentDate);
                    const key = `${date.getFullYear()}-${date.getMonth()}`;
                    if (!groupedSalaries[key]) {
                        groupedSalaries[key] = { month: date.getMonth(), year: date.getFullYear(), salaries: [] };
                    }
                    groupedSalaries[key].salaries.push(salary);
                });

                let periodsHTML = '';
                Object.values(groupedSalaries).forEach(group => {
                    const monthName = this.getMonthName(group.month);
                    const totalNetSalary = group.salaries.reduce((sum, s) => sum + (s.netSalary || 0), 0);
                    const totalPaidCount = group.salaries.filter(s => s.isPaid).length;
                    periodsHTML += `
                        <tr class="period-row" data-month="${group.month}" data-year="${group.year}">
                            <td><div class="period-name"><i class="fas fa-calendar-alt"></i><span>${monthName} ${group.year}</span></div></td>
                            <td>${group.salaries.length}</td>
                            <td>${totalPaidCount} / ${group.salaries.length}</td>
                            <td>${totalNetSalary.toLocaleString('fr-FR')} ${currencySymbol}</td>
                            <td><button class="btn btn-outline btn-sm view-period" data-month="${group.month}" data-year="${group.year}"><i class="fas fa-eye"></i> Voir</button></td>
                        </tr>`;
                });

                modalContainer.innerHTML = `
                    <div class="modal modal-large">
                        <div class="modal-header"><h3>Historique des Salaires</h3><button class="modal-close"><i class="fas fa-times"></i></button></div>
                        <div class="modal-body"><div class="table-responsive"><table class="table">
                            <thead><tr><th>Période</th><th>Employés</th><th>Payés</th><th>Total Net</th><th>Actions</th></tr></thead>
                            <tbody>${periodsHTML}</tbody>
                        </table></div></div>
                        <div class="modal-footer"><button class="btn btn-outline modal-cancel">Fermer</button></div>
                    </div>`;

                modalContainer.classList.add('active');
                this.bindModalEvents(); // Bind events for the new modal

            } catch (error) {
                 console.error("Error viewing all salaries:", error);
                 alert(`Erreur: ${error.message}`);
            } finally {
                 window.hideLoader();
            }
        },

        /**
         * Attache les événements
         */
        bindEvents: function() {
            const pageContainer = document.getElementById('salaries-page');
            const modalContainer = document.getElementById('modal-container');

            if (pageContainer) {
                 pageContainer.addEventListener('click', async (event) => { // Added async
                    if (event.target.id === 'process-payroll-btn' || event.target.closest('#process-payroll-btn')) {
                        await this.processSalaries(); // Added await
                    }
                    if (event.target.id === 'export-salaries' || event.target.closest('#export-salaries')) {
                        await this.exportSalaries(); // Added await
                    }
                    if (event.target.id === 'view-all-salaries' || event.target.closest('#view-all-salaries')) {
                        await this.viewAllSalaries(); // Added await
                    }
                 });

                 pageContainer.addEventListener('change', async (event) => { // Added async
                    if (event.target.id === 'salary-month' || event.target.id === 'salary-year') {
                        this.updateCurrentMonthDisplay();
                        const searchInput = pageContainer.querySelector('#salary-search');
                        await this.loadSalariesData(searchInput?.value || ''); // Added await
                    }
                 });

                 pageContainer.addEventListener('input', async (event) => { // Added async
                    if (event.target.id === 'salary-search') {
                        await this.loadSalariesData(event.target.value); // Added await
                    }
                 });

                 // Table actions delegation
                 const tableBody = pageContainer.querySelector('#salaries-list');
                 if (tableBody) {
                     tableBody.addEventListener('click', async (event) => { // Added async
                         const viewBtn = event.target.closest('.view-salary');
                         if (viewBtn) { await this.showSalaryDetails(viewBtn.dataset.id); return; } // Added await

                         const editBtn = event.target.closest('.edit-salary');
                         if (editBtn) { await this.showSalaryEditModal(editBtn.dataset.id); return; } // Added await

                         const printBtn = event.target.closest('.print-salary');
                         if (printBtn) { await this.printSalarySlip(printBtn.dataset.id); return; } // Added await
                     });
                 }
            }

             // Modal events are bound dynamically using bindModalEvents
             // Need listener for view-period button if viewAllSalaries modal is open
             if(modalContainer) {
                 modalContainer.addEventListener('click', async (event) => { // Added async
                     const viewPeriodBtn = event.target.closest('.view-period');
                     if (viewPeriodBtn) {
                         const month = parseInt(viewPeriodBtn.dataset.month);
                         const year = parseInt(viewPeriodBtn.dataset.year);
                         const monthSelect = document.getElementById('salary-month');
                         const yearSelect = document.getElementById('salary-year');
                         if (monthSelect) monthSelect.value = month;
                         if (yearSelect) yearSelect.value = year;
                         this.closeModal(); // Close the history modal
                         this.updateCurrentMonthDisplay();
                         await this.loadSalariesData(); // Added await
                     }
                 });
             }
        }
    };

    window.SalariesManager = SalariesManager;
    