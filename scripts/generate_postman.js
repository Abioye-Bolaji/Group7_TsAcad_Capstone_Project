const fs = require('fs');
const listEndpoints = require('express-list-endpoints');
const app = require('../src/app.js');

const endpoints = listEndpoints(app);

const collection = {
  info: {
    name: 'Multitenant CBT Platform API (100% Complete)',
    description: 'Auto-generated directly from the Express.js route registry to guarantee 100% endpoint coverage.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: []
};

// Group by path prefix
const groups = {};
endpoints.forEach(ep => {
  const prefix = ep.path.split('/')[3] || 'misc'; // /api/v1/PREFIX
  if (!groups[prefix]) groups[prefix] = [];
  
  ep.methods.forEach(method => {
    groups[prefix].push({
      name: `${method} ${ep.path}`,
      request: {
        method: method,
        header: [
          { key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }
        ],
        url: {
          raw: `http://localhost:5000${ep.path.replace(/:([a-zA-Z0-9_]+)/g, '{{$1}}')}`,
          host: ['http://localhost:5000'],
          path: ep.path.split('/').filter(p => p).map(p => p.replace(/:([a-zA-Z0-9_]+)/g, '{{$1}}'))
        }
      }
    });
  });
});

for (const [folderName, items] of Object.entries(groups)) {
  collection.item.push({
    name: folderName.toUpperCase(),
    item: items
  });
}

fs.writeFileSync('../cbt_platform_postman_collection.json', JSON.stringify(collection, null, 2));
console.log('Complete postman collection generated with ' + endpoints.length + ' endpoints.');
