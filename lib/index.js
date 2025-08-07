'use strict';

class Pool {
  #factory = null;
  #args = null;
  #collection = [];
  #free = [];
  #waiting = [];
  #max = 0;
  #ms = Infinity;

  constructor(factory, ...args) {
    this.#factory = factory;
    this.#args = args;
  }

  #next(entity) {
    const waiting = this.#waiting;
    if (waiting.length <= 0) return;
    const member = waiting.shift();
    const resolve = member.resolve;
    if (!resolve) return this.#next(entity);
    const timer = member.timer;
    if (timer) clearTimeout(timer);
    process.nextTick(resolve, entity);
  }

  #enqueue(member) {
    const ms = this.#ms;
    const signal = member.signal;
    const reject = member.reject;
    if (Number.isFinite(ms) && ms > 0) {
      member.timer = setTimeout(() => {
        clearTimeout(member.timer);
        member.resolve = null;
        member.timer = null;
        if (signal) signal.removeEventListener('abort', abort);
        reject(new Error('Waiting timeout'));
      }, ms);
    }
    if (signal) {
      const abort = () => {
        if (member.timer) {
          clearTimeout(member.timer);
          member.timer = null;
        }
        member.resolve = null;
        reject(new Error('Signal aborted'));
      };
      signal.addEventListener('abort', abort, { once: true });
    }
    this.#waiting.push(member);
  }

  allocate(amount) {
    if (amount <= 0) throw new Error('Pool requires positive integer');
    const collection = this.#collection;
    const size = collection.length;
    const free = this.#free;
    const factory = this.#factory.bind(null, ...this.#args);
    for (let i = 0; i < amount; i++) {
      collection.push(factory());
      free.push(i + size);
    }
    const length = collection.length;
    if (this.#max < length) this.#max = length;
    return this;
  }

  release(entity) {
    const index = this.#collection.indexOf(entity);
    const free = this.#free;
    if (index < 0 || free.includes(index)) return;
    if (this.#waiting.length > 0) return void this.#next(entity);
    free.push(index);
  }

  async capture(options = {}) {
    const free = this.#free;
    const collection = this.#collection;
    const left = free.length;
    if (left <= 0) {
      const size = collection.length;
      const maximum = this.#max - size;
      if (maximum < 1) {
        const signal = options?.signal ?? null;
        return new Promise((resolve, reject) => {
          this.#enqueue({ timer: null, signal, resolve, reject });
        });
      }
      this.allocate(maximum);
    }
    const index = free.shift();
    return collection[index];
  }

  timeout(ms) {
    this.#ms = ms;
    return this;
  }

  limit(max) {
    this.#max = max;
    return this;
  }

  async [Symbol.dispose]() {
    this.#factory = null;
    this.#args = null;
    this.#max = 0;
    this.#ms = Infinity;
    this.#collection.length = 0;
    this.#free.length = 0;
    const waiting = this.#waiting;
    while (waiting.length > 0) {
      const member = waiting.pop();
      const { timer, signal, reject } = member;
      member.resolve = null;
      if (timer) {
        clearTimeout(timer);
        member.timer = null;
      }
      if (signal) {
        signal.dispatchEvent(new CustomEvent('abort'));
        member.signal = null;
      } else {
        reject(new Error('Pool disposed'));
      }
      member.reject = null;
    }
  }

  get size() {
    return this.#collection.length;
  }

  get free() {
    return this.#free.length;
  }
}

module.exports = Pool;
