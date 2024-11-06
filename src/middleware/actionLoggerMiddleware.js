// src/middleware/actionLoggerMiddleware.js

const actionLoggerMiddleware = (storeAPI) => (next) => (action) => {
    console.log('Dispatching Action:', action);
    const result = next(action);
    console.log('Next State:', storeAPI.getState());
    return result;
  };
  
  export default actionLoggerMiddleware;
  