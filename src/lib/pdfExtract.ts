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

/**
 * Render PDF pages to JPEG data URLs so visual/scanned PDFs can be sent
 * to a multimodal model. Caps page count and resolution to stay sane.
 */
export const renderPdfPagesToImages = async (
  file: File,
  opts: { maxPages?: number; maxDim?: number; quality?: number } = {}
): Promise<string[]> => {
  const { maxPages = 6, maxDim = 1400, quality = 0.75 } = opts;
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const out: string[] = [];
  const pageCount = Math.min(pdf.numPages, maxPages);
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(maxDim / baseViewport.width, maxDim / baseViewport.height, 2);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    out.push(canvas.toDataURL('image/jpeg', quality));
  }
  return out;
};
