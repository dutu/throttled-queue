const EventEmitter = require('eventemitter3')

export class PriorityQueue extends EventEmitter {
  constructor() {
    super()
    this._queue = []
    for (let i = 0; i < 10; i++) {
      this._queue.push([])
    }
  }

  enqueue(element, priority = 5) {
    this._queue[priority].push(element)
    this.emit('enqueue', element, priority)
  }

  dequeue(priority) {
    if (priority) {
      const element = this._queue[priority].shift()
      if (element !== undefined) {
        this.emit('dequeue', element, priority)
      }

      return element
    }

    for(let p = 0; p < 10; p++) {
      if (this._queue[p].length > 0) {
        const element = this._queue[p].shift()
        this.emit('dequeue', element, p)
        return element
      }
    }

    return undefined
  }

  getSize(priority) {
    if (priority) {
      return this._queue[priority].length
    }

    let count  = 0
    for(let p = 0; p < 10; p++) {
      count += this._queue[p].length
    }

    return count
  }

  get size() {
    return this.getSize()
  }

  clear() {
    for (let i = 0; i < 10; i++) {
      this._queue.push([])
    }
  }
}
