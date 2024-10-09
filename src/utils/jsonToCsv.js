// src/utils/jsonToCsv.js

export const jsonToCsv = (jsonData) => {
    const headers = Object.keys(jsonData[0]);
    const csvRows = [
      headers.join(','), // header row first
      ...jsonData.map(row =>
        headers.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(',')
      )
    ];
    return csvRows.join('\n');
  };
  
  // Optional: Handle nested objects if necessary
  const replacer = (key, value) => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return value;
  };
  