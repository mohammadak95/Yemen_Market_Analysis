import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { toggleTheme } from '../../features/themeSlice';

const ToggleButton = styled.button`
  background-color: ${props => props.theme.buttonBackground};
  color: ${props => props.theme.buttonText};
  border: none;
  padding: 5px 10px;
  cursor: pointer;
`;

const ThemeToggle = () => {
  const dispatch = useDispatch();
  const isDarkMode = useSelector(state => state.theme.isDarkMode);

  return (
    <ToggleButton onClick={() => dispatch(toggleTheme())}>
      {isDarkMode ? '☀️' : '🌙'}
    </ToggleButton>
  );
};

export default ThemeToggle;