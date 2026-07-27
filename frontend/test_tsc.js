const { execSync } = require('child_process');
const fs = require('fs');
try {
  const out = execSync('npx tsc --noEmit', { stdio: 'pipe', cwd: 'd:/Care Fusions/CareFusions/frontend' });
  fs.writeFileSync('d:/Care Fusions/CareFusions/frontend/tsc_out.txt', out);
} catch (e) {
  fs.writeFileSync('d:/Care Fusions/CareFusions/frontend/tsc_out.txt', e.stdout ? e.stdout.toString() : e.message);
}
console.log('done');
