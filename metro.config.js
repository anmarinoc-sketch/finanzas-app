const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Permite importar los .sql generados por drizzle-kit si algun dia se usan migraciones compiladas.
config.resolver.sourceExts.push('sql');
module.exports = config;
