/**
 * reports.js
 * Génération de rapports et analyses
 * Application de Gestion des Salaires Le Sims
 * (Updated to use DataManager)
 */

const ReportsManager = {
    reportData: null, // Variable to store data for export/print

    /**
     * Initialisation du module de génération de rapports
     */
    init: async function() {
        await this.loadReportsPage();
        this.bindEvents();
        console.log("ReportsManager initialized.");
    },

    /**
     * Charge la page de génération de rapports
     */
    loadReportsPage: async function() {
        const reportsPage = document.getElementById('reports-page');
        if (!reportsPage) return;

        try {
            // Utiliser DataManager pour récupérer les paramètres
            const settings = await DataManager.settings.get(); // Use DataManager
            const currencySymbol = settings?.currency || 'FCFA'; // Use optional chaining

            // Utiliser DataManager pour générer les options des employés
            const employeeOptionsHTML = await this.generateEmployeeOptions(); // Uses DataManager internally

            // Construction de la page (HTML structure remains the same)
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

                <div id="report-display" class="report-display" style="display: none;">
                    <div class="report-header">
                        <h2 id="report-title">Titre du Rapport</h2>
                        <div class="report-actions">
                            <button id="print-report" class="btn btn-outline btn-sm"> {/* Made buttons smaller */}
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
                    <div id="report-content" class="report-content">
                        {/* Report content will be injected here */}
                    </div>
                </div>
            `;

            // Initialiser les dates par défaut
            this.initDefaultDates();
        } catch (error) {
            console.error("Error loading reports page:", error);
            reportsPage.innerHTML = `<p class="error-message">Erreur lors du chargement de la page des rapports: ${error.message}</p>`;
        }
    },

    /**
     * Initialise les dates par défaut pour les filtres
     */
    initDefaultDates: function() {
        // Date courante
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
     * Génère les options pour la sélection du mois
     */
    generateMonthOptions: function() {
        // ... (logic remains the same) ...
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
        // ... (logic remains the same) ...
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
            // Utiliser DataManager pour récupérer les employés
            const employees = await DataManager.employees.getAll(); // Use DataManager

            if (!Array.isArray(employees)) {
                console.error("Failed to load employees for options via DataManager:", employees);
                return '<option value="">Erreur chargement employés</option>';
            }
            if (employees.length === 0) {
                return '<option value="">Aucun employé disponible</option>';
            }

            // Trier les employés par nom
            employees.sort((a, b) => {
                const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim();
                const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim();
                return nameA.localeCompare(nameB);
            });

            return employees.map(employee =>
                `<option value="${employee.id}">${employee.firstName || ''} ${employee.lastName || ''} - ${employee.position || 'Sans poste'}</option>`
            ).join('');
        } catch (error) {
            console.error("Error generating employee options via DataManager:", error);
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

        window.showLoader('Génération du rapport mensuel...');

        try {
            const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
            const reportTitle = `Rapport Mensuel - ${months[month]} ${year}`;

            // Dates de début et fin du mois
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);
            endDate.setHours(23, 59, 59, 999); // Fin de journée

            // Récupérer les données via DataManager
            const [salaries, allAdvances, allSanctions, allDebts, employees, settings] = await Promise.all([
                DataManager.salaries.getByMonth(year, month),
                DataManager.advances.getAll(),
                DataManager.sanctions.getAll(),
                DataManager.debts.getAll(),
                DataManager.employees.getAll(),
                DataManager.settings.get()
            ]);

            // Validate data
            if (!Array.isArray(salaries)) throw new Error("Données salaires invalides.");
            if (!Array.isArray(employees)) throw new Error("Données employés invalides.");
            if (!settings) throw new Error("Données paramètres invalides.");
            // Add checks for others if needed, default to empty array on error
            const advances = Array.isArray(allAdvances) ? allAdvances.filter(a => { const d = new Date(a.date); return d >= startDate && d <= endDate; }) : [];
            const sanctions = Array.isArray(allSanctions) ? allSanctions.filter(s => { const d = new Date(s.date); return d >= startDate && d <= endDate; }) : [];
            const debts = Array.isArray(allDebts) ? allDebts.filter(d => { const d = new Date(d.date); return d >= startDate && d <= endDate; }) : [];

            const currencySymbol = settings.currency || 'FCFA';

            // --- Calculations (remain the same) ---
            const totalBaseSalary = salaries.reduce((sum, salary) => sum + (salary.baseSalary || 0), 0);
            const totalAdvances = salaries.reduce((sum, salary) => sum + (salary.advances || 0), 0); // Advances deducted in salary records
            const totalSanctions = salaries.reduce((sum, salary) => sum + (salary.sanctions || 0), 0); // Sanctions deducted in salary records
            const totalDebts = salaries.reduce((sum, salary) => sum + (salary.debts || 0), 0); // Debts deducted in salary records
            const totalNetSalary = salaries.reduce((sum, salary) => sum + (salary.netSalary || 0), 0);

            const employeesWithSalary = new Set(salaries.map(salary => salary.employeeId));
            const employeesWithoutSalary = employees.filter(employee => !employeesWithSalary.has(employee.id));
            // Create employee map for quick lookup
            const employeeMap = employees.reduce((map, emp) => { map[emp.id] = emp; return map; }, {});


            // --- Build Report HTML (using employeeMap) ---
            const salaryRows = salaries.map(salary => {
                const employee = employeeMap[salary.employeeId];
                if (!employee) return '';
                return `
                    <tr>
                        <td>${employee.firstName || ''} ${employee.lastName || ''}</td>
                        <td>${employee.position || '-'}</td>
                        <td>${(salary.baseSalary || 0).toLocaleString()} ${currencySymbol}</td>
                        <td>${(salary.advances || 0).toLocaleString()} ${currencySymbol}</td>
                        <td>${(salary.sanctions || 0).toLocaleString()} ${currencySymbol}</td>
                        <td>${(salary.debts || 0).toLocaleString()} ${currencySymbol}</td>
                        <td class="${(salary.netSalary || 0) >= 0 ? 'text-success' : 'text-danger'}">
                            ${(salary.netSalary || 0).toLocaleString()} ${currencySymbol}
                        </td>
                        <td><span class="badge ${salary.isPaid ? 'badge-success' : 'badge-warning'}">${salary.isPaid ? 'Payé' : 'En attente'}</span></td>
                    </tr>
                `;
            }).join('');

             const advanceRows = advances.map(advance => {
                 const employee = employeeMap[advance.employeeId];
                 return `
                     <tr>
                         <td>${employee ? `${employee.firstName || ''} ${employee.lastName || ''}` : 'Employé inconnu'}</td>
                         <td>${new Date(advance.date).toLocaleDateString()}</td>
                         <td>${(advance.amount || 0).toLocaleString()} ${currencySymbol}</td>
                         <td>${advance.reason || '-'}</td>
                         <td><span class="badge ${advance.isPaid ? 'badge-success' : 'badge-warning'}">${advance.isPaid ? 'Remboursée' : 'Non remboursée'}</span></td>
                     </tr>
                 `;
             }).join('');

             const sanctionRows = sanctions.map(sanction => {
                 const employee = employeeMap[sanction.employeeId];
                 let sanctionType = '';
                 switch (sanction.type) { case 'late': sanctionType='Retard'; break; case 'absence': sanctionType='Absence'; break; case 'misconduct': sanctionType='Faute'; break; default: sanctionType=sanction.type||'Autre'; }
                 return `
                     <tr>
                         <td>${employee ? `${employee.firstName || ''} ${employee.lastName || ''}` : 'Employé inconnu'}</td>
                         <td>${new Date(sanction.date).toLocaleDateString()}</td>
                         <td>${sanctionType}</td>
                         <td>${(sanction.amount || 0).toLocaleString()} ${currencySymbol}</td>
                         <td>${sanction.reason || '-'}</td>
                     </tr>
                 `;
             }).join('');

             const debtRows = debts.map(debt => {
                 const employee = employeeMap[debt.employeeId];
                 return `
                     <tr>
                         <td>${employee ? `${employee.firstName || ''} ${employee.lastName || ''}` : 'Employé inconnu'}</td>
                         <td>${debt.clientName || '-'}</td>
                         <td>${new Date(debt.date).toLocaleDateString()}</td>
                         <td>${(debt.amount || 0).toLocaleString()} ${currencySymbol}</td>
                         <td>${debt.description || '-'}</td>
                         <td><span class="badge ${debt.isPaid ? 'badge-success' : 'badge-warning'}">${debt.isPaid ? 'Payée' : 'Non payée'}</span></td>
                     </tr>
                 `;
             }).join('');

            // --- Assemble final report content (HTML structure remains the same) ---
            let reportContent = `
                <div class="report-summary">
                    <div class="summary-cards">
                        <div class="summary-card"><h4>Employés</h4><div class="summary-value">${salaries.length} / ${employees.length}</div></div>
                        <div class="summary-card"><h4>Salaires de Base</h4><div class="summary-value">${totalBaseSalary.toLocaleString()} ${currencySymbol}</div></div>
                        <div class="summary-card"><h4>Avances Déduites</h4><div class="summary-value">${totalAdvances.toLocaleString()} ${currencySymbol}</div></div>
                        <div class="summary-card"><h4>Sanctions Déduites</h4><div class="summary-value">${totalSanctions.toLocaleString()} ${currencySymbol}</div></div>
                        <div class="summary-card"><h4>Dettes Clients Déduites</h4><div class="summary-value">${totalDebts.toLocaleString()} ${currencySymbol}</div></div>
                        <div class="summary-card total"><h4>Salaires Nets</h4><div class="summary-value">${totalNetSalary.toLocaleString()} ${currencySymbol}</div></div>
                    </div>
                </div>
                <div class="report-section">
                    <h3>Détail des Salaires Traités</h3>
                    ${salaries.length > 0 ? `<div class="table-responsive"><table class="table"><thead><tr><th>Employé</th><th>Poste</th><th>Salaire Base</th><th>Avances</th><th>Sanctions</th><th>Dettes</th><th>Salaire Net</th><th>Statut</th></tr></thead><tbody>${salaryRows}</tbody></table></div>` : '<p class="empty-message">Aucun salaire traité pour ce mois.</p>'}
                </div>`;

            if (employeesWithoutSalary.length > 0) {
                 reportContent += `
                     <div class="report-section">
                         <h3>Employés sans Salaire Traité ce Mois</h3>
                         <div class="table-responsive">
                             <table class="table">
                                 <thead><tr><th>Employé</th><th>Poste</th><th>Salaire Base</th><th>Date Embauche</th></tr></thead>
                                 <tbody>
                                     ${employeesWithoutSalary.map(employee => `
                                         <tr>
                                             <td>${employee.firstName || ''} ${employee.lastName || ''}</td>
                                             <td>${employee.position || '-'}</td>
                                             <td>${employee.baseSalary ? employee.baseSalary.toLocaleString() + ' ' + currencySymbol : '-'}</td>
                                             <td>${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : '-'}</td>
                                         </tr>
                                     `).join('')}
                                 </tbody>
                             </table>
                         </div>
                     </div>`;
             }
            if (advances.length > 0) {
                 reportContent += `<div class="report-section"><h3>Avances sur Salaire Accordées ce Mois</h3><div class="table-responsive"><table class="table"><thead><tr><th>Employé</th><th>Date</th><th>Montant</th><th>Raison</th><th>Statut</th></tr></thead><tbody>${advanceRows}</tbody></table></div></div>`;
            }
            if (sanctions.length > 0) {
                 reportContent += `<div class="report-section"><h3>Sanctions Appliquées ce Mois</h3><div class="table-responsive"><table class="table"><thead><tr><th>Employé</th><th>Date</th><th>Type</th><th>Montant</th><th>Raison</th></tr></thead><tbody>${sanctionRows}</tbody></table></div></div>`;
            }
            if (debts.length > 0) {
                 reportContent += `<div class="report-section"><h3>Dettes Clients Enregistrées ce Mois</h3><div class="table-responsive"><table class="table"><thead><tr><th>Employé Resp.</th><th>Client</th><th>Date</th><th>Montant</th><th>Description</th><th>Statut</th></tr></thead><tbody>${debtRows}</tbody></table></div></div>`;
            }

            // Afficher le rapport
            this.displayReport(reportTitle, reportContent);
            // Store data for export/print
            this.reportData = { title: reportTitle, type: 'monthly', month, year, salaries, advances, sanctions, debts, employees, employeesWithoutSalary };

        } catch (error) {
            console.error("Error generating monthly report:", error);
            this.displayReport("Erreur Rapport Mensuel", `<p class="error-message">Impossible de générer le rapport. Erreur: ${error.message}</p>`);
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
        window.showLoader('Génération du rapport employé...');
        try {
            const startDateTime = new Date(startDateStr);
            const endDateTime = new Date(endDateStr);
            endDateTime.setHours(23, 59, 59, 999);

            // Fetch data using DataManager
            const [employee, allSalaries, allAdvances, allSanctions, allDebts, settings] = await Promise.all([
                DataManager.employees.getById(employeeId),
                DataManager.salaries.getAll(), // Fetch all and filter locally for offline compatibility
                DataManager.advances.getByEmployeeId(employeeId), // Fetch specific employee's advances
                DataManager.sanctions.getByEmployeeId(employeeId),
                DataManager.debts.getByEmployeeId(employeeId),
                DataManager.settings.get()
            ]);

            if (!employee) throw new Error("Employé introuvable.");
            if (!settings) throw new Error("Paramètres introuvables.");

            const currencySymbol = settings.currency || 'FCFA';

            // Filter data for the selected period
            const salaries = Array.isArray(allSalaries) ? allSalaries.filter(s => s.employeeId === employeeId && new Date(s.paymentDate) >= startDateTime && new Date(s.paymentDate) <= endDateTime) : [];
            const advances = Array.isArray(allAdvances) ? allAdvances.filter(a => new Date(a.date) >= startDateTime && new Date(a.date) <= endDateTime) : [];
            const sanctions = Array.isArray(allSanctions) ? allSanctions.filter(s => new Date(s.date) >= startDateTime && new Date(s.date) <= endDateTime) : [];
            const debts = Array.isArray(allDebts) ? allDebts.filter(d => new Date(d.date) >= startDateTime && new Date(d.date) <= endDateTime) : [];

            const reportTitle = `Rapport Employé: ${employee.firstName || ''} ${employee.lastName || ''}`;

            // --- Calculations (remain the same) ---
            const totalBaseSalary = salaries.reduce((sum, s) => sum + (s.baseSalary || 0), 0);
            const totalAdvancesPeriod = advances.reduce((sum, a) => sum + (a.amount || 0), 0); // Total advances granted in period
            const totalSanctionsPeriod = sanctions.reduce((sum, s) => sum + (s.amount || 0), 0); // Total sanctions applied in period
            const totalDebtsPeriod = debts.reduce((sum, d) => sum + (d.amount || 0), 0);       // Total debts recorded in period
            const totalNetSalaryPaid = salaries.reduce((sum, s) => sum + (s.netSalary || 0), 0); // Sum of net salaries paid in period


            // --- Build Report HTML (remains mostly the same, uses filtered data) ---
            let reportContent = `
                <div class="employee-profile">
                     <div class="employee-profile-header">
                         <div class="employee-avatar"><span>${(employee.firstName || '?').charAt(0)}${(employee.lastName || '?').charAt(0)}</span></div>
                         <div class="employee-profile-info">
                             <h2>${employee.firstName || ''} ${employee.lastName || ''}</h2>
                             <p>${employee.position || 'Poste non spécifié'}</p>
                             <div class="employee-contact">
                                 ${employee.email ? `<p><i class="fas fa-envelope"></i> ${employee.email}</p>` : ''}
                                 ${employee.phone ? `<p><i class="fas fa-phone"></i> ${employee.phone}</p>` : ''}
                             </div>
                         </div>
                     </div>
                     <div class="employee-details">
                         <div class="detail-row"><div class="detail-label">ID Employé:</div><div class="detail-value">${employee.employeeId || '-'}</div></div>
                         <div class="detail-row"><div class="detail-label">Salaire Base Actuel:</div><div class="detail-value">${employee.baseSalary ? `${employee.baseSalary.toLocaleString()} ${currencySymbol}` : '-'}</div></div>
                         <div class="detail-row"><div class="detail-label">Date Embauche:</div><div class="detail-value">${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : '-'}</div></div>
                         <div class="detail-row"><div class="detail-label">Période Rapport:</div><div class="detail-value">Du ${startDateTime.toLocaleDateString()} au ${endDateTime.toLocaleDateString()}</div></div>
                     </div>
                </div>
                <div class="report-summary">
                    <div class="summary-cards">
                        <div class="summary-card"><h4>Salaires Traités</h4><div class="summary-value">${salaries.length}</div></div>
                        <div class="summary-card"><h4>Avances Accordées</h4><div class="summary-value">${totalAdvancesPeriod.toLocaleString()} ${currencySymbol}</div></div>
                        <div class="summary-card"><h4>Sanctions Appliquées</h4><div class="summary-value">${totalSanctionsPeriod.toLocaleString()} ${currencySymbol}</div></div>
                        <div class="summary-card"><h4>Dettes Enregistrées</h4><div class="summary-value">${totalDebtsPeriod.toLocaleString()} ${currencySymbol}</div></div>
                        <div class="summary-card total"><h4>Total Net Versé</h4><div class="summary-value">${totalNetSalaryPaid.toLocaleString()} ${currencySymbol}</div></div>
                    </div>
                </div>`;

             // --- Append sections for salaries, advances, sanctions, debts (using filtered data) ---
             if (salaries.length > 0) {
                reportContent += `<div class="report-section"><h3>Salaires Versés</h3><div class="table-responsive"><table class="table"><thead><tr><th>Période</th><th>Salaire Base</th><th>Avances Déduites</th><th>Sanctions Déduites</th><th>Dettes Déduites</th><th>Salaire Net</th><th>Statut</th></tr></thead><tbody>
                    ${salaries.map(s => `<tr><td>${new Date(s.paymentDate).toLocaleString('fr-FR', {month:'long', year:'numeric'})}</td><td>${(s.baseSalary||0).toLocaleString()} ${currencySymbol}</td><td>${(s.advances||0).toLocaleString()} ${currencySymbol}</td><td>${(s.sanctions||0).toLocaleString()} ${currencySymbol}</td><td>${(s.debts||0).toLocaleString()} ${currencySymbol}</td><td class="${(s.netSalary||0) >= 0 ? 'text-success' : 'text-danger'}">${(s.netSalary||0).toLocaleString()} ${currencySymbol}</td><td><span class="badge ${s.isPaid ? 'badge-success' : 'badge-warning'}">${s.isPaid ? 'Payé' : 'En attente'}</span></td></tr>`).join('')}
                </tbody></table></div></div>`;
             } else {
                 reportContent += `<div class="report-section"><h3>Salaires Versés</h3><p class="empty-message">Aucun salaire traité pour cet employé sur la période sélectionnée.</p></div>`;
             }
             if (advances.length > 0) {
                 reportContent += `<div class="report-section"><h3>Avances Accordées</h3><div class="table-responsive"><table class="table"><thead><tr><th>Date</th><th>Montant</th><th>Raison</th><th>Statut Remb.</th></tr></thead><tbody>
                     ${advances.map(a => `<tr><td>${new Date(a.date).toLocaleDateString()}</td><td>${(a.amount||0).toLocaleString()} ${currencySymbol}</td><td>${a.reason || '-'}</td><td><span class="badge ${a.isPaid ? 'badge-success' : 'badge-warning'}">${a.isPaid ? 'Remboursée' : 'Non remboursée'}</span></td></tr>`).join('')}
                 </tbody></table></div></div>`;
             }
             if (sanctions.length > 0) {
                 reportContent += `<div class="report-section"><h3>Sanctions Appliquées</h3><div class="table-responsive"><table class="table"><thead><tr><th>Date</th><th>Type</th><th>Montant</th><th>Raison</th></tr></thead><tbody>
                     ${sanctions.map(s => { let type = ''; switch (s.type) { case 'late': type='Retard'; break; case 'absence': type='Absence'; break; case 'misconduct': type='Faute'; break; default: type=s.type||'Autre'; }; return `<tr><td>${new Date(s.date).toLocaleDateString()}</td><td>${type}</td><td>${(s.amount||0).toLocaleString()} ${currencySymbol}</td><td>${s.reason || '-'}</td></tr>`}).join('')}
                 </tbody></table></div></div>`;
             }
              if (debts.length > 0) {
                 reportContent += `<div class="report-section"><h3>Dettes Clients Enregistrées</h3><div class="table-responsive"><table class="table"><thead><tr><th>Date</th><th>Client</th><th>Montant</th><th>Description</th><th>Statut Paiement</th></tr></thead><tbody>
                      ${debts.map(d => `<tr><td>${new Date(d.date).toLocaleDateString()}</td><td>${d.clientName || '-'}</td><td>${(d.amount||0).toLocaleString()} ${currencySymbol}</td><td>${d.description || '-'}</td><td><span class="badge ${d.isPaid ? 'badge-success' : 'badge-warning'}">${d.isPaid ? 'Payée' : 'Non payée'}</span></td></tr>`).join('')}
                 </tbody></table></div></div>`;
             }


            // Afficher le rapport
            this.displayReport(reportTitle, reportContent);
            // Stocker les données pour l'exportation
            this.reportData = { title: reportTitle, type: 'employee', employee, startDate: startDateTime, endDate: endDateTime, salaries, advances, sanctions, debts };

        } catch (error) {
            console.error("Error generating employee report:", error);
            this.displayReport("Erreur Rapport Employé", `<p class="error-message">Impossible de générer le rapport. Erreur: ${error.message}</p>`);
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
        window.showLoader('Génération du rapport avances...');
         try {
             const reportTitle = `Rapport Avances${unpaidOnly ? ' (Non Remboursées)' : ''}`;
             const startDateTime = new Date(startDateStr);
             const endDateTime = new Date(endDateStr);
             endDateTime.setHours(23, 59, 59, 999);

             // Fetch data using DataManager
             const [allAdvances, employees, settings] = await Promise.all([
                 DataManager.advances.getAll(),
                 DataManager.employees.getAll(), // Needed for names and summary
                 DataManager.settings.get()
             ]);

             if (!settings) throw new Error("Paramètres introuvables.");
             if (!Array.isArray(employees)) throw new Error("Données employés invalides.");
             if (!Array.isArray(allAdvances)) throw new Error("Données avances invalides.");

             const currencySymbol = settings.currency || 'FCFA';
             const employeeMap = employees.reduce((map, emp) => { map[emp.id] = emp; return map; }, {});

             // Filter advances for period and status
             let advances = allAdvances.filter(a => { const d = new Date(a.date); return d >= startDateTime && d <= endDateTime; });
             if (unpaidOnly) {
                 advances = advances.filter(a => !a.isPaid);
             }

             // --- Calculations (remain the same) ---
             const totalAdvances = advances.reduce((sum, a) => sum + (a.amount || 0), 0);
             const paidAdvances = advances.filter(a => a.isPaid);
             const unpaidAdvances = advances.filter(a => !a.isPaid);
             const totalPaid = paidAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);
             const totalUnpaid = unpaidAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);
             const employeeIds = new Set(advances.map(a => a.employeeId));
             const employeeCount = employeeIds.size;

             // --- Build Report HTML (using employeeMap) ---
             const advanceRows = advances.map(advance => {
                 const employee = employeeMap[advance.employeeId];
                 return `<tr><td>${employee ? `${employee.firstName || ''} ${employee.lastName || ''}` : 'Employé inconnu'}</td><td>${new Date(advance.date).toLocaleDateString()}</td><td>${(advance.amount||0).toLocaleString()} ${currencySymbol}</td><td>${advance.reason || '-'}</td><td><span class="badge ${advance.isPaid ? 'badge-success' : 'badge-warning'}">${advance.isPaid ? 'Remboursée' : 'Non remboursée'}</span></td></tr>`;
             }).join('');

             const employeeSummaryRows = Array.from(employeeIds).map(employeeId => {
                 const employee = employeeMap[employeeId];
                 if (!employee) return '';
                 const empAdvances = advances.filter(a => a.employeeId === employeeId);
                 const empPaid = empAdvances.filter(a => a.isPaid).reduce((sum, a) => sum + (a.amount||0), 0);
                 const empUnpaid = empAdvances.filter(a => !a.isPaid).reduce((sum, a) => sum + (a.amount||0), 0);
                 const empTotal = empPaid + empUnpaid;
                 return `<tr><td>${employee.firstName || ''} ${employee.lastName || ''}</td><td>${employee.position || '-'}</td><td>${empAdvances.length}</td><td>${empTotal.toLocaleString()} ${currencySymbol}</td><td>${empPaid.toLocaleString()} ${currencySymbol}</td><td>${empUnpaid.toLocaleString()} ${currencySymbol}</td></tr>`;
             }).join('');

             // --- Assemble final report content (HTML structure remains the same) ---
             let reportContent = `
                <div class="report-period"><p>Période: Du ${startDateTime.toLocaleDateString()} au ${endDateTime.toLocaleDateString()}</p></div>
                <div class="report-summary"><div class="summary-cards">
                    <div class="summary-card"><h4>Total Avances</h4><div class="summary-value">${totalAdvances.toLocaleString()} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Remboursées</h4><div class="summary-value">${totalPaid.toLocaleString()} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Non Remboursées</h4><div class="summary-value">${totalUnpaid.toLocaleString()} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Employés Concernés</h4><div class="summary-value">${employeeCount}</div></div>
                </div></div>`;
             if (advances.length > 0) {
                 reportContent += `
                     <div class="report-section"><h3>Liste des Avances${unpaidOnly ? ' Non Remboursées' : ''}</h3><div class="table-responsive"><table class="table"><thead><tr><th>Employé</th><th>Date</th><th>Montant</th><th>Raison</th><th>Statut</th></tr></thead><tbody>${advanceRows}</tbody></table></div></div>
                     <div class="report-section"><h3>Résumé par Employé</h3><div class="table-responsive"><table class="table"><thead><tr><th>Employé</th><th>Poste</th><th>Nb Avances</th><th>Total</th><th>Remboursées</th><th>Non Remb.</th></tr></thead><tbody>${employeeSummaryRows}</tbody></table></div></div>`;
             } else {
                 reportContent += `<div class="report-section"><h3>Liste des Avances${unpaidOnly ? ' Non Remboursées' : ''}</h3><p class="empty-message">Aucune avance trouvée pour la période sélectionnée.</p></div>`;
             }

             this.displayReport(reportTitle, reportContent);
             this.reportData = { title: reportTitle, type: 'advances', startDate: startDateTime, endDate: endDateTime, unpaidOnly, advances, totalAdvances, totalPaid, totalUnpaid, employeeCount };

         } catch(error) {
             console.error("Error generating advances report:", error);
             this.displayReport("Erreur Rapport Avances", `<p class="error-message">Impossible de générer le rapport. Erreur: ${error.message}</p>`);
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
         window.showLoader('Génération du rapport sanctions...');
          try {
             const startDateTime = new Date(startDateStr);
             const endDateTime = new Date(endDateStr);
             endDateTime.setHours(23, 59, 59, 999);

             // Fetch data using DataManager
             const [allSanctions, employees, settings] = await Promise.all([
                  DataManager.sanctions.getAll(),
                  DataManager.employees.getAll(),
                  DataManager.settings.get()
             ]);

             if (!settings) throw new Error("Paramètres introuvables.");
             if (!Array.isArray(employees)) throw new Error("Données employés invalides.");
             if (!Array.isArray(allSanctions)) throw new Error("Données sanctions invalides.");

             const currencySymbol = settings.currency || 'FCFA';
             const employeeMap = employees.reduce((map, emp) => { map[emp.id] = emp; return map; }, {});

             // Filter sanctions
             let sanctions = allSanctions.filter(s => { const d = new Date(s.date); return d >= startDateTime && d <= endDateTime; });
             let reportTitle = 'Rapport de Sanctions';
             if (sanctionType !== 'all') {
                 sanctions = sanctions.filter(s => s.type === sanctionType);
                 const typeSelect = document.getElementById('sanctions-report-type');
                 const selectedText = typeSelect.options[typeSelect.selectedIndex].text;
                 reportTitle += ` (${selectedText})`;
             }

             // --- Calculations (remain the same) ---
             const totalAmount = sanctions.reduce((sum, s) => sum + (s.amount || 0), 0);
             const typeAmounts = sanctions.reduce((acc, s) => {
                 acc[s.type] = (acc[s.type] || 0) + (s.amount || 0);
                 return acc;
             }, {});
             const lateAmount = typeAmounts['late'] || 0;
             const absenceAmount = typeAmounts['absence'] || 0;
             const misconductAmount = typeAmounts['misconduct'] || 0;
             const otherAmount = totalAmount - lateAmount - absenceAmount - misconductAmount; // Calculate other dynamically
             const employeeIds = new Set(sanctions.map(s => s.employeeId));
             const employeeCount = employeeIds.size;


             // --- Build Report HTML (using employeeMap) ---
              const sanctionRows = sanctions.map(sanction => {
                 const employee = employeeMap[sanction.employeeId];
                 let typeLabel = ''; switch (sanction.type) { case 'late': typeLabel='Retard'; break; case 'absence': typeLabel='Absence'; break; case 'misconduct': typeLabel='Faute'; break; default: typeLabel=sanction.type||'Autre'; }
                 return `<tr><td>${employee ? `${employee.firstName || ''} ${employee.lastName || ''}` : 'Employé inconnu'}</td><td>${new Date(sanction.date).toLocaleDateString()}</td><td>${typeLabel}</td><td>${(sanction.amount||0).toLocaleString()} ${currencySymbol}</td><td>${sanction.reason || '-'}</td></tr>`;
             }).join('');

              const employeeSummaryRows = Array.from(employeeIds).map(employeeId => {
                 const employee = employeeMap[employeeId];
                 if (!employee) return '';
                 const empSanctions = sanctions.filter(s => s.employeeId === employeeId);
                 const empTotal = empSanctions.reduce((sum, s) => sum + (s.amount || 0), 0);
                 const empTypeAmounts = empSanctions.reduce((acc, s) => { acc[s.type] = (acc[s.type] || 0) + (s.amount || 0); return acc; }, {});
                 return `<tr><td>${employee.firstName || ''} ${employee.lastName || ''}</td><td>${employee.position || '-'}</td><td>${empSanctions.length}</td><td>${empTotal.toLocaleString()} ${currencySymbol}</td><td>${(empTypeAmounts['late']||0).toLocaleString()} ${currencySymbol}</td><td>${(empTypeAmounts['absence']||0).toLocaleString()} ${currencySymbol}</td><td>${(empTotal - (empTypeAmounts['late']||0) - (empTypeAmounts['absence']||0)).toLocaleString()} ${currencySymbol}</td></tr>`;
             }).join('');


             // --- Assemble final report content (HTML structure remains the same) ---
             let reportContent = `
                <div class="report-period"><p>Période: Du ${startDateTime.toLocaleDateString()} au ${endDateTime.toLocaleDateString()}</p></div>
                <div class="report-summary"><div class="summary-cards">
                    <div class="summary-card"><h4>Total Sanctions</h4><div class="summary-value">${totalAmount.toLocaleString()} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Retards</h4><div class="summary-value">${lateAmount.toLocaleString()} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Absences</h4><div class="summary-value">${absenceAmount.toLocaleString()} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Fautes/Autres</h4><div class="summary-value">${(misconductAmount + otherAmount).toLocaleString()} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Employés Concernés</h4><div class="summary-value">${employeeCount}</div></div>
                </div></div>`;
             if (sanctions.length > 0) {
                 reportContent += `
                     <div class="report-section"><h3>Liste des Sanctions</h3><div class="table-responsive"><table class="table"><thead><tr><th>Employé</th><th>Date</th><th>Type</th><th>Montant</th><th>Raison</th></tr></thead><tbody>${sanctionRows}</tbody></table></div></div>
                     <div class="report-section"><h3>Résumé par Employé</h3><div class="table-responsive"><table class="table"><thead><tr><th>Employé</th><th>Poste</th><th>Nb Sanctions</th><th>Total</th><th>Retards</th><th>Absences</th><th>Fautes/Autres</th></tr></thead><tbody>${employeeSummaryRows}</tbody></table></div></div>`;
             } else {
                 reportContent += `<div class="report-section"><h3>Liste des Sanctions</h3><p class="empty-message">Aucune sanction trouvée pour la période et le type sélectionnés.</p></div>`;
             }

             this.displayReport(reportTitle, reportContent);
             this.reportData = { title: reportTitle, type: 'sanctions', startDate: startDateTime, endDate: endDateTime, sanctionType, sanctions, totalAmount, typeAmounts, employeeCount };

         } catch(error) {
             console.error("Error generating sanctions report:", error);
             this.displayReport("Erreur Rapport Sanctions", `<p class="error-message">Impossible de générer le rapport. Erreur: ${error.message}</p>`);
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
         window.showLoader('Génération du rapport dettes...');
          try {
             const reportTitle = `Rapport Dettes Clients${unpaidOnly ? ' (Non Payées)' : ''}`;
             const startDateTime = new Date(startDateStr);
             const endDateTime = new Date(endDateStr);
             endDateTime.setHours(23, 59, 59, 999);

             // Fetch data using DataManager
             const [allDebts, employees, settings] = await Promise.all([
                  DataManager.debts.getAll(),
                  DataManager.employees.getAll(),
                  DataManager.settings.get()
             ]);

             if (!settings) throw new Error("Paramètres introuvables.");
             if (!Array.isArray(employees)) throw new Error("Données employés invalides.");
             if (!Array.isArray(allDebts)) throw new Error("Données dettes invalides.");

             const currencySymbol = settings.currency || 'FCFA';
             const employeeMap = employees.reduce((map, emp) => { map[emp.id] = emp; return map; }, {});

             // Filter debts
             let debts = allDebts.filter(d => { const date = new Date(d.date); return date >= startDateTime && date <= endDateTime; });
             if (unpaidOnly) {
                 debts = debts.filter(d => !d.isPaid);
             }

             // --- Calculations (remain the same) ---
             const totalDebts = debts.reduce((sum, d) => sum + (d.amount || 0), 0);
             const paidDebts = debts.filter(d => d.isPaid);
             const unpaidDebts = debts.filter(d => !d.isPaid);
             const totalPaid = paidDebts.reduce((sum, d) => sum + (d.amount || 0), 0);
             const totalUnpaid = unpaidDebts.reduce((sum, d) => sum + (d.amount || 0), 0);
             const employeeIds = new Set(debts.map(d => d.employeeId));
             const employeeCount = employeeIds.size;
             const clientNames = new Set(debts.map(d => d.clientName).filter(Boolean)); // Filter out empty names
             const clientCount = clientNames.size;

             // --- Build Report HTML (using employeeMap) ---
              const debtRows = debts.map(debt => {
                 const employee = employeeMap[debt.employeeId];
                 return `<tr><td>${employee ? `${employee.firstName || ''} ${employee.lastName || ''}` : 'Employé inconnu'}</td><td>${debt.clientName || '-'}</td><td>${new Date(debt.date).toLocaleDateString()}</td><td>${(debt.amount||0).toLocaleString()} ${currencySymbol}</td><td>${debt.description || '-'}</td><td><span class="badge ${debt.isPaid ? 'badge-success' : 'badge-warning'}">${debt.isPaid ? 'Payée' : 'Non payée'}</span></td></tr>`;
             }).join('');

              const employeeSummaryRows = Array.from(employeeIds).map(employeeId => {
                 const employee = employeeMap[employeeId];
                 if (!employee) return '';
                 const empDebts = debts.filter(d => d.employeeId === employeeId);
                 const empPaid = empDebts.filter(d => d.isPaid).reduce((sum, d) => sum + (d.amount||0), 0);
                 const empUnpaid = empDebts.filter(d => !d.isPaid).reduce((sum, d) => sum + (d.amount||0), 0);
                 const empTotal = empPaid + empUnpaid;
                 return `<tr><td>${employee.firstName || ''} ${employee.lastName || ''}</td><td>${employee.position || '-'}</td><td>${empDebts.length}</td><td>${empTotal.toLocaleString()} ${currencySymbol}</td><td>${empPaid.toLocaleString()} ${currencySymbol}</td><td>${empUnpaid.toLocaleString()} ${currencySymbol}</td></tr>`;
             }).join('');

             const clientSummaryRows = Array.from(clientNames).map(clientName => {
                 const clientDebts = debts.filter(d => d.clientName === clientName);
                 const clientPaid = clientDebts.filter(d => d.isPaid).reduce((sum, d) => sum + (d.amount||0), 0);
                 const clientUnpaid = clientDebts.filter(d => !d.isPaid).reduce((sum, d) => sum + (d.amount||0), 0);
                 const clientTotal = clientPaid + clientUnpaid;
                 return `<tr><td>${clientName || '-'}</td><td>${clientDebts.length}</td><td>${clientTotal.toLocaleString()} ${currencySymbol}</td><td>${clientPaid.toLocaleString()} ${currencySymbol}</td><td>${clientUnpaid.toLocaleString()} ${currencySymbol}</td></tr>`;
             }).join('');

             // --- Assemble final report content (HTML structure remains the same) ---
             let reportContent = `
                <div class="report-period"><p>Période: Du ${startDateTime.toLocaleDateString()} au ${endDateTime.toLocaleDateString()}</p></div>
                <div class="report-summary"><div class="summary-cards">
                    <div class="summary-card"><h4>Total Dettes</h4><div class="summary-value">${totalDebts.toLocaleString()} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Payées</h4><div class="summary-value">${totalPaid.toLocaleString()} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Non Payées</h4><div class="summary-value">${totalUnpaid.toLocaleString()} ${currencySymbol}</div></div>
                    <div class="summary-card"><h4>Employés Resp.</h4><div class="summary-value">${employeeCount}</div></div>
                    <div class="summary-card"><h4>Clients</h4><div class="summary-value">${clientCount}</div></div>
                </div></div>`;
             if (debts.length > 0) {
                 reportContent += `
                     <div class="report-section"><h3>Liste des Dettes${unpaidOnly ? ' Non Payées' : ''}</h3><div class="table-responsive"><table class="table"><thead><tr><th>Employé Resp.</th><th>Client</th><th>Date</th><th>Montant</th><th>Description</th><th>Statut</th></tr></thead><tbody>${debtRows}</tbody></table></div></div>
                     <div class="report-section"><h3>Résumé par Employé</h3><div class="table-responsive"><table class="table"><thead><tr><th>Employé</th><th>Poste</th><th>Nb Dettes</th><th>Total</th><th>Payées</th><th>Non Payées</th></tr></thead><tbody>${employeeSummaryRows}</tbody></table></div></div>
                     <div class="report-section"><h3>Résumé par Client</h3><div class="table-responsive"><table class="table"><thead><tr><th>Client</th><th>Nb Dettes</th><th>Total</th><th>Payées</th><th>Non Payées</th></tr></thead><tbody>${clientSummaryRows}</tbody></table></div></div>`;
             } else {
                 reportContent += `<div class="report-section"><h3>Liste des Dettes${unpaidOnly ? ' Non Payées' : ''}</h3><p class="empty-message">Aucune dette trouvée pour la période sélectionnée.</p></div>`;
             }

             this.displayReport(reportTitle, reportContent);
             this.reportData = { title: reportTitle, type: 'debts', startDate: startDateTime, endDate: endDateTime, unpaidOnly, debts, totalDebts, totalPaid, totalUnpaid, employeeCount, clientCount };

         } catch(error) {
             console.error("Error generating debts report:", error);
             this.displayReport("Erreur Rapport Dettes", `<p class="error-message">Impossible de générer le rapport. Erreur: ${error.message}</p>`);
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
        window.showLoader(`Génération de l'analyse pour ${year}...`);
        try {
            const reportTitle = `Analyse Annuelle ${year}`;

            // Fetch all data needed for the year using DataManager
            const [allSalaries, allAdvances, allSanctions, allDebts, settings] = await Promise.all([
                 DataManager.salaries.getAll(),
                 DataManager.advances.getAll(),
                 DataManager.sanctions.getAll(),
                 DataManager.debts.getAll(),
                 DataManager.settings.get()
            ]);

            if (!settings) throw new Error("Paramètres introuvables.");
             // Validate arrays
             const yearSalaries = Array.isArray(allSalaries) ? allSalaries.filter(s => new Date(s.paymentDate).getFullYear() === year) : [];
             const yearAdvances = Array.isArray(allAdvances) ? allAdvances.filter(a => new Date(a.date).getFullYear() === year) : [];
             const yearSanctions = Array.isArray(allSanctions) ? allSanctions.filter(s => new Date(s.date).getFullYear() === year) : [];
             const yearDebts = Array.isArray(allDebts) ? allDebts.filter(d => new Date(d.date).getFullYear() === year) : [];

            const currencySymbol = settings.currency || 'FCFA';

            // Process data month by month (remains the same logic)
             const monthlyData = [];
             const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"]; // Shorter names for chart
             for (let month = 0; month < 12; month++) {
                 const monthlySalaries = yearSalaries.filter(s => new Date(s.paymentDate).getMonth() === month);
                 const monthlyAdvances = yearAdvances.filter(a => new Date(a.date).getMonth() === month);
                 const monthlySanctions = yearSanctions.filter(s => new Date(s.date).getMonth() === month);
                 const monthlyDebts = yearDebts.filter(d => new Date(d.date).getMonth() === month);

                 const totalBaseSalary = monthlySalaries.reduce((sum, s) => sum + (s.baseSalary || 0), 0);
                 const totalAdvancesMonth = monthlyAdvances.reduce((sum, a) => sum + (a.amount || 0), 0); // Sum of advances *granted* in month
                 const totalSanctionsMonth = monthlySanctions.reduce((sum, s) => sum + (s.amount || 0), 0); // Sum of sanctions *applied* in month
                 const totalDebtsMonth = monthlyDebts.reduce((sum, d) => sum + (d.amount || 0), 0); // Sum of debts *recorded* in month
                 const totalNetSalary = monthlySalaries.reduce((sum, s) => sum + (s.netSalary || 0), 0); // Sum of net paid

                 monthlyData.push({ month: months[month], monthIndex: month, salaries: monthlySalaries, advances: monthlyAdvances, sanctions: monthlySanctions, debts: monthlyDebts, totalBaseSalary, totalAdvancesMonth, totalSanctionsMonth, totalDebtsMonth, totalNetSalary });
             }

             // Calculate annual totals (remains the same logic)
             const annualTotalBaseSalary = monthlyData.reduce((sum, data) => sum + data.totalBaseSalary, 0);
             const annualTotalAdvances = monthlyData.reduce((sum, data) => sum + data.totalAdvancesMonth, 0);
             const annualTotalSanctions = monthlyData.reduce((sum, data) => sum + data.totalSanctionsMonth, 0);
             const annualTotalDebts = monthlyData.reduce((sum, data) => sum + data.totalDebtsMonth, 0);
             const annualTotalNetSalary = monthlyData.reduce((sum, data) => sum + data.totalNetSalary, 0);

            // --- Build Report HTML (structure remains the same) ---
            let reportContent = `
                <div class="report-summary">
                    <div class="summary-cards">
                        <div class="summary-card"><h4>Total Salaires Base</h4><div class="summary-value">${annualTotalBaseSalary.toLocaleString()} ${currencySymbol}</div></div>
                        <div class="summary-card"><h4>Total Avances Accordées</h4><div class="summary-value">${annualTotalAdvances.toLocaleString()} ${currencySymbol}</div></div>
                        <div class="summary-card"><h4>Total Sanctions Appliquées</h4><div class="summary-value">${annualTotalSanctions.toLocaleString()} ${currencySymbol}</div></div>
                        <div class="summary-card"><h4>Total Dettes Enregistrées</h4><div class="summary-value">${annualTotalDebts.toLocaleString()} ${currencySymbol}</div></div>
                        <div class="summary-card total"><h4>Total Salaires Nets Versés</h4><div class="summary-value">${annualTotalNetSalary.toLocaleString()} ${currencySymbol}</div></div>
                    </div>
                </div>
                <div class="report-section">
                    <h3>Résumé Mensuel (${year})</h3>
                    <div class="table-responsive">
                        <table class="table">
                            <thead><tr><th>Mois</th><th>Salaires Base</th><th>Avances Accordées</th><th>Sanctions Appliquées</th><th>Dettes Enregistrées</th><th>Salaires Nets Versés</th><th>Nb Salariés Payés</th></tr></thead>
                            <tbody>
                                ${monthlyData.map(data => `
                                    <tr>
                                        <td>${data.month}</td>
                                        <td>${data.totalBaseSalary.toLocaleString()} ${currencySymbol}</td>
                                        <td>${data.totalAdvancesMonth.toLocaleString()} ${currencySymbol}</td>
                                        <td>${data.totalSanctionsMonth.toLocaleString()} ${currencySymbol}</td>
                                        <td>${data.totalDebtsMonth.toLocaleString()} ${currencySymbol}</td>
                                        <td>${data.totalNetSalary.toLocaleString()} ${currencySymbol}</td>
                                        <td>${data.salaries.length}</td>
                                    </tr>`).join('')}
                                <tr class="total-row">
                                    <td>TOTAL ${year}</td>
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
                <div class="report-section"><h3>Évolution Mensuelle (${year})</h3><div class="chart-container"><div id="annual-chart" style="height: 400px;"></div></div></div>
            `;

            this.displayReport(reportTitle, reportContent);
            this.generateAnnualChart(monthlyData); // Call chart generation (uses processed data)
            this.reportData = { title: reportTitle, type: 'annual', year, monthlyData, annualTotalBaseSalary, annualTotalAdvances, annualTotalSanctions, annualTotalDebts, annualTotalNetSalary };

        } catch (error) {
            console.error("Error generating annual report:", error);
            this.displayReport("Erreur Analyse Annuelle", `<p class="error-message">Impossible de générer le rapport. Erreur: ${error.message}</p>`);
        } finally {
             window.hideLoader();
        }
    },

    /**
     * Génère le graphique pour l'analyse annuelle (Placeholder)
     */
    generateAnnualChart: function(monthlyData) {
        const chartContainer = document.getElementById('annual-chart');
        if (!chartContainer) return;
        // Replace with actual chart implementation (e.g., Chart.js, ApexCharts)
        // Use data from monthlyData (e.g., monthlyData.map(d => d.month) for labels,
        // monthlyData.map(d => d.totalNetSalary) for net salary data, etc.)
        chartContainer.innerHTML = `<div class="chart-placeholder"><i class="fas fa-chart-line"></i><p>Graphique d'évolution mensuelle (Implémentation à venir)</p></div>`;
    },

    /**
     * Affiche le rapport généré
     */
    displayReport: function(title, content) {
        const reportDisplay = document.getElementById('report-display');
        const reportTitleEl = document.getElementById('report-title'); // Renamed variable
        const reportContentEl = document.getElementById('report-content'); // Renamed variable

        if (!reportDisplay || !reportTitleEl || !reportContentEl) return;

        reportTitleEl.textContent = title;
        reportContentEl.innerHTML = content;
        reportDisplay.style.display = 'block';
        // Scroll smoothly to the report section
        reportDisplay.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /**
     * Imprime le rapport actuel (Using DataManager for settings)
     */
    printReport: async function() {
        if (!this.reportData) { alert("Aucun rapport à imprimer."); return; }

        window.showLoader("Préparation de l'impression...");
        try {
            // Use DataManager for settings
            const settings = await DataManager.settings.get();
            const printWindow = window.open('', '_blank');
            // --- Print Window HTML (remains the same structure) ---
            printWindow.document.write(`
                <!DOCTYPE html><html><head><title>${this.reportData.title}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.4; color: #333; margin: 0; padding: 20px; font-size: 10pt; }
                    .header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #666; padding-bottom: 10px; }
                    .company-name { font-size: 18pt; font-weight: bold; margin-bottom: 5px; }
                    .report-title { font-size: 14pt; font-weight: bold; margin-bottom: 5px; }
                    .report-date, .report-period { font-size: 10pt; color: #555; }
                    .report-content { margin-bottom: 20px; }
                    .summary-cards { display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0; padding: 10px; background-color: #f0f0f0; border-radius: 5px; }
                    .summary-card { background-color: #fff; border: 1px solid #ddd; border-radius: 5px; padding: 8px; flex: 1; min-width: 120px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
                    .summary-card h4 { margin: 0 0 4px 0; font-size: 9pt; color: #444; }
                    .summary-value { font-size: 11pt; font-weight: bold; }
                    .summary-card.total .summary-value { color: var(--primary, #9c27b0); } /* Use variable or fallback */
                    .report-section { margin-bottom: 20px; page-break-inside: avoid; }
                    .report-section h3 { border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 10px; font-size: 12pt; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9pt; }
                    th, td { border: 1px solid #ddd; padding: 5px; text-align: left; vertical-align: top; }
                    th { background-color: #e9e9e9; font-weight: bold; }
                    tbody tr:nth-child(even) { background-color: #f9f9f9; }
                    .total-row td { font-weight: bold; background-color: #e9e9e9; }
                    .text-success { color: green; } .text-danger { color: red; }
                    .badge { display: inline-block; padding: 2px 5px; border-radius: 3px; font-size: 8pt; font-weight: bold; text-transform: uppercase; }
                    .badge-success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
                    .badge-warning { background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
                    .empty-message { color: #666; font-style: italic; padding: 10px; text-align: center; }
                    .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px; text-align: center; font-size: 8pt; color: #555; }
                    @media print { @page { size: A4; margin: 15mm; } body { padding: 0; font-size: 10pt;} .report-actions, .no-print { display: none !important; } }
                    .no-print { display: none; } /* Hide elements not for printing */
                </style></head><body>
                    <div class="header">
                        <div class="company-name">${settings?.companyName || 'Le Sims'}</div>
                        <div class="report-title">${this.reportData.title}</div>
                        <div class="report-date">Généré le ${new Date().toLocaleDateString()} à ${new Date().toLocaleTimeString()}</div>
                    </div>
                    <div class="report-content">
                        ${document.getElementById('report-content')?.innerHTML || 'Contenu du rapport indisponible.'}
                    </div>
                    <div class="footer">
                        <p>${settings?.companyName || 'Le Sims'} - Système de Gestion des Salaires</p>
                    </div>
                    <script> window.onload = function() { window.print(); setTimeout(window.close, 1000); } </script>
                </body></html>
            `);
            printWindow.document.close();
        } catch (error) {
            console.error("Error preparing print:", error);
            alert(`Erreur lors de la préparation de l'impression: ${error.message}`);
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
            // Use DataManager for settings
            const settings = await DataManager.settings.get();
            const currencySymbol = settings?.currency || 'FCFA'; // Use settings currency

            // Add Header Info
            csvContent += `"${this.reportData.title}"\n`;
            csvContent += `"Généré le";"${new Date().toLocaleString()}"\n\n`;

            // Specific content based on report type
            // Using helper function to create CSV rows safely
            const createCsvRow = (arr) => arr.map(val => `"${(val === null || val === undefined ? '' : String(val)).replace(/"/g, '""')}"`).join(',') + '\n';

            switch (this.reportData.type) {
                case 'monthly':
                    const { salaries, advances, sanctions, debts, employeesWithoutSalary } = this.reportData;
                    const employeeMapMonthly = (await DataManager.employees.getAll()).reduce((map, emp) => { map[emp.id] = emp; return map; }, {}); // Get fresh map

                    csvContent += createCsvRow(['Résumé Salaires']);
                    csvContent += createCsvRow(['Employé', 'Poste', 'Salaire Base', 'Avances Déduites', 'Sanctions Déduites', 'Dettes Déduites', 'Salaire Net', 'Statut']);
                    salaries.forEach(s => {
                        const emp = employeeMapMonthly[s.employeeId];
                        csvContent += createCsvRow([emp ? `${emp.firstName || ''} ${emp.lastName || ''}` : s.employeeId, emp?.position || '-', s.baseSalary||0, s.advances||0, s.sanctions||0, s.debts||0, s.netSalary||0, s.isPaid ? 'Payé' : 'En attente']);
                    });
                    csvContent += '\n';

                     if(employeesWithoutSalary.length > 0) {
                         csvContent += createCsvRow(['Employés Sans Salaire Traité ce Mois']);
                         csvContent += createCsvRow(['Employé', 'Poste', 'Salaire Base', 'Date Embauche']);
                         employeesWithoutSalary.forEach(emp => csvContent += createCsvRow([`${emp.firstName||''} ${emp.lastName||''}`, emp.position||'-', emp.baseSalary||0, emp.hireDate ? new Date(emp.hireDate).toLocaleDateString() : '-']));
                         csvContent += '\n';
                     }
                     if(advances.length > 0) {
                         csvContent += createCsvRow(['Avances Accordées ce Mois']);
                         csvContent += createCsvRow(['Employé', 'Date', 'Montant', 'Raison', 'Statut Remb.']);
                         advances.forEach(a => { const emp = employeeMapMonthly[a.employeeId]; csvContent += createCsvRow([emp ? `${emp.firstName||''} ${emp.lastName||''}` : a.employeeId, new Date(a.date).toLocaleDateString(), a.amount||0, a.reason||'-', a.isPaid ? 'Remboursée' : 'Non remboursée']); });
                         csvContent += '\n';
                     }
                     // Add sanctions and debts similarly...
                     if(sanctions.length > 0) {
                         csvContent += createCsvRow(['Sanctions Appliquées ce Mois']);
                         csvContent += createCsvRow(['Employé', 'Date', 'Type', 'Montant', 'Raison']);
                         sanctions.forEach(s => { let type = ''; switch (s.type) { case 'late': type='Retard'; break; case 'absence': type='Absence'; break; case 'misconduct': type='Faute'; break; default: type=s.type||'Autre'; }; const emp = employeeMapMonthly[s.employeeId]; csvContent += createCsvRow([emp ? `${emp.firstName||''} ${emp.lastName||''}` : s.employeeId, new Date(s.date).toLocaleDateString(), type, s.amount||0, s.reason||'-']); });
                         csvContent += '\n';
                     }
                     if(debts.length > 0) {
                         csvContent += createCsvRow(['Dettes Clients Enregistrées ce Mois']);
                         csvContent += createCsvRow(['Employé Resp.', 'Client', 'Date', 'Montant', 'Description', 'Statut Paiement']);
                         debts.forEach(d => { const emp = employeeMapMonthly[d.employeeId]; csvContent += createCsvRow([emp ? `${emp.firstName||''} ${emp.lastName||''}` : d.employeeId, d.clientName||'-', new Date(d.date).toLocaleDateString(), d.amount||0, d.description||'-', d.isPaid ? 'Payée' : 'Non payée']); });
                         csvContent += '\n';
                     }
                    break;

                case 'employee':
                    const { employee, salaries: empSalaries, advances: empAdvances, sanctions: empSanctions, debts: empDebts } = this.reportData;
                    csvContent += createCsvRow(['Rapport Employé:', `${employee.firstName||''} ${employee.lastName||''}`]);
                    csvContent += createCsvRow(['Période:', `Du ${new Date(this.reportData.startDate).toLocaleDateString()} au ${new Date(this.reportData.endDate).toLocaleDateString()}`]);
                    csvContent += '\n';

                    if(empSalaries.length > 0){
                         csvContent += createCsvRow(['Salaires Versés']);
                         csvContent += createCsvRow(['Période', 'Salaire Base', 'Avances Déduites', 'Sanctions Déduites', 'Dettes Déduites', 'Salaire Net', 'Statut']);
                         empSalaries.forEach(s => csvContent += createCsvRow([new Date(s.paymentDate).toLocaleString('fr-FR', {month:'long', year:'numeric'}), s.baseSalary||0, s.advances||0, s.sanctions||0, s.debts||0, s.netSalary||0, s.isPaid ? 'Payé' : 'En attente']));
                         csvContent += '\n';
                    }
                    if(empAdvances.length > 0){
                        csvContent += createCsvRow(['Avances Accordées']);
                        csvContent += createCsvRow(['Date', 'Montant', 'Raison', 'Statut Remb.']);
                        empAdvances.forEach(a => csvContent += createCsvRow([new Date(a.date).toLocaleDateString(), a.amount||0, a.reason||'-', a.isPaid ? 'Remboursée' : 'Non remboursée']));
                        csvContent += '\n';
                    }
                    // Add sanctions and debts similarly...
                    if(empSanctions.length > 0){
                         csvContent += createCsvRow(['Sanctions Appliquées']);
                         csvContent += createCsvRow(['Date', 'Type', 'Montant', 'Raison']);
                         empSanctions.forEach(s => { let type = ''; switch (s.type) { case 'late': type='Retard'; break; case 'absence': type='Absence'; break; case 'misconduct': type='Faute'; break; default: type=s.type||'Autre'; }; csvContent += createCsvRow([new Date(s.date).toLocaleDateString(), type, s.amount||0, s.reason||'-']); });
                         csvContent += '\n';
                    }
                    if(empDebts.length > 0){
                         csvContent += createCsvRow(['Dettes Clients Enregistrées']);
                         csvContent += createCsvRow(['Date', 'Client', 'Montant', 'Description', 'Statut Paiement']);
                         empDebts.forEach(d => csvContent += createCsvRow([new Date(d.date).toLocaleDateString(), d.clientName||'-', d.amount||0, d.description||'-', d.isPaid ? 'Payée' : 'Non payée']));
                         csvContent += '\n';
                    }
                    break;

                 case 'advances':
                    const { advances: advReportAdvances } = this.reportData;
                    const employeeMapAdv = (await DataManager.employees.getAll()).reduce((map, emp) => { map[emp.id] = emp; return map; }, {});
                    csvContent += createCsvRow(['Liste Avances']);
                    csvContent += createCsvRow(['Employé', 'Date', 'Montant', 'Raison', 'Statut Remb.']);
                    advReportAdvances.forEach(a => { const emp = employeeMapAdv[a.employeeId]; csvContent += createCsvRow([emp ? `${emp.firstName||''} ${emp.lastName||''}` : a.employeeId, new Date(a.date).toLocaleDateString(), a.amount||0, a.reason||'-', a.isPaid ? 'Remboursée' : 'Non remboursée']); });
                    break;

                 case 'sanctions':
                    const { sanctions: sancReportSanctions } = this.reportData;
                    const employeeMapSanc = (await DataManager.employees.getAll()).reduce((map, emp) => { map[emp.id] = emp; return map; }, {});
                     csvContent += createCsvRow(['Liste Sanctions']);
                     csvContent += createCsvRow(['Employé', 'Date', 'Type', 'Montant', 'Raison']);
                     sancReportSanctions.forEach(s => { let type = ''; switch (s.type) { case 'late': type='Retard'; break; case 'absence': type='Absence'; break; case 'misconduct': type='Faute'; break; default: type=s.type||'Autre'; }; const emp = employeeMapSanc[s.employeeId]; csvContent += createCsvRow([emp ? `${emp.firstName||''} ${emp.lastName||''}` : s.employeeId, new Date(s.date).toLocaleDateString(), type, s.amount||0, s.reason||'-']); });
                     break;

                 case 'debts':
                     const { debts: debtReportDebts } = this.reportData;
                     const employeeMapDebt = (await DataManager.employees.getAll()).reduce((map, emp) => { map[emp.id] = emp; return map; }, {});
                     csvContent += createCsvRow(['Liste Dettes Clients']);
                     csvContent += createCsvRow(['Employé Resp.', 'Client', 'Date', 'Montant', 'Description', 'Statut Paiement']);
                     debtReportDebts.forEach(d => { const emp = employeeMapDebt[d.employeeId]; csvContent += createCsvRow([emp ? `${emp.firstName||''} ${emp.lastName||''}` : d.employeeId, d.clientName||'-', new Date(d.date).toLocaleDateString(), d.amount||0, d.description||'-', d.isPaid ? 'Payée' : 'Non payée']); });
                     break;

                 case 'annual':
                     const { monthlyData, year } = this.reportData;
                     csvContent += createCsvRow([`Résumé Annuel ${year}`]);
                     csvContent += createCsvRow(['Mois', 'Salaires Base', 'Avances Accordées', 'Sanctions Appliquées', 'Dettes Enregistrées', 'Salaires Nets Versés', 'Nb Salariés Payés']);
                     monthlyData.forEach(d => {
                        csvContent += createCsvRow([d.month, d.totalBaseSalary||0, d.totalAdvancesMonth||0, d.totalSanctionsMonth||0, d.totalDebtsMonth||0, d.totalNetSalary||0, d.salaries.length]);
                     });
                     break;

                default:
                    csvContent += createCsvRow(['Type de rapport non supporté pour l\'export CSV']);
                    break;
            }

            // Create Blob and download
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.reportData.title.replace(/[\s/]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

        } catch (error) {
            console.error("Error exporting report CSV:", error);
            alert(`Erreur lors de l'exportation CSV: ${error.message}`);
        } finally {
            window.hideLoader();
        }
    },


    /**
     * Ferme le rapport actuel
     */
    closeReport: function() {
         const reportDisplay = document.getElementById('report-display');
         if (!reportDisplay) return;
         reportDisplay.style.display = 'none';
         reportDisplay.querySelector('#report-content').innerHTML = ''; // Clear content
         this.reportData = null; // Reset stored data
    },

    /**
     * Attache les événements aux éléments de la page (Using DataManager)
     */
    bindEvents: function() {
        const reportsPage = document.getElementById('reports-page');

        // Use event delegation on the reports page container
        if (reportsPage) {
             reportsPage.addEventListener('click', async (event) => {
                let targetElement = event.target;
                let buttonId = null;

                // Check if the click was on a button or its icon inside a report card or report display
                const button = targetElement.closest('button[id]');
                if (button) {
                    buttonId = button.id;
                }

                if (!buttonId) return; // Ignore clicks not on relevant buttons

                try {
                    // Generate report buttons
                    if (buttonId.startsWith('generate-')) {
                         window.showLoader("Génération du rapport..."); // Show loader before async operation
                         switch(buttonId) {
                             case 'generate-monthly-report': await this.generateMonthlyReport(); break;
                             case 'generate-employee-report': await this.generateEmployeeReport(); break;
                             case 'generate-advances-report': await this.generateAdvancesReport(); break;
                             case 'generate-sanctions-report': await this.generateSanctionsReport(); break;
                             case 'generate-debts-report': await this.generateDebtsReport(); break;
                             case 'generate-annual-report': await this.generateAnnualReport(); break;
                         }
                         window.hideLoader(); // Hide loader after generation attempt
                    }
                    // Report action buttons
                    else if (buttonId === 'print-report') {
                        await this.printReport();
                    } else if (buttonId === 'export-report') {
                        await this.exportReportCSV();
                    } else if (buttonId === 'close-report') {
                        this.closeReport();
                    }
                 } catch (error) {
                     console.error(`Error handling button click (${buttonId}):`, error);
                     window.hideLoader(); // Ensure loader is hidden on error
                     alert("Une erreur s'est produite lors de l'action sur le rapport.");
                 }
            });
        }
    }
};

window.ReportsManager = ReportsManager;