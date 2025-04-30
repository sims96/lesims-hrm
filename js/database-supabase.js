/**
 * database-supabase.js
 * Gestion du stockage des données avec Supabase
 * Application de Gestion des Salaires Le Sims
 * (Revised Initialization Logic)
 */

// --- Configuration ---
const SUPABASE_URL = 'https://efdceibleelherxenduc.supabase.co'; // MAKE SURE TO REPLACE THIS
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZGNlaWJsZWVsaGVyeGVuZHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NzUwNTYsImV4cCI6MjA2MTU1MTA1Nn0.b-hM2oxl99d8KMXLfp-6gA3qGBfeiIeGS3aYYrXbieI'; // MAKE SURE TO REPLACE THIS

// --- Module State ---
let supabaseClient = null; // Holds the initialized client instance
let isSupabaseInitialized = false; // Flag to track initialization status
let initializationPromise = null; // Promise to await initialization
let initializationAttempts = 0; // Track number of initialization attempts
const MAX_INIT_ATTEMPTS = 5; // Maximum number of attempts
const INIT_RETRY_DELAY = 1000; // Delay between attempts in ms

// --- Function to check if Supabase is available ---
function isSupabaseAvailable() {
    return typeof window !== 'undefined' && 
           typeof window.supabase !== 'undefined' && 
           typeof window.supabase.createClient === 'function';
}

// --- Wait for Supabase to be available ---
function waitForSupabase(maxWaitTime = 10000, checkInterval = 200) {
    return new Promise((resolve, reject) => {
        // If already available, resolve immediately
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
            
            // Check if we've waited too long
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
    // Prevent re-initialization if already successful
    if (isSupabaseInitialized && supabaseClient) {
        return supabaseClient;
    }
    
    // Return existing promise if initialization is in progress
    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = new Promise(async (resolve, reject) => {
        console.log(`Attempting Supabase initialization (attempt ${initializationAttempts + 1}/${MAX_INIT_ATTEMPTS})...`);
        
        try {
            // Wait for Supabase to be available
            await waitForSupabase();
            
            // Check if URL and Key are provided and replaced
            if (!SUPABASE_URL || !SUPABASE_ANON_KEY || 
                SUPABASE_URL === 'YOUR_SUPABASE_URL' || 
                SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
                throw new Error("Supabase URL or Anon Key is missing or not replaced. Please update database-supabase.js");
            }

            // Create the client
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

            if (supabaseClient) {
                console.log('Supabase client created successfully.');
                isSupabaseInitialized = true;
                
                // Reset the attempt counter on success
                initializationAttempts = 0;
                
                resolve(supabaseClient); // Resolve the promise with the client
            } else {
                throw new Error("supabase.createClient returned null or undefined.");
            }
        } catch (error) {
            initializationAttempts++;
            
            console.error(`Error during Supabase initialization (attempt ${initializationAttempts}):`, error);
            
            if (initializationAttempts < MAX_INIT_ATTEMPTS) {
                // Reset the promise to allow retry
                initializationPromise = null;
                
                // Retry after delay
                console.log(`Retrying in ${INIT_RETRY_DELAY}ms...`);
                setTimeout(() => {
                    initializeSupabase()
                        .then(resolve)
                        .catch(reject);
                }, INIT_RETRY_DELAY);
            } else {
                // Max attempts reached, give up
                console.error(`Failed to initialize Supabase after ${MAX_INIT_ATTEMPTS} attempts.`);
                supabaseClient = null;
                isSupabaseInitialized = false;
                reject(error);
                
                // Reset attempts for future initialization
                initializationAttempts = 0;
                // Reset the promise to allow future retries
                initializationPromise = null;
            }
        }
    });

    return initializationPromise;
}

// --- Helper function for error handling ---
const handleSupabaseError = (error, context) => {
    console.error(`Supabase error in ${context}:`, error?.message || error);
    return null; // Return null or empty array based on expected return type
};

// --- Global DB Object (Supabase Implementation) ---
const DB = {
    // Ensure initialization is complete before proceeding
    _ensureInitialized: async () => {
        if (!isSupabaseInitialized) {
            try {
                return await initializeSupabase();
            } catch (error) {
                throw new Error("Failed to initialize Supabase: " + error.message);
            }
        }
        if (!supabaseClient) {
            throw new Error("Supabase client is not available after initialization.");
        }
        return supabaseClient; // Return the client for use
    },

    isInitialized: () => isSupabaseInitialized, // Public status check

    // --- REST OF THE DB OBJECT METHODS REMAIN THE SAME --- 
    
    /**
     * Méthodes CRUD pour les employés
     */
    employees: {
        getAll: async function() {
            try {
                const client = await DB._ensureInitialized(); // Wait for init and get client
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
                const dataToSave = { /* ... (convert to snake_case) ... */
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
                // TODO: Activity log
                return DB.utils.snakeToCamel(resultData);
             } catch (error) { return handleSupabaseError(error, "employees.save"); }
        },
        delete: async function(id) {
             try {
                const client = await DB._ensureInitialized();
                if (!id) return false;
                 // TODO: Activity log
                const { error } = await client.from('employees').delete().eq('id', id);
                if (error) { handleSupabaseError(error, `employees.delete(${id})`); return false; }
                return true;
             } catch (error) { handleSupabaseError(error, `employees.delete(${id})`); return false; }
        },
    },

    // --- Salaries ---
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
             try { const client = await DB._ensureInitialized(); const dataToSave = { /* ... (convert to snake_case) ... */
                employee_id: salaryData.employeeId, payment_date: salaryData.paymentDate,
                period_start_date: salaryData.period?.startDate, period_end_date: salaryData.period?.endDate,
                base_salary: salaryData.baseSalary, advances: salaryData.advances, sanctions: salaryData.sanctions,
                debts: salaryData.debts, net_salary: salaryData.netSalary, is_paid: salaryData.isPaid,
                paid_date: salaryData.paidDate || null, payment_method: salaryData.paymentMethod || null,
                notes: salaryData.notes || null, details: salaryData.details || null
             }; let resultData, error; if (salaryData.id) { const response = await client.from('salaries').update(dataToSave).eq('id', salaryData.id).select().single(); resultData = response.data; error = response.error; if (error) return handleSupabaseError(error, `salaries.update(${salaryData.id})`); } else { const response = await client.from('salaries').insert(dataToSave).select().single(); resultData = response.data; error = response.error; if (error) return handleSupabaseError(error, "salaries.insert"); } /* TODO: Activity log */ return DB.utils.snakeToCamel(resultData); } catch (error) { return handleSupabaseError(error, "salaries.save"); }
        },
        delete: async function(id) {
             try { const client = await DB._ensureInitialized(); if (!id) return false; /* TODO: Activity log */ const { error } = await client.from('salaries').delete().eq('id', id); if (error) { handleSupabaseError(error, `salaries.delete(${id})`); return false; } return true; } catch (error) { handleSupabaseError(error, `salaries.delete(${id})`); return false; }
        }
    },

    // --- Advances ---
    advances: {
         getAll: async function() { try { const c=await DB._ensureInitialized(); const {d,e}=await c.from('advances').select('*').order('date',{ascending:false}); if(e)return handleSupabaseError(e,"advances.getAll"); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,"advances.getAll");} },
         getById: async function(id) { try { const c=await DB._ensureInitialized(); if(!id)return null; const {d,e}=await c.from('advances').select('*').eq('id',id).single(); if(e){if(e.code==='PGRST116')return null; return handleSupabaseError(e,`advances.getById(${id})`);} return DB.utils.snakeToCamel(d); } catch(e){return handleSupabaseError(e,`advances.getById(${id})`);} },
         getByEmployeeId: async function(eid) { try { const c=await DB._ensureInitialized(); if(!eid)return[]; const {d,e}=await c.from('advances').select('*').eq('employee_id',eid).order('date',{ascending:false}); if(e)return handleSupabaseError(e,`advances.getByEmployeeId(${eid})`); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,`advances.getByEmployeeId(${eid})`);} },
         getUnpaidByEmployeeId: async function(eid) { try { const c=await DB._ensureInitialized(); if(!eid)return[]; const {d,e}=await c.from('advances').select('*').eq('employee_id',eid).eq('is_paid',false).order('date',{ascending:false}); if(e)return handleSupabaseError(e,`advances.getUnpaidByEmployeeId(${eid})`); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,`advances.getUnpaidByEmployeeId(${eid})`);} },
         getTotalUnpaidByEmployeeId: async function(eid) { try { const c=await DB._ensureInitialized(); if(!eid)return 0; const {d,e}=await c.from('advances').select('amount').eq('employee_id',eid).eq('is_paid',false); if(e){handleSupabaseError(e,`advances.getTotalUnpaidByEmployeeId(${eid})`); return 0;} return(d||[]).reduce((s,r)=>s+(r.amount||0),0); } catch(e){handleSupabaseError(e,`advances.getTotalUnpaidByEmployeeId(${eid})`); return 0;} },
         save: async function(aData) { try { const c=await DB._ensureInitialized(); const dts={employee_id:aData.employeeId,date:aData.date,amount:aData.amount,reason:aData.reason||null,is_paid:aData.isPaid,paid_date:aData.paidDate||null}; let rd,err; if(aData.id){const r=await c.from('advances').update(dts).eq('id',aData.id).select().single(); rd=r.data; err=r.error; if(err)return handleSupabaseError(err,`advances.update(${aData.id})`);}else{const r=await c.from('advances').insert(dts).select().single(); rd=r.data; err=r.error; if(err)return handleSupabaseError(err,"advances.insert");} /* TODO: Log */ return DB.utils.snakeToCamel(rd); } catch(e){return handleSupabaseError(e,"advances.save");} },
         delete: async function(id) { try { const c=await DB._ensureInitialized(); if(!id)return false; /* TODO: Log */ const {e}=await c.from('advances').delete().eq('id',id); if(e){handleSupabaseError(e,`advances.delete(${id})`); return false;} return true; } catch(e){handleSupabaseError(e,`advances.delete(${id})`); return false;} }
    },

    // --- Sanctions ---
    sanctions: {
         getAll: async function() { try { const c=await DB._ensureInitialized(); const {d,e}=await c.from('sanctions').select('*').order('date',{ascending:false}); if(e)return handleSupabaseError(e,"sanctions.getAll"); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,"sanctions.getAll");} },
         getById: async function(id) { try { const c=await DB._ensureInitialized(); if(!id)return null; const {d,e}=await c.from('sanctions').select('*').eq('id',id).single(); if(e){if(e.code==='PGRST116')return null; return handleSupabaseError(e,`sanctions.getById(${id})`);} return DB.utils.snakeToCamel(d); } catch(e){return handleSupabaseError(e,`sanctions.getById(${id})`);} },
         getByEmployeeId: async function(eid) { try { const c=await DB._ensureInitialized(); if(!eid)return[]; const {d,e}=await c.from('sanctions').select('*').eq('employee_id',eid).order('date',{ascending:false}); if(e)return handleSupabaseError(e,`sanctions.getByEmployeeId(${eid})`); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,`sanctions.getByEmployeeId(${eid})`);} },
         getByMonth: async function(y,m) { try { const c=await DB._ensureInitialized(); const sd=new Date(y,m,1); const ed=new Date(y,m+1,0,23,59,59,999); const {d,e}=await c.from('sanctions').select('*').gte('date',sd.toISOString()).lte('date',ed.toISOString()); if(e)return handleSupabaseError(e,`sanctions.getByMonth(${y}-${m})`); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,`sanctions.getByMonth(${y}-${m})`);} },
         save: async function(sData) { try { const c=await DB._ensureInitialized(); const dts={employee_id:sData.employeeId,date:sData.date,type:sData.type,amount:sData.amount,reason:sData.reason||null}; let rd,err; if(sData.id){const r=await c.from('sanctions').update(dts).eq('id',sData.id).select().single(); rd=r.data; err=r.error; if(err)return handleSupabaseError(err,`sanctions.update(${sData.id})`);}else{const r=await c.from('sanctions').insert(dts).select().single(); rd=r.data; err=r.error; if(err)return handleSupabaseError(err,"sanctions.insert");} /* TODO: Log */ return DB.utils.snakeToCamel(rd); } catch(e){return handleSupabaseError(e,"sanctions.save");} },
         delete: async function(id) { try { const c=await DB._ensureInitialized(); if(!id)return false; /* TODO: Log */ const {e}=await c.from('sanctions').delete().eq('id',id); if(e){handleSupabaseError(e,`sanctions.delete(${id})`); return false;} return true; } catch(e){handleSupabaseError(e,`sanctions.delete(${id})`); return false;} }
    },

    // --- Debts ---
    debts: {
         getAll: async function() { try { const c=await DB._ensureInitialized(); const {d,e}=await c.from('debts').select('*').order('date',{ascending:false}); if(e)return handleSupabaseError(e,"debts.getAll"); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,"debts.getAll");} },
         getById: async function(id) { try { const c=await DB._ensureInitialized(); if(!id)return null; const {d,e}=await c.from('debts').select('*').eq('id',id).single(); if(e){if(e.code==='PGRST116')return null; return handleSupabaseError(e,`debts.getById(${id})`);} return DB.utils.snakeToCamel(d); } catch(e){return handleSupabaseError(e,`debts.getById(${id})`);} },
         getByEmployeeId: async function(eid) { try { const c=await DB._ensureInitialized(); if(!eid)return[]; const {d,e}=await c.from('debts').select('*').eq('employee_id',eid).order('date',{ascending:false}); if(e)return handleSupabaseError(e,`debts.getByEmployeeId(${eid})`); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,`debts.getByEmployeeId(${eid})`);} },
         getUnpaidByEmployeeId: async function(eid) { try { const c=await DB._ensureInitialized(); if(!eid)return[]; const {d,e}=await c.from('debts').select('*').eq('employee_id',eid).eq('is_paid',false).order('date',{ascending:false}); if(e)return handleSupabaseError(e,`debts.getUnpaidByEmployeeId(${eid})`); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,`debts.getUnpaidByEmployeeId(${eid})`);} },
         getTotalUnpaidByEmployeeId: async function(eid) { try { const c=await DB._ensureInitialized(); if(!eid)return 0; const {d,e}=await c.from('debts').select('amount').eq('employee_id',eid).eq('is_paid',false); if(e){handleSupabaseError(e,`debts.getTotalUnpaidByEmployeeId(${eid})`); return 0;} return(d||[]).reduce((s,r)=>s+(r.amount||0),0); } catch(e){handleSupabaseError(e,`debts.getTotalUnpaidByEmployeeId(${eid})`); return 0;} },
         save: async function(dData) { try { const c=await DB._ensureInitialized(); const dts={employee_id:dData.employeeId,client_name:dData.clientName,date:dData.date,amount:dData.amount,description:dData.description||null,is_paid:dData.isPaid,paid_date:dData.paidDate||null}; let rd,err; if(dData.id){const r=await c.from('debts').update(dts).eq('id',dData.id).select().single(); rd=r.data; err=r.error; if(err)return handleSupabaseError(err,`debts.update(${dData.id})`);}else{const r=await c.from('debts').insert(dts).select().single(); rd=r.data; err=r.error; if(err)return handleSupabaseError(err,"debts.insert");} /* TODO: Log */ return DB.utils.snakeToCamel(rd); } catch(e){return handleSupabaseError(e,"debts.save");} },
         delete: async function(id) { try { const c=await DB._ensureInitialized(); if(!id)return false; /* TODO: Log */ const {e}=await c.from('debts').delete().eq('id',id); if(e){handleSupabaseError(e,`debts.delete(${id})`); return false;} return true; } catch(e){handleSupabaseError(e,`debts.delete(${id})`); return false;} }
    },

    // --- Settings ---
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
                const dataToSave = { /* ... (convert to snake_case) ... */
                    company_name: settingsData.companyName, currency: settingsData.currency,
                    working_days: settingsData.workingDays, language: settingsData.language,
                    date_format: settingsData.dateFormat, theme: settingsData.theme
                 };
                const { data, error } = await client.from('settings').update(dataToSave).eq('id', true).select().single();
                if (error) return handleSupabaseError(error, "settings.save");
                // TODO: Activity log
                return DB.utils.snakeToCamel(data);
             } catch (error) { return handleSupabaseError(error, "settings.save"); }
        },
         update: async function(settingsData) { return this.save(settingsData); }
    },

    // --- Activities ---
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
                const dataToSave = { /* ... */
                    type: activityData.type, entity: activityData.entity,
                    entity_id: activityData.entityId || null, description: activityData.description
                 };
                const { data, error } = await client.from('activities').insert(dataToSave).select().single();
                if (error) return handleSupabaseError(error, "activities.add");
                return data;
             } catch (error) { return handleSupabaseError(error, "activities.add"); }
         },
    },

    // --- Export/Import/Reset Placeholders ---
    export: async function() { console.warn("DB.export() NYI"); alert("Export NYI"); return null; },
    import: async function(jsonData) { console.warn("DB.import() NYI"); alert("Import NYI"); return false; },
    reset: async function() { console.warn("DB.reset() NYI"); alert("Reset NYI"); return false; },

    // --- Utilities ---
     utils: {
         snakeToCamel: (obj) => { /* ... same as before ... */
             if (obj === null || typeof obj !== 'object') return obj;
             if (Array.isArray(obj)) return obj.map(DB.utils.snakeToCamel);
             return Object.keys(obj).reduce((acc, key) => {
                 const camelKey = key.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
                 acc[camelKey] = DB.utils.snakeToCamel(obj[key]);
                 return acc;
             }, {});
         },
         snakeToCamelArray: (arr) => { /* ... same as before ... */
             if (!Array.isArray(arr)) return arr;
             return arr.map(DB.utils.snakeToCamel);
         }
     }
};

// Make DB globally available
window.DB = DB;

// --- Prevent Multiple Initializations ---
let triggerInitializationPromise = null;

// --- Trigger Initialization ---
function triggerInitialization() {
    if (triggerInitializationPromise) {
        return triggerInitializationPromise;
    }
    
    triggerInitializationPromise = new Promise(async (resolve) => {
        try {
            console.log("Triggering Supabase initialization...");
            await initializeSupabase();
            
            // Fetch initial settings after initialization is confirmed
            if (DB.isInitialized()) {
                console.log('Initial settings loaded successfully post-init.');
                // Apply theme etc. if settings are loaded successfully
                const settings = await DB.settings.get();
                if (settings) {
                    document.body.classList.toggle('light-theme', settings.theme === 'light');
                }
            } else {
                console.warn('Supabase still not initialized after trigger.');
            }
            resolve(DB.isInitialized());
        } catch (error) {
            console.error("Error during Supabase initialization:", error);
            resolve(false);
        }
    });
    
    return triggerInitializationPromise;
}

// --- Main Initialization Call ---
// Using both DOMContentLoaded and a direct call to handle different load scenarios
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log("DOMContentLoaded triggered - initializing Supabase...");
        triggerInitialization();
    });
} else {
    console.log("Document already loaded - initializing Supabase immediately...");
    triggerInitialization();
}

// Force trigger initialization when script is fully loaded
setTimeout(() => {
    if (!DB.isInitialized()) {
        console.log("Delayed initialization trigger...");
        triggerInitialization();
    }
}, 1000);