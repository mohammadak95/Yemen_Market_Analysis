import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  useMediaQuery,
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
      scroll="paper" // Ensure scrolling within the dialog
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: 2 },
          boxShadow: 3,
          maxHeight: '90vh', // Control the dialog's max height
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          position: 'relative',
        }}
      >
        <Typography variant="h6">Methodology</Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'inherit',
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ padding: 2 }}>
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
