import { build } from 'esbuild';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
const result = await build({ entryPoints: ['ui/app.js'], bundle: true, write: false, metafile: true, format: 'esm', minify: true, target: 'es2022', loader: { '.svg': 'text' } });
const template = await readFile('ui/template.html', 'utf8');
await mkdir('dist', { recursive: true });
await writeFile('dist/report.html', template.replace('/* APP_CODE */', () => result.outputFiles[0].text.replaceAll('</script', '<\\/script')));
// 服务端连同 npm 依赖打成单文件，安装后的插件无需 node_modules。
const server = await build({ entryPoints: ['server.mjs'], bundle: true, metafile: true, outfile: 'dist/server.mjs', platform: 'node', format: 'esm', target: 'node22', minify: true, legalComments: 'eof' });

// 两个产物实际打包进去的 npm 包都随插件分发，逐一附上其许可证原文。
const packages = new Set();
for (const input of [...Object.keys(result.metafile.inputs), ...Object.keys(server.metafile.inputs)]) {
  const match = input.match(/^node_modules\/((?:@[^/]+\/)?[^/]+)\//);
  if (match) packages.add(match[1]);
}
const notices = [];
for (const name of [...packages].sort()) {
  const dir = `node_modules/${name}`;
  const { version, license, author, repository } = JSON.parse(await readFile(`${dir}/package.json`, 'utf8'));
  const file = (await readdir(dir)).find(f => /^(licen[cs]e|copying)(\.|$)/i.test(f));
  // 个别包未随 npm 发布许可证文件，此时如实注明声明的许可证、作者与源码仓库，不自行补写原文。
  const text = file ? (await readFile(`${dir}/${file}`, 'utf8')).trim()
    : `No license file is included in the npm package. Declared license: ${license}.\nAuthor: ${typeof author === 'string' ? author : author?.name ?? 'unknown'}\nSource: ${typeof repository === 'string' ? repository : repository?.url ?? 'unknown'}`;
  notices.push(`${name}@${version} (${license})\n\n${text}\n`);
}
await writeFile('dist/THIRD_PARTY_LICENSES.txt', notices.join('\n' + '-'.repeat(72) + '\n\n'));

await writeFile('dist/LICENSE-lucide.txt', await readFile('ui/icons/LICENSE', 'utf8'));
