export function findObjectsByIds(ids, objects, idField = 'id') {
    return ids.map(id => objects.find(obj => obj[idField] === id)).filter(obj => obj);
}


export function sortByDateOldestFirst(items, dateField = 'created_at') {
    return [...items].sort((a, b) => new Date(a[dateField]) - new Date(b[dateField]));
}