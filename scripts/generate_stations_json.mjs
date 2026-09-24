import fs from 'node:fs';

const sharedStringsXml = fs.readFileSync('d:/Caim/temp_xlsx/xl/sharedStrings.xml', 'utf-8');
const strings = [];
const siRegex = /<si>([\s\S]*?)<\/si>/g;
let match;
while ((match = siRegex.exec(sharedStringsXml)) !== null) {
  const tMatches = [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)];
  const raw = tMatches.map(m => m[1]).join('');
  const decoded = raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
  strings.push(decoded);
}

function parseSheet(sheetPath) {
  const xml = fs.readFileSync(sheetPath, 'utf-8');
  const rows = [];
  const rowRegex = /<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(xml)) !== null) {
    const rowNum = parseInt(rowMatch[1], 10);
    const cells = {};
    const cRegex = /<c ([^>]*?)>(?:<v>([\s\S]*?)<\/v>)?/g;
    let cMatch;
    while ((cMatch = cRegex.exec(rowMatch[2])) !== null) {
      const attrs = cMatch[1];
      const rAttr = attrs.match(/r="([A-Z]+)\d+"/);
      if (!rAttr) continue;
      const col = rAttr[1];
      const tAttr = attrs.match(/t="([^"]+)"/);
      const val = cMatch[2];
      if (val !== undefined) {
        cells[col] = (tAttr && tAttr[1] === 's') ? strings[parseInt(val, 10)] : val;
      }
    }
    if (Object.keys(cells).length > 0) rows.push({ rowNum, cells });
  }
  return rows;
}

// 1. Parse Sheet 2 (เสา 60 ม.)
const s60 = parseSheet('d:/Caim/temp_xlsx/xl/worksheets/sheet2.xml');
const rows60 = s60.filter(r => /^\d+$/.test(r.cells['A']?.trim() || ''));

// Map existing codes if known, or generate clean codes
const existingCodes = {
  "BS คลองป่าหมู": "BS-014",
  "BS คลองพลู": "BS-022",
  "BS ช่อง": "BS-031",
  "BS ปางใหม่พัฒนา": "BS-045",
  "BS วังงิ้ว": "BS-058",
  "BS วัดบางอุดม": "BS-064",
  "BS ศรีสุขสำราญ": "BS-071",
  "BS หนองนกแก้ว": "BS-083",
  "ที่ว่าการอำเภอเขาคิชฌกูฏ": "GOV-01",
  "ที่ว่าการอำเภอเขาสวนกวาง": "GOV-02",
  "ที่ว่าการอำเภอคลองลาน": "GOV-03",
  "ที่ว่าการอำเภอดงเจริญ": "GOV-04",
  "ที่ว่าการอำเภอห้วยกระเจา": "GOV-05",
  "ที่ว่าการอำเภอวังน้ำเขียว": "GOV-06",
  "ที่ว่าการอำเภอย่านตาขาว": "GOV-07",
  "ที่ว่าการอำเภอหัวไทร": "GOV-08"
};

const stations60 = rows60.map((r, idx) => {
  const name = r.cells['B']?.trim() || '';
  const subdistrict = r.cells['C']?.trim() || '';
  const district = r.cells['D']?.trim() || '';
  const province = r.cells['E']?.trim() || '';
  const zone = r.cells['F']?.trim() || '';
  const area = r.cells['G']?.trim() || '';
  const siteType = r.cells['H']?.trim() || '';
  const contractor = r.cells['I']?.trim() || '';
  const towerType = r.cells['J']?.trim() || '';
  const height = parseInt(r.cells['K']?.trim() || '60', 10);
  const seaLevel = parseFloat(r.cells['L']?.trim() || '0');
  const lat = parseFloat(r.cells['M']?.trim() || '0');
  const lng = parseFloat(r.cells['N']?.trim() || '0');
  const code = existingCodes[name] || `BS-60-${String(idx + 1).padStart(2, '0')}`;

  return {
    id: `st-60-${idx + 1}`,
    code,
    name,
    subdistrict,
    district,
    province,
    area,
    zone,
    siteType,
    contractor,
    towerType,
    height,
    seaLevel,
    lat,
    lng,
    category: 'เสาสัญญาณหลัก 60 เมตร'
  };
});

console.log(`Parsed ${stations60.length} stations from เสา 60`);

// 2. Parse Sheet 3 (เสา 9, 18, 30 ม.)
const s918 = parseSheet('d:/Caim/temp_xlsx/xl/worksheets/sheet3.xml');
const rows918 = s918.filter(r => /^\d+$/.test(r.cells['A']?.trim() || ''));

const stations918 = rows918.map((r, idx) => {
  const name = r.cells['B']?.trim() || '';
  const subdistrict = r.cells['C']?.trim() || '';
  const district = r.cells['D']?.trim() || '';
  const province = r.cells['E']?.trim() || '';
  const zone = r.cells['F']?.trim() || '';
  const area = r.cells['G']?.trim() || '';
  const siteType = r.cells['H']?.trim() || '';
  const contractor = r.cells['K']?.trim() || '';
  const towerType = r.cells['L']?.trim() || '';
  const height = parseInt(r.cells['M']?.trim() || '9', 10);
  const seaLevel = parseFloat(r.cells['N']?.trim() || '0');
  const lat = parseFloat(r.cells['O']?.trim() || '0');
  const lng = parseFloat(r.cells['P']?.trim() || '0');
  const code = `RS-${String(idx + 1).padStart(3, '0')}`;

  return {
    id: `st-rs-${idx + 1}`,
    code,
    name,
    subdistrict,
    district,
    province,
    area,
    zone,
    siteType,
    contractor,
    towerType,
    height,
    seaLevel,
    lat,
    lng,
    category: `เสารับ-ส่งสัญญาณ ${height} เมตร`
  };
});

console.log(`Parsed ${stations918.length} stations from เสา 9, 18, 30`);

const allStations = [...stations60, ...stations918];
console.log(`Total stations: ${allStations.length}`);

// Write JSON
fs.writeFileSync('d:/Caim/src/data/stations.json', JSON.stringify(allStations, null, 2), 'utf-8');
console.log('Successfully wrote src/data/stations.json');

// Check stats
const provinces = [...new Set(allStations.map(s => s.province))];
const areas = [...new Set(allStations.map(s => s.area))];
const heights = [...new Set(allStations.map(s => s.height))].sort((a,b) => b-a);
console.log('Provinces (' + provinces.length + '):', provinces.join(', '));
console.log('Areas (' + areas.length + '):', areas.join(', '));
console.log('Heights:', heights.join(', '));
