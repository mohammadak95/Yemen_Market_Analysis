// src/components/discovery/preview/ContentPreview.js

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Drawer,
  IconButton,
  Button,
  Typography,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  X,
  Play,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const ContentPreview = ({ content, onStart, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  const handleStart = useCallback(() => {
    if (onStart) {
      onStart(content.id);
    }
  }, [content.id, onStart]);

  const handleNextSection = () => {
    setActiveSectionIndex((prevIndex) => prevIndex + 1);
  };

  const handlePrevSection = () => {
    setActiveSectionIndex((prevIndex) => prevIndex - 1);
  };

  const currentSection = content.sections?.[activeSectionIndex];

  return (
    <Drawer
      anchor={isMobile ? 'bottom' : 'right'}
      open={Boolean(content)}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: isMobile ? '100%' : 400,
          height: isMobile ? '80vh' : '100%',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      aria-labelledby="content-preview-title"
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography id="content-preview-title" variant="h6">
          {content.title}
        </Typography>
        <IconButton onClick={onClose} aria-label="Close Preview">
          <X />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {/* Overview */}
        <Typography variant="subtitle1" gutterBottom>
          Overview
        </Typography>
        <Typography variant="body2" paragraph>
          {content.description}
        </Typography>

        {/* Key Equation */}
        {content.keyEquation && (
          <Box sx={{ my: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Key Equation
            </Typography>
            <BlockMath>{content.keyEquation}</BlockMath>
          </Box>
        )}

        {/* Prerequisites */}
        {content.prerequisites?.length > 0 && (
          <Box sx={{ my: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Prerequisites
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {content.prerequisites.map((prereq) => (
                <Chip key={prereq} label={prereq} variant="outlined" />
              ))}
            </Box>
          </Box>
        )}

        {/* Sections */}
        {content.sections?.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="subtitle1" gutterBottom>
              Sections
            </Typography>
            <Stepper activeStep={activeSectionIndex} orientation="vertical">
              {content.sections.map((section) => (
                <Step key={section.id}>
                  <StepLabel>{section.title}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Section Preview */}
            {currentSection && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {currentSection.title}
                </Typography>
                <Typography variant="body2" paragraph>
                  {currentSection.preview}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Actions */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Navigation Buttons */}
        <Box>
          {content.sections?.length > 0 && (
            <>
              <Button
                onClick={handlePrevSection}
                disabled={activeSectionIndex === 0}
                startIcon={<ChevronLeft />}
                aria-label="Previous Section"
              >
                Previous
              </Button>
              <Button
                onClick={handleNextSection}
                disabled={activeSectionIndex === content.sections.length - 1}
                endIcon={<ChevronRight />}
                aria-label="Next Section"
              >
                Next
              </Button>
            </>
          )}
        </Box>

        {/* Start Button */}
        <Button
          variant="contained"
          color="primary"
          startIcon={<Play />}
          onClick={handleStart}
          aria-label="Start Learning"
        >
          Start Learning
        </Button>
      </Box>
    </Drawer>
  );
};

ContentPreview.propTypes = {
  content: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    keyEquation: PropTypes.string,
    prerequisites: PropTypes.arrayOf(PropTypes.string),
    sections: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        preview: PropTypes.string,
      })
    ),
  }).isRequired,
  onStart: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

export default ContentPreview;
