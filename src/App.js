// src/App.js

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import {
    CssBaseline,
    Box,
    CircularProgress,
    Alert,
    Toolbar,
    IconButton,
    useMediaQuery,
    Typography
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';

import { toggleDarkMode } from './slices/themeSlice';
import { setSelectedCommodity } from './slices/spatialSlice';
import { monitoringSystem } from './utils/MonitoringSystem';
import { spatialSystem } from './utils/SpatialSystem';
import { unifiedDataManager } from './utils/UnifiedDataManager';
import { verifyDataFiles } from './utils/DataLoader';
import { fetchCommoditiesData } from './slices/commoditiesSlice';
import { TutorialsModal } from './components/discovery/Tutorials';
import MethodologyModal from './components/methodology/MethodologyModal';

import Header from './components/common/Header';
import Sidebar from './components/common/Navigation';
import Dashboard from './Dashboard';
import { lightThemeWithOverrides, darkThemeWithOverrides } from './styles/theme';
import EnhancedErrorBoundary from './components/common/EnhancedErrorBoundary';

import { selectAppState } from './selectors/rootSelectors';

const INITIALIZATION_STATES = {
    INITIALIZING: 'initializing',
    INITIALIZED: 'initialized',
    ERROR: 'error',
    RETRYING: 'retrying'
};

const DEFAULT_COMMODITY = 'beans_white';

const AppContent = () => {
    const dispatch = useDispatch();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const isSmUp = useMediaQuery((theme) => theme.breakpoints.up('sm'));
    const [initializationAttempts, setInitializationAttempts] = useState(0);
    const maxRetryAttempts = 3;

    const [tutorialsOpen, setTutorialsOpen] = useState(false);
    const [methodologyOpen, setMethodologyOpen] = useState(false);

    const handleTutorialsClick = useCallback(() => {
        setTutorialsOpen(true);
    }, []);

    const handleMethodologyClick = useCallback(() => {
        setMethodologyOpen(true);
    }, []);

    const appState = useSelector(selectAppState);

    const {
        isDarkMode,
        selectedCommodity,
        selectedDate,
        selectedRegimes,
        spatialStatus,
        geometriesStatus,
        commoditiesStatus
    } = appState;

    const derivedState = useMemo(() => ({
        isReady: spatialStatus.isInitialized && !spatialStatus.loading,
        hasError: Boolean(spatialStatus.error || geometriesStatus.error),
    }), [spatialStatus, geometriesStatus]);

    const [initState, setInitState] = useState({
        status: INITIALIZATION_STATES.INITIALIZING,
        error: null,
        warnings: []
    });
    const [windowWidth] = useState(window.innerWidth);
    const isMountedRef = useRef(true);

    const isFullyInitialized = derivedState.isReady && commoditiesStatus === 'succeeded';
    const isLoading = spatialStatus.loading || geometriesStatus.loading || commoditiesStatus === 'loading';
    const hasGlobalError = derivedState.hasError;

    const getStatusMessage = useCallback(() => {
        if (isLoading) return 'Loading data...';
        if (!spatialStatus.isInitialized) return 'Initializing spatial analysis...';
        if (!geometriesStatus.isInitialized) return 'Loading geometries...';
        if (commoditiesStatus !== 'succeeded') return 'Loading commodities...';
        return 'Initializing application...';
    }, [isLoading, spatialStatus.isInitialized, geometriesStatus.isInitialized, commoditiesStatus]);

    const initializeApp = useCallback(async (isRetry = false) => {
        const metric = monitoringSystem.startMetric('app-initialization');
        
        try {
            if (isRetry) {
                setInitializationAttempts(prev => prev + 1);
                setInitState(prev => ({
                    ...prev,
                    status: INITIALIZATION_STATES.RETRYING
                }));
            }

            const fileCheck = await verifyDataFiles();
            const missingFiles = fileCheck.filter(f => !f.exists);
            
            if (missingFiles.length > 0) {
                throw new Error(
                    `Missing critical data files:\n${missingFiles
                        .map(f => `${f.file} (${f.path}): ${f.status || f.error}`)
                        .join('\n')}`
                );
            }

            await Promise.all([
                unifiedDataManager.clearCache(),
                unifiedDataManager.init(),
                spatialSystem.initialize()
            ]);

            await Promise.all([
                dispatch(fetchCommoditiesData()).unwrap(),
                dispatch(setSelectedCommodity(DEFAULT_COMMODITY))
            ]);

            if (isMountedRef.current) {
                setInitState({
                    status: INITIALIZATION_STATES.INITIALIZED,
                    error: null,
                    warnings: []
                });
                metric.finish({ status: 'success' });
            }

        } catch (err) {
            console.error('Initialization failed:', err);
            if (isMountedRef.current) {
                metric.finish({ status: 'error', error: err.message });
                setInitState({
                    status: INITIALIZATION_STATES.ERROR,
                    error: err.message,
                    warnings: []
                });
            }
        }
    }, [dispatch]);

    useEffect(() => {
        initializeApp();
        return () => {
            isMountedRef.current = false;
        };
    }, [initializeApp]);

    const handleDrawerToggle = useCallback(() => {
        setSidebarOpen(prev => !prev);
    }, []);

    const handleThemeToggle = useCallback(() => {
        dispatch(toggleDarkMode());
    }, [dispatch]);

    const handleRetry = useCallback(async () => {
        if (initializationAttempts >= maxRetryAttempts) {
            setInitState(prev => ({
                ...prev,
                error: 'Maximum retry attempts reached. Please refresh the page.',
                warnings: [...prev.warnings, 'Maximum retries exceeded']
            }));
            return;
        }
        await initializeApp(true);
    }, [initializeApp, initializationAttempts, maxRetryAttempts]);

    const renderError = useCallback(() => (
        <Box sx={{ p: 3 }}>
            <Alert 
                severity="error" 
                action={
                    <IconButton 
                        color="inherit" 
                        size="small" 
                        onClick={handleRetry}
                        disabled={initializationAttempts >= maxRetryAttempts}
                    >
                        <RefreshIcon />
                    </IconButton>
                }
                icon={<WarningIcon />}
            >
                <Typography variant="body1" gutterBottom>
                    {initState.error}
                </Typography>
                {initState.warnings.length > 0 && (
                    <Typography variant="caption" display="block">
                        {initState.warnings.join('. ')}
                    </Typography>
                )}
            </Alert>
        </Box>
    ), [initState.error, initState.warnings, initializationAttempts, maxRetryAttempts, handleRetry]);

    const renderMainContent = useCallback(() => (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <Header 
                sidebarOpen={sidebarOpen}
                onDrawerToggle={handleDrawerToggle}
                isDarkMode={isDarkMode}
                toggleDarkMode={handleThemeToggle}
                onTutorialsClick={handleTutorialsClick}
            />
            <Sidebar 
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                handleDrawerToggle={handleDrawerToggle}
                isSmUp={isSmUp}
                onMethodologyClick={handleMethodologyClick}
                onTutorialsClick={handleTutorialsClick}
            />
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
                {hasGlobalError ? (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {spatialStatus.error || geometriesStatus.error}
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

            {/* Add Modal Components */}
            <TutorialsModal 
                open={tutorialsOpen}
                onClose={() => setTutorialsOpen(false)}
            />
            <MethodologyModal 
                open={methodologyOpen}
                onClose={() => setMethodologyOpen(false)}
            />
        </Box>
    ), [
        sidebarOpen,
        handleDrawerToggle,
        isDarkMode,
        handleThemeToggle,
        isSmUp,
        spatialStatus.error,
        geometriesStatus.error,
        selectedCommodity,
        selectedDate,
        selectedRegimes,
        windowWidth,
        hasGlobalError,
        handleTutorialsClick,
        handleMethodologyClick,
        tutorialsOpen,    // Add these dependencies
        methodologyOpen   // Add these dependencies
    ]);

    if (!isFullyInitialized || isLoading) {
        return (
            <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                gap: 2
            }}>
                <CircularProgress size={40} />
                <Typography variant="body1" color="textSecondary">
                    {getStatusMessage()}
                </Typography>
            </Box>
        );
    }

    if (initState.status === INITIALIZATION_STATES.ERROR) {
        return renderError();
    }

    return renderMainContent();
};

const App = () => {
    const appState = useSelector(selectAppState);
    const { isDarkMode } = appState;
    const theme = isDarkMode ? darkThemeWithOverrides : lightThemeWithOverrides;

    return (
        <EnhancedErrorBoundary
            onRetry={async () => {
                await unifiedDataManager.clearCache();
                window.location.reload();
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