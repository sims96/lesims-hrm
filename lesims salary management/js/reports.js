/**
 * reports.js
 * Génération de rapports et analyses
 * Application de Gestion des Salaires Le Sims
 * (Updated for DataManager Integration)
 */

const ReportsManager = {
    reportData: null, // Variable to store data for export/print

    /**
     * Initialisation du module de génération de rapports
     */
    init: async function() {
        console.log("ReportsManager: Initializing...");
        await this.loadReportsPage(); // Uses DataManager indirectly
        this.bindEvents();
        console.log("ReportsManager: Initialized.");
    },

    /**
     * Charge la page de génération de rapports (Using DataManager)
     */
    loadReportsPage: async function() {
        const reportsPage = document.getElementById('reports-page');
        if (!reportsPage) return;

        reportsPage.innerHTML = '<div class="loading-spinner-inline"></div> Chargement de la page des rapports...'; // Loading state

        try {
            // Get settings via DataManager
            const settings = await DataManager.settings.get(); // Uses DataManager
            const currencySymbol = settings?.currency || 'FCFA';

            // Générer les options des employés via DataManager
            const employeeOptionsHTML = await this.generateEmployeeOptions(); // Uses DataManager

            // Construction de la page HTML (structure remains the same)
            reportsPage.innerHTML = `
                <div class="page-header">
                    <h1>Rapports et Analyses</h1>
                </div>

                <div class="reports-grid">
                    <div class="report-card">
                        <div class="report-icon">
                            <i class="fas fa-calendar-alt"></i>
                        </div>
                        <div class="report-content">
                            <h3>Rapport Mensuel</h3>
                            <p>Générez un rapport complet des salaires, avances et sanctions pour un mois spécifique.</p>
                            <div class="report-form">
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label for="monthly-report-month">Mois:</label>
                                        <select id="monthly-report-month" class="form-control">
                                            ${this.generateMonthOptions()}
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label for="monthly-report-year">Année:</label>
                                        <select id="monthly-report-year" class="form-control">
                                            ${this.generateYearOptions()}
                                        </select>
                                    </div>
                                </div>
                                <button id="generate-monthly-report" class="btn btn-primary mt-3">
                                    <i class="fas fa-file-alt"></i> Générer le Rapport
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="report-card">
                        <div class="report-icon">
                            <i class="fas fa-user-tie"></i>
                        </div>
                        <div class="report-content">
                            <h3>Rapport par Employé</h3>
                            <p>Générez un rapport détaillé pour un employé spécifique sur une période donnée.</p>
                            <div class="report-form">
                                <div class="form-group">
                                    <label for="employee-report-id">Employé:</label>
                                    <select id="employee-report-id" class="form-control">
                                        <option value="">Sélectionnez un employé</option>
                                        ${employeeOptionsHTML} {/* Use generated options */}
                                    </select>
                                </div>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label for="employee-report-start">Date de début:</label>
                                        <input type="date" id="employee-report-start" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <label for="employee-report-end">Date de fin:</label>
                                        <input type="date" id="employee-report-end" class="form-control">
                                    </div>
                                </div>
                                <button id="generate-employee-report" class="btn btn-primary mt-3">
                                    <i class="fas fa-file-alt"></i> Générer le Rapport
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="report-card">
                        <div class="report-icon">
                            <i class="fas fa-hand-holding-usd"></i>
                        </div>
                        <div class="report-content">
                            <h3>Rapport d'Avances</h3>
                            <p>Consultez un résumé des avances sur salaire accordées sur une période donnée.</p>
                            <div class="report-form">
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label for="advances-report-start">Date de début:</label>
                                        <input type="date" id="advances-report-start" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <label for="advances-report-end">Date de fin:</label>
                                        <input type="date" id="advances-report-end" class="form-control">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <div class="checkbox-wrapper">
                                        <input type="checkbox" id="advances-report-unpaid-only">
                                        <label for="advances-report-unpaid-only">Afficher uniquement les avances non remboursées</label>
                                    </div>
                                </div>
                                <button id="generate-advances-report" class="btn btn-primary mt-3">
                                    <i class="fas fa-file-alt"></i> Générer le Rapport
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="report-card">
                        <div class="report-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="report-content">
                            <h3>Rapport de Sanctions</h3>
                            <p>Consultez un résumé des sanctions et pénalités appliquées sur une période donnée.</p>
                            <div class="report-form">
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label for="sanctions-report-start">Date de début:</label>
                                        <input type="date" id="sanctions-report-start" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <label for="sanctions-report-end">Date de fin:</label>
                                        <input type="date" id="sanctions-report-end" class="form-control">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="sanctions-report-type">Type de sanction:</label>
                                    <select id="sanctions-report-type" class="form-control">
                                        <option value="all">Tous les types</option>
                                        <option value="late">Retards</option>
                                        <option value="absence">Absences</option>
                                        <option value="misconduct">Fautes</option>
                                        <option value="other">Autres</option>
                                    </select>
                                </div>
                                <button id="generate-sanctions-report" class="btn btn-primary mt-3">
                                    <i class="fas fa-file-alt"></i> Générer le Rapport
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="report-card">
                        <div class="report-icon">
                            <i class="fas fa-file-invoice-dollar"></i>
                        </div>
                        <div class="report-content">
                            <h3>Rapport de Dettes Clients</h3>
                            <p>Consultez un résumé des dettes clients enregistrées sur une période donnée.</p>
                            <div class="report-form">
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label for="debts-report-start">Date de début:</label>
                                        <input type="date" id="debts-report-start" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <label for="debts-report-end">Date de fin:</label>
                                        <input type="date" id="debts-report-end" class="form-control">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <div class="checkbox-wrapper">
                                        <input type="checkbox" id="debts-report-unpaid-only">
                                        <label for="debts-report-unpaid-only">Afficher uniquement les dettes non payées</label>
                                    </div>
                                </div>
                                <button id="generate-debts-report" class="btn btn-primary mt-3">
                                    <i class="fas fa-file-alt"></i> Générer le Rapport
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="report-card">
                        <div class="report-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="report-content">
                            <h3>Analyse Annuelle</h3>
                            <p>Visualisez l'évolution des salaires, avances et sanctions sur une année complète.</p>
                            <div class="report-form">
                                <div class="form-group">
                                    <label for="annual-report-year">Année:</label>
                                    <select id="annual-report-year" class="form-control">
                                        ${this.generateYearOptions()}
                                    </select>
                                </div>
                                <button id="generate-annual-report" class="btn btn-primary mt-3">
                                    <i class="fas fa-chart-bar"></i> Générer l'Analyse
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="report-display" class="report-display card mt-4" style="display: none;">
                     <div class="card-header report-header">
                        <h2 id="report-title" class="h5 mb-0">Titre du Rapport</h2>
                        <div class="report-actions">
                            <button id="print-report" class="btn btn-outline btn-sm">
                                <i class="fas fa-print"></i> Imprimer
                            </button>
                            <button id="export-report" class="btn btn-outline btn-sm">
                                <i class="fas fa-file-export"></i> Exporter (CSV)
                            </button>
                            <button id="close-report" class="btn btn-outline btn-sm">
                                <i class="fas fa-times"></i> Fermer
                            </button>
                        </div>
                    </div>
                    <div id="report-content" class="report-content card-body">
                        </div>
                </div>
            `;

            // Initialiser les dates par défaut
            this.initDefaultDates();
        } catch (error) {
            console.error("ReportsManager: Error loading reports page:", error);
            reportsPage.innerHTML = `<p class="error-message">Erreur lors du chargement de la page des rapports.</p>`;
        }
    },

    /**
     * Initialise les dates par défaut pour les filtres (Synchronous)
     */
    initDefaultDates: function() {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();

        // Début du mois courant
        const startOfMonth = new Date(currentYear, currentMonth, 1);
        // Fin du mois courant
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

        // Format des dates pour les inputs (YYYY-MM-DD)
        const formatDate = date => date.toISOString().split('T')[0];

        // Définir les dates par défaut pour tous les rapports
        const datePickers = [
            'employee-report-start', 'employee-report-end',
            'advances-report-start', 'advances-report-end',
            'sanctions-report-start', 'sanctions-report-end',
            'debts-report-start', 'debts-report-end'
        ];

        datePickers.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                if (id.includes('-start')) {
                    input.value = formatDate(startOfMonth);
                } else if (id.includes('-end')) {
                    input.value = formatDate(endOfMonth);
                }
            }
        });
    },

    /**
     * Génère les options pour la sélection du mois (Synchronous)
     */
    generateMonthOptions: function() {
         const months = [
            "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
            "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
        ];
        const currentMonth = new Date().getMonth();
        return months.map((month, index) =>
            `<option value="${index}" ${index === currentMonth ? 'selected' : ''}>${month}</option>`
        ).join('');
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
     * Génère les options pour la sélection des employés (Using DataManager)
     */
    generateEmployeeOptions: async function() {
        try {
            // Get employees via DataManager
            const employees = await DataManager.employees.getAll(); // Uses DataManager

            if (!Array.isArray(employees)) {
                console.error("ReportsManager: Failed to load employees for options:", employees);
                return '<option value="">Erreur chargement employés</option>';
            }
            if (employees.length === 0) {
                return '<option value="">Aucun employé disponible</option>';
            }

            // Trier les employés par nom
            employees.sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));

            return employees.map(employee =>
                `<option value="${employee.id}">${employee.firstName} ${employee.lastName} - ${employee.position || 'Sans poste'}</option>`
            ).join('');
        } catch (error) {
            console.error("ReportsManager: Error generating employee options:", error);
            return '<option value="">Erreur chargement employés</option>';
        }
    },

    /**
     * Génère le rapport mensuel (Using DataManager)
     */
    generateMonthlyReport: async function() {
        const monthSelect = document.getElementById('monthly-report-month');
        const yearSelect = document.getElementById('monthly-report-year');
        if (!monthSelect || !yearSelect) return;

        const month = parseInt(monthSelect.value);
        const year = parseInt(yearSelect.value);
        const monthName = this.getMonthName(month);

        window.showLoader(`Génération rapport: ${monthName} ${year}...`);
        this.reportData = null; // Clear previous report data

        try {
            const reportTitle = `Rapport Mensuel - ${monthName} ${year}`;

            // Get data via DataManager
            const settings = await DataManager.settings.get();
            const currencySymbol = settings?.currency || 'FCFA';

            let salaries = await DataManager.salaries.getByMonth(year, month);
            let allAdvances = await DataManager.advances.getAll();
            let allSanctions = await DataManager.sanctions.getAll();
            let allDebts = await DataManager.debts.getAll();
            let employees = await DataManager.employees.getAll();

            // Validate data
            if (!Array.isArray(salaries)) { console.warn("Monthly Report: Invalid salary data"); salaries = []; }
            if (!Array.isArray(allAdvances)) { console.warn("Monthly Report: Invalid advances data"); allAdvances = []; }
            if (!Array.isArray(allSanctions)) { console.warn("Monthly Report: Invalid sanctions data"); allSanctions = []; }
            if (!Array.isArray(allDebts)) { console.warn("Monthly Report: Invalid debts data"); allDebts = []; }
            if (!Array.isArray(employees)) { console.warn("Monthly Report: Invalid employee data"); employees = []; }


            // Dates de début et fin du mois
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);
            endDate.setHours(23, 59, 59, 999); // Ensure end of day

            // Filter advances, sanctions, debts for the month
             const advances = allAdvances.filter(advance => {
                 try { const d=new Date(advance.date); return !isNaN(d) && d >= startDate && d <= endDate; } catch(e){ return false; }
             });
             const sanctions = allSanctions.filter(sanction => {
                 try { const d=new Date(sanction.date); return !isNaN(d) && d >= startDate && d <= endDate; } catch(e){ return false; }
             });
             const debts = allDebts.filter(debt => {
                 try { const d=new Date(debt.date); return !isNaN(d) && d >= startDate && d <= endDate; } catch(e){ return false; }
             });

            // Map employees for quick lookup
             const employeesMap = {};
             employees.forEach(emp => { employeesMap[emp.id] = emp; });

            // Calculate totals
            const totalBaseSalary = salaries.reduce((sum, salary) => sum + (salary.baseSalary || 0), 0);
            const totalAdvancesDeducted = salaries.reduce((sum, salary) => sum + (salary.advances || 0), 0); // Deducted in salary calculation
            const totalSanctionsDeducted = salaries.reduce((sum, salary) => sum + (salary.sanctions || 0), 0); // Deducted in salary calculation
            const totalDebtsDeducted = salaries.reduce((sum, salary) => sum + (salary.debts || 0), 0); // Deducted in salary calculation
            const totalNetSalary = salaries.reduce((sum, salary) => sum + (salary.netSalary || 0), 0);

            // Employés sans salaire traité ce mois-ci
            const employeesWithSalary = new Set(salaries.map(salary => salary.employeeId));
            const employeesWithoutSalary = employees.filter(employee => !employeesWithSalary.has(employee.id));

            // --- Build Report HTML ---
            // Salary Rows
             const salaryRowsHTML = salaries.map(salary => {
                const employee = employeesMap[salary.employeeId];
                if (!employee) return ''; // Skip if employee somehow not found
                return `
                    <tr>
                        <td>${employee.firstName} ${employee.lastName}</td>
                        <td>${employee.position || '-'}</td>
                        <td>${(salary.baseSalary||0).toLocaleString('fr-FR')} ${currencySymbol}</td>
                        <td>${(salary.advances||0).toLocaleString('fr-FR')} ${currencySymbol}</td>
                        <td>${(salary.sanctions||0).toLocaleString('fr-FR')} ${currencySymbol}</td>
                        <td>${(salary.debts||0).toLocaleString('fr-FR')} ${currencySymbol}</td>
                        <td class="${(salary.netSalary||0) >= 0 ? 'text-success' : 'text-danger'}">${(salary.netSalary||0).toLocaleString('fr-FR')} ${currencySymbol}</td>
                        <td><span class="badge ${salary.isPaid ? 'badge-success' : 'badge-warning'}">${salary.isPaid ? 'Payé' : 'En attente'}</span></td>
                    </tr>`;
            }).join('');

            // Advance Rows (Advances granted THIS month)
             const advanceRowsHTML = advances.map(advance => {
                 const employee = employeesMap[advance.employeeId];
                 return `
                     <tr>
                         <td>${employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu'}</td>
                         <td>${new Date(advance.date).toLocaleDateString('fr-FR')}</td>
                         <td>${(advance.amount||0).toLocaleString('fr-FR')} ${currencySymbol}</td>
                         <td>${advance.reason || '-'}</td>
                         <td><span class="badge ${advance.isPaid ? 'badge-success' : 'badge-warning'}">${advance.isPaid ? 'Remboursée' : 'Non remboursée'}</span></td>
                     </tr>`;
             }).join('');

             // Sanction Rows (Sanctions applied THIS month)
             const sanctionRowsHTML = sanctions.map(sanction => {
                 const employee = employeesMap[sanction.employeeId];
                 return `
                     <tr>
                         <td>${employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu'}</td>
                         <td>${new Date(sanction.date).toLocaleDateString('fr-FR')}</td>
                         <td>${this.getSanctionTypeName(sanction.type)}</td>
                         <td>${(sanction.amount||0).toLocaleString('fr-FR')} ${currencySymbol}</td>
                         <td>${sanction.reason || '-'}</td>
                     </tr>`;
             }).join('');

             // Debt Rows (Debts recorded THIS month)
              const debtRowsHTML = debts.map(debt => {
                 const employee = employeesMap[debt.employeeId];
                 return `
                     <tr>
                         <td>${employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu'}</td>
                         <td>${debt.clientName || '-'}</td>
                         <td>${new Date(debt.date).toLocaleDateString('fr-FR')}</td>
                         <td>${(debt.amount||0).toLocaleString('fr-FR')} ${currencySymbol}</td>
                         <td>${debt.description || '-'}</td>
                         <td><span class="badge ${debt.isPaid ? 'badge-success' : 'badge-warning'}">${debt.isPaid ? 'Payée' : 'Non payée'}</span></td>
                     </tr>`;
             }).join('');

            // Assemble full report content
            let reportContent = `
                <div class="report-summary">
                    <div class="summary-cards">
                        <div class="summary-card"><h4>Employés Traités</h4><div class="summary-value">${salaries.length} / ${employees.length}</div></div>
                        <div class="summary-card"><h4>Salaires de Base</h4><div class="summary-value">${totalBaseSalary.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                        <div class="summary-card"><h4>Avances Déduites</h4><div class="summary-value">${totalAdvancesDeducted.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                        <div class="summary-card"><h4>Sanctions Déduites</h4><div class="summary-value">${totalSanctionsDeducted.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                        <div class="summary-card"><h4>Dettes Déduites</h4><div class="summary-value">${totalDebtsDeducted.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                        <div class="summary-card total"><h4>Salaires Nets Payés</h4><div class="summary-value">${totalNetSalary.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                    </div>
                </div>

                <div class="report-section">
                    <h3>Détail des Salaires du Mois</h3>
                     ${salaries.length > 0 ? `
                    <div class="table-responsive">
                        <table class="table">
                            <thead><tr><th>Employé</th><th>Poste</th><th>Salaire Base</th><th>Avances</th><th>Sanctions</th><th>Dettes</th><th>Salaire Net</th><th>Statut</th></tr></thead>
                            <tbody>${salaryRowsHTML}</tbody>
                        </table>
                    </div>` : `<p class="empty-message">Aucun salaire traité pour ce mois.</p>`}
                </div>`;

            if (employeesWithoutSalary.length > 0) {
                 reportContent += `
                     <div class="report-section">
                         <h3>Employés sans Salaire Traité (${employeesWithoutSalary.length})</h3>
                         <div class="table-responsive">
                             <table class="table">
                                 <thead><tr><th>Employé</th><th>Poste</th><th>Salaire Base</th><th>Date Embauche</th></tr></thead>
                                 <tbody>${employeesWithoutSalary.map(e => `<tr><td>${e.firstName} ${e.lastName}</td><td>${e.position||'-'}</td><td>${(e.baseSalary||0).toLocaleString('fr-FR')} ${currencySymbol}</td><td>${e.hireDate ? new Date(e.hireDate).toLocaleDateString('fr-FR') : '-'}</td></tr>`).join('')}</tbody>
                             </table>
                         </div>
                     </div>`;
             }

             // Sections for advances, sanctions, debts occurring in the month
            if (advances.length > 0) {
                 reportContent += `<div class="report-section"><h3>Avances Accordées ce Mois</h3><div class="table-responsive"><table class="table"><thead><tr><th>Employé</th><th>Date</th><th>Montant</th><th>Raison</th><th>Statut Remb.</th></tr></thead><tbody>${advanceRowsHTML}</tbody></table></div></div>`;
             }
             if (sanctions.length > 0) {
                  reportContent += `<div class="report-section"><h3>Sanctions Appliquées ce Mois</h3><div class="table-responsive"><table class="table"><thead><tr><th>Employé</th><th>Date</th><th>Type</th><th>Montant</th><th>Raison</th></tr></thead><tbody>${sanctionRowsHTML}</tbody></table></div></div>`;
             }
              if (debts.length > 0) {
                 reportContent += `<div class="report-section"><h3>Dettes Clients Enregistrées ce Mois</h3><div class="table-responsive"><table class="table"><thead><tr><th>Employé Resp.</th><th>Client</th><th>Date</th><th>Montant</th><th>Description</th><th>Statut Paiement</th></tr></thead><tbody>${debtRowsHTML}</tbody></table></div></div>`;
             }


            // Afficher le rapport
            this.displayReport(reportTitle, reportContent);

            // Stocker les données pour l'exportation/impression
            this.reportData = {
                title: reportTitle, type: 'monthly', month, year, settings, currencySymbol,
                salaries, advances, sanctions, debts, employees, employeesWithoutSalary, employeesMap
            };

        } catch (error) {
            console.error("ReportsManager: Error generating monthly report:", error);
            alert("Erreur lors de la génération du rapport mensuel.");
            this.displayReport("Erreur", `<p class="error-message">Impossible de générer le rapport. Erreur: ${error.message}</p>`);
        } finally {
            window.hideLoader();
        }
    },

    /**
     * Génère le rapport par employé (Using DataManager)
     */
    generateEmployeeReport: async function() {
        const employeeId = document.getElementById('employee-report-id').value;
        const startDateStr = document.getElementById('employee-report-start').value;
        const endDateStr = document.getElementById('employee-report-end').value;

        if (!employeeId || !startDateStr || !endDateStr) {
            alert('Veuillez sélectionner un employé et une période.');
            return;
        }

        window.showLoader("Génération du rapport employé...");
        this.reportData = null;

        try {
            // Get data via DataManager
            const employee = await DataManager.employees.getById(employeeId);
            if (!employee) throw new Error('Employé introuvable.');

            const settings = await DataManager.settings.get();
            const currencySymbol = settings?.currency || 'FCFA';

            const reportTitle = `Rapport Employé - ${employee.firstName} ${employee.lastName}`;
            const startDateTime = new Date(startDateStr);
            startDateTime.setHours(0, 0, 0, 0);
            const endDateTime = new Date(endDateStr);
            endDateTime.setHours(23, 59, 59, 999);

            // Fetch ALL relevant data first, then filter
            const [allSalaries, allAdvances, allSanctions, allDebts] = await Promise.all([
                DataManager.salaries.getAll(), // Fetch all salaries
                DataManager.advances.getByEmployeeId(employeeId), // Fetch specific employee's advances
                DataManager.sanctions.getByEmployeeId(employeeId), // Fetch specific employee's sanctions
                DataManager.debts.getByEmployeeId(employeeId)     // Fetch specific employee's debts
            ]);

             // Validate fetched data
            if (!Array.isArray(allSalaries)) { console.warn("Employee Report: Invalid salary data"); allSalaries = []; }
            if (!Array.isArray(allAdvances)) { console.warn("Employee Report: Invalid advances data"); allAdvances = []; }
            if (!Array.isArray(allSanctions)) { console.warn("Employee Report: Invalid sanctions data"); allSanctions = []; }
            if (!Array.isArray(allDebts)) { console.warn("Employee Report: Invalid debts data"); allDebts = []; }

            // Filter data for the selected employee and period
            const salaries = allSalaries.filter(s => {
                 try { const d=new Date(s.paymentDate); return s.employeeId === employeeId && !isNaN(d) && d >= startDateTime && d <= endDateTime; } catch(e){ return false; }
             });
            const advances = allAdvances.filter(a => {
                 try { const d=new Date(a.date); return !isNaN(d) && d >= startDateTime && d <= endDateTime; } catch(e){ return false; }
            });
             const sanctions = allSanctions.filter(s => {
                 try { const d=new Date(s.date); return !isNaN(d) && d >= startDateTime && d <= endDateTime; } catch(e){ return false; }
             });
             const debts = allDebts.filter(d => {
                 try { const d=new Date(d.date); return !isNaN(d) && d >= startDateTime && d <= endDateTime; } catch(e){ return false; }
             });

             // Calculate totals for the period
            const totalAdvancesPeriod = advances.reduce((sum, a) => sum + (a.amount || 0), 0);
            const totalSanctionsPeriod = sanctions.reduce((sum, s) => sum + (s.amount || 0), 0);
            const totalDebtsPeriod = debts.reduce((sum, d) => sum + (d.amount || 0), 0);
            const totalNetSalaryPeriod = salaries.reduce((sum, s) => sum + (s.netSalary || 0), 0);

            // --- Build Report HTML ---
            let reportContent = `
                <div class="employee-profile card mb-3">
                    <div class="card-body">
                        <div class="employee-profile-header">
                             <div class="employee-avatar"><span>${employee.firstName?.charAt(0)}${employee.lastName?.charAt(0)}</span></div>
                             <div class="employee-profile-info">
                                 <h2>${employee.firstName} ${employee.lastName}</h2>
                                 <p>${employee.position || 'Poste non spécifié'}</p>
                             </div>
                         </div>
                         <div class="employee-details mt-3">
                             <p><strong>ID Employé:</strong> ${employee.employeeId || '-'}</p>
                             <p><strong>Salaire de Base:</strong> ${employee.baseSalary ? `${employee.baseSalary.toLocaleString('fr-FR')} ${currencySymbol}` : '-'}</p>
                             <p><strong>Date Embauche:</strong> ${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('fr-FR') : '-'}</p>
                             <p><strong>Période du Rapport:</strong> Du ${startDateTime.toLocaleDateString('fr-FR')} au ${endDateTime.toLocaleDateString('fr-FR')}</p>
                        </div>
                    </div>
                </div>

                <div class="report-summary card mb-3">
                     <div class="card-body">
                         <h4>Résumé pour la Période</h4>
                         <div class="summary-cards">
                             <div class="summary-card"><h4>Salaires Traités</h4><div class="summary-value">${salaries.length}</div></div>
                             <div class="summary-card"><h4>Avances Accordées</h4><div class="summary-value">${totalAdvancesPeriod.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                             <div class="summary-card"><h4>Sanctions Appliquées</h4><div class="summary-value">${totalSanctionsPeriod.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                             <div class="summary-card"><h4>Dettes Enregistrées</h4><div class="summary-value">${totalDebtsPeriod.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                             <div class="summary-card total"><h4>Total Net Reçu</h4><div class="summary-value">${totalNetSalaryPeriod.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                         </div>
                     </div>
                </div>
            `;

            // Add detailed sections (similar to monthly report but filtered)
             if (salaries.length > 0) {
                 const salaryRows = salaries.map(s => {
                    const paymentDate = new Date(s.paymentDate);
                    const month = this.getMonthName(paymentDate.getMonth());
                    const year = paymentDate.getFullYear();
                    return `<tr><td>${month} ${year}</td><td>${(s.baseSalary||0).toLocaleString('fr-FR')} ${currencySymbol}</td><td>${(s.advances||0).toLocaleString('fr-FR')} ${currencySymbol}</td><td>${(s.sanctions||0).toLocaleString('fr-FR')} ${currencySymbol}</td><td>${(s.debts||0).toLocaleString('fr-FR')} ${currencySymbol}</td><td class="${(s.netSalary||0)>=0?'text-success':'text-danger'}">${(s.netSalary||0).toLocaleString('fr-FR')} ${currencySymbol}</td><td><span class="badge ${s.isPaid?'badge-success':'badge-warning'}">${s.isPaid?'Payé':'En attente'}</span></td></tr>`;
                 }).join('');
                 reportContent += `<div class="report-section card mb-3"><div class="card-body"><h3>Salaires sur la Période</h3><div class="table-responsive"><table class="table"><thead><tr><th>Période</th><th>Salaire Base</th><th>Avances</th><th>Sanctions</th><th>Dettes</th><th>Salaire Net</th><th>Statut</th></tr></thead><tbody>${salaryRows}</tbody></table></div></div></div>`;
             } else {
                  reportContent += `<div class="report-section card mb-3"><div class="card-body"><h3>Salaires sur la Période</h3><p class="empty-message">Aucun salaire traité pour cet employé sur la période sélectionnée.</p></div></div>`;
             }
              if (advances.length > 0) {
                  const advanceRows = advances.map(a => `<tr><td>${new Date(a.date).toLocaleDateString('fr-FR')}</td><td>${(a.amount||0).toLocaleString('fr-FR')} ${currencySymbol}</td><td>${a.reason||'-'}</td><td><span class="badge ${a.isPaid?'badge-success':'badge-warning'}">${a.isPaid?'Remboursée':'Non remboursée'}</span></td></tr>`).join('');
                  reportContent += `<div class="report-section card mb-3"><div class="card-body"><h3>Avances sur la Période</h3><div class="table-responsive"><table class="table"><thead><tr><th>Date</th><th>Montant</th><th>Raison</th><th>Statut Remb.</th></tr></thead><tbody>${advanceRows}</tbody></table></div></div></div>`;
              }
               if (sanctions.length > 0) {
                  const sanctionRows = sanctions.map(s => `<tr><td>${new Date(s.date).toLocaleDateString('fr-FR')}</td><td>${this.getSanctionTypeName(s.type)}</td><td>${(s.amount||0).toLocaleString('fr-FR')} ${currencySymbol}</td><td>${s.reason||'-'}</td></tr>`).join('');
                  reportContent += `<div class="report-section card mb-3"><div class="card-body"><h3>Sanctions sur la Période</h3><div class="table-responsive"><table class="table"><thead><tr><th>Date</th><th>Type</th><th>Montant</th><th>Raison</th></tr></thead><tbody>${sanctionRows}</tbody></table></div></div></div>`;
              }
               if (debts.length > 0) {
                   const debtRows = debts.map(d => `<tr><td>${new Date(d.date).toLocaleDateString('fr-FR')}</td><td>${d.clientName||'-'}</td><td>${(d.amount||0).toLocaleString('fr-FR')} ${currencySymbol}</td><td>${d.description||'-'}</td><td><span class="badge ${d.isPaid?'badge-success':'badge-warning'}">${d.isPaid?'Payée':'Non payée'}</span></td></tr>`).join('');
                   reportContent += `<div class="report-section card mb-3"><div class="card-body"><h3>Dettes Clients sur la Période</h3><div class="table-responsive"><table class="table"><thead><tr><th>Date</th><th>Client</th><th>Montant</th><th>Description</th><th>Statut</th></tr></thead><tbody>${debtRows}</tbody></table></div></div></div>`;
               }


            this.displayReport(reportTitle, reportContent);
            this.reportData = { title: reportTitle, type: 'employee', employee, settings, currencySymbol, startDate: startDateTime, endDate: endDateTime, salaries, advances, sanctions, debts };

        } catch (error) {
            console.error("ReportsManager: Error generating employee report:", error);
            alert(`Erreur: ${error.message}`);
            this.displayReport("Erreur", `<p class="error-message">Impossible de générer le rapport. Erreur: ${error.message}</p>`);
        } finally {
            window.hideLoader();
        }
    },

    /**
     * Génère le rapport d'avances (Using DataManager)
     */
    generateAdvancesReport: async function() {
        const startDateStr = document.getElementById('advances-report-start').value;
        const endDateStr = document.getElementById('advances-report-end').value;
        const unpaidOnly = document.getElementById('advances-report-unpaid-only').checked;

        if (!startDateStr || !endDateStr) {
            alert('Veuillez sélectionner une période.');
            return;
        }

        window.showLoader("Génération rapport avances...");
        this.reportData = null;

         try {
             const reportTitle = `Rapport d'Avances sur Salaire${unpaidOnly ? ' (Non Remboursées)' : ''}`;
             const startDateTime = new Date(startDateStr); startDateTime.setHours(0,0,0,0);
             const endDateTime = new Date(endDateStr); endDateTime.setHours(23,59,59,999);

             // Get data via DataManager
             const allAdvances = await DataManager.advances.getAll();
             const settings = await DataManager.settings.get();
             const allEmployees = await DataManager.employees.getAll();

              if (!Array.isArray(allAdvances)) { console.warn("Advances Report: Invalid advances data"); allAdvances = []; }
              if (!Array.isArray(allEmployees)) { console.warn("Advances Report: Invalid employee data"); allEmployees = []; }
              const currencySymbol = settings?.currency || 'FCFA';
              const employeesMap = {};
              allEmployees.forEach(emp => { employeesMap[emp.id] = emp; });

             // Filter advances
             let advances = allAdvances.filter(advance => {
                  try { const d=new Date(advance.date); return !isNaN(d) && d >= startDateTime && d <= endDateTime; } catch(e){ return false; }
             });
             if (unpaidOnly) {
                 advances = advances.filter(advance => !advance.isPaid);
             }

             // Calculate stats
             const totalAdvancesAmount = advances.reduce((sum, a) => sum + (a.amount || 0), 0);
             const paidAdvances = advances.filter(a => a.isPaid);
             const unpaidAdvances = advances.filter(a => !a.isPaid);
             const totalPaid = paidAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);
             const totalUnpaid = unpaidAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);
             const employeeIds = [...new Set(advances.map(a => a.employeeId))];
             const employeeCount = employeeIds.length;

              // Build HTML Rows
              const advanceRowsHTML = advances.map(advance => {
                 const employee = employeesMap[advance.employeeId];
                 return `<tr><td>${employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu'}</td><td>${new Date(advance.date).toLocaleDateString('fr-FR')}</td><td>${(advance.amount||0).toLocaleString('fr-FR')} ${currencySymbol}</td><td>${advance.reason || '-'}</td><td><span class="badge ${advance.isPaid ? 'badge-success' : 'badge-warning'}">${advance.isPaid ? 'Remboursée' : 'Non remboursée'}</span></td></tr>`;
              }).join('');

             const employeeSummaryRowsHTML = employeeIds.map(employeeId => {
                 const employee = employeesMap[employeeId];
                 if (!employee) return '';
                 const empAdvances = advances.filter(a => a.employeeId === employeeId);
                 const empPaid = empAdvances.filter(a => a.isPaid).reduce((sum, a) => sum + (a.amount || 0), 0);
                 const empUnpaid = empAdvances.filter(a => !a.isPaid).reduce((sum, a) => sum + (a.amount || 0), 0);
                 const empTotal = empPaid + empUnpaid;
                 return `<tr><td>${employee.firstName} ${employee.lastName}</td><td>${employee.position || '-'}</td><td>${empAdvances.length}</td><td>${empTotal.toLocaleString('fr-FR')} ${currencySymbol}</td><td>${empPaid.toLocaleString('fr-FR')} ${currencySymbol}</td><td>${empUnpaid.toLocaleString('fr-FR')} ${currencySymbol}</td></tr>`;
             }).join('');

             // Build report content
             let reportContent = `
                <div class="report-period"><p>Période: Du ${startDateTime.toLocaleDateString('fr-FR')} au ${endDateTime.toLocaleDateString('fr-FR')}</p></div>
                <div class="report-summary card mb-3"><div class="card-body"><h4>Résumé</h4><div class="summary-cards">
                    <div class="summary-card"><h4>Total Avances</h4><div class="summary-value">${totalAdvancesAmount.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Remboursées</h4><div class="summary-value">${totalPaid.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Non Remboursées</h4><div class="summary-value">${totalUnpaid.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Employés Concernés</h4><div class="summary-value">${employeeCount}</div></div>
                </div></div></div>`;

             if (advances.length > 0) {
                 reportContent += `<div class="report-section card mb-3"><div class="card-body"><h3>Liste des Avances${unpaidOnly ? ' Non Remboursées' : ''}</h3><div class="table-responsive"><table class="table"><thead><tr><th>Employé</th><th>Date</th><th>Montant</th><th>Raison</th><th>Statut</th></tr></thead><tbody>${advanceRowsHTML}</tbody></table></div></div></div>`;
                 reportContent += `<div class="report-section card mb-3"><div class="card-body"><h3>Résumé par Employé</h3><div class="table-responsive"><table class="table"><thead><tr><th>Employé</th><th>Poste</th><th>Nb Avances</th><th>Total</th><th>Remboursées</th><th>Non Remboursées</th></tr></thead><tbody>${employeeSummaryRowsHTML}</tbody></table></div></div></div>`;
             } else {
                 reportContent += `<div class="report-section card mb-3"><div class="card-body"><h3>Liste des Avances${unpaidOnly ? ' Non Remboursées' : ''}</h3><p class="empty-message">Aucune avance trouvée pour la période et les filtres sélectionnés.</p></div></div>`;
             }

             this.displayReport(reportTitle, reportContent);
             this.reportData = { title: reportTitle, type: 'advances', settings, currencySymbol, startDate: startDateTime, endDate: endDateTime, unpaidOnly, advances, employeesMap };

         } catch(error) {
             console.error("ReportsManager: Error generating advances report:", error);
             alert(`Erreur: ${error.message}`);
             this.displayReport("Erreur", `<p class="error-message">Impossible de générer le rapport. Erreur: ${error.message}</p>`);
         } finally {
              window.hideLoader();
         }
    },

    /**
     * Génère le rapport de sanctions (Using DataManager)
     */
    generateSanctionsReport: async function() {
         const startDateStr = document.getElementById('sanctions-report-start').value;
         const endDateStr = document.getElementById('sanctions-report-end').value;
         const sanctionType = document.getElementById('sanctions-report-type').value;

         if (!startDateStr || !endDateStr) {
             alert('Veuillez sélectionner une période.');
             return;
         }
         window.showLoader("Génération rapport sanctions...");
         this.reportData = null;

          try {
             let reportTitle = 'Rapport de Sanctions';
             if (sanctionType !== 'all') { reportTitle += ` (Type: ${this.getSanctionTypeName(sanctionType)})`; }

             const startDateTime = new Date(startDateStr); startDateTime.setHours(0,0,0,0);
             const endDateTime = new Date(endDateStr); endDateTime.setHours(23,59,59,999);

             // Get data via DataManager
             const allSanctions = await DataManager.sanctions.getAll();
             const settings = await DataManager.settings.get();
             const allEmployees = await DataManager.employees.getAll();

             if (!Array.isArray(allSanctions)) { console.warn("Sanctions Report: Invalid sanctions data"); allSanctions = []; }
             if (!Array.isArray(allEmployees)) { console.warn("Sanctions Report: Invalid employee data"); allEmployees = []; }
             const currencySymbol = settings?.currency || 'FCFA';
             const employeesMap = {};
             allEmployees.forEach(emp => { employeesMap[emp.id] = emp; });

             // Filter sanctions
             let sanctions = allSanctions.filter(sanction => {
                  try { const d=new Date(sanction.date); return !isNaN(d) && d >= startDateTime && d <= endDateTime; } catch(e){ return false; }
             });
             if (sanctionType !== 'all') {
                 sanctions = sanctions.filter(sanction => sanction.type === sanctionType);
             }

             // Calculate stats
             const totalAmount = sanctions.reduce((sum, s) => sum + (s.amount || 0), 0);
             const lateAmount = sanctions.filter(s => s.type === 'late').reduce((sum, s) => sum + (s.amount || 0), 0);
             const absenceAmount = sanctions.filter(s => s.type === 'absence').reduce((sum, s) => sum + (s.amount || 0), 0);
             const otherAmount = sanctions.filter(s => !['late', 'absence'].includes(s.type)).reduce((sum, s) => sum + (s.amount || 0), 0);
             const employeeIds = [...new Set(sanctions.map(s => s.employeeId))];
             const employeeCount = employeeIds.length;

             // Build HTML rows
             const sanctionRowsHTML = sanctions.map(sanction => {
                 const employee = employeesMap[sanction.employeeId];
                 return `<tr><td>${employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu'}</td><td>${new Date(sanction.date).toLocaleDateString('fr-FR')}</td><td>${this.getSanctionTypeName(sanction.type)}</td><td>${(sanction.amount||0).toLocaleString('fr-FR')} ${currencySymbol}</td><td>${sanction.reason || '-'}</td></tr>`;
             }).join('');

             const employeeSummaryRowsHTML = employeeIds.map(employeeId => {
                 const employee = employeesMap[employeeId];
                 if (!employee) return '';
                 const empSanctions = sanctions.filter(s => s.employeeId === employeeId);
                 const empLate = empSanctions.filter(s => s.type === 'late').reduce((sum, s) => sum + (s.amount || 0), 0);
                 const empAbsence = empSanctions.filter(s => s.type === 'absence').reduce((sum, s) => sum + (s.amount || 0), 0);
                 const empOther = empSanctions.filter(s => !['late', 'absence'].includes(s.type)).reduce((sum, s) => sum + (s.amount || 0), 0);
                 const empTotal = empLate + empAbsence + empOther;
                 return `<tr><td>${employee.firstName} ${employee.lastName}</td><td>${employee.position || '-'}</td><td>${empSanctions.length}</td><td>${empTotal.toLocaleString('fr-FR')} ${currencySymbol}</td><td>${empLate.toLocaleString('fr-FR')} ${currencySymbol}</td><td>${empAbsence.toLocaleString('fr-FR')} ${currencySymbol}</td><td>${empOther.toLocaleString('fr-FR')} ${currencySymbol}</td></tr>`;
             }).join('');

              // Build report content
             let reportContent = `
                <div class="report-period"><p>Période: Du ${startDateTime.toLocaleDateString('fr-FR')} au ${endDateTime.toLocaleDateString('fr-FR')}</p></div>
                <div class="report-summary card mb-3"><div class="card-body"><h4>Résumé</h4><div class="summary-cards">
                    <div class="summary-card"><h4>Total Sanctions</h4><div class="summary-value">${totalAmount.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Retards</h4><div class="summary-value">${lateAmount.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Absences</h4><div class="summary-value">${absenceAmount.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Fautes & Autres</h4><div class="summary-value">${otherAmount.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Employés Concernés</h4><div class="summary-value">${employeeCount}</div></div>
                </div></div></div>`;

             if (sanctions.length > 0) {
                 reportContent += `<div class="report-section card mb-3"><div class="card-body"><h3>Liste des Sanctions</h3><div class="table-responsive"><table class="table"><thead><tr><th>Employé</th><th>Date</th><th>Type</th><th>Montant</th><th>Raison</th></tr></thead><tbody>${sanctionRowsHTML}</tbody></table></div></div></div>`;
                 reportContent += `<div class="report-section card mb-3"><div class="card-body"><h3>Résumé par Employé</h3><div class="table-responsive"><table class="table"><thead><tr><th>Employé</th><th>Poste</th><th>Nb Sanctions</th><th>Total</th><th>Retards</th><th>Absences</th><th>Fautes & Autres</th></tr></thead><tbody>${employeeSummaryRowsHTML}</tbody></table></div></div></div>`;
             } else {
                 reportContent += `<div class="report-section card mb-3"><div class="card-body"><h3>Liste des Sanctions</h3><p class="empty-message">Aucune sanction trouvée pour la période et les filtres sélectionnés.</p></div></div>`;
             }

             this.displayReport(reportTitle, reportContent);
             this.reportData = { title: reportTitle, type: 'sanctions', settings, currencySymbol, startDate: startDateTime, endDate: endDateTime, sanctionType, sanctions, employeesMap };

         } catch(error) {
             console.error("ReportsManager: Error generating sanctions report:", error);
             alert(`Erreur: ${error.message}`);
             this.displayReport("Erreur", `<p class="error-message">Impossible de générer le rapport. Erreur: ${error.message}</p>`);
         } finally {
              window.hideLoader();
         }
    },

    /**
     * Génère le rapport de dettes clients (Using DataManager)
     */
    generateDebtsReport: async function() {
         const startDateStr = document.getElementById('debts-report-start').value;
         const endDateStr = document.getElementById('debts-report-end').value;
         const unpaidOnly = document.getElementById('debts-report-unpaid-only').checked;

         if (!startDateStr || !endDateStr) {
             alert('Veuillez sélectionner une période.');
             return;
         }
         window.showLoader("Génération rapport dettes...");
         this.reportData = null;

          try {
             const reportTitle = `Rapport de Dettes Clients${unpaidOnly ? ' (Non Payées)' : ''}`;
             const startDateTime = new Date(startDateStr); startDateTime.setHours(0,0,0,0);
             const endDateTime = new Date(endDateStr); endDateTime.setHours(23,59,59,999);

             // Get data via DataManager
             const allDebts = await DataManager.debts.getAll();
             const settings = await DataManager.settings.get();
             const allEmployees = await DataManager.employees.getAll();

             if (!Array.isArray(allDebts)) { console.warn("Debts Report: Invalid debts data"); allDebts = []; }
             if (!Array.isArray(allEmployees)) { console.warn("Debts Report: Invalid employee data"); allEmployees = []; }
             const currencySymbol = settings?.currency || 'FCFA';
             const employeesMap = {};
             allEmployees.forEach(emp => { employeesMap[emp.id] = emp; });

             // Filter debts
             let debts = allDebts.filter(debt => {
                 try { const d=new Date(debt.date); return !isNaN(d) && d >= startDateTime && d <= endDateTime; } catch(e){ return false; }
             });
             if (unpaidOnly) {
                 debts = debts.filter(debt => !debt.isPaid);
             }

             // Calculate stats
             const totalDebtsAmount = debts.reduce((sum, d) => sum + (d.amount || 0), 0);
             const paidDebts = debts.filter(d => d.isPaid);
             const unpaidDebts = debts.filter(d => !d.isPaid);
             const totalPaid = paidDebts.reduce((sum, d) => sum + (d.amount || 0), 0);
             const totalUnpaid = unpaidDebts.reduce((sum, d) => sum + (d.amount || 0), 0);
             const employeeIds = [...new Set(debts.map(d => d.employeeId))];
             const employeeCount = employeeIds.length;
             const clientNames = [...new Set(debts.map(d => d.clientName))];
             const clientCount = clientNames.length;

             // Build HTML Rows
             const debtRowsHTML = debts.map(debt => {
                 const employee = employeesMap[debt.employeeId];
                 return `<tr><td>${employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu'}</td><td>${debt.clientName || '-'}</td><td>${new Date(debt.date).toLocaleDateString('fr-FR')}</td><td>${(debt.amount||0).toLocaleString('fr-FR')} ${currencySymbol}</td><td>${debt.description || '-'}</td><td><span class="badge ${debt.isPaid ? 'badge-success' : 'badge-warning'}">${debt.isPaid ? 'Payée' : 'Non payée'}</span></td></tr>`;
             }).join('');

             const employeeSummaryRowsHTML = employeeIds.map(employeeId => {
                 const employee = employeesMap[employeeId];
                 if (!employee) return '';
                 const empDebts = debts.filter(d => d.employeeId === employeeId);
                 const empPaid = empDebts.filter(d => d.isPaid).reduce((sum, d) => sum + (d.amount || 0), 0);
                 const empUnpaid = empDebts.filter(d => !d.isPaid).reduce((sum, d) => sum + (d.amount || 0), 0);
                 const empTotal = empPaid + empUnpaid;
                 return `<tr><td>${employee.firstName} ${employee.lastName}</td><td>${employee.position || '-'}</td><td>${empDebts.length}</td><td>${empTotal.toLocaleString('fr-FR')} ${currencySymbol}</td><td>${empPaid.toLocaleString('fr-FR')} ${currencySymbol}</td><td>${empUnpaid.toLocaleString('fr-FR')} ${currencySymbol}</td></tr>`;
             }).join('');

             const clientSummaryRowsHTML = clientNames.map(clientName => {
                  const clientDebts = debts.filter(d => d.clientName === clientName);
                  const clientPaid = clientDebts.filter(d => d.isPaid).reduce((sum, d) => sum + (d.amount || 0), 0);
                  const clientUnpaid = clientDebts.filter(d => !d.isPaid).reduce((sum, d) => sum + (d.amount || 0), 0);
                  const clientTotal = clientPaid + clientUnpaid;
                  return `<tr><td>${clientName || '-'}</td><td>${clientDebts.length}</td><td>${clientTotal.toLocaleString('fr-FR')} ${currencySymbol}</td><td>${clientPaid.toLocaleString('fr-FR')} ${currencySymbol}</td><td>${clientUnpaid.toLocaleString('fr-FR')} ${currencySymbol}</td></tr>`;
             }).join('');


              // Build report content
             let reportContent = `
                <div class="report-period"><p>Période: Du ${startDateTime.toLocaleDateString('fr-FR')} au ${endDateTime.toLocaleDateString('fr-FR')}</p></div>
                <div class="report-summary card mb-3"><div class="card-body"><h4>Résumé</h4><div class="summary-cards">
                    <div class="summary-card"><h4>Total Dettes</h4><div class="summary-value">${totalDebtsAmount.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Payées</h4><div class="summary-value">${totalPaid.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Non Payées</h4><div class="summary-value">${totalUnpaid.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Employés Resp.</h4><div class="summary-value">${employeeCount}</div></div>
                    <div class="summary-card"><h4>Clients Concernés</h4><div class="summary-value">${clientCount}</div></div>
                </div></div></div>`;

             if (debts.length > 0) {
                 reportContent += `<div class="report-section card mb-3"><div class="card-body"><h3>Liste des Dettes Clients${unpaidOnly ? ' Non Payées' : ''}</h3><div class="table-responsive"><table class="table"><thead><tr><th>Employé Resp.</th><th>Client</th><th>Date</th><th>Montant</th><th>Description</th><th>Statut</th></tr></thead><tbody>${debtRowsHTML}</tbody></table></div></div></div>`;
                 reportContent += `<div class="report-section card mb-3"><div class="card-body"><h3>Résumé par Employé</h3><div class="table-responsive"><table class="table"><thead><tr><th>Employé</th><th>Poste</th><th>Nb Dettes</th><th>Total</th><th>Payées</th><th>Non Payées</th></tr></thead><tbody>${employeeSummaryRowsHTML}</tbody></table></div></div></div>`;
                 reportContent += `<div class="report-section card mb-3"><div class="card-body"><h3>Résumé par Client</h3><div class="table-responsive"><table class="table"><thead><tr><th>Client</th><th>Nb Dettes</th><th>Total</th><th>Payées</th><th>Non Payées</th></tr></thead><tbody>${clientSummaryRowsHTML}</tbody></table></div></div></div>`;
             } else {
                 reportContent += `<div class="report-section card mb-3"><div class="card-body"><h3>Liste des Dettes Clients${unpaidOnly ? ' Non Payées' : ''}</h3><p class="empty-message">Aucune dette trouvée pour la période et les filtres sélectionnés.</p></div></div>`;
             }

             this.displayReport(reportTitle, reportContent);
             this.reportData = { title: reportTitle, type: 'debts', settings, currencySymbol, startDate: startDateTime, endDate: endDateTime, unpaidOnly, debts, employeesMap };

         } catch(error) {
             console.error("ReportsManager: Error generating debts report:", error);
             alert(`Erreur: ${error.message}`);
             this.displayReport("Erreur", `<p class="error-message">Impossible de générer le rapport. Erreur: ${error.message}</p>`);
         } finally {
              window.hideLoader();
         }
    },

    /**
     * Génère l'analyse annuelle (Using DataManager)
     */
    generateAnnualReport: async function() {
        const yearSelect = document.getElementById('annual-report-year');
        if (!yearSelect) return;
        const year = parseInt(yearSelect.value);

        window.showLoader(`Génération analyse annuelle ${year}...`);
        this.reportData = null;

        try {
            const reportTitle = `Analyse Annuelle ${year}`;

             // Fetch all data needed via DataManager
            const settings = await DataManager.settings.get();
            const allSalaries = await DataManager.salaries.getAll();
            const allAdvances = await DataManager.advances.getAll();
            const allSanctions = await DataManager.sanctions.getAll();
            // const allDebts = await DataManager.debts.getAll(); // Debts might not be needed for annual summary chart

            if (!Array.isArray(allSalaries)) { console.warn("Annual Report: Invalid salary data"); allSalaries = []; }
            if (!Array.isArray(allAdvances)) { console.warn("Annual Report: Invalid advances data"); allAdvances = []; }
            if (!Array.isArray(allSanctions)) { console.warn("Annual Report: Invalid sanctions data"); allSanctions = []; }
            // if (!Array.isArray(allDebts)) { console.warn("Annual Report: Invalid debts data"); allDebts = []; }
             const currencySymbol = settings?.currency || 'FCFA';

            // Filter data for the year
             const yearSalaries = allSalaries.filter(s => { try { return new Date(s.paymentDate).getFullYear() === year; } catch(e){return false;} });
             const yearAdvances = allAdvances.filter(a => { try { return new Date(a.date).getFullYear() === year; } catch(e){return false;} });
             const yearSanctions = allSanctions.filter(s => { try { return new Date(s.date).getFullYear() === year; } catch(e){return false;} });
             // const yearDebts = allDebts.filter(d => { try { return new Date(d.date).getFullYear() === year; } catch(e){return false;} });


            // Process data month by month
             const monthlyData = [];
             const months = [ /* ... month names ... */
                 "Jan", "Fév", "Mar", "Avr", "Mai", "Jui",
                 "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"
             ];
             for (let month = 0; month < 12; month++) {
                 const monthlySalaries = yearSalaries.filter(s => new Date(s.paymentDate).getMonth() === month);
                 const monthlyAdvances = yearAdvances.filter(a => new Date(a.date).getMonth() === month);
                 const monthlySanctions = yearSanctions.filter(s => new Date(s.date).getMonth() === month);
                 // const monthlyDebts = yearDebts.filter(d => new Date(d.date).getMonth() === month);

                 const totalBaseSalary = monthlySalaries.reduce((sum, s) => sum + (s.baseSalary || 0), 0);
                 const totalAdvances = monthlyAdvances.reduce((sum, a) => sum + (a.amount || 0), 0); // Use advances array
                 const totalSanctions = monthlySanctions.reduce((sum, s) => sum + (s.amount || 0), 0); // Use sanctions array
                 // const totalDebts = monthlyDebts.reduce((sum, d) => sum + (d.amount || 0), 0); // Use debts array
                 const totalNetSalary = monthlySalaries.reduce((sum, s) => sum + (s.netSalary || 0), 0);
                 const processedEmployees = monthlySalaries.length;

                 monthlyData.push({
                    month: months[month], monthIndex: month,
                    totalBaseSalary, totalAdvances, totalSanctions, /*totalDebts,*/ totalNetSalary, processedEmployees
                 });
             }

             // Calculate annual totals
             const annualTotalBaseSalary = monthlyData.reduce((sum, data) => sum + data.totalBaseSalary, 0);
             const annualTotalAdvances = monthlyData.reduce((sum, data) => sum + data.totalAdvances, 0);
             const annualTotalSanctions = monthlyData.reduce((sum, data) => sum + data.totalSanctions, 0);
             // const annualTotalDebts = monthlyData.reduce((sum, data) => sum + data.totalDebts, 0);
             const annualTotalNetSalary = monthlyData.reduce((sum, data) => sum + data.totalNetSalary, 0);

            // Build report content
            let reportContent = `
                <div class="report-summary card mb-3"><div class="card-body"><h4>Résumé Annuel ${year}</h4><div class="summary-cards">
                    <div class="summary-card"><h4>Total Salaires Base</h4><div class="summary-value">${annualTotalBaseSalary.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Total Avances</h4><div class="summary-value">${annualTotalAdvances.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Total Sanctions</h4><div class="summary-value">${annualTotalSanctions.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                    {/* <div class="summary-card"><h4>Total Dettes Clients</h4><div class="summary-value">${annualTotalDebts.toLocaleString('fr-FR')} ${currencySymbol}</div></div> */}
                    <div class="summary-card total"><h4>Total Salaires Nets</h4><div class="summary-value">${annualTotalNetSalary.toLocaleString('fr-FR')} ${currencySymbol}</div></div>
                </div></div></div>
                <div class="report-section card mb-3"><div class="card-body">
                    <h3>Résumé Mensuel ${year}</h3>
                    <div class="table-responsive">
                        <table class="table">
                            <thead><tr><th>Mois</th><th>Salaires Base</th><th>Avances</th><th>Sanctions</th><th>Salaires Nets</th><th>Employés Traités</th></tr></thead>
                            <tbody>
                                ${monthlyData.map(data => `
                                    <tr>
                                        <td>${data.month}</td>
                                        <td>${data.totalBaseSalary.toLocaleString('fr-FR')} ${currencySymbol}</td>
                                        <td>${data.totalAdvances.toLocaleString('fr-FR')} ${currencySymbol}</td>
                                        <td>${data.totalSanctions.toLocaleString('fr-FR')} ${currencySymbol}</td>
                                        {/* <td>${data.totalDebts.toLocaleString('fr-FR')} ${currencySymbol}</td> */}
                                        <td>${data.totalNetSalary.toLocaleString('fr-FR')} ${currencySymbol}</td>
                                        <td>${data.processedEmployees}</td>
                                    </tr>`).join('')}
                                <tr class="total-row">
                                    <td>TOTAL</td>
                                    <td>${annualTotalBaseSalary.toLocaleString('fr-FR')} ${currencySymbol}</td>
                                    <td>${annualTotalAdvances.toLocaleString('fr-FR')} ${currencySymbol}</td>
                                    <td>${annualTotalSanctions.toLocaleString('fr-FR')} ${currencySymbol}</td>
                                    {/* <td>${annualTotalDebts.toLocaleString('fr-FR')} ${currencySymbol}</td> */}
                                    <td>${annualTotalNetSalary.toLocaleString('fr-FR')} ${currencySymbol}</td>
                                    <td>-</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div></div>
                <div class="report-section card mb-3"><div class="card-body"><h3>Évolution Mensuelle ${year}</h3><div class="chart-container"><canvas id="annual-chart" style="height: 350px; width: 100%;"></canvas></div></div></div>
            `; // Use canvas for Chart.js

            this.displayReport(reportTitle, reportContent);
            this.generateAnnualChart(monthlyData, currencySymbol); // Call chart generation
            this.reportData = { title: reportTitle, type: 'annual', year, settings, currencySymbol, monthlyData }; // Simplified stored data

        } catch (error) {
            console.error("ReportsManager: Error generating annual report:", error);
            alert("Erreur lors de la génération de l'analyse annuelle.");
             this.displayReport("Erreur", `<p class="error-message">Impossible de générer le rapport. Erreur: ${error.message}</p>`);
        } finally {
             window.hideLoader();
        }
    },

    /**
     * Génère le graphique pour l'analyse annuelle (Requires Chart.js)
     */
    generateAnnualChart: function(monthlyData, currencySymbol) {
        const chartCanvas = document.getElementById('annual-chart');
        if (!chartCanvas || typeof Chart === 'undefined') {
             console.warn("Chart.js not found or canvas element missing.");
             const chartContainer = document.getElementById('annual-chart')?.parentElement; // Get container div
             if(chartContainer) {
                 chartContainer.innerHTML = `<div class="chart-placeholder"><i class="fas fa-chart-line"></i><p>Graphique indisponible (Chart.js manquant)</p></div>`;
             }
            return;
        }

        const ctx = chartCanvas.getContext('2d');

        // Destroy previous chart instance if it exists
         if (chartCanvas.chartInstance) {
             chartCanvas.chartInstance.destroy();
         }


        chartCanvas.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthlyData.map(d => d.month),
                datasets: [
                    {
                        label: `Salaires Nets (${currencySymbol})`,
                        data: monthlyData.map(d => d.totalNetSalary),
                        borderColor: 'rgba(76, 175, 80, 1)', // Success color
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        fill: true,
                        tension: 0.1,
                        yAxisID: 'ySalary',
                    },
                    {
                        label: `Avances (${currencySymbol})`,
                        data: monthlyData.map(d => d.totalAdvances),
                        borderColor: 'rgba(255, 152, 0, 1)', // Warning color
                        backgroundColor: 'transparent',
                        tension: 0.1,
                        yAxisID: 'ySalary', // Use the same axis for amounts
                    },
                     {
                        label: `Sanctions (${currencySymbol})`,
                        data: monthlyData.map(d => d.totalSanctions),
                        borderColor: 'rgba(244, 67, 54, 1)', // Danger color
                        backgroundColor: 'transparent',
                        tension: 0.1,
                         yAxisID: 'ySalary',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                 plugins: {
                    legend: { display: true, position: 'bottom', labels: { color: '#ccc'} },
                    tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(0,0,0,0.8)' }
                 },
                scales: {
                    x: { ticks: { color: '#ccc' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                    ySalary: { // Define the axis for salary amounts
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: `Montant (${currencySymbol})`, color: '#ccc'},
                        ticks: { color: '#ccc' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    }
                    // Add another Y axis if needed for employee count, etc.
                }
            }
        });
    },

    /**
     * Affiche le rapport généré (Synchronous DOM manipulation)
     */
    displayReport: function(title, content) {
         const reportDisplay = document.getElementById('report-display');
        const reportTitleEl = document.getElementById('report-title'); // Renamed variable
        const reportContentEl = document.getElementById('report-content'); // Renamed variable

        if (!reportDisplay || !reportTitleEl || !reportContentEl) return;

        reportTitleEl.textContent = title;
        reportContentEl.innerHTML = content;
        reportDisplay.style.display = 'block';
        // Scroll into view after content is rendered
         setTimeout(() => reportDisplay.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    },

    /**
     * Imprime le rapport actuel (Using DataManager)
     */
    printReport: async function() {
        if (!this.reportData) { alert("Aucun rapport à imprimer."); return; }

        window.showLoader("Préparation de l'impression...");
        try {
            // Get fresh settings via DataManager
            const settings = await DataManager.settings.get();
            const companyName = settings?.companyName || 'Le Sims';
            const reportContentHTML = document.getElementById('report-content')?.innerHTML || '<p>Erreur: Contenu du rapport manquant.</p>';

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${this.reportData.title}</title>
                    <style>
                         /* Basic Print Styles - Adjust as needed */
                         body { font-family: Arial, sans-serif; line-height: 1.4; color: #333; margin: 20px;}
                         .header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
                         .company-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
                         .report-title { font-size: 16px; margin-bottom: 5px; font-weight: bold; }
                         .report-date { font-size: 12px; color: #555; }
                         .report-content { margin-bottom: 20px; }
                         .summary-cards { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #eee; }
                         .summary-card { border: 1px solid #eee; border-radius: 4px; padding: 8px; flex: 1; min-width: 120px; background: #f9f9f9; }
                         .summary-card h4 { margin: 0 0 4px 0; font-size: 11px; color: #666; font-weight: normal; }
                         .summary-value { font-size: 14px; font-weight: bold; }
                         .summary-card.total .summary-value { color: #000; }
                         .report-section { margin-bottom: 20px; }
                         .report-section h3 { font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 10px; }
                         table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px; }
                         th, td { border: 1px solid #ddd; padding: 5px; text-align: left; vertical-align: top; }
                         th { background-color: #f2f2f2; font-weight: bold; }
                         tbody tr:nth-child(even) { background-color: #f9f9f9; }
                         .total-row td { font-weight: bold; background-color: #e9e9e9; }
                         .badge { display: inline-block; padding: 2px 5px; border-radius: 8px; font-size: 9px; font-weight: bold; text-transform: capitalize; }
                         .badge-success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
                         .badge-warning { background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
                         .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; text-align: center; font-size: 10px; color: #777; }
                         .chart-container, .report-actions { display: none !important; } /* Hide charts and actions in print */
                         @media print { @page { margin: 10mm; size: A4; } body { margin: 0; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="company-name">${companyName}</div>
                        <div class="report-title">${this.reportData.title}</div>
                        <div class="report-date">Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</div>
                    </div>
                    <div class="report-content">
                        ${reportContentHTML}
                    </div>
                    <div class="footer">
                        <p>${companyName} - Système de Gestion des Salaires</p>
                    </div>
                    <script> window.onload = function() { setTimeout(function(){ window.print(); window.close(); }, 250); } </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (error) {
            console.error("ReportsManager: Error preparing print:", error);
            alert(`Erreur: ${error.message}`);
        } finally {
             window.hideLoader();
        }
    },

    /**
     * Exporte le rapport actuel en CSV (Using DataManager)
     */
    exportReportCSV: async function() {
        if (!this.reportData) { alert("Aucun rapport à exporter."); return; }

        window.showLoader("Exportation CSV...");

        try {
            let csvContent = '';
            // Settings and currency already potentially stored in this.reportData
            const currencySymbol = this.reportData.currencySymbol || (await DataManager.settings.get())?.currency || 'FCFA';
            const settings = this.reportData.settings || await DataManager.settings.get(); // Get fresh if not stored

            // Add Header info
            csvContent += `"${this.reportData.title}"\n`;
            csvContent += `"Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}"\n\n`;

            // Specific content based on report type
            // --- Helper function for CSV rows ---
             const escapeCsv = (field) => `"${String(field || '').replace(/"/g, '""')}"`;
             const formatCsvNumber = (num) => String(num || 0); // No thousands separators for CSV

            switch (this.reportData.type) {
                case 'monthly':
                     const { month, year, salaries, advances, sanctions, debts, employeesMap, employeesWithoutSalary } = this.reportData;
                     // Summary can be recalculated or taken from DOM if needed
                     csvContent += '"Résumé Mois"\n'; // Simplified header
                     // Add specific summary data rows if desired...

                     if (salaries.length > 0) {
                         csvContent += '"Détail Salaires"\n';
                         const salaryHeaders = ["ID Employé","Prénom","Nom","Poste","Salaire Base","Avances","Sanctions","Dettes","Salaire Net","Statut"];
                         csvContent += salaryHeaders.map(escapeCsv).join(',') + '\n';
                         salaries.forEach(salary => {
                             const employee = employeesMap[salary.employeeId];
                             const row = [
                                 employee?.employeeId, employee?.firstName, employee?.lastName, employee?.position,
                                 formatCsvNumber(salary.baseSalary), formatCsvNumber(salary.advances), formatCsvNumber(salary.sanctions), formatCsvNumber(salary.debts), formatCsvNumber(salary.netSalary),
                                 salary.isPaid ? 'Payé' : 'En attente'
                             ];
                              csvContent += row.map(escapeCsv).join(',') + '\n';
                         });
                          csvContent += '\n';
                     }
                     // Add similar sections for advances, sanctions, debts, employeesWithoutSalary...
                     if (advances.length > 0) {
                         csvContent += '"Avances Accordées ce Mois"\n';
                         const advanceHeaders = ["ID Employé","Prénom","Nom","Date","Montant","Raison","Statut Remb."];
                          csvContent += advanceHeaders.map(escapeCsv).join(',') + '\n';
                          advances.forEach(a => {
                             const employee = employeesMap[a.employeeId];
                             const row = [ employee?.employeeId, employee?.firstName, employee?.lastName, new Date(a.date).toLocaleDateString('fr-FR'), formatCsvNumber(a.amount), a.reason, a.isPaid ? 'Remboursée' : 'Non remboursée'];
                              csvContent += row.map(escapeCsv).join(',') + '\n';
                          });
                           csvContent += '\n';
                     }
                     // Add sections for sanctions, debts, employeesWithoutSalary...
                    break;

                case 'employee':
                    const { employee, startDate, endDate, salaries: empSalaries, advances: empAdvances, sanctions: empSanctions, debts: empDebts } = this.reportData;
                    csvContent += '"Employé"\n';
                    csvContent += `"ID",${escapeCsv(employee.employeeId)}\n`;
                    csvContent += `"Nom",${escapeCsv(employee.firstName + ' ' + employee.lastName)}\n`;
                    csvContent += `"Poste",${escapeCsv(employee.position)}\n`;
                    csvContent += `"Période",${escapeCsv(`Du ${startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')}`)}\n\n`;

                    // Add summary rows...
                    if(empSalaries.length > 0){
                        csvContent += '"Détail Salaires"\n';
                        csvContent += ["Période","Salaire Base","Avances","Sanctions","Dettes","Salaire Net","Statut"].map(escapeCsv).join(',') + '\n';
                        empSalaries.forEach(s => {
                            const d = new Date(s.paymentDate);
                            const row = [`${this.getMonthName(d.getMonth())} ${d.getFullYear()}`, formatCsvNumber(s.baseSalary),formatCsvNumber(s.advances),formatCsvNumber(s.sanctions),formatCsvNumber(s.debts),formatCsvNumber(s.netSalary), s.isPaid?'Payé':'En attente'];
                            csvContent += row.map(escapeCsv).join(',') + '\n';
                        });
                        csvContent += '\n';
                    }
                    // Add similar sections for advances, sanctions, debts for the employee period...
                    break;

                 case 'advances':
                 case 'sanctions':
                 case 'debts':
                      // Export list and summaries similar to how they are built for display
                      // Example for advances:
                     const { advances: reportAdvances, employeesMap: reportEmpMap } = this.reportData;
                     csvContent += '"Liste"\n';
                     csvContent += ["ID Employé", "Prénom", "Nom", "Date", "Montant", "Raison", "Statut"].map(escapeCsv).join(',') + '\n';
                     reportAdvances.forEach(item => {
                         const emp = reportEmpMap[item.employeeId];
                         const status = this.reportData.type === 'advances' || this.reportData.type === 'debts' ? (item.isPaid ? 'Payée/Remb' : 'Non Payée/Remb') : ''; // Adjust status text
                         const date = new Date(item.date).toLocaleDateString('fr-FR');
                         const typeOrClient = this.reportData.type === 'sanctions' ? this.getSanctionTypeName(item.type) : item.clientName;
                         const reasonOrDesc = this.reportData.type === 'debts' ? item.description : item.reason;

                         const row = [emp?.employeeId, emp?.firstName, emp?.lastName, date, formatCsvNumber(item.amount), reasonOrDesc, status ]; // Adjust columns based on type
                         csvContent += row.map(escapeCsv).join(',') + '\n';
                     });
                     // Add summary tables if needed...
                     break;

                 case 'annual':
                     const { year: reportYear, monthlyData } = this.reportData;
                     csvContent += `"Résumé Annuel ${reportYear}"\n`;
                     // Add annual totals...
                     csvContent += '\n"Résumé Mensuel"\n';
                     csvContent += ["Mois","Salaires Base","Avances","Sanctions","Salaires Nets","Employés Traités"].map(escapeCsv).join(',') + '\n'; // Adjusted headers
                     monthlyData.forEach(d => {
                        const row = [ d.month, formatCsvNumber(d.totalBaseSalary), formatCsvNumber(d.totalAdvances), formatCsvNumber(d.totalSanctions), formatCsvNumber(d.totalNetSalary), d.processedEmployees ];
                        csvContent += row.map(escapeCsv).join(',') + '\n';
                     });
                     break;

                default:
                    csvContent += '"Type de rapport non exportable"\n';
                    break;
            }

            // Create Blob and download
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.reportData.title.replace(/[\s/]/g, '_')}.csv`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

        } catch (error) {
            console.error("ReportsManager: Error exporting report CSV:", error);
            alert(`Erreur: ${error.message}`);
        } finally {
             window.hideLoader();
        }
    },

    /**
     * Ferme le rapport actuel (Synchronous)
     */
    closeReport: function() {
         const reportDisplay = document.getElementById('report-display');
        if (!reportDisplay) return;
        reportDisplay.style.display = 'none';
        reportDisplay.querySelector('#report-content').innerHTML = ''; // Clear content
        reportDisplay.querySelector('#report-title').textContent = ''; // Clear title
        this.reportData = null; // Reset stored data
    },

    /**
     * Attache les événements aux éléments de la page (using delegation)
     */
    bindEvents: function() {
        const reportsPage = document.getElementById('reports-page');

        // Listener for generate buttons and report actions
        const reportAreaClickHandler = async (event) => {
            const target = event.target;
            const generateButton = target.closest('button[id^="generate-"]');
            const printButton = target.closest('#print-report');
            const exportButton = target.closest('#export-report');
            const closeButton = target.closest('#close-report');

            try {
                 if (generateButton) {
                     switch(generateButton.id) {
                         case 'generate-monthly-report': await this.generateMonthlyReport(); break;
                         case 'generate-employee-report': await this.generateEmployeeReport(); break;
                         case 'generate-advances-report': await this.generateAdvancesReport(); break;
                         case 'generate-sanctions-report': await this.generateSanctionsReport(); break;
                         case 'generate-debts-report': await this.generateDebtsReport(); break;
                         case 'generate-annual-report': await this.generateAnnualReport(); break;
                     }
                 } else if (printButton) {
                    await this.printReport();
                 } else if (exportButton) {
                    await this.exportReportCSV();
                 } else if (closeButton) {
                    this.closeReport();
                 }
             } catch (error) {
                 console.error("ReportsManager: Error in report action handler:", error);
                 alert("Une erreur s'est produite lors de l'action sur le rapport.");
                 window.hideLoader(); // Ensure loader is hidden on error
             }
        };

        // Attach listener more broadly to handle clicks anywhere relevant
        document.addEventListener('click', (event) => {
             // Only handle clicks if they originate from within the reports page or the report display area
             const reportsPage = document.getElementById('reports-page');
             const reportDisplay = document.getElementById('report-display');
             if ((reportsPage && reportsPage.contains(event.target)) || (reportDisplay && reportDisplay.contains(event.target))) {
                 reportAreaClickHandler(event);
             }
        });
    },

     // Helper to get sanction type name (duplicate from sanctions.js for standalone use)
     getSanctionTypeName: function(type) {
          switch (type) {
             case 'late': return 'Retard';
             case 'absence': return 'Absence';
             case 'misconduct': return 'Faute';
             case 'other': return 'Autre';
             default: return type || 'Inconnu';
         }
    },
     // Helper to get month name (duplicate from salaries.js for standalone use)
      getMonthName: function(monthIndex) {
         const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
         return months[monthIndex] || '';
    }

};

// Expose to global scope
window.ReportsManager = ReportsManager;