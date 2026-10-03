import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { parseConfig, effectiveConfig } from '../config/config.js';
export async function loadAndRender(path: string): Promise<Record<string, unknown>> { const raw = await readFile(path,'utf8'); const format = extname(path) === '.yaml' || extname(path) === '.yml' ? 'yaml' : 'json'; return effectiveConfig(parseConfig(raw, format)); }
const configIndex = process.argv.indexOf('--config');
const path = configIndex >= 0 ? process.argv[configIndex + 1] ?? 'examples/synthetic.json' : 'examples/synthetic.json';
if (process.argv[1]?.endsWith('index.js')) console.log(JSON.stringify(await loadAndRender(path), null, 2));
