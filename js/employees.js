/**
 * employees.js
 * Gestion des employés
 * Application de Gestion des Salaires Le Sims
 * (Updated for DataManager Integration)
 */

const EmployeesManager = {
    /**
     * Initialisation du module de gestion des employés
     */
    init: async function() {
        // Load page structure first (synchronous HTML injection)
        this.renderEmployeesPageStructure();
        // Then load data and filters asynchronously
        try {
            await this.loadEmployees(); // Uses DataManager now
            await this.loadPositionFilters(); // Uses DataManager now
        } catch (error) {
            console.error("Error during EmployeesManager initialization:", error);
            // Display error message on the page if needed
            const employeesPage = document.getElementById('employees-page');
             if(employeesPage) {
                const listContainer = employeesPage.querySelector('#employees-list');
                const noDataMessage = employeesPage.querySelector('#no-employees-message');
                if(listContainer) listContainer.innerHTML = '<tr><td colspan="7"><p class="error-message">Erreur chargement employés.</p></td></tr>'; // Show error in table
                if(noDataMessage) {
                    noDataMessage.textContent = "Erreur lors du chargement initial des employés.";
                    noDataMessage.style.display = 'block';
                }
             }
        }
        this.bindEvents(); // Setup event listeners
        console.log("EmployeesManager initialized.");
    },

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
                <div class="page-actions"> 
                    <button id="add-employee-btn" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Ajouter un Employé
                    </button>
                 </div>
            </div>

            <div class="card mb-4">
                <div class="card-body">
                    <div class="filters">
                        <div class="search-box">
                            <input type="text" id="employee-search" placeholder="Rechercher un employé..." aria-label="Rechercher un employé">
                            <i class="fas fa-search"></i>
                        </div>
                        <div class="filter-actions">
                            <select id="position-filter" class="form-control" aria-label="Filtrer par poste">
                                <option value="">Tous les postes</option>
                                </select>
                            <select id="sort-employees" class="form-control" aria-label="Trier les employés">
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
                    <tbody id="employees-list" aria-live="polite"> 
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
     * Charge les employés dans le tableau (Using DataManager)
     */
    loadEmployees: async function(filterQuery = '', positionFilter = '') {
        const employeesList = document.getElementById('employees-list');
        const noEmployeesMessage = document.getElementById('no-employees-message');

        if (!employeesList || !noEmployeesMessage) return;

        employeesList.innerHTML = '<tr><td colspan="7"><div class="loading-spinner-inline"></div> Chargement...</td></tr>'; // Show loading state
        noEmployeesMessage.style.display = 'none';

        try {
            // Récupération des employés using DataManager
            let employees = await DataManager.employees.getAll(); // <--- Use DataManager

            if (!Array.isArray(employees)) {
                console.error("Failed to load employees or data is not an array:", employees);
                throw new Error("Les données des employés n'ont pas pu être chargées.");
            }

            // Appliquer le filtre de recherche (client-side)
            if (filterQuery) {
                const lowerQuery = filterQuery.toLowerCase();
                employees = employees.filter(employee => {
                    const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.toLowerCase(); // Handle potential nulls
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
                            // Handle potential nulls for names
                            const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim();
                            const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim();
                            return nameA.localeCompare(nameB);
                        case 'position':
                            return (a.position || '').localeCompare(b.position || '');
                        case 'salary':
                            return (a.baseSalary || 0) - (b.baseSalary || 0);
                        case 'date':
                            const dateA = a.hireDate ? new Date(a.hireDate) : 0;
                            const dateB = b.hireDate ? new Date(b.hireDate) : 0;
                            if (isNaN(dateA) && isNaN(dateB)) return 0;
                            if (isNaN(dateA)) return 1; // Put employees without valid hire date last
                            if (isNaN(dateB)) return -1;
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
                return;
            }

            // Formatage des données pour l'affichage (get settings async using DataManager)
            const settings = await DataManager.settings.get(); // <--- Use DataManager
            const currencySymbol = settings?.currency || 'FCFA';

            // Construction du tableau
            employeesList.innerHTML = employees.map(employee => {
                 // Check for valid hire date before formatting
                 const hireDateStr = employee.hireDate && !isNaN(new Date(employee.hireDate))
                    ? new Date(employee.hireDate).toLocaleDateString('fr-FR') // Use locale from settings?
                    : '-';
                 const baseSalaryStr = employee.baseSalary ? `${employee.baseSalary.toLocaleString('fr-FR')} ${currencySymbol}` : '-';
                 const firstNameInitial = employee.firstName?.charAt(0) || '';
                 const lastNameInitial = employee.lastName?.charAt(0) || '';

                return `
                    <tr data-id="${employee.id}">
                        <td>
                            <div class="employee-name">
                                <div class="avatar">
                                    <span>${firstNameInitial}${lastNameInitial}</span>
                                </div>
                                <div>
                                    <div class="employee-fullname">${employee.firstName || ''} ${employee.lastName || ''}</div>
                                    <div class="employee-id">${employee.employeeId || ''}</div>
                                </div>
                            </div>
                        </td>
                        <td>${employee.position || '-'}</td>
                        <td>${employee.email ? `<a href="mailto:${employee.email}">${employee.email}</a>` : '-'}</td> 
                        <td>${employee.phone ? `<a href="tel:${employee.phone}">${employee.phone}</a>` : '-'}</td> 
                        <td>${baseSalaryStr}</td>
                        <td>${hireDateStr}</td>
                        <td>
                            <div class="table-actions">
                                <button class="action-btn view-employee" title="Voir les détails" data-id="${employee.id}" aria-label="Voir détails ${employee.firstName} ${employee.lastName}"><i class="fas fa-eye"></i></button>
                                <button class="action-btn edit-employee" title="Modifier" data-id="${employee.id}" aria-label="Modifier ${employee.firstName} ${employee.lastName}"><i class="fas fa-edit"></i></button>
                                <button class="action-btn delete-employee" title="Supprimer" data-id="${employee.id}" aria-label="Supprimer ${employee.firstName} ${employee.lastName}"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `}).join('');

        } catch (error) {
            console.error("Error loading employees list:", error);
            employeesList.innerHTML = '';
            noEmployeesMessage.textContent = `Erreur: ${error.message}`;
            noEmployeesMessage.style.display = 'block';
        }
    },

    /**
     * Charge les options de filtre par poste (Using DataManager)
     */
    loadPositionFilters: async function() {
        const positionFilter = document.getElementById('position-filter');
        if (!positionFilter) return;

        try {
            const employees = await DataManager.employees.getAll(); // <--- Use DataManager

             if (!Array.isArray(employees)) {
                console.error("Failed to load employees for position filters.");
                return; // Don't populate if fetch failed
             }

            // Extract unique, non-empty positions
            const positions = [...new Set(employees.map(employee => employee.position).filter(Boolean))];
            positions.sort((a, b) => a.localeCompare(b));

             // Clear existing options except the first one
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
        }
    },

    /**
     * Affiche le modal d'ajout/modification d'un employé (Using DataManager)
     */
    showEmployeeModal: async function(employeeId = null) {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;

        window.showLoader("Chargement du formulaire...");
        try {
            let employee = { firstName: '', lastName: '', position: '', email: '', phone: '', baseSalary: '', hireDate: null, address: '', notes: '', employeeId: '' };
            let modalTitle = 'Ajouter un Employé';

            // Si un ID est fourni, fetch data for modification using DataManager
            if (employeeId) {
                const existingEmployee = await DataManager.employees.getById(employeeId); // <--- Use DataManager
                if (existingEmployee) {
                    employee = existingEmployee;
                    modalTitle = 'Modifier l\'Employé';
                } else {
                    alert("Employé non trouvé.");
                    window.hideLoader();
                    return;
                }
            }

            // Format hireDate for input type="date"
            const hireDateValue = employee.hireDate && !isNaN(new Date(employee.hireDate))
                ? new Date(employee.hireDate).toISOString().split('T')[0]
                : '';

            // Construction du modal
            modalContainer.innerHTML = `
                <div class="modal">
                    <div class="modal-header"><h3>${modalTitle}</h3><button class="modal-close" aria-label="Fermer"><i class="fas fa-times"></i></button></div>
                    <div class="modal-body">
                        <form id="employee-form" novalidate>
                            <input type="hidden" id="employee-modal-id" value="${employee.id || ''}">
                            <div class="form-grid">
                                <div class="form-group"><label for="employee-firstname">Prénom *</label><input type="text" id="employee-firstname" class="form-control" value="${employee.firstName || ''}" required></div>
                                <div class="form-group"><label for="employee-lastname">Nom *</label><input type="text" id="employee-lastname" class="form-control" value="${employee.lastName || ''}" required></div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group"><label for="employee-id-number">Numéro d'Employé</label><input type="text" id="employee-id-number" class="form-control" value="${employee.employeeId || ''}"></div>
                                <div class="form-group"><label for="employee-position">Poste</label><input type="text" id="employee-position" class="form-control" value="${employee.position || ''}"></div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group"><label for="employee-email">Email</label><input type="email" id="employee-email" class="form-control" value="${employee.email || ''}" placeholder="nom@example.com"></div>
                                <div class="form-group"><label for="employee-phone">Téléphone</label><input type="tel" id="employee-phone" class="form-control" value="${employee.phone || ''}" placeholder="+237XXXXXXXXX"></div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group"><label for="employee-base-salary">Salaire de Base (FCFA) *</label><input type="number" id="employee-base-salary" class="form-control" value="${employee.baseSalary || ''}" required min="0" step="any"></div>
                                <div class="form-group"><label for="employee-hire-date">Date d'Embauche</label><input type="date" id="employee-hire-date" class="form-control" value="${hireDateValue}"></div>
                            </div>
                            <div class="form-group"><label for="employee-address">Adresse</label><textarea id="employee-address" class="form-control" rows="2">${employee.address || ''}</textarea></div>
                            <div class="form-group"><label for="employee-notes">Notes</label><textarea id="employee-notes" class="form-control" rows="3">${employee.notes || ''}</textarea></div>
                        </form>
                    </div>
                    <div class="modal-footer">
                         <button class="btn btn-outline modal-cancel">Annuler</button>
                         <button class="btn btn-primary" id="save-employee">Enregistrer</button>
                     </div>
                </div>
            `;

            modalContainer.classList.add('active');
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

        const modal = modalContainer.querySelector('.modal'); // Get the modal element itself

        // --- Close Buttons ---
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-cancel');
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());

        // --- Employee Form Save ---
        const saveBtn = modal.querySelector('#save-employee');
        const form = modal.querySelector('#employee-form');
        if (saveBtn && form) {
            saveBtn.addEventListener('click', async () => {
                if (form.checkValidity()) {
                    await this.saveEmployee(); // Uses DataManager
                } else {
                    form.reportValidity(); // Show browser validation errors
                }
            });
        }

         // --- Delete Confirmation ---
         const confirmDeleteBtn = modal.querySelector('#confirm-delete');
         if (confirmDeleteBtn) {
             const employeeId = confirmDeleteBtn.dataset.id;
             confirmDeleteBtn.addEventListener('click', async () => {
                 if (employeeId) {
                     await this.deleteEmployee(employeeId); // Uses DataManager
                 }
                 this.closeModal();
             });
         }

         // --- Details Modal Tabs ---
         const tabItems = modal.querySelectorAll('.tab-item');
         if(tabItems.length > 0) {
            tabItems.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    const currentActiveTab = modal.querySelector('.tab-item.active');
                    const currentActiveContent = modal.querySelector('.tab-content.active');
                    if (currentActiveTab === e.currentTarget) return; // Already active

                    // Deactivate current
                    if(currentActiveTab) currentActiveTab.classList.remove('active');
                    if(currentActiveContent) currentActiveContent.classList.remove('active');

                    // Activate clicked
                    e.currentTarget.classList.add('active');
                    const contentId = `${e.currentTarget.dataset.tab}-tab`;
                    const contentElement = modal.querySelector(`#${contentId}`);
                    if(contentElement) contentElement.classList.add('active');
                });
            });
         }

         // --- Details Modal Actions (Delegation) ---
         const modalBody = modal.querySelector('.modal-body');
         if (modalBody) {
             modalBody.addEventListener('click', async (event) => {
                 const employeeIdForAction = modal.querySelector('.employee-profile')?.dataset.employeeId;

                 // Add Advance
                 const addAdvanceBtn = event.target.closest('.add-advance');
                 if (addAdvanceBtn && window.AdvancesManager) {
                     this.closeModal();
                     await window.AdvancesManager.showAdvanceModal(null, addAdvanceBtn.dataset.employeeId || employeeIdForAction);
                     return;
                 }
                 // Edit Advance
                 const editAdvanceBtn = event.target.closest('.edit-advance');
                  if (editAdvanceBtn && window.AdvancesManager) {
                     this.closeModal();
                     await window.AdvancesManager.showAdvanceModal(editAdvanceBtn.dataset.id);
                     return;
                 }
                 // Delete Advance
                 const deleteAdvanceBtn = event.target.closest('.delete-advance');
                  if (deleteAdvanceBtn && window.AdvancesManager) {
                     this.closeModal();
                     await window.AdvancesManager.showDeleteConfirmation(deleteAdvanceBtn.dataset.id);
                     return;
                 }

                 // Add Sanction
                 const addSanctionBtn = event.target.closest('.add-sanction');
                 if (addSanctionBtn && window.SanctionsManager) {
                     this.closeModal();
                     await window.SanctionsManager.showSanctionModal(null, addSanctionBtn.dataset.employeeId || employeeIdForAction);
                     return;
                 }
                  // Edit/Delete Sanction (similar pattern...)
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


                 // Add Debt
                 const addDebtBtn = event.target.closest('.add-debt');
                 if (addDebtBtn && window.DebtsManager) {
                     this.closeModal();
                     await window.DebtsManager.showDebtModal(null, addDebtBtn.dataset.employeeId || employeeIdForAction);
                     return;
                 }
                  // Edit/Delete Debt (similar pattern...)
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

         // --- Details Modal Footer Edit Button ---
         const editEmployeeDetailsBtn = modal.querySelector('.modal-footer .edit-employee');
         if (editEmployeeDetailsBtn) {
             editEmployeeDetailsBtn.addEventListener('click', async () => {
                 const employeeId = editEmployeeDetailsBtn.dataset.id;
                 this.closeModal();
                 await this.showEmployeeModal(employeeId); // Re-open edit modal
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
     * Enregistre les données d'un employé (Using DataManager)
     */
    saveEmployee: async function() {
        const id = document.getElementById('employee-modal-id').value;
        const firstName = document.getElementById('employee-firstname').value.trim();
        const lastName = document.getElementById('employee-lastname').value.trim();
        const employeeIdNum = document.getElementById('employee-id-number').value.trim();
        const position = document.getElementById('employee-position').value.trim();
        const email = document.getElementById('employee-email').value.trim();
        const phone = document.getElementById('employee-phone').value.trim();
        const baseSalaryStr = document.getElementById('employee-base-salary').value;
        const hireDateInput = document.getElementById('employee-hire-date');
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
         // Optional: Validate email format
         if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('Veuillez entrer une adresse email valide.');
            return;
         }

        const hireDate = hireDateInput.value ? new Date(hireDateInput.value).toISOString() : null;

        // Création de l'objet employé
        const employeeData = {
            id: id || undefined, // Undefined for new employees, DataManager handles local ID if offline
            firstName,
            lastName,
            employeeId: employeeIdNum || null,
            position: position || null,
            email: email || null,
            phone: phone || null,
            baseSalary,
            hireDate: hireDate,
            address: address || null,
            notes: notes || null
        };

        window.showLoader("Enregistrement de l'employé...");
        try {
            // Save using DataManager
            const savedEmployee = await DataManager.employees.save(employeeData); // <--- Use DataManager

            if (savedEmployee) {
                this.closeModal();
                await this.loadEmployees(); // Reload list
                await this.loadPositionFilters(); // Reload filters
                // Optionally add activity log via DataManager
                // await DataManager.activities.add({ type: id ? 'update' : 'create', entity: 'employee', entityId: savedEmployee.id, description: `Employé ${savedEmployee.firstName} ${savedEmployee.lastName} ${id ? 'modifié' : 'ajouté'}.` });
                alert(`Employé ${id ? 'modifié' : 'ajouté'} avec succès.`);
            } else {
                // This case might indicate an error handled within DataManager/DB layer but returning null
                alert("Erreur lors de l'enregistrement de l'employé (opération a échoué).");
            }
        } catch (error) {
            console.error("Error saving employee:", error);
            alert(`Erreur lors de l'enregistrement: ${error.message}`);
        } finally {
            window.hideLoader();
        }
    },

    /**
     * Affiche le modal de confirmation de suppression (Using DataManager)
     */
    showDeleteConfirmation: async function(employeeId) {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;

        window.showLoader("Chargement...");
        try {
            const employee = await DataManager.employees.getById(employeeId); // <--- Use DataManager
            if (!employee) {
                alert("Employé non trouvé.");
                 window.hideLoader();
                return;
            }

            // Construction du modal
            modalContainer.innerHTML = `
                <div class="modal">
                    <div class="modal-header"><h3>Confirmation de Suppression</h3><button class="modal-close" aria-label="Fermer"><i class="fas fa-times"></i></button></div>
                    <div class="modal-body">
                        <p>Êtes-vous sûr de vouloir supprimer l'employé <strong>${employee.firstName} ${employee.lastName}</strong> ?</p>
                        <p class="text-warning">Cette action est irréversible.</p>
                        <p><small>Note: La suppression peut échouer si des enregistrements liés existent et que des contraintes de base de données l'empêchent (vérifiez la configuration Supabase).</small></p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline modal-cancel">Annuler</button>
                        <button class="btn btn-danger" id="confirm-delete" data-id="${employeeId}">Supprimer</button>
                    </div>
                </div>
            `;

            modalContainer.classList.add('active');
            this.bindModalEvents(); // Re-bind events

        } catch (error) {
             console.error("Error showing delete confirmation:", error);
             alert("Erreur lors de l'affichage de la confirmation.");
        } finally {
             window.hideLoader();
        }
    },

    /**
     * Supprime un employé (Using DataManager)
     */
    deleteEmployee: async function(employeeId) {
        if (!employeeId) return;

        window.showLoader("Suppression de l'employé...");
        try {
            const employeeToDelete = await DataManager.employees.getById(employeeId); // Get name before deleting
            const success = await DataManager.employees.delete(employeeId); // <--- Use DataManager

            if (success) {
                await this.loadEmployees(); // Reload list
                await this.loadPositionFilters(); // Reload filters
                // Optionally log activity
                // if (employeeToDelete) {
                //    await DataManager.activities.add({ type: 'delete', entity: 'employee', entityId: employeeId, description: `Employé ${employeeToDelete.firstName} ${employeeToDelete.lastName} supprimé.` });
                // }
                alert('Employé supprimé avec succès.');
            } else {
                // This case might mean the delete was queued offline or failed silently in DataManager/DB
                alert("La suppression a été initiée ou mise en file d'attente (si hors ligne). Vérifiez la liste.");
            }
        } catch (error) {
            console.error("Error deleting employee:", error);
            alert(`Erreur lors de la suppression: ${error.message}`);
        } finally {
            window.hideLoader();
        }
    },

    /**
     * Affiche les détails d'un employé (Using DataManager)
     */
    showEmployeeDetails: async function(employeeId) {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;

        window.showLoader("Chargement des détails...");
        try {
            // Fetch employee and related data concurrently using DataManager
            const [employee, advances, sanctions, debts, settings] = await Promise.all([
                DataManager.employees.getById(employeeId),           // <--- Use DataManager
                DataManager.advances.getByEmployeeId(employeeId),    // <--- Use DataManager
                DataManager.sanctions.getByEmployeeId(employeeId),   // <--- Use DataManager
                DataManager.debts.getByEmployeeId(employeeId),       // <--- Use DataManager
                DataManager.settings.get()                           // <--- Use DataManager
            ]);

            // Validate fetched data
            if (!employee) { throw new Error("Employé non trouvé."); }
            // Handle potential errors or empty arrays from related data fetches
            const validAdvances = Array.isArray(advances) ? advances : [];
            const validSanctions = Array.isArray(sanctions) ? sanctions : [];
            const validDebts = Array.isArray(debts) ? debts : [];

            const currencySymbol = settings?.currency || 'FCFA';

            // Calculate summary stats from fetched data
            const unpaidAdvances = validAdvances.filter(a => !a.isPaid);
            const totalUnpaidAdvances = unpaidAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);

            const currentDate = new Date();
            const currentMonthSanctions = validSanctions.filter(s => {
                const sanctionDate = new Date(s.date);
                return !isNaN(sanctionDate) && sanctionDate.getMonth() === currentDate.getMonth() && sanctionDate.getFullYear() === currentDate.getFullYear();
            });
            const totalCurrentMonthSanctions = currentMonthSanctions.reduce((sum, s) => sum + (s.amount || 0), 0);

            const unpaidDebts = validDebts.filter(d => !d.isPaid);
            const totalUnpaidDebts = unpaidDebts.reduce((sum, d) => sum + (d.amount || 0), 0);

             // --- Helper Function to Render Tab Content ---
             const renderDetailTable = (items, type) => {
                if (!items || items.length === 0) return '<div class="empty-message">Aucun enregistrement trouvé.</div>';

                 let headers = '';
                 let rows = '';

                 switch (type) {
                     case 'advances':
                         headers = `<th>Date</th><th>Montant (${currencySymbol})</th><th>Raison</th><th>Statut</th><th>Actions</th>`;
                         rows = items.map(a => `
                             <tr>
                                 <td>${a.date && !isNaN(new Date(a.date)) ? new Date(a.date).toLocaleDateString() : '-'}</td>
                                 <td>${(a.amount || 0).toLocaleString()}</td>
                                 <td>${a.reason || '-'}</td>
                                 <td><span class="badge ${a.isPaid ? 'badge-success' : 'badge-warning'}">${a.isPaid ? 'Remboursé' : 'En attente'}</span></td>
                                 <td><div class="table-actions">
                                    <button class="action-btn edit-advance" title="Modifier" data-id="${a.id}"><i class="fas fa-edit"></i></button>
                                    <button class="action-btn delete-advance" title="Supprimer" data-id="${a.id}"><i class="fas fa-trash"></i></button>
                                 </div></td>
                             </tr>`).join('');
                         break;
                     case 'sanctions':
                          headers = `<th>Date</th><th>Type</th><th>Montant (${currencySymbol})</th><th>Raison</th><th>Actions</th>`;
                          rows = items.map(s => {
                              let typeName = '';
                              switch (s.type) { case 'late': typeName='Retard'; break; case 'absence': typeName='Absence'; break; case 'misconduct': typeName='Faute'; break; default: typeName=s.type||'Autre'; }
                              return `
                              <tr>
                                 <td>${s.date && !isNaN(new Date(s.date)) ? new Date(s.date).toLocaleDateString() : '-'}</td>
                                 <td>${typeName}</td>
                                 <td>${(s.amount || 0).toLocaleString()}</td>
                                 <td>${s.reason || '-'}</td>
                                  <td><div class="table-actions">
                                      <button class="action-btn edit-sanction" title="Modifier" data-id="${s.id}"><i class="fas fa-edit"></i></button>
                                      <button class="action-btn delete-sanction" title="Supprimer" data-id="${s.id}"><i class="fas fa-trash"></i></button>
                                  </div></td>
                              </tr>`}).join('');
                          break;
                     case 'debts':
                          headers = `<th>Date</th><th>Client</th><th>Montant (${currencySymbol})</th><th>Description</th><th>Statut</th><th>Actions</th>`;
                          rows = items.map(d => `
                              <tr>
                                  <td>${d.date && !isNaN(new Date(d.date)) ? new Date(d.date).toLocaleDateString() : '-'}</td>
                                  <td>${d.clientName || '-'}</td>
                                  <td>${(d.amount || 0).toLocaleString()}</td>
                                  <td>${d.description || '-'}</td>
                                  <td><span class="badge ${d.isPaid ? 'badge-success' : 'badge-warning'}">${d.isPaid ? 'Payé' : 'Non payé'}</span></td>
                                   <td><div class="table-actions">
                                       <button class="action-btn edit-debt" title="Modifier" data-id="${d.id}"><i class="fas fa-edit"></i></button>
                                       <button class="action-btn delete-debt" title="Supprimer" data-id="${d.id}"><i class="fas fa-trash"></i></button>
                                   </div></td>
                              </tr>`).join('');
                          break;
                     default: return '<p class="error-message">Type de détail inconnu.</p>';
                 }

                return `<div class="table-responsive"><table class="table table-sm"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
            };


            // Construction du modal (Main Structure)
            modalContainer.innerHTML = `
                <div class="modal modal-large"> 
                    <div class="modal-header"><h3>Détails de l'Employé</h3><button class="modal-close" aria-label="Fermer"><i class="fas fa-times"></i></button></div>
                    <div class="modal-body">
                        <div class="employee-profile" data-employee-id="${employee.id}">
                           
                            <div class="employee-profile-header" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <div class="avatar" style="width: 70px; height: 70px; font-size: 1.5rem;"><span>${employee.firstName?.charAt(0) || ''}${employee.lastName?.charAt(0) || ''}</span></div>
                                <div class="employee-profile-info">
                                    <h2>${employee.firstName} ${employee.lastName}</h2>
                                    <p style="color: var(--gray-light);">${employee.position || 'Poste non spécifié'}</p>
                                    <div class="employee-contact" style="font-size: 0.9rem; color: var(--gray); margin-top: 0.5rem;">
                                        ${employee.email ? `<p><i class="fas fa-envelope" style="margin-right: 5px;"></i> ${employee.email}</p>` : ''}
                                        ${employee.phone ? `<p><i class="fas fa-phone" style="margin-right: 5px;"></i> ${employee.phone}</p>` : ''}
                                    </div>
                                </div>
                            </div>

                             
                             <div class="employee-details" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                                 <div class="detail-item"><strong class="detail-label" style="color:var(--gray-light);">ID Employé:</strong><span class="detail-value"> ${employee.employeeId || '-'}</span></div>
                                 <div class="detail-item"><strong class="detail-label" style="color:var(--gray-light);">Salaire Base:</strong><span class="detail-value"> ${employee.baseSalary ? `${employee.baseSalary.toLocaleString()} ${currencySymbol}` : '-'}</span></div>
                                 <div class="detail-item"><strong class="detail-label" style="color:var(--gray-light);">Date Embauche:</strong><span class="detail-value"> ${employee.hireDate && !isNaN(new Date(employee.hireDate)) ? new Date(employee.hireDate).toLocaleDateString() : '-'}</span></div>
                                 <div class="detail-item" style="grid-column: span 2;"><strong class="detail-label" style="color:var(--gray-light);">Adresse:</strong><span class="detail-value"> ${employee.address || '-'}</span></div>
                                 <div class="detail-item" style="grid-column: span 2;"><strong class="detail-label" style="color:var(--gray-light);">Notes:</strong><span class="detail-value"> ${employee.notes || '-'}</span></div>
                             </div>


                           
                            <div class="employee-financial-summary card mb-4">
                                 <div class="card-header"><h3>Résumé Financier Actuel</h3></div>
                                 <div class="card-body">
                                     <div class="stats-cards"> 
                                         <div class="stat-card"><div class="stat-icon"><i class="fas fa-hand-holding-usd"></i></div><div class="stat-info"><h4>Avances Non Remb.</h4><h2>${totalUnpaidAdvances.toLocaleString()} ${currencySymbol}</h2></div></div>
                                         <div class="stat-card"><div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div><div class="stat-info"><h4>Sanctions (Mois)</h4><h2>${totalCurrentMonthSanctions.toLocaleString()} ${currencySymbol}</h2></div></div>
                                         <div class="stat-card"><div class="stat-icon"><i class="fas fa-file-invoice-dollar"></i></div><div class="stat-info"><h4>Dettes Non Payées</h4><h2>${totalUnpaidDebts.toLocaleString()} ${currencySymbol}</h2></div></div>
                                     </div>
                                </div>
                            </div>

                          
                            <div class="employee-tabs">
                                <div class="tabs-header" style="display: flex; border-bottom: 1px solid rgba(255,255,255,0.2); margin-bottom: 1rem;">
                                    <div class="tab-item active" data-tab="advances" style="padding: 0.8rem 1rem; cursor: pointer; border-bottom: 2px solid transparent;">Avances (${validAdvances.length})</div>
                                    <div class="tab-item" data-tab="sanctions" style="padding: 0.8rem 1rem; cursor: pointer; border-bottom: 2px solid transparent;">Sanctions (${validSanctions.length})</div>
                                    <div class="tab-item" data-tab="debts" style="padding: 0.8rem 1rem; cursor: pointer; border-bottom: 2px solid transparent;">Dettes Clients (${validDebts.length})</div>
                                   
                                     <style>.tabs-header .tab-item.active { border-bottom-color: var(--primary); color: var(--primary); font-weight: 600; }</style>
                                </div>
                                <div class="tabs-content">
                                    <div class="tab-content active" id="advances-tab">
                                        <div class="tab-content-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                            <h4>Avances sur Salaire</h4>
                                            <button class="btn btn-outline btn-sm add-advance" data-employee-id="${employee.id}"><i class="fas fa-plus"></i> Nouvelle Avance</button>
                                        </div>
                                        ${renderDetailTable(validAdvances, 'advances')}
                                    </div>
                                    <div class="tab-content" id="sanctions-tab" style="display: none;"> 
                                         <div class="tab-content-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                             <h4>Sanctions et Pénalités</h4>
                                             <button class="btn btn-outline btn-sm add-sanction" data-employee-id="${employee.id}"><i class="fas fa-plus"></i> Nouvelle Sanction</button>
                                         </div>
                                         ${renderDetailTable(validSanctions, 'sanctions')}
                                    </div>
                                    <div class="tab-content" id="debts-tab" style="display: none;"> 
                                         <div class="tab-content-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                             <h4>Dettes Clients</h4>
                                             <button class="btn btn-outline btn-sm add-debt" data-employee-id="${employee.id}"><i class="fas fa-plus"></i> Nouvelle Dette</button>
                                         </div>
                                         ${renderDetailTable(validDebts, 'debts')}
                                    </div>
                                  
                                     <style>.tabs-content .tab-content:not(.active) { display: none; }</style>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline modal-cancel">Fermer</button>
                        <button class="btn btn-primary edit-employee" data-id="${employee.id}">Modifier l'Employé</button>
                    </div>
                </div>
            `;

            modalContainer.classList.add('active');
            this.bindModalEvents(); // Re-bind events

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
        const pageContainer = document.getElementById('employees-page');
        // Modal events are bound dynamically, no need for a modalContainer listener here usually

        // Listener for page-level actions
        if (pageContainer) {
             pageContainer.addEventListener('click', async (event) => {
                if (event.target.id === 'add-employee-btn' || event.target.closest('#add-employee-btn')) {
                    await this.showEmployeeModal();
                }
             });

             // Filters change/input listeners
             const searchInput = pageContainer.querySelector('#employee-search');
             const positionFilter = pageContainer.querySelector('#position-filter');
             const sortSelect = pageContainer.querySelector('#sort-employees');

             const applyFilters = async () => {
                await this.loadEmployees(searchInput?.value || '', positionFilter?.value || '');
             };

             if (searchInput) searchInput.addEventListener('input', applyFilters); // Use input for live search
             if (positionFilter) positionFilter.addEventListener('change', applyFilters);
             if (sortSelect) sortSelect.addEventListener('change', applyFilters);


             // Listener for table actions (delegated to tbody)
             const tableBody = pageContainer.querySelector('#employees-list');
             if (tableBody) {
                 tableBody.addEventListener('click', async (event) => {
                     const viewBtn = event.target.closest('.view-employee');
                     if (viewBtn) {
                         await this.showEmployeeDetails(viewBtn.dataset.id);
                         return;
                     }
                     const editBtn = event.target.closest('.edit-employee');
                     if (editBtn) {
                         await this.showEmployeeModal(editBtn.dataset.id);
                         return;
                     }
                     const deleteBtn = event.target.closest('.delete-employee');
                     if (deleteBtn) {
                         await this.showDeleteConfirmation(deleteBtn.dataset.id);
                         return;
                     }
                 });
             }
        }

        // Modal events are bound dynamically using bindModalEvents after content is set.
    }

};

// Make the manager globally available
window.EmployeesManager = EmployeesManager;