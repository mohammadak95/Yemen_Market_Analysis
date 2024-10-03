// ThemeToggle.js
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { styled } from '@mui/system';
import Switch from '@mui/material/Switch';
import { toggleTheme } from '../../features/themeSlice';

const ToggleWrapper = styled('div')`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ThemeToggle = () => {
  const dispatch = useDispatch();
  const isDarkMode = useSelector(state => state.theme.isDarkMode);

  const handleToggle = () => {
    dispatch(toggleTheme());
  };

  return (
    <ToggleWrapper>
      <Switch 
        checked={isDarkMode} 
        onChange={handleToggle} 
        color="default"
      />
    </ToggleWrapper>
  );
};

export default ThemeToggle;