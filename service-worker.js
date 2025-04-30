/**
 * service-worker.js
 * Service Worker pour l'application de Gestion des Salaires Le Sims (Enhanced Version)
 * - Stratégie Network Falling Back to Cache pour les requêtes API Supabase GET
 * - Stratégie Cache First pour les ressources statiques
 * - Placeholders pour Background Sync
 */

// --- Configuration ---
// IMPORTANT: Ensure this URL matches the one in database-supabase.js
const SUPABASE_URL = 'https://efdceibleelherxenduc.supabase.co'; // Get this from your config
const SYNC_TAG = 'database-sync'; // Tag for background sync

// Nom et version des caches
const CACHE_VERSION = 'v2'; // Increment version number when CACHE_FILES change
const STATIC_CACHE_NAME = `le-sims-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `le-sims-dynamic-${CACHE_VERSION}`; // Cache for API responses

// Fichiers statiques à mettre en cache immédiatement
const CACHE_FILES = [
    '/', // Cache the root index
    '/index.html',
    '/css/styles.css',
    '/js/app.js',
    '/js/data-manager.js', // Cache core scripts
    '/js/database-supabase.js',
    '/js/employees.js',
    '/js/salaries.js',
    '/js/advances.js',
    '/js/sanctions.js', // Add if it exists
    '/js/debts.js',
    '/js/reports.js',
    '/assets/logo.png',
    '/assets/icons/icon-192x192.png', // Cache icons referenced in index.html/manifest
    '/manifest.json',
    // Fichiers externes (CDN) - Caching these helps offline but means updates require SW update
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    // Note: Google Fonts caching can be tricky due to how they are served.
    // Caching the main CSS request might work, but font files themselves might vary.
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap'
    // Consider adding an offline fallback page: '/offline.html'
];

// --- Service Worker Lifecycle ---

// Installation: Mise en cache des ressources statiques
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installation - Version:', CACHE_VERSION);
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Mise en cache des ressources statiques:', CACHE_FILES);
                // Use addAll - if one file fails, the whole install fails
                return cache.addAll(CACHE_FILES);
            })
            .then(() => {
                // Forcer l'activation immédiate du nouveau service worker
                console.log('[Service Worker] Skip waiting on install');
                return self.skipWaiting();
            })
            .catch(error => {
                 console.error('[Service Worker] Échec de la mise en cache statique:', error);
                 // Optional: Throw error to prevent SW activation if core assets fail to cache
                 // throw error;
            })
    );
});

// Activation: Nettoyage des anciens caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activation - Version:', CACHE_VERSION);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Supprimer les anciens caches statiques et dynamiques
                    if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
                        console.log('[Service Worker] Suppression de l\'ancien cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[Service Worker] Prise de contrôle des clients');
            // Prendre le contrôle immédiatement sans rechargement de page nécessaire
            return self.clients.claim();
        })
    );
});

// --- Stratégies de Cache ---

// Stratégie: Network Falling Back to Cache (pour les API GET)
const networkFallingBackToCache = async (request) => {
    try {
        const networkResponse = await fetch(request);
        // Si la requête réseau réussit, mettre à jour le cache dynamique
        if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            // Cloner la réponse avant de la mettre en cache car elle ne peut être lue qu'une fois
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // Si la requête réseau échoue (hors ligne), essayer de servir depuis le cache
        console.log(`[Service Worker] Échec réseau pour ${request.url}, tentative depuis le cache.`);
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log(`[Service Worker] Servi depuis le cache: ${request.url}`);
            return cachedResponse;
        } else {
             console.warn(`[Service Worker] Ni réseau ni cache disponible pour: ${request.url}`);
             // Optional: Return a custom offline response for API errors
             // return new Response(JSON.stringify({ error: 'Offline and not cached' }), { headers: { 'Content-Type': 'application/json' }});
             return new Response(null, { status: 503, statusText: 'Service Unavailable (Offline)' }); // Return a generic error response
        }
    }
};

// Stratégie: Cache First, Falling Back to Network (pour les ressources statiques)
const cacheFirstFallingBackToNetwork = async (request) => {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        // Servi depuis le cache statique
        return cachedResponse;
    }

    // Si pas dans le cache, tenter le réseau
    try {
        const networkResponse = await fetch(request);
        // Mettre en cache les nouvelles ressources statiques (JS, CSS, images, etc.) si elles sont valides
        // Vérifier le type de réponse pour éviter de cacher des réponses opaques (ex: CDNs sans CORS) qui peuvent remplir le cache inutilement
        if (networkResponse && networkResponse.ok && request.method === 'GET' && networkResponse.type === 'basic') {
             const cache = await caches.open(STATIC_CACHE_NAME);
             cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.warn(`[Service Worker] Échec réseau (et non en cache) pour: ${request.url}`);
        // Si la requête échoue (et n'est pas dans le cache), retourner une page hors ligne pour la navigation
        if (request.mode === 'navigate') {
            // Consider having a dedicated offline HTML page: return caches.match('/offline.html');
            return caches.match('/index.html'); // Fallback to index.html
        }
        // Pour d'autres types de requêtes échouées (images, etc.), laisser l'erreur se propager
        return new Response(null, { status: 503, statusText: 'Service Unavailable (Offline)' });
    }
};


// Interception des requêtes réseau ('fetch' event)
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // 1. Gérer les requêtes API Supabase (GET uniquement) avec Network Falling Back to Cache
    if (requestUrl.origin === SUPABASE_URL && event.request.method === 'GET') {
        console.log(`[Service Worker] Interception requête API GET Supabase: ${event.request.url}`);
        event.respondWith(networkFallingBackToCache(event.request));
        return; // Important: Ne pas continuer si géré
    }

    // 2. Gérer les requêtes vers les CDN de polices/icônes (Cache First)
    //    (Peut être ajusté si des mises à jour fréquentes sont nécessaires)
    if (requestUrl.origin === 'https://cdnjs.cloudflare.com' || requestUrl.origin === 'https://fonts.googleapis.com' || requestUrl.origin === 'https://fonts.gstatic.com') {
         console.log(`[Service Worker] Interception requête CDN: ${event.request.url}`);
         event.respondWith(cacheFirstFallingBackToNetwork(event.request));
         return;
    }

    // 3. Gérer les requêtes locales (HTML, CSS, JS, images) avec Cache First
    //    Vérifier que l'origine est la même que celle du service worker
    if (requestUrl.origin === self.location.origin) {
         console.log(`[Service Worker] Interception requête locale: ${event.request.url}`);
         event.respondWith(cacheFirstFallingBackToNetwork(event.request));
         return;
    }

    // 4. Pour les autres requêtes (ex: extensions Chrome, etc.), ne pas intercepter
    // console.log(`[Service Worker] Requête non interceptée: ${event.request.url}`);
    // event.respondWith(fetch(event.request)); // Comportement par défaut
});


// --- Background Sync ---

// Importer DataManager ou la logique de synchronisation si nécessaire
// Si DataManager n'est pas accessible globalement ici, utilisez importScripts()
// importScripts('/js/data-manager.js'); // Assurez-vous que DataManager peut s'exécuter ici

self.addEventListener('sync', (event) => {
    console.log('[Service Worker] Événement Sync reçu, tag:', event.tag);
    if (event.tag === SYNC_TAG) {
        console.log('[Service Worker] Lancement de la synchronisation en arrière-plan...');
        event.waitUntil(
            // --- PLACEHOLDER ---
            // Appeler ici la fonction qui exécute la logique de synchronisation
            // Cette fonction doit être définie globalement ou importée.
            // Exemple:
            // DataManager.syncChanges().then(() => {
            //     console.log('[Service Worker] Synchronisation en arrière-plan terminée.');
            //     // Optionnel: Envoyer une notification ou un message au client
            //     // self.clients.matchAll().then(clients => { ... });
            // }).catch(err => {
            //     console.error('[Service Worker] Échec de la synchronisation en arrière-plan:', err);
            //     // Gérer l'échec, peut-être réessayer plus tard si possible?
            // })
            // --- FIN PLACEHOLDER ---
            Promise.resolve().then(() => console.warn('[Service Worker] Logique de synchronisation non implémentée pour le tag:', SYNC_TAG)) // Message temporaire
        );
    }
});


// --- Communication ---

// Gestion des messages reçus depuis le client (ex: skipWaiting)
self.addEventListener('message', (event) => {
    console.log('[Service Worker] Message reçu:', event.data);
    if (event.data && event.data.action === 'skipWaiting') {
        console.log('[Service Worker] Exécution de skipWaiting suite au message.');
        self.skipWaiting();
    }
    // Ajoutez d'autres actions si nécessaire
});