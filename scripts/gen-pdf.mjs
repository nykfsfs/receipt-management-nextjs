import puppeteer from 'puppeteer';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(__dirname, '../docs/guide.html');
const pdfPath  = resolve(__dirname, '../docs/guide.pdf');

console.log('PDF生成中...');
const browser = await puppeteer.launch({ headless: true });
const page    = await browser.newPage();

await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
});

await browser.close();
console.log(`✓ PDF生成完了: ${pdfPath}`);
