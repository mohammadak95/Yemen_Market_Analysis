// src/components/discovery/progress/ProgressTracker.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  RotateLeft,
  Warning,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useDiscoveryData } from '@/hooks';;

const formatDate = (date) => {
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const ProgressTracker = ({ analysisType }) => {
  const theme = useTheme();
  const { progress } = useDiscoveryData(analysisType);

  const progressStats = useMemo(() => {
    const total = progress.totalSections || 0;
    const completed = progress.completedSections || 0;
    const percentage = total ? (completed / total) * 100 : 0;

    const timeSpent = progress.timeSpent || 0;
    const estimatedTime = progress.estimatedTime || 0;

    return {
      total,
      completed,
      percentage,
      timeSpent,
      estimatedTime,
      lastActivity: progress.lastActivity,
    };
  }, [progress]);

  const sections = useMemo(() => {
    return (
      progress.sections?.map((section) => ({
        ...section,
        status: section.completed
          ? 'completed'
          : section.started
          ? 'in-progress'
          : 'not-started',
      })) || []
    );
  }, [progress.sections]);

  return (
    <AnimatePresence>
      <Paper
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        sx={{ p: 2 }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Learning Progress
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Course Progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {progressStats.completed}/{progressStats.total} sections
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressStats.percentage}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: theme.palette.action.hover,
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                },
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 120 }}>
              <Typography variant="caption" color="text.secondary">
                Time Spent
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1">
                  {Math.round(progressStats.timeSpent / 60)} min
                </Typography>
              </Box>
            </Box>
            <Box sx={{ flex: 1, minWidth: 120 }}>
              <Typography variant="caption" color="text.secondary">
                Estimated Left
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1">
                  {Math.round(
                    (progressStats.estimatedTime - progressStats.timeSpent) / 60
                  )}{' '}
                  min
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <List>
          {sections.map((section) => (
            <ListItem
              key={section.id}
              sx={{
                borderRadius: 1,
                mb: 1,
                bgcolor:
                  section.status === 'completed'
                    ? alpha(theme.palette.success.main, 0.1)
                    : 'background.paper',
              }}
            >
              <ListItemIcon>
                {section.status === 'completed' && (
                  <CheckCircle color="success" />
                )}
                {section.status === 'in-progress' && (
                  <RadioButtonUnchecked color="primary" />
                )}
                {section.status === 'not-started' && (
                  <RadioButtonUnchecked color="disabled" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={section.title}
                secondary={
                  section.lastActivity
                    ? `Last active ${formatDate(section.lastActivity)}`
                    : null
                }
              />
              {section.status === 'completed' && (
                <Tooltip title="Reset Progress">
                  <IconButton size="small">
                    <RotateLeft />
                  </IconButton>
                </Tooltip>
              )}
              {section.status === 'in-progress' &&
                progressStats.timeSpent > progressStats.estimatedTime && (
                  <Tooltip title="Taking longer than expected">
                    <Warning color="warning" />
                  </Tooltip>
                )}
            </ListItem>
          ))}
        </List>
      </Paper>
    </AnimatePresence>
  );
};

ProgressTracker.propTypes = {
  analysisType: PropTypes.string.isRequired,
};

export default ProgressTracker;
