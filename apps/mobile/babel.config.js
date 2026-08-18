module.exports = function (api) {
  api.cache(true)
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'react' }]],
    plugins: [
      // Must be LAST — the worklet transform rewrites function bodies and will
      // silently break the Liquid Glass pill animation if reordered.
      //
      // Named react-native-worklets/plugin since Reanimated 4: the worklet
      // transform moved into its own package, and react-native-reanimated/plugin
      // is now only a shim re-exporting this. Using the real name means the day
      // that shim is dropped, nothing here breaks.
      'react-native-worklets/plugin',
    ],
  }
}
