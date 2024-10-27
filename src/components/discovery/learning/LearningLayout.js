// src/components/discovery/learning/LearningLayout.js

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Menu, ChevronLeft } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import LearningModule from './LearningModule';
import ProgressTracker from '../progress/ProgressTracker';

const DRAWER_WIDTH = 320;

export const LearningLayout = ({ moduleId, title, sections, analysisType }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const handleDrawerToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          width: `calc(100% - ${sidebarOpen ? DRAWER_WIDTH : 0}px)`,
          ml: `${sidebarOpen ? DRAWER_WIDTH : 0}px`,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="Open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            {sidebarOpen ? <ChevronLeft /> : <Menu />}
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {title}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={sidebarOpen}
        onClose={handleDrawerToggle}
        anchor="left"
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', p: 2 }}>
          <ProgressTracker analysisType={analysisType} />
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: `calc(100% - ${sidebarOpen ? DRAWER_WIDTH : 0}px)`,
          ml: `${sidebarOpen ? DRAWER_WIDTH : 0}px`,
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          height: '100%',
          overflow: 'auto',
        }}
      >
        <Toolbar />
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <LearningModule
              moduleId={moduleId}
              title={title}
              sections={sections}
            />
          </motion.div>
        </AnimatePresence>
      </Box>
    </Box>
  );
};

LearningLayout.propTypes = {
  moduleId: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  sections: PropTypes.array.isRequired,
  analysisType: PropTypes.string.isRequired,
};

export default LearningLayout;
