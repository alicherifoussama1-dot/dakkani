// sharp@0.35.0 ships an "exports" map with no "types" condition, so under
// `moduleResolution: "bundler"` TypeScript resolves the runtime entry and
// finds no declarations — even though package.json still points `types` at
// lib/index.d.ts. (Fixed upstream in a later 0.35.x.)
//
// Rather than bump a native production dependency while the site is down,
// this re-points the module at the declarations it already ships, by a
// literal path that bypasses the exports map. Full typings, no dep change.
declare module 'sharp' {
  const sharp: (typeof import('../node_modules/sharp/lib/index'))['default']
  export default sharp
}
