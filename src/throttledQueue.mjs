import EventEmitter from 'eventemitter3'
import Debug from 'debug'
import { RollingWindowLimiter, FixedWindowLimiter, TokenBucketLimiter } from '@dutu/rate-limiter'
import { PriorityQueue } from './priorityQueue.js'

const dbg_exec = Debug('tq:exec')

export default class ThrottledQueue extends EventEmitter {
  constructor({ rateLimiter, maxConcurrent = 1, minDelay = 0, timeout = 0 }) {
    super()
    if (!(rateLimiter instanceof RollingWindowLimiter || rateLimiter instanceof FixedWindowLimiter || rateLimiter instanceof TokenBucketLimiter)) {
      throw new Error('rateLimiter must be instanceof RateLimiter')
    }

    this._pauseUntil = 0
    this._running = 0
    this._options = {
      maxConcurrent,
      minDelay,
      timeout,
    }


    this._timeoutId = null
    this._limiter = rateLimiter
    this._lastExecuted = 0
    this._priorityQueue = new PriorityQueue()
    this._priorityQueue.on('enqueue', (element, priority) => this.emit('enqueue', element.options.id, priority))
    this._priorityQueue.on('dequeue', (element, priority) => this.emit('dequeue', element.options.id, priority))
  }

  async next() {
    if (this._pauseUntil === null) {
      clearTimeout(this._timeoutId)
      return
    }

    if (this._pauseUntil > 0) {
      clearTimeout(this._timeoutId)
      this._timeoutId = setTimeout(this.start.bind(this), Math.max(0, this._pauseUntil - Date.now()))
      return
    }

    if (this._options.minDelay && this._lastExecuted && (Date.now() - this._lastExecuted < this._options.minDelay)) {
      clearTimeout(this._timeoutId)
      this._timeoutId = setTimeout(this.next.bind(this), Date.now() - this._lastExecuted - this._options.minDelay)
      return
    }

    if (this._priorityQueue.size > 0) {
      if (this._running < this._options.maxConcurrent) {
        if (this._limiter.tryRemoveTokens(1)) {
          this._running += 1
          const job = this._priorityQueue.dequeue()
          const options = Object.assign({}, this._options, job.options)
          if (options.timeout) {
            job.timeoutId = setTimeout(() => {
              const reject = job.reject
              delete job.resolve
              delete job.reject
              const error = new Error(`timeout after ${options.timeout} ms`)
              this.emit('failed', error, job.options.id)
              reject(error)
              this._running -= 1
              this.next()
            }, options.timeout)
          }

          this.emit('execute', job.options.id)
          this._lastExecuted = Date.now()
          dbg_exec(job.options.id)
          job.func()
            .then((result) => {
              if (job.timeoutId) clearTimeout(job.timeoutId)
              if (job.resolve){
                this.emit('done', result, job.options.id)
                job.resolve(result)
              }
            })
            .catch((err) => {
              if (job.timeoutId) clearTimeout(job.timeoutId)
              if (job.reject) {
                this.emit('failed', err, job.options.id)
                job.reject(err)
              }
            })
            .finally(() => {
              if (job.resolve) {
                this._running -= 1
                this.next()
              }
            })

          this.next()
        } else {
          const delayMS = this._limiter.getDelayForTokens(1)
          clearTimeout(this._timeoutId)
          this._timeoutId = setTimeout(this.next.bind(this), delayMS)
        }
      }
    }
  }

  async add({ id, priority = 5, timeout } = {}, func) {
    return new Promise((resolve, reject) => {
      const newJob = {
        options : { id },
        func,
        resolve,
        reject
      }

      if (timeout) {
        newJob.options.timeout = timeout
      }

      this._priorityQueue.enqueue(newJob, priority)
      if (this._priorityQueue.size === 1) {
        this.next()
      }
    })
  }

  pause(durationMs) {
    if (durationMs === null) {
      this._pauseUntil = null
    } else {
      this._pauseUntil = Date.now() + durationMs
    }
  }

  start() {
    this._pauseUntil = 0
    clearTimeout(this._timeoutId)
    this._timeoutId = setTimeout(this.next.bind(this), 0)
  }

  getSize(priority = undefined) {
    return this._priorityQueue.getSize(priority)
  }

  clear() {
    this._priorityQueue.clear()
  }
}
