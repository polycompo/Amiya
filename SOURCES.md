# Asset sources

## Map boundaries

- Original publisher: 통계청 통계지리정보서비스 (SGIS), https://sgis.kostat.go.kr/
- Boundary year: 2018. The source repository records collection on 2018-12-24.
- Distributor: southkorea/southkorea-maps (Lucy Park / Team POPONG and contributors).
- Source: https://github.com/southkorea/southkorea-maps/blob/master/kostat/2018/json/skorea-municipalities-2018-topo-simple.json
- License statement: https://github.com/southkorea/southkorea-maps/blob/master/kostat/2018/json/LICENSE.md
- License: 공공누리 제1유형 (출처표시), https://www.kogl.or.kr/info/license.do
- Retained source snapshot: `scripts/map-source.topo.json`.
- Modifications: selected Seoul's 25 districts and Seongnam-si Bundang-gu (`31023`), converted TopoJSON arcs to SVG paths with a local equirectangular projection, restyled boundaries, and added career annotations. All other regions are excluded from the displayed SVG. No inset map is used.
- Derivative SVG: `src/assets/career-map.svg`. Regenerate with `npm run map:generate`.
- Work markers represent the Pangyo and Gangnam areas; they are not verified office addresses. Bundang-gu fill represents the user's main freelance work area. Pangyo is retained as a distinct point inside the Bundang area.
- The historical boundaries provide geographic context and do not represent a survey, current legal boundary, or navigation map.

Original source license text:

> 본 디렉토리에 포함된 지도 원자료는 통계청 통계지리정보서비스(https://sgis.kostat.go.kr/)에서 공공누리 제 1유형 라이선스에 의거해 제공하는 것으로, 2018년 12월 24일에 수집되었습니다.

## Font

- Wanted Sans Variable, by The Wanted Sans Project Authors / Wanted Lab.
- Source: https://github.com/wanteddev/wanted-sans
- Revision: `02c9b822349c188ada95f9e2d90c2ed18f853235`, matching the selected font-comparison specimen.
- Font: https://github.com/wanteddev/wanted-sans/blob/02c9b822349c188ada95f9e2d90c2ed18f853235/packages/wanted-sans/fonts/webfonts/variable/complete/woff2/WantedSansVariable.woff2
- SIL Open Font License 1.1; included at `public/fonts/OFL.txt`.
- The font is bundled locally. System Korean sans-serif fonts provide a fallback.

## Presentation content

- `src/assets/pixel-walker.svg` is original pixel artwork created for this presentation, with eight horizontal 48×56 frames. CSS displays one frame at a time; it has no remote assets or runtime dependencies.

The user supplied all employer names, dates, and work regions. No company source code, project screen, internal URL, semiconductor design data, or external API is included.
