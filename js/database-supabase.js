/**
 * database-supabase.js
 * Gestion du stockage des données avec Supabase
 * Application de Gestion des Salaires Le Sims
 * (Updated with connection optimization and error handling)
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
                SUPABASE_URL === 'YOUR_SUPABASE_URL' || 
                SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
                throw new Error("Supabase URL or Anon Key is missing or not replaced. Please update database-supabase.js");
            }

            // Create the client with optimized configuration
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: false
                },
                db: {
                    schema: 'public'
                },
                global: {
                    headers: { 'x-client-info': 'lesims-app' },
                },
                realtime: {
                    params: {
                        eventsPerSecond: 2 // Reduced from default 10
                    }
                }
            });

            if (supabaseClient) {
                console.log('Supabase client created successfully.');
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
                    initializeSupabase()
                        .then(resolve)
                        .catch(reject);
                }, INIT_RETRY_DELAY);
            } else {
                console.error(`Failed to initialize Supabase after ${MAX_INIT_ATTEMPTS} attempts.`);
                supabaseClient = null;
                isSupabaseInitialized = false;
                reject(error);
                initializationAttempts = 0;
                initializationPromise = null;
            }
        }
    });

    return initializationPromise;
}

// --- Helper function for enhanced error handling ---
const handleSupabaseError = (error, context) => {
    console.error(`Supabase error in ${context}:`, error?.message || error);
    
    // Check for specific error types
    if (error?.code === 'PGRST301') {
        console.error('Row limit exceeded. Consider pagination.');
    } else if (error?.code === '57014') {
        console.error('Query timeout. Consider optimizing the query.');
    } else if (error?.code === '42501') {
        console.error('Insufficient privileges. Check RLS policies.');
    } else if (error?.code === '23505') {
        console.error('Unique violation. Duplicate key exists.');
    } else if (error?.message?.includes('Failed to fetch')) {
        console.error('Network error. Check connection.');
    } else if (error?.message?.includes('rate limit')) {
        console.error('Rate limit hit. Implementing backoff...');
    }
    
    return null;
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
        return supabaseClient;
    },

    isInitialized: () => isSupabaseInitialized,

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

    // --- Advances ---
    advances: {
         getAll: async function() { try { const c=await DB._ensureInitialized(); const {d,e}=await c.from('advances').select('*').order('date',{ascending:false}); if(e)return handleSupabaseError(e,"advances.getAll"); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,"advances.getAll");} },
         getById: async function(id) { try { const c=await DB._ensureInitialized(); if(!id)return null; const {d,e}=await c.from('advances').select('*').eq('id',id).single(); if(e){if(e.code==='PGRST116')return null; return handleSupabaseError(e,`advances.getById(${id})`);} return DB.utils.snakeToCamel(d); } catch(e){return handleSupabaseError(e,`advances.getById(${id})`);} },
         getByEmployeeId: async function(eid) { try { const c=await DB._ensureInitialized(); if(!eid)return[]; const {d,e}=await c.from('advances').select('*').eq('employee_id',eid).order('date',{ascending:false}); if(e)return handleSupabaseError(e,`advances.getByEmployeeId(${eid})`); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,`advances.getByEmployeeId(${eid})`);} },
         getUnpaidByEmployeeId: async function(eid) { try { const c=await DB._ensureInitialized(); if(!eid)return[]; const {d,e}=await c.from('advances').select('*').eq('employee_id',eid).eq('is_paid',false).order('date',{ascending:false}); if(e)return handleSupabaseError(e,`advances.getUnpaidByEmployeeId(${eid})`); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,`advances.getUnpaidByEmployeeId(${eid})`);} },
         getTotalUnpaidByEmployeeId: async function(eid) { try { const c=await DB._ensureInitialized(); if(!eid)return 0; const {d,e}=await c.from('advances').select('amount').eq('employee_id',eid).eq('is_paid',false); if(e){handleSupabaseError(e,`advances.getTotalUnpaidByEmployeeId(${eid})`); return 0;} return(d||[]).reduce((s,r)=>s+(r.amount||0),0); } catch(e){handleSupabaseError(e,`advances.getTotalUnpaidByEmployeeId(${eid})`); return 0;} },
         save: async function(aData) { try { const c=await DB._ensureInitialized(); const dts={employee_id:aData.employeeId,date:aData.date,amount:aData.amount,reason:aData.reason||null,is_paid:aData.isPaid,paid_date:aData.paidDate||null}; let rd,err; if(aData.id){const r=await c.from('advances').update(dts).eq('id',aData.id).select().single(); rd=r.data; err=r.error; if(err)return handleSupabaseError(err,`advances.update(${aData.id})`);}else{const r=await c.from('advances').insert(dts).select().single(); rd=r.data; err=r.error; if(err)return handleSupabaseError(err,"advances.insert");} return DB.utils.snakeToCamel(rd); } catch(e){return handleSupabaseError(e,"advances.save");} },
         delete: async function(id) { try { const c=await DB._ensureInitialized(); if(!id)return false; const {e}=await c.from('advances').delete().eq('id',id); if(e){handleSupabaseError(e,`advances.delete(${id})`); return false;} return true; } catch(e){handleSupabaseError(e,`advances.delete(${id})`); return false;} }
    },

    // --- Sanctions ---
    sanctions: {
         getAll: async function() { try { const c=await DB._ensureInitialized(); const {d,e}=await c.from('sanctions').select('*').order('date',{ascending:false}); if(e)return handleSupabaseError(e,"sanctions.getAll"); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,"sanctions.getAll");} },
         getById: async function(id) { try { const c=await DB._ensureInitialized(); if(!id)return null; const {d,e}=await c.from('sanctions').select('*').eq('id',id).single(); if(e){if(e.code==='PGRST116')return null; return handleSupabaseError(e,`sanctions.getById(${id})`);} return DB.utils.snakeToCamel(d); } catch(e){return handleSupabaseError(e,`sanctions.getById(${id})`);} },
         getByEmployeeId: async function(eid) { try { const c=await DB._ensureInitialized(); if(!eid)return[]; const {d,e}=await c.from('sanctions').select('*').eq('employee_id',eid).order('date',{ascending:false}); if(e)return handleSupabaseError(e,`sanctions.getByEmployeeId(${eid})`); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,`sanctions.getByEmployeeId(${eid})`);} },
         getByMonth: async function(y,m) { try { const c=await DB._ensureInitialized(); const sd=new Date(y,m,1); const ed=new Date(y,m+1,0,23,59,59,999); const {d,e}=await c.from('sanctions').select('*').gte('date',sd.toISOString()).lte('date',ed.toISOString()); if(e)return handleSupabaseError(e,`sanctions.getByMonth(${y}-${m})`); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,`sanctions.getByMonth(${y}-${m})`);} },
         save: async function(sData) { try { const c=await DB._ensureInitialized(); const dts={employee_id:sData.employeeId,date:sData.date,type:sData.type,amount:sData.amount,reason:sData.reason||null}; let rd,err; if(sData.id){const r=await c.from('sanctions').update(dts).eq('id',sData.id).select().single(); rd=r.data; err=r.error; if(err)return handleSupabaseError(err,`sanctions.update(${sData.id})`);}else{const r=await c.from('sanctions').insert(dts).select().single(); rd=r.data; err=r.error; if(err)return handleSupabaseError(err,"sanctions.insert");} return DB.utils.snakeToCamel(rd); } catch(e){return handleSupabaseError(e,"sanctions.save");} },
         delete: async function(id) { try { const c=await DB._ensureInitialized(); if(!id)return false; const {e}=await c.from('sanctions').delete().eq('id',id); if(e){handleSupabaseError(e,`sanctions.delete(${id})`); return false;} return true; } catch(e){handleSupabaseError(e,`sanctions.delete(${id})`); return false;} }
    },

    // --- Debts ---
    debts: {
         getAll: async function() { try { const c=await DB._ensureInitialized(); const {d,e}=await c.from('debts').select('*').order('date',{ascending:false}); if(e)return handleSupabaseError(e,"debts.getAll"); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,"debts.getAll");} },
         getById: async function(id) { try { const c=await DB._ensureInitialized(); if(!id)return null; const {d,e}=await c.from('debts').select('*').eq('id',id).single(); if(e){if(e.code==='PGRST116')return null; return handleSupabaseError(e,`debts.getById(${id})`);} return DB.utils.snakeToCamel(d); } catch(e){return handleSupabaseError(e,`debts.getById(${id})`);} },
         getByEmployeeId: async function(eid) { try { const c=await DB._ensureInitialized(); if(!eid)return[]; const {d,e}=await c.from('debts').select('*').eq('employee_id',eid).order('date',{ascending:false}); if(e)return handleSupabaseError(e,`debts.getByEmployeeId(${eid})`); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,`debts.getByEmployeeId(${eid})`);} },
         getUnpaidByEmployeeId: async function(eid) { try { const c=await DB._ensureInitialized(); if(!eid)return[]; const {d,e}=await c.from('debts').select('*').eq('employee_id',eid).eq('is_paid',false).order('date',{ascending:false}); if(e)return handleSupabaseError(e,`debts.getUnpaidByEmployeeId(${eid})`); return DB.utils.snakeToCamelArray(d||[]); } catch(e){return handleSupabaseError(e,`debts.getUnpaidByEmployeeId(${eid})`);} },
         getTotalUnpaidByEmployeeId: async function(eid) { try { const c=await DB._ensureInitialized(); if(!eid)return 0; const {d,e}=await c.from('debts').select('amount').eq('employee_id',eid).eq('is_paid',false); if(e){handleSupabaseError(e,`debts.getTotalUnpaidByEmployeeId(${eid})`); return 0;} return(d||[]).reduce((s,r)=>s+(r.amount||0),0); } catch(e){handleSupabaseError(e,`debts.getTotalUnpaidByEmployeeId(${eid})`); return 0;} },
         save: async function(dData) { try { const c=await DB._ensureInitialized(); const dts={employee_id:dData.employeeId,client_name:dData.clientName,date:dData.date,amount:dData.amount,description:dData.description||null,is_paid:dData.isPaid,paid_date:dData.paidDate||null}; let rd,err; if(dData.id){const r=await c.from('debts').update(dts).eq('id',dData.id).select().single(); rd=r.data; err=r.error; if(err)return handleSupabaseError(err,`debts.update(${dData.id})`);}else{const r=await c.from('debts').insert(dts).select().single(); rd=r.data; err=r.error; if(err)return handleSupabaseError(err,"debts.insert");} return DB.utils.snakeToCamel(rd); } catch(e){return handleSupabaseError(e,"debts.save");} },
         delete: async function(id) { try { const c=await DB._ensureInitialized(); if(!id)return false; const {e}=await c.from('debts').delete().eq('id',id); if(e){handleSupabaseError(e,`debts.delete(${id})`); return false;} return true; } catch(e){handleSupabaseError(e,`debts.delete(${id})`); return false;} }
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

    // --- Expenses ---
    expenses: {
        getAll: async function() {
            try {
                const client = await DB._ensureInitialized();
                const { data, error } = await client.from('expenses')
                    .select(`
                        *,
                        expense_categories(name)
                    `)
                    .order('date', { ascending: false });
                if (error) return handleSupabaseError(error, "expenses.getAll");
                
                const transformedData = (data || []).map(expense => ({
                    id: expense.id,
                    date: expense.date,
                    description: expense.description,
                    amount: parseFloat(expense.amount),
                    categoryId: expense.category_id,
                    categoryName: expense.expense_categories?.name,
                    departmentId: expense.department_id,
                    isGeneral: expense.is_general,
                    notes: expense.notes,
                    createdAt: expense.created_at,
                    updatedAt: expense.updated_at
                }));
                
                return transformedData;
            } catch (error) {
                return handleSupabaseError(error, "expenses.getAll");
            }
        },
        
        getById: async function(id) {
            try {
                const client = await DB._ensureInitialized();
                if (!id) return null;
                const { data, error } = await client.from('expenses')
                    .select(`
                        *,
                        expense_categories(name)
                    `)
                    .eq('id', id)
                    .single();
                
                if (error) {
                    if (error.code === 'PGRST116') return null;
                    return handleSupabaseError(error, `expenses.getById(${id})`);
                }
                
                return {
                    id: data.id,
                    date: data.date,
                    description: data.description,
                    amount: parseFloat(data.amount),
                    categoryId: data.category_id,
                    categoryName: data.expense_categories?.name,
                    departmentId: data.department_id,
                    isGeneral: data.is_general,
                    notes: data.notes,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at
                };
            } catch (error) {
                return handleSupabaseError(error, `expenses.getById(${id})`);
            }
        },
        
        getByMonth: async function(year, month) {
            try {
                const client = await DB._ensureInitialized();
                const startDate = new Date(year, month, 1);
                const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
                
                const { data, error } = await client.from('expenses')
                    .select(`
                        *,
                        expense_categories(name)
                    `)
                    .gte('date', startDate.toISOString())
                    .lte('date', endDate.toISOString())
                    .order('date', { ascending: false });
                    
                if (error) return handleSupabaseError(error, `expenses.getByMonth(${year}-${month})`);
                
                return (data || []).map(expense => ({
                    id: expense.id,
                    date: expense.date,
                    description: expense.description,
                    amount: parseFloat(expense.amount),
                    categoryId: expense.category_id,
                    categoryName: expense.expense_categories?.name,
                    departmentId: expense.department_id,
                    isGeneral: expense.is_general,
                    notes: expense.notes,
                    createdAt: expense.created_at,
                    updatedAt: expense.updated_at
                }));
            } catch (error) {
                return handleSupabaseError(error, `expenses.getByMonth(${year}-${month})`);
            }
        },
        
        getByDateRange: async function(startDate, endDate) {
            try {
                const client = await DB._ensureInitialized();
                const { data, error } = await client.from('expenses')
                    .select(`
                        *,
                        expense_categories(name)
                    `)
                    .gte('date', new Date(startDate).toISOString())
                    .lte('date', new Date(endDate).toISOString())
                    .order('date', { ascending: false });
                    
                if (error) return handleSupabaseError(error, `expenses.getByDateRange`);
                
                return (data || []).map(expense => ({
                    id: expense.id,
                    date: expense.date,
                    description: expense.description,
                    amount: parseFloat(expense.amount),
                    categoryId: expense.category_id,
                    categoryName: expense.expense_categories?.name,
                    departmentId: expense.department_id,
                    isGeneral: expense.is_general,
                    notes: expense.notes,
                    createdAt: expense.created_at,
                    updatedAt: expense.updated_at
                }));
            } catch (error) {
                return handleSupabaseError(error, `expenses.getByDateRange`);
            }
        },
        
        save: async function(expenseData) {
            try {
                const client = await DB._ensureInitialized();
                
                const dataToSave = {
                    description: expenseData.description,
                    amount: expenseData.amount,
                    category_id: expenseData.categoryId,
                    department_id: expenseData.departmentId,
                    is_general: expenseData.isGeneral || false,
                    notes: expenseData.notes || null,
                    date: expenseData.date
                };
                
                let resultData, error;
                
                if (expenseData.id) {
                    const response = await client.from('expenses')
                        .update(dataToSave)
                        .eq('id', expenseData.id)
                        .select(`
                            *,
                            expense_categories(name)
                        `)
                        .single();
                        
                    resultData = response.data;
                    error = response.error;
                    
                    if (error) return handleSupabaseError(error, `expenses.update(${expenseData.id})`);
                } else {
                    const response = await client.from('expenses')
                        .insert(dataToSave)
                        .select(`
                            *,
                            expense_categories(name)
                        `)
                        .single();
                        
                    resultData = response.data;
                    error = response.error;
                    
                    if (error) return handleSupabaseError(error, "expenses.insert");
                }
                
                return {
                    id: resultData.id,
                    date: resultData.date,
                    description: resultData.description,
                    amount: parseFloat(resultData.amount),
                    categoryId: resultData.category_id,
                    categoryName: resultData.expense_categories?.name,
                    departmentId: resultData.department_id,
                    isGeneral: resultData.is_general,
                    notes: resultData.notes,
                    createdAt: resultData.created_at,
                    updatedAt: resultData.updated_at
                };
            } catch (error) {
                return handleSupabaseError(error, "expenses.save");
            }
        },
        
        delete: async function(id) {
            try {
                const client = await DB._ensureInitialized();
                if (!id) return false;
                
                const { error } = await client.from('expenses').delete().eq('id', id);
                
                if (error) {
                    handleSupabaseError(error, `expenses.delete(${id})`);
                    return false;
                }
                return true;
            } catch (error) {
                handleSupabaseError(error, `expenses.delete(${id})`);
                return false;
            }
        }
    },

    // --- Incomes ---
    incomes: {
        getAll: async function() {
            try {
                const client = await DB._ensureInitialized();
                const { data, error } = await client.from('incomes')
                    .select(`
                        *,
                        income_categories(name)
                    `)
                    .order('date', { ascending: false });
                if (error) return handleSupabaseError(error, "incomes.getAll");
                
                const transformedData = (data || []).map(income => ({
                    id: income.id,
                    date: income.date,
                    description: income.description,
                    amount: parseFloat(income.amount),
                    categoryId: income.category_id,
                    categoryName: income.income_categories?.name,
                    departmentId: income.department_id,
                    notes: income.notes,
                    createdAt: income.created_at,
                    updatedAt: income.updated_at
                }));
                
                return transformedData;
            } catch (error) {
                return handleSupabaseError(error, "incomes.getAll");
            }
        },
        
        getById: async function(id) {
            try {
                const client = await DB._ensureInitialized();
                if (!id) return null;
                const { data, error } = await client.from('incomes')
                    .select(`
                        *,
                        income_categories(name)
                    `)
                    .eq('id', id)
                    .single();
                
                if (error) {
                    if (error.code === 'PGRST116') return null;
                    return handleSupabaseError(error, `incomes.getById(${id})`);
                }
                
                return {
                    id: data.id,
                    date: data.date,
                    description: data.description,
                    amount: parseFloat(data.amount),
                    categoryId: data.category_id,
                    categoryName: data.income_categories?.name,
                    departmentId: data.department_id,
                    notes: data.notes,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at
                };
            } catch (error) {
                return handleSupabaseError(error, `incomes.getById(${id})`);
            }
        },
        
        getByMonth: async function(year, month) {
            try {
                const client = await DB._ensureInitialized();
                const startDate = new Date(year, month, 1);
                const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
                
                const { data, error } = await client.from('incomes')
                    .select(`
                        *,
                        income_categories(name)
                    `)
                    .gte('date', startDate.toISOString())
                    .lte('date', endDate.toISOString())
                    .order('date', { ascending: false });
                    
                if (error) return handleSupabaseError(error, `incomes.getByMonth(${year}-${month})`);
                
                return (data || []).map(income => ({
                    id: income.id,
                    date: income.date,
                    description: income.description,
                    amount: parseFloat(income.amount),
                    categoryId: income.category_id,
                    categoryName: income.income_categories?.name,
                    departmentId: income.department_id,
                    notes: income.notes,
                    createdAt: income.created_at,
                    updatedAt: income.updated_at
                }));
            } catch (error) {
                return handleSupabaseError(error, `incomes.getByMonth(${year}-${month})`);
            }
        },
        
        getByDateRange: async function(startDate, endDate) {
            try {
                const client = await DB._ensureInitialized();
                const { data, error } = await client.from('incomes')
                    .select(`
                        *,
                        income_categories(name)
                    `)
                    .gte('date', new Date(startDate).toISOString())
                    .lte('date', new Date(endDate).toISOString())
                    .order('date', { ascending: false });
                    
                if (error) return handleSupabaseError(error, `incomes.getByDateRange`);
                
                return (data || []).map(income => ({
                    id: income.id,
                    date: income.date,
                    description: income.description,
                    amount: parseFloat(income.amount),
                    categoryId: income.category_id,
                    categoryName: income.income_categories?.name,
                    departmentId: income.department_id,
                    notes: income.notes,
                    createdAt: income.created_at,
                    updatedAt: income.updated_at
                }));
            } catch (error) {
                return handleSupabaseError(error, `incomes.getByDateRange`);
            }
        },
        
        save: async function(incomeData) {
            try {
                const client = await DB._ensureInitialized();
                
                const dataToSave = {
                    description: incomeData.description,
                    amount: incomeData.amount,
                    category_id: incomeData.categoryId,
                    department_id: incomeData.departmentId,
                    notes: incomeData.notes || null,
                    date: incomeData.date
                };
                
                let resultData, error;
                
                if (incomeData.id) {
                    const response = await client.from('incomes')
                        .update(dataToSave)
                        .eq('id', incomeData.id)
                        .select(`
                            *,
                            income_categories(name)
                        `)
                        .single();
                        
                    resultData = response.data;
                    error = response.error;
                    
                    if (error) return handleSupabaseError(error, `incomes.update(${incomeData.id})`);
                } else {
                    const response = await client.from('incomes')
                        .insert(dataToSave)
                        .select(`
                            *,
                            income_categories(name)
                        `)
                        .single();
                        
                    resultData = response.data;
                    error = response.error;
                    
                    if (error) return handleSupabaseError(error, "incomes.insert");
                }
                
                return {
                    id: resultData.id,
                    date: resultData.date,
                    description: resultData.description,
                    amount: parseFloat(resultData.amount),
                    categoryId: resultData.category_id,
                    categoryName: resultData.income_categories?.name,
                    departmentId: resultData.department_id,
                    notes: resultData.notes,
                    createdAt: resultData.created_at,
                    updatedAt: resultData.updated_at
                };
            } catch (error) {
                return handleSupabaseError(error, "incomes.save");
            }
        },
        
        delete: async function(id) {
            try {
                const client = await DB._ensureInitialized();
                if (!id) return false;
                
                const { error } = await client.from('incomes').delete().eq('id', id);
                
                if (error) {
                    handleSupabaseError(error, `incomes.delete(${id})`);
                    return false;
                }
                return true;
            } catch (error) {
                handleSupabaseError(error, `incomes.delete(${id})`);
                return false;
            }
        }
    },

    // --- Expense Categories ---
    expenseCategories: {
        getAll: async function() {
            try {
                const client = await DB._ensureInitialized();
                const { data, error } = await client.from('expense_categories')
                    .select('*')
                    .order('name');
                    
                if (error) return handleSupabaseError(error, "expenseCategories.getAll");
                
                return (data || []).map(category => ({
                    id: category.id,
                    name: category.name
                }));
            } catch (error) {
                return handleSupabaseError(error, "expenseCategories.getAll");
            }
        },
        
        getById: async function(id) {
            try {
                const client = await DB._ensureInitialized();
                if (!id) return null;
                
                const { data, error } = await client.from('expense_categories')
                    .select('*')
                    .eq('id', id)
                    .single();
                    
                if (error) {
                    if (error.code === 'PGRST116') return null;
                    return handleSupabaseError(error, `expenseCategories.getById(${id})`);
                }
                
                return {
                    id: data.id,
                    name: data.name
                };
            } catch (error) {
                return handleSupabaseError(error, `expenseCategories.getById(${id})`);
            }
        },
        
        save: async function(categoryData) {
            try {
                const client = await DB._ensureInitialized();
                
                const dataToSave = {
                    name: categoryData.name
                };
                
                let resultData, error;
                
                if (categoryData.id) {
                    const response = await client.from('expense_categories')
                        .update(dataToSave)
                        .eq('id', categoryData.id)
                        .select()
                        .single();
                        
                    resultData = response.data;
                    error = response.error;
                    
                    if (error) return handleSupabaseError(error, `expenseCategories.update(${categoryData.id})`);
                } else {
                    const response = await client.from('expense_categories')
                        .insert(dataToSave)
                        .select()
                        .single();
                        
                    resultData = response.data;
                    error = response.error;
                    
                    if (error) return handleSupabaseError(error, "expenseCategories.insert");
                }
                
                return {
                    id: resultData.id,
                    name: resultData.name
                };
            } catch (error) {
                return handleSupabaseError(error, "expenseCategories.save");
            }
        },
        
        delete: async function(id) {
            try {
                const client = await DB._ensureInitialized();
                if (!id) return false;
                
                const { error } = await client.from('expense_categories').delete().eq('id', id);
                
                if (error) {
                    handleSupabaseError(error, `expenseCategories.delete(${id})`);
                    return false;
                }
                return true;
            } catch (error) {
                handleSupabaseError(error, `expenseCategories.delete(${id})`);
                return false;
            }
        }
    },

    // --- Income Categories ---
    incomeCategories: {
        getAll: async function() {
            try {
                const client = await DB._ensureInitialized();
                const { data, error } = await client.from('income_categories')
                    .select('*')
                    .order('name');
                    
                if (error) return handleSupabaseError(error, "incomeCategories.getAll");
                
                return (data || []).map(category => ({
                    id: category.id,
                    name: category.name
                }));
            } catch (error) {
                return handleSupabaseError(error, "incomeCategories.getAll");
            }
        },
        
        getById: async function(id) {
            try {
                const client = await DB._ensureInitialized();
                if (!id) return null;
                
                const { data, error } = await client.from('income_categories')
                    .select('*')
                    .eq('id', id)
                    .single();
                    
                if (error) {
                    if (error.code === 'PGRST116') return null;
                    return handleSupabaseError(error, `incomeCategories.getById(${id})`);
                }
                
                return {
                    id: data.id,
                    name: data.name
                };
            } catch (error) {
                return handleSupabaseError(error, `incomeCategories.getById(${id})`);
            }
        },
        
        save: async function(categoryData) {
            try {
                const client = await DB._ensureInitialized();
                
                const dataToSave = {
                    name: categoryData.name
                };
                
                let resultData, error;
                
                if (categoryData.id) {
                    const response = await client.from('income_categories')
                        .update(dataToSave)
                        .eq('id', categoryData.id)
                        .select()
                        .single();
                        
                    resultData = response.data;
                    error = response.error;
                    
                    if (error) return handleSupabaseError(error, `incomeCategories.update(${categoryData.id})`);
                } else {
                    const response = await client.from('income_categories')
                        .insert(dataToSave)
                        .select()
                        .single();
                        
                    resultData = response.data;
                    error = response.error;
                    
                    if (error) return handleSupabaseError(error, "incomeCategories.insert");
                }
                
                return {
                    id: resultData.id,
                    name: resultData.name
                };
            } catch (error) {
                return handleSupabaseError(error, "incomeCategories.save");
            }
        },
        
        delete: async function(id) {
            try {
                const client = await DB._ensureInitialized();
                if (!id) return false;
                
                const { error } = await client.from('income_categories').delete().eq('id', id);
                
                if (error) {
                    handleSupabaseError(error, `incomeCategories.delete(${id})`);
                    return false;
                }
                return true;
            } catch (error) {
                handleSupabaseError(error, `incomeCategories.delete(${id})`);
                return false;
            }
        }
    },

    // --- Export/Import/Reset Placeholders ---
    export: async function() { console.warn("DB.export() NYI"); alert("Export NYI"); return null; },
    import: async function(jsonData) { console.warn("DB.import() NYI"); alert("Import NYI"); return false; },
    reset: async function() { console.warn("DB.reset() NYI"); alert("Reset NYI"); return false; },

    // --- Utilities ---
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

// --- Cleanup on page unload ---
window.addEventListener('beforeunload', () => {
    if (supabaseClient) {
        // Clean up any realtime subscriptions
        supabaseClient.removeAllChannels();
    }
});

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
            
            if (DB.isInitialized()) {
                console.log('Initial settings loaded successfully post-init.');
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