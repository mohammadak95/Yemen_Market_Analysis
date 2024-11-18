// src/Dashboard.js

import React, { Suspense, useMemo, useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Grid, Paper, Alert, AlertTitle } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';

import InteractiveChart from './components/interactive_graph/InteractiveChart';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import AnalysisWrapper from './components/common/AnalysisWrapper';
import SpatialAnalysis from './components/analysis/spatial-analysis/SpatialAnalysis';
import { useMarketAnalysis } from './hooks/useMarketAnalysis';
import { monitoringSystem } from './utils/MonitoringSystem';
import { dataTransformationSystem } from './utils/DataTransformationSystem';
import { unifiedDataManager } from './utils/UnifiedDataManager';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    TimeScale,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

import {
    ECMAnalysis,
    PriceDifferentialAnalysis,
    TVMIIAnalysis
} from './utils/dynamicImports';

import { generateAnalysis } from './slices/analysisSlice';
import { selectAnalysisResults } from './slices/analysisSlice';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    TimeScale,
    Tooltip,
    Legend,
    Filler
);

const Dashboard = React.memo(({
    selectedAnalysis,
    selectedCommodity,
    selectedRegimes,
    selectedDate,
    windowWidth,
}) => {
    const dispatch = useDispatch();

    // Enhanced Redux selectors
    const validationStatus = useSelector(state => state?.spatial?.validation || {});
    const analysisResults = useSelector(state => state?.analysis?.results);
    const spatialStatus = useSelector(state => state?.spatial?.status || {});

    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Enhanced initialization check
    const canLoadData = useMemo(() => {
        return Boolean(
            selectedCommodity && 
            Array.isArray(selectedRegimes) && 
            selectedRegimes.length > 0 &&
            !spatialStatus.loading
        );
    }, [selectedCommodity, selectedRegimes, spatialStatus.loading]);

    // Load dashboard data with enhanced error handling
    const loadDashboardData = useCallback(async () => {
        if (!canLoadData) {
            setLoading(false);
            return;
        }

        const metric = monitoringSystem.startMetric('load-dashboard-data');
        setLoading(true);
        setError(null);
        
        try {
            // Validate input parameters
            if (!selectedCommodity || !selectedRegimes?.length) {
                throw new Error('Please select a commodity and at least one market');
            }

            // Load spatial data
            const result = await unifiedDataManager.loadSpatialData(
                selectedCommodity,
                selectedDate,
                { 
                    regimes: selectedRegimes,
                    validateData: true 
                }
            );
            
            if (!result) {
                throw new Error('No data available for the selected parameters');
            }

            setDashboardData(result);
            
            // Generate analysis if we have data
            if (result) {
                await dispatch(generateAnalysis({
                    commodity: selectedCommodity,
                    date: selectedDate,
                    options: { 
                        timeframe: 'monthly',
                        includeValidation: true
                    }
                }));
            }

            metric.finish({ 
                status: 'success',
                dataPoints: result?.timeSeriesData?.length || 0
            });
            
        } catch (err) {
            const errorMessage = err.message || 'Error loading dashboard data';
            setError(errorMessage);
            metric.finish({ status: 'error', error: errorMessage });
            monitoringSystem.error('Dashboard data loading error:', {
                error: err,
                parameters: {
                    commodity: selectedCommodity,
                    regimes: selectedRegimes,
                    date: selectedDate
                }
            });
        } finally {
            setLoading(false);
        }
    }, [canLoadData, selectedCommodity, selectedDate, selectedRegimes, dispatch]);

    // Enhanced useEffect with cleanup
    useEffect(() => {
        let mounted = true;

        if (mounted) {
            loadDashboardData();
        }

        return () => {
            mounted = false;
        };
    }, [loadDashboardData]);

    // Enhanced data processing with error handling
    const processedData = useMemo(() => {
        if (!dashboardData?.timeSeriesData) {
            monitoringSystem.log('No time series data available', {
                hasData: Boolean(dashboardData),
                commodity: selectedCommodity,
                regimes: selectedRegimes
            });
            return [];
        }

        try {
            return dataTransformationSystem.transformTimeSeriesData(
                dashboardData.timeSeriesData,
                {
                    timeUnit: 'month',
                    aggregationType: 'mean',
                    includeGarch: true,
                    includeConflict: true,
                    validate: true
                }
            );
        } catch (err) {
            monitoringSystem.error('Time series data processing error:', err);
            return [];
        }
    }, [dashboardData, selectedCommodity, selectedRegimes]);

    // Get market analysis data
    const { 
        marketMetrics, 
        timeSeriesAnalysis, 
        spatialAnalysis 
    } = useMarketAnalysis(dashboardData);

    // Handle analysis component selection
    const getAnalysisComponent = useCallback((type) => {
        const componentMap = {
            ecm: ECMAnalysis,
            priceDiff: PriceDifferentialAnalysis,
            spatial: SpatialAnalysis,
            tvmii: TVMIIAnalysis,
        };

        return componentMap[type] || null;
    }, []);

    // Render interactive chart
    const renderInteractiveChart = useCallback(() => {
        if (!selectedCommodity || !selectedRegimes?.length) {
            return (
                <ErrorMessage 
                    message="Please select at least one regime and a commodity from the sidebar." 
                />
            );
        }

        if (!processedData.length) {
            return <LoadingSpinner />;
        }

        return (
            <InteractiveChart
                data={processedData}
                selectedCommodity={selectedCommodity}
                selectedRegimes={selectedRegimes}
            />
        );
    }, [processedData, selectedCommodity, selectedRegimes]);

    // Render analysis component
    const renderAnalysisComponent = useCallback(() => {
        if (!selectedAnalysis) return null;

        const AnalysisComponent = getAnalysisComponent(selectedAnalysis);
        if (!AnalysisComponent) {
            return <ErrorMessage message="Selected analysis type is not available." />;
        }

        const commonProps = {
            selectedCommodity,
            windowWidth,
            data: dashboardData,
            marketMetrics,
            timeSeriesAnalysis,
            spatialAnalysis
        };

        return (
            <Suspense fallback={<LoadingSpinner />}>
                <AnalysisWrapper>
                    <AnalysisComponent {...commonProps} />
                </AnalysisWrapper>
            </Suspense>
        );
    }, [
        selectedAnalysis,
        selectedCommodity,
        windowWidth,
        dashboardData,
        marketMetrics,
        timeSeriesAnalysis,
        spatialAnalysis,
        getAnalysisComponent
    ]);

    // Render loading state with context
    if (loading) {
        return (
            <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%',
                gap: 2
            }}>
                <LoadingSpinner />
                <Alert severity="info" sx={{ maxWidth: 400 }}>
                    Loading data for {selectedCommodity || 'selected commodity'}...
                </Alert>
            </Box>
        );
    }

    // Enhanced error display with retry option
    if (error) {
        return (
            <ErrorMessage 
                message={error}
                retry={loadDashboardData}
                details={`Commodity: ${selectedCommodity}, Markets: ${selectedRegimes?.join(', ')}`}
            />
        );
    }

    // Show initial state message if needed
    if (!canLoadData) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="info">
                    <AlertTitle>Select Parameters</AlertTitle>
                    Please select a commodity and at least one market from the sidebar to view analysis.
                </Alert>
            </Box>
        );
    }

    // Show validation warnings if any
    const showValidationWarnings = validationStatus?.warnings?.length > 0;

    return (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%', 
            overflow: 'hidden' 
        }}>
            {showValidationWarnings && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    <AlertTitle>Data Quality Warnings</AlertTitle>
                    <Box component="ul" sx={{ pl: 2, m: 0 }}>
                        {validationStatus.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                        ))}
                    </Box>
                </Alert>
            )}

            <Grid container spacing={2} sx={{ flexGrow: 1, overflow: 'auto' }}>
                <Grid item xs={12}>
                    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
                        <Box sx={{
                            width: '100%',
                            height: { xs: '300px', sm: '400px', md: '500px' },
                            position: 'relative'
                        }}>
                            {renderInteractiveChart()}
                        </Box>
                    </Paper>
                </Grid>

                {selectedAnalysis && (
                    <Grid item xs={12}>
                        {renderAnalysisComponent()}
                    </Grid>
                )}

                {marketMetrics && (
                    <Grid item xs={12}>
                        <Paper elevation={2} sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <strong>Market Coverage:</strong> {marketMetrics.marketCoverage}%
                                </div>
                                <div>
                                    <strong>Integration Level:</strong> {marketMetrics.integrationLevel}%
                                </div>
                                <div>
                                    <strong>Stability:</strong> {marketMetrics.stability}%
                                </div>
                            </Box>
                        </Paper>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
});

Dashboard.displayName = 'Dashboard';

Dashboard.propTypes = {
    selectedAnalysis: PropTypes.string,
    selectedCommodity: PropTypes.string.isRequired,
    selectedRegimes: PropTypes.arrayOf(PropTypes.string).isRequired,
    selectedDate: PropTypes.string,
    windowWidth: PropTypes.number.isRequired,
};

export default Dashboard;