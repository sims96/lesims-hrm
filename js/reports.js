/**
 * reports.js
 * Génération de rapports et analyses
 * Application de Gestion des Salaires Le Sims
 */

const ReportsManager = {
    reportData: null, // Variable to store data for export/print

    /**
     * Initialisation du module de génération de rapports
     */
    init: async function() { // Added async
        await this.loadReportsPage(); // Added await
        this.bindEvents(); // Assuming bindEvents remains synchronous
    },

    /**
     * Charge la page de génération de rapports
     */
    loadReportsPage: async function() { // Added async
        const reportsPage = document.getElementById('reports-page');

        if (!reportsPage) return;

        try {
            // Récupérer les paramètres
            const settings = await DB.settings.get(); // Added await
            const currencySymbol = settings.currency || 'FCFA';

            // Générer les options des employés (maintenant async)
            const employeeOptionsHTML = await this.generateEmployeeOptions(); // Added await

            // Construction de la page
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

                    {/* ... Other report cards ... */}
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

                <div id="report-display" class="report-display" style="display: none;">
                    <div class="report-header">
                        <h2 id="report-title">Titre du Rapport</h2>
                        <div class="report-actions">
                            <button id="print-report" class="btn btn-outline">
                                <i class="fas fa-print"></i> Imprimer
                            </button>
                            <button id="export-report" class="btn btn-outline">
                                <i class="fas fa-file-export"></i> Exporter (CSV)
                            </button>
                            <button id="close-report" class="btn btn-outline">
                                <i class="fas fa-times"></i> Fermer
                            </button>
                        </div>
                    </div>
                    <div id="report-content" class="report-content">
                        </div>
                </div>
            `;

            // Initialiser les dates par défaut
            this.initDefaultDates();
        } catch (error) {
            console.error("Error loading reports page:", error);
            reportsPage.innerHTML = `<p class="error-message">Erreur lors du chargement de la page des rapports.</p>`;
        }
    },

    /**
     * Initialise les dates par défaut pour les filtres
     */
    initDefaultDates: function() {
        // ... (no changes needed here, assuming synchronous) ...
        // Date courante
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();

        // Début du mois courant
        const startOfMonth = new Date(currentYear, currentMonth, 1);
        // Fin du mois courant
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

        // Format des dates pour les inputs
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
     * Génère les options pour la sélection du mois
     */
    generateMonthOptions: function() {
        // ... (no changes needed here, it's synchronous) ...
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
     * Génère les options pour la sélection de l'année
     */
    generateYearOptions: function() {
        // ... (no changes needed here, it's synchronous) ...
        const currentYear = new Date().getFullYear();
        let options = '';

        // Générer des options pour les 3 dernières années et les 2 prochaines
        for (let year = currentYear - 3; year <= currentYear + 2; year++) {
            options += `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`;
        }

        return options;
    },

    /**
     * Génère les options pour la sélection des employés
     */
    generateEmployeeOptions: async function() { // Added async
        try {
            const employees = await DB.employees.getAll(); // Added await

            // ----> ADDED CHECK <----
            if (!Array.isArray(employees)) {
                console.error("Failed to load employees for options:", employees);
                return '<option value="">Erreur chargement employés</option>';
            }
            // ----> END CHECK <----

            if (employees.length === 0) {
                return '<option value="">Aucun employé disponible</option>';
            }

            // Trier les employés par nom
            employees.sort((a, b) => {
                const nameA = `${a.lastName} ${a.firstName}`;
                const nameB = `${b.lastName} ${b.firstName}`;
                return nameA.localeCompare(nameB);
            });

            return employees.map(employee =>
                `<option value="${employee.id}">${employee.firstName} ${employee.lastName} - ${employee.position || 'Sans poste'}</option>`
            ).join('');
        } catch (error) {
            console.error("Error generating employee options:", error);
            return '<option value="">Erreur chargement employés</option>';
        }
    },

    /**
     * Génère le rapport mensuel
     */
    generateMonthlyReport: async function() { // Added async
        const monthSelect = document.getElementById('monthly-report-month');
        const yearSelect = document.getElementById('monthly-report-year');

        if (!monthSelect || !yearSelect) return;

        const month = parseInt(monthSelect.value);
        const year = parseInt(yearSelect.value);

        // Show loader maybe? window.showLoader('Génération du rapport mensuel...');

        try {
            // Titre du rapport
            const months = [
                "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
                "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
            ];
            const reportTitle = `Rapport Mensuel - ${months[month]} ${year}`;

            // Récupérer les données pour le mois sélectionné
            let salaries = await DB.salaries.getByMonth(year, month); // Added await
            // ----> ADDED CHECK <----
            if (!Array.isArray(salaries)) {
                console.error("Failed to load salaries for monthly report:", salaries);
                salaries = [];
            }
            // ----> END CHECK <----


            // Dates de début et fin du mois
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);

            // Récupérer les avances, sanctions et dettes du mois
            let allAdvances = await DB.advances.getAll(); // Added await
            if (!Array.isArray(allAdvances)) { console.error("Failed to load advances"); allAdvances = []; }
            const advances = allAdvances.filter(advance => {
                const advanceDate = new Date(advance.date);
                return advanceDate >= startDate && advanceDate <= endDate;
            });

            let allSanctions = await DB.sanctions.getAll(); // Added await
            if (!Array.isArray(allSanctions)) { console.error("Failed to load sanctions"); allSanctions = []; }
            const sanctions = allSanctions.filter(sanction => {
                const sanctionDate = new Date(sanction.date);
                return sanctionDate >= startDate && sanctionDate <= endDate;
            });

            let allDebts = await DB.debts.getAll(); // Added await
            if (!Array.isArray(allDebts)) { console.error("Failed to load debts"); allDebts = []; }
            const debts = allDebts.filter(debt => {
                const debtDate = new Date(debt.date);
                return debtDate >= startDate && debtDate <= endDate;
            });

            // Récupérer tous les employés
            let employees = await DB.employees.getAll(); // Added await
             if (!Array.isArray(employees)) {
                 console.error("Failed to load employees for monthly report");
                 employees = [];
             }


            // Récupérer les paramètres
            const settings = await DB.settings.get(); // Added await
            const currencySymbol = settings.currency || 'FCFA';

            // Calculer les totaux
            const totalBaseSalary = salaries.reduce((sum, salary) => sum + salary.baseSalary, 0);
            const totalAdvances = salaries.reduce((sum, salary) => sum + salary.advances, 0);
            const totalSanctions = salaries.reduce((sum, salary) => sum + salary.sanctions, 0);
            const totalDebts = salaries.reduce((sum, salary) => sum + salary.debts, 0);
            const totalNetSalary = salaries.reduce((sum, salary) => sum + salary.netSalary, 0);

            // Employés sans salaire traité
            const employeesWithSalary = new Set(salaries.map(salary => salary.employeeId));
            const employeesWithoutSalary = employees.filter(employee => !employeesWithSalary.has(employee.id));

            // Construire le contenu du rapport HTML (using Promise.all for getById efficiency)
            const salaryRows = await Promise.all(salaries.map(async (salary) => {
                const employee = await DB.employees.getById(salary.employeeId);
                if (!employee) return '';
                return `
                    <tr>
                        <td>${employee.firstName} ${employee.lastName}</td>
                        <td>${employee.position || '-'}</td>
                        <td>${salary.baseSalary.toLocaleString()} ${currencySymbol}</td>
                        <td>${salary.advances.toLocaleString()} ${currencySymbol}</td>
                        <td>${salary.sanctions.toLocaleString()} ${currencySymbol}</td>
                        <td>${salary.debts.toLocaleString()} ${currencySymbol}</td>
                        <td class="${salary.netSalary >= 0 ? 'text-success' : 'text-danger'}">
                            ${salary.netSalary.toLocaleString()} ${currencySymbol}
                        </td>
                        <td>
                            <span class="badge ${salary.isPaid ? 'badge-success' : 'badge-warning'}">
                                ${salary.isPaid ? 'Payé' : 'En attente'}
                            </span>
                        </td>
                    </tr>
                `;
            }));

             const advanceRows = await Promise.all(advances.map(async (advance) => {
                 const employee = await DB.employees.getById(advance.employeeId);
                 if (!employee) return '';
                 return `
                     <tr>
                         <td>${employee.firstName} ${employee.lastName}</td>
                         <td>${new Date(advance.date).toLocaleDateString()}</td>
                         <td>${advance.amount.toLocaleString()} ${currencySymbol}</td>
                         <td>${advance.reason || '-'}</td>
                         <td>
                             <span class="badge ${advance.isPaid ? 'badge-success' : 'badge-warning'}">
                                 ${advance.isPaid ? 'Remboursée' : 'Non remboursée'}
                             </span>
                         </td>
                     </tr>
                 `;
             }));

             const sanctionRows = await Promise.all(sanctions.map(async (sanction) => {
                 const employee = await DB.employees.getById(sanction.employeeId);
                 if (!employee) return '';
                 let sanctionType = '';
                 switch (sanction.type) {
                     case 'late': sanctionType = 'Retard'; break;
                     case 'absence': sanctionType = 'Absence'; break;
                     case 'misconduct': sanctionType = 'Faute'; break;
                     case 'other': sanctionType = 'Autre'; break;
                     default: sanctionType = sanction.type;
                 }
                 return `
                     <tr>
                         <td>${employee.firstName} ${employee.lastName}</td>
                         <td>${new Date(sanction.date).toLocaleDateString()}</td>
                         <td>${sanctionType}</td>
                         <td>${sanction.amount.toLocaleString()} ${currencySymbol}</td>
                         <td>${sanction.reason || '-'}</td>
                     </tr>
                 `;
             }));

             const debtRows = await Promise.all(debts.map(async (debt) => {
                 const employee = await DB.employees.getById(debt.employeeId);
                 if (!employee) return '';
                 return `
                     <tr>
                         <td>${employee.firstName} ${employee.lastName}</td>
                         <td>${debt.clientName || '-'}</td>
                         <td>${new Date(debt.date).toLocaleDateString()}</td>
                         <td>${debt.amount.toLocaleString()} ${currencySymbol}</td>
                         <td>${debt.description || '-'}</td>
                         <td>
                             <span class="badge ${debt.isPaid ? 'badge-success' : 'badge-warning'}">
                                 ${debt.isPaid ? 'Payée' : 'Non payée'}
                             </span>
                         </td>
                     </tr>
                 `;
             }));


            // Build final report content
            let reportContent = `
                <div class="report-summary">
                    {/* ... summary cards ... */}
                    <div class="summary-cards">
                        <div class="summary-card">
                            <h4>Employés</h4>
                            <div class="summary-value">${salaries.length} / ${employees.length}</div>
                        </div>
                        <div class="summary-card">
                            <h4>Salaires de Base</h4>
                            <div class="summary-value">${totalBaseSalary.toLocaleString()} ${currencySymbol}</div>
                        </div>
                        <div class="summary-card">
                            <h4>Avances</h4>
                            <div class="summary-value">${totalAdvances.toLocaleString()} ${currencySymbol}</div>
                        </div>
                        <div class="summary-card">
                            <h4>Sanctions</h4>
                            <div class="summary-value">${totalSanctions.toLocaleString()} ${currencySymbol}</div>
                        </div>
                        <div class="summary-card">
                            <h4>Dettes Clients</h4>
                            <div class="summary-value">${totalDebts.toLocaleString()} ${currencySymbol}</div>
                        </div>
                        <div class="summary-card total">
                            <h4>Salaires Nets</h4>
                            <div class="summary-value">${totalNetSalary.toLocaleString()} ${currencySymbol}</div>
                        </div>
                    </div>
                </div>

                <div class="report-section">
                    <h3>Détail des Salaires</h3>
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Employé</th><th>Poste</th><th>Salaire de Base</th><th>Avances</th><th>Sanctions</th><th>Dettes Clients</th><th>Salaire Net</th><th>Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${salaryRows.join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            if (employeesWithoutSalary.length > 0) {
                 reportContent += `
                     <div class="report-section">
                         <h3>Employés sans Salaire Traité</h3>
                         <div class="table-responsive">
                             <table class="table">
                                 <thead>
                                     <tr>
                                         <th>Employé</th><th>Poste</th><th>Salaire de Base</th><th>Date d'Embauche</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     ${employeesWithoutSalary.map(employee => `
                                         <tr>
                                             <td>${employee.firstName} ${employee.lastName}</td>
                                             <td>${employee.position || '-'}</td>
                                             <td>${employee.baseSalary ? employee.baseSalary.toLocaleString() + ' ' + currencySymbol : '-'}</td>
                                             <td>${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : '-'}</td>
                                         </tr>
                                     `).join('')}
                                 </tbody>
                             </table>
                         </div>
                     </div>
                 `;
             }

            if (advances.length > 0) {
                 reportContent += `
                     <div class="report-section">
                         <h3>Avances sur Salaire du Mois</h3>
                         <div class="table-responsive">
                             <table class="table">
                                 <thead>
                                     <tr>
                                         <th>Employé</th><th>Date</th><th>Montant</th><th>Raison</th><th>Statut</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     ${advanceRows.join('')}
                                 </tbody>
                             </table>
                         </div>
                     </div>
                 `;
             }

            if (sanctions.length > 0) {
                 reportContent += `
                     <div class="report-section">
                         <h3>Sanctions du Mois</h3>
                         <div class="table-responsive">
                             <table class="table">
                                 <thead>
                                     <tr>
                                         <th>Employé</th><th>Date</th><th>Type</th><th>Montant</th><th>Raison</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     ${sanctionRows.join('')}
                                 </tbody>
                             </table>
                         </div>
                     </div>
                 `;
             }

            if (debts.length > 0) {
                 reportContent += `
                     <div class="report-section">
                         <h3>Dettes Clients du Mois</h3>
                         <div class="table-responsive">
                             <table class="table">
                                 <thead>
                                     <tr>
                                         <th>Employé</th><th>Client</th><th>Date</th><th>Montant</th><th>Description</th><th>Statut</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     ${debtRows.join('')}
                                 </tbody>
                             </table>
                         </div>
                     </div>
                 `;
             }

            // Afficher le rapport
            this.displayReport(reportTitle, reportContent);

            // Stocker les données pour l'exportation
            this.reportData = {
                title: reportTitle,
                type: 'monthly',
                month,
                year,
                salaries,
                advances,
                sanctions,
                debts,
                employees,
                employeesWithoutSalary
            };
        } catch (error) {
            console.error("Error generating monthly report:", error);
            alert("Erreur lors de la génération du rapport mensuel.");
            this.displayReport("Erreur", `<p class="error-message">Impossible de générer le rapport. Erreur: ${error.message}</p>`);
        } finally {
            // Hide loader maybe? window.hideLoader();
        }
    },

    /**
     * Génère le rapport par employé
     */
    generateEmployeeReport: async function() { // Added async
        const employeeId = document.getElementById('employee-report-id').value;
        const startDateStr = document.getElementById('employee-report-start').value;
        const endDateStr = document.getElementById('employee-report-end').value;

        if (!employeeId || !startDateStr || !endDateStr) {
            alert('Veuillez sélectionner un employé et une période pour générer le rapport.');
            return;
        }

        try {
            // Récupérer l'employé
            const employee = await DB.employees.getById(employeeId); // Added await
            if (!employee) {
                alert('Employé introuvable.');
                return;
            }

            // Titre du rapport
            const reportTitle = `Rapport de l'Employé - ${employee.firstName} ${employee.lastName}`;

            // Convertir les dates
            const startDateTime = new Date(startDateStr);
            const endDateTime = new Date(endDateStr);
            endDateTime.setHours(23, 59, 59, 999); // Fin de journée

            // Récupérer les données pour la période sélectionnée
            let allSalaries = await DB.salaries.getAll(); // Added await
             if (!Array.isArray(allSalaries)) { console.error("Failed to load salaries"); allSalaries = []; }
             const salaries = allSalaries.filter(salary => {
                 const salaryDate = new Date(salary.paymentDate);
                 return salary.employeeId === employeeId && salaryDate >= startDateTime && salaryDate <= endDateTime;
             });

             let allAdvances = await DB.advances.getAll(); // Added await
             if (!Array.isArray(allAdvances)) { console.error("Failed to load advances"); allAdvances = []; }
             const advances = allAdvances.filter(advance => {
                 const advanceDate = new Date(advance.date);
                 return advance.employeeId === employeeId && advanceDate >= startDateTime && advanceDate <= endDateTime;
             });

             let allSanctions = await DB.sanctions.getAll(); // Added await
             if (!Array.isArray(allSanctions)) { console.error("Failed to load sanctions"); allSanctions = []; }
             const sanctions = allSanctions.filter(sanction => {
                 const sanctionDate = new Date(sanction.date);
                 return sanction.employeeId === employeeId && sanctionDate >= startDateTime && sanctionDate <= endDateTime;
             });

             let allDebts = await DB.debts.getAll(); // Added await
             if (!Array.isArray(allDebts)) { console.error("Failed to load debts"); allDebts = []; }
             const debts = allDebts.filter(debt => {
                 const debtDate = new Date(debt.date);
                 return debt.employeeId === employeeId && debtDate >= startDateTime && debtDate <= endDateTime;
             });


            // Récupérer les paramètres
            const settings = await DB.settings.get(); // Added await
            const currencySymbol = settings.currency || 'FCFA';

             // Calculer les totaux
            const totalBaseSalary = salaries.reduce((sum, salary) => sum + salary.baseSalary, 0);
            const totalAdvances = advances.reduce((sum, advance) => sum + advance.amount, 0);
            const totalSanctions = sanctions.reduce((sum, sanction) => sum + sanction.amount, 0);
            const totalDebts = debts.reduce((sum, debt) => sum + debt.amount, 0);
            const totalNetSalary = salaries.reduce((sum, salary) => sum + salary.netSalary, 0);


            // Construire le contenu du rapport
            let reportContent = `
                <div class="employee-profile">
                    {/* ... profile header ... */}
                    <div class="employee-profile-header">
                        <div class="employee-avatar">
                            <span>${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}</span>
                        </div>
                        <div class="employee-profile-info">
                            <h2>${employee.firstName} ${employee.lastName}</h2>
                            <p>${employee.position || 'Poste non spécifié'}</p>
                            <div class="employee-contact">
                                ${employee.email ? `<p><i class="fas fa-envelope"></i> ${employee.email}</p>` : ''}
                                ${employee.phone ? `<p><i class="fas fa-phone"></i> ${employee.phone}</p>` : ''}
                            </div>
                        </div>
                    </div>
                     <div class="employee-details">
                        <div class="detail-row">
                            <div class="detail-label">ID Employé:</div>
                            <div class="detail-value">${employee.employeeId || '-'}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Salaire de Base:</div>
                            <div class="detail-value">${employee.baseSalary ? `${employee.baseSalary.toLocaleString()} ${currencySymbol}` : '-'}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Date d'Embauche:</div>
                            <div class="detail-value">${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : '-'}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Période du Rapport:</div>
                            <div class="detail-value">Du ${new Date(startDateStr).toLocaleDateString()} au ${new Date(endDateStr).toLocaleDateString()}</div>
                        </div>
                    </div>
                </div>

                <div class="report-summary">
                    {/* ... summary cards ... */}
                    <div class="summary-cards">
                        <div class="summary-card">
                            <h4>Salaires Traités</h4>
                            <div class="summary-value">${salaries.length}</div>
                        </div>
                        <div class="summary-card">
                            <h4>Avances</h4>
                            <div class="summary-value">${totalAdvances.toLocaleString()} ${currencySymbol}</div>
                        </div>
                        <div class="summary-card">
                            <h4>Sanctions</h4>
                            <div class="summary-value">${totalSanctions.toLocaleString()} ${currencySymbol}</div>
                        </div>
                        <div class="summary-card">
                            <h4>Dettes Clients</h4>
                            <div class="summary-value">${totalDebts.toLocaleString()} ${currencySymbol}</div>
                        </div>
                        <div class="summary-card total">
                            <h4>Total Net Reçu</h4>
                            <div class="summary-value">${totalNetSalary.toLocaleString()} ${currencySymbol}</div>
                        </div>
                    </div>
                </div>
            `;

            // Add sections for salaries, advances, sanctions, debts similar to monthly report, but filtered for the employee and period
             if (salaries.length > 0) {
                reportContent += `
                    <div class="report-section">
                        <h3>Détail des Salaires</h3>
                        <div class="table-responsive">
                            <table class="table">
                                <thead><tr><th>Période</th><th>Salaire de Base</th><th>Avances</th><th>Sanctions</th><th>Dettes Clients</th><th>Salaire Net</th><th>Statut</th></tr></thead>
                                <tbody>
                                    ${salaries.map(salary => {
                                        const paymentDate = new Date(salary.paymentDate);
                                        const month = paymentDate.toLocaleString('fr-FR', { month: 'long' });
                                        const year = paymentDate.getFullYear();
                                        return `
                                            <tr>
                                                <td>${month} ${year}</td>
                                                <td>${salary.baseSalary.toLocaleString()} ${currencySymbol}</td>
                                                <td>${salary.advances.toLocaleString()} ${currencySymbol}</td>
                                                <td>${salary.sanctions.toLocaleString()} ${currencySymbol}</td>
                                                <td>${salary.debts.toLocaleString()} ${currencySymbol}</td>
                                                <td class="${salary.netSalary >= 0 ? 'text-success' : 'text-danger'}">${salary.netSalary.toLocaleString()} ${currencySymbol}</td>
                                                <td><span class="badge ${salary.isPaid ? 'badge-success' : 'badge-warning'}">${salary.isPaid ? 'Payé' : 'En attente'}</span></td>
                                            </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>`;
            } else {
                 reportContent += `<div class="report-section"><h3>Détail des Salaires</h3><p class="empty-message">Aucun salaire traité pour cet employé sur la période sélectionnée.</p></div>`;
            }

             if (advances.length > 0) {
                 reportContent += `
                     <div class="report-section">
                         <h3>Avances sur Salaire</h3>
                         <div class="table-responsive">
                             <table class="table">
                                 <thead><tr><th>Date</th><th>Montant</th><th>Raison</th><th>Statut</th></tr></thead>
                                 <tbody>
                                     ${advances.map(advance => `
                                         <tr>
                                             <td>${new Date(advance.date).toLocaleDateString()}</td>
                                             <td>${advance.amount.toLocaleString()} ${currencySymbol}</td>
                                             <td>${advance.reason || '-'}</td>
                                             <td><span class="badge ${advance.isPaid ? 'badge-success' : 'badge-warning'}">${advance.isPaid ? 'Remboursée' : 'Non remboursée'}</span></td>
                                         </tr>`).join('')}
                                 </tbody>
                             </table>
                         </div>
                     </div>`;
             }

             if (sanctions.length > 0) {
                 reportContent += `
                     <div class="report-section">
                         <h3>Sanctions et Pénalités</h3>
                         <div class="table-responsive">
                             <table class="table">
                                 <thead><tr><th>Date</th><th>Type</th><th>Montant</th><th>Raison</th></tr></thead>
                                 <tbody>
                                     ${sanctions.map(sanction => {
                                         let sanctionType = '';
                                         switch (sanction.type) {
                                             case 'late': sanctionType = 'Retard'; break;
                                             case 'absence': sanctionType = 'Absence'; break;
                                             case 'misconduct': sanctionType = 'Faute'; break;
                                             case 'other': sanctionType = 'Autre'; break;
                                             default: sanctionType = sanction.type;
                                         }
                                         return `
                                             <tr>
                                                 <td>${new Date(sanction.date).toLocaleDateString()}</td>
                                                 <td>${sanctionType}</td>
                                                 <td>${sanction.amount.toLocaleString()} ${currencySymbol}</td>
                                                 <td>${sanction.reason || '-'}</td>
                                             </tr>`;
                                     }).join('')}
                                 </tbody>
                             </table>
                         </div>
                     </div>`;
             }

              if (debts.length > 0) {
                 reportContent += `
                     <div class="report-section">
                         <h3>Dettes Clients</h3>
                         <div class="table-responsive">
                             <table class="table">
                                 <thead><tr><th>Date</th><th>Client</th><th>Montant</th><th>Description</th><th>Statut</th></tr></thead>
                                 <tbody>
                                     ${debts.map(debt => `
                                         <tr>
                                             <td>${new Date(debt.date).toLocaleDateString()}</td>
                                             <td>${debt.clientName || '-'}</td>
                                             <td>${debt.amount.toLocaleString()} ${currencySymbol}</td>
                                             <td>${debt.description || '-'}</td>
                                             <td><span class="badge ${debt.isPaid ? 'badge-success' : 'badge-warning'}">${debt.isPaid ? 'Payée' : 'Non payée'}</span></td>
                                         </tr>`).join('')}
                                 </tbody>
                             </table>
                         </div>
                     </div>`;
             }


            // Afficher le rapport
            this.displayReport(reportTitle, reportContent);

            // Stocker les données pour l'exportation
            this.reportData = {
                title: reportTitle,
                type: 'employee',
                employee,
                startDate: startDateTime,
                endDate: endDateTime,
                salaries,
                advances,
                sanctions,
                debts
            };
        } catch (error) {
            console.error("Error generating employee report:", error);
            alert("Erreur lors de la génération du rapport employé.");
             this.displayReport("Erreur", `<p class="error-message">Impossible de générer le rapport. Erreur: ${error.message}</p>`);
        }
    },

    /**
     * Génère le rapport d'avances
     */
    generateAdvancesReport: async function() { // Added async
        const startDateStr = document.getElementById('advances-report-start').value;
        const endDateStr = document.getElementById('advances-report-end').value;
        const unpaidOnly = document.getElementById('advances-report-unpaid-only').checked;

        if (!startDateStr || !endDateStr) {
            alert('Veuillez sélectionner une période pour générer le rapport.');
            return;
        }

         try {
             const reportTitle = `Rapport d'Avances sur Salaire${unpaidOnly ? ' (Non Remboursées)' : ''}`;
             const startDateTime = new Date(startDateStr);
             const endDateTime = new Date(endDateStr);
             endDateTime.setHours(23, 59, 59, 999);

             let allAdvances = await DB.advances.getAll(); // Added await
             if (!Array.isArray(allAdvances)) { console.error("Failed to load advances"); allAdvances = []; }

             let advances = allAdvances.filter(advance => {
                 const advanceDate = new Date(advance.date);
                 return advanceDate >= startDateTime && advanceDate <= endDateTime;
             });

             if (unpaidOnly) {
                 advances = advances.filter(advance => !advance.isPaid);
             }

             const settings = await DB.settings.get(); // Added await
             const currencySymbol = settings.currency || 'FCFA';

             const totalAdvances = advances.reduce((sum, advance) => sum + advance.amount, 0);
             const paidAdvances = advances.filter(advance => advance.isPaid);
             const unpaidAdvances = advances.filter(advance => !advance.isPaid);
             const totalPaid = paidAdvances.reduce((sum, advance) => sum + advance.amount, 0);
             const totalUnpaid = unpaidAdvances.reduce((sum, advance) => sum + advance.amount, 0);
             const employeeIds = new Set(advances.map(advance => advance.employeeId));
             const employeeCount = employeeIds.size;

              // Resolve employee names asynchronously
             const advanceRows = await Promise.all(advances.map(async (advance) => {
                 const employee = await DB.employees.getById(advance.employeeId);
                 return `
                     <tr>
                         <td>${employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu'}</td>
                         <td>${new Date(advance.date).toLocaleDateString()}</td>
                         <td>${advance.amount.toLocaleString()} ${currencySymbol}</td>
                         <td>${advance.reason || '-'}</td>
                         <td><span class="badge ${advance.isPaid ? 'badge-success' : 'badge-warning'}">${advance.isPaid ? 'Remboursée' : 'Non remboursée'}</span></td>
                     </tr>`;
             }));

             const employeeSummaryRows = await Promise.all(Array.from(employeeIds).map(async (employeeId) => {
                 const employee = await DB.employees.getById(employeeId);
                 if (!employee) return '';
                 const employeeAdvances = advances.filter(advance => advance.employeeId === employeeId);
                 const employeePaidAdvances = employeeAdvances.filter(advance => advance.isPaid);
                 const employeeUnpaidAdvances = employeeAdvances.filter(advance => !advance.isPaid);
                 const employeeTotal = employeeAdvances.reduce((sum, advance) => sum + advance.amount, 0);
                 const employeePaid = employeePaidAdvances.reduce((sum, advance) => sum + advance.amount, 0);
                 const employeeUnpaid = employeeUnpaidAdvances.reduce((sum, advance) => sum + advance.amount, 0);
                 return `
                     <tr>
                         <td>${employee.firstName} ${employee.lastName}</td>
                         <td>${employee.position || '-'}</td>
                         <td>${employeeAdvances.length}</td>
                         <td>${employeeTotal.toLocaleString()} ${currencySymbol}</td>
                         <td>${employeePaid.toLocaleString()} ${currencySymbol}</td>
                         <td>${employeeUnpaid.toLocaleString()} ${currencySymbol}</td>
                     </tr>`;
             }));


             // Build report content
             let reportContent = `
                <div class="report-period"><p>Période: Du ${new Date(startDateStr).toLocaleDateString()} au ${new Date(endDateStr).toLocaleDateString()}</p></div>
                <div class="report-summary">
                    <div class="summary-cards">
                        <div class="summary-card"><h4>Total Avances</h4><div class="summary-value">${totalAdvances.toLocaleString()} ${currencySymbol}</div></div>
                        <div class="summary-card"><h4>Avances Remboursées</h4><div class="summary-value">${totalPaid.toLocaleString()} ${currencySymbol}</div></div>
                        <div class="summary-card"><h4>Avances Non Remboursées</h4><div class="summary-value">${totalUnpaid.toLocaleString()} ${currencySymbol}</div></div>
                        <div class="summary-card"><h4>Employés Concernés</h4><div class="summary-value">${employeeCount}</div></div>
                    </div>
                </div>
             `;

             if (advances.length > 0) {
                 reportContent += `
                     <div class="report-section">
                         <h3>Liste des Avances${unpaidOnly ? ' Non Remboursées' : ''}</h3>
                         <div class="table-responsive"><table class="table"><thead><tr><th>Employé</th><th>Date</th><th>Montant</th><th>Raison</th><th>Statut</th></tr></thead><tbody>${advanceRows.join('')}</tbody></table></div>
                     </div>
                     <div class="report-section">
                         <h3>Résumé par Employé</h3>
                         <div class="table-responsive"><table class="table"><thead><tr><th>Employé</th><th>Poste</th><th>Nombre d'Avances</th><th>Total</th><th>Remboursées</th><th>Non Remboursées</th></tr></thead><tbody>${employeeSummaryRows.join('')}</tbody></table></div>
                     </div>`;
             } else {
                 reportContent += `<div class="report-section"><h3>Liste des Avances${unpaidOnly ? ' Non Remboursées' : ''}</h3><p class="empty-message">Aucune avance trouvée pour la période sélectionnée.</p></div>`;
             }


             this.displayReport(reportTitle, reportContent);
             this.reportData = { title: reportTitle, type: 'advances', startDate: startDateTime, endDate: endDateTime, unpaidOnly, advances, totalAdvances, totalPaid, totalUnpaid, employeeCount };

         } catch(error) {
             console.error("Error generating advances report:", error);
             alert("Erreur lors de la génération du rapport d'avances.");
             this.displayReport("Erreur", `<p class="error-message">Impossible de générer le rapport. Erreur: ${error.message}</p>`);
         }
    },

    /**
     * Génère le rapport de sanctions
     */
    generateSanctionsReport: async function() { // Added async
         const startDateStr = document.getElementById('sanctions-report-start').value;
         const endDateStr = document.getElementById('sanctions-report-end').value;
         const sanctionType = document.getElementById('sanctions-report-type').value;

         if (!startDateStr || !endDateStr) {
             alert('Veuillez sélectionner une période pour générer le rapport.');
             return;
         }

          try {
             let reportTitle = 'Rapport de Sanctions';
             if (sanctionType !== 'all') { /* ... set title based on type ... */ }
             const startDateTime = new Date(startDateStr);
             const endDateTime = new Date(endDateStr);
             endDateTime.setHours(23, 59, 59, 999);

             let allSanctions = await DB.sanctions.getAll(); // Added await
             if (!Array.isArray(allSanctions)) { console.error("Failed to load sanctions"); allSanctions = []; }

             let sanctions = allSanctions.filter(sanction => {
                 const sanctionDate = new Date(sanction.date);
                 return sanctionDate >= startDateTime && sanctionDate <= endDateTime;
             });

             if (sanctionType !== 'all') {
                 sanctions = sanctions.filter(sanction => sanction.type === sanctionType);
             }

             const settings = await DB.settings.get(); // Added await
             const currencySymbol = settings.currency || 'FCFA';

             const totalAmount = sanctions.reduce((sum, sanction) => sum + sanction.amount, 0);
             const lateAmount = sanctions.filter(s => s.type === 'late').reduce((sum, s) => sum + s.amount, 0);
             const absenceAmount = sanctions.filter(s => s.type === 'absence').reduce((sum, s) => sum + s.amount, 0);
             const otherAmount = sanctions.filter(s => !['late', 'absence'].includes(s.type)).reduce((sum, s) => sum + s.amount, 0);
             const employeeIds = new Set(sanctions.map(sanction => sanction.employeeId));
             const employeeCount = employeeIds.size;

             // Resolve employee names asynchronously
             const sanctionRows = await Promise.all(sanctions.map(async (sanction) => {
                 const employee = await DB.employees.getById(sanction.employeeId);
                 let sanctionTypeLabel = ''; /* ... set label based on sanction.type ... */
                 switch (sanction.type) {
                    case 'late': sanctionTypeLabel = 'Retard'; break;
                    case 'absence': sanctionTypeLabel = 'Absence'; break;
                    case 'misconduct': sanctionTypeLabel = 'Faute'; break;
                    case 'other': sanctionTypeLabel = 'Autre'; break;
                    default: sanctionTypeLabel = sanction.type;
                }
                 return `
                     <tr>
                         <td>${employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu'}</td>
                         <td>${new Date(sanction.date).toLocaleDateString()}</td>
                         <td>${sanctionTypeLabel}</td>
                         <td>${sanction.amount.toLocaleString()} ${currencySymbol}</td>
                         <td>${sanction.reason || '-'}</td>
                     </tr>`;
             }));

             const employeeSummaryRows = await Promise.all(Array.from(employeeIds).map(async (employeeId) => {
                 const employee = await DB.employees.getById(employeeId);
                 if (!employee) return '';
                 const employeeSanctions = sanctions.filter(s => s.employeeId === employeeId);
                 const employeeLateAmount = employeeSanctions.filter(s => s.type === 'late').reduce((sum, s) => sum + s.amount, 0);
                 const employeeAbsenceAmount = employeeSanctions.filter(s => s.type === 'absence').reduce((sum, s) => sum + s.amount, 0);
                 const employeeOtherAmount = employeeSanctions.filter(s => !['late', 'absence'].includes(s.type)).reduce((sum, s) => sum + s.amount, 0);
                 const employeeTotal = employeeSanctions.reduce((sum, s) => sum + s.amount, 0);
                 return `
                     <tr>
                         <td>${employee.firstName} ${employee.lastName}</td>
                         <td>${employee.position || '-'}</td>
                         <td>${employeeSanctions.length}</td>
                         <td>${employeeTotal.toLocaleString()} ${currencySymbol}</td>
                         <td>${employeeLateAmount.toLocaleString()} ${currencySymbol}</td>
                         <td>${employeeAbsenceAmount.toLocaleString()} ${currencySymbol}</td>
                         <td>${employeeOtherAmount.toLocaleString()} ${currencySymbol}</td>
                     </tr>`;
             }));

              // Build report content
             let reportContent = `
                <div class="report-period"><p>Période: Du ${new Date(startDateStr).toLocaleDateString()} au ${new Date(endDateStr).toLocaleDateString()}</p></div>
                <div class="report-summary">
                    <div class="summary-cards">
                         <div class="summary-card"><h4>Total Sanctions</h4><div class="summary-value">${totalAmount.toLocaleString()} ${currencySymbol}</div></div>
                         <div class="summary-card"><h4>Retards</h4><div class="summary-value">${lateAmount.toLocaleString()} ${currencySymbol}</div></div>
                         <div class="summary-card"><h4>Absences</h4><div class="summary-value">${absenceAmount.toLocaleString()} ${currencySymbol}</div></div>
                         {/* Assuming misconduct is included in otherAmount calc */}
                         <div class="summary-card"><h4>Fautes & Autres</h4><div class="summary-value">${otherAmount.toLocaleString()} ${currencySymbol}</div></div>
                         <div class="summary-card"><h4>Employés Concernés</h4><div class="summary-value">${employeeCount}</div></div>
                    </div>
                </div>
             `;

             if (sanctions.length > 0) {
                 reportContent += `
                     <div class="report-section">
                         <h3>Liste des Sanctions</h3>
                         <div class="table-responsive"><table class="table"><thead><tr><th>Employé</th><th>Date</th><th>Type</th><th>Montant</th><th>Raison</th></tr></thead><tbody>${sanctionRows.join('')}</tbody></table></div>
                     </div>
                     <div class="report-section">
                         <h3>Résumé par Employé</h3>
                         <div class="table-responsive"><table class="table"><thead><tr><th>Employé</th><th>Poste</th><th>Nombre de Sanctions</th><th>Total</th><th>Retards</th><th>Absences</th><th>Fautes & Autres</th></tr></thead><tbody>${employeeSummaryRows.join('')}</tbody></table></div>
                     </div>`;
             } else {
                 reportContent += `<div class="report-section"><h3>Liste des Sanctions</h3><p class="empty-message">Aucune sanction trouvée pour la période sélectionnée.</p></div>`;
             }

             this.displayReport(reportTitle, reportContent);
             this.reportData = { title: reportTitle, type: 'sanctions', startDate: startDateTime, endDate: endDateTime, sanctionType, sanctions, totalAmount, lateAmount, absenceAmount, otherAmount, employeeCount }; // Added otherAmount

         } catch(error) {
             console.error("Error generating sanctions report:", error);
             alert("Erreur lors de la génération du rapport de sanctions.");
             this.displayReport("Erreur", `<p class="error-message">Impossible de générer le rapport. Erreur: ${error.message}</p>`);
         }
    },

    /**
     * Génère le rapport de dettes clients
     */
    generateDebtsReport: async function() { // Added async
         const startDateStr = document.getElementById('debts-report-start').value;
         const endDateStr = document.getElementById('debts-report-end').value;
         const unpaidOnly = document.getElementById('debts-report-unpaid-only').checked;

         if (!startDateStr || !endDateStr) {
             alert('Veuillez sélectionner une période pour générer le rapport.');
             return;
         }

          try {
             const reportTitle = `Rapport de Dettes Clients${unpaidOnly ? ' (Non Payées)' : ''}`;
             const startDateTime = new Date(startDateStr);
             const endDateTime = new Date(endDateStr);
             endDateTime.setHours(23, 59, 59, 999);

             let allDebts = await DB.debts.getAll(); // Added await
             if (!Array.isArray(allDebts)) { console.error("Failed to load debts"); allDebts = []; }

             let debts = allDebts.filter(debt => {
                 const debtDate = new Date(debt.date);
                 return debtDate >= startDateTime && debtDate <= endDateTime;
             });

             if (unpaidOnly) {
                 debts = debts.filter(debt => !debt.isPaid);
             }

             const settings = await DB.settings.get(); // Added await
             const currencySymbol = settings.currency || 'FCFA';

             const totalDebts = debts.reduce((sum, debt) => sum + debt.amount, 0);
             const paidDebts = debts.filter(debt => debt.isPaid);
             const unpaidDebts = debts.filter(debt => !debt.isPaid);
             const totalPaid = paidDebts.reduce((sum, debt) => sum + debt.amount, 0);
             const totalUnpaid = unpaidDebts.reduce((sum, debt) => sum + debt.amount, 0);
             const employeeIds = new Set(debts.map(debt => debt.employeeId));
             const employeeCount = employeeIds.size;
             const clientNames = new Set(debts.map(debt => debt.clientName));
             const clientCount = clientNames.size;

             // Resolve employee names asynchronously
             const debtRows = await Promise.all(debts.map(async (debt) => {
                 const employee = await DB.employees.getById(debt.employeeId);
                 return `
                     <tr>
                         <td>${employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu'}</td>
                         <td>${debt.clientName || '-'}</td>
                         <td>${new Date(debt.date).toLocaleDateString()}</td>
                         <td>${debt.amount.toLocaleString()} ${currencySymbol}</td>
                         <td>${debt.description || '-'}</td>
                         <td><span class="badge ${debt.isPaid ? 'badge-success' : 'badge-warning'}">${debt.isPaid ? 'Payée' : 'Non payée'}</span></td>
                     </tr>`;
             }));

             const employeeSummaryRows = await Promise.all(Array.from(employeeIds).map(async (employeeId) => {
                 const employee = await DB.employees.getById(employeeId);
                 if (!employee) return '';
                 const employeeDebts = debts.filter(debt => debt.employeeId === employeeId);
                 const employeePaidDebts = employeeDebts.filter(debt => debt.isPaid);
                 const employeeUnpaidDebts = employeeDebts.filter(debt => !debt.isPaid);
                 const employeeTotal = employeeDebts.reduce((sum, debt) => sum + debt.amount, 0);
                 const employeePaid = employeePaidDebts.reduce((sum, debt) => sum + debt.amount, 0);
                 const employeeUnpaid = employeeUnpaidDebts.reduce((sum, debt) => sum + debt.amount, 0);
                 return `
                     <tr>
                         <td>${employee.firstName} ${employee.lastName}</td>
                         <td>${employee.position || '-'}</td>
                         <td>${employeeDebts.length}</td>
                         <td>${employeeTotal.toLocaleString()} ${currencySymbol}</td>
                         <td>${employeePaid.toLocaleString()} ${currencySymbol}</td>
                         <td>${employeeUnpaid.toLocaleString()} ${currencySymbol}</td>
                     </tr>`;
             }));

             const clientSummaryRows = Array.from(clientNames).map(clientName => {
                 const clientDebts = debts.filter(debt => debt.clientName === clientName);
                 const clientPaidDebts = clientDebts.filter(debt => debt.isPaid);
                 const clientUnpaidDebts = clientDebts.filter(debt => !debt.isPaid);
                 const clientTotal = clientDebts.reduce((sum, debt) => sum + debt.amount, 0);
                 const clientPaid = clientPaidDebts.reduce((sum, debt) => sum + debt.amount, 0);
                 const clientUnpaid = clientUnpaidDebts.reduce((sum, debt) => sum + debt.amount, 0);
                 return `
                     <tr>
                         <td>${clientName || '-'}</td>
                         <td>${clientDebts.length}</td>
                         <td>${clientTotal.toLocaleString()} ${currencySymbol}</td>
                         <td>${clientPaid.toLocaleString()} ${currencySymbol}</td>
                         <td>${clientUnpaid.toLocaleString()} ${currencySymbol}</td>
                     </tr>`;
             });

              // Build report content
             let reportContent = `
                <div class="report-period"><p>Période: Du ${new Date(startDateStr).toLocaleDateString()} au ${new Date(endDateStr).toLocaleDateString()}</p></div>
                <div class="report-summary">
                    <div class="summary-cards">
                        <div class="summary-card"><h4>Total Dettes</h4><div class="summary-value">${totalDebts.toLocaleString()} ${currencySymbol}</div></div>
                        <div class="summary-card"><h4>Dettes Payées</h4><div class="summary-value">${totalPaid.toLocaleString()} ${currencySymbol}</div></div>
                        <div class="summary-card"><h4>Dettes Non Payées</h4><div class="summary-value">${totalUnpaid.toLocaleString()} ${currencySymbol}</div></div>
                        <div class="summary-card"><h4>Employés Responsables</h4><div class="summary-value">${employeeCount}</div></div>
                        <div class="summary-card"><h4>Clients</h4><div class="summary-value">${clientCount}</div></div>
                    </div>
                </div>
             `;

             if (debts.length > 0) {
                 reportContent += `
                     <div class="report-section">
                         <h3>Liste des Dettes Clients${unpaidOnly ? ' Non Payées' : ''}</h3>
                         <div class="table-responsive"><table class="table"><thead><tr><th>Employé Responsable</th><th>Client</th><th>Date</th><th>Montant</th><th>Description</th><th>Statut</th></tr></thead><tbody>${debtRows.join('')}</tbody></table></div>
                     </div>
                     <div class="report-section">
                         <h3>Résumé par Employé</h3>
                         <div class="table-responsive"><table class="table"><thead><tr><th>Employé</th><th>Poste</th><th>Nombre de Dettes</th><th>Total</th><th>Payées</th><th>Non Payées</th></tr></thead><tbody>${employeeSummaryRows.join('')}</tbody></table></div>
                     </div>
                     <div class="report-section">
                         <h3>Résumé par Client</h3>
                         <div class="table-responsive"><table class="table"><thead><tr><th>Client</th><th>Nombre de Dettes</th><th>Total</th><th>Payées</th><th>Non Payées</th></tr></thead><tbody>${clientSummaryRows.join('')}</tbody></table></div>
                     </div>`;
             } else {
                 reportContent += `<div class="report-section"><h3>Liste des Dettes Clients${unpaidOnly ? ' Non Payées' : ''}</h3><p class="empty-message">Aucune dette trouvée pour la période sélectionnée.</p></div>`;
             }


             this.displayReport(reportTitle, reportContent);
             this.reportData = { title: reportTitle, type: 'debts', startDate: startDateTime, endDate: endDateTime, unpaidOnly, debts, totalDebts, totalPaid, totalUnpaid, employeeCount, clientCount }; // added clientCount

         } catch(error) {
             console.error("Error generating debts report:", error);
             alert("Erreur lors de la génération du rapport de dettes clients.");
             this.displayReport("Erreur", `<p class="error-message">Impossible de générer le rapport. Erreur: ${error.message}</p>`);
         }
    },

    /**
     * Génère l'analyse annuelle
     */
    generateAnnualReport: async function() { // Added async
        const yearSelect = document.getElementById('annual-report-year');
        if (!yearSelect) return;
        const year = parseInt(yearSelect.value);

        try {
            const reportTitle = `Analyse Annuelle ${year}`;

             // Fetch all data for the year
            let allSalaries = await DB.salaries.getAll();
            if (!Array.isArray(allSalaries)) { console.error("Failed to load salaries"); allSalaries = []; }
            const yearSalaries = allSalaries.filter(s => new Date(s.paymentDate).getFullYear() === year);

            let allAdvances = await DB.advances.getAll();
            if (!Array.isArray(allAdvances)) { console.error("Failed to load advances"); allAdvances = []; }
            const yearAdvances = allAdvances.filter(a => new Date(a.date).getFullYear() === year);

            let allSanctions = await DB.sanctions.getAll();
            if (!Array.isArray(allSanctions)) { console.error("Failed to load sanctions"); allSanctions = []; }
            const yearSanctions = allSanctions.filter(s => new Date(s.date).getFullYear() === year);

            let allDebts = await DB.debts.getAll();
            if (!Array.isArray(allDebts)) { console.error("Failed to load debts"); allDebts = []; }
            const yearDebts = allDebts.filter(d => new Date(d.date).getFullYear() === year);

            const settings = await DB.settings.get(); // Added await
            const currencySymbol = settings.currency || 'FCFA';

            // Process data month by month
             const monthlyData = [];
             const months = [ /* ... month names ... */
                 "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
                 "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
             ];
             for (let month = 0; month < 12; month++) {
                 const monthlySalaries = yearSalaries.filter(s => new Date(s.paymentDate).getMonth() === month);
                 const monthlyAdvances = yearAdvances.filter(a => new Date(a.date).getMonth() === month);
                 const monthlySanctions = yearSanctions.filter(s => new Date(s.date).getMonth() === month);
                 const monthlyDebts = yearDebts.filter(d => new Date(d.date).getMonth() === month);

                 const totalBaseSalary = monthlySalaries.reduce((sum, s) => sum + s.baseSalary, 0);
                 const totalAdvances = monthlyAdvances.reduce((sum, a) => sum + a.amount, 0); // Use advances array
                 const totalSanctions = monthlySanctions.reduce((sum, s) => sum + s.amount, 0); // Use sanctions array
                 const totalDebts = monthlyDebts.reduce((sum, d) => sum + d.amount, 0); // Use debts array
                 const totalNetSalary = monthlySalaries.reduce((sum, s) => sum + s.netSalary, 0);

                 monthlyData.push({ month: months[month], monthIndex: month, salaries: monthlySalaries, advances: monthlyAdvances, sanctions: monthlySanctions, debts: monthlyDebts, totalBaseSalary, totalAdvances, totalSanctions, totalDebts, totalNetSalary });
             }

             // Calculate annual totals
             const annualTotalBaseSalary = monthlyData.reduce((sum, data) => sum + data.totalBaseSalary, 0);
             const annualTotalAdvances = monthlyData.reduce((sum, data) => sum + data.totalAdvances, 0);
             const annualTotalSanctions = monthlyData.reduce((sum, data) => sum + data.totalSanctions, 0);
             const annualTotalDebts = monthlyData.reduce((sum, data) => sum + data.totalDebts, 0);
             const annualTotalNetSalary = monthlyData.reduce((sum, data) => sum + data.totalNetSalary, 0);

            // Build report content
            let reportContent = `
                <div class="report-summary">
                    <div class="summary-cards">
                        <div class="summary-card"><h4>Total Salaires de Base</h4><div class="summary-value">${annualTotalBaseSalary.toLocaleString()} ${currencySymbol}</div></div>
                        <div class="summary-card"><h4>Total Avances</h4><div class="summary-value">${annualTotalAdvances.toLocaleString()} ${currencySymbol}</div></div>
                        <div class="summary-card"><h4>Total Sanctions</h4><div class="summary-value">${annualTotalSanctions.toLocaleString()} ${currencySymbol}</div></div>
                        <div class="summary-card"><h4>Total Dettes Clients</h4><div class="summary-value">${annualTotalDebts.toLocaleString()} ${currencySymbol}</div></div>
                        <div class="summary-card total"><h4>Total Salaires Nets</h4><div class="summary-value">${annualTotalNetSalary.toLocaleString()} ${currencySymbol}</div></div>
                    </div>
                </div>
                <div class="report-section">
                    <h3>Résumé Mensuel</h3>
                    <div class="table-responsive">
                        <table class="table">
                            <thead><tr><th>Mois</th><th>Salaires de Base</th><th>Avances</th><th>Sanctions</th><th>Dettes Clients</th><th>Salaires Nets</th><th>Employés</th></tr></thead>
                            <tbody>
                                ${monthlyData.map(data => `
                                    <tr>
                                        <td>${data.month}</td>
                                        <td>${data.totalBaseSalary.toLocaleString()} ${currencySymbol}</td>
                                        <td>${data.totalAdvances.toLocaleString()} ${currencySymbol}</td>
                                        <td>${data.totalSanctions.toLocaleString()} ${currencySymbol}</td>
                                        <td>${data.totalDebts.toLocaleString()} ${currencySymbol}</td>
                                        <td>${data.totalNetSalary.toLocaleString()} ${currencySymbol}</td>
                                        <td>${data.salaries.length}</td>
                                    </tr>`).join('')}
                                <tr class="total-row">
                                    <td>TOTAL</td>
                                    <td>${annualTotalBaseSalary.toLocaleString()} ${currencySymbol}</td>
                                    <td>${annualTotalAdvances.toLocaleString()} ${currencySymbol}</td>
                                    <td>${annualTotalSanctions.toLocaleString()} ${currencySymbol}</td>
                                    <td>${annualTotalDebts.toLocaleString()} ${currencySymbol}</td>
                                    <td>${annualTotalNetSalary.toLocaleString()} ${currencySymbol}</td>
                                    <td>-</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="report-section"><h3>Évolution Mensuelle</h3><div class="chart-container"><div id="annual-chart" style="height: 400px;"></div></div></div>
            `;

            this.displayReport(reportTitle, reportContent);
            this.generateAnnualChart(monthlyData); // Call chart generation
            this.reportData = { title: reportTitle, type: 'annual', year, monthlyData, annualTotalBaseSalary, annualTotalAdvances, annualTotalSanctions, annualTotalDebts, annualTotalNetSalary };

        } catch (error) {
            console.error("Error generating annual report:", error);
            alert("Erreur lors de la génération de l'analyse annuelle.");
             this.displayReport("Erreur", `<p class="error-message">Impossible de générer le rapport. Erreur: ${error.message}</p>`);
        }
    },

    /**
     * Génère le graphique pour l'analyse annuelle
     */
    generateAnnualChart: function(monthlyData) {
        // ... (no changes needed here, assuming synchronous display logic) ...
        const chartContainer = document.getElementById('annual-chart');

        if (!chartContainer) return;

        chartContainer.innerHTML = `
            <div class="chart-placeholder">
                <i class="fas fa-chart-line"></i>
                <p>Graphique d'évolution mensuelle</p>
                <p><small>Note: Une bibliothèque de graphiques comme Chart.js serait nécessaire pour afficher un graphique réel</small></p>
            </div>
        `;
    },

    /**
     * Affiche le rapport généré
     */
    displayReport: function(title, content) {
        // ... (no changes needed here, it's synchronous) ...
         const reportDisplay = document.getElementById('report-display');
        const reportTitle = document.getElementById('report-title');
        const reportContent = document.getElementById('report-content');

        if (!reportDisplay || !reportTitle || !reportContent) return;

        reportTitle.textContent = title;
        reportContent.innerHTML = content;
        reportDisplay.style.display = 'block';
        reportDisplay.scrollIntoView({ behavior: 'smooth' });
    },

    /**
     * Imprime le rapport actuel
     */
    printReport: async function() { // Added async
        if (!this.reportData) return;

        try {
            const settings = await DB.settings.get(); // Added await
            const printWindow = window.open('', '_blank');
             // ... (rest of the printing logic remains largely the same) ...
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${this.reportData.title}</title>
                    <style>
                        /* ... styles ... */
                         body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 20px; }
                         .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                         .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                         .report-title { font-size: 20px; margin-bottom: 5px; }
                         .report-date { font-size: 14px; }
                         .report-content { margin-bottom: 30px; }
                         .summary-cards { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px; }
                         .summary-card { background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; padding: 10px; flex: 1; min-width: 150px; } /* Adjusted min-width */
                         .summary-card h4 { margin: 0 0 5px 0; font-size: 14px; color: #666; }
                         .summary-value { font-size: 18px; font-weight: bold; }
                         .report-section { margin-bottom: 30px; }
                         .report-section h3 { border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 15px; }
                         table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; } /* Adjusted font size */
                         th, td { border: 1px solid #ddd; padding: 6px; text-align: left; } /* Adjusted padding */
                         th { background-color: #f2f2f2; }
                         .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; text-align: center; font-size: 12px; }
                         @media print { @page { margin: 10mm; } body { padding: 0; } .report-actions { display: none !important; } /* Hide actions when printing */ }
                         .report-actions { display: none; } /* Hide actions in print view */
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="company-name">${settings.companyName || 'Le Sims'}</div>
                        <div class="report-title">${this.reportData.title}</div>
                        <div class="report-date">Généré le ${new Date().toLocaleDateString()} à ${new Date().toLocaleTimeString()}</div>
                    </div>
                    <div class="report-content">
                        ${document.getElementById('report-content').innerHTML}
                    </div>
                    <div class="footer">
                        <p>${settings.companyName || 'Le Sims'} - Système de Gestion des Salaires</p>
                    </div>
                    <script> window.onload = function() { window.print(); /* Consider closing automatically: setTimeout(window.close, 500); */ } </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (error) {
            console.error("Error preparing print:", error);
            alert("Erreur lors de la préparation de l'impression.");
        }
    },

    /**
     * Exporte le rapport actuel en CSV
     */
    exportReportCSV: async function() { // Added async
        if (!this.reportData) return;

        try {
            let csvContent = '';
            const settings = await DB.settings.get(); // Added await
            const currencySymbol = settings.currency || 'FCFA';

            // ... (rest of the CSV generation logic - needs async for getById if used) ...

            csvContent += `"${this.reportData.title}"\n`;
            csvContent += `"Généré le ${new Date().toLocaleDateString()} à ${new Date().toLocaleTimeString()}"\n\n`;

            // Specific content based on report type
            switch (this.reportData.type) {
                case 'monthly':
                    // Summary
                    csvContent += '"Résumé du Mois"\n';
                    csvContent += `"Employés","${this.reportData.salaries.length}"\n`;
                    csvContent += `"Salaires de Base","${this.reportData.salaries.reduce((sum, s) => sum + s.baseSalary, 0)}"\n`; // Raw numbers
                    csvContent += `"Avances","${this.reportData.salaries.reduce((sum, s) => sum + s.advances, 0)}"\n`;
                    csvContent += `"Sanctions","${this.reportData.salaries.reduce((sum, s) => sum + s.sanctions, 0)}"\n`;
                    csvContent += `"Dettes Clients","${this.reportData.salaries.reduce((sum, s) => sum + s.debts, 0)}"\n`;
                    csvContent += `"Salaires Nets","${this.reportData.salaries.reduce((sum, s) => sum + s.netSalary, 0)}"\n\n`;

                    // Salary details
                    csvContent += '"Détail des Salaires"\n';
                    csvContent += '"Employé ID","Prénom","Nom","Poste","Salaire Base","Avances","Sanctions","Dettes","Salaire Net","Statut"\n';
                    await Promise.all(this.reportData.salaries.map(async (salary) => {
                        const employee = await DB.employees.getById(salary.employeeId);
                        if (employee) {
                           csvContent += `"${employee.employeeId || ''}","${employee.firstName}","${employee.lastName}","${employee.position || '-'}","${salary.baseSalary}","${salary.advances}","${salary.sanctions}","${salary.debts}","${salary.netSalary}","${salary.isPaid ? 'Payé' : 'En attente'}"\n`;
                        }
                    }));
                    csvContent += '\n';

                     // Advance details
                     if(this.reportData.advances.length > 0) {
                         csvContent += '"Avances du Mois"\n';
                         csvContent += '"Employé ID","Prénom","Nom","Date","Montant","Raison","Statut"\n';
                         await Promise.all(this.reportData.advances.map(async (advance) => {
                             const employee = await DB.employees.getById(advance.employeeId);
                              if (employee) {
                                 csvContent += `"${employee.employeeId || ''}","${employee.firstName}","${employee.lastName}","${new Date(advance.date).toLocaleDateString()}","${advance.amount}","${(advance.reason || '-').replace(/"/g, '""')}","${advance.isPaid ? 'Remboursée' : 'Non remboursée'}"\n`;
                              }
                         }));
                         csvContent += '\n';
                     }
                     // Similar async mapping for sanctions and debts if needed...

                    break;

                case 'employee':
                     const employee = this.reportData.employee;
                     csvContent += '"Informations Employé"\n';
                     csvContent += `"Nom","${employee.firstName} ${employee.lastName}"\n`;
                     // ... other employee details ...
                     csvContent += `"Période","Du ${new Date(this.reportData.startDate).toLocaleDateString()} au ${new Date(this.reportData.endDate).toLocaleDateString()}"\n\n`;

                     // Summary
                     // ... calculate totals ...
                     const totalAdvancesEmp = this.reportData.advances.reduce((sum, a) => sum + a.amount, 0);
                     const totalSanctionsEmp = this.reportData.sanctions.reduce((sum, s) => sum + s.amount, 0);
                     const totalDebtsEmp = this.reportData.debts.reduce((sum, d) => sum + d.amount, 0);
                     const totalNetSalaryEmp = this.reportData.salaries.reduce((sum, s) => sum + s.netSalary, 0);

                     csvContent += '"Résumé Période"\n';
                     csvContent += `"Salaires Traités","${this.reportData.salaries.length}"\n`;
                     csvContent += `"Avances","${totalAdvancesEmp}"\n`;
                     csvContent += `"Sanctions","${totalSanctionsEmp}"\n`;
                     csvContent += `"Dettes Clients","${totalDebtsEmp}"\n`;
                     csvContent += `"Total Net Reçu","${totalNetSalaryEmp}"\n\n`;

                     // Salary details
                     if(this.reportData.salaries.length > 0){
                         csvContent += '"Détail Salaires"\n';
                         csvContent += '"Période","Salaire Base","Avances","Sanctions","Dettes","Salaire Net","Statut"\n';
                         this.reportData.salaries.forEach(s => {
                            const d = new Date(s.paymentDate);
                            csvContent += `"${d.toLocaleString('fr-FR', {month:'long'})} ${d.getFullYear()}","${s.baseSalary}","${s.advances}","${s.sanctions}","${s.debts}","${s.netSalary}","${s.isPaid ? 'Payé' : 'En attente'}"\n`;
                         });
                         csvContent += '\n';
                     }
                     // Similar sections for advances, sanctions, debts...
                    break;

                 case 'advances':
                     csvContent += '"Résumé Avances"\n';
                     csvContent += `"Période","Du ${new Date(this.reportData.startDate).toLocaleDateString()} au ${new Date(this.reportData.endDate).toLocaleDateString()}"\n`;
                     csvContent += `"Total Avances","${this.reportData.totalAdvances}"\n`;
                     csvContent += `"Remboursées","${this.reportData.totalPaid}"\n`;
                     csvContent += `"Non Remboursées","${this.reportData.totalUnpaid}"\n`;
                     csvContent += `"Employés Concernés","${this.reportData.employeeCount}"\n\n`;

                     csvContent += '"Liste Avances"\n';
                     csvContent += '"Employé ID","Prénom","Nom","Date","Montant","Raison","Statut"\n';
                     await Promise.all(this.reportData.advances.map(async (advance) => {
                         const employee = await DB.employees.getById(advance.employeeId);
                         if (employee) {
                            csvContent += `"${employee.employeeId || ''}","${employee.firstName}","${employee.lastName}","${new Date(advance.date).toLocaleDateString()}","${advance.amount}","${(advance.reason || '-').replace(/"/g, '""')}","${advance.isPaid ? 'Remboursée' : 'Non remboursée'}"\n`;
                         }
                     }));
                     break;

                 case 'sanctions':
                      csvContent += '"Résumé Sanctions"\n';
                      csvContent += `"Période","Du ${new Date(this.reportData.startDate).toLocaleDateString()} au ${new Date(this.reportData.endDate).toLocaleDateString()}"\n`;
                      csvContent += `"Total Montant","${this.reportData.totalAmount}"\n`;
                      // ... other totals ...
                      csvContent += `"Employés Concernés","${this.reportData.employeeCount}"\n\n`;

                      csvContent += '"Liste Sanctions"\n';
                      csvContent += '"Employé ID","Prénom","Nom","Date","Type","Montant","Raison"\n';
                      await Promise.all(this.reportData.sanctions.map(async (sanction) => {
                          const employee = await DB.employees.getById(sanction.employeeId);
                          if (employee) {
                              let typeLabel = ''; /* ... */
                               switch (sanction.type) {
                                    case 'late': typeLabel = 'Retard'; break;
                                    case 'absence': typeLabel = 'Absence'; break;
                                    case 'misconduct': typeLabel = 'Faute'; break;
                                    case 'other': typeLabel = 'Autre'; break;
                                    default: typeLabel = sanction.type;
                                }
                              csvContent += `"${employee.employeeId || ''}","${employee.firstName}","${employee.lastName}","${new Date(sanction.date).toLocaleDateString()}","${typeLabel}","${sanction.amount}","${(sanction.reason || '-').replace(/"/g, '""')}"\n`;
                          }
                      }));
                     break;
                 case 'debts':
                     csvContent += '"Résumé Dettes Clients"\n';
                     csvContent += `"Période","Du ${new Date(this.reportData.startDate).toLocaleDateString()} au ${new Date(this.reportData.endDate).toLocaleDateString()}"\n`;
                     csvContent += `"Total Dettes","${this.reportData.totalDebts}"\n`;
                     // ... other totals ...
                      csvContent += `"Employés Responsables","${this.reportData.employeeCount}"\n`;
                      csvContent += `"Clients","${this.reportData.clientCount}"\n\n`;

                     csvContent += '"Liste Dettes"\n';
                     csvContent += '"Employé ID","Prénom","Nom","Client","Date","Montant","Description","Statut"\n';
                      await Promise.all(this.reportData.debts.map(async (debt) => {
                          const employee = await DB.employees.getById(debt.employeeId);
                           if (employee) {
                              csvContent += `"${employee.employeeId || ''}","${employee.firstName}","${employee.lastName}","${debt.clientName || '-'}","${new Date(debt.date).toLocaleDateString()}","${debt.amount}","${(debt.description || '-').replace(/"/g, '""')}","${debt.isPaid ? 'Payée' : 'Non payée'}"\n`;
                           }
                      }));
                     break;
                 case 'annual':
                     csvContent += '"Résumé Annuel"\n';
                     csvContent += `"Année","${this.reportData.year}"\n`;
                     // ... other annual totals ...
                     csvContent += `"Total Salaires Nets","${this.reportData.annualTotalNetSalary}"\n\n`;

                     csvContent += '"Résumé Mensuel"\n';
                     csvContent += '"Mois","Salaires Base","Avances","Sanctions","Dettes","Salaires Nets","Nb Employés"\n';
                     this.reportData.monthlyData.forEach(d => {
                        csvContent += `"${d.month}","${d.totalBaseSalary}","${d.totalAdvances}","${d.totalSanctions}","${d.totalDebts}","${d.totalNetSalary}","${d.salaries.length}"\n`;
                     });
                     break;

                default:
                    csvContent += '"Type de rapport non exportable"\n';
                    break;
            }


            // Create Blob and download
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // Added BOM for Excel compatibility
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.reportData.title.replace(/[\s/]/g, '_')}.csv`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 0);

        } catch (error) {
            console.error("Error exporting report CSV:", error);
            alert("Erreur lors de l'exportation du rapport en CSV.");
        }
    },

    /**
     * Ferme le rapport actuel
     */
    closeReport: function() {
        // ... (no changes needed here, it's synchronous) ...
         const reportDisplay = document.getElementById('report-display');

        if (!reportDisplay) return;
        reportDisplay.style.display = 'none';
        this.reportData = null; // Reset stored data
    },

    /**
     * Attache les événements aux éléments de la page
     */
    bindEvents: function() {
        // Using event delegation on a parent element (e.g., reportsPage or document)
        // This is generally more efficient than adding many individual listeners
        const reportsPage = document.getElementById('reports-page');
        const reportDisplay = document.getElementById('report-display'); // Get report display area

         const reportAreaClickHandler = async (event) => { // Make handler async
            let targetElement = event.target;
            let generateButton = null;

            // Check for generate buttons inside report cards
            const reportCard = targetElement.closest('.report-card');
            if (reportCard) {
                generateButton = reportCard.querySelector('button[id^="generate-"]');
                if (generateButton && (targetElement === generateButton || generateButton.contains(targetElement))) {
                    targetElement = generateButton; // Treat click as if it was on the button itself
                } else {
                    generateButton = null; // Click was not on a generate button
                }
            }

            // Check for report action buttons
             let printButton = targetElement.id === 'print-report' || targetElement.closest('#print-report');
             let exportButton = targetElement.id === 'export-report' || targetElement.closest('#export-report');
             let closeButton = targetElement.id === 'close-report' || targetElement.closest('#close-report');


            try {
                 if (generateButton) {
                     // Use await when calling the async generation functions
                     switch(generateButton.id) {
                         case 'generate-monthly-report': await this.generateMonthlyReport(); break;
                         case 'generate-employee-report': await this.generateEmployeeReport(); break;
                         case 'generate-advances-report': await this.generateAdvancesReport(); break;
                         case 'generate-sanctions-report': await this.generateSanctionsReport(); break;
                         case 'generate-debts-report': await this.generateDebtsReport(); break;
                         case 'generate-annual-report': await this.generateAnnualReport(); break;
                     }
                 } else if (printButton) {
                    await this.printReport(); // Use await
                 } else if (exportButton) {
                    await this.exportReportCSV(); // Use await
                 } else if (closeButton) {
                    this.closeReport();
                 }
             } catch (error) {
                 console.error("Error in report action handler:", error);
                 alert("Une erreur s'est produite lors de l'action sur le rapport.");
             }
        };

        // Add listener to the page content area or document
        // Using document is simpler if reportsPage might not exist initially
        document.addEventListener('click', reportAreaClickHandler);

       // Keep original listeners if they target elements outside the report area
       // or handle non-async actions. Remove them if replaced by delegation.
    }
};

window.ReportsManager = ReportsManager;