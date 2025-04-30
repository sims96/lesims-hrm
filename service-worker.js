/**
 * service-worker.js
 * Service Worker pour l'application de Gestion des Salaires Le Sims
 * Permet le fonctionnement hors ligne et l'installation comme PWA
 */

// Nom et version du cache
const CACHE_NAME = 'le-sims-salary-manager-v1';

// Fichiers à mettre en cache
const CACHE_FILES = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/database-indexeddb.js',
    '/js/app.js',
    '/js/employees.js',
    '/js/salaries.js',
    '/js/advances.js',
    '/js/sanctions.js',
    '/js/debts.js',
    '/js/reports.js',
    '/assets/logo.png',
    '/manifest.json',
    // Fichiers externes (CDN)
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installation');
    
    // Préchargement des ressources
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Mise en cache des ressources');
                return cache.addAll(CACHE_FILES);
            })
            .then(() => {
                // Forcer l'activation immédiate du service worker
                return self.skipWaiting();
            })
    );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activation');
    
    // Supprimer les anciens caches
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Suppression de l\'ancien cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Prendre le contrôle de tous les clients sans recharger
            return self.clients.claim();
        })
    );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
    // Stratégie Cache First puis Network
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Si la ressource est dans le cache, la retourner
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Sinon, faire la requête au réseau
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Ne pas mettre en cache les requêtes qui ne sont pas GET
                        if (event.request.method !== 'GET') {
                            return networkResponse;
                        }
                        
                        // Ne pas mettre en cache si la réponse n'est pas valide
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }
                        
                        // Mettre en cache la nouvelle ressource
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return networkResponse;
                    })
                    .catch(() => {
                        // Si la requête échoue (hors ligne), retourner une page spécifique pour certaines requêtes
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});

// Gestion des messages envoyés au Service Worker
self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});