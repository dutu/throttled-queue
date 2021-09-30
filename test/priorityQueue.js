import chai from 'chai'
const expect = chai.expect

import PriorityQueue from '../src/priorityQueue'

describe("Constructor", function () {
  it('should create a new instance', function () {
    const pqueue = new PriorityQueue()
    expect(pqueue).to.be.an.instanceOf(PriorityQueue)
  })
})

describe("enqueue and dequeue", function () {
  it('should enqueue and dequeue an item ', function () {
    const pq = new PriorityQueue()
    const qItem = { a: 1 }
    pq.enqueue(qItem)
    const deqItem = pq.dequeue()
    expect(deqItem).to.be.eql(qItem)

  })

  it('should enqueue and dequeue an item with priority', function () {
    const pq = new PriorityQueue()
    const qItem = { a: 1 }
    pq.enqueue(qItem, 3)
    const deqItem = pq.dequeue(3)
    expect(deqItem).to.be.eql(qItem)
    })

  it('should dequeue with priority specified', function () {
    const pq = new PriorityQueue()
    pq.enqueue({a: 3}, 3)
    pq.enqueue({a: 4}, 4)
    let deqItem = pq.dequeue(3)
    expect(deqItem).to.be.eql({a: 3})
    deqItem = pq.dequeue(4)
    expect(deqItem).to.be.eql({a: 4})
  })

  it('should dequeue with right priority', function () {
    const pq = new PriorityQueue()
    pq.enqueue({ a: 1 }, 1)
    pq.enqueue({ a: 4 }, 4)
    pq.enqueue({ a: 2 }, 2)
    pq.enqueue({ a: 3 }, 3)
    let deqItem = pq.dequeue(2)
    expect(deqItem).to.be.eql({ a: 2 })
  })

  it('should dequeue lowest priority', function () {
    const pq = new PriorityQueue()
    pq.enqueue({ a: 5 }, 5)
    pq.enqueue({ a: 4 }, 4)
    pq.enqueue({ a: 2 }, 2)
    pq.enqueue({ a: 3 }, 3)
    let deqItem = pq.dequeue()
    expect(deqItem).to.be.eql({ a: 2 })
  })

  it('should dequeue first enqueued item', function () {
    const pq = new PriorityQueue()
    pq.enqueue({ a: 1 }, 3)
    pq.enqueue({ a: 2 }, 2)
    pq.enqueue({ a: 3 }, 2)
    pq.enqueue({ a: 4 }, 4)
    pq.enqueue({ a: 4 }, 3)
    let deqItem = pq.dequeue()
    expect(deqItem).to.be.eql({ a: 2 })
  })

})


