const fs = require("fs");
const zlib = require("zlib");

const pdfPath = "C:/Users/crist/Downloads/Plantilla v3.pdf";
const pdf = fs.readFileSync(pdfPath).toString("latin1");

function streamObj(n) {
  const re = new RegExp(
    `${n}\\s+0\\s+obj\\s*<<([\\s\\S]*?)>>\\s*stream\\r?\\n([\\s\\S]*?)\\r?\\nendstream`,
  );
  const match = pdf.match(re);
  if (!match) return null;
  let buffer = Buffer.from(match[2], "latin1");
  if (/FlateDecode/.test(match[1])) buffer = zlib.inflateSync(buffer);
  return buffer.toString("latin1");
}

function unicodeFromHex(hex) {
  const buffer = Buffer.from(hex, "hex");
  let out = "";
  for (let i = 0; i + 1 < buffer.length; i += 2) {
    out += String.fromCodePoint(buffer.readUInt16BE(i));
  }
  return out;
}

function buildCMap() {
  const cmap = streamObj(731);
  const map = {};

  for (const match of cmap.matchAll(
    /<([0-9A-Fa-f]{4})>\s+<([0-9A-Fa-f]{4,})>/g,
  )) {
    map[parseInt(match[1], 16)] = unicodeFromHex(match[2]);
  }

  for (const match of cmap.matchAll(
    /<([0-9A-Fa-f]{4})>\s+<([0-9A-Fa-f]{4})>\s+<([0-9A-Fa-f]{4})>/g,
  )) {
    const start = parseInt(match[1], 16);
    const end = parseInt(match[2], 16);
    const unicodeStart = parseInt(match[3], 16);
    for (let cid = start; cid <= end; cid += 1) {
      map[cid] = String.fromCodePoint(unicodeStart + cid - start);
    }
  }

  return map;
}

const cmap = buildCMap();

function decodeHexString(hex) {
  let out = "";
  for (let i = 0; i + 3 < hex.length; i += 4) {
    const cid = parseInt(hex.slice(i, i + 4), 16);
    out += cmap[cid] ?? "";
  }
  return out;
}

const pages = [];
for (const match of pdf.matchAll(
  /(\d+)\s+0\s+obj\s*<<[\s\S]*?\/Type\s*\/Page\b[\s\S]*?>>\s*endobj/g,
)) {
  const contents = match[0].match(/\/Contents\s+(\d+)\s+0\s+R/);
  if (contents) pages.push(Number(contents[1]));
}

pages.sort((a, b) => a - b);

let output = "";
pages.forEach((contentObj, index) => {
  const content = streamObj(contentObj) ?? "";
  const parts = [];

  for (const match of content.matchAll(/<([0-9A-Fa-f]+)>/g)) {
    const decoded = decodeHexString(match[1]).trim();
    if (decoded) parts.push(decoded);
  }

  const text = parts.join(" ").replace(/\s+/g, " ").trim();
  output += `\n\n--- PAGE ${index + 1} (content ${contentObj}) ---\n${text}\n`;
});

fs.writeFileSync("plantilla-v3-extracted.txt", output, "utf8");
console.log(output.slice(0, 12000));
console.log(`\nWROTE plantilla-v3-extracted.txt pages ${pages.length}`);
