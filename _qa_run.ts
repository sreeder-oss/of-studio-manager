import { writeFileSync, readFileSync } from 'fs';
import jsPDF from 'jspdf';

const orig = (jsPDF.prototype as any).output;
(jsPDF.prototype as any).save = function (filename: string) {
  const ab: ArrayBuffer = orig.call(this, 'arraybuffer');
  writeFileSync(`/tmp/${filename}`, Buffer.from(ab));
  console.log(`OK ${filename} ${ab.byteLength}b`);
};

const { downloadEstimatePdf } = await import('/dev-server/src/lib/estimatePdf');
const sample = JSON.parse(readFileSync('/dev-server/_qa_sample.json', 'utf8'));
downloadEstimatePdf(sample, { filename: 'OF_Estimate_Sample.pdf' });
