import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Enterprise RBAC Startup Validator
 * Scans all NestJS controllers to ensure 100% RBAC coverage.
 * Fails the process if any unprotected endpoint is found.
 */

const MODULES_DIR = resolve(__dirname, '../src/modules');
const IGNORE_PATTERNS = [
  '.spec.ts',
  'node_modules',
  '/webhook/',
];

interface UnprotectedEndpoint {
  file: string;
  method: string;
  path: string;
}

function scanDirectory(dir: string, results: UnprotectedEndpoint[] = []) {
  const files = readdirSync(dir);

  for (const file of files) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath, results);
    } else if (file.endsWith('.controller.ts') && !IGNORE_PATTERNS.some(p => file.includes(p))) {
      analyzeController(fullPath, results);
    }
  }
  return results;
}

function analyzeController(filePath: string, results: UnprotectedEndpoint[]) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const httpDecorators = ['@Get(', '@Post(', '@Patch(', '@Delete(', '@Put('];
  const permissionDecorators = ['@RequirePermission(', '@Public(', '@ModulePermission('];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    const isHttpEndpoint = httpDecorators.some(d => line.startsWith(d));
    
    if (isHttpEndpoint) {
      // Check context (immediately above)
      let foundPermission = false;
      const contextRange = 5; // Search up to 5 lines above
      
      for (let j = 1; j <= contextRange; j++) {
        const prevLine = lines[i - j]?.trim() || '';
        if (permissionDecorators.some(p => prevLine.startsWith(p))) {
          foundPermission = true;
          break;
        }
        // If we hit another endpoint or class definition, stop
        if (httpDecorators.some(d => prevLine.startsWith(d)) || prevLine.startsWith('@Controller')) {
          break;
        }
      }

      // Also check if the whole class has @ModulePermission or @Public
      if (!foundPermission) {
        const classContent = content.substring(0, content.indexOf('export class'));
        if (permissionDecorators.some(p => classContent.includes(p))) {
          foundPermission = true;
        }
      }

      if (!foundPermission) {
        results.push({
          file: filePath.replace(process.cwd(), ''),
          method: line,
          path: filePath,
        });
      }
    }
  }
}

console.log('🛡️ Starting Enterprise RBAC Validation...');
const missing = scanDirectory(MODULES_DIR);

if (missing.length > 0) {
  console.error('\n❌ RBAC VALIDATION FAILED');
  console.error(`Found ${missing.length} unprotected endpoints:\n`);
  
  missing.forEach(endpoint => {
    console.error(`  - ${endpoint.file} -> ${endpoint.method}`);
  });

  console.error('\nTotal missing coverage:', missing.length);
  console.error('Action: Add @RequirePermission() or @ModulePermission() to these endpoints.');
  process.exit(1);
} else {
  console.log('\n✅ RBAC VALIDATION PASSED: 100% Coverage');
  process.exit(0);
}
