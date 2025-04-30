/**
     * advances.js
     * Gestion des avances sur salaire
     * Application de Gestion des Salaires Le Sims
     * (Updated for DataManager)
     */

const AdvancesManager = {
    /**
     * Initialisation du module de gestion des avances
     */
    init: async function() {
        console.log("Initializing AdvancesManager..."); // Added log
        // Render static structure first
        await this.renderAdvancesPageStructure();
        try {
            // Load initial data using DataManager
            await this.loadAdvances();
        } catch (error) {
            console.error("Error during AdvancesManager initialization:", error);
            // Display error on the page
             const advancesPage = document.getElementById('advances-page');
             if(advancesPage) {
                const listContainer = advancesPage.querySelector('#advances-list');
                const noDataMessage = advancesPage.querySelector('#no-advances-message');
                if(listContainer) listContainer.innerHTML = '';
                if(noDataMessage) {
                    noDataMessage.textContent = "Erreur lors du chargement initial des avances.";
                    noDataMessage.style.display = 'block';
                }
             }
        }
        this.bindEvents(); // Setup event listeners
        console.log("AdvancesManager initialized.");
    },

    /**
     * Renders the static HTML structure for the advances page.
     */
    renderAdvancesPageStructure: async function() {
        const advancesPage = document.getElementById('advances-page');
        if (!advancesPage) return;

        try {
            // Use DataManager to get settings
            const settings = await DataManager.settings.get();
            const currencySymbol = settings?.currency || 'FCFA';

            advancesPage.innerHTML = `
                <div class="page-header">
                    <h1>Gestion des Avances sur Salaire</h1>
                    <div class="page-actions">
                        <button id="add-advance-btn" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Nouvelle Avance
                        </button>
                    </div>
                </div>

                <div class="card mb-4">
                    <div class="card-body">
                        <div class="filters">
                            <div class="filter-group">
                                <label for="advance-status-filter">Statut:</label>
                                <select id="advance-status-filter" class="form-control">
                                    <option value="all">Tous</option>
                                    <option value="paid">Remboursées</option>
                                    <option value="unpaid" selected>Non Remboursées</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <label for="advance-date-filter">Période:</label>
                                <select id="advance-date-filter" class="form-control">
                                    <option value="all">Toutes les périodes</option>
                                    <option value="current-month" selected>Mois en cours</option>
                                    <option value="last-month">Mois précédent</option>
                                    <option value="last-3-months">3 derniers mois</option>
                                    <option value="current-year">Année en cours</option>
                                </select>
                            </div>
                            <div class="search-box">
                                <input type="text" id="advance-search" placeholder="Rechercher un employé...">
                                <i class="fas fa-search"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="stats-cards mb-4">
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div>
                        <div class="stat-info"><h4>Total Avances</h4><h2 id="total-advances-amount">0 ${currencySymbol}</h2></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                        <div class="stat-info"><h4>Avances Remboursées</h4><h2 id="paid-advances-amount">0 ${currencySymbol}</h2></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-exclamation-circle"></i></div>
                        <div class="stat-info"><h4>Avances Non Remboursées</h4><h2 id="unpaid-advances-amount">0 ${currencySymbol}</h2></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-users"></i></div>
                        <div class="stat-info"><h4>Employés avec Avances</h4><h2 id="employees-with-advances">0</h2></div>
                    </div>
                </div>

                <div class="table-responsive">
                    <table id="advances-table" class="table">
                        <thead>
                            <tr>
                                <th>Employé</th><th>Date</th><th>Montant</th><th>Raison</th><th>Statut</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="advances-list">
                            <tr><td colspan="6"><div class="loading-spinner-inline"></div> Chargement...</td></tr>
                        </tbody>
                    </table>
                    <div id="no-advances-message" class="empty-message" style="display: none;">
                        Aucune avance trouvée. Utilisez le bouton "Nouvelle Avance" pour en ajouter une.
                    </div>
                </div>
            `;
        } catch (error) {
             console.error("Error rendering advances page structure:", error);
             advancesPage.innerHTML = `<p class="error-message">Erreur lors de la construction de la page des avances.</p>`;
        }
    },

    /**
     * Charge les avances dans le tableau (Using DataManager)
     */
    loadAdvances: async function(searchQuery = '') {
        const advancesList = document.getElementById('advances-list');
        const noAdvancesMessage = document.getElementById('no-advances-message');
        if (!advancesList || !noAdvancesMessage) return;

        advancesList.innerHTML = '<tr><td colspan="6"><div class="loading-spinner-inline"></div> Chargement...</td></tr>';
        noAdvancesMessage.style.display = 'none';

        try {
            const statusFilter = document.getElementById('advance-status-filter')?.value || 'all';
            const dateFilter = document.getElementById('advance-date-filter')?.value || 'all';

            // Récupération des avances via DataManager
            let advances = await DataManager.advances.getAll();

            if (!Array.isArray(advances)) {
                console.error("Failed to load advances or data is not an array:", advances);
                throw new Error("Les données des avances n'ont pas pu être chargées.");
            }

            // Appliquer le filtre de statut
            if (statusFilter !== 'all') {
                advances = advances.filter(advance => statusFilter === 'paid' ? advance.isPaid : !advance.isPaid);
            }

            // Appliquer le filtre de date
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();
            if (dateFilter !== 'all') {
                advances = advances.filter(advance => {
                    // Date filtering logic remains the same
                    const advanceDate = new Date(advance.date);
                    const advanceMonth = advanceDate.getMonth();
                    const advanceYear = advanceDate.getFullYear();
                    switch (dateFilter) {
                        case 'current-month': return advanceMonth === currentMonth && advanceYear === currentYear;
                        case 'last-month': return (advanceMonth === currentMonth - 1 && advanceYear === currentYear) || (currentMonth === 0 && advanceMonth === 11 && advanceYear === currentYear - 1);
                        case 'last-3-months': const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(currentMonth - 3); return advanceDate >= threeMonthsAgo;
                        case 'current-year': return advanceYear === currentYear;
                        default: return true;
                    }
                });
            }

            // Fetch all potentially needed employees ONCE via DataManager
            let employeesMap = {};
            // Get all employees - DataManager handles offline/online source
            const employees = await DataManager.employees.getAll();
            if (Array.isArray(employees)) {
                employeesMap = employees.reduce((map, emp) => { map[emp.id] = emp; return map; }, {});
            } else {
                console.error("Failed to load employee data for advances display using DataManager.");
            }

            // Appliquer le filtre de recherche (client-side using the map)
            if (searchQuery) {
                const lowerQuery = searchQuery.toLowerCase();
                advances = advances.filter(advance => {
                    const employee = employeesMap[advance.employeeId];
                    if (!employee) return false;
                    const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.toLowerCase(); // Added fallback for missing names
                    return fullName.includes(lowerQuery);
                });
            }

            // Trier les avances par date (plus récentes en premier)
            if (advances.length > 0) {
                advances.sort((a, b) => new Date(b.date) - new Date(a.date));
            }

            // Mettre à jour les statistiques (using DataManager)
            await this.updateAdvanceStats(advances); // Pass filtered data

            // Afficher le message si aucune avance après filtrage
            if (advances.length === 0) {
                advancesList.innerHTML = '';
                noAdvancesMessage.textContent = 'Aucune avance trouvée pour les filtres sélectionnés.';
                noAdvancesMessage.style.display = 'block';
                return;
            }

            // Formatage des données pour l'affichage (using DataManager)
            const settings = await DataManager.settings.get();
            const currencySymbol = settings?.currency || 'FCFA';

            // Construction du tableau using the employeeMap
            advancesList.innerHTML = advances.map(advance => {
                const employee = employeesMap[advance.employeeId];
                // Fallback display if employee data is somehow missing for a valid advance
                const employeeNameHTML = employee
                   ? `<div class="employee-fullname">${employee.firstName || ''} ${employee.lastName || ''}</div><div class="employee-position">${employee.position || ''}</div>`
                   : `<div class="employee-fullname text-danger">Employé Inconnu (ID: ${advance.employeeId})</div>`;
                const avatarHTML = employee
                   ? `<span>${employee.firstName?.charAt(0) || ''}${employee.lastName?.charAt(0) || ''}</span>`
                   : `<span>?</span>`;


                return `
                    <tr data-id="${advance.id}">
                        <td>
                            <div class="employee-name">
                                <div class="avatar">${avatarHTML}</div>
                                <div>${employeeNameHTML}</div>
                            </div>
                        </td>
                        <td>${new Date(advance.date).toLocaleDateString('fr-FR')}</td>
                        <td>${(advance.amount || 0).toLocaleString('fr-FR')} ${currencySymbol}</td>
                        <td>${advance.reason || '-'}</td>
                        <td><span class="badge ${advance.isPaid ? 'badge-success' : 'badge-warning'}">${advance.isPaid ? 'Remboursée' : 'Non remboursée'}</span></td>
                        <td>
                            <div class="table-actions">
                                <button class="action-btn edit-advance" title="Modifier" data-id="${advance.id}"><i class="fas fa-edit"></i></button>
                                <button class="action-btn delete-advance" title="Supprimer" data-id="${advance.id}"><i class="fas fa-trash"></i></button>
                                ${!advance.isPaid ? `<button class="action-btn mark-paid" title="Marquer Remboursée" data-id="${advance.id}"><i class="fas fa-check"></i></button>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

        } catch (error) {
            console.error("Error loading advances list:", error);
            advancesList.innerHTML = ''; // Clear loading state
            noAdvancesMessage.textContent = `Erreur: ${error.message}`;
            noAdvancesMessage.style.display = 'block';
            await this.updateAdvanceStats([]); // Reset stats on error
        }
    },

    /**
     * Met à jour les statistiques des avances (Using DataManager)
     */
    updateAdvanceStats: async function(advances = null) {
        const totalAdvancesAmount = document.getElementById('total-advances-amount');
        const paidAdvancesAmount = document.getElementById('paid-advances-amount');
        const unpaidAdvancesAmount = document.getElementById('unpaid-advances-amount');
        const employeesWithAdvances = document.getElementById('employees-with-advances');

        if (!totalAdvancesAmount || !paidAdvancesAmount || !unpaidAdvancesAmount || !employeesWithAdvances) {
             console.warn("Advance stats elements not found.");
             return;
        }

        try {
            // Use provided advances or fetch all if null using DataManager
            if (advances === null) {
                advances = await DataManager.advances.getAll();
                if (!Array.isArray(advances)) {
                    console.error("Failed to load advances for stats via DataManager");
                    throw new Error("Données avances invalides");
                }
            }
             // Ensure advances is an array even if passed
             if (!Array.isArray(advances)) {
                 console.warn("Invalid data passed to updateAdvanceStats, expected array.");
                 advances = [];
             }

            // Calculer les statistiques
            const total = advances.reduce((sum, advance) => sum + (advance.amount || 0), 0);
            const paidTotal = advances.filter(advance => advance.isPaid).reduce((sum, advance) => sum + (advance.amount || 0), 0);
            const unpaidTotal = advances.filter(advance => !advance.isPaid).reduce((sum, advance) => sum + (advance.amount || 0), 0);
            const uniqueEmployees = new Set(advances.map(advance => advance.employeeId));

            // Formatage des données pour l'affichage (using DataManager)
            const settings = await DataManager.settings.get();
            const currencySymbol = settings?.currency || 'FCFA';

            // Mettre à jour les éléments
            totalAdvancesAmount.textContent = `${total.toLocaleString('fr-FR')} ${currencySymbol}`;
            paidAdvancesAmount.textContent = `${paidTotal.toLocaleString('fr-FR')} ${currencySymbol}`;
            unpaidAdvancesAmount.textContent = `${unpaidTotal.toLocaleString('fr-FR')} ${currencySymbol}`;
            employeesWithAdvances.textContent = uniqueEmployees.size;

        } catch (error) {
             console.error("Error updating advance stats:", error);
             // Reset stats on error
             totalAdvancesAmount.textContent = `Erreur`;
             paidAdvancesAmount.textContent = `Erreur`;
             unpaidAdvancesAmount.textContent = `Erreur`;
             employeesWithAdvances.textContent = `Erreur`;
        }
    },

    /**
     * Affiche le modal d'ajout/modification d'une avance (Using DataManager)
     */
    showAdvanceModal: async function(advanceId = null, preSelectedEmployeeId = null) {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;

        window.showLoader("Chargement du formulaire...");
        try {
            let advance = { date: new Date().toISOString().split('T')[0], amount: '', reason: '', isPaid: false, employeeId: preSelectedEmployeeId || '' };
            let modalTitle = 'Nouvelle Avance sur Salaire';

            // Si un ID est fourni, fetch data for modification via DataManager
            if (advanceId) {
                const existingAdvance = await DataManager.advances.getById(advanceId);
                if (existingAdvance) {
                    // Ensure date is formatted correctly for input type=date
                    const existingDate = existingAdvance.date ? new Date(existingAdvance.date) : new Date();
                    const formattedDate = !isNaN(existingDate) ? existingDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                    advance = { ...existingAdvance, date: formattedDate };
                    modalTitle = 'Modifier l\'Avance sur Salaire';
                } else {
                    throw new Error("Avance non trouvée.");
                }
            }

            // Récupérer la liste des employés via DataManager
            const employees = await DataManager.employees.getAll();
            if (!Array.isArray(employees)) throw new Error("Impossible de charger la liste des employés.");
            if (employees.length === 0) {
                alert('Vous devez d\'abord ajouter des employés.');
                window.hideLoader();
                return;
            }

            // Récupérer les paramètres via DataManager
            const settings = await DataManager.settings.get();
            const currencySymbol = settings?.currency || 'FCFA';

            // Construction du modal
            modalContainer.innerHTML = `
                <div class="modal">
                    <div class="modal-header"><h3>${modalTitle}</h3><button class="modal-close"><i class="fas fa-times"></i></button></div>
                    <div class="modal-body">
                        <form id="advance-form">
                            <input type="hidden" id="advance-id" value="${advance.id || ''}">
                            <div class="form-group">
                                <label for="employee-id">Employé *</label>
                                <select id="employee-id" class="form-control" required ${advanceId ? 'disabled' : ''}>
                                    <option value="">Sélectionnez un employé</option>
                                    ${employees.map(emp => `<option value="${emp.id}" ${advance.employeeId === emp.id ? 'selected' : ''}>${emp.firstName} ${emp.lastName} - ${emp.position || 'Sans poste'}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-grid">
                                <div class="form-group"><label for="advance-date">Date *</label><input type="date" id="advance-date" class="form-control" value="${advance.date}" required></div>
                                <div class="form-group"><label for="advance-amount">Montant (${currencySymbol}) *</label><input type="number" id="advance-amount" class="form-control" value="${advance.amount || ''}" min="0" step="any" required></div>
                            </div>
                            <div class="form-group"><label for="advance-reason">Raison</label><textarea id="advance-reason" class="form-control" rows="3">${advance.reason || ''}</textarea></div>
                            <div class="form-group"><div class="checkbox-wrapper"><input type="checkbox" id="advance-is-paid" ${advance.isPaid ? 'checked' : ''}><label for="advance-is-paid">Avance déjà remboursée</label></div></div>
                        </form>
                    </div>
                    <div class="modal-footer"><button class="btn btn-outline modal-cancel">Annuler</button><button class="btn btn-primary" id="save-advance">Enregistrer</button></div>
                </div>`;

            modalContainer.classList.add('active');
            this.bindModalEvents(); // Bind events for the new modal

        } catch (error) {
            console.error("Error showing advance modal:", error);
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

        // Save Advance Modal
        const saveAdvanceBtn = modalContainer.querySelector('#save-advance');
        const advanceForm = modalContainer.querySelector('#advance-form');
        if (saveAdvanceBtn && advanceForm) {
            saveAdvanceBtn.addEventListener('click', async () => {
                if (advanceForm.checkValidity()) {
                    await this.saveAdvance();
                } else {
                    advanceForm.reportValidity();
                }
            });
        }

        // Delete Confirmation Modal
        const confirmDeleteBtn = modalContainer.querySelector('#confirm-delete');
         if (confirmDeleteBtn) {
             const advanceId = confirmDeleteBtn.dataset.id; // Get ID from button
             confirmDeleteBtn.addEventListener('click', async () => {
                 if (advanceId) {
                     await this.deleteAdvance(advanceId);
                 }
                 this.closeModal();
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
             modalContainer.innerHTML = '';
         }
    },

    /**
     * Enregistre les données d'une avance (Using DataManager)
     */
    saveAdvance: async function() {
        const idInput = document.getElementById('advance-id');
        const employeeIdInput = document.getElementById('employee-id');
        const dateInput = document.getElementById('advance-date');
        const amountInput = document.getElementById('advance-amount');
        const reasonInput = document.getElementById('advance-reason');
        const isPaidInput = document.getElementById('advance-is-paid');

         if (!employeeIdInput || !dateInput || !amountInput) {
             console.error("Form elements not found for saving advance.");
             alert("Erreur: Impossible de trouver les éléments du formulaire.");
             return;
         }

        const id = idInput.value;
        const employeeId = employeeIdInput.value;
        const date = dateInput.value;
        const amountStr = amountInput.value;
        const reason = reasonInput.value.trim();
        const isPaid = isPaidInput.checked;

        // Validation
        if (!employeeId || !date || !amountStr) {
            alert('Veuillez remplir les champs obligatoires (Employé, Date, Montant).');
            return;
        }
        const amount = parseFloat(amountStr);
         if (isNaN(amount) || amount <= 0) {
             alert('Veuillez entrer un montant valide (nombre positif).');
             return;
         }

        // Create data object
        const advanceData = {
            id: id || undefined, // Let DataManager/LocalDB handle ID generation if undefined
            employeeId,
            date: new Date(date).toISOString(), // Store as ISO string
            amount,
            reason: reason || null,
            isPaid,
             // Set paidDate only if 'isPaid' is checked NOW and it wasn't paid before, or preserve existing
            paidDate: isPaid ? ( (id ? (await DataManager.advances.getById(id))?.paidDate : null) || new Date().toISOString() ) : null
        };


        window.showLoader("Enregistrement de l'avance...");
        try {
            // Save using DataManager
            const saved = await DataManager.advances.save(advanceData);
            if (saved) {
                this.closeModal();
                await this.loadAdvances();
                alert(`Avance ${id ? 'modifiée' : 'ajoutée'} avec succès.`);
            } else {
                 alert("Erreur lors de l'enregistrement de l'avance.");
            }
        } catch (error) {
            console.error("Error saving advance:", error);
            alert(`Erreur: ${error.message}`);
        } finally {
            window.hideLoader();
        }
    },

    /**
     * Marque une avance comme remboursée (Using DataManager)
     */
    markAdvanceAsPaid: async function(advanceId) {
        window.showLoader("Mise à jour...");
        try {
            // Get advance using DataManager
            const advance = await DataManager.advances.getById(advanceId);
            if (!advance) throw new Error("Avance non trouvée.");

            if(advance.isPaid) {
                alert("Cette avance est déjà marquée comme remboursée.");
                window.hideLoader();
                return;
            }

            const updatedAdvance = { ...advance, isPaid: true, paidDate: new Date().toISOString() };

            // Save using DataManager
            const saved = await DataManager.advances.save(updatedAdvance);

            if(saved) {
                await this.loadAdvances();
                alert("Avance marquée comme remboursée.");
            } else {
                 alert("Erreur lors de la mise à jour.");
            }
        } catch (error) {
            console.error("Error marking advance as paid:", error);
            alert(`Erreur: ${error.message}`);
        } finally {
            window.hideLoader();
        }
    },

    /**
     * Affiche le modal de confirmation de suppression (Using DataManager)
     */
    showDeleteConfirmation: async function(advanceId) {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;

        window.showLoader("Chargement...");
        try {
             // Get data using DataManager
            const advance = await DataManager.advances.getById(advanceId);
            if (!advance) throw new Error("Avance non trouvée.");

            const employee = await DataManager.employees.getById(advance.employeeId);
            // Employee might be null if deleted, handle gracefully
            const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu';

            const settings = await DataManager.settings.get();
            const currencySymbol = settings?.currency || 'FCFA';

            modalContainer.innerHTML = `
                <div class="modal">
                    <div class="modal-header"><h3>Confirmation de Suppression</h3><button class="modal-close"><i class="fas fa-times"></i></button></div>
                    <div class="modal-body">
                        <p>Êtes-vous sûr de vouloir supprimer cette avance sur salaire ?</p>
                        <div class="confirm-details">
                            <div class="detail-row"><span class="detail-label">Employé:</span><span class="detail-value">${employeeName}</span></div>
                            <div class="detail-row"><span class="detail-label">Date:</span><span class="detail-value">${new Date(advance.date).toLocaleDateString()}</span></div>
                            <div class="detail-row"><span class="detail-label">Montant:</span><span class="detail-value">${(advance.amount||0).toLocaleString()} ${currencySymbol}</span></div>
                            <div class="detail-row"><span class="detail-label">Statut:</span><span class="detail-value">${advance.isPaid ? 'Remboursée' : 'Non remboursée'}</span></div>
                        </div>
                        <p class="text-danger mt-3">Cette action est irréversible.</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline modal-cancel">Annuler</button>
                        {/* Pass id to the button */}
                        <button class="btn btn-danger" id="confirm-delete" data-id="${advanceId}">Supprimer</button>
                    </div>
                </div>`;

            modalContainer.classList.add('active');
            this.bindModalEvents(); // Bind events for the new modal

        } catch (error) {
            console.error("Error showing delete confirmation:", error);
            alert(`Erreur: ${error.message}`);
        } finally {
            window.hideLoader();
        }
    },

    /**
     * Supprime une avance (Using DataManager)
     */
    deleteAdvance: async function(advanceId) {
         if (!advanceId) return;
         window.showLoader("Suppression...");
         try {
             // Delete using DataManager
            const success = await DataManager.advances.delete(advanceId);
            if (success) {
                await this.loadAdvances();
                alert("Avance supprimée avec succès.");
            } else {
                 // DataManager's delete should ideally throw on failure, but handle false return just in case
                 alert("Erreur lors de la suppression de l'avance (l'opération a échoué).");
            }
         } catch (error) {
             console.error("Error deleting advance:", error);
             alert(`Erreur: ${error.message}`);
         } finally {
             window.hideLoader();
         }
    },

    /**
     * Attache les événements aux éléments de la page (using delegation)
     */
    bindEvents: function() {
        const pageContainer = document.getElementById('advances-page'); // More specific container

        if (pageContainer) {
             pageContainer.addEventListener('click', async (event) => {
                if (event.target.id === 'add-advance-btn' || event.target.closest('#add-advance-btn')) {
                    await this.showAdvanceModal();
                }
             });

             pageContainer.addEventListener('change', async (event) => {
                if (event.target.id === 'advance-status-filter' || event.target.id === 'advance-date-filter') {
                    const searchInput = pageContainer.querySelector('#advance-search');
                    await this.loadAdvances(searchInput?.value || '');
                }
             });

             pageContainer.addEventListener('input', async (event) => {
                 if (event.target.id === 'advance-search') {
                     // Add debounce to prevent excessive loading on every keystroke
                     clearTimeout(this.searchTimeout); // Clear previous timeout
                     this.searchTimeout = setTimeout(async () => {
                        await this.loadAdvances(event.target.value);
                      }, 300); // Wait 300ms after last keystroke
                 }
             });

             // Table actions delegation
             const tableBody = pageContainer.querySelector('#advances-list');
             if (tableBody) {
                 tableBody.addEventListener('click', async (event) => {
                     const editBtn = event.target.closest('.edit-advance');
                     if (editBtn) { await this.showAdvanceModal(editBtn.dataset.id); return; }

                     const deleteBtn = event.target.closest('.delete-advance');
                     if (deleteBtn) { await this.showDeleteConfirmation(deleteBtn.dataset.id); return; }

                     const markPaidBtn = event.target.closest('.mark-paid');
                     if (markPaidBtn) { await this.markAdvanceAsPaid(markPaidBtn.dataset.id); return; }
                 });
             }
        }
         // Modal events are bound dynamically using bindModalEvents
    },
    searchTimeout: null // Property to hold search debounce timeout
};

window.AdvancesManager = AdvancesManager;