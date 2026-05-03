import * as pdfjsLib from 'pdfjs-dist';
// Use the bundled worker via Vite ?url import
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export const extractPdfText = async (file: File): Promise<string> => {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  const max = Math.min(pdf.numPages, 50);
  for (let i = 1; i <= max; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const text = tc.items.map((it: any) => ('str' in it ? it.str : '')).join(' ');
    pages.push(`--- Page ${i} ---\n${text}`);
  }
  return pages.join('\n\n');
};
