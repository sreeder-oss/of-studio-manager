import { writeFileSync, readFileSync } from 'fs';

const mod = await import('/dev-server/src/lib/estimatePdf');
const sample = JSON.parse(readFileSync('/dev-server/_qa_sample.json', 'utf8'));

// Monkey-patch the global URL.createObjectURL / a.click() that jsPDF.save uses,
// or just directly invoke output('blob') -> arrayBuffer. Easiest: patch
// downloadEstimatePdf? No — use the underlying jsPDF buffer ourselves.
// Replace jsPDF.save with arraybuffer write BEFORE calling.
const jsPDF = (await import('jspdf')).default;
const origSave = jsPDF.prototype.save;
jsPDF.prototype.save = function (filename: string) {
  const ab = this.output('arraybuffer');
  writeFileSync(`/tmp/${filename}`, Buffer.from(ab));
  console.log(`WROTE /tmp/${filename} (${ab.byteLength} bytes)`);
  return this;
};

mod.downloadEstimatePdf(sample, { filename: 'OF_Estimate_Sample.pdf' });
