// src/components/methodology/MethodologyModal.js

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  InputAdornment,
  TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import MethodologySection from './MethodologySection';
import methodologyContent from '../../methodologyData';

const MethodologyModal = ({ open, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContent = methodologyContent.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (section.content && section.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 3,
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
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
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search methodology..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
          {filteredContent.map((section, index) => (
            <MethodologySection key={index} section={section} level={1} />
          ))}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

MethodologyModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default MethodologyModal;