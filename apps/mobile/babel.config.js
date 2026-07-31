module.exports = function (api) {
  api.cache(true)
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'react' }]],
    plugins: [
      // Must be LAST — Reanimated's worklet transform rewrites function bodies
      // and will silently break the Liquid Glass pill animation if reordered.
      'react-native-reanimated/plugin',
    ],
  }
}
