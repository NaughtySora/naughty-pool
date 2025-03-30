"use strict";

const Pool = require("../lib/index.js");
const assert = require("node:assert");

const BYTE_8 = 2 << 2;
const factory = () => Buffer.alloc(BYTE_8);

const free = async () => {
  const pool = new Pool(factory).allocate(3);
  const buf = await pool.capture();
  buf.set([1, 255, 3]);
  const buf2 = await pool.capture();
  buf2.set([42]);
  const buf3 = await pool.capture();
  buf3.set([1, 55]);
  pool.release(buf2);
  const buf4 = await pool.capture();
  pool.release(buf);
  assert.strictEqual(buf2, buf4);
  const buf5 = await pool.capture();
  assert.strictEqual(buf, buf5);
};

const wait = async () => { };
const timeout = async () => { };
const signal = async () => { };
const max = () => { };
const maxTimeout = () => { };
const maxSignal = () => { };

const tests = [free];

(async () => {
  for (const test of tests) {
    await test();
  }
})();

// (async () => {
//   const buf = await pool.capture();
//   buf.set([1, 255, 3]);
//   console.log("buf1", buf)
//   setTimeout(() => {
//     pool.release(buf);
//   }, 2000);
//   const buf2 = await pool.capture();
//   buf2.set([3333]);
//   console.log("buf2", buf2)
//   const buf3 = await pool.capture();
//   buf3.set([1, 55]);
//   console.log("buf3", buf3)
//   const buf4 = await pool.capture({ signal: AbortSignal.timeout(1000) });
//   console.log("buf4", buf4);
// })();