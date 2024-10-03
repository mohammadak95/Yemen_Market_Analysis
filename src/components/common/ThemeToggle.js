// src/components/common/ThemeToggle.js
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleTheme } from '../../features/themeSlice';
import styled, { keyframes } from 'styled-components';

// Keyframes for smooth toggle animation
const toggleAnimation = keyframes`
  0% { transform: translateX(0); }
  50% { transform: translateX(12px); }
  100% { transform: translateX(26px); }
`;

// Keyframes for animated gradient
const animatedGradient = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// Container for the entire toggle and label
const ToggleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

// Container for the toggle switch
const ToggleContainer = styled.label`
  position: relative;
  display: inline-block;
  width: 70px;
  height: 38px;
`;

// Hidden checkbox input for accessibility
const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  opacity: 0;
  width: 0;
  height: 0;

  &:focus + span {
    box-shadow: 0 0 0 3px ${(props) => props.theme.primaryColor};
  }

  &:checked + span {
    background: linear-gradient(135deg, ${(props) => props.theme.primaryColor}, ${(props) => props.theme.secondaryColor});
    box-shadow: 0 0 15px rgba(102, 126, 234, 0.6);
  }

  &:checked + span:before {
    transform: translateX(32px);
    background-color: #ffffff;
    animation: ${toggleAnimation} 0.4s forwards;
  }
`;

// The slider
const Slider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 34px;
  transition: background 0.4s, border 0.4s;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  background: linear-gradient(-45deg, #667eea, #764ba2, #667eea, #764ba2);
  background-size: 400% 400%;
  animation: ${animatedGradient} 15s ease infinite;

  &:before {
    position: absolute;
    content: '';
    height: 30px;
    width: 30px;
    left: 4px;
    bottom: 4px;
    background-color: #ffffff;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s;
    border-radius: 50%;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }

  /* Hover effect */
  &:hover {
    border: 2px solid rgba(255, 255, 255, 0.6);
    transform: scale(1.02);
    transition: transform 0.2s, border 0.2s;
  }

  /* Active state glow */
  ${HiddenCheckbox}:checked + & {
    box-shadow: 0 0 20px rgba(102, 126, 234, 0.6);
    animation: none;
    background: linear-gradient(135deg, #667eea, #764ba2);
  }
`;

// Label text (Optional: Remove if you don't want labels)
const ToggleLabelText = styled.span`
  font-size: 1rem;
  color: ${(props) => props.theme.textColor};
  user-select: none;
  transition: color 0.4s;
  font-family: 'Inter', sans-serif;
`;

const ThemeToggle = () => {
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);

  const handleToggle = () => {
    dispatch(toggleTheme());
  };

  return (
    <ToggleWrapper>
      <ToggleContainer>
        <HiddenCheckbox
          checked={isDarkMode}
          onChange={handleToggle}
          aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        />
        <Slider />
      </ToggleContainer>
      {/* Optionally include label text */}
      <ToggleLabelText>
        {isDarkMode ? 'Dark Mode' : 'Light Mode'}
      </ToggleLabelText>
    </ToggleWrapper>
  );
};

export default ThemeToggle;