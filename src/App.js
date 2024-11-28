import React, { useState, useCallback, useEffect, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import { ThemeProvider } from '@mui/material/styles';
import {
  CssBaseline,
  Toolbar,
  IconButton,
  Box,
  useMediaQuery,
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import MenuIcon from '@mui/icons-material/Menu';
import { styled } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import { toggleDarkMode } from './slices/themeSlice';
import Header from './components/common/Header';
import { Sidebar } from './components/common/Navigation';
import Dashboard from './Dashboard';
import { useDashboardData } from './hooks/useDashboardData';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorDisplay from './components/common/ErrorDisplay';
import EnhancedErrorBoundary from './components/common/EnhancedErrorBoundary';
import MethodologyModal from './components/methodology/MethodologyModal';
import { TutorialsModal } from './components/discovery/Tutorials';
import { WelcomeModal } from './components/common/WelcomeModal';
import StateExporter from './components/utils/StateExporter';
import { selectHasSeenWelcome, setHasSeenWelcome } from './store/welcomeModalSlice';
import { useWindowSize } from './hooks';
import {
  lightThemeWithOverrides,
  darkThemeWithOverrides,
} from './styles/theme';
import { 
  fetchAllSpatialData, 
  fetchFlowData,
  selectSpatialData,
  selectLoadingStatus,
  selectError 
} from './slices/spatialSlice';

const DRAWER_WIDTH = 240;
const DEFAULT_DATE = '2020-10-01';

const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['margin-left', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  [theme.breakpoints.up('sm')]: {
    width: `calc(100% - ${open ? DRAWER_WIDTH : 0}px)`,
    marginLeft: open ? `${DRAWER_WIDTH}px` : 0,
  },
}));

const App = () => {
  const dispatch = useDispatch();
  const { spatialData, loading, fetchData } = useDashboardData(DEFAULT_DATE);
  const isDarkMode = useSelector((state) => state.theme?.isDarkMode ?? false);
  const error = useSelector(selectError);
  const hasSeenWelcome = useSelector(selectHasSeenWelcome);

  const theme = useMemo(
    () => (isDarkMode ? darkThemeWithOverrides : lightThemeWithOverrides),
    [isDarkMode]
  );

  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
  const windowSize = useWindowSize();

  // Individual state variables
  const [sidebarOpen, setSidebarOpen] = useState(isSmUp);
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [selectedDate, setSelectedDate] = useState(DEFAULT_DATE);
  const [selectedAnalysis, setSelectedAnalysis] = useState('');
  const [selectedGraphRegimes, setSelectedGraphRegimes] = useState(['unified']);
  const [spatialViewConfig, setSpatialViewConfig] = useState({
    center: [15.3694, 44.191],
    zoom: 6,
  });
  const [modalStates, setModalStates] = useState({
    methodology: false,
    tutorials: false,
  });

  useEffect(() => {
    if (!spatialData?.commodities?.length && !loading) {
      fetchData('', DEFAULT_DATE);
    }
  }, [fetchData, spatialData, loading]);

  useEffect(() => {
    if (spatialData?.commodities?.length && !selectedCommodity) {
      const defaultCommodity = spatialData.commodities[0]?.toLowerCase();
      if (defaultCommodity) {
        setSelectedCommodity(defaultCommodity);
        fetchData(defaultCommodity, DEFAULT_DATE);
      }
    }
  }, [spatialData, selectedCommodity, fetchData]);

  const handleCommodityChange = useCallback((newCommodity) => {
    if (newCommodity && newCommodity !== selectedCommodity) {
      setSelectedCommodity(newCommodity);

      Promise.all([
        dispatch(fetchAllSpatialData({
          commodity: newCommodity,
          date: selectedDate || DEFAULT_DATE
        })),
        dispatch({
          type: 'analysis/refreshData',
          payload: { commodity: newCommodity }
        })
      ]).catch(error => {
        console.error('Error updating commodity data:', error);
      });
    }
  }, [dispatch, selectedCommodity, selectedDate]);

  const fetchDataOnce = useCallback(async () => {
    if (!spatialData?.commodities) {
      try {
        console.log('Fetching initial data...');
        await dispatch(fetchAllSpatialData({ 
          commodity: '', 
          date: DEFAULT_DATE 
        }));
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    }
  }, [dispatch, spatialData]);

  useEffect(() => {
    fetchDataOnce();
  }, [fetchDataOnce]);

  useEffect(() => {
    if (spatialData?.commodities?.length) {
      const availableCommodities = spatialData.commodities.map(c => c.toLowerCase());
      if (availableCommodities.length && !selectedCommodity) {
        setSelectedCommodity(availableCommodities[0]);
      }
    }
  }, [spatialData]);

  const handleToggleDarkMode = useCallback(() => {
    dispatch(toggleDarkMode());
  }, [dispatch]);

  const handleDrawerToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleModalToggle = useCallback((modalName, isOpen) => {
    if (modalName === 'welcome') {
      return;
    }
    setModalStates(prev => ({ ...prev, [modalName]: isOpen }));
  }, []);

  const handleWelcomeModalClose = useCallback((dontShowAgain) => {
    dispatch(setHasSeenWelcome(dontShowAgain));
  }, [dispatch]);

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        title="Application Error"
        showDetails={process.env.NODE_ENV !== 'production'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <EnhancedErrorBoundary>
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
          <StyledAppBar position="fixed" open={sidebarOpen && isSmUp}>
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="toggle drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ marginRight: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Header
                isDarkMode={isDarkMode}
                toggleDarkMode={handleToggleDarkMode}
                onTutorialsClick={() => handleModalToggle('tutorials', true)}
              />
            </Toolbar>
          </StyledAppBar>

          <Sidebar
            commodities={spatialData?.commodities?.map(c => c.toLowerCase()) || []}
            regimes={spatialData?.regimes || ['unified', 'north', 'south']}
            selectedCommodity={selectedCommodity.toLowerCase()}
            setSelectedCommodity={handleCommodityChange}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedAnalysis={selectedAnalysis}
            setSelectedAnalysis={setSelectedAnalysis}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            isSmUp={isSmUp}
            onMethodologyClick={() => handleModalToggle('methodology', true)}
            onTutorialsClick={() => handleModalToggle('tutorials', true)}
            selectedRegimes={selectedGraphRegimes}
            setSelectedRegimes={setSelectedGraphRegimes}
            onOpenWelcomeModal={() => handleModalToggle('welcome', true)}
            handleDrawerToggle={handleDrawerToggle}
          />

          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
              ml: { sm: `${DRAWER_WIDTH}px` },
            }}
          >
            <Toolbar />
            <Dashboard
              spatialData={spatialData}
              selectedCommodity={selectedCommodity}
              selectedDate={selectedDate}
              selectedRegimes={selectedGraphRegimes}
              selectedAnalysis={selectedAnalysis}
              windowWidth={windowSize.width}
              spatialViewConfig={spatialViewConfig}
              onSpatialViewChange={setSpatialViewConfig}
            />
          </Box>

          <StateExporter />

          <MethodologyModal
            open={modalStates.methodology}
            onClose={() => handleModalToggle('methodology', false)}
          />
          <TutorialsModal
            open={modalStates.tutorials}
            onClose={() => handleModalToggle('tutorials', false)}
          />
          <WelcomeModal
            open={!hasSeenWelcome}
            onClose={handleWelcomeModalClose}
          />
        </Box>
      </EnhancedErrorBoundary>
    </ThemeProvider>
  );
};

export default App;
