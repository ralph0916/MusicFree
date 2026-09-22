/**
 * QQ 专用 TEA（16 轮）加密，用于 ptlogin 密码字段。
 */
function u32(n: number) {
    return n >>> 0;
}

function xor8(a: Uint8Array, b: Uint8Array) {
    const out = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
        out[i] = a[i] ^ b[i];
    }
    return out;
}

function readU32(buf: Uint8Array, offset: number) {
    return (
        ((buf[offset] << 24) |
            (buf[offset + 1] << 16) |
            (buf[offset + 2] << 8) |
            buf[offset + 3]) >>>
        0
    );
}

function writeU32(buf: Uint8Array, offset: number, value: number) {
    buf[offset] = (value >>> 24) & 0xff;
    buf[offset + 1] = (value >>> 16) & 0xff;
    buf[offset + 2] = (value >>> 8) & 0xff;
    buf[offset + 3] = value & 0xff;
}

function teaCode(v: Uint8Array, k: Uint8Array) {
    let y = readU32(v, 0);
    let z = readU32(v, 4);
    const k0 = readU32(k, 0);
    const k1 = readU32(k, 4);
    const k2 = readU32(k, 8);
    const k3 = readU32(k, 12);
    let sum = 0;
    const delta = 0x9e3779b9;
    for (let i = 0; i < 16; i++) {
        sum = u32(sum + delta);
        y = u32(y + (u32((z << 4) + k0) ^ u32(z + sum) ^ u32((z >>> 5) + k1)));
        z = u32(z + (u32((y << 4) + k2) ^ u32(y + sum) ^ u32((y >>> 5) + k3)));
    }
    const out = new Uint8Array(8);
    writeU32(out, 0, y);
    writeU32(out, 4, z);
    return out;
}

export function qqTeaEncrypt(plain: Uint8Array, key: Uint8Array) {
    const filln = ((8 - ((plain.length + 2) % 8)) % 8) + 2;
    const fills = new Uint8Array(filln);
    for (let i = 0; i < filln; i++) {
        fills[i] = Math.floor(Math.random() * 256);
    }
    const total = new Uint8Array(1 + filln + plain.length + 7);
    total[0] = (filln - 2) | 0xf8;
    total.set(fills, 1);
    total.set(plain, 1 + filln);
    // trailing 7 zeros already 0

    let tr = new Uint8Array(8);
    let to = new Uint8Array(8);
    const result = new Uint8Array(total.length);
    let offset = 0;
    for (let i = 0; i < total.length; i += 8) {
        const block = total.subarray(i, i + 8);
        const o = xor8(block, tr);
        tr = xor8(teaCode(o, key), to);
        to = o;
        result.set(tr, offset);
        offset += 8;
    }
    return result;
}
