"use strict";

class Pool {
  constructor(factory, ...params) {
    this.factory = factory;
    this.params = params;
    this.collection = [];
    this.free = [];
    this.waiting = [];
    this.max = 0;
    this.ms = Infinity;
  }

  allocate(amount, max = amount) {
    const { factory, params, collection, free } = this;
    this.max = this.max || max;
    for (let i = 0; i < amount; i++) {
      collection.push(factory(...params));
      free.push(i);
    }
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
        reject("Waiting timeout");
      }, ms);
      member.timer = timer;
    }
    this.waiting.push(member);
  }

  async capture({ signal } = {}) {
    const left = this.free.length;
    if (!left) {
      const size = this.collection.length;
      const maximum = this.max - size;
      if (maximum < 1) {
        return new Promise((resolve, reject) => {
          if (signal) {
            const abort = () => void reject("Signal aborted");
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
    const index = this.free.shift();
    return this.collection[index];
  }

  timeout(ms) {
    this.ms = ms;
    return this;
  }
}

module.exports = Pool;
