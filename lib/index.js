"use strict";

class Pool {
  constructor(factory, ...args) {
    this.factory = factory;
    this.args = args;
    this.collection = [];
    this.free = [];
    this.waiting = [];
    this.max = 0;
    this.ms = Infinity;
  }

  allocate(amount) {
    if (amount < 0) throw new Error("Pool requires positive integer");
    const { factory, args, collection, free } = this;
    const size = collection.length;
    for (let i = 0; i < amount; i++) {
      collection.push(factory(...args));
      free.push(i + size);
    }
    if (this.max < collection.length) this.max = size;
    return this;
  }

  next(entity) {
    const waiting = this.waiting;
    if (!waiting.length) return;
    const member = waiting.shift();
    const resolve = member.resolve;
    if (!resolve) return this.next(entity);
    const timer = member.timer;
    if (timer) clearTimeout(timer);
    process.nextTick(() => void resolve(entity));
  }

  release(entity) {
    const index = this.collection.indexOf(entity);
    const free = this.free;
    if (index < 0 || free[index]) return;
    if (this.waiting.length) return void this.next(entity);
    free.push(index);
  }

  wait(resolve, reject) {
    const { ms } = this;
    const member = { resolve, timer: null };
    if (ms !== Infinity) {
      let timer = setTimeout(() => {
        member.resolve = null;
        clearTimeout(timer);
        timer = null;
        reject("[pool]:: timeout");
      }, ms);
      member.timer = timer;
    }
    this.waiting.push(member);
  }

  async capture({ signal } = {}) {
    const { free, collection } = this;
    const left = free.length;
    if (!left) {
      const size = collection.length;
      const maximum = this.max - size;
      if (maximum < 1) {
        return new Promise((resolve, reject) => {
          if (signal) {
            const abort = () => void reject("[pool]:: signal aborted");
            this.wait((entity) => {
              signal.removeEventListener("abort", abort);
              resolve(entity);
            }, reject);
            signal.addEventListener("abort", abort, { once: true });
            return;
          }
          this.wait(resolve, reject);
        });
      }
      this.allocate(maximum);
    }
    const index = free.shift();
    return collection[index];
  }

  timeout(ms) {
    this.ms = ms;
    return this;
  }

  limit(max){
    this.max = max;
    return this;
  }
}

module.exports = Pool;
