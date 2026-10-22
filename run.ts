import { buildProfessionalUAV } from './src/components/ui/aircraft-model-builder';
try {
  const parts = buildProfessionalUAV('quadcopter');
  console.log('Quadcopter Root Children:', parts.rootGroup.children.length);
  const parts2 = buildProfessionalUAV('hexacopter');
  console.log('Hexacopter Root Children:', parts2.rootGroup.children.length);
} catch (e) {
  console.error('ERROR BUILDING:', e);
}
