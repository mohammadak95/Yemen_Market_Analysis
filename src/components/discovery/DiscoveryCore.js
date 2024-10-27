// src/components/discovery/DiscoveryCore.js

import React, { Suspense, useCallback, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Collapse,
  CircularProgress,
  Tooltip,
  Paper,
  Alert,
  AlertTitle,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  X,
  ChevronRight,
  ChevronDown,
  PlayCircle,
  CheckCircle,
  Circle,
  HelpCircle,
} from 'lucide-react';
import { useDiscovery } from '../../context/DiscoveryContext';
import InteractiveDemoContainer from './InteractiveDemoContainer';
import ProgressTracker from './progress/ProgressTracker';
import ContentPreview from './ContentPreview';
import { discoveryPaths } from '../../config/discoveryConfig';
import { useDiscoveryIntegration } from '../../hooks/useDiscoveryIntegration';

// DiscoveryNavigation Component
const DiscoveryNavigation = ({ onPathSelect, onSectionSelect }) => {
  const theme = useTheme();
  const { state, startPath } = useDiscovery();
  const [expandedPath, setExpandedPath] = useState(state.currentPath);

  const handlePathClick = useCallback((pathId) => {
    setExpandedPath(expandedPath === pathId ? null : pathId);
    onPathSelect(pathId);
    if (!state.progress[pathId]?.started) {
      startPath(pathId);
    }
  }, [expandedPath, onPathSelect, state.progress, startPath]);

  const getPathProgress = useCallback((pathId) => {
    const completedSections = Object.values(state.completedSections[pathId] || {})
      .filter(section => section.completed).length;
    const totalSections = discoveryPaths.find(p => p.id === pathId)?.sections.length || 0;
    return { completed: completedSections, total: totalSections };
  }, [state.completedSections]);

  return (
    <List component="nav">
      {discoveryPaths.map((path) => (
        <React.Fragment key={path.id}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handlePathClick(path.id)}
              selected={state.currentPath === path.id}
            >
              <ListItemIcon>
                {path.icon && React.createElement(path.icon, { size: 20 })}
              </ListItemIcon>
              <ListItemText 
                primary={path.title}
                secondary={(() => {
                  const progress = getPathProgress(path.id);
                  return `${progress.completed}/${progress.total} completed`;
                })()}
              />
              {expandedPath === path.id ? <ChevronDown /> : <ChevronRight />}
            </ListItemButton>
          </ListItem>
          <Collapse in={expandedPath === path.id} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {path.sections.map((section) => (
                <ListItem
                  key={section.id}
                  disablePadding
                  sx={{ pl: 4 }}
                >
                  <ListItemButton
                    onClick={() => onSectionSelect(path.id, section.id)}
                    selected={state.currentPath === path.id && state.currentSection === section.id}
                  >
                    <ListItemIcon>
                      {state.completedSections[path.id]?.[section.id]?.completed ? (
                        <CheckCircle size={20} color={theme.palette.success.main} />
                      ) : state.currentSection === section.id ? (
                        <PlayCircle size={20} color={theme.palette.primary.main} />
                      ) : (
                        <Circle size={20} />
                      )}
                    </ListItemIcon>
                    <ListItemText primary={section.title} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>
        </React.Fragment>
      ))}
    </List>
  );
};

// DiscoveryLaunch Component
const DiscoveryLaunch = ({
  type = 'analysis',
  id,
  tooltip = 'Learn More',
  icon: Icon = HelpCircle,
  size = 'small'
}) => {
  const { openDiscovery } = useDiscoveryIntegration();

  return (
    <Tooltip title={tooltip}>
      <IconButton
        onClick={() => openDiscovery(type, id)}
        size={size}
        sx={{
          '&:hover': {
            color: 'primary.main',
          },
        }}
      >
        <Icon size={size === 'small' ? 16 : 20} />
      </IconButton>
    </Tooltip>
  );
};

// DiscoveryProvider Component
const DiscoveryProvider = ({ children }) => {
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
  const { isDiscoveryOpen, currentPath, closeDiscovery } = useDiscoveryIntegration();

  return (
    <>
      {children}
      <Dialog
        open={isDiscoveryOpen}
        onClose={closeDiscovery}
        fullScreen={!isSmUp}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            height: isSmUp ? '90vh' : '100vh',
            maxWidth: theme.breakpoints.values.xl,
          },
        }}
      >
        <DialogTitle
          sx={{
            m: 0,
            p: 2,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {currentPath?.title || 'Learning Center'}
          <IconButton
            aria-label="close"
            onClick={closeDiscovery}
            sx={{ color: 'inherit' }}
          >
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          <Suspense fallback={<LoadingFallback />}>
            {currentPath?.component && <currentPath.component />}
          </Suspense>
        </DialogContent>
      </Dialog>
    </>
  );
};

// DiscoverySystem Component
const DiscoverySystem = () => {
  const { state, completeSection, updateProgress } = useDiscovery();
  const [activeSection, setActiveSection] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setActiveSection(state.currentSection);
  }, [state.currentSection]);

  const handleSectionComplete = useCallback((sectionId, data) => {
    completeSection(sectionId, data);
    updateProgress(state.currentPath, {
      lastCompleted: new Date().toISOString(),
      [`sections.${sectionId}.completed`]: true,
    });
  }, [completeSection, updateProgress, state.currentPath]);

  if (!state.currentPath) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        <AlertTitle>Welcome to Discovery</AlertTitle>
        Select a learning path from the navigation to begin.
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      <Box sx={{ width: 280, borderRight: 1, borderColor: 'divider' }}>
        <DiscoveryNavigation />
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {activeSection && (
          <Paper sx={{ m: 2 }}>
            <InteractiveDemoContainer
              section={activeSection}
              onComplete={(data) => handleSectionComplete(activeSection.id, data)}
            />
          </Paper>
        )}
        <ProgressTracker pathId={state.currentPath} />
      </Box>
      {showPreview && (
        <ContentPreview
          onClose={() => setShowPreview(false)}
          onStart={() => {
            setShowPreview(false);
            // Handle content start
          }}
        />
      )}
    </Box>
  );
};

// Prop Types
DiscoveryNavigation.propTypes = {
  onPathSelect: PropTypes.func.isRequired,
  onSectionSelect: PropTypes.func.isRequired,
};

DiscoveryLaunch.propTypes = {
  type: PropTypes.string,
  id: PropTypes.string.isRequired,
  tooltip: PropTypes.string,
  icon: PropTypes.elementType,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
};

DiscoveryProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// Loading Fallback Component
const LoadingFallback = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100%', 
      minHeight: 400 
    }}
  >
    <CircularProgress />
  </Box>
);

// Exports
export {
  DiscoveryProvider,
  DiscoveryLaunch,
  DiscoveryNavigation,
  DiscoverySystem,
};

export default DiscoverySystem;