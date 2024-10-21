// src/utils/fetchJson.js

import { getDataPath } from './dataPath';

export const fetchJson = async (relativeUrl) => {
  const url = getDataPath(relativeUrl);
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error(`Expected JSON, got ${contentType}`);
  }

  return response.json();
};