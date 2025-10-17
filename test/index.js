'use strict';

const { Pool } = require('../main');
const { it, describe } = require('node:test');
const assert = require('node:assert/strict');

const BYTES = 8;
const factory = () => Buffer.alloc(BYTES);

describe('Pool', async () => {
  await describe('capture', async () => {
    await it('essential', async () => {
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
      assert.equal(buf2, buf4);
      const buf5 = await pool.capture();
      assert.equal(buf, buf5);
      pool.release(buf3);
      const buf6 = await pool.capture();
      assert.equal(buf3, buf6);
      pool.release(buf4);
      pool.release(buf5);
      pool.release(buf6);
    });

    await it('timeout', async () => {
      await it('capture', async () => {
        const pool = new Pool(factory).allocate(1).timeout(300);
        const buf = await pool.capture();
        buf.set([1, 255, 3]);
        setTimeout(() => {
          pool.release(buf);
        }, 500);
        assert.rejects(async () => {
          await pool.capture();
        }, { message: 'Waiting timeout' });
      });
      await it('capture/release', async () => {
        const pool = new Pool(factory).allocate(1).timeout(500);
        const buf2 = await pool.capture();
        buf2.set([1, 255, 3]);
        setTimeout(() => {
          pool.release(buf2);
        }, 100);
        const buf3 = await pool.capture();
        assert.equal(buf3, buf2);
      });
    });

    await it('signal', async () => {
      const pool = new Pool(factory).allocate(1);
      const buf = await pool.capture();
      buf.set([1, 255, 3]);
      setTimeout(() => {
        pool.release(buf);
      }, 500);
      assert.rejects(async () => {
        await pool.capture({ signal: AbortSignal.timeout(200) });
      }, { message: 'Signal aborted' });
      assert.rejects(async () => {
        const controller = new AbortController();
        setTimeout(() => {
          controller.abort();
        }, 10);
        await pool.capture({ signal: controller.signal });
      }, { message: 'Signal aborted' });
      const buf2 = await pool.capture();
      assert.equal(buf2, buf);
    });

    await it('waiting', async () => {
      const pool = new Pool(factory).allocate(1);
      const buf = await pool.capture();
      buf.set([1, 255, 3]);
      setTimeout(() => {
        pool.release(buf);
      }, 2000);
      const buf2 = await pool.capture();
      assert.equal(buf2, buf);
      setTimeout(() => {
        pool.release(buf2);
      }, 1500);
      const buf3 = await pool.capture();
      assert.equal(buf3, buf2);
    });
  });

  await describe('allocate', async () => {
    await it('manual', async () => {
      const pool = new Pool(factory).allocate(1);
      const buf = await pool.capture();
      pool.allocate(2);
      pool.release(buf);
      const buf2 = await pool.capture();
      assert.notEqual(buf, buf2);
      await pool.capture();
      pool.allocate(2);
      await pool.capture({ signal: AbortSignal.timeout(0) });
      await pool.capture({ signal: AbortSignal.timeout(0) });
    });

    await it('limit', async () => {
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
      assert.equal(buf2, buf4);
    });

    await it('limit/timeout', async () => {
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
      assert.equal(buf4, buf);
      setTimeout(() => {
        pool.release(buf2);
      }, 1000);
      assert.rejects(async () => {
        await pool.capture();
      }, { message: 'Waiting timeout' });
    });

    await it('limit/timeout/signal', async () => {
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
        await pool.capture({ signal: AbortSignal.timeout(100) });
      }, { message: 'Signal aborted' });
      assert.rejects(async () => {
        const controller = new AbortController();
        setTimeout(() => {
          controller.abort();
        }, 10);
        await pool.capture({ signal: controller.signal });
      }, { message: 'Signal aborted' });
      const buf4 = await pool.capture();
      assert.equal(buf4, buf3);
    });

    it('negative amount', () => {
      assert.throws(() => {
        new Pool().allocate(-3);
      }, { message: "Pool requires positive integer" });
    });
  });

  await describe('release', async () => {
    const pool = new Pool(factory).allocate(2);
    const buf = await pool.capture();
    pool.release({ a: 1 });
    pool.release(Buffer.from([0, 0, 0]));
    pool.release('');
    pool.release(null);
    assert.equal(pool.free, 1);
    assert.equal(pool.size, 2);
    pool.release(buf);
    assert.equal(pool.free, pool.size);
  });

  await describe('Dispose', async () => {
    await it('manual', async () => {
      const pool = new Pool(factory).allocate(3).timeout(1000);
      setTimeout(() => {
        pool[Symbol.dispose]();
        assert.equal(pool.size, 0);
        assert.equal(pool.free, 0);
      }, 1000);
      (await pool.capture()).set([1, 2, 4]);
      await pool.capture();
      await pool.capture();
      assert.rejects(async () => {
        await pool.capture();
      }, { message: 'Pool disposed' });
    });

    await it('manual signal', async () => {
      const pool = new Pool(factory).allocate(3);
      setTimeout(() => {
        pool[Symbol.dispose]();
        assert.equal(pool.size, 0);
        assert.equal(pool.free, 0);
      }, 1000);
      const buf = await pool.capture();
      buf.set([1, 2, 4]);
      await pool.capture();
      await pool.capture();
      assert.rejects(async () => {
        const controller = new AbortController();
        await pool.capture({ signal: controller.signal });
      }, { message: 'Signal aborted' });
    });

    await it('using Node 24.x', async () => {
      let p = null;
      {
        await using pool = new Pool(factory).allocate(2);
        await pool.capture();
        p = pool;
      }
      assert.equal(p.size, 0);
      assert.equal(p.free, 0);
    });
  });
})
