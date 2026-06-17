// Grezzo LzS (classic LZSS, 4096-byte ring buffer) + GAR2 archive reader.
// Exports: decompressLzS(buf), parseGar(buf) -> {files:[{name,path,type,offset,size,magic,data}]}.
import fs from "fs";

export function decompressLzS(buf) {
	if (buf.toString("ascii", 0, 3) !== "LzS") return buf;
	const decompSize = buf.readUInt32LE(0x08);
	const N = 4096,
		F = 18,
		THRESH = 2;
	const out = Buffer.alloc(decompSize);
	const win = new Uint8Array(N); // ring buffer, zero-initialised
	let r = N - F,
		s = 0x10,
		d = 0;
	while (d < decompSize && s < buf.length) {
		let flags = buf[s++];
		for (let b = 0; b < 8 && d < decompSize; b++) {
			if (flags & 1) {
				const c = buf[s++];
				out[d++] = c;
				win[r++] = c;
				r &= N - 1;
			} else {
				const b0 = buf[s++],
					b1 = buf[s++];
				const i = b0 | ((b1 & 0xf0) << 4);
				const len = (b1 & 0x0f) + THRESH + 1;
				for (let k = 0; k < len && d < decompSize; k++) {
					const c = win[(i + k) & (N - 1)];
					out[d++] = c;
					win[r++] = c;
					r &= N - 1;
				}
			}
			flags >>= 1;
		}
	}
	return out;
}

const rs = (b, o) => {
	let e = o;
	while (e < b.length && b[e] >= 0x20 && b[e] < 0x7f) e++;
	return b.toString("ascii", o, e);
};

// GAR version 2 (Grezzo). Layout reverse-engineered from MM3D actors:
//  0x00 'GAR\2'  0x04 u32 fileSize  0x08 u16 typeCount  0x0A u16 fileCount
//  0x0C u32 typeTableOffs  0x10 u32 fileEntryTableOffs  0x14 u32 fileNameOffsTableOffs?
//  type entry (0x10): u32 count, u32 fileIndexTableOffs, u32 typeNameOffs, u32(-1)
//  fileIndexTable: u32 indices into the global file-entry table
//  file entry (0x0C): u32 dataOffs, u32 nameOffs, u32 fullPathOffs
export function parseGar(buf) {
	const gar = decompressLzS(buf);
	if (gar.toString("ascii", 0, 4) !== "GAR\x02") throw new Error("not GAR2");
	const u32 = (o) => gar.readUInt32LE(o),
		u16 = (o) => gar.readUInt16LE(o);
	const typeCount = u16(0x08);
	const fileCount = u16(0x0a);
	const typeTableOffs = u32(0x0c);
	const fileEntryTableOffs = u32(0x10);
	// File entry (0x0C): u32 size, u32 nameOffs, u32 fullPathOffs. There is no
	// per-file data offset — the file blobs are stored back-to-back after the
	// string table, in file-index order. Recover the first blob offset, then
	// accumulate sizes.
	const sizeOf = (idx) => u32(fileEntryTableOffs + idx * 0x0c);
	let dataStart = -1;
	for (let p = fileEntryTableOffs; p + 8 <= gar.length; p += 4) {
		if (gar.readUInt32LE(p + 4) === sizeOf(0) && /^(cmb |csab|cmab|ctxb|shpa|cmml)/.test(gar.toString("ascii", p, p + 4))) {
			dataStart = p;
			break;
		}
	}
	const dataOffsByIndex = new Array(fileCount);
	let cur = dataStart;
	for (let i = 0; i < fileCount; i++) {
		dataOffsByIndex[i] = cur;
		cur += sizeOf(i);
	}
	const files = [];
	for (let i = 0; i < typeCount; i++) {
		const t = typeTableOffs + i * 0x10;
		const count = u32(t);
		const idxTbl = u32(t + 0x04);
		const typeName = rs(gar, u32(t + 0x08));
		for (let j = 0; j < count; j++) {
			const fileIndex = u32(idxTbl + j * 0x04);
			const e = fileEntryTableOffs + fileIndex * 0x0c;
			const size = u32(e + 0x00);
			const name = rs(gar, u32(e + 0x04));
			const path = rs(gar, u32(e + 0x08));
			const dataOffs = dataOffsByIndex[fileIndex];
			const magic = gar.toString("ascii", dataOffs, dataOffs + 4);
			files.push({name, path, type: typeName, offset: dataOffs, size, magic, data: gar.subarray(dataOffs, dataOffs + size)});
		}
	}
	return {gar, files};
}

// CLI: node gar.mjs <file.gar.lzs> [outDir]
if (process.argv[1] && process.argv[1].endsWith("gar.mjs")) {
	const [, , inFile, outDir] = process.argv;
	const {files} = parseGar(fs.readFileSync(inFile));
	for (const f of files) {
		let extra = "";
		if (f.magic === "csab") {
			const d = f.data;
			// duration/bone fields probed below by caller; just note size here
			extra = `dur?=${d.readUInt32LE(0x34) + 1}`;
		}
		console.log(`[${f.type}] ${f.path || f.name}  magic=${f.magic} size=${f.size} ${extra}`);
		if (outDir) {
			fs.mkdirSync(outDir, {recursive: true});
			fs.writeFileSync(`${outDir}/${(f.path || f.name).replace(/[\\/]/g, "_")}`, f.data);
		}
	}
}
