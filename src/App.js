// src/App.js

import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import {
    CssBaseline,
    Box,
    CircularProgress,
    Alert,
    Toolbar,
    IconButton
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useSelector, useDispatch } from 'react-redux';

import { toggleDarkMode } from './slices/themeSlice';
import { loadSpatialData, setSelectedCommodity } from './slices/spatialSlice';
import { monitoringSystem } from './utils/MonitoringSystem';
import { spatialSystem } from './utils/SpatialSystem';
import { unifiedDataManager } from './utils/UnifiedDataManager';

import Header from './components/common/Header';
import Sidebar from './components/common/Navigation';
import Dashboard from './Dashboard';
import { lightThemeWithOverrides, darkThemeWithOverrides } from './styles/theme';

function App() {
    const dispatch = useDispatch();
    
    // Redux state
    const isDarkMode = useSelector(state => state.theme.isDarkMode);
    const spatialStatus = useSelector(state => state.spatial.status);
    const selectedCommodity = useSelector(state => state.spatial.ui.selectedCommodity);
    const selectedDate = useSelector(state => state.spatial.ui.selectedDate);

    // Local state
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Initialize app
    useEffect(() => {
        const initialize = async () => {
            const metric = monitoringSystem.startMetric('app-initialization');
            
            try {
                // Initialize core systems
                await Promise.all([
                    unifiedDataManager.init(),
                    spatialSystem.initialize()
                ]);
                
                // Load initial data
                const defaultCommodity = 'beans_white';
                dispatch(setSelectedCommodity(defaultCommodity));
                
                await dispatch(loadSpatialData({
                    selectedCommodity: defaultCommodity,
                    selectedDate: null
                })).unwrap();

                setIsInitializing(false);
                metric.finish({ status: 'success' });
                
            } catch (err) {
                setError(err.message);
                setIsInitializing(false);
                metric.finish({ status: 'error', error: err.message });
                monitoringSystem.error('Initialization failed:', err);
            }
        };

        initialize();
    }, [dispatch]);

    // Handlers
    const handleDrawerToggle = useCallback(() => {
        setSidebarOpen(prev => !prev);
    }, []);

    const handleThemeToggle = useCallback(() => {
        dispatch(toggleDarkMode());
    }, [dispatch]);

    const handleRetry = useCallback(() => {
        window.location.reload();
    }, []);

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
                            Retry
                        </IconButton>
                    }
                >
                    {error}
                </Alert>
            </Box>
        );
    }

    return (
        <ThemeProvider theme={isDarkMode ? darkThemeWithOverrides : lightThemeWithOverrides}>
            <CssBaseline />
            <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                {/* Header */}
                <Header 
                    sidebarOpen={sidebarOpen}
                    onDrawerToggle={handleDrawerToggle}
                    isDarkMode={isDarkMode}
                    onThemeToggle={handleThemeToggle}
                />

                {/* Sidebar */}
                <Sidebar 
                    open={sidebarOpen}
                    onClose={handleDrawerToggle}
                    selectedCommodity={selectedCommodity}
                    selectedDate={selectedDate}
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
                        />
                    )}
                </Box>
            </Box>
        </ThemeProvider>
    );
}

export default App;