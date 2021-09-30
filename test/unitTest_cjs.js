const chai = require('chai')
const { TokenBucketLimiter } = require('@dutu/rate-limiter')
const ThrottledQueue = require('../dist/throttledQueue')
const PriorityQueue = require('../dist/priorityQueue').PriorityQueue

const expect = chai.expect

describe("PriorityQueue constructor", function () {
  it('should create a new instance', function () {
    const pqueue = new PriorityQueue()
    expect(pqueue).to.be.an.instanceOf(PriorityQueue)
  })
})

describe("ThrottledQueue constructor", function () {
  it('should create a new instance', function () {
    const rateLimiter = new TokenBucketLimiter({ bucketSize: 10, tokensPerInterval: 1, interval: 'sec' })
    const tq = new ThrottledQueue({ rateLimiter })
    expect(tq).to.be.an.instanceOf(ThrottledQueue)
  })
})