/**
 * database-supabase.js
 * Gestion du stockage des données avec Supabase
 * Application de Gestion des Salaires Le Sims
 * (Updated with Authentication, connection optimization, and error handling)
 */

// --- Configuration ---
const SUPABASE_URL = 'https://efdceibleelherxenduc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZGNlaWJsZWVsaGVyeGVuZHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NzUwNTYsImV4cCI6MjA2MTU1MTA1Nn0.b-hM2oxl99d8KMXLfp-6gA3qGBfeiIeGS3aYYrXbieI';

// --- Module State ---
let supabaseClient = null;
let isSupabaseInitialized = false;
let initializationPromise = null;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 5;
const INIT_RETRY_DELAY = 1000;

// --- START: NEW AUTHENTICATION STATE ---
let onAuthStateChangeCallback = null;
// --- END: NEW AUTHENTICATION STATE ---


// --- Function to check if Supabase is available ---
function isSupabaseAvailable() {
    return typeof window !== 'undefined' && 
           typeof window.supabase !== 'undefined' && 
           typeof window.supabase.createClient === 'function';
}

// --- Wait for Supabase to be available ---
function waitForSupabase(maxWaitTime = 10000, checkInterval = 200) {
    return new Promise((resolve, reject) => {
        if (isSupabaseAvailable()) {
            resolve(true);
            return;
        }
        
        const startTime = Date.now();
        const intervalId = setInterval(() => {
            if (isSupabaseAvailable()) {
                clearInterval(intervalId);
                resolve(true);
                return;
            }
            
            if (Date.now() - startTime > maxWaitTime) {
                clearInterval(intervalId);
                reject(new Error("Supabase library not loaded after waiting period"));
                return;
            }
        }, checkInterval);
    });
}

// --- Initialize Supabase Client Function ---
async function initializeSupabase() {
    if (isSupabaseInitialized && supabaseClient) {
        return supabaseClient;
    }
    
    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = new Promise(async (resolve, reject) => {
        console.log(`Attempting Supabase initialization (attempt ${initializationAttempts + 1}/${MAX_INIT_ATTEMPTS})...`);
        
        try {
            await waitForSupabase();
            
            if (!SUPABASE_URL || !SUPABASE_ANON_KEY || 
                SUPABASE_URL.includes('YOUR_SUPABASE_URL') || 
                SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY')) {
                throw new Error("Supabase URL or Anon Key is missing or not replaced. Please update database-supabase.js");
            }

            // Create the client with optimized configuration
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: false
                },
                db: { schema: 'public' },
                global: { headers: { 'x-client-info': 'lesims-app' } },
                realtime: { params: { eventsPerSecond: 2 } }
            });

            if (supabaseClient) {
                console.log('Supabase client created successfully.');

                // --- START: NEW AUTH LOGIC INTEGRATION ---
                // This listener will notify the app (via DB.onAuthStateChange) whenever the user logs in or out.
                supabaseClient.auth.onAuthStateChange((event, session) => {
                    console.log(`Supabase Auth Event: ${event}`);
                    DB.currentUser = session ? session.user : null;
                    if (onAuthStateChangeCallback) {
                        onAuthStateChangeCallback(DB.currentUser);
                    }
                });

                // Check for an existing session right after initialization
                const { data: { session } } = await supabaseClient.auth.getSession();
                DB.currentUser = session ? session.user : null;
                console.log("Initial Supabase session checked. User:", DB.currentUser ? DB.currentUser.email : "none");
                // --- END: NEW AUTH LOGIC INTEGRATION ---

                isSupabaseInitialized = true;
                initializationAttempts = 0;
                resolve(supabaseClient);

            } else {
                throw new Error("supabase.createClient returned null or undefined.");
            }
        } catch (error) {
            initializationAttempts++;
            console.error(`Error during Supabase initialization (attempt ${initializationAttempts}):`, error);
            
            if (initializationAttempts < MAX_INIT_ATTEMPTS) {
                initializationPromise = null;
                console.log(`Retrying in ${INIT_RETRY_DELAY}ms...`);
                setTimeout(() => {
                    initializeSupabase().then(resolve).catch(reject);
                }, INIT_RETRY_DELAY);
            } else {
                console.error(`Failed to initialize Supabase after ${MAX_INIT_ATTEMPTS} attempts.`);
                initializationPromise = null;
                reject(error);
            }
        }
    });

    return initializationPromise;
}

// --- Helper function for enhanced error handling ---
const handleSupabaseError = (error, context) => {
    console.error(`Supabase error in ${context}:`, error?.message || error);
    // Add specific checks if needed
    if (error?.code === '42501') {
        console.error('Permission denied. Check RLS policies and user authentication status.');
    }
    return null;
};

// --- Global DB Object (Supabase Implementation) ---
const DB = {
    _ensureInitialized: async () => {
        if (!isSupabaseInitialized) {
            return await initializeSupabase();
        }
        return supabaseClient;
    },

    isInitialized: () => isSupabaseInitialized,

    // --- START: NEW AUTHENTICATION METHODS ---
    currentUser: null,

    signIn: async function(email, password) {
        try {
            const client = await this._ensureInitialized();
            const { data, error } = await client.auth.signInWithPassword({ email, password });
            if (error) throw error;
            // The onAuthStateChange listener will handle updating DB.currentUser
            return data.user;
        } catch (error) {
            console.error("Error signing in:", error.message);
            return null;
        }
    },

    signOut: async function() {
        try {
            const client = await this._ensureInitialized();
            const { error } = await client.auth.signOut();
            if (error) throw error;
            // The onAuthStateChange listener will handle updating DB.currentUser to null
            return true;
        } catch (error) {
            console.error("Error signing out:", error.message);
            return false;
        }
    },
    
    onAuthStateChange: function(callback) {
        onAuthStateChangeCallback = callback;
        // If Supabase is already initialized, call the callback immediately with the current user state
        if (isSupabaseInitialized) {
            callback(this.currentUser);
        }
    },
    // --- END: NEW AUTHENTICATION METHODS ---

    /**
     * Méthodes CRUD pour les employés
     */
    employees: {
        getAll: async function() {
            try {
                const client = await DB._ensureInitialized();
                const { data, error } = await client.from('employees').select('*').order('last_name').order('first_name');
                if (error) return handleSupabaseError(error, "employees.getAll");
                return DB.utils.snakeToCamelArray(data || []);
            } catch (error) { return handleSupabaseError(error, "employees.getAll"); }
        },
        getById: async function(id) {
             try {
                const client = await DB._ensureInitialized();
                if (!id) return null;
                const { data, error } = await client.from('employees').select('*').eq('id', id).single();
                if (error) { if (error.code === 'PGRST116') return null; return handleSupabaseError(error, `employees.getById(${id})`); }
                return DB.utils.snakeToCamel(data);
             } catch (error) { return handleSupabaseError(error, `employees.getById(${id})`); }
        },
        save: async function(employeeData) {
             try {
                const client = await DB._ensureInitialized();
                const dataToSave = {
                    first_name: employeeData.firstName, last_name: employeeData.lastName,
                    employee_id: employeeData.employeeId || null, position: employeeData.position || null,
                    email: employeeData.email || null, phone: employeeData.phone || null,
                    base_salary: employeeData.baseSalary, hire_date: employeeData.hireDate || null,
                    address: employeeData.address || null, notes: employeeData.notes || null,
                 };
                let resultData, error;
                if (employeeData.id) {
                    const response = await client.from('employees').update(dataToSave).eq('id', employeeData.id).select().single();
                    resultData = response.data; error = response.error;
                    if (error) return handleSupabaseError(error, `employees.update(${employeeData.id})`);
                } else {
                    const response = await client.from('employees').insert(dataToSave).select().single();
                    resultData = response.data; error = response.error;
                    if (error) return handleSupabaseError(error, "employees.insert");
                }
                return DB.utils.snakeToCamel(resultData);
             } catch (error) { return handleSupabaseError(error, "employees.save"); }
        },
        delete: async function(id) {
             try {
                const client = await DB._ensureInitialized();
                if (!id) return false;
                const { error } = await client.from('employees').delete().eq('id', id);
                if (error) { handleSupabaseError(error, `employees.delete(${id})`); return false; }
                return true;
             } catch (error) { handleSupabaseError(error, `employees.delete(${id})`); return false; }
        },
    },

    salaries: {
        getAll: async function() {
             try { const client = await DB._ensureInitialized(); const { data, error } = await client.from('salaries').select('*').order('payment_date', { ascending: false }); if (error) return handleSupabaseError(error, "salaries.getAll"); return DB.utils.snakeToCamelArray(data || []); } catch (error) { return handleSupabaseError(error, "salaries.getAll"); }
        },
        getById: async function(id) {
             try { const client = await DB._ensureInitialized(); if (!id) return null; const { data, error } = await client.from('salaries').select('*').eq('id', id).single(); if (error) { if (error.code === 'PGRST116') return null; return handleSupabaseError(error, `salaries.getById(${id})`); } return DB.utils.snakeToCamel(data); } catch (error) { return handleSupabaseError(error, `salaries.getById(${id})`); }
        },
        getByEmployeeId: async function(employeeId) {
             try { const client = await DB._ensureInitialized(); if (!employeeId) return []; const { data, error } = await client.from('salaries').select('*').eq('employee_id', employeeId).order('payment_date', { ascending: false }); if (error) return handleSupabaseError(error, `salaries.getByEmployeeId(${employeeId})`); return DB.utils.snakeToCamelArray(data || []); } catch (error) { return handleSupabaseError(error, `salaries.getByEmployeeId(${employeeId})`); }
        },
        getByMonth: async function(year, month) {
             try { const client = await DB._ensureInitialized(); const startDate = new Date(year, month, 1); const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999); const { data, error } = await client.from('salaries').select('*').gte('payment_date', startDate.toISOString()).lte('payment_date', endDate.toISOString()); if (error) return handleSupabaseError(error, `salaries.getByMonth(${year}-${month})`); return DB.utils.snakeToCamelArray(data || []); } catch (error) { return handleSupabaseError(error, `salaries.getByMonth(${year}-${month})`); }
        },
        save: async function(salaryData) {
             try { const client = await DB._ensureInitialized(); const dataToSave = {
                employee_id: salaryData.employeeId, payment_date: salaryData.paymentDate,
                period_start_date: salaryData.period?.startDate, period_end_date: salaryData.period?.endDate,
                base_salary: salaryData.baseSalary, advances: salaryData.advances, sanctions: salaryData.sanctions,
                debts: salaryData.debts, net_salary: salaryData.netSalary, is_paid: salaryData.isPaid,
                paid_date: salaryData.paidDate || null, payment_method: salaryData.paymentMethod || null,
                notes: salaryData.notes || null, details: salaryData.details || null
             }; let resultData, error; if (salaryData.id) { const response = await client.from('salaries').update(dataToSave).eq('id', salaryData.id).select().single(); resultData = response.data; error = response.error; if (error) return handleSupabaseError(error, `salaries.update(${salaryData.id})`); } else { const response = await client.from('salaries').insert(dataToSave).select().single(); resultData = response.data; error = response.error; if (error) return handleSupabaseError(error, "salaries.insert"); } return DB.utils.snakeToCamel(resultData); } catch (error) { return handleSupabaseError(error, "salaries.save"); }
        },
        delete: async function(id) {
             try { const client = await DB._ensureInitialized(); if (!id) return false; const { error } = await client.from('salaries').delete().eq('id', id); if (error) { handleSupabaseError(error, `salaries.delete(${id})`); return false; } return true; } catch (error) { handleSupabaseError(error, `salaries.delete(${id})`); return false; }
        }
    },
    advances: {
         getAll: async function() { try { const c=await DB._ensureInitialized(); const {d,e}=await c.from('advances').select('*').order('date',{ascending:false}); if(e)return handleSupabaseError(e,"advances.getAll"); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,"advances.getAll");} },
         getById: async function(id) { try { const c=await DB._ensureInitialized(); if(!id)return null; const {d,e}=await c.from('advances').select('*').eq('id',id).single(); if(e){if(e.code==='PGRST116')return null; return handleSupabaseError(e,`advances.getById(${id})`);} return DB.utils.snakeToCamel(d); } catch(e){return handleSupabaseError(e,`advances.getById(${id})`);} },
         getByEmployeeId: async function(eid) { try { const c=await DB._ensureInitialized(); if(!eid)return[]; const {d,e}=await c.from('advances').select('*').eq('employee_id',eid).order('date',{ascending:false}); if(e)return handleSupabaseError(e,`advances.getByEmployeeId(${eid})`); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,`advances.getByEmployeeId(${eid})`);} },
         getUnpaidByEmployeeId: async function(eid) { try { const c=await DB._ensureInitialized(); if(!eid)return[]; const {d,e}=await c.from('advances').select('*').eq('employee_id',eid).eq('is_paid',false).order('date',{ascending:false}); if(e)return handleSupabaseError(e,`advances.getUnpaidByEmployeeId(${eid})`); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,`advances.getUnpaidByEmployeeId(${eid})`);} },
         getTotalUnpaidByEmployeeId: async function(eid) { try { const c=await DB._ensureInitialized(); if(!eid)return 0; const {d,e}=await c.from('advances').select('amount').eq('employee_id',eid).eq('is_paid',false); if(e){handleSupabaseError(e,`advances.getTotalUnpaidByEmployeeId(${eid})`); return 0;} return(d||[]).reduce((s,r)=>s+(r.amount||0),0); } catch(e){handleSupabaseError(e,`advances.getTotalUnpaidByEmployeeId(${eid})`); return 0;} },
         save: async function(aData) { try { const c=await DB._ensureInitialized(); const dts={employee_id:aData.employeeId,date:aData.date,amount:aData.amount,reason:aData.reason||null,is_paid:aData.isPaid,paid_date:aData.paidDate||null}; let rd,err; if(aData.id){const r=await c.from('advances').update(dts).eq('id',aData.id).select().single(); rd=r.data; err=r.error; if(err)return handleSupabaseError(err,`advances.update(${aData.id})`);}else{const r=await c.from('advances').insert(dts).select().single(); rd=r.data; err=r.error; if(err)return handleSupabaseError(err,"advances.insert");} return DB.utils.snakeToCamel(rd); } catch(e){return handleSupabaseError(e,"advances.save");} },
         delete: async function(id) { try { const c=await DB._ensureInitialized(); if(!id)return false; const {e}=await c.from('advances').delete().eq('id',id); if(e){handleSupabaseError(e,`advances.delete(${id})`); return false;} return true; } catch(e){handleSupabaseError(e,`advances.delete(${id})`); return false;} }
    },
    sanctions: {
         getAll: async function() { try { const c=await DB._ensureInitialized(); const {d,e}=await c.from('sanctions').select('*').order('date',{ascending:false}); if(e)return handleSupabaseError(e,"sanctions.getAll"); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,"sanctions.getAll");} },
         getById: async function(id) { try { const c=await DB._ensureInitialized(); if(!id)return null; const {d,e}=await c.from('sanctions').select('*').eq('id',id).single(); if(e){if(e.code==='PGRST116')return null; return handleSupabaseError(e,`sanctions.getById(${id})`);} return DB.utils.snakeToCamel(d); } catch(e){return handleSupabaseError(e,`sanctions.getById(${id})`);} },
         getByEmployeeId: async function(eid) { try { const c=await DB._ensureInitialized(); if(!eid)return[]; const {d,e}=await c.from('sanctions').select('*').eq('employee_id',eid).order('date',{ascending:false}); if(e)return handleSupabaseError(e,`sanctions.getByEmployeeId(${eid})`); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,`sanctions.getByEmployeeId(${eid})`);} },
         getByMonth: async function(y,m) { try { const c=await DB._ensureInitialized(); const sd=new Date(y,m,1); const ed=new Date(y,m+1,0,23,59,59,999); const {d,e}=await c.from('sanctions').select('*').gte('date',sd.toISOString()).lte('date',ed.toISOString()); if(e)return handleSupabaseError(e,`sanctions.getByMonth(${y}-${m})`); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,`sanctions.getByMonth(${y}-${m})`);} },
         save: async function(sData) { try { const c=await DB._ensureInitialized(); const dts={employee_id:sData.employeeId,date:sData.date,type:sData.type,amount:sData.amount,reason:sData.reason||null}; let rd,err; if(sData.id){const r=await c.from('sanctions').update(dts).eq('id',sData.id).select().single(); rd=r.data; err=r.error; if(err)return handleSupabaseError(err,`sanctions.update(${sData.id})`);}else{const r=await c.from('sanctions').insert(dts).select().single(); rd=r.data; err=r.error; if(err)return handleSupabaseError(err,"sanctions.insert");} return DB.utils.snakeToCamel(rd); } catch(e){return handleSupabaseError(e,"sanctions.save");} },
         delete: async function(id) { try { const c=await DB._ensureInitialized(); if(!id)return false; const {e}=await c.from('sanctions').delete().eq('id',id); if(e){handleSupabaseError(e,`sanctions.delete(${id})`); return false;} return true; } catch(e){handleSupabaseError(e,`sanctions.delete(${id})`); return false;} }
    },
    debts: {
         getAll: async function() { try { const c=await DB._ensureInitialized(); const {d,e}=await c.from('debts').select('*').order('date',{ascending:false}); if(e)return handleSupabaseError(e,"debts.getAll"); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,"debts.getAll");} },
         getById: async function(id) { try { const c=await DB._ensureInitialized(); if(!id)return null; const {d,e}=await c.from('debts').select('*').eq('id',id).single(); if(e){if(e.code==='PGRST116')return null; return handleSupabaseError(e,`debts.getById(${id})`);} return DB.utils.snakeToCamel(d); } catch(e){return handleSupabaseError(e,`debts.getById(${id})`);} },
         getByEmployeeId: async function(eid) { try { const c=await DB._ensureInitialized(); if(!eid)return[]; const {d,e}=await c.from('debts').select('*').eq('employee_id',eid).order('date',{ascending:false}); if(e)return handleSupabaseError(e,`debts.getByEmployeeId(${eid})`); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,`debts.getByEmployeeId(${eid})`);} },
         getUnpaidByEmployeeId: async function(eid) { try { const c=await DB._ensureInitialized(); if(!eid)return[]; const {d,e}=await c.from('debts').select('*').eq('employee_id',eid).eq('is_paid',false).order('date',{ascending:false}); if(e)return handleSupabaseError(e,`debts.getUnpaidByEmployeeId(${eid})`); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,`debts.getUnpaidByEmployeeId(${eid})`);} },
         getTotalUnpaidByEmployeeId: async function(eid) { try { const c=await DB._ensureInitialized(); if(!eid)return 0; const {d,e}=await c.from('debts').select('amount').eq('employee_id',eid).eq('is_paid',false); if(e){handleSupabaseError(e,`debts.getTotalUnpaidByEmployeeId(${eid})`); return 0;} return(d||[]).reduce((s,r)=>s+(r.amount||0),0); } catch(e){handleSupabaseError(e,`debts.getTotalUnpaidByEmployeeId(${eid})`); return 0;} },
         save: async function(dData) { try { const c=await DB._ensureInitialized(); const dts={employee_id:dData.employeeId,client_name:dData.clientName,date:dData.date,amount:dData.amount,description:dData.description||null,is_paid:dData.isPaid,paid_date:dData.paidDate||null}; let rd,err; if(dData.id){const r=await c.from('debts').update(dts).eq('id',dData.id).select().single(); rd=r.data; err=r.error; if(err)return handleSupabaseError(err,`debts.update(${dData.id})`);}else{const r=await c.from('debts').insert(dts).select().single(); rd=r.data; err=r.error; if(err)return handleSupabaseError(err,"debts.insert");} return DB.utils.snakeToCamel(rd); } catch(e){return handleSupabaseError(e,"debts.save");} },
         delete: async function(id) { try { const c=await DB._ensureInitialized(); if(!id)return false; const {e}=await c.from('debts').delete().eq('id',id); if(e){handleSupabaseError(e,`debts.delete(${id})`); return false;} return true; } catch(e){handleSupabaseError(e,`debts.delete(${id})`); return false;} }
    },
    settings: {
        get: async function() {
             try {
                const client = await DB._ensureInitialized();
                const { data, error } = await client.from('settings').select('*').eq('id', true).single();
                if (error) {
                    if (error.code === 'PGRST116') {
                         console.warn("Settings row not found, returning default structure.");
                         return { companyName: 'Le Sims', currency: 'FCFA', workingDays: 26, language: 'fr', dateFormat: 'DD/MM/YYYY', theme: 'dark' };
                    }
                    return handleSupabaseError(error, "settings.get");
                }
                return DB.utils.snakeToCamel(data);
             } catch (error) { return handleSupabaseError(error, "settings.get"); }
        },
        save: async function(settingsData) {
             try {
                const client = await DB._ensureInitialized();
                const dataToSave = {
                    company_name: settingsData.companyName, currency: settingsData.currency,
                    working_days: settingsData.workingDays, language: settingsData.language,
                    date_format: settingsData.dateFormat, theme: settingsData.theme
                 };
                const { data, error } = await client.from('settings').update(dataToSave).eq('id', true).select().single();
                if (error) return handleSupabaseError(error, "settings.save");
                return DB.utils.snakeToCamel(data);
             } catch (error) { return handleSupabaseError(error, "settings.save"); }
        },
         update: async function(settingsData) { return this.save(settingsData); }
    },
    activities: {
         getRecent: async function(limit = 10) {
             try {
                const client = await DB._ensureInitialized();
                const { data, error } = await client.from('activities').select('*').order('timestamp', { ascending: false }).limit(limit);
                if (error) return handleSupabaseError(error, "activities.getRecent");
                return data || [];
             } catch (error) { return handleSupabaseError(error, "activities.getRecent"); }
         },
         add: async function(activityData) {
             try {
                const client = await DB._ensureInitialized();
                const dataToSave = {
                    type: activityData.type, entity: activityData.entity,
                    entity_id: activityData.entityId || null, description: activityData.description
                 };
                const { data, error } = await client.from('activities').insert(dataToSave).select().single();
                if (error) return handleSupabaseError(error, "activities.add");
                return data;
             } catch (error) { return handleSupabaseError(error, "activities.add"); }
         },
    },

    // --- START: CORRECTED expenses and incomes objects ---
    expenses: {
        getAll: async function() {
            try {
                const client = await DB._ensureInitialized();
                const { data, error } = await client.from('expenses').select(`*, expense_categories(name)`).order('date', { ascending: false });
                if (error) return handleSupabaseError(error, "expenses.getAll");
                const transformedData = (data || []).map(expense => ({...expense, amount: parseFloat(expense.amount), categoryName: expense.expense_categories?.name }));
                return DB.utils.snakeToCamelArray(transformedData);
            } catch (error) { return handleSupabaseError(error, "expenses.getAll"); }
        },
        getById: async function(id) {
            try {
                const client = await DB._ensureInitialized();
                if (!id) return null;
                const { data, error } = await client.from('expenses').select(`*, expense_categories(name)`).eq('id', id).single();
                if (error) { if (error.code === 'PGRST116') return null; return handleSupabaseError(error, `expenses.getById(${id})`); }
                const transformed = {...data, amount: parseFloat(data.amount), categoryName: data.expense_categories?.name };
                return DB.utils.snakeToCamel(transformed);
            } catch (error) { return handleSupabaseError(error, `expenses.getById(${id})`); }
        },
        getByMonth: async function(year, month) {
            try {
                const client = await DB._ensureInitialized();
                const startDate = new Date(year, month, 1);
                const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
                const { data, error } = await client.from('expenses').select(`*, expense_categories(name)`).gte('date', startDate.toISOString()).lte('date', endDate.toISOString()).order('date', { ascending: false });
                if (error) return handleSupabaseError(error, `expenses.getByMonth(${year}-${month})`);
                const transformedData = (data || []).map(expense => ({...expense, amount: parseFloat(expense.amount), categoryName: expense.expense_categories?.name }));
                return DB.utils.snakeToCamelArray(transformedData);
            } catch (error) { return handleSupabaseError(error, `expenses.getByMonth(${year}-${month})`); }
        },
        getByDateRange: async function(startDate, endDate) {
            try {
                const client = await DB._ensureInitialized();
                const { data, error } = await client.from('expenses').select(`*, expense_categories(name)`).gte('date', new Date(startDate).toISOString()).lte('date', new Date(endDate).toISOString()).order('date', { ascending: false });
                if (error) return handleSupabaseError(error, `expenses.getByDateRange`);
                const transformedData = (data || []).map(expense => ({...expense, amount: parseFloat(expense.amount), categoryName: expense.expense_categories?.name }));
                return DB.utils.snakeToCamelArray(transformedData);
            } catch (error) { return handleSupabaseError(error, `expenses.getByDateRange`); }
        },
        save: async function(expenseData) {
             try {
                const client = await DB._ensureInitialized();
                const dataToSave = { description: expenseData.description, amount: expenseData.amount, category_id: expenseData.categoryId, department_id: expenseData.departmentId, is_general: expenseData.isGeneral || false, notes: expenseData.notes || null, date: expenseData.date };
                let resultData, error;
                if (expenseData.id) {
                    const response = await client.from('expenses').update(dataToSave).eq('id', expenseData.id).select(`*, expense_categories(name)`).single();
                    resultData = response.data; error = response.error;
                    if (error) return handleSupabaseError(error, `expenses.update(${expenseData.id})`);
                } else {
                    const response = await client.from('expenses').insert(dataToSave).select(`*, expense_categories(name)`).single();
                    resultData = response.data; error = response.error;
                    if (error) return handleSupabaseError(error, "expenses.insert");
                }
                const transformed = {...resultData, amount: parseFloat(resultData.amount), categoryName: resultData.expense_categories?.name };
                return DB.utils.snakeToCamel(transformed);
            } catch (error) { return handleSupabaseError(error, "expenses.save"); }
        },
        delete: async function(id) {
            try { const client = await DB._ensureInitialized(); if (!id) return false; const { error } = await client.from('expenses').delete().eq('id', id); if (error) { handleSupabaseError(error, `expenses.delete(${id})`); return false; } return true; } catch (error) { handleSupabaseError(error, `expenses.delete(${id})`); return false; }
        }
    },
    incomes: {
        getAll: async function() {
            try {
                const client = await DB._ensureInitialized();
                const { data, error } = await client.from('incomes').select(`*, income_categories(name)`).order('date', { ascending: false });
                if (error) return handleSupabaseError(error, "incomes.getAll");
                const transformedData = (data || []).map(income => ({ ...income, amount: parseFloat(income.amount), categoryName: income.income_categories?.name }));
                return DB.utils.snakeToCamelArray(transformedData);
            } catch (error) { return handleSupabaseError(error, "incomes.getAll"); }
        },
         getById: async function(id) {
            try {
                const client = await DB._ensureInitialized();
                if (!id) return null;
                const { data, error } = await client.from('incomes').select(`*, income_categories(name)`).eq('id', id).single();
                if (error) { if (error.code === 'PGRST116') return null; return handleSupabaseError(error, `incomes.getById(${id})`); }
                const transformed = {...data, amount: parseFloat(data.amount), categoryName: data.income_categories?.name };
                return DB.utils.snakeToCamel(transformed);
            } catch (error) { return handleSupabaseError(error, `incomes.getById(${id})`); }
        },
        getByMonth: async function(year, month) {
            try {
                const client = await DB._ensureInitialized();
                const startDate = new Date(year, month, 1);
                const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
                const { data, error } = await client.from('incomes').select(`*, income_categories(name)`).gte('date', startDate.toISOString()).lte('date', endDate.toISOString()).order('date', { ascending: false });
                if (error) return handleSupabaseError(error, `incomes.getByMonth(${year}-${month})`);
                const transformedData = (data || []).map(income => ({...income, amount: parseFloat(income.amount), categoryName: income.income_categories?.name }));
                return DB.utils.snakeToCamelArray(transformedData);
            } catch (error) { return handleSupabaseError(error, `incomes.getByMonth(${year}-${month})`); }
        },
        getByDateRange: async function(startDate, endDate) {
            try {
                const client = await DB._ensureInitialized();
                const { data, error } = await client.from('incomes').select(`*, income_categories(name)`).gte('date', new Date(startDate).toISOString()).lte('date', new Date(endDate).toISOString()).order('date', { ascending: false });
                if (error) return handleSupabaseError(error, `incomes.getByDateRange`);
                const transformedData = (data || []).map(income => ({...income, amount: parseFloat(income.amount), categoryName: income.income_categories?.name }));
                return DB.utils.snakeToCamelArray(transformedData);
            } catch (error) { return handleSupabaseError(error, `incomes.getByDateRange`); }
        },
        save: async function(incomeData) {
            try {
                const client = await DB._ensureInitialized();
                const dataToSave = { description: incomeData.description, amount: incomeData.amount, category_id: incomeData.categoryId, department_id: incomeData.departmentId, notes: incomeData.notes || null, date: incomeData.date };
                let resultData, error;
                if (incomeData.id) {
                    const response = await client.from('incomes').update(dataToSave).eq('id', incomeData.id).select(`*, income_categories(name)`).single();
                    resultData = response.data; error = response.error;
                    if (error) return handleSupabaseError(error, `incomes.update(${incomeData.id})`);
                } else {
                    const response = await client.from('incomes').insert(dataToSave).select(`*, income_categories(name)`).single();
                    resultData = response.data; error = response.error;
                    if (error) return handleSupabaseError(error, "incomes.insert");
                }
                const transformed = { ...resultData, amount: parseFloat(resultData.amount), categoryName: resultData.income_categories?.name };
                return DB.utils.snakeToCamel(transformed);
            } catch (error) { return handleSupabaseError(error, "incomes.save"); }
        },
        delete: async function(id) {
            try { const client = await DB._ensureInitialized(); if (!id) return false; const { error } = await client.from('incomes').delete().eq('id', id); if (error) { handleSupabaseError(error, `incomes.delete(${id})`); return false; } return true; } catch (error) { handleSupabaseError(error, `incomes.delete(${id})`); return false; }
        }
    },
    // --- END: CORRECTED expenses and incomes objects ---

    expenseCategories: {
        getAll: async function() {
            try { const client = await DB._ensureInitialized(); const { data, error } = await client.from('expense_categories').select('*').order('name'); if (error) return handleSupabaseError(error, "expenseCategories.getAll"); return data || []; } catch (error) { return handleSupabaseError(error, "expenseCategories.getAll"); }
        },
        save: async function(categoryData) {
            try {
                const client = await DB._ensureInitialized(); const dataToSave = { name: categoryData.name }; let resultData, error;
                if (categoryData.id) {
                    const response = await client.from('expense_categories').update(dataToSave).eq('id', categoryData.id).select().single();
                    resultData = response.data; error = response.error;
                    if (error) return handleSupabaseError(error, `expenseCategories.update`);
                } else {
                    const response = await client.from('expense_categories').insert(dataToSave).select().single();
                    resultData = response.data; error = response.error;
                    if (error) return handleSupabaseError(error, "expenseCategories.insert");
                }
                return resultData;
            } catch (error) { return handleSupabaseError(error, "expenseCategories.save"); }
        },
        delete: async function(id) {
            try { const client = await DB._ensureInitialized(); if (!id) return false; const { error } = await client.from('expense_categories').delete().eq('id', id); if (error) { handleSupabaseError(error, `expenseCategories.delete(${id})`); return false; } return true; } catch (error) { handleSupabaseError(error, `expenseCategories.delete(${id})`); return false; }
        }
    },
    incomeCategories: {
        getAll: async function() {
            try { const client = await DB._ensureInitialized(); const { data, error } = await client.from('income_categories').select('*').order('name'); if (error) return handleSupabaseError(error, "incomeCategories.getAll"); return data || []; } catch (error) { return handleSupabaseError(error, "incomeCategories.getAll"); }
        },
        save: async function(categoryData) {
            try {
                const client = await DB._ensureInitialized(); const dataToSave = { name: categoryData.name }; let resultData, error;
                if (categoryData.id) {
                    const response = await client.from('income_categories').update(dataToSave).eq('id', categoryData.id).select().single();
                    resultData = response.data; error = response.error;
                    if (error) return handleSupabaseError(error, `incomeCategories.update`);
                } else {
                    const response = await client.from('income_categories').insert(dataToSave).select().single();
                    resultData = response.data; error = response.error;
                    if (error) return handleSupabaseError(error, "incomeCategories.insert");
                }
                return resultData;
            } catch (error) { return handleSupabaseError(error, "incomeCategories.save"); }
        },
        delete: async function(id) {
            try { const client = await DB._ensureInitialized(); if (!id) return false; const { error } = await client.from('income_categories').delete().eq('id', id); if (error) { handleSupabaseError(error, `incomeCategories.delete(${id})`); return false; } return true; } catch (error) { handleSupabaseError(error, `incomeCategories.delete(${id})`); return false; }
        }
    },
    utils: {
         snakeToCamel: (obj) => {
             if (obj === null || typeof obj !== 'object') return obj;
             if (Array.isArray(obj)) return obj.map(DB.utils.snakeToCamel);
             return Object.keys(obj).reduce((acc, key) => {
                 const camelKey = key.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
                 acc[camelKey] = DB.utils.snakeToCamel(obj[key]);
                 return acc;
             }, {});
         },
         snakeToCamelArray: (arr) => {
             if (!Array.isArray(arr)) return arr;
             return arr.map(DB.utils.snakeToCamel);
         }
     }
};

// Make DB globally available
window.DB = DB;

// --- Main Initialization Call ---
// This ensures that any module trying to use DB will have an initialized client
DB._ensureInitialized().catch(error => {
    console.error("Critical: Supabase failed to initialize on script load.", error);
    // Optionally display an error to the user here
});
