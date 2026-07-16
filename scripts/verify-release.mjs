import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'src/lib/product.js',
  'src/components/ErrorBoundary.jsx',
  'src/pages/Dashboard.jsx',
  'src/pages/Onboarding.jsx',
  'src/pages/Learn.jsx',
  'src/pages/Advisor.jsx',
  'src/pages/Timeline.jsx',
  'src/context/BrainContext.jsx',
  'shared/financialBrain.js',
  'netlify/functions/financial-brain.js',
  'src/components/MiloAnswer.jsx',
  'supabase/phase-4-1.sql',
  'netlify.toml',
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing release file: ${file}`);
}
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (pkg.version !== '2.0.0') throw new Error(`Expected package version 2.0.0, got ${pkg.version}`);
const files = fs.readdirSync(path.join(root, 'netlify/functions')).filter((f) => f.endsWith('.js'));
for (const file of files) {
  const text = fs.readFileSync(path.join(root, 'netlify/functions', file), 'utf8');
  if (/sk-ant-|service_role\s*[:=]\s*['\"][A-Za-z0-9]/i.test(text)) throw new Error(`Possible embedded secret in ${file}`);
}
const source = fs.readFileSync(path.join(root, 'src/lib/product.js'), 'utf8');
if (!source.includes('moneymilo.netlify.app')) throw new Error('Production site URL is not configured.');
console.log('✓ MoneyMilo 2.0 release structure and secret checks passed.');
