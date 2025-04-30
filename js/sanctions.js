    /**
     * sanctions.js
     * Gestion des sanctions et pénalités
     * Application de Gestion des Salaires Le Sims
     * (Updated for Supabase)
     */

    const SanctionsManager = {
        /**
         * Initialisation du module de gestion des sanctions
         */
        init: async function() { // Added async
            // Render static structure first
            await this.renderSanctionsPageStructure(); // Added await
            try {
                // Load initial data
                await this.loadSanctions(); // Added await
            } catch (error) {
                console.error("Error during SanctionsManager initialization:", error);
                // Display error on the page
                 const sanctionsPage = document.getElementById('sanctions-page');
                 if(sanctionsPage) {
                    const listContainer = sanctionsPage.querySelector('#sanctions-list');
                    const noDataMessage = sanctionsPage.querySelector('#no-sanctions-message');
                    if(listContainer) listContainer.innerHTML = '';
                    if(noDataMessage) {
                        noDataMessage.textContent = "Erreur lors du chargement initial des sanctions.";
                        noDataMessage.style.display = 'block';
                    }
                 }
            }
            this.bindEvents(); // Setup event listeners
            console.log("SanctionsManager initialized.");
        },

        /**
         * Renders the static HTML structure for the sanctions page.
         */
        renderSanctionsPageStructure: async function() { // Added async
            const sanctionsPage = document.getElementById('sanctions-page');
            if (!sanctionsPage) return;

            try {
                const settings = await DB.settings.get(); // Added await
                const currencySymbol = settings?.currency || 'FCFA';

                sanctionsPage.innerHTML = `
                    <div class="page-header">
                        <h1>Gestion des Sanctions et Pénalités</h1>
                        <div class="page-actions">
                            <button id="add-sanction-btn" class="btn btn-primary">
                                <i class="fas fa-plus"></i> Nouvelle Sanction
                            </button>
                        </div>
                    </div>

                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="filters">
                                <div class="filter-group">
                                    <label for="sanction-type-filter">Type:</label>
                                    <select id="sanction-type-filter" class="form-control">
                                        <option value="all" selected>Tous les types</option>
                                        <option value="late">Retard</option>
                                        <option value="absence">Absence</option>
                                        <option value="misconduct">Faute</option>
                                        <option value="other">Autre</option>
                                    </select>
                                </div>
                                <div class="filter-group">
                                    <label for="sanction-date-filter">Période:</label>
                                    <select id="sanction-date-filter" class="form-control">
                                        <option value="all">Toutes les périodes</option>
                                        <option value="current-month" selected>Mois en cours</option>
                                        <option value="last-month">Mois précédent</option>
                                        <option value="last-3-months">3 derniers mois</option>
                                        <option value="current-year">Année en cours</option>
                                    </select>
                                </div>
                                <div class="search-box">
                                    <input type="text" id="sanction-search" placeholder="Rechercher un employé...">
                                    <i class="fas fa-search"></i>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="stats-cards mb-4">
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div>
                            <div class="stat-info"><h4>Total Sanctions</h4><h2 id="total-sanctions-amount">0 ${currencySymbol}</h2></div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-clock"></i></div>
                            <div class="stat-info"><h4>Retards</h4><h2 id="late-sanctions-amount">0 ${currencySymbol}</h2></div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-calendar-times"></i></div>
                            <div class="stat-info"><h4>Absences</h4><h2 id="absence-sanctions-amount">0 ${currencySymbol}</h2></div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-ban"></i></div>
                            <div class="stat-info"><h4>Fautes & Autres</h4><h2 id="other-sanctions-amount">0 ${currencySymbol}</h2></div>
                        </div>
                    </div>

                    <div class="table-responsive">
                        <table id="sanctions-table" class="table">
                            <thead>
                                <tr>
                                    <th>Employé</th><th>Date</th><th>Type</th><th>Montant</th><th>Raison</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="sanctions-list">
                                <tr><td colspan="6"><div class="loading-spinner-inline"></div> Chargement...</td></tr>
                            </tbody>
                        </table>
                        <div id="no-sanctions-message" class="empty-message" style="display: none;">
                            Aucune sanction trouvée. Utilisez le bouton "Nouvelle Sanction" pour en ajouter une.
                        </div>
                    </div>
                `;
            } catch (error) {
                 console.error("Error rendering sanctions page structure:", error);
                 sanctionsPage.innerHTML = `<p class="error-message">Erreur lors de la construction de la page des sanctions.</p>`;
            }
        },

        /**
         * Charge les sanctions dans le tableau
         */
        loadSanctions: async function(searchQuery = '') { // Added async
            const sanctionsList = document.getElementById('sanctions-list');
            const noSanctionsMessage = document.getElementById('no-sanctions-message');
            if (!sanctionsList || !noSanctionsMessage) return;

            sanctionsList.innerHTML = '<tr><td colspan="6"><div class="loading-spinner-inline"></div> Chargement...</td></tr>';
            noSanctionsMessage.style.display = 'none';

            try {
                const typeFilter = document.getElementById('sanction-type-filter')?.value || 'all';
                const dateFilter = document.getElementById('sanction-date-filter')?.value || 'all';

                // Récupération des sanctions (using await)
                let sanctions = await DB.sanctions.getAll();

                // ----> ADDED CHECK <----
                if (!Array.isArray(sanctions)) {
                    console.error("Failed to load sanctions or data is not an array:", sanctions);
                    throw new Error("Les données des sanctions n'ont pas pu être chargées.");
                }
                // ----> END CHECK <----

                // Appliquer le filtre de type
                if (typeFilter !== 'all') {
                    sanctions = sanctions.filter(sanction => sanction.type === typeFilter);
                }

                // Appliquer le filtre de date
                const currentDate = new Date();
                const currentMonth = currentDate.getMonth();
                const currentYear = currentDate.getFullYear();
                if (dateFilter !== 'all') {
                    sanctions = sanctions.filter(sanction => {
                        // ... (date filtering logic remains the same) ...
                        const sanctionDate = new Date(sanction.date);
                        const sanctionMonth = sanctionDate.getMonth();
                        const sanctionYear = sanctionDate.getFullYear();

                        switch (dateFilter) {
                            case 'current-month': return sanctionMonth === currentMonth && sanctionYear === currentYear;
                            case 'last-month': return (sanctionMonth === currentMonth - 1 && sanctionYear === currentYear) || (currentMonth === 0 && sanctionMonth === 11 && sanctionYear === currentYear - 1);
                            case 'last-3-months': const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(currentMonth - 3); return sanctionDate >= threeMonthsAgo;
                            case 'current-year': return sanctionYear === currentYear;
                            default: return true;
                        }
                    });
                }

                // Fetch employee data efficiently
                let employeesMap = {};
                const employeeIdsToFetch = [...new Set(sanctions.map(s => s.employeeId))];
                if (employeeIdsToFetch.length > 0) {
                    const employees = await DB.employees.getAll(); // Or fetch by IDs
                    if (Array.isArray(employees)) {
                        employeesMap = employees.reduce((map, emp) => { map[emp.id] = emp; return map; }, {});
                    } else {
                        console.error("Failed to load employee data for sanctions display.");
                    }
                }

                // Appliquer le filtre de recherche (client-side using the map)
                if (searchQuery) {
                    const lowerQuery = searchQuery.toLowerCase();
                    sanctions = sanctions.filter(sanction => {
                        const employee = employeesMap[sanction.employeeId];
                        if (!employee) return false;
                        const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
                        return fullName.includes(lowerQuery);
                    });
                }

                // Trier les sanctions par date (plus récentes en premier)
                 if (sanctions.length > 0) {
                    sanctions.sort((a, b) => new Date(b.date) - new Date(a.date));
                 }

                // Mettre à jour les statistiques
                await this.updateSanctionStats(sanctions); // Added await

                // Afficher le message si aucune sanction après filtrage
                if (sanctions.length === 0) {
                    sanctionsList.innerHTML = '';
                    noSanctionsMessage.textContent = 'Aucune sanction trouvée pour les filtres sélectionnés.';
                    noSanctionsMessage.style.display = 'block';
                    return;
                }

                // Formatage des données pour l'affichage
                const settings = await DB.settings.get(); // Added await
                const currencySymbol = settings?.currency || 'FCFA';

                // Construction du tableau using the employeeMap
                sanctionsList.innerHTML = sanctions.map(sanction => {
                    const employee = employeesMap[sanction.employeeId];
                    if (!employee) return ''; // Skip if employee data wasn't found

                    return `
                        <tr data-id="${sanction.id}">
                            <td>
                                <div class="employee-name">
                                    <div class="avatar"><span>${employee.firstName?.charAt(0) || ''}${employee.lastName?.charAt(0) || ''}</span></div>
                                    <div><div class="employee-fullname">${employee.firstName || ''} ${employee.lastName || ''}</div><div class="employee-position">${employee.position || ''}</div></div>
                                </div>
                            </td>
                            <td>${new Date(sanction.date).toLocaleDateString('fr-FR')}</td>
                            <td>${this.getSanctionTypeName(sanction.type)}</td>
                            <td>${(sanction.amount || 0).toLocaleString('fr-FR')} ${currencySymbol}</td>
                            <td>${sanction.reason || '-'}</td>
                            <td>
                                <div class="table-actions">
                                    <button class="action-btn edit-sanction" title="Modifier" data-id="${sanction.id}"><i class="fas fa-edit"></i></button>
                                    <button class="action-btn delete-sanction" title="Supprimer" data-id="${sanction.id}"><i class="fas fa-trash"></i></button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');

            } catch (error) {
                console.error("Error loading sanctions list:", error);
                sanctionsList.innerHTML = ''; // Clear loading state
                noSanctionsMessage.textContent = `Erreur: ${error.message}`;
                noSanctionsMessage.style.display = 'block';
                await this.updateSanctionStats([]); // Reset stats on error
            }
        },

        /**
         * Met à jour les statistiques des sanctions
         */
        updateSanctionStats: async function(sanctions = null) { // Added async
            const totalSanctionsAmount = document.getElementById('total-sanctions-amount');
            const lateSanctionsAmount = document.getElementById('late-sanctions-amount');
            const absenceSanctionsAmount = document.getElementById('absence-sanctions-amount');
            const otherSanctionsAmount = document.getElementById('other-sanctions-amount');

            if (!totalSanctionsAmount || !lateSanctionsAmount || !absenceSanctionsAmount || !otherSanctionsAmount) {
                 console.warn("Sanction stats elements not found.");
                 return;
            }

            try {
                // Use provided sanctions or fetch all if null
                if (sanctions === null) {
                    sanctions = await DB.sanctions.getAll(); // Added await
                    if (!Array.isArray(sanctions)) {
                        console.error("Failed to load sanctions for stats");
                        throw new Error("Données sanctions invalides");
                    }
                }
                 // Ensure sanctions is an array even if passed
                 if (!Array.isArray(sanctions)) {
                     console.warn("Invalid data passed to updateSanctionStats, expected array.");
                     sanctions = [];
                 }


                // Calculer les statistiques
                const total = sanctions.reduce((sum, sanction) => sum + (sanction.amount || 0), 0);
                const lateTotal = sanctions.filter(s => s.type === 'late').reduce((sum, s) => sum + (s.amount || 0), 0);
                const absenceTotal = sanctions.filter(s => s.type === 'absence').reduce((sum, s) => sum + (s.amount || 0), 0);
                const otherTotal = sanctions.filter(s => !['late', 'absence'].includes(s.type)).reduce((sum, s) => sum + (s.amount || 0), 0);

                // Formatage des données pour l'affichage
                const settings = await DB.settings.get(); // Added await
                const currencySymbol = settings?.currency || 'FCFA';

                // Mettre à jour les éléments
                totalSanctionsAmount.textContent = `${total.toLocaleString('fr-FR')} ${currencySymbol}`;
                lateSanctionsAmount.textContent = `${lateTotal.toLocaleString('fr-FR')} ${currencySymbol}`;
                absenceSanctionsAmount.textContent = `${absenceTotal.toLocaleString('fr-FR')} ${currencySymbol}`;
                otherSanctionsAmount.textContent = `${otherTotal.toLocaleString('fr-FR')} ${currencySymbol}`;

            } catch (error) {
                 console.error("Error updating sanction stats:", error);
                 // Reset stats on error
                 totalSanctionsAmount.textContent = `Erreur`;
                 lateSanctionsAmount.textContent = `Erreur`;
                 absenceSanctionsAmount.textContent = `Erreur`;
                 otherSanctionsAmount.textContent = `Erreur`;
            }
        },

        /**
         * Affiche le modal d'ajout/modification d'une sanction
         */
        showSanctionModal: async function(sanctionId = null, preSelectedEmployeeId = null) { // Added async
            const modalContainer = document.getElementById('modal-container');
            if (!modalContainer) return;

            window.showLoader("Chargement du formulaire...");
            try {
                let sanction = { date: new Date().toISOString().split('T')[0], type: 'late', amount: '', reason: '', employeeId: preSelectedEmployeeId || '' };
                let modalTitle = 'Nouvelle Sanction';

                // Si un ID est fourni, fetch data for modification
                if (sanctionId) {
                    const existingSanction = await DB.sanctions.getById(sanctionId); // Added await
                    if (existingSanction) {
                        sanction = { ...existingSanction, date: new Date(existingSanction.date).toISOString().split('T')[0] };
                        modalTitle = 'Modifier la Sanction';
                    } else {
                        throw new Error("Sanction non trouvée.");
                    }
                }

                // Récupérer la liste des employés
                const employees = await DB.employees.getAll(); // Added await
                if (!Array.isArray(employees)) throw new Error("Impossible de charger la liste des employés.");
                if (employees.length === 0) {
                    alert('Vous devez d\'abord ajouter des employés.');
                    window.hideLoader();
                    return;
                }

                // Récupérer les paramètres
                const settings = await DB.settings.get(); // Added await
                const currencySymbol = settings?.currency || 'FCFA';

                // Construction du modal
                modalContainer.innerHTML = `
                    <div class="modal">
                        <div class="modal-header"><h3>${modalTitle}</h3><button class="modal-close"><i class="fas fa-times"></i></button></div>
                        <div class="modal-body">
                            <form id="sanction-form">
                                <input type="hidden" id="sanction-id" value="${sanction.id || ''}">
                                <div class="form-group">
                                    <label for="employee-id">Employé *</label>
                                    <select id="employee-id" class="form-control" required ${sanctionId ? 'disabled' : ''}>
                                        <option value="">Sélectionnez un employé</option>
                                        ${employees.map(emp => `<option value="${emp.id}" ${sanction.employeeId === emp.id ? 'selected' : ''}>${emp.firstName} ${emp.lastName} - ${emp.position || 'Sans poste'}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-grid">
                                    <div class="form-group"><label for="sanction-date">Date *</label><input type="date" id="sanction-date" class="form-control" value="${sanction.date}" required></div>
                                    <div class="form-group">
                                        <label for="sanction-type">Type *</label>
                                        <select id="sanction-type" class="form-control" required>
                                            <option value="late" ${sanction.type === 'late' ? 'selected' : ''}>Retard</option>
                                            <option value="absence" ${sanction.type === 'absence' ? 'selected' : ''}>Absence</option>
                                            <option value="misconduct" ${sanction.type === 'misconduct' ? 'selected' : ''}>Faute</option>
                                            <option value="other" ${sanction.type === 'other' ? 'selected' : ''}>Autre</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group"><label for="sanction-amount">Montant (${currencySymbol}) *</label><input type="number" id="sanction-amount" class="form-control" value="${sanction.amount || ''}" min="0" step="any" required></div>
                                <div class="form-group"><label for="sanction-reason">Raison</label><textarea id="sanction-reason" class="form-control" rows="3">${sanction.reason || ''}</textarea></div>
                            </form>
                        </div>
                        <div class="modal-footer"><button class="btn btn-outline modal-cancel">Annuler</button><button class="btn btn-primary" id="save-sanction">Enregistrer</button></div>
                    </div>`;

                modalContainer.classList.add('active');
                this.bindModalEvents(); // Bind events for the new modal

            } catch (error) {
                console.error("Error showing sanction modal:", error);
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

            // Save Sanction Modal
            const saveSanctionBtn = modalContainer.querySelector('#save-sanction');
            const sanctionForm = modalContainer.querySelector('#sanction-form');
            if (saveSanctionBtn && sanctionForm) {
                saveSanctionBtn.addEventListener('click', async () => { // Added async
                    if (sanctionForm.checkValidity()) {
                        await this.saveSanction(); // Added await
                    } else {
                        sanctionForm.reportValidity();
                    }
                });
                 // Add suggestion logic if needed (removed from original for simplicity)
                 /*
                 const typeSelect = sanctionForm.querySelector('#sanction-type');
                 const amountInput = sanctionForm.querySelector('#sanction-amount');
                 if(typeSelect && amountInput) {
                     typeSelect.addEventListener('change', () => { ... });
                 }
                 */
            }

            // Delete Confirmation Modal
            const confirmDeleteBtn = modalContainer.querySelector('#confirm-delete');
             if (confirmDeleteBtn) {
                 const sanctionId = confirmDeleteBtn.dataset.id; // Get ID from button
                 confirmDeleteBtn.addEventListener('click', async () => { // Added async
                     if (sanctionId) {
                         await this.deleteSanction(sanctionId); // Added await
                     }
                     this.closeModal();
                 });
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
         * Enregistre les données d'une sanction
         */
        saveSanction: async function() { // Added async
            const id = document.getElementById('sanction-id').value;
            const employeeId = document.getElementById('employee-id').value;
            const date = document.getElementById('sanction-date').value;
            const type = document.getElementById('sanction-type').value;
            const amountStr = document.getElementById('sanction-amount').value;
            const reason = document.getElementById('sanction-reason').value.trim();

            // Validation
            if (!employeeId || !date || !type || !amountStr) {
                alert('Veuillez remplir les champs obligatoires (Employé, Date, Type, Montant).');
                return;
            }
             const amount = parseFloat(amountStr);
             if (isNaN(amount) || amount < 0) { // Allow 0 amount sanction? Changed to < 0
                 alert('Veuillez entrer un montant valide (nombre positif ou zéro).');
                 return;
             }

            // Create data object (camelCase for DB function)
            const sanctionData = {
                id: id || undefined,
                employeeId,
                date: new Date(date).toISOString(),
                type,
                amount,
                reason: reason || null
            };

            window.showLoader("Enregistrement de la sanction...");
            try {
                const saved = await DB.sanctions.save(sanctionData); // Added await
                if (saved) {
                    this.closeModal();
                    await this.loadSanctions(); // Added await
                    alert(`Sanction ${id ? 'modifiée' : 'ajoutée'} avec succès.`);
                } else {
                     alert("Erreur lors de l'enregistrement de la sanction.");
                }
            } catch (error) {
                console.error("Error saving sanction:", error);
                alert(`Erreur: ${error.message}`);
            } finally {
                window.hideLoader();
            }
        },

        /**
         * Affiche le modal de confirmation de suppression
         */
        showDeleteConfirmation: async function(sanctionId) { // Added async
            const modalContainer = document.getElementById('modal-container');
            if (!modalContainer) return;

            window.showLoader("Chargement...");
            try {
                const sanction = await DB.sanctions.getById(sanctionId); // Added await
                if (!sanction) throw new Error("Sanction non trouvée.");

                const employee = await DB.employees.getById(sanction.employeeId); // Added await
                const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu';

                const settings = await DB.settings.get(); // Added await
                const currencySymbol = settings?.currency || 'FCFA';

                modalContainer.innerHTML = `
                    <div class="modal">
                        <div class="modal-header"><h3>Confirmation de Suppression</h3><button class="modal-close"><i class="fas fa-times"></i></button></div>
                        <div class="modal-body">
                            <p>Êtes-vous sûr de vouloir supprimer cette sanction ?</p>
                            <div class="confirm-details">
                                <div class="detail-row"><span class="detail-label">Employé:</span><span class="detail-value">${employeeName}</span></div>
                                <div class="detail-row"><span class="detail-label">Date:</span><span class="detail-value">${new Date(sanction.date).toLocaleDateString()}</span></div>
                                <div class="detail-row"><span class="detail-label">Type:</span><span class="detail-value">${this.getSanctionTypeName(sanction.type)}</span></div>
                                <div class="detail-row"><span class="detail-label">Montant:</span><span class="detail-value">${(sanction.amount||0).toLocaleString()} ${currencySymbol}</span></div>
                            </div>
                            <p class="text-danger mt-3">Cette action est irréversible.</p>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-outline modal-cancel">Annuler</button>
                            <button class="btn btn-danger" id="confirm-delete" data-id="${sanctionId}">Supprimer</button>
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
         * Supprime une sanction
         */
        deleteSanction: async function(sanctionId) { // Added async
            if (!sanctionId) return;
            window.showLoader("Suppression...");
            try {
                const success = await DB.sanctions.delete(sanctionId); // Added await
                if (success) {
                    await this.loadSanctions(); // Added await
                    alert("Sanction supprimée avec succès.");
                } else {
                     alert("Erreur lors de la suppression de la sanction.");
                }
            } catch (error) {
                console.error("Error deleting sanction:", error);
                alert(`Erreur: ${error.message}`);
            } finally {
                window.hideLoader();
            }
        },

        /**
         * Obtient le nom du type de sanction
         */
        getSanctionTypeName: function(type) {
            // ... (no changes needed here) ...
              switch (type) {
                 case 'late': return 'Retard';
                 case 'absence': return 'Absence';
                 case 'misconduct': return 'Faute';
                 case 'other': return 'Autre';
                 default: return type || 'Inconnu';
             }
        },

        /**
         * Attache les événements aux éléments de la page (using delegation)
         */
        bindEvents: function() {
            const pageContainer = document.getElementById('sanctions-page'); // More specific container

            if (pageContainer) {
                 pageContainer.addEventListener('click', async (event) => { // Added async
                    if (event.target.id === 'add-sanction-btn' || event.target.closest('#add-sanction-btn')) {
                        await this.showSanctionModal(); // Added await
                    }
                 });

                 pageContainer.addEventListener('change', async (event) => { // Added async
                    if (event.target.id === 'sanction-type-filter' || event.target.id === 'sanction-date-filter') {
                        const searchInput = pageContainer.querySelector('#sanction-search');
                        await this.loadSanctions(searchInput?.value || ''); // Added await
                    }
                 });

                 pageContainer.addEventListener('input', async (event) => { // Added async
                     if (event.target.id === 'sanction-search') {
                         await this.loadSanctions(event.target.value); // Added await
                     }
                 });

                 // Table actions delegation
                 const tableBody = pageContainer.querySelector('#sanctions-list');
                 if (tableBody) {
                     tableBody.addEventListener('click', async (event) => { // Added async
                         const editBtn = event.target.closest('.edit-sanction');
                         if (editBtn) { await this.showSanctionModal(editBtn.dataset.id); return; } // Added await

                         const deleteBtn = event.target.closest('.delete-sanction');
                         if (deleteBtn) { await this.showDeleteConfirmation(deleteBtn.dataset.id); return; } // Added await
                     });
                 }
            }

             // Modal events are bound dynamically using bindModalEvents
        }
    };

    window.SanctionsManager = SanctionsManager;