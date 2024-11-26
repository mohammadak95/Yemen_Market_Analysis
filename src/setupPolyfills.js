console.log('Loading polyfills...');

// Set up setImmediate polyfill
if (!global.setImmediate) {
  global.setImmediate = (callback, ...args) => setTimeout(callback, 0, ...args);
}

// Set up clearImmediate polyfill
if (!global.clearImmediate) {
  global.clearImmediate = id => clearTimeout(id);
}

console.log('Polyfills loaded successfully');
