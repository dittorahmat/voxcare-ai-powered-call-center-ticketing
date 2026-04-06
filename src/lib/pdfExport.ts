import { pdf } from '@react-pdf/renderer';

export async function downloadPdf(document: any, filename: string) {
  const blob = await pdf(document).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function getPdfBlob(document: any) {
  return pdf(document).toBlob();
}
