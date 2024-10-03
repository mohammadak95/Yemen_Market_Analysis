import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const LanguageButton = styled.button`
  background-color: ${props => props.theme.buttonBackground};
  color: ${props => props.theme.buttonText};
  border: none;
  padding: 5px 10px;
  margin-right: 10px;
  cursor: pointer;
`;

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <>
      <LanguageButton onClick={() => changeLanguage('en')}>English</LanguageButton>
      <LanguageButton onClick={() => changeLanguage('ar')}>العربية</LanguageButton>
    </>
  );
};

export default LanguageSwitcher;