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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MethodologyContentWrapper from './MethodologyContentWrapper';
import { useTheme } from '@mui/material/styles';
import { useBodyScrollLock } from '@/hooks'; // Import the custom hook

const MethodologyModal = ({ open, onClose }) => {
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));

  useBodyScrollLock(open); // Use the custom hook

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
          boxShadow: theme.shadows[5],
          maxHeight: '90vh',
          bgcolor: theme.palette.background.paper,
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          bgcolor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Methodology
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: theme.palette.primary.contrastText,
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