const cache = new Map();

const getCache = (key) => {
    return cache.get(key);
};

const setCache = (key, value) => {
    cache.set(key, value);
};

module.exports = {
    getCache,
    setCache,
};
