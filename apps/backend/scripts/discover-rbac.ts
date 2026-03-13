import * as fs from 'fs';
import * as path from 'path';

const BACKEND_ROOT = path.join(__dirname, '..');
const SRC_MODULES = path.join(BACKEND_ROOT, 'src', 'modules');
const SRC_CORE = path.join(BACKEND_ROOT, 'src', 'core');

const HTTP_DECORATORS = ['@Get(', '@Post(', '@Patch(', '@Delete(', '@Put('];

interface Endpoint {
  controller: string;
  method: string;
  route: string;
  module: string;
  permission: string;
  modulePermission?: string;
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

function discover() {
  const controllers = [
    ...scanControllers(SRC_MODULES),
    ...scanControllers(SRC_CORE)
  ];

  const endpoints: Endpoint[] = [];

  for (const controllerFile of controllers) {
    const content = fs.readFileSync(controllerFile, 'utf8');
    const lines = content.split('\n');
    
    let currentController = 'UnknownController';
    const classMatch = content.match(/export class (\w+)/);
    if (classMatch) currentController = classMatch[1];

    let baseRoute = '';
    const controllerMatch = content.match(/@Controller\(['"]([^'"]+)['"]\)/);
    if (controllerMatch) baseRoute = controllerMatch[1];

    let moduleScope = 'CORE';
    const scopeMatch = content.match(/@ModuleScope\(ModuleType\.(\w+)\)/);
    if (scopeMatch) moduleScope = scopeMatch[1];

    let modulePermission = '';
    const modPermMatch = content.match(/@ModulePermission\(['"]([^'"]+)['"]\)/);
    if (modPermMatch) modulePermission = modPermMatch[1];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const decorator = HTTP_DECORATORS.find(d => line.includes(d));
      
      if (decorator) {
        let routeMatch = line.match(/\(['"]([^'"]*)['"]\)/);
        let subRoute = routeMatch ? routeMatch[1] : '';
        const methodType = decorator.replace('@', '').replace('(', '');
        const fullRoute = `/${baseRoute}${subRoute ? '/' + subRoute : ''}`.replace(/\/+/g, '/');

        // Extract permission
        let permission = 'UNPROTECTED';
        for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
          const checkLine = lines[j].trim();
          if (checkLine.includes('@RequirePermission(')) {
            const permMatch = checkLine.match(/@RequirePermission\(([^)]+)\)/);
            if (permMatch) {
                const args = permMatch[1].split(',').map(a => a.trim());
                if (args.length === 3) {
                    const mod = args[0].split('.').pop();
                    const res = args[1].replace(/['"]/g, '');
                    const act = args[2].replace(/['"]/g, '');
                    permission = `${mod?.toLowerCase()}.${res}.${act}`;
                } else {
                    permission = args[0]; // Usually PERMISSIONS.xxx
                }
            }
            break;
          }
          if (checkLine.includes('@Public()')) {
            permission = 'PUBLIC';
            break;
          }
          if (checkLine.startsWith('@Controller') || checkLine.startsWith('export class')) break;
          if (HTTP_DECORATORS.some(hd => checkLine.includes(hd))) break;
        }

        endpoints.push({
          controller: currentController,
          method: methodType.toUpperCase(),
          route: fullRoute,
          module: moduleScope,
          permission,
          modulePermission,
          file: path.relative(BACKEND_ROOT, controllerFile)
        });
      }
    }
  }

  const output = endpoints.map(e => `${e.method} ${e.route} -> ${e.permission} (Module: ${e.modulePermission || 'none'}, Controller: ${e.controller})`).join('\n');
  fs.writeFileSync(path.join(BACKEND_ROOT, 'endpoint_discovery.txt'), output);

  // Cluster by modulePermission
  const clusters: Record<string, string[]> = {};
  endpoints.forEach(e => {
    const key = e.modulePermission || 'unmapped';
    if (!clusters[key]) clusters[key] = [];
    if (!clusters[key].includes(e.permission)) {
        clusters[key].push(e.permission);
    }
  });
  
  fs.writeFileSync(path.join(BACKEND_ROOT, 'module_permission_map.json'), JSON.stringify(clusters, null, 2));

  console.log(`Found ${endpoints.length} endpoints.`);
  console.log('Discovery saved to endpoint_discovery.txt and module_permission_map.json');
}

discover();
