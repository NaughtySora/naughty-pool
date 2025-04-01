# Naughty Pool
[![license](https://img.shields.io/github/license/NaughtySora/naughty-pool)](https://github.com/NaughtySora/naughty-pool/blob/master/LICENSE)
[![snyk](https://snyk.io/test/github/NaughtySora/naughty-pool/badge.svg)](https://snyk.io/test/github/NaughtySora/naughty-pool)
[![npm version](https://badge.fury.io/js/naughty-pool.svg)](https://badge.fury.io/js/naughty-pool)
[![NPM Downloads](https://img.shields.io/npm/dm/naughty-pool)](https://www.npmjs.com/package/naughty-pool)
[![NPM Downloads](https://img.shields.io/npm/dt/naughty-pool)](https://www.npmjs.com/package/naughty-pool)

## Usage
- Install: `npm install naughty-pool`
- Require: `const { Pool } = require('naughty-pool')`

```js
const BYTES = 8;
const MINUTE = 60 * 1000;
const factory = () => Buffer.alloc(BYTES);
const pool = new Pool(factory)
  .allocate(3)
  .limit(5)
  .timeout(MINUTE);

const buffer = await pool.capture();
buffer.set([1, 2, 3, 4]);
pool.release(buffer);

const signal = AbortSignal.timeout(1000);
const buffer = await pool.capture({ signal });

const { createPublicClient, http } = require('viem');
const { mainnet } = require('viem/chains');
const options = { chain: mainnet, transport: http("RPC") };
const clientPool = new Pool(createPublicClient, options).allocate(3);

const client = await clientPool.capture();
const blockNumber = await client.getBlockNumber();
clientPool.release(client);
```

## Pool
- `constructor(factory: F, ...args: Parameters<F>)`
- `allocate(min: number): this`
- `release(entity: ReturnType<F>): void`
- `capture(options?: CaptureOptions): Promise<ReturnType<F>>`
- `timeout(ms: number): this`
- `limit(max: number): this`

## Part of the naughty stack
