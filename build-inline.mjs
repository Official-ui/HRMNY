// Inline styles.css + app.js into each page so the result is a single
// self-contained .html file that works offline on a phone.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const css = fs.readFileSync(path.join(dir, 'assets/styles.css'), 'utf8');
const js = fs.readFileSync(path.join(dir, 'assets/app.js'), 'utf8');
const appCss = fs.readFileSync(path.join(dir, 'assets/app-proto.css'), 'utf8');
const appJs = fs.readFileSync(path.join(dir, 'assets/app-proto.js'), 'utf8');

const pages = [
  ['index.html', 'mockup-throughline.html'],
  ['plan.html', 'mockup-plan.html'],
  ['app.html', 'mockup-app.html'],
];

for (const [src, out] of pages) {
  let html = fs.readFileSync(path.join(dir, src), 'utf8');
  html = html.replace(
    '<link rel="stylesheet" href="assets/styles.css" />',
    '<style>\n' + css + '\n</style>'
  );
  // app.html pulls in the extra prototype stylesheet/script too
  html = html.replace(
    '<link rel="stylesheet" href="assets/app-proto.css" />',
    '<style>\n' + appCss + '\n</style>'
  );
  html = html.replace(
    '<script src="assets/app.js"></script>',
    '<script>\n' + js + '\n</script>'
  );
  html = html.replace(
    '<script src="assets/app-proto.js"></script>',
    '<script>\n' + appJs + '\n</script>'
  );
  // repoint cross-page nav links to the sibling self-contained files
  html = html.replace(/href="index\.html"/g, 'href="mockup-throughline.html"');
  html = html.replace(/href="plan\.html"/g, 'href="mockup-plan.html"');
  html = html.replace(/href="app\.html"/g, 'href="mockup-app.html"');
  fs.writeFileSync(path.join(dir, out), html);
  console.log('wrote', out, '(' + Math.round(html.length / 1024) + ' KB)');
}
