// Inline styles.css + app.js into each page so the result is a single
// self-contained .html file that works offline on a phone.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const css = fs.readFileSync(path.join(dir, 'assets/styles.css'), 'utf8');
const js = fs.readFileSync(path.join(dir, 'assets/app.js'), 'utf8');

const pages = [
  ['index.html', 'mockup-throughline.html', 'mockup-plan.html'],
  ['plan.html', 'mockup-plan.html', 'mockup-throughline.html'],
];

for (const [src, out] of pages) {
  let html = fs.readFileSync(path.join(dir, src), 'utf8');
  html = html.replace(
    '<link rel="stylesheet" href="assets/styles.css" />',
    '<style>\n' + css + '\n</style>'
  );
  html = html.replace(
    '<script src="assets/app.js"></script>',
    '<script>\n' + js + '\n</script>'
  );
  // repoint cross-page nav links to the sibling self-contained file
  html = html.replace(/href="index\.html"/g, 'href="mockup-throughline.html"');
  html = html.replace(/href="plan\.html"/g, 'href="mockup-plan.html"');
  fs.writeFileSync(path.join(dir, out), html);
  console.log('wrote', out, '(' + Math.round(html.length / 1024) + ' KB)');
}
