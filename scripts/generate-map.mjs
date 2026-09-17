import { readFile, writeFile } from 'node:fs/promises';

// Source snapshot: SGIS 2018, via southkorea/southkorea-maps. See SOURCES.md.
const SOURCE_FILE = new URL('./map-source.topo.json', import.meta.url);
const OUTPUT_FILE = new URL('../src/assets/career-map.svg', import.meta.url);
const LONGITUDE_ORIGIN = 126.5;
const LATITUDE_ORIGIN = 38.5;
const PROJECTION_SCALE = 1000;
const LONGITUDE_FACTOR = Math.cos(37.5 * Math.PI / 180);
const SEOUL_PREFIX = '11';
const BUNDANG_CODE = '31023';
const GANGNAM_CODE = '11230';
const MAP_WIDTH = 740;
const MAP_HEIGHT = 640;
const MAP_VIEWBOX = `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`;
const PANGYO_LOCATION = [127.112, 37.395];
const GANGNAM_LOCATION = [127.045, 37.502];
const BUNDANG_LABEL_GAP = 28;
const SVG_PIN = 'M0 0C-4-7-19-21-19-34a19 19 0 1 1 38 0C19-21 4-7 0 0Z';

const topology = JSON.parse(await readFile(SOURCE_FILE, 'utf8'));
const geometries = Object.values(topology.objects)[0].geometries.filter(({ properties }) =>
  properties.code.startsWith(SEOUL_PREFIX) || properties.code === BUNDANG_CODE);

function project([longitude, latitude]) {
  return [(longitude - LONGITUDE_ORIGIN) * LONGITUDE_FACTOR * PROJECTION_SCALE,
    (LATITUDE_ORIGIN - latitude) * PROJECTION_SCALE];
}

function decodeArc(index) {
  const coordinates = topology.arcs[index < 0 ? ~index : index];
  let longitude = 0;
  let latitude = 0;
  const decoded = coordinates.map(([deltaX, deltaY]) => {
    longitude += deltaX;
    latitude += deltaY;
    return project([
      longitude * topology.transform.scale[0] + topology.transform.translate[0],
      latitude * topology.transform.scale[1] + topology.transform.translate[1],
    ]);
  });
  return index < 0 ? decoded.reverse() : decoded;
}

function getRings(geometry) {
  if (geometry.type === 'Polygon') return geometry.arcs;
  return geometry.arcs.flat();
}

function ringPoints(arcs) {
  return arcs.flatMap((arc, index) => decodeArc(arc).slice(index === 0 ? 0 : 1));
}

function geometryPath(geometry) {
  return getRings(geometry).map((ring) =>
    `${ringPoints(ring).map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join('')}Z`).join('');
}

const shapes = geometries.map((geometry) => {
  const regionClass = geometry.properties.code.startsWith(SEOUL_PREFIX) ? 'seoul' : 'gyeonggi';
  return `<path class="district ${regionClass}" data-code="${geometry.properties.code}" d="${geometryPath(geometry)}"/>`;
}).join('\n');
const bundangGeometry = geometries.find(({ properties }) => properties.code === BUNDANG_CODE);
const bundang = geometryPath(bundangGeometry);
const bundangPoints = getRings(bundangGeometry).flatMap(ringPoints);
const bundangLabelX = (Math.min(...bundangPoints.map(([x]) => x)) + Math.max(...bundangPoints.map(([x]) => x))) / 2;
const bundangLabelY = Math.max(...bundangPoints.map(([, y]) => y)) + BUNDANG_LABEL_GAP;
const gangnam = geometryPath(geometries.find(({ properties }) => properties.code === GANGNAM_CODE));
const points = geometries.flatMap((geometry) => getRings(geometry).flatMap(ringPoints));
const minimumX = Math.min(...points.map(([x]) => x));
const maximumX = Math.max(...points.map(([x]) => x));
const minimumY = Math.min(...points.map(([, y]) => y));
const maximumY = Math.max(...points.map(([, y]) => y));
const MAP_PADDING = 40;
const detailBounds = [minimumX - MAP_PADDING, minimumY - MAP_PADDING,
  maximumX - minimumX + MAP_PADDING * 2, maximumY - minimumY + MAP_PADDING * 2];
const [pangyoX, pangyoY] = project(PANGYO_LOCATION);
const [gangnamX, gangnamY] = project(GANGNAM_LOCATION);

function pin(id, x, y, order, label, direction) {
  const labelX = direction === 'left' ? -36 : 36;
  const anchor = direction === 'left' ? 'end' : 'start';
  return `<g id="${id}" class="map-event pin-event" data-map-step="${order}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})">
    <ellipse class="pin-ground" cy="1" rx="12" ry="4"/>
    <g class="pin-body"><path class="pin-shape" d="${SVG_PIN}"/><circle class="pin-center" cx="0" cy="-34" r="11"/><text class="pin-number" x="0" y="-30">${order}</text></g>
    <text class="pin-label" x="${labelX}" y="-27" text-anchor="${anchor}">${label}</text>
  </g>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MAP_VIEWBOX}" role="img" aria-labelledby="career-map-title career-map-description">
<title id="career-map-title">서울과 분당의 근무 이력 지도</title>
<desc id="career-map-description">판교의 Exntu와 강남의 KINX는 위치 핀, 분당 중심의 프리랜서 활동은 분당구 영역 색상으로 표시합니다. 위치는 정확한 사무실 주소가 아닌 지역의 대표 위치입니다.</desc>
<defs><g id="district-shapes" fill-rule="evenodd">${shapes}</g><path id="bundang-shape" d="${bundang}"/><path id="gangnam-shape" d="${gangnam}"/></defs>
<svg class="detail-map" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" viewBox="${detailBounds.join(' ')}" overflow="visible" aria-hidden="true">
  <g class="map-surface">
    <use href="#district-shapes"/>
    <use href="#gangnam-shape" class="gangnam-outline"/>
    <use href="#bundang-shape" class="bundang-base"/>
  </g>
  <g id="bundang-region" class="map-event area-event" data-map-step="3">
    <g class="area-reveal"><use href="#bundang-shape" class="bundang-fill"/></g>
  </g>
  <text class="detail-region-label" x="${gangnamX-105}" y="${gangnamY-85}">서울</text>
  <text class="detail-region-label" x="${bundangLabelX}" y="${bundangLabelY}">성남시 분당구</text>
  ${pin('pangyo-pin',pangyoX,pangyoY,1,'판교','left')}
  ${pin('gangnam-pin',gangnamX,gangnamY,2,'강남','right')}
</svg>
</svg>`;

await writeFile(OUTPUT_FILE, svg);
console.log(`Generated ${geometries.length} district paths; Bundang ${BUNDANG_CODE}; ${Buffer.byteLength(svg)} bytes.`);
