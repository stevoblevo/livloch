# Play Stage 0.1 | optional Saelion style adapter

Three family kits meet at a visual-only boundary: the real Storeybrook Paper Pen produces
folded scenery, pinned Depthfield tokens pace three depth planes, and Hypermetapunk's
experimental draw-only Rainprint material makes the ground cache. All sources and hashes
are in the adjacent vendor notices. This adapter is an advancement candidate for game hosts,
not a new release of the upstream websites or a change to Livloch's gameplay lenses.

Import `createStage` with an exclusively owned 2D canvas factory, a Storeybrook pen,
and the optional materials renderer. Cache once per art style. `cache(style)` returns
the ridge, surface and folded fir atlases; add your own scene compositing. For 2D
dioramas `drawRidges` draws the middle and fore planes; the host owns the far matte
and the HUD. `depthPose` consumes camera yaw and a normalized lean, not pointer state;
pass the reduced-motion flag to lock the three decorative layers. WebGL hosts may
upload the caches as textures; dispose of GPU texture copies and call `dispose()`
at teardown. Classic opts out of the atlas. The HMP drawing occurs at cache creation
only, not per rendered frame; startup needs no remote requests. For missing HMP contexts,
a flat base is substituted. If the entire add-on is unavailable, the host continues without it.

`cue()` maps a small read-only set of story facts into a presentation label. Keep the
thief distinct in shape and keep the golden wake plus text as non-color-only directions
in every treatment. Do not use this module in the rules or change hitboxes, saves or outcomes
when switching treatments. Do not use this adapter as an upstream release claim.

`windGlyph(style)` returns a 96px shared alpha atlas for a directional current cue.
It has a consistent double-chevron outline across Foldlight, Rainprint, Original;
Foldlight calls the real pen for facets, Rainprint uses engraved linework.
The host may project it at a path tangent and set opacity from confirmed state.
Do not infer flight eligibility from the visual. The host owns any GPU texture
copies; dispose of those separately.
