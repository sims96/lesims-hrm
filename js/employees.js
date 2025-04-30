    /**
     * employees.js
     * Gestion des employés
     * Application de Gestion des Salaires Le Sims
     * (Updated for Supabase + Global Assignment)
     */

    const EmployeesManager = {
        /**
         * Initialisation du module de gestion des employés
         */
        init: async function() { // Added async
            // Load page structure first (synchronous HTML injection)
            this.renderEmployeesPageStructure();
            // Then load data and filters asynchronously
            try {
                await this.loadEmployees(); // Added await
                await this.loadPositionFilters(); // Added await
            } catch (error) {
                console.error("Error during EmployeesManager initialization:", error);
                // Display error message on the page if needed
                const employeesPage = document.getElementById('employees-page');
                 if(employeesPage) {
                    const listContainer = employeesPage.querySelector('#employees-list');
                    const noDataMessage = employeesPage.querySelector('#no-employees-message');
                    if(listContainer) listContainer.innerHTML = '';
                    if(noDataMessage) {
                        noDataMessage.textContent = "Erreur lors du chargement initial des employés.";
                        noDataMessage.style.display = 'block';
                    }
                 }
            }
            this.bindEvents(); // Setup event listeners
            console.log("EmployeesManager initialized logic executed."); // Changed log message
        },

        // ... (keep all other functions like renderEmployeesPageStructure, loadEmployees, loadPositionFilters, showEmployeeModal, bindModalEvents, closeModal, saveEmployee, showDeleteConfirmation, deleteEmployee, showEmployeeDetails, bindEvents AS THEY ARE in the previous version) ...
        // Paste the rest of the EmployeesManager object code here from the previous version...

        /**
         * Renders the static HTML structure for the employees page.
         * Data loading happens separately in loadEmployees.
         */
        renderEmployeesPageStructure: function() {
            const employeesPage = document.getElementById('employees-page');
            if (!employeesPage) return;

            // Construction de la page statique
            employeesPage.innerHTML = `
                <div class="page-header">
                    <h1>Gestion des Employés</h1>
                    <button id="add-employee-btn" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Ajouter un Employé
                    </button>
                </div>

                <div class="card mb-4">
                    <div class="card-body">
                        <div class="filters">
                            <div class="search-box">
                                <input type="text" id="employee-search" placeholder="Rechercher un employé...">
                                <i class="fas fa-search"></i>
                            </div>
                            <div class="filter-actions">
                                <select id="position-filter" class="form-control">
                                    <option value="">Tous les postes</option>
                                    </select>
                                <select id="sort-employees" class="form-control">
                                    <option value="name">Trier par nom</option>
                                    <option value="position">Trier par poste</option>
                                    <option value="salary">Trier par salaire</option>
                                    <option value="date">Trier par date d'embauche</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="table-responsive">
                    <table id="employees-table" class="table">
                        <thead>
                            <tr>
                                <th>Nom</th>
                                <th>Poste</th>
                                <th>Email</th>
                                <th>Téléphone</th>
                                <th>Salaire de Base</th>
                                <th>Date d'Embauche</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="employees-list">
                            <tr><td colspan="7"><div class="loading-spinner-inline"></div> Chargement...</td></tr>
                        </tbody>
                    </table>
                    <div id="no-employees-message" class="empty-message" style="display: none;">
                        Aucun employé trouvé. Cliquez sur "Ajouter un Employé" pour commencer.
                    </div>
                </div>
            `;
        },


        /**
         * Charge les employés dans le tableau
         */
        loadEmployees: async function(filterQuery = '', positionFilter = '') { // Added async
            const employeesList = document.getElementById('employees-list');
            const noEmployeesMessage = document.getElementById('no-employees-message');

            if (!employeesList || !noEmployeesMessage) return;

            employeesList.innerHTML = '<tr><td colspan="7"><div class="loading-spinner-inline"></div> Chargement...</td></tr>'; // Show loading state
            noEmployeesMessage.style.display = 'none';

            try {
                // Récupération des employés (using await)
                let employees = await DB.employees.getAll();

                // ----> ADDED CHECK <----
                if (!Array.isArray(employees)) {
                    console.error("Failed to load employees or data is not an array:", employees);
                    throw new Error("Les données des employés n'ont pas pu être chargées."); // Throw error to be caught below
                }
                // ----> END CHECK <----

                // Appliquer le filtre de recherche (client-side for now)
                if (filterQuery) {
                    const lowerQuery = filterQuery.toLowerCase();
                    employees = employees.filter(employee => {
                        const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
                        const position = (employee.position || '').toLowerCase();
                        const email = (employee.email || '').toLowerCase();
                        const phone = employee.phone || '';
                        return fullName.includes(lowerQuery) || position.includes(lowerQuery) || email.includes(lowerQuery) || phone.includes(lowerQuery);
                    });
                }

                // Appliquer le filtre de poste
                if (positionFilter) {
                    employees = employees.filter(employee => employee.position === positionFilter);
                }

                // Appliquer le tri
                const sortSelect = document.getElementById('sort-employees');
                if (sortSelect && employees.length > 0) {
                    const sortBy = sortSelect.value;
                    employees.sort((a, b) => {
                        switch (sortBy) {
                            case 'name':
                                return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
                            case 'position':
                                return (a.position || '').localeCompare(b.position || '');
                            case 'salary':
                                return (a.baseSalary || 0) - (b.baseSalary || 0);
                            case 'date':
                                // Handle potential null/invalid dates
                                const dateA = a.hireDate ? new Date(a.hireDate) : 0;
                                const dateB = b.hireDate ? new Date(b.hireDate) : 0;
                                if (!dateA && !dateB) return 0;
                                if (!dateA) return 1; // Put employees without hire date last
                                if (!dateB) return -1; // Put employees without hire date last
                                return dateA - dateB;
                            default:
                                return 0;
                        }
                    });
                }

                // Afficher le message si aucun employé après filtrage
                if (employees.length === 0) {
                    employeesList.innerHTML = '';
                    noEmployeesMessage.textContent = 'Aucun employé correspondant aux filtres actuels.';
                    noEmployeesMessage.style.display = 'block';
                    return; // Exit after displaying message
                }

                // Formatage des données pour l'affichage (get settings async)
                const settings = await DB.settings.get(); // Added await
                const currencySymbol = settings?.currency || 'FCFA'; // Use default if settings fail

                // Construction du tableau
                employeesList.innerHTML = employees.map(employee => {
                    const hireDateStr = employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('fr-FR') : '-'; // Use locale from settings?
                    const baseSalaryStr = employee.baseSalary ? `${employee.baseSalary.toLocaleString('fr-FR')} ${currencySymbol}` : '-';

                    return `
                        <tr data-id="${employee.id}">
                            <td>
                                <div class="employee-name">
                                    <div class="avatar">
                                        <span>${employee.firstName?.charAt(0) || ''}${employee.lastName?.charAt(0) || ''}</span>
                                    </div>
                                    <div>
                                        <div class="employee-fullname">${employee.firstName || ''} ${employee.lastName || ''}</div>
                                        <div class="employee-id">${employee.employeeId || ''}</div> {/* Use camelCase */}
                                    </div>
                                </div>
                            </td>
                            <td>${employee.position || '-'}</td>
                            <td>${employee.email || '-'}</td>
                            <td>${employee.phone || '-'}</td>
                            <td>${baseSalaryStr}</td>
                            <td>${hireDateStr}</td>
                            <td>
                                <div class="table-actions">
                                    <button class="action-btn view-employee" title="Voir les détails" data-id="${employee.id}"><i class="fas fa-eye"></i></button>
                                    <button class="action-btn edit-employee" title="Modifier" data-id="${employee.id}"><i class="fas fa-edit"></i></button>
                                    <button class="action-btn delete-employee" title="Supprimer" data-id="${employee.id}"><i class="fas fa-trash"></i></button>
                                </div>
                            </td>
                        </tr>
                    `}).join('');

            } catch (error) {
                console.error("Error loading employees list:", error);
                employeesList.innerHTML = ''; // Clear loading state
                noEmployeesMessage.textContent = `Erreur: ${error.message}`;
                noEmployeesMessage.style.display = 'block';
            }
        },

        /**
         * Charge les options de filtre par poste
         */
        loadPositionFilters: async function() { // Added async
            const positionFilter = document.getElementById('position-filter');
            if (!positionFilter) return;

            try {
                const employees = await DB.employees.getAll(); // Added await

                 if (!Array.isArray(employees)) {
                    console.error("Failed to load employees for position filters.");
                    return; // Don't populate if fetch failed
                 }

                // Extract unique, non-empty positions
                const positions = [...new Set(employees.map(employee => employee.position).filter(Boolean))];
                positions.sort((a, b) => a.localeCompare(b)); // Sort alphabetically

                 // Clear existing options except the first one ("Tous les postes")
                 positionFilter.innerHTML = '<option value="">Tous les postes</option>';

                // Add new options
                positions.forEach(position => {
                    const option = document.createElement('option');
                    option.value = position;
                    option.textContent = position;
                    positionFilter.appendChild(option);
                });
            } catch (error) {
                console.error("Error loading position filters:", error);
                // Optionally disable the filter or show an error
            }
        },

        /**
         * Affiche le modal d'ajout/modification d'un employé
         */
        showEmployeeModal: async function(employeeId = null) { // Added async
            const modalContainer = document.getElementById('modal-container');
            if (!modalContainer) return;

            window.showLoader("Chargement du formulaire...");
            try {
                let employee = { firstName: '', lastName: '', position: '', email: '', phone: '', baseSalary: '', hireDate: null, address: '', notes: '', employeeId: '' };
                let modalTitle = 'Ajouter un Employé';

                // Si un ID est fourni, fetch data for modification
                if (employeeId) {
                    const existingEmployee = await DB.employees.getById(employeeId); // Added await
                    if (existingEmployee) {
                        employee = existingEmployee; // Use fetched data (already camelCase)
                        modalTitle = 'Modifier l\'Employé';
                    } else {
                        alert("Employé non trouvé.");
                        window.hideLoader();
                        return;
                    }
                }

                // Format hireDate for input type="date" (YYYY-MM-DD)
                const hireDateValue = employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '';

                // Construction du modal
                modalContainer.innerHTML = `
                    <div class="modal">
                        <div class="modal-header"><h3>${modalTitle}</h3><button class="modal-close"><i class="fas fa-times"></i></button></div>
                        <div class="modal-body">
                            <form id="employee-form">
                                <input type="hidden" id="employee-modal-id" value="${employee.id || ''}"> {/* Changed id */}
                                <div class="form-grid">
                                    <div class="form-group"><label for="employee-firstname">Prénom *</label><input type="text" id="employee-firstname" class="form-control" value="${employee.firstName || ''}" required></div>
                                    <div class="form-group"><label for="employee-lastname">Nom *</label><input type="text" id="employee-lastname" class="form-control" value="${employee.lastName || ''}" required></div>
                                </div>
                                <div class="form-grid">
                                    <div class="form-group"><label for="employee-id-number">Numéro d'Employé</label><input type="text" id="employee-id-number" class="form-control" value="${employee.employeeId || ''}"></div> {/* Use camelCase */}
                                    <div class="form-group"><label for="employee-position">Poste</label><input type="text" id="employee-position" class="form-control" value="${employee.position || ''}"></div>
                                </div>
                                <div class="form-grid">
                                    <div class="form-group"><label for="employee-email">Email</label><input type="email" id="employee-email" class="form-control" value="${employee.email || ''}"></div>
                                    <div class="form-group"><label for="employee-phone">Téléphone</label><input type="tel" id="employee-phone" class="form-control" value="${employee.phone || ''}"></div>
                                </div>
                                <div class="form-grid">
                                    <div class="form-group"><label for="employee-base-salary">Salaire de Base (FCFA) *</label><input type="number" id="employee-base-salary" class="form-control" value="${employee.baseSalary || ''}" required min="0" step="any"></div>
                                    <div class="form-group"><label for="employee-hire-date">Date d'Embauche</label><input type="date" id="employee-hire-date" class="form-control" value="${hireDateValue}"></div>
                                </div>
                                <div class="form-group"><label for="employee-address">Adresse</label><textarea id="employee-address" class="form-control" rows="2">${employee.address || ''}</textarea></div>
                                <div class="form-group"><label for="employee-notes">Notes</label><textarea id="employee-notes" class="form-control" rows="3">${employee.notes || ''}</textarea></div>
                            </form>
                        </div>
                        <div class="modal-footer"><button class="btn btn-outline modal-cancel">Annuler</button><button class="btn btn-primary" id="save-employee">Enregistrer</button></div>
                    </div>
                `;

                modalContainer.classList.add('active');

                // Bind events AFTER modal content is set
                this.bindModalEvents();

            } catch (error) {
                console.error("Error showing employee modal:", error);
                alert("Erreur lors de l'ouverture du formulaire employé.");
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
            const saveBtn = modalContainer.querySelector('#save-employee'); // Use specific ID if needed
            const form = modalContainer.querySelector('#employee-form'); // Use specific ID

            if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
            if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());

            if (saveBtn && form) {
                saveBtn.addEventListener('click', async () => { // Added async
                    if (form.checkValidity()) {
                        await this.saveEmployee(); // Added await
                    } else {
                        form.reportValidity(); // Show browser validation errors
                    }
                });
            }

             // Bind events for details modal if present
             const confirmDeleteBtn = modalContainer.querySelector('#confirm-delete');
             if (confirmDeleteBtn) {
                 const employeeId = confirmDeleteBtn.dataset.id; // Get ID from button
                 confirmDeleteBtn.addEventListener('click', async () => { // Added async
                     if (employeeId) {
                         await this.deleteEmployee(employeeId); // Added await
                     }
                     this.closeModal();
                 });
             }

             // Bind events for tabs in details modal
             const tabItems = modalContainer.querySelectorAll('.tab-item');
             if(tabItems.length > 0) {
                tabItems.forEach(tab => {
                    tab.addEventListener('click', () => {
                        // Deactivate all tabs and content
                        modalContainer.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
                        modalContainer.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                        // Activate clicked tab and corresponding content
                        tab.classList.add('active');
                        const contentId = `${tab.dataset.tab}-tab`;
                        const contentElement = modalContainer.querySelector(`#${contentId}`);
                        if(contentElement) contentElement.classList.add('active');
                    });
                });
             }

             // Bind events for action buttons inside the details modal tabs (delegation)
             const modalBody = modalContainer.querySelector('.modal-body');
             if (modalBody) {
                 modalBody.addEventListener('click', async (event) => { // Added async
                     const employeeIdForAction = modalContainer.querySelector('.employee-profile')?.dataset.employeeId; // Get employee ID if needed

                     // Add Advance Button
                     const addAdvanceBtn = event.target.closest('.add-advance');
                     if (addAdvanceBtn && window.AdvancesManager) {
                         this.closeModal(); // Close current modal first
                         await window.AdvancesManager.showAdvanceModal(null, addAdvanceBtn.dataset.employeeId || employeeIdForAction);
                         return;
                     }
                     // Edit Advance Button
                     const editAdvanceBtn = event.target.closest('.edit-advance');
                      if (editAdvanceBtn && window.AdvancesManager) {
                         this.closeModal();
                         await window.AdvancesManager.showAdvanceModal(editAdvanceBtn.dataset.id);
                         return;
                     }
                     // Delete Advance Button
                     const deleteAdvanceBtn = event.target.closest('.delete-advance');
                      if (deleteAdvanceBtn && window.AdvancesManager) {
                         // Keep details modal open? Or close and show confirmation? Let's close.
                         this.closeModal();
                         await window.AdvancesManager.showDeleteConfirmation(deleteAdvanceBtn.dataset.id);
                         return;
                     }

                     // Add Sanction Button
                     const addSanctionBtn = event.target.closest('.add-sanction');
                     if (addSanctionBtn && window.SanctionsManager) {
                         this.closeModal();
                         await window.SanctionsManager.showSanctionModal(null, addSanctionBtn.dataset.employeeId || employeeIdForAction);
                         return;
                     }
                     // Edit/Delete Sanction buttons... (similar pattern)
                      const editSanctionBtn = event.target.closest('.edit-sanction');
                      if (editSanctionBtn && window.SanctionsManager) {
                         this.closeModal();
                         await window.SanctionsManager.showSanctionModal(editSanctionBtn.dataset.id);
                         return;
                     }
                     const deleteSanctionBtn = event.target.closest('.delete-sanction');
                      if (deleteSanctionBtn && window.SanctionsManager) {
                         this.closeModal();
                         await window.SanctionsManager.showDeleteConfirmation(deleteSanctionBtn.dataset.id);
                         return;
                     }


                     // Add Debt Button
                     const addDebtBtn = event.target.closest('.add-debt');
                     if (addDebtBtn && window.DebtsManager) {
                         this.closeModal();
                         await window.DebtsManager.showDebtModal(null, addDebtBtn.dataset.employeeId || employeeIdForAction);
                         return;
                     }
                      // Edit/Delete Debt buttons... (similar pattern)
                      const editDebtBtn = event.target.closest('.edit-debt');
                      if (editDebtBtn && window.DebtsManager) {
                         this.closeModal();
                         await window.DebtsManager.showDebtModal(editDebtBtn.dataset.id);
                         return;
                     }
                     const deleteDebtBtn = event.target.closest('.delete-debt');
                      if (deleteDebtBtn && window.DebtsManager) {
                         this.closeModal();
                         await window.DebtsManager.showDeleteConfirmation(deleteDebtBtn.dataset.id);
                         return;
                     }

                 });
             }

             // Bind event for the main "Modifier l'Employé" button in details modal footer
             const editEmployeeDetailsBtn = modalContainer.querySelector('.modal-footer .edit-employee');
             if (editEmployeeDetailsBtn) {
                 editEmployeeDetailsBtn.addEventListener('click', async () => { // Added async
                     const employeeId = editEmployeeDetailsBtn.dataset.id;
                     this.closeModal();
                     await this.showEmployeeModal(employeeId); // Added await
                 });
             }

        },

        /**
         * Ferme le modal actif
         */
        closeModal: function() {
            const modalContainer = document.getElementById('modal-container');
            if (modalContainer) {
                modalContainer.classList.remove('active');
                modalContainer.innerHTML = ''; // Clear content
            }
        },

        /**
         * Enregistre les données d'un employé
         */
        saveEmployee: async function() { // Added async
            const id = document.getElementById('employee-modal-id').value; // Use updated ID
            const firstName = document.getElementById('employee-firstname').value.trim();
            const lastName = document.getElementById('employee-lastname').value.trim();
            const employeeIdNum = document.getElementById('employee-id-number').value.trim(); // Renamed variable
            const position = document.getElementById('employee-position').value.trim();
            const email = document.getElementById('employee-email').value.trim();
            const phone = document.getElementById('employee-phone').value.trim();
            const baseSalaryStr = document.getElementById('employee-base-salary').value;
            const hireDate = document.getElementById('employee-hire-date').value;
            const address = document.getElementById('employee-address').value.trim();
            const notes = document.getElementById('employee-notes').value.trim();

            // Validation
            if (!firstName || !lastName || !baseSalaryStr) {
                alert('Veuillez remplir les champs obligatoires (Prénom, Nom, Salaire de Base).');
                return;
            }
            const baseSalary = parseFloat(baseSalaryStr);
            if (isNaN(baseSalary) || baseSalary < 0) {
                 alert('Veuillez entrer un salaire de base valide (nombre positif).');
                 return;
            }

            // Création de l'objet employé (using camelCase for DB function)
            const employeeData = {
                id: id || undefined, // Let DB handle ID generation if undefined
                firstName,
                lastName,
                employeeId: employeeIdNum || null, // Use null if empty
                position: position || null,
                email: email || null,
                phone: phone || null,
                baseSalary,
                hireDate: hireDate || null, // Use null if empty
                address: address || null,
                notes: notes || null
            };

            window.showLoader("Enregistrement de l'employé...");
            try {
                const savedEmployee = await DB.employees.save(employeeData); // Added await

                if (savedEmployee) {
                    this.closeModal();
                    await this.loadEmployees(); // Reload list (await)
                    await this.loadPositionFilters(); // Reload filters (await)
                    alert(`Employé ${id ? 'modifié' : 'ajouté'} avec succès.`);
                } else {
                    alert("Erreur lors de l'enregistrement de l'employé.");
                }
            } catch (error) {
                console.error("Error saving employee:", error);
                alert(`Erreur lors de l'enregistrement: ${error.message}`);
            } finally {
                window.hideLoader();
            }
        },

        /**
         * Affiche le modal de confirmation de suppression
         */
        showDeleteConfirmation: async function(employeeId) { // Added async
            const modalContainer = document.getElementById('modal-container');
            if (!modalContainer) return;

            window.showLoader("Chargement...");
            try {
                const employee = await DB.employees.getById(employeeId); // Added await
                if (!employee) {
                    alert("Employé non trouvé.");
                     window.hideLoader();
                    return;
                }

                // Construction du modal
                modalContainer.innerHTML = `
                    <div class="modal">
                        <div class="modal-header"><h3>Confirmation de Suppression</h3><button class="modal-close"><i class="fas fa-times"></i></button></div>
                        <div class="modal-body">
                            <p>Êtes-vous sûr de vouloir supprimer l'employé <strong>${employee.firstName} ${employee.lastName}</strong> ?</p>
                            <p class="text-danger">Cette action est irréversible et supprimera également toutes les données associées (salaires, avances, etc.) via CASCADE.</p>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-outline modal-cancel">Annuler</button>
                            {/* Add data-id to the confirm button */}
                            <button class="btn btn-danger" id="confirm-delete" data-id="${employeeId}">Supprimer</button>
                        </div>
                    </div>
                `;

                modalContainer.classList.add('active');
                this.bindModalEvents(); // Re-bind events for the new modal content

            } catch (error) {
                 console.error("Error showing delete confirmation:", error);
                 alert("Erreur lors de l'affichage de la confirmation.");
            } finally {
                 window.hideLoader();
            }
        },

        /**
         * Supprime un employé
         */
        deleteEmployee: async function(employeeId) { // Added async
            if (!employeeId) return;

            window.showLoader("Suppression de l'employé...");
            try {
                const success = await DB.employees.delete(employeeId); // Added await

                if (success) {
                    await this.loadEmployees(); // Reload list (await)
                    await this.loadPositionFilters(); // Reload filters (await)
                    alert('Employé supprimé avec succès.');
                } else {
                    alert("Erreur lors de la suppression de l'employé.");
                }
            } catch (error) {
                console.error("Error deleting employee:", error);
                alert(`Erreur lors de la suppression: ${error.message}`);
            } finally {
                window.hideLoader();
            }
        },

        /**
         * Affiche les détails d'un employé
         */
        showEmployeeDetails: async function(employeeId) { // Added async
            const modalContainer = document.getElementById('modal-container');
            if (!modalContainer) return;

            window.showLoader("Chargement des détails...");
            try {
                // Fetch employee and related data concurrently
                const [employee, advances, sanctions, debts, settings] = await Promise.all([
                    DB.employees.getById(employeeId),
                    DB.advances.getByEmployeeId(employeeId),
                    DB.sanctions.getByEmployeeId(employeeId),
                    DB.debts.getByEmployeeId(employeeId),
                    DB.settings.get()
                ]);

                // Validate fetched data
                if (!employee) { throw new Error("Employé non trouvé."); }
                if (!Array.isArray(advances)) { console.warn("Failed to load advances for details"); advances = []; }
                if (!Array.isArray(sanctions)) { console.warn("Failed to load sanctions for details"); sanctions = []; }
                if (!Array.isArray(debts)) { console.warn("Failed to load debts for details"); debts = []; }

                const currencySymbol = settings?.currency || 'FCFA';

                // Calculate summary stats
                const unpaidAdvances = advances.filter(a => !a.isPaid);
                const totalUnpaidAdvances = unpaidAdvances.reduce((sum, a) => sum + a.amount, 0);

                const currentDate = new Date();
                const currentMonthSanctions = sanctions.filter(s => {
                    const sanctionDate = new Date(s.date);
                    return sanctionDate.getMonth() === currentDate.getMonth() && sanctionDate.getFullYear() === currentDate.getFullYear();
                });
                const totalCurrentMonthSanctions = currentMonthSanctions.reduce((sum, s) => sum + s.amount, 0);

                const unpaidDebts = debts.filter(d => !d.isPaid);
                const totalUnpaidDebts = unpaidDebts.reduce((sum, d) => sum + d.amount, 0);

                // --- Render Tab Content ---
                 const renderAdvancesTab = () => {
                    if (advances.length === 0) return '<div class="empty-message">Aucune avance trouvée.</div>';
                    return `
                        <div class="table-responsive">
                            <table class="table">
                                <thead><tr><th>Date</th><th>Montant</th><th>Raison</th><th>Statut</th><th>Actions</th></tr></thead>
                                <tbody>
                                    ${advances.map(a => `
                                        <tr>
                                            <td>${new Date(a.date).toLocaleDateString()}</td>
                                            <td>${a.amount.toLocaleString()} ${currencySymbol}</td>
                                            <td>${a.reason || '-'}</td>
                                            <td><span class="badge ${a.isPaid ? 'badge-success' : 'badge-warning'}">${a.isPaid ? 'Remboursé' : 'En attente'}</span></td>
                                            <td><div class="table-actions">
                                                <button class="action-btn edit-advance" title="Modifier" data-id="${a.id}"><i class="fas fa-edit"></i></button>
                                                <button class="action-btn delete-advance" title="Supprimer" data-id="${a.id}"><i class="fas fa-trash"></i></button>
                                            </div></td>
                                        </tr>`).join('')}
                                </tbody>
                            </table>
                        </div>`;
                 };

                 const renderSanctionsTab = () => {
                     if (sanctions.length === 0) return '<div class="empty-message">Aucune sanction trouvée.</div>';
                     return `
                         <div class="table-responsive">
                             <table class="table">
                                 <thead><tr><th>Date</th><th>Type</th><th>Montant</th><th>Raison</th><th>Actions</th></tr></thead>
                                 <tbody>
                                     ${sanctions.map(s => {
                                         let typeName = ''; /* ... get type name ... */
                                         switch (s.type) { case 'late': typeName='Retard'; break; case 'absence': typeName='Absence'; break; case 'misconduct': typeName='Faute'; break; default: typeName=s.type||'Autre'; }
                                         return `
                                             <tr>
                                                 <td>${new Date(s.date).toLocaleDateString()}</td>
                                                 <td>${typeName}</td>
                                                 <td>${s.amount.toLocaleString()} ${currencySymbol}</td>
                                                 <td>${s.reason || '-'}</td>
                                                 <td><div class="table-actions">
                                                     <button class="action-btn edit-sanction" title="Modifier" data-id="${s.id}"><i class="fas fa-edit"></i></button>
                                                     <button class="action-btn delete-sanction" title="Supprimer" data-id="${s.id}"><i class="fas fa-trash"></i></button>
                                                 </div></td>
                                             </tr>`}).join('')}
                                 </tbody>
                             </table>
                         </div>`;
                 };

                  const renderDebtsTab = () => {
                     if (debts.length === 0) return '<div class="empty-message">Aucune dette client trouvée.</div>';
                     return `
                         <div class="table-responsive">
                             <table class="table">
                                 <thead><tr><th>Date</th><th>Client</th><th>Montant</th><th>Description</th><th>Statut</th><th>Actions</th></tr></thead>
                                 <tbody>
                                     ${debts.map(d => `
                                         <tr>
                                             <td>${new Date(d.date).toLocaleDateString()}</td>
                                             <td>${d.clientName || '-'}</td>
                                             <td>${d.amount.toLocaleString()} ${currencySymbol}</td>
                                             <td>${d.description || '-'}</td>
                                             <td><span class="badge ${d.isPaid ? 'badge-success' : 'badge-warning'}">${d.isPaid ? 'Payé' : 'Non payé'}</span></td>
                                             <td><div class="table-actions">
                                                 <button class="action-btn edit-debt" title="Modifier" data-id="${d.id}"><i class="fas fa-edit"></i></button>
                                                 <button class="action-btn delete-debt" title="Supprimer" data-id="${d.id}"><i class="fas fa-trash"></i></button>
                                             </div></td>
                                         </tr>`).join('')}
                                 </tbody>
                             </table>
                         </div>`;
                 };


                // Construction du modal
                modalContainer.innerHTML = `
                    <div class="modal modal-large">
                        <div class="modal-header"><h3>Détails de l'Employé</h3><button class="modal-close"><i class="fas fa-times"></i></button></div>
                        <div class="modal-body">
                            {/* Added data-employee-id to easily retrieve it later */}
                            <div class="employee-profile" data-employee-id="${employee.id}">
                                <div class="employee-profile-header">
                                    <div class="employee-avatar"><span>${employee.firstName?.charAt(0) || ''}${employee.lastName?.charAt(0) || ''}</span></div>
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
                                    <div class="detail-row"><div class="detail-label">ID Employé:</div><div class="detail-value">${employee.employeeId || '-'}</div></div>
                                    <div class="detail-row"><div class="detail-label">Salaire de Base:</div><div class="detail-value">${employee.baseSalary ? `${employee.baseSalary.toLocaleString()} ${currencySymbol}` : '-'}</div></div>
                                    <div class="detail-row"><div class="detail-label">Date d'Embauche:</div><div class="detail-value">${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : '-'}</div></div>
                                    <div class="detail-row"><div class="detail-label">Adresse:</div><div class="detail-value">${employee.address || '-'}</div></div>
                                    <div class="detail-row"><div class="detail-label">Notes:</div><div class="detail-value">${employee.notes || '-'}</div></div>
                                </div>
                                <div class="employee-financial-summary">
                                    <h3>Résumé Financier Actuel</h3>
                                    <div class="financial-stats">
                                        <div class="stat-card"><div class="stat-icon"><i class="fas fa-hand-holding-usd"></i></div><div class="stat-info"><h4>Avances Non Remb.</h4><h2>${totalUnpaidAdvances.toLocaleString()} ${currencySymbol}</h2></div></div>
                                        <div class="stat-card"><div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div><div class="stat-info"><h4>Sanctions (Mois)</h4><h2>${totalCurrentMonthSanctions.toLocaleString()} ${currencySymbol}</h2></div></div>
                                        <div class="stat-card"><div class="stat-icon"><i class="fas fa-file-invoice-dollar"></i></div><div class="stat-info"><h4>Dettes Clients Non Payées</h4><h2>${totalUnpaidDebts.toLocaleString()} ${currencySymbol}</h2></div></div>
                                    </div>
                                </div>
                                <div class="employee-tabs">
                                    <div class="tabs-header">
                                        <div class="tab-item active" data-tab="advances">Avances (${advances.length})</div>
                                        <div class="tab-item" data-tab="sanctions">Sanctions (${sanctions.length})</div>
                                        <div class="tab-item" data-tab="debts">Dettes Clients (${debts.length})</div>
                                    </div>
                                    <div class="tabs-content">
                                        <div class="tab-content active" id="advances-tab">
                                            <div class="tab-content-header"><h4>Avances sur Salaire</h4><button class="btn btn-outline btn-sm add-advance" data-employee-id="${employee.id}"><i class="fas fa-plus"></i> Nouvelle Avance</button></div>
                                            ${renderAdvancesTab()}
                                        </div>
                                        <div class="tab-content" id="sanctions-tab">
                                             <div class="tab-content-header"><h4>Sanctions et Pénalités</h4><button class="btn btn-outline btn-sm add-sanction" data-employee-id="${employee.id}"><i class="fas fa-plus"></i> Nouvelle Sanction</button></div>
                                             ${renderSanctionsTab()}
                                        </div>
                                        <div class="tab-content" id="debts-tab">
                                             <div class="tab-content-header"><h4>Dettes Clients</h4><button class="btn btn-outline btn-sm add-debt" data-employee-id="${employee.id}"><i class="fas fa-plus"></i> Nouvelle Dette</button></div>
                                             ${renderDebtsTab()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-outline modal-cancel">Fermer</button>
                            {/* Pass employee id to the edit button */}
                            <button class="btn btn-primary edit-employee" data-id="${employee.id}">Modifier l'Employé</button>
                        </div>
                    </div>
                `;

                modalContainer.classList.add('active');
                this.bindModalEvents(); // Re-bind events for the new modal content

            } catch (error) {
                console.error("Error showing employee details:", error);
                alert(`Erreur lors du chargement des détails: ${error.message}`);
            } finally {
                window.hideLoader();
            }
        },

        /**
         * Attache les événements aux éléments de la page (using delegation)
         */
        bindEvents: function() {
            const pageContainer = document.getElementById('employees-page'); // More specific container
            const modalContainer = document.getElementById('modal-container');

            // Listener for page-level actions
            if (pageContainer) {
                 pageContainer.addEventListener('click', async (event) => { // Added async
                    if (event.target.id === 'add-employee-btn' || event.target.closest('#add-employee-btn')) {
                        await this.showEmployeeModal(); // Added await
                    }
                 });

                 pageContainer.addEventListener('input', async (event) => { // Added async
                    if (event.target.id === 'employee-search') {
                        const positionFilter = pageContainer.querySelector('#position-filter');
                        await this.loadEmployees(event.target.value, positionFilter?.value || ''); // Added await
                    }
                 });

                 pageContainer.addEventListener('change', async (event) => { // Added async
                    if (event.target.id === 'position-filter' || event.target.id === 'sort-employees') {
                         const searchInput = pageContainer.querySelector('#employee-search');
                         const positionFilter = pageContainer.querySelector('#position-filter');
                         await this.loadEmployees(searchInput?.value || '', positionFilter?.value || ''); // Added await
                    }
                 });

                 // Listener for table actions (delegated to tbody)
                 const tableBody = pageContainer.querySelector('#employees-list');
                 if (tableBody) {
                     tableBody.addEventListener('click', async (event) => { // Added async
                         const viewBtn = event.target.closest('.view-employee');
                         if (viewBtn) {
                             await this.showEmployeeDetails(viewBtn.dataset.id); // Added await
                             return;
                         }
                         const editBtn = event.target.closest('.edit-employee');
                         if (editBtn) {
                             await this.showEmployeeModal(editBtn.dataset.id); // Added await
                             return;
                         }
                         const deleteBtn = event.target.closest('.delete-employee');
                         if (deleteBtn) {
                             await this.showDeleteConfirmation(deleteBtn.dataset.id); // Added await
                             return;
                         }
                     });
                 }
            }

            // Modal events are bound dynamically within showEmployeeModal/showDeleteConfirmation/showEmployeeDetails
            // using bindModalEvents after content is set.
        }

    };

    // ****** ADD THIS LINE AT THE VERY END ******
    window.EmployeesManager = EmployeesManager;
    // ****** END ADDED LINE ******

    // REMOVED the old DOMContentLoaded listener for this file
    