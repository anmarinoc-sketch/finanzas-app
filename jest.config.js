/**
 * Pruebas de la lógica pura y de la capa de datos. No monta componentes de
 * React Native: expo-sqlite se sustituye por el SQLite nativo de Node, así
 * que el repositorio y las consultas se ejecutan de verdad, sin emulador.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|date-fns)',
  ],
};
