// src/Dashboard.js

import React, { Suspense, useMemo, useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Grid, Paper, Alert, AlertTitle } from '@mui/material';
import { useSelector } from 'react-redux';

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

// Import analysis components using dynamic imports
import {
    ECMAnalysis,
    PriceDifferentialAnalysis,
    TVMIIAnalysis
} from './utils/dynamicImports';

// Register ChartJS components
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
    // Local state for dashboard data
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Get validation status from Redux
    const validationStatus = useSelector(state => state.spatial.validation);

    // Load data using unified data manager
    useEffect(() => {
        const loadDashboardData = async () => {
            const metric = monitoringSystem.startMetric('load-dashboard-data');
            setLoading(true);
            
            try {
                const result = await unifiedDataManager.loadDashboardData(
                    selectedCommodity,
                    selectedDate,
                    { selectedRegimes }
                );
                
                setDashboardData(result);
                metric.finish({ status: 'success' });
                
            } catch (err) {
                setError(err.message);
                metric.finish({ status: 'error', error: err.message });
                monitoringSystem.error('Error loading dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        if (selectedCommodity && selectedRegimes?.length > 0) {
            loadDashboardData();
        }
    }, [selectedCommodity, selectedDate, selectedRegimes]);

    // Process time series data using data transformation system
    const processedData = useMemo(() => {
        if (!dashboardData?.timeSeriesData) {
            monitoringSystem.log('No time series data available');
            return [];
        }

        try {
            return dataTransformationSystem.transformTimeSeriesData(
                dashboardData.timeSeriesData,
                {
                    includeGarch: true,
                    includeConflict: true
                }
            );
        } catch (err) {
            monitoringSystem.error('Error processing time series data:', err);
            return [];
        }
    }, [dashboardData]);

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

    // Show loading state
    if (loading) {
        return (
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%' 
            }}>
                <LoadingSpinner />
            </Box>
        );
    }

    // Show error state
    if (error) {
        return (
            <ErrorMessage 
                message={error}
                retry={() => unifiedDataManager.clearCache()}
            />
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