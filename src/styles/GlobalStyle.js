// src/styles/GlobalStyle.js


import React from 'react'; // Added this import
import { Global, css } from '@emotion/react';

const GlobalStyle = () => (
  <Global
    styles={(theme) => css`
      html,
      body,
      #root {
        height: 100%;
        margin: 0;
        padding: 0;
        background-color: ${theme.palette.background.default};
        color: ${theme.palette.text.primary};
        font-family: ${theme.typography.fontFamily};
      }
      a {
        color: ${theme.palette.primary.main};
      }
      /* Add any other global styles here */
    `}
  />
);

export default GlobalStyle;
