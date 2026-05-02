import { writeFileSync, readFileSync } from 'fs';
const { buildEstimatePdf } = await import('/dev-server/src/lib/estimatePdf');
const sample = JSON.parse(readFileSync('/dev-server/_qa_sample.json', 'utf8'));
const doc = buildEstimatePdf(sample);
const ab = doc.output('arraybuffer');
writeFileSync('/tmp/OF_Estimate_Sample.pdf', Buffer.from(ab));
console.log(`WROTE ${ab.byteLength} bytes`);
