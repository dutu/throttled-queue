require("core-js/stable")
require("regenerator-runtime/runtime")

const { TokenBucketLimiter } = require('@dutu/rate-limiter')
const ThrottledQueue = require('../dist/throttledQueue')
const PriorityQueue = require('../dist/priorityQueue').PriorityQueue

const pqueue = new PriorityQueue()
const rateLimiter = new TokenBucketLimiter({ bucketSize: 10, tokensPerInterval: 1, interval: 'sec' })
const tq = new ThrottledQueue({ rateLimiter })
