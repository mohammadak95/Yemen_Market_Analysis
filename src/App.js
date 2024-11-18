// src/App.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import {
    CssBaseline,
    Box,
    CircularProgress,
    Alert,
    Toolbar,
    IconButton,
    useMediaQuery
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

import { toggleDarkMode, selectIsDarkMode } from './slices/themeSlice';
import { loadSpatialData, setSelectedCommodity } from './slices/spatialSlice';
import { monitoringSystem } from './utils/MonitoringSystem';
import { spatialSystem } from './utils/SpatialSystem';
import { unifiedDataManager } from './utils/UnifiedDataManager';
import { verifyDataFiles } from './utils/DataLoader';
import { fetchCommoditiesData } from './slices/commoditiesSlice';

import Header from './components/common/Header';
import Sidebar from './components/common/Navigation';
import Dashboard from './Dashboard';
import { lightThemeWithOverrides, darkThemeWithOverrides } from './styles/theme';
import EnhancedErrorBoundary from './components/common/EnhancedErrorBoundary';

const AppContent = () => {
    const dispatch = useDispatch();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const isSmUp = useMediaQuery((theme) => theme.breakpoints.up('sm'));

    // Redux selectors
    const {
        isDarkMode,
        selectedCommodity,
        selectedDate,
        selectedRegimes,
        spatialStatus // Added spatialStatus
    } = useSelector(state => ({
        isDarkMode: state.theme.isDarkMode,
        selectedCommodity: state.spatial.ui.selectedCommodity,
        selectedDate: state.spatial.ui.selectedDate,
        selectedRegimes: state.spatial.ui.selectedRegimes || [],
        spatialStatus: state.spatial.status // Ensure this exists in your spatialSlice
    }));

    // Local state variables
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState(null);
    const [windowWidth] = useState(window.innerWidth);

    // Ref to track if component is mounted
    const isMountedRef = useRef(true);

    // Initialization effect with mounted flag
    useEffect(() => {
        const initialize = async () => {
            const metric = monitoringSystem.startMetric('app-initialization');

            try {
                // First verify data files are accessible
                const fileCheck = await verifyDataFiles();
                const missingFiles = fileCheck.filter(f => !f.exists);
                
                if (missingFiles.length > 0) {
                    throw new Error(
                        `Missing critical data files:\n${missingFiles
                            .map(f => `${f.file} (${f.path}): ${f.status || f.error}`)
                            .join('\n')}`
                    );
                }

                // Clear any existing data first
                await unifiedDataManager.clearCache();

                // Initialize core systems
                await unifiedDataManager.init();
                await spatialSystem.initialize();

                // Initialize base data
                const defaultCommodity = 'beans_white';

                // Modify fetchCommoditiesData logic as per instructions
                await dispatch(fetchCommoditiesData()).unwrap();
                dispatch(setSelectedCommodity(defaultCommodity)); // Removed unwrap as instructed

                if (isMountedRef.current) {
                    setIsInitializing(false);
                    metric.finish({ status: 'success' });
                }

            } catch (err) {
                console.error('Redux operation failed:', err);
                if (isMountedRef.current) {
                    metric.finish({ status: 'error', error: err.message });
                    setError(err.message);
                    setIsInitializing(false);
                }
            }
        };

        initialize();

        // Cleanup function
        return () => {
            isMountedRef.current = false;
        };
    }, [dispatch]);

    // Handlers
    const handleDrawerToggle = useCallback(() => {
        setSidebarOpen(prev => !prev);
    }, []);

    const handleThemeToggle = useCallback(() => {
        dispatch(toggleDarkMode());
    }, [dispatch]);

    const handleTutorialsClick = useCallback(() => {
        // Implement tutorials handler
        console.log('Tutorials clicked');
    }, []);

    const handleMethodologyClick = useCallback(() => {
        // Implement methodology handler
        console.log('Methodology clicked');
    }, []);

    const handleRetry = useCallback(async () => {
        const metric = monitoringSystem.startMetric('retry-initialization');

        try {
            setIsInitializing(true);
            setError(null);

            // Clear cache and reinitialize
            await unifiedDataManager.clearCache();
            await unifiedDataManager.init();
            await spatialSystem.initialize();

            // Reload initial data
            const defaultCommodity = 'beans_white';
            await dispatch(setSelectedCommodity(defaultCommodity)).unwrap();
            await dispatch(loadSpatialData({
                commodity: defaultCommodity,
                date: selectedDate,
                options: {
                    regimes: selectedRegimes,
                    includeGarch: true,
                    includeConflict: true
                }
            })).unwrap();

            if (isMountedRef.current) { // Ensure component is still mounted
                setIsInitializing(false);
                metric.finish({ status: 'success' });
            }

        } catch (err) {
            if (isMountedRef.current) { // Ensure component is still mounted
                setError(err.message);
                setIsInitializing(false);
                metric.finish({ status: 'error', error: err.message });
                monitoringSystem.error('Retry failed:', err);
            }
        }
    }, [dispatch, selectedDate, selectedRegimes]);

    // Loading state
    if (isInitializing) {
        return (
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh' 
            }}>
                <CircularProgress />
            </Box>
        );
    }

    // Error state
    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert 
                    severity="error" 
                    action={
                        <IconButton 
                            color="inherit" 
                            size="small" 
                            onClick={handleRetry}
                        >
                            <RefreshIcon />
                        </IconButton>
                    }
                >
                    {error}
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/* Header */}
            <Header 
                sidebarOpen={sidebarOpen}
                onDrawerToggle={handleDrawerToggle}
                isDarkMode={isDarkMode}
                toggleDarkMode={handleThemeToggle}
                onTutorialsClick={handleTutorialsClick}
            />
            {/* Sidebar */}
            <Sidebar 
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                handleDrawerToggle={handleDrawerToggle}
                onMethodologyClick={handleMethodologyClick}
                onTutorialsClick={handleTutorialsClick}
                isSmUp={isSmUp}
            />
            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { sm: `calc(100% - 240px)` },
                    ml: { sm: sidebarOpen ? '240px' : 0 }
                }}
            >
                <Toolbar />
                {spatialStatus.error ? (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {spatialStatus.error}
                    </Alert>
                ) : (
                    <Dashboard 
                        selectedCommodity={selectedCommodity}
                        selectedDate={selectedDate}
                        selectedRegimes={selectedRegimes}
                        windowWidth={windowWidth}
                    />
                )}
            </Box>
        </Box>
    );
};

const App = () => {
    const isDarkMode = useSelector(selectIsDarkMode);
    const theme = isDarkMode ? darkThemeWithOverrides : lightThemeWithOverrides;

    return (
        <EnhancedErrorBoundary
            onRetry={async () => {
                // Custom retry logic if needed
                // For example, you can dispatch a global retry action or reset specific states
                console.log('Retrying after error...');
            }}
        >
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <AppContent />
            </ThemeProvider>
        </EnhancedErrorBoundary>
    );
};

export default App;