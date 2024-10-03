import React from 'react';
import styled from 'styled-components';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import PropTypes from 'prop-types';

const Button = styled.button`
  background-color: #1976d2;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;

  &:hover {
    background-color: #115293;
  }
`;

const DownloadReportButton = ({ summaryRef, diagnosticsRef, commodity }) => {
  const handleDownload = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    let yOffset = 10;

    const captureElement = async (ref, title) => {
      if (ref.current) {
        const canvas = await html2canvas(ref.current);
        const imgData = canvas.toDataURL('image/png');
        const imgProps = doc.getImageProperties(imgData);
        const pdfWidth = doc.internal.pageSize.getWidth() - 20;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        doc.text(title, 10, yOffset);
        yOffset += 10;
        doc.addImage(imgData, 'PNG', 10, yOffset, pdfWidth, pdfHeight);
        yOffset += pdfHeight + 10;
      }
    };

    await captureElement(summaryRef, 'Summary Table');
    await captureElement(diagnosticsRef, 'Diagnostics');

    doc.save(`${commodity}_ECM_Report.pdf`);
  };

  return <Button onClick={handleDownload}>Download Report</Button>;
};

DownloadReportButton.propTypes = {
  summaryRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
  diagnosticsRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
  commodity: PropTypes.string.isRequired,
};

export default DownloadReportButton;