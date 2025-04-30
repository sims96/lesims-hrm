/**
 * debts.js
 * Gestion des dettes clients
 * Application de Gestion des Salaires Le Sims
 */

const DebtsManager = {
    /**
     * Initialisation du module de gestion des dettes clients
     */
    init: async function() { // Added async
        await this.loadDebtsPage(); // Added await
        this.bindEvents(); // Assuming bindEvents uses event delegation or handlers are async
    },

    /**
     * Charge la page de gestion des dettes clients
     */
    loadDebtsPage: async function() { // Added async
        const debtsPage = document.getElementById('debts-page');

        if (!debtsPage) return;

        try {
            // Récupérer les paramètres
            const settings = await DB.settings.get(); // Added await
            const currencySymbol = settings.currency || 'FCFA';

            // Construction de la page
            debtsPage.innerHTML = `
                <div class="page-header">
                    <h1>Gestion des Dettes Clients</h1>
                    <div class="page-actions">
                        <button id="add-debt-btn" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Nouvelle Dette Client
                        </button>
                    </div>
                </div>

                <div class="card mb-4">
                    <div class="card-body">
                        <div class="filters">
                            <div class="filter-group">
                                <label for="debt-status-filter">Statut:</label>
                                <select id="debt-status-filter" class="form-control">
                                    <option value="all">Tous</option>
                                    <option value="paid">Payées</option>
                                    <option value="unpaid" selected>Non Payées</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <label for="debt-date-filter">Période:</label>
                                <select id="debt-date-filter" class="form-control">
                                    <option value="all">Toutes les périodes</option>
                                    <option value="current-month" selected>Mois en cours</option>
                                    <option value="last-month">Mois précédent</option>
                                    <option value="last-3-months">3 derniers mois</option>
                                    <option value="current-year">Année en cours</option>
                                </select>
                            </div>
                            <div class="search-box">
                                <input type="text" id="debt-search" placeholder="Rechercher un employé ou client...">
                                <i class="fas fa-search"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="stats-cards mb-4">
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-file-invoice-dollar"></i></div>
                        <div class="stat-info"><h4>Total Dettes</h4><h2 id="total-debts-amount">0 ${currencySymbol}</h2></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                        <div class="stat-info"><h4>Dettes Payées</h4><h2 id="paid-debts-amount">0 ${currencySymbol}</h2></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-exclamation-circle"></i></div>
                        <div class="stat-info"><h4>Dettes Non Payées</h4><h2 id="unpaid-debts-amount">0 ${currencySymbol}</h2></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-users"></i></div>
                        <div class="stat-info"><h4>Employés Responsables</h4><h2 id="employees-with-debts">0</h2></div>
                    </div>
                </div>

                <div class="table-responsive">
                    <table id="debts-table" class="table">
                        <thead>
                            <tr>
                                <th>Employé Responsable</th><th>Client</th><th>Date</th><th>Montant</th><th>Description</th><th>Statut</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="debts-list"></tbody>
                    </table>
                    <div id="no-debts-message" class="empty-message" style="display: none;">
                        Aucune dette client trouvée. Utilisez le bouton "Nouvelle Dette Client" pour en ajouter une.
                    </div>
                </div>
            `;

            // Charger les données des dettes
            await this.loadDebts(); // Added await

        } catch (error) {
            console.error("Error loading debts page:", error);
            debtsPage.innerHTML = `<p class="error-message">Erreur lors du chargement de la page des dettes.</p>`;
        }
    },

    /**
     * Charge les dettes dans le tableau
     */
    loadDebts: async function(searchQuery = '') { // Added async
        const debtsList = document.getElementById('debts-list');
        const noDebtsMessage = document.getElementById('no-debts-message');

        if (!debtsList || !noDebtsMessage) return;

        try {
            // Récupérer les filtres
            const statusFilter = document.getElementById('debt-status-filter')?.value || 'all';
            const dateFilter = document.getElementById('debt-date-filter')?.value || 'all';

            // Récupération des dettes
            let debts = await DB.debts.getAll(); // Added await

            // ----> ADDED CHECK <----
            if (!Array.isArray(debts)) {
                console.error("Failed to load debts or data is not an array:", debts);
                debts = [];
                debtsList.innerHTML = '';
                noDebtsMessage.textContent = 'Erreur lors du chargement des dettes.';
                noDebtsMessage.style.display = 'block';
                await this.updateDebtStats([]); // Update stats with empty array
                return;
            }
            // ----> END CHECK <----

            // Appliquer le filtre de statut
            if (statusFilter !== 'all') {
                debts = debts.filter(debt => statusFilter === 'paid' ? debt.isPaid : !debt.isPaid);
            }

            // Appliquer le filtre de date
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();

            if (dateFilter !== 'all') {
                debts = debts.filter(debt => {
                    // ... (date filtering logic remains the same) ...
                    const debtDate = new Date(debt.date);
                    const debtMonth = debtDate.getMonth();
                    const debtYear = debtDate.getFullYear();

                    switch (dateFilter) {
                        case 'current-month': return debtMonth === currentMonth && debtYear === currentYear;
                        case 'last-month': return (debtMonth === currentMonth - 1 && debtYear === currentYear) || (currentMonth === 0 && debtMonth === 11 && debtYear === currentYear - 1);
                        case 'last-3-months': const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(currentMonth - 3); return debtDate >= threeMonthsAgo;
                        case 'current-year': return debtYear === currentYear;
                        default: return true;
                    }
                });
            }

            // Filter based on search query (Requires fetching employee data)
            if (searchQuery) {
                const lowerSearchQuery = searchQuery.toLowerCase();
                const filteredDebts = [];
                for (const debt of debts) {
                    const employee = await DB.employees.getById(debt.employeeId); // Added await
                    if (!employee) continue; // Skip if employee not found

                    const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
                    const clientName = (debt.clientName || '').toLowerCase();
                    const description = (debt.description || '').toLowerCase();

                    if (fullName.includes(lowerSearchQuery) || clientName.includes(lowerSearchQuery) || description.includes(lowerSearchQuery)) {
                        filteredDebts.push(debt);
                    }
                }
                debts = filteredDebts; // Assign the filtered results
            }


            // Trier les dettes par date (plus récentes en premier)
             if (debts.length > 0) { // Check length before sorting
                debts.sort((a, b) => new Date(b.date) - new Date(a.date));
             }

            // Mettre à jour les statistiques
            await this.updateDebtStats(debts); // Added await

            // Afficher le message si aucune dette
            if (debts.length === 0) {
                debtsList.innerHTML = '';
                 noDebtsMessage.textContent = 'Aucune dette client trouvée pour les filtres sélectionnés.'; // More specific message
                noDebtsMessage.style.display = 'block';
                return;
            }

            noDebtsMessage.style.display = 'none';

            // Formatage des données pour l'affichage
            const settings = await DB.settings.get(); // Added await
            const currencySymbol = settings.currency || 'FCFA';

            // Construction du tableau (using Promise.all for getById)
            const tableRows = await Promise.all(debts.map(async (debt) => {
                 const employee = await DB.employees.getById(debt.employeeId); // Added await
                 if (!employee) return ''; // Skip if employee not found

                 return `
                     <tr data-id="${debt.id}">
                         <td><div class="employee-name">...</div></td> {/* Replace with correct employee info */}
                         <td>${debt.clientName || '-'}</td>
                         <td>${new Date(debt.date).toLocaleDateString()}</td>
                         <td>${debt.amount.toLocaleString()} ${currencySymbol}</td>
                         <td>${debt.description || '-'}</td>
                         <td><span class="badge ${debt.isPaid ? 'badge-success' : 'badge-warning'}">${debt.isPaid ? 'Payée' : 'Non payée'}</span></td>
                         <td><div class="table-actions">...</div></td> {/* Add action buttons */}
                     </tr>
                 `;
                 // Note: You'll need to reconstruct the employee avatar/name div structure
                 // and the action buttons within the template literal.
            }));

             debtsList.innerHTML = tableRows.join('');


        } catch (error) {
            console.error("Error loading debts data:", error);
            debtsList.innerHTML = '';
            noDebtsMessage.textContent = 'Erreur lors du chargement des données des dettes.';
            noDebtsMessage.style.display = 'block';
        }
    },

    /**
     * Met à jour les statistiques des dettes
     */
    updateDebtStats: async function(debts = null) { // Added async
        const totalDebtsAmount = document.getElementById('total-debts-amount');
        const paidDebtsAmount = document.getElementById('paid-debts-amount');
        const unpaidDebtsAmount = document.getElementById('unpaid-debts-amount');
        const employeesWithDebts = document.getElementById('employees-with-debts');

        if (!totalDebtsAmount || !paidDebtsAmount || !unpaidDebtsAmount || !employeesWithDebts) {
            return;
        }

        try {
             // Use provided debts or fetch all if null
             if (debts === null) {
                 debts = await DB.debts.getAll(); // Added await
                 if (!Array.isArray(debts)) {
                     console.error("Failed to load debts for stats");
                     debts = [];
                 }
             }

            // Calculer les statistiques
            const total = debts.reduce((sum, debt) => sum + debt.amount, 0);
            const paidTotal = debts.filter(debt => debt.isPaid).reduce((sum, debt) => sum + debt.amount, 0);
            const unpaidTotal = debts.filter(debt => !debt.isPaid).reduce((sum, debt) => sum + debt.amount, 0);
            const uniqueEmployees = new Set(debts.map(debt => debt.employeeId));

            // Formatage des données pour l'affichage
            const settings = await DB.settings.get(); // Added await
            const currencySymbol = settings.currency || 'FCFA';

            // Mettre à jour les éléments
            totalDebtsAmount.textContent = `${total.toLocaleString()} ${currencySymbol}`;
            paidDebtsAmount.textContent = `${paidTotal.toLocaleString()} ${currencySymbol}`;
            unpaidDebtsAmount.textContent = `${unpaidTotal.toLocaleString()} ${currencySymbol}`;
            employeesWithDebts.textContent = uniqueEmployees.size;

        } catch (error) {
            console.error("Error updating debt stats:", error);
            // Reset stats on error
            totalDebtsAmount.textContent = `Erreur`;
            paidDebtsAmount.textContent = `Erreur`;
            unpaidDebtsAmount.textContent = `Erreur`;
            employeesWithDebts.textContent = `Erreur`;
        }
    },

    /**
     * Affiche le modal d'ajout/modification d'une dette
     */
    showDebtModal: async function(debtId = null, preSelectedEmployeeId = null) { // Added async
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;

        try {
            let debt = { date: new Date().toISOString().split('T')[0], clientName: '', amount: '', description: '', isPaid: false };
            let modalTitle = 'Nouvelle Dette Client';

            // Si un ID est fourni, il s'agit d'une modification
            if (debtId) {
                const existingDebt = await DB.debts.getById(debtId); // Added await
                if (existingDebt) {
                    debt = { ...existingDebt, date: new Date(existingDebt.date).toISOString().split('T')[0] };
                    modalTitle = 'Modifier la Dette Client';
                } else {
                    alert("Dette non trouvée."); return;
                }
            }

            // Récupérer la liste des employés
            const employees = await DB.employees.getAll(); // Added await
             if (!Array.isArray(employees)) {
                 console.error("Failed to load employees for modal");
                 alert("Erreur lors du chargement de la liste des employés.");
                 return;
             }

            if (employees.length === 0) {
                alert('Vous devez d\'abord ajouter des employés avant de pouvoir enregistrer des dettes clients.');
                return;
            }

             if (preSelectedEmployeeId && !debtId) debt.employeeId = preSelectedEmployeeId;

            // Récupérer les paramètres
            const settings = await DB.settings.get(); // Added await
            const currencySymbol = settings.currency || 'FCFA';

            // Construction du modal
            modalContainer.innerHTML = `
                <div class="modal">
                    <div class="modal-header"><h3>${modalTitle}</h3><button class="modal-close"><i class="fas fa-times"></i></button></div>
                    <div class="modal-body">
                        <form id="debt-form">
                            <input type="hidden" id="debt-id" value="${debt.id || ''}">
                            <div class="form-group">
                                <label for="employee-id">Employé Responsable *</label>
                                <select id="employee-id" class="form-control" required ${debtId ? 'disabled' : ''}>
                                    <option value="">Sélectionnez un employé</option>
                                    ${employees.map(emp => `<option value="${emp.id}" ${debt.employeeId === emp.id ? 'selected' : ''}>${emp.firstName} ${emp.lastName} - ${emp.position || 'Sans poste'}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group"><label for="client-name">Nom du Client *</label><input type="text" id="client-name" class="form-control" value="${debt.clientName || ''}" required></div>
                            <div class="form-grid">
                                <div class="form-group"><label for="debt-date">Date *</label><input type="date" id="debt-date" class="form-control" value="${debt.date}" required></div>
                                <div class="form-group"><label for="debt-amount">Montant (${currencySymbol}) *</label><input type="number" id="debt-amount" class="form-control" value="${debt.amount}" min="0" required></div>
                            </div>
                            <div class="form-group"><label for="debt-description">Description</label><textarea id="debt-description" class="form-control" rows="3">${debt.description || ''}</textarea></div>
                            <div class="form-group"><div class="checkbox-wrapper"><input type="checkbox" id="debt-is-paid" ${debt.isPaid ? 'checked' : ''}><label for="debt-is-paid">Dette déjà payée</label></div></div>
                        </form>
                    </div>
                    <div class="modal-footer"><button class="btn btn-outline modal-cancel">Annuler</button><button class="btn btn-primary" id="save-debt">Enregistrer</button></div>
                </div>
            `;

            // Afficher le modal
            modalContainer.classList.add('active');

            // Gérer les événements du modal (binding should happen *after* innerHTML is set)
            const closeBtn = modalContainer.querySelector('.modal-close');
            const cancelBtn = modalContainer.querySelector('.modal-cancel');
            const saveBtn = document.getElementById('save-debt');
            const form = document.getElementById('debt-form');

            if(closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
            if(cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());

            if (saveBtn && form) {
                 saveBtn.addEventListener('click', async () => { // Added async to handler
                    if (form.checkValidity()) {
                        await this.saveDebt(); // Added await
                    } else {
                        form.reportValidity();
                    }
                 });
             }

        } catch (error) {
            console.error("Error showing debt modal:", error);
            alert("Erreur lors de l'ouverture du formulaire de dette.");
        }
    },

    /**
     * Ferme le modal actif
     */
    closeModal: function() {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
            modalContainer.classList.remove('active');
            modalContainer.innerHTML = ''; // Clear content after closing
        }
    },

    /**
     * Enregistre les données d'une dette
     */
    saveDebt: async function() { // Added async
        const id = document.getElementById('debt-id').value;
        const employeeId = document.getElementById('employee-id').value;
        const clientName = document.getElementById('client-name').value.trim();
        const date = document.getElementById('debt-date').value;
        const amount = parseFloat(document.getElementById('debt-amount').value);
        const description = document.getElementById('debt-description').value.trim();
        const isPaid = document.getElementById('debt-is-paid').checked;

        if (!employeeId || !clientName || !date || isNaN(amount) || amount <= 0) {
            alert('Veuillez remplir tous les champs obligatoires avec des valeurs valides.');
            return;
        }

        const debt = { id: id || undefined, employeeId, clientName, date: new Date(date).toISOString(), amount, description, isPaid };

        try {
            await DB.debts.save(debt); // Added await
            this.closeModal();
            await this.loadDebts(); // Added await
        } catch (error) {
            console.error("Error saving debt:", error);
            alert("Erreur lors de l'enregistrement de la dette.");
        }
    },

    /**
     * Marque une dette comme payée
     */
    markDebtAsPaid: async function(debtId) { // Added async
        try {
            const debt = await DB.debts.getById(debtId); // Added await
            if (!debt) { alert("Dette non trouvée."); return; }

            const updatedDebt = { ...debt, isPaid: true, paidDate: new Date().toISOString() };
            await DB.debts.save(updatedDebt); // Added await
            await this.loadDebts(); // Added await
        } catch (error) {
            console.error("Error marking debt as paid:", error);
            alert("Erreur lors de la mise à jour du statut de la dette.");
        }
    },

    /**
     * Affiche le modal de confirmation de suppression
     */
    showDeleteConfirmation: async function(debtId) { // Added async
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;

        try {
            const debt = await DB.debts.getById(debtId); // Added await
            if (!debt) { alert("Dette non trouvée."); return; }

            const employee = await DB.employees.getById(debt.employeeId); // Added await
            if (!employee) { alert("Employé associé non trouvé."); return; } // Handle missing employee

            const settings = await DB.settings.get(); // Added await
            const currencySymbol = settings.currency || 'FCFA';

            modalContainer.innerHTML = `
                <div class="modal">
                    <div class="modal-header"><h3>Confirmation de Suppression</h3><button class="modal-close"><i class="fas fa-times"></i></button></div>
                    <div class="modal-body">
                        <p>Êtes-vous sûr de vouloir supprimer cette dette client ?</p>
                        <div class="confirm-details">
                             <div class="detail-row"><span class="detail-label">Employé Resp.:</span><span class="detail-value">${employee.firstName} ${employee.lastName}</span></div>
                             <div class="detail-row"><span class="detail-label">Client:</span><span class="detail-value">${debt.clientName}</span></div>
                             <div class="detail-row"><span class="detail-label">Date:</span><span class="detail-value">${new Date(debt.date).toLocaleDateString()}</span></div>
                             <div class="detail-row"><span class="detail-label">Montant:</span><span class="detail-value">${debt.amount.toLocaleString()} ${currencySymbol}</span></div>
                             <div class="detail-row"><span class="detail-label">Statut:</span><span class="detail-value">${debt.isPaid ? 'Payée' : 'Non payée'}</span></div>
                        </div>
                        <p class="text-danger mt-3">Cette action est irréversible.</p>
                    </div>
                    <div class="modal-footer"><button class="btn btn-outline modal-cancel">Annuler</button><button class="btn btn-danger" id="confirm-delete">Supprimer</button></div>
                </div>
            `;

            modalContainer.classList.add('active');

             // Event listeners after setting innerHTML
             const closeBtn = modalContainer.querySelector('.modal-close');
             const cancelBtn = modalContainer.querySelector('.modal-cancel');
             const confirmBtn = document.getElementById('confirm-delete');

             if(closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
             if(cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());
             if(confirmBtn) {
                 confirmBtn.addEventListener('click', async () => { // Added async
                    await this.deleteDebt(debtId); // Added await
                    this.closeModal();
                 });
             }

        } catch (error) {
            console.error("Error showing delete confirmation:", error);
            alert("Erreur lors de l'affichage de la confirmation de suppression.");
        }
    },

    /**
     * Supprime une dette
     */
    deleteDebt: async function(debtId) { // Added async
        try {
            await DB.debts.delete(debtId); // Added await
            await this.loadDebts(); // Added await
        } catch (error) {
            console.error("Error deleting debt:", error);
            alert("Erreur lors de la suppression de la dette.");
        }
    },

    /**
     * Attache les événements aux éléments de la page (using delegation)
     */
    bindEvents: function() {
        const pageContainer = document.getElementById('debts-page'); // Or a higher parent like document
        const modalContainer = document.getElementById('modal-container');

        // Listener for page-level actions (add button, filters, search)
        if (pageContainer) {
            pageContainer.addEventListener('click', async (event) => { // Added async
                 if (event.target.id === 'add-debt-btn' || event.target.closest('#add-debt-btn')) {
                    await this.showDebtModal(); // Added await
                 }
            });

             pageContainer.addEventListener('change', async (event) => { // Added async
                if (event.target.id === 'debt-status-filter' || event.target.id === 'debt-date-filter') {
                    const searchInput = pageContainer.querySelector('#debt-search');
                    await this.loadDebts(searchInput?.value || ''); // Added await
                }
             });

             pageContainer.addEventListener('input', async (event) => { // Added async
                 if (event.target.id === 'debt-search') {
                     await this.loadDebts(event.target.value); // Added await
                 }
             });
        }

         // Listener for actions within the table (event delegation on tbody is better)
         const tableBody = document.getElementById('debts-list');
         if(tableBody) {
            tableBody.addEventListener('click', async (event) => { // Added async
                const editBtn = event.target.closest('.edit-debt');
                if (editBtn) {
                    await this.showDebtModal(editBtn.dataset.id); // Added await
                    return; // Prevent further checks
                }

                const deleteBtn = event.target.closest('.delete-debt');
                if (deleteBtn) {
                    await this.showDeleteConfirmation(deleteBtn.dataset.id); // Added await
                     return;
                }

                const markPaidBtn = event.target.closest('.mark-paid');
                if (markPaidBtn) {
                    await this.markDebtAsPaid(markPaidBtn.dataset.id); // Added await
                     return;
                }
            });
         }


        // Modal events are handled within showDebtModal and showDeleteConfirmation
        // after the modal content is generated.
    }
};

window.DebtsManager = DebtsManager;