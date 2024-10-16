// src/styles/GlobalStyle.js

import React from 'react';
import { Global, css } from '@emotion/react';
import { useTheme } from '@mui/material/styles';

const GlobalStyle = () => {
  const theme = useTheme();

  return (
    <Global
      styles={css`
        html,
        body,
        #root {
          height: 100%;
          margin: 0;
          padding: 0;
          background-color: ${theme.palette.background.default};
          color: ${theme.palette.text.primary};
          font-family: ${theme.typography.fontFamily};
          line-height: 1.5;
          overflow-x: hidden;
        }
        a {
          color: ${theme.palette.primary.main};
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
        * {
          box-sizing: border-box;
        }
        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
          margin: 0;
          font-weight: ${theme.typography.fontWeightBold};
          color: ${theme.palette.text.primary};
        }
        p {
          margin: 0 0 ${theme.spacing(2)};
          color: ${theme.palette.text.primary};
        }
        button {
          font-family: ${theme.typography.fontFamily};
        }
        /* Adjust font sizes for mobile */
        @media (max-width: 600px) {
          h1 {
            font-size: 1.8rem;
          }
          h2 {
            font-size: 1.6rem;
          }
          h3 {
            font-size: 1.4rem;
          }
          h4 {
            font-size: 1.2rem;
          }
          h5 {
            font-size: 1rem;
          }
          h6 {
            font-size: 0.9rem;
          }
        }
      `}
    />
  );
};

export default GlobalStyle;