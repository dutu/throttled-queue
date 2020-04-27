import EventEmitter from 'eventemitter3'
import RateLimiter from '@dutu/rate-limiter'
import Debug from 'debug'
import PriorityQueue from './priorityQueue.mjs'

const dbg_exec = Debug('tq:exec')

export default class ThrottledQueue extends EventEmitter {
  constructor({ rateLimiter, maxConcurrent = 1, minDelay = 0, timeout = 0 }) {
    super()
    if (!(rateLimiter instanceof RateLimiter)) {
      throw new Error('rateLimiter must be instanceof RateLimiter')
    }

    this._running = 0
    this._options = {
      maxConcurrent,
      minDelay,
      timeout,
    }

    this._limiter = rateLimiter
    this._lastExecuted = 0
    this._priorityQueue = new PriorityQueue()
    this._priorityQueue.on('enqueue', (element, priority) => this.emit('enqueue', element.options.id, priority))
    this._priorityQueue.on('dequeue', (element, priority) => this.emit('dequeue', element.options.id, priority))
  }

  async next() {
    if (this._options.minDelay && this._lastExecuted && (Date.now() - this._lastExecuted < this._options.minDelay)) {
      setTimeout(() => this.next(), Date.now() - this._lastExecuted - this._options.minDelay)
      return
    }

    if (this._priorityQueue.size > 0) {
      if (this._running < this._options.maxConcurrent) {
        if (this._limiter.tryRemoveTokens(1)) {
          this._running += 1
          const job = this._priorityQueue.dequeue()
          const options = Object.assign({}, job.options, this._options)
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
          setTimeout(this.next.bind(this), delayMS)
        }
      }
    }
  }

  async add({ id, priority = 5, timeout = 0 } = {}, func) {
    return new Promise((resolve, reject) => {
      const newJob = { options : { id, timeout }, func, resolve, reject }
      this._priorityQueue.enqueue(newJob, priority)
      if (this._priorityQueue.size === 1) {
        this.next()
      }
    })
  }

  getSize(priority = undefined) {
    return this._priorityQueue.getSize(priority)
  }

  clear() {
    this._priorityQueue.clear()
  }
}
