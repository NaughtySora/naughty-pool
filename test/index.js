'use strict';

const { Pool } = require('../main');
const assert = require('node:assert');
const { it, describe } = require('node:test');

const BYTES = 8;
const factory = () => Buffer.alloc(BYTES);

(async () => {
  describe('capture', () => {
    it('essential', async () => {
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
      pool.release(buf3);
      const buf6 = await pool.capture();
      assert.strictEqual(buf3, buf6);
      pool.release(buf4);
      pool.release(buf5);
      pool.release(buf6);
    });

    it('timeout', async () => {
      {
        const pool = new Pool(factory).allocate(1).timeout(300);
        const buf = await pool.capture();
        buf.set([1, 255, 3]);
        setTimeout(() => {
          pool.release(buf);
        }, 500);
        assert.rejects(async () => {
          await pool.capture();
        }, { message: 'Waiting timeout' });
      }

      {
        const pool = new Pool(factory).allocate(1).timeout(500);
        const buf2 = await pool.capture();
        buf2.set([1, 255, 3]);
        setTimeout(() => {
          pool.release(buf2);
        }, 100);
        const buf3 = await pool.capture();
        assert.strictEqual(buf3, buf2);
      }
    });

    it('signal', async () => {
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
      assert.strictEqual(buf2, buf);
    });

    it('waiting', async () => {
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
    });
  });

  describe('allocate', () => {
    it('manual', async () => {
      const pool = new Pool(factory).allocate(1);
      const buf = await pool.capture();
      pool.allocate(2);
      pool.release(buf);
      const buf2 = await pool.capture();
      assert.notStrictEqual(buf, buf2);
      await pool.capture();
      pool.allocate(2);
      await pool.capture({ signal: AbortSignal.timeout(0) });
      await pool.capture({ signal: AbortSignal.timeout(0) });
    });

    it('limit', async () => {
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
    });

    it('limit/timeout', async () => {
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
      }, { message: 'Waiting timeout' });
    });

    it('limit/timeout/signal', async () => {
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
      assert.strictEqual(buf4, buf3);
    });
  });

  describe('release', () => {
    if ('essential', async () => {
      const pool = new Pool(factory).allocate(2);
      const buf = await pool.capture();
      pool.release({ a: 1 });
      pool.release(Buffer.from([0, 0, 0]));
      pool.release('');
      pool.release(null);
      assert.strictEqual(pool.free, 1);
      assert.strictEqual(pool.size, 2);
      pool.release(buf);
      assert.strictEqual(pool.free, pool.size);
    });
  });

  describe('Dispose', () => {
    it('manual', async () => {
      const pool = new Pool(factory).allocate(3);
      setTimeout(() => {
        pool[Symbol.dispose]();
      }, 1000);
      const buf = await pool.capture();
      buf.set([1, 2, 4]);
      await pool.capture();
      await pool.capture();
      assert.rejects(async () => {
        await pool.capture();
      }, { message: 'Pool disposed' });
    });
    it('manual signal', async () => {
      const pool = new Pool(factory).allocate(3);
      setTimeout(() => {
        pool[Symbol.dispose]();
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
    it('using Node 24.x', async () => {
      let p = null;
      {
        await using pool = new Pool(factory).allocate(2);
        await pool.capture();
        p = pool;
      }
      assert.strictEqual(p.size, 0);
      assert.strictEqual(p.free, 0);
    });
  });
})();
