// src/index.js

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { store } from './store/index';
import App from './App';
import Dashboard from './Dashboard';
import LoadingSpinner from './components/common/LoadingSpinner';
import NotFound from './components/common/NotFound';
import './index.css';

const ECMAnalysis = React.lazy(() => import('./components/ecm-analysis/ECMAnalysis'));
const PriceDifferentialAnalysis = React.lazy(() => import('./components/price-differential-analysis/PriceDifferentialAnalysis'));
const SpatialAnalysis = React.lazy(() => import('./components/spatial-analysis/SpatialAnalysis'));

const basePath = process.env.NODE_ENV === 'production' ? '/Yemen_Market_Analysis' : '';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <Router basename={basePath}>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<App />}>
              <Route index element={<Dashboard />} />
              <Route path="ecm" element={<ECMAnalysis />} />
              <Route path="price-diff" element={<PriceDifferentialAnalysis />} />
              <Route path="spatial" element={<SpatialAnalysis />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </Provider>
  </React.StrictMode>
);