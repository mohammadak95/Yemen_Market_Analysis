// src/components/discovery/DiscoveryHub.js

import React, { useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { useDiscovery } from '../../context/DiscoveryContext';
import DiscoveryNavigation from './DiscoveryNavigation';
import InteractiveDemoContainer from './InteractiveDemoContainer';
import ProgressTracker from './progress/ProgressTracker';

const DiscoveryHub = () => {
  const {
    state: {
      currentPathId,
      currentSectionId,
      paths,
      sections,
      progress,
    },
    actions: {
      setCurrentPath,
      setCurrentSection,
      markSectionComplete,
    },
  } = useDiscovery();

  const currentPath = paths.find((path) => path.id === currentPathId);
  const currentSection = sections[currentSectionId];

  // Handle path selection
  const handlePathSelect = useCallback(
    (pathId) => {
      setCurrentPath(pathId);
    },
    [setCurrentPath]
  );

  // Handle section selection
  const handleSectionSelect = useCallback(
    (sectionId) => {
      setCurrentSection(sectionId);
    },
    [setCurrentSection]
  );

  // Handle demo completion
  const handleDemoComplete = useCallback(() => {
    if (currentPathId && currentSectionId) {
      markSectionComplete(currentPathId, currentSectionId);
    }
  }, [currentPathId, currentSectionId, markSectionComplete]);

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Navigation Sidebar */}
      <Box
        sx={{
          width: 280,
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
        }}
      >
        <DiscoveryNavigation
          onPathSelect={handlePathSelect}
          onSectionSelect={handleSectionSelect}
        />
      </Box>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <AnimatePresence mode="wait">
          {currentSection ? (
            <motion.div
              key={currentSectionId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <InteractiveDemoContainer
                section={currentSection}
                onComplete={handleDemoComplete}
              />
              <ProgressTracker pathId={currentPathId} />
            </motion.div>
          ) : currentPath ? (
            <motion.div
              key="path-selected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h5">
                  Select a section to begin
                </Typography>
              </Box>
            </motion.div>
          ) : (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h5">
                  Welcome to the Discovery System
                </Typography>
                <Typography variant="body1" sx={{ mt: 2 }}>
                  Select a learning path from the sidebar to begin your journey.
                </Typography>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </Box>
  );
};

export default DiscoveryHub;
