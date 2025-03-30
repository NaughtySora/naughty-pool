# Naughty Pool

## Usage
- Install: `npm install naughty-pool`
- Require: `const pool = require('naughty-pool')`


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
const client = (params) => createPublicClient(params);
const client_pool = new Pool(client, { chain: mainnet, transport: http("RPC")});

const client = await client_pool.capture();
const blockNumber = await client.getBlockNumber();
```

## Pool
- `constructor(factory: F, ...args: Parameters<F>)`
- `allocate(min: number, max?: number): this`
- `release(entity: ReturnType<F>): void`
- `capture(options?: CaptureOptions): Promise<ReturnType<F>>`
- `timeout(ms: number): this`
- `limit(max: number): this`

## Part of the naughty stack
