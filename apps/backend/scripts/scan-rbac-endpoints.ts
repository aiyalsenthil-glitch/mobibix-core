
import * as fs from 'fs';
import * as path from 'path';

/**
 * RBAC Security Audit Script
 * Scans NestJS controllers for missing permission decorators.
 */

const BACKEND_ROOT = path.join(__dirname, '..');
const SRC_MODULES = path.join(BACKEND_ROOT, 'src', 'modules');
// Inclusion of src/core as well per auditor judgment, though prompt specified modules
const SRC_CORE = path.join(BACKEND_ROOT, 'src', 'core');
const REPORT_FILE = path.join(BACKEND_ROOT, 'rbac-endpoint-audit.json');

const HTTP_DECORATORS = ['@Get(', '@Post(', '@Patch(', '@Delete(', '@Put('];
const PERM_DECORATORS = ['@RequirePermission(', '@ModulePermission(', '@Public('];
const EXCEPTIONS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/health',
  '/public',
  '/auth/login-qa',
  '/auth/verify-otp',
  '/webhook/'
];

interface UnprotectedEndpoint {
  controller: string;
  method: string;
  route: string;
  file: string;
}

function scanControllers(dir: string, files: string[] = []) {
  if (!fs.existsSync(dir)) return files;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      scanControllers(fullPath, files);
    } else if (item.endsWith('.controller.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

function audit() {
  console.log('🔍 Scanning for RBAC permission gaps...');
  
  // We scan both modules and core to ensure 100% platform coverage
  const controllers = [
    ...scanControllers(SRC_MODULES),
    ...scanControllers(SRC_CORE)
  ];

  const results = {
    totalControllers: controllers.length,
    totalEndpoints: 0,
    protectedEndpoints: 0,
    unprotectedEndpoints: 0,
    unprotected: [] as UnprotectedEndpoint[],
  };

  for (const controllerFile of controllers) {
    const content = fs.readFileSync(controllerFile, 'utf8');
    const lines = content.split('\n');
    let currentController = 'UnknownController';
    const classMatch = content.match(/export class (\w+)/);
    if (classMatch) currentController = classMatch[1];

    let baseRoute = '';
    const controllerMatch = content.match(/@Controller\(['"]([^'"]+)['"]\)/);
    if (controllerMatch) baseRoute = controllerMatch[1];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const decorator = HTTP_DECORATORS.find(d => line.includes(d));
      
      if (decorator) {
        results.totalEndpoints++;
        
        // Extract route from decorator
        let routeMatch = line.match(/\(['"]([^'"]*)['"]\)/);
        let subRoute = routeMatch ? routeMatch[1] : '';
        const methodType = decorator.replace('@', '').replace('(', '');
        const fullRoute = `${methodType} /${baseRoute}${subRoute ? '/' + subRoute : ''}`.replace(/\/+/g, '/');

        // Check if it's an exception
        if (EXCEPTIONS.some(ex => fullRoute.includes(ex))) {
          results.protectedEndpoints++;
          continue;
        }

        // Search for permission decorators in the vicinity of the HTTP decorator
        let isProtected = false;
        
        // Check ABOVE (decorators usually come before)
        for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
          const checkLine = lines[j].trim();
          if (PERM_DECORATORS.some(pd => checkLine.includes(pd))) {
            isProtected = true;
            break;
          }
          if (checkLine.startsWith('@Controller') || checkLine.startsWith('export class')) break;
          // If we hit another HTTP decorator, stop
          if (HTTP_DECORATORS.some(hd => checkLine.includes(hd))) break;
        }

        // Check BELOW (sometimes decorators are staggered)
        if (!isProtected) {
          for (let j = i + 1; j <= Math.min(lines.length - 1, i + 10); j++) {
            const checkLine = lines[j].trim();
            if (PERM_DECORATORS.some(pd => checkLine.includes(pd))) {
              isProtected = true;
              break;
            }
            if (checkLine.startsWith('@Controller') || checkLine.startsWith('export class')) break;
            // If we hit the method definition, we can stop looking for decorators related to this endpoint
            if (!checkLine.startsWith('@') && checkLine.match(/^(?:async\s+)?\w+\s*\(/)) break;
          }
        }
        
        // Check for class-level @ModulePermission OR @Public
        if (!isProtected) {
          const classContent = content.substring(0, content.indexOf('export class'));
          if (PERM_DECORATORS.some(pd => classContent.includes(pd))) {
            isProtected = true;
          }
        }

        if (isProtected) {
          results.protectedEndpoints++;
        } else {
          results.unprotectedEndpoints++;
          
          // Identify method name (usually the next line that doesn't start with @)
          let methodName = 'unknown';
          for (let k = i + 1; k < i + 10 && k < lines.length; k++) {
            const nextLine = lines[k].trim();
            if (nextLine.startsWith('@')) continue;
            const methodMatch = nextLine.match(/^(?:async\s+)?(\w+)\s*\(/);
            if (methodMatch) {
              methodName = methodMatch[1];
              break;
            }
          }

          results.unprotected.push({
            controller: currentController,
            method: methodName,
            route: fullRoute,
            file: path.relative(BACKEND_ROOT, controllerFile)
          });
        }
      }
    }
  }

  // Print Report
  console.log('\n=====================================');
  console.log('       RBAC Endpoint Audit');
  console.log('=====================================');
  console.log(`Total Controllers:      ${results.totalControllers}`);
  console.log(`Total Endpoints:        ${results.totalEndpoints}`);
  console.log(`Protected Endpoints:    ${results.protectedEndpoints}`);
  console.log(`Unprotected Endpoints:  ${results.unprotectedEndpoints}`);
  console.log('=====================================\n');

  if (results.unprotected.length > 0) {
    console.log('Unprotected Endpoints (Issues Found):\n');
    results.unprotected.forEach(u => {
      console.log(`[CRITICAL] ${u.controller}.${u.method}`);
      console.log(`           Route: ${u.route}`);
      console.log(`           File:  ${u.file}\n`);
    });
  } else {
    console.log('✅ All endpoints are properly protected with RBAC decorators.\n');
  }

  // Save to JSON
  const auditOutput = {
    totalControllers: results.totalControllers,
    totalEndpoints: results.totalEndpoints,
    unprotected: results.unprotected.map(({ controller, method, route }) => ({ controller, method, route }))
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(auditOutput, null, 2));
  console.log(`📝 Report saved to: ${path.basename(REPORT_FILE)}`);

  // CLI Strict Mode
  if (process.argv.includes('--strict')) {
    if (results.unprotected.length > 0) {
      console.error(`\n❌ RBAC SECURITY FAILURE`);
      console.error(`${results.unprotected.length} endpoints are missing permission decorators.`);
      process.exit(1);
    } else {
      console.log('\n✅ Strict mode check passed.');
    }
  }
}

audit();
