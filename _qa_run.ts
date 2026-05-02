import { writeFileSync, readFileSync } from 'fs';
import jsPDF from 'jspdf';

const orig = (jsPDF.prototype as any).output;
(jsPDF.prototype as any).save = function (filename: string) {
  const ab: ArrayBuffer = orig.call(this, 'arraybuffer');
  writeFileSync(`/tmp/${filename}`, Buffer.from(ab));
  console.log(`OK ${filename} ${ab.byteLength}b`);
};

try {
  const mod = await import('/dev-server/src/lib/estimatePdf');
  console.log('imported keys:', Object.keys(mod));
  const sample = JSON.parse(readFileSync('/dev-server/_qa_sample.json', 'utf8'));
  console.log('sample loaded, sections:', sample.sections.length);
  mod.downloadEstimatePdf(sample, { filename: 'OF_Estimate_Sample.pdf' });
  console.log('done');
} catch (e) {
  console.error('CAUGHT', e);
  process.exit(1);
}
