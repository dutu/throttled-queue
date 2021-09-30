import Debug from 'debug'
import Performance from 'perf_hooks'
import chai from 'chai'

import { TokenBucketLimiter, RollingWindowLimiter } from '@dutu/rate-limiter'
import ThrottledQueue from '../src/throttledQueue.mjs'

const expect = chai.expect
const performance = Performance.performance

const dbg_work = Debug('test:work')
Debug.enable('test:work')

const delay = ms => new Promise(res => setTimeout(res, ms))

describe("Constructor", function () {
  it('should create a new instance', function () {
    const rateLimiter = new TokenBucketLimiter({ bucketSize: 10, tokensPerInterval: 1, interval: 'sec'})
    const tq = new ThrottledQueue({ rateLimiter })
    expect(tq).to.be.an.instanceOf(ThrottledQueue)
  })

  it('should throw error if invalid rate limiter', function () {
    const fn = () => new ThrottledQueue({ rateLimiter: 'invalid instance' })
    expect(fn).to.throw()
  })
})

describe("execution and events", function () {
  it('should emit "enqueue" and "dequeue" with default priority', function (done) {
    const rateLimiter = new TokenBucketLimiter({ bucketSize: 10, tokensPerInterval: 1, interval: 'sec'})
    const tq = new ThrottledQueue({ rateLimiter })
    let enqueueReceived = false
    let dequeueReceived = false
    tq.on('enqueue', (id, priority) => {
      expect(id).to.be.eql('1')
      expect(priority).to.be.eql(5)
      enqueueReceived = true
    })

    tq.on('dequeue', (id, priority) => {
      expect(id).to.be.eql('1')
      expect(priority).to.be.eql(5)
      dequeueReceived = true
    })

    tq.add({ id : '1' }, async () => {
      dbg_work('start')
      await delay(1000)
      dbg_work('stop')
      expect(enqueueReceived).to.be.true
      expect(dequeueReceived).to.be.true
      done()
    })
  })

  it('should emit "enqueue" and "dequeue" with correct priority', function (done) {
    const rateLimiter = new TokenBucketLimiter({ bucketSize: 10, tokensPerInterval: 1, interval: 'sec'})
    const tq = new ThrottledQueue({ rateLimiter })
    let enqueueReceived = false
    let dequeueReceived = false
    tq.on('enqueue', (id, priority) => {
      expect(id).to.be.eql('1')
      expect(priority).to.be.eql(3)
      enqueueReceived = true
    })

    tq.on('dequeue', (id, priority) => {
      expect(id).to.be.eql('1')
      expect(priority).to.be.eql(3)
      dequeueReceived = true
    })

    tq.add({ id : '1', priority: 3 }, async () => {
      dbg_work('start')
      await delay(100)
      dbg_work('stop')
      expect(enqueueReceived).to.be.true
      expect(dequeueReceived).to.be.true
      done()
    })
  })

  it('successful promise should return and emit "execute" with result', function (done) {
    const rateLimiter = new TokenBucketLimiter({ bucketSize: 10, tokensPerInterval: 1, interval: 'sec'})
    const tq = new ThrottledQueue({ rateLimiter })
    let executeReceived = 0
    tq.on('execute', (id) => {
      executeReceived += 1
      if (executeReceived === 1) {
        expect(id).to.be.eql('1')
      }

      if (executeReceived === 2) {
        expect(id).to.be.eql('2')
        done()
      }
    })

    const self  = this
    this.me = 'me'
    tq.add({ id : '1', priority: 3 }, async () => {
      expect(this).to.be.eql(self)
      dbg_work('start')
      await delay(100)
      dbg_work('stop')
    })

    tq.add({ id : '2', priority: 5 }, async () => {
      dbg_work('start')
      await delay(100)
      dbg_work('stop')
    })
  })

  it('should emit "done" with result', function (done) {
    const rateLimiter = new TokenBucketLimiter({ bucketSize: 10, tokensPerInterval: 1, interval: 'sec'})
    const tq = new ThrottledQueue({ rateLimiter })
    let executeReceived = 0
    tq.on('done', (result, id) => {
      executeReceived += 1
      if (executeReceived === 1) {
        expect(id).to.be.eql('1')
        expect(result).to.be.eql('result1')
      }

      if (executeReceived === 2) {
        expect(id).to.be.eql('2')
        expect(result).to.be.eql('result2')
        done()
      }
    })

    tq.add({ id : '1', priority: 3 }, async () => {
      dbg_work('start')
      await delay(100)
      dbg_work('stop')
      return 'result1'
    }).then((result) => {
      expect(result).to.be.eql('result1')
    })

    tq.add({ id : '2', priority: 5 }, async () => {
      dbg_work('start')
      await delay(100)
      dbg_work('stop')
      return 'result2'
    }).then((result) => {
      expect(result).to.be.eql('result2')
    })
  })

  it('failed promise should reject and emit "failed" event with error', function (done) {
    const rateLimiter = new TokenBucketLimiter({ bucketSize: 10, tokensPerInterval: 1, interval: 'sec'})
    const tq = new ThrottledQueue({ rateLimiter })
    let executeReceived = 0
    tq.on('failed', (error, id) => {
      executeReceived += 1
      if (executeReceived === 1) {
        expect(id).to.be.eql('1')
        expect(error).to.be.eql('error1')
      }

      if (executeReceived === 2) {
        expect(id).to.be.eql('2')
        expect(error).to.be.eql('error2')
        done()
      }
    })

    tq.add({ id : '1', priority: 3 }, async () => {
      dbg_work('start')
      await delay(100)
      dbg_work('stop')
      throw 'error1'
    }).catch((error) => {
      expect(error).to.be.eql('error1')
    })

    tq.add({ id : '2', priority: 5 }, async () => {
      dbg_work('start')
      await delay(100)
      dbg_work('stop')
      throw 'error2'
    }).catch((error) => {
      expect(error).to.be.eql('error2')
    })
  })

  it('timeout should reject and emit "failed" event with error', async function () {
    const rateLimiter = new TokenBucketLimiter({ bucketSize: 10, tokensPerInterval: 1, interval: 'sec'})
    const tq = new ThrottledQueue({ rateLimiter, timeout: 50 })
    let executeReceived = 0
    tq.on('failed', (error, id) => {
      executeReceived += 1
      if (executeReceived === 1) {
        expect(id).to.be.eql('1')
        expect(error.message).to.be.eql('timeout after 50 ms')
      }

      if (executeReceived === 2) {
        expect(id).to.be.eql('2')
        expect(error.message).to.be.eql('timeout after 50 ms')
      }
    })

    let p1 = tq.add({ id : '1', priority: 3 }, async () => {
      dbg_work('start')
      await delay(100)
      dbg_work('stop')
      throw 'error1'
    }).catch((error) => {
      expect(error.message).to.be.eql('timeout after 50 ms')
    })

    let p2 = tq.add({ id : '2', priority: 5 }, async () => {
      dbg_work('start')
      await delay(100)
      dbg_work('stop')
      return 'result2'
    }).catch((error) => {
      expect(error.message).to.be.eql('timeout after 50 ms')
    })
    await Promise.allSettled([p1, p2])
  })

})

describe("throttling", function () {
  it('should execute "maxConcurent" & "minDelay"', async function () {
    const rateLimiter = new TokenBucketLimiter({bucketSize: 10, tokensPerInterval: 1, interval: 'sec'})
    const tq = new ThrottledQueue({ rateLimiter, maxConcurrent: 2, minDelay: 75})
    tq.on('execute', (result, id) => {

    })

    let perf = performance.now()
    const promises = []
    for (let i = 0; i < 5; i++) {
      const id = `${i}`
      const p = tq.add({id: i}, async () => {
        await delay(200)
        dbg_work(performance.now() - perf)
      })
      promises.push(p)
    }

    await Promise.allSettled(promises)
  })

  it('should timeout', async function () {
    const rateLimiter = new TokenBucketLimiter({bucketSize: 10, tokensPerInterval: 1, interval: 'sec'})
    const tq = new ThrottledQueue({ rateLimiter, maxConcurrent: 2, minDelay: 75, timeout: 200 })
    let perf = performance.now()
    const promises = []
    for (let i = 0; i < 20; i++) {
      const id = `${i}`
      const p = tq.add({ id: i }, async () => {
        dbg_work(performance.now() - perf)
        await delay(400)
      })
      promises.push(p)
    }

    await Promise.allSettled(promises)
    dbg_work('d')
  })


  it('should execute with ThrottledQueue', async function () {
    const rateLimiter = new TokenBucketLimiter({bucketSize: 10, tokensPerInterval: 1, interval: 'sec'})
    const tq = new ThrottledQueue({ rateLimiter, maxConcurrent: 2, minDelay: 100})

    let perf = performance.now()
    const promises = []
    for (let i = 0; i < 15; i++) {
      const id = `${i}`
      const p = tq.add({id: i}, async () => {
        dbg_work(performance.now() - perf)
        await delay(200)
      })
      promises.push(p)
    }

    await delay(10000)


    for (let i = 0; i < 5; i++) {
      const id = `${i}`
      const p = tq.add({id: i}, async () => {
        await delay(200)
        dbg_work(performance.now() - perf)
      })
      promises.push(p)
    }
    await Promise.allSettled(promises)
  })

  it('should execute with RollingWindowLimiter', async function () {
    const rateLimiter = new RollingWindowLimiter({ tokensPerInterval: 20, interval: 'min'})
    const tq = new ThrottledQueue({ rateLimiter, maxConcurrent: 2, minDelay: 100})

    let perf = performance.now()
    const promises = []
    for (let i = 0; i < 15; i++) {
      const id = `${i}`
      const p = tq.add({id: i}, async () => {
        dbg_work(performance.now() - perf)
        await delay(200)
      })
      promises.push(p)
    }

    await delay(10000)


    for (let i = 0; i < 30; i++) {
      const id = `${i}`
      const p = tq.add({id: i}, async () => {
        await delay(200)
        dbg_work(performance.now() - perf)
      })
      promises.push(p)
    }
    await Promise.allSettled(promises)
  })



})

