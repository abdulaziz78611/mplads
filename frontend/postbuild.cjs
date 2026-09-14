const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const indexPath = path.join(distDir, 'index.html');

if (fs.existsSync(indexPath)) {
  fs.copyFileSync(indexPath, path.join(distDir, '404.html'));

  const routes = [
    'login',
    'dashboard',
    'projects',
    'alerts',
    'contractors',
    'map',
    'investigations',
    'reports',
    'methodology',
    'settings'
  ];

  routes.forEach((route) => {
    fs.copyFileSync(indexPath, path.join(distDir, route + '.html'));
    const routeFolder = path.join(distDir, route);
    if (!fs.existsSync(routeFolder)) {
      fs.mkdirSync(routeFolder, { recursive: true });
    }
    fs.copyFileSync(indexPath, path.join(routeFolder, 'index.html'));
  });
  console.log('SPA fallback and static route pages generated successfully.');
}
