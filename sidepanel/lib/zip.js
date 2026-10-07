// zip.js — minimal "store" (no compression) ZIP writer, dependency-free.
// Enough to build valid .docx (OOXML) files, which are just ZIP containers.
'use strict';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function strToBytes(str) {
  return new TextEncoder().encode(str);
}

function u16(n) { return [n & 0xFF, (n >>> 8) & 0xFF]; }
function u32(n) { return [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF]; }

// DOS date/time = fixed epoch (files don't need real timestamps)
const DOS_TIME = 0;
const DOS_DATE = 0x21; // 1980-01-01

/**
 * Build a ZIP file (store method, uncompressed) from a list of {name, content} entries.
 * content: string or Uint8Array
 * Returns a Blob.
 */
function createZip(files) {
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = strToBytes(file.name);
    const dataBytes = typeof file.content === 'string' ? strToBytes(file.content) : file.content;
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    const localHeader = new Uint8Array([
      0x50, 0x4B, 0x03, 0x04, // local file header signature
      20, 0,                   // version needed
      0, 0,                    // flags
      0, 0,                    // compression = store
      ...u16(DOS_TIME),
      ...u16(DOS_DATE),
      ...u32(crc),
      ...u32(size),             // compressed size
      ...u32(size),             // uncompressed size
      ...u16(nameBytes.length),
      ...u16(0)                 // extra field length
    ]);

    localChunks.push(localHeader, nameBytes, dataBytes);

    const centralHeader = new Uint8Array([
      0x50, 0x4B, 0x01, 0x02, // central directory signature
      20, 0,                   // version made by
      20, 0,                   // version needed
      0, 0,                    // flags
      0, 0,                    // compression
      ...u16(DOS_TIME),
      ...u16(DOS_DATE),
      ...u32(crc),
      ...u32(size),
      ...u32(size),
      ...u16(nameBytes.length),
      ...u16(0),                // extra field length
      ...u16(0),                // comment length
      ...u16(0),                // disk number start
      ...u16(0),                // internal attrs
      ...u32(0),                // external attrs
      ...u32(offset)            // local header offset
    ]);

    centralChunks.push(centralHeader, nameBytes);

    offset += localHeader.length + nameBytes.length + dataBytes.length;
  }

  const centralStart = offset;
  let centralSize = 0;
  for (const c of centralChunks) centralSize += c.length;

  const endRecord = new Uint8Array([
    0x50, 0x4B, 0x05, 0x06, // end of central directory signature
    ...u16(0), ...u16(0),    // disk numbers
    ...u16(files.length),
    ...u16(files.length),
    ...u32(centralSize),
    ...u32(centralStart),
    ...u16(0)                 // comment length
  ]);

  const parts = [...localChunks, ...centralChunks, endRecord];
  return new Blob(parts, { type: 'application/zip' });
}

window.createZip = createZip;
