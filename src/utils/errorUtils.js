// src/utils/errorUtils.js
export const formatApiError = (error) => {
    if (typeof error === 'string') {
      return { message: error };
    }
  
    return {
      message: error.message || 'An unexpected error occurred',
      details: error.details || null
    };
  };
  
  export const enhanceFetchError = async (response) => {
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP error! status: ${response.status}`
      }));
      
      throw {
        message: error.message || `HTTP error! status: ${response.status}`,
        details: {
          status: response.status,
          statusText: response.statusText,
          ...(error.details || {})
        }
      };
    }
    return response;
  };