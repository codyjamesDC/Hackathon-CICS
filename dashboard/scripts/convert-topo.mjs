// One-time conversion script: TopoJSON → GeoJSON
// Run with: node dashboard/scripts/convert-topo.mjs
import { readFileSync, writeFileSync } from 'fs';
import * as topojson from 'topojson-client';

const topo = JSON.parse(readFileSync('static/nagcarlan.topo.json', 'utf-8'));
const objectKey = Object.keys(topo.objects)[0];
const geojson = topojson.feature(topo, topo.objects[objectKey]);

writeFileSync(
  'static/nagcarlan_barangays.geojson',
  JSON.stringify(geojson, null, 2)
);

console.log(`✅ Converted ${geojson.features.length} barangay features`);
console.log('Sample properties:', JSON.stringify(geojson.features[0].properties, null, 2));
