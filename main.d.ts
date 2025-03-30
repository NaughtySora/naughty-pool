type Factory = (...args: any[]) => any;

export class Pool<F extends Factory> {
  constructor(factory: F, ...args: Parameters<F>);
  allocate(min: number, max?: number): this;
  release(entity: ReturnType<F>): void;
  capture(): Promise<ReturnType<F>>;
  timeout(ms: number): this;
  limit(max: number): this;
}
