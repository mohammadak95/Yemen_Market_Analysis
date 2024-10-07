// src/components/SearchBar.js
import React from 'react';
import { TextField } from '@mui/material';
import PropTypes from 'prop-types'; // Import PropTypes

const SearchBar = ({ searchQuery, setSearchQuery }) => {
  return (
    <TextField
      label="Search Methodology"
      variant="outlined"
      fullWidth
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      style={{ marginBottom: '1rem' }}
    />
  );
};

// Add prop types validation
SearchBar.propTypes = {
  searchQuery: PropTypes.string.isRequired,
  setSearchQuery: PropTypes.func.isRequired,
};

export default SearchBar;