// src/styles/GlobalStyle.js
import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }

  body {
    font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
    background-color: ${props => props.theme.backgroundColor};
    color: ${props => props.theme.textColor};
    line-height: 1.5;
    font-size: 16px;
    margin: 0;
    padding: 0;
  }

  h1, h2, h3, h4, h5, h6 {
    margin-bottom: 0.5em;
    color: ${props => props.theme.headingColor};
  }

  select, input, button {
    font-family: inherit;
    font-size: inherit;
  }
`;

export default GlobalStyle;