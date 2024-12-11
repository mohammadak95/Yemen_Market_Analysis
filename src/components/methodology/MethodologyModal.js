// src/components/methodology/MethodologyModal.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  useMediaQuery,
  Box,
  alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MethodologyContentWrapper from './MethodologyContentWrapper';
import { useTheme } from '@mui/material/styles';

const MethodologyModal = ({ open, onClose }) => {
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={!isSmUp}
      fullWidth
      maxWidth="lg"
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: 2 },
          boxShadow: theme.palette.mode === 'dark' 
            ? `0 8px 32px ${alpha(theme.palette.common.black, 0.5)}`
            : theme.shadows[5],
          maxHeight: '90vh',
          bgcolor: theme.palette.background.paper,
          backgroundImage: 'none',
          transition: theme.transitions.create(
            ['background-color', 'box-shadow'],
            {
              duration: theme.transitions.duration.standard,
            }
          ),
        },
      }}
      TransitionProps={{
        timeout: {
          enter: theme.transitions.duration.enteringScreen,
          exit: theme.transitions.duration.leavingScreen,
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: theme.palette.mode === 'dark'
              ? alpha(theme.palette.common.black, 0.8)
              : alpha(theme.palette.common.black, 0.5),
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          bgcolor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.primary.dark, 0.9)
            : theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          transition: theme.transitions.create(
            ['background-color', 'color'],
            {
              duration: theme.transitions.duration.standard,
            }
          ),
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            flexGrow: 1,
            fontWeight: 600,
            letterSpacing: 0.5,
          }}
        >
          Methodology
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          size="large"
          sx={{
            color: theme.palette.primary.contrastText,
            transition: theme.transitions.create(
              ['background-color', 'transform'],
              {
                duration: theme.transitions.duration.shorter,
              }
            ),
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark'
                ? alpha(theme.palette.common.white, 0.1)
                : alpha(theme.palette.common.black, 0.1),
              transform: 'rotate(90deg)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          padding: theme.spacing(3),
          bgcolor: theme.palette.background.default,
          transition: theme.transitions.create(
            ['background-color'],
            {
              duration: theme.transitions.duration.standard,
            }
          ),
          '& > *': {
            transition: theme.transitions.create(
              ['color', 'background-color'],
              {
                duration: theme.transitions.duration.standard,
              }
            ),
          },
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: theme.palette.mode === 'dark'
            ? `${alpha(theme.palette.common.white, 0.2)} ${alpha(theme.palette.common.black, 0.3)}`
            : `${alpha(theme.palette.common.black, 0.2)} ${alpha(theme.palette.common.white, 0.3)}`,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: theme.palette.mode === 'dark'
              ? alpha(theme.palette.common.black, 0.3)
              : alpha(theme.palette.common.white, 0.3),
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.mode === 'dark'
              ? alpha(theme.palette.common.white, 0.2)
              : alpha(theme.palette.common.black, 0.2),
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark'
                ? alpha(theme.palette.common.white, 0.3)
                : alpha(theme.palette.common.black, 0.3),
            },
          },
        }}
      >
        <MethodologyContentWrapper />
      </DialogContent>
    </Dialog>
  );
};

MethodologyModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default MethodologyModal;
