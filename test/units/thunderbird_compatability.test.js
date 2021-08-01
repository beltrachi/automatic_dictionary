import * as path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { default as readdirp } from 'readdirp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('Imports in thunderbird need .js', async (done) => {
  var addonPath = path.join(__dirname, '../../addon/');

  function searchWrongImport(fileFullPath) {
    const importDetector = /^\s*import\s+/
    const goodPathDetector = /\.js["']\s*;?$/
    fs.readFileSync(fileFullPath).toString().split('\n').forEach(function (line) {
      if (importDetector.test(line)) {
        if (!goodPathDetector.test(line)) {
          expect(line).toBe("import path must include extension (.js) in Thunderbird")
        }
      }
    });
  }

  readdirp(addonPath, { fileFilter: '*.js' })
    .on('data', (entry) => {
      searchWrongImport(entry.fullPath);
    })
    .on('error', error => console.error('fatal error', error))
    .on('end', () => {
      done()
    });
});