type Factory = (...args: any[]) => any;

interface CaptureOptions {
  signal?: AbortSignal;
}

export class Pool<F extends Factory> {
  constructor(factory: F, ...args: Parameters<F>);
  allocate(min: number): this;
  release(entity: ReturnType<F>): void;
  capture(options?: CaptureOptions): Promise<ReturnType<F>>;
  timeout(ms: number): this;
  limit(max: number): this;
}
