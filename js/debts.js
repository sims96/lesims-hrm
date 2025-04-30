/**
 * debts.js
 * Gestion des dettes clients
 * Application de Gestion des Salaires Le Sims
 * (Updated to use DataManager)
 */

const DebtsManager = {
    /**
     * Initialisation du module de gestion des dettes clients
     */
    init: async function() {
        try {
            await this.loadDebtsPage(); // Load structure and initial data
            this.bindEvents(); // Setup event listeners
            console.log("DebtsManager initialized.");
        } catch (error) {
            console.error("Error during DebtsManager initialization:", error);
            // Attempt to display an error message on the page
            const debtsPage = document.getElementById('debts-page');
            if (debtsPage) {
                debtsPage.innerHTML = `<p class="error-message">Erreur critique lors de l'initialisation du module des dettes.</p>`;
            }
        }
    },

    /**
     * Charge la page de gestion des dettes clients (structure & data)
     */
    loadDebtsPage: async function() {
        const debtsPage = document.getElementById('debts-page');
        if (!debtsPage) return;

        debtsPage.innerHTML = '<div class="loading-spinner-inline"></div> Chargement de la page des dettes...'; // Initial loading state

        try {
            // Récupérer les paramètres via DataManager
            const settings = await DataManager.settings.get(); // Use DataManager
            const currencySymbol = settings?.currency || 'FCFA';

            // Construction de la structure HTML de la page
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
                                <input type="text" id="debt-search" placeholder="Rechercher employé ou client...">
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
                        <tbody id="debts-list">
                            </tbody>
                    </table>
                    <div id="no-debts-message" class="empty-message" style="display: none;">
                        Aucune dette client trouvée. Utilisez le bouton "Nouvelle Dette Client" pour en ajouter une.
                    </div>
                </div>
            `;

            // Charger les données initiales des dettes
            await this.loadDebts();

        } catch (error) {
            console.error("Error loading debts page structure or initial data:", error);
            debtsPage.innerHTML = `<p class="error-message">Erreur lors du chargement de la page des dettes: ${error.message}</p>`;
        }
    },

    /**
     * Charge les dettes dans le tableau en utilisant DataManager
     */
    loadDebts: async function(searchQuery = '') {
        const debtsList = document.getElementById('debts-list');
        const noDebtsMessage = document.getElementById('no-debts-message');

        if (!debtsList || !noDebtsMessage) return;

        debtsList.innerHTML = '<tr><td colspan="7"><div class="loading-spinner-inline"></div> Chargement...</td></tr>';
        noDebtsMessage.style.display = 'none';

        try {
            // Récupérer les filtres
            const statusFilter = document.getElementById('debt-status-filter')?.value || 'all';
            const dateFilter = document.getElementById('debt-date-filter')?.value || 'all';

            // Récupération des dettes via DataManager
            let debts = await DataManager.debts.getAll(); // Use DataManager

            if (!Array.isArray(debts)) {
                console.warn("Received invalid data from DataManager.debts.getAll(), assuming empty array.");
                debts = []; // Default to empty array if data is invalid
            }

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
                    if (!debt.date) return false; // Skip debts without a date
                    const debtDate = new Date(debt.date);
                    if (isNaN(debtDate)) return false; // Skip invalid dates

                    const debtMonth = debtDate.getMonth();
                    const debtYear = debtDate.getFullYear();

                    switch (dateFilter) {
                        case 'current-month': return debtMonth === currentMonth && debtYear === currentYear;
                        case 'last-month':
                             const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                             const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                             return debtMonth === prevMonth && debtYear === prevYear;
                        case 'last-3-months':
                             const threeMonthsAgo = new Date(currentYear, currentMonth - 3, 1);
                             return debtDate >= threeMonthsAgo;
                        case 'current-year': return debtYear === currentYear;
                        default: return true;
                    }
                });
            }

            // Fetch all potentially needed employees ONCE using DataManager for filtering/display
            const employeeIdsToFetch = [...new Set(debts.map(d => d.employeeId))];
            let employeesMap = {};
            if (employeeIdsToFetch.length > 0) {
                 // In a real scenario with many employees, fetching all might be inefficient.
                 // Consider fetching only the needed IDs if DataManager supports getByIds or similar.
                 // For now, fetch all via DataManager.
                 const allEmployees = await DataManager.employees.getAll(); // Use DataManager
                 if (Array.isArray(allEmployees)) {
                     employeesMap = allEmployees.reduce((map, emp) => { map[emp.id] = emp; return map; }, {});
                 } else {
                     console.error("Failed to load employee data for debts display.");
                 }
            }

            // Appliquer le filtre de recherche (client-side using the map)
            if (searchQuery) {
                const lowerQuery = searchQuery.toLowerCase();
                debts = debts.filter(debt => {
                    const employee = employeesMap[debt.employeeId];
                    const clientName = (debt.clientName || '').toLowerCase();
                    const description = (debt.description || '').toLowerCase();
                    const employeeName = employee ? `${employee.firstName} ${employee.lastName}`.toLowerCase() : '';
                    return employeeName.includes(lowerQuery) || clientName.includes(lowerQuery) || description.includes(lowerQuery);
                });
            }

            // Trier les dettes par date (plus récentes en premier)
             if (debts.length > 0) {
                debts.sort((a, b) => (new Date(b.date) || 0) - (new Date(a.date) || 0));
             }

            // Mettre à jour les statistiques
            await this.updateDebtStats(debts);

            // Afficher le message si aucune dette après filtrage
            if (debts.length === 0) {
                debtsList.innerHTML = '';
                noDebtsMessage.textContent = 'Aucune dette client trouvée pour les filtres sélectionnés.';
                noDebtsMessage.style.display = 'block';
                return;
            }

            // Formatage des données pour l'affichage
            const settings = await DataManager.settings.get(); // Use DataManager
            const currencySymbol = settings?.currency || 'FCFA';

            // Construction du tableau using the employeeMap
            debtsList.innerHTML = debts.map(debt => {
                const employee = employeesMap[debt.employeeId];
                const employeeNameDisplay = employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu';
                const employeePositionDisplay = employee ? employee.position || '' : '';
                const avatarInitials = employee ? `${employee.firstName?.charAt(0) || ''}${employee.lastName?.charAt(0) || ''}` : '?';

                return `
                     <tr data-id="${debt.id}">
                         <td>
                             <div class="employee-name">
                                <div class="avatar"><span>${avatarInitials}</span></div>
                                <div>
                                    <div class="employee-fullname">${employeeNameDisplay}</div>
                                    <div class="employee-position">${employeePositionDisplay}</div>
                                </div>
                             </div>
                         </td>
                         <td>${debt.clientName || '-'}</td>
                         <td>${debt.date ? new Date(debt.date).toLocaleDateString('fr-FR') : '-'}</td>
                         <td>${(debt.amount || 0).toLocaleString('fr-FR')} ${currencySymbol}</td>
                         <td>${debt.description || '-'}</td>
                         <td><span class="badge ${debt.isPaid ? 'badge-success' : 'badge-warning'}">${debt.isPaid ? 'Payée' : 'Non payée'}</span></td>
                         <td>
                            <div class="table-actions">
                                <button class="action-btn edit-debt" title="Modifier" data-id="${debt.id}"><i class="fas fa-edit"></i></button>
                                <button class="action-btn delete-debt" title="Supprimer" data-id="${debt.id}"><i class="fas fa-trash"></i></button>
                                ${!debt.isPaid ? `<button class="action-btn mark-paid" title="Marquer Payée" data-id="${debt.id}"><i class="fas fa-check"></i></button>` : ''}
                            </div>
                         </td>
                     </tr>
                 `;
            }).join('');

        } catch (error) {
            console.error("Error loading debts list:", error);
            debtsList.innerHTML = ''; // Clear loading state
            noDebtsMessage.textContent = `Erreur lors du chargement: ${error.message}`;
            noDebtsMessage.style.display = 'block';
            await this.updateDebtStats([]); // Reset stats on error
        }
    },

    /**
     * Met à jour les statistiques des dettes (utilisant les données fournies ou DataManager)
     */
    updateDebtStats: async function(debts = null) {
        const totalDebtsAmount = document.getElementById('total-debts-amount');
        const paidDebtsAmount = document.getElementById('paid-debts-amount');
        const unpaidDebtsAmount = document.getElementById('unpaid-debts-amount');
        const employeesWithDebts = document.getElementById('employees-with-debts');

        if (!totalDebtsAmount || !paidDebtsAmount || !unpaidDebtsAmount || !employeesWithDebts) {
            console.warn("Debt stats elements not found.");
            return;
        }

        try {
            // Use provided debts or fetch all via DataManager if null
            let debtsData = debts;
            if (debtsData === null) {
                debtsData = await DataManager.debts.getAll(); // Use DataManager
            }

            // Ensure data is an array
            if (!Array.isArray(debtsData)) {
                 console.warn("Invalid data for updateDebtStats, expected array or null.");
                 debtsData = [];
            }

            // Calculer les statistiques
            const total = debtsData.reduce((sum, debt) => sum + (debt.amount || 0), 0);
            const paidTotal = debtsData.filter(debt => debt.isPaid).reduce((sum, debt) => sum + (debt.amount || 0), 0);
            const unpaidTotal = debtsData.filter(debt => !debt.isPaid).reduce((sum, debt) => sum + (debt.amount || 0), 0);
            const uniqueEmployees = new Set(debtsData.map(debt => debt.employeeId));

            // Formatage des données pour l'affichage
            const settings = await DataManager.settings.get(); // Use DataManager
            const currencySymbol = settings?.currency || 'FCFA';

            // Mettre à jour les éléments
            totalDebtsAmount.textContent = `${total.toLocaleString('fr-FR')} ${currencySymbol}`;
            paidDebtsAmount.textContent = `${paidTotal.toLocaleString('fr-FR')} ${currencySymbol}`;
            unpaidDebtsAmount.textContent = `${unpaidTotal.toLocaleString('fr-FR')} ${currencySymbol}`;
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
     * Affiche le modal d'ajout/modification d'une dette (utilisant DataManager)
     */
    showDebtModal: async function(debtId = null, preSelectedEmployeeId = null) {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;

        window.showLoader("Chargement du formulaire...");
        try {
            let debt = { date: new Date().toISOString().split('T')[0], clientName: '', amount: '', description: '', isPaid: false, employeeId: preSelectedEmployeeId || '' };
            let modalTitle = 'Nouvelle Dette Client';

            // Si un ID est fourni, charger la dette existante via DataManager
            if (debtId) {
                const existingDebt = await DataManager.debts.getById(debtId); // Use DataManager
                if (existingDebt) {
                    debt = { ...existingDebt, date: new Date(existingDebt.date).toISOString().split('T')[0] };
                    modalTitle = 'Modifier la Dette Client';
                } else {
                    throw new Error("Dette non trouvée.");
                }
            }

            // Récupérer la liste des employés via DataManager
            const employees = await DataManager.employees.getAll(); // Use DataManager
            if (!Array.isArray(employees)) throw new Error("Impossible de charger la liste des employés.");
            if (employees.length === 0) {
                alert('Vous devez d\'abord ajouter des employés.');
                window.hideLoader();
                return;
            }

            // Récupérer les paramètres via DataManager
            const settings = await DataManager.settings.get(); // Use DataManager
            const currencySymbol = settings?.currency || 'FCFA';

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
                                <div class="form-group"><label for="debt-amount">Montant (${currencySymbol}) *</label><input type="number" id="debt-amount" class="form-control" value="${debt.amount || ''}" min="0" step="any" required></div>
                            </div>
                            <div class="form-group"><label for="debt-description">Description</label><textarea id="debt-description" class="form-control" rows="3">${debt.description || ''}</textarea></div>
                            <div class="form-group"><div class="checkbox-wrapper"><input type="checkbox" id="debt-is-paid" ${debt.isPaid ? 'checked' : ''}><label for="debt-is-paid">Dette déjà payée</label></div></div>
                        </form>
                    </div>
                    <div class="modal-footer"><button class="btn btn-outline modal-cancel">Annuler</button><button class="btn btn-primary" id="save-debt">Enregistrer</button></div>
                </div>
            `;

            modalContainer.classList.add('active');
            this.bindModalEvents(); // Bind events for the new modal

        } catch (error) {
            console.error("Error showing debt modal:", error);
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

        // Save Debt Modal
        const saveDebtBtn = modalContainer.querySelector('#save-debt');
        const debtForm = modalContainer.querySelector('#debt-form');
        if (saveDebtBtn && debtForm) {
            saveDebtBtn.addEventListener('click', async () => {
                if (debtForm.checkValidity()) {
                    await this.saveDebt(); // Calls saveDebt function below
                } else {
                    debtForm.reportValidity();
                }
            });
        }

        // Delete Confirmation Modal
        const confirmDeleteBtn = modalContainer.querySelector('#confirm-delete');
         if (confirmDeleteBtn) {
             const debtId = confirmDeleteBtn.dataset.id; // Get ID from button
             confirmDeleteBtn.addEventListener('click', async () => {
                 if (debtId) {
                     await this.deleteDebt(debtId); // Calls deleteDebt function below
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
            modalContainer.innerHTML = ''; // Clear content after closing
        }
    },

    /**
     * Enregistre les données d'une dette via DataManager
     */
    saveDebt: async function() {
        const id = document.getElementById('debt-id').value;
        const employeeId = document.getElementById('employee-id').value;
        const clientName = document.getElementById('client-name').value.trim();
        const date = document.getElementById('debt-date').value;
        const amountStr = document.getElementById('debt-amount').value;
        const description = document.getElementById('debt-description').value.trim();
        const isPaid = document.getElementById('debt-is-paid').checked;

        // Validation
        if (!employeeId || !clientName || !date || !amountStr) {
            alert('Veuillez remplir les champs obligatoires (Employé, Client, Date, Montant).');
            return;
        }
         const amount = parseFloat(amountStr);
         if (isNaN(amount) || amount <= 0) {
             alert('Veuillez entrer un montant valide (nombre positif).');
             return;
         }

        const debtData = {
            id: id || undefined, // Let DataManager handle local ID generation if needed
            employeeId,
            clientName,
            date: new Date(date).toISOString(), // Store as ISO string
            amount,
            description: description || null,
            isPaid,
            paidDate: isPaid ? (new Date().toISOString()) : null // Set paidDate if checked now
            // updated_at will be handled by DataManager.performOperation if configured
        };

        window.showLoader("Enregistrement de la dette...");
        try {
            const saved = await DataManager.debts.save(debtData); // Use DataManager
            if (saved) {
                this.closeModal();
                await this.loadDebts(); // Reload list
                alert(`Dette ${id ? 'modifiée' : 'ajoutée'} avec succès.`);
            } else {
                 alert("Erreur lors de l'enregistrement de la dette.");
            }
        } catch (error) {
            console.error("Error saving debt:", error);
            alert(`Erreur: ${error.message}`);
        } finally {
            window.hideLoader();
        }
    },

    /**
     * Marque une dette comme payée via DataManager
     */
    markDebtAsPaid: async function(debtId) {
        window.showLoader("Mise à jour...");
        try {
            const debt = await DataManager.debts.getById(debtId); // Use DataManager
            if (!debt) throw new Error("Dette non trouvée.");

            if(debt.isPaid) {
                alert("Cette dette est déjà marquée comme payée.");
                window.hideLoader();
                return;
            }

            const updatedDebt = {
                 ...debt,
                 isPaid: true,
                 paidDate: new Date().toISOString()
                 // updated_at will be handled by DataManager.performOperation
            };

            const saved = await DataManager.debts.save(updatedDebt); // Use DataManager

            if(saved) {
                await this.loadDebts(); // Reload list
                alert("Dette marquée comme payée.");
            } else {
                 alert("Erreur lors de la mise à jour.");
            }
        } catch (error) {
            console.error("Error marking debt as paid:", error);
            alert(`Erreur: ${error.message}`);
        } finally {
            window.hideLoader();
        }
    },

    /**
     * Affiche le modal de confirmation de suppression (utilisant DataManager)
     */
    showDeleteConfirmation: async function(debtId) {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;

        window.showLoader("Chargement...");
        try {
            const debt = await DataManager.debts.getById(debtId); // Use DataManager
            if (!debt) throw new Error("Dette non trouvée.");

            const employee = await DataManager.employees.getById(debt.employeeId); // Use DataManager
            const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu';

            const settings = await DataManager.settings.get(); // Use DataManager
            const currencySymbol = settings?.currency || 'FCFA';

            modalContainer.innerHTML = `
                <div class="modal">
                    <div class="modal-header"><h3>Confirmation de Suppression</h3><button class="modal-close"><i class="fas fa-times"></i></button></div>
                    <div class="modal-body">
                        <p>Êtes-vous sûr de vouloir supprimer cette dette client ?</p>
                        <div class="confirm-details">
                             <div class="detail-row"><span class="detail-label">Employé Resp.:</span><span class="detail-value">${employeeName}</span></div>
                             <div class="detail-row"><span class="detail-label">Client:</span><span class="detail-value">${debt.clientName}</span></div>
                             <div class="detail-row"><span class="detail-label">Date:</span><span class="detail-value">${new Date(debt.date).toLocaleDateString()}</span></div>
                             <div class="detail-row"><span class="detail-label">Montant:</span><span class="detail-value">${(debt.amount||0).toLocaleString()} ${currencySymbol}</span></div>
                             <div class="detail-row"><span class="detail-label">Statut:</span><span class="detail-value">${debt.isPaid ? 'Payée' : 'Non payée'}</span></div>
                        </div>
                        <p class="text-danger mt-3">Cette action est irréversible.</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline modal-cancel">Annuler</button>
                        <button class="btn btn-danger" id="confirm-delete" data-id="${debtId}">Supprimer</button>
                    </div>
                </div>
            `;

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
     * Supprime une dette via DataManager
     */
    deleteDebt: async function(debtId) {
         if (!debtId) return;
         window.showLoader("Suppression...");
         try {
            const success = await DataManager.debts.delete(debtId); // Use DataManager
            if (success) {
                await this.loadDebts(); // Reload list
                alert("Dette supprimée avec succès.");
            } else {
                 // DataManager.delete might return false if offline and item didn't exist locally
                 // Or if remote delete failed but no error was thrown explicitly
                 console.warn(`DataManager.debts.delete reported failure for ID: ${debtId}`);
                 alert("L'opération de suppression a échoué ou l'élément n'existait pas localement.");
            }
         } catch (error) {
             console.error("Error deleting debt:", error);
             alert(`Erreur: ${error.message}`);
         } finally {
             window.hideLoader();
         }
    },

    /**
     * Attache les événements aux éléments de la page (using delegation)
     */
    bindEvents: function() {
        const pageContainer = document.getElementById('debts-page'); // Main container for this page

        // Listener for page-level actions (add button, filters, search)
        if (pageContainer) {
            pageContainer.addEventListener('click', async (event) => {
                 if (event.target.id === 'add-debt-btn' || event.target.closest('#add-debt-btn')) {
                    await this.showDebtModal();
                 }
                 // Add other page-level click actions if needed
            });

             pageContainer.addEventListener('change', async (event) => {
                if (event.target.id === 'debt-status-filter' || event.target.id === 'debt-date-filter') {
                    const searchInput = pageContainer.querySelector('#debt-search');
                    await this.loadDebts(searchInput?.value || '');
                }
             });

             pageContainer.addEventListener('input', async (event) => {
                 if (event.target.id === 'debt-search') {
                     // Optional: Add debounce/throttle here for performance
                     await this.loadDebts(event.target.value);
                 }
             });

            // Listener for actions within the table (using event delegation)
            const tableBody = pageContainer.querySelector('#debts-list');
            if(tableBody) {
                tableBody.addEventListener('click', async (event) => {
                    const editBtn = event.target.closest('.edit-debt');
                    if (editBtn) {
                        await this.showDebtModal(editBtn.dataset.id);
                        return;
                    }

                    const deleteBtn = event.target.closest('.delete-debt');
                    if (deleteBtn) {
                        await this.showDeleteConfirmation(deleteBtn.dataset.id);
                         return;
                    }

                    const markPaidBtn = event.target.closest('.mark-paid');
                    if (markPaidBtn) {
                        await this.markDebtAsPaid(markPaidBtn.dataset.id);
                         return;
                    }
                });
             }
        } // End if(pageContainer)

        // Modal events are bound dynamically within showDebtModal/showDeleteConfirmation using bindModalEvents.
    }
};

// Make the manager globally available
window.DebtsManager = DebtsManager;