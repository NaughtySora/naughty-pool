"use strict";

const { Pool } = require("../main");
const assert = require("node:assert");

const BYTES = 8;
const factory = () => Buffer.alloc(BYTES);

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

const wait = async () => {
  const pool = new Pool(factory).allocate(1);
  const buf = await pool.capture();
  buf.set([1, 255, 3]);
  setTimeout(() => {
    pool.release(buf);
  }, 2000);
  const buf2 = await pool.capture();
  assert.strictEqual(buf2, buf);
  setTimeout(() => {
    pool.release(buf2);
  }, 1500);
  const buf3 = await pool.capture();
  assert.strictEqual(buf3, buf2);
};

const timeout = async () => {
  const pool_300 = new Pool(factory).allocate(1).timeout(300);
  const buf = await pool_300.capture();
  buf.set([1, 255, 3]);
  setTimeout(() => {
    pool_300.release(buf);
  }, 500);
  assert.rejects(async () => {
    await pool_300.capture();
  });

  const pool_500 = new Pool(factory).allocate(1).timeout(500);
  const buf2 = await pool_500.capture();
  buf2.set([1, 255, 3]);
  setTimeout(() => {
    pool_500.release(buf2);
  }, 100);
  const buf3 = await pool_500.capture();
  assert.strictEqual(buf3, buf2);
};

const signal = async () => {
  const pool = new Pool(factory).allocate(1);
  const buf = await pool.capture();
  buf.set([1, 255, 3]);
  setTimeout(() => {
    pool.release(buf);
  }, 500);
  assert.rejects(async () => {
    await pool.capture({ signal: AbortController.timeout(200) });
  });
  assert.rejects(async () => {
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort();
    }, 10);
    await pool.capture({ signal: controller.signal });
  });
  const buf2 = await pool.capture();
  assert.strictEqual(buf2, buf);
};

const max = async () => {
  const pool = new Pool(factory).allocate(1).limit(3);
  const buf = await pool.capture();
  buf.set([1]);
  const buf2 = await pool.capture();
  buf2.set([2]);
  const buf3 = await pool.capture();
  buf3.set([3]);
  setTimeout(() => {
    pool.release(buf2);
  }, 250);
  const buf4 = await pool.capture();
  assert.strictEqual(buf2, buf4);
};

const maxTimeout = async () => {
  const pool = new Pool(factory).allocate(1).limit(3).timeout(500);
  const buf = await pool.capture();
  buf.set([1]);
  const buf2 = await pool.capture();
  buf2.set([2]);
  const buf3 = await pool.capture();
  buf3.set([3]);
  setTimeout(() => {
    pool.release(buf);
  }, 250);
  const buf4 = await pool.capture();
  assert.strictEqual(buf4, buf);
  setTimeout(() => {
    pool.release(buf2);
  }, 1000);
  assert.rejects(async () => {
    await pool.capture();
  });
};

const maxSignal = async () => {
  const pool = new Pool(factory).allocate(1).limit(3).timeout(500);
  const buf = await pool.capture();
  buf.set([1]);
  const buf2 = await pool.capture();
  buf2.set([2]);
  const buf3 = await pool.capture();
  buf3.set([3]);
  setTimeout(() => {
    pool.release(buf3);
  }, 200);
  assert.rejects(async () => {
    await pool.capture({ signal: AbortController.timeout(100) });
  });
  assert.rejects(async () => {
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort();
    }, 10);
    await pool.capture({ signal: controller.signal });
  });
  const buf4 = await pool.capture();
  assert.strictEqual(buf4, buf3);
};

const allocate = async () => {
  const pool = new Pool(factory).allocate(1);
  const buf = await pool.capture();
  pool.allocate(2);
  const buf2 = await pool.capture();
  assert.notStrictEqual(buf, buf2);
  await pool.capture();
  pool.allocate(2);
  await pool.capture();
  await pool.capture();
};

const tests = [free, wait, timeout, signal, max, maxSignal, maxTimeout, allocate];

(async () => {
  for (const test of tests) await test();
})();
