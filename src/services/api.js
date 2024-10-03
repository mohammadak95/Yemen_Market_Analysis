// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
});

export const fetchECMData = () => api.get('/ecm-data');
export const fetchPriceDiffData = () => api.get('/price-diff-data');
export const fetchSpatialData = () => api.get('/spatial-data');