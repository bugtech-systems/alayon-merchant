// lib/prefetch-offline-data.ts
export async function prefetchOfflineData() {
  const promises = [];
  
  // Prefetch all products
  promises.push(
    fetch('/store/products?limit=1000')
      .then(res => res.json())
      .then(data => {
        localStorage.setItem('cached_products', JSON.stringify(data.products));
      })
  );
  
  // Prefetch categories
  promises.push(
    fetch('/store/product-categories')
      .then(res => res.json())
      .then(data => {
        localStorage.setItem('cached_categories', JSON.stringify(data.product_categories));
      })
  );
  
  // Prefetch regions
  promises.push(
    fetch('/store/regions')
      .then(res => res.json())
      .then(data => {
        localStorage.setItem('cached_regions', JSON.stringify(data.regions));
      })
  );
  
  await Promise.all(promises);
}

// Call this when app loads or user explicitly requests offline mode
export function prepareOfflineMode() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      // Request background sync permission
      if ('sync' in registration) {
        registration.sync.register('prefetch-offline-data');
      }
    });
  }
}