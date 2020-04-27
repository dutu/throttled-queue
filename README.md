@dutu/throttled-queue
====

**throttled-queue** is a promise Task Scheduler and Rate Limiter for Node.js


### Contents
* [Changelog](#changelog)
* [Installation](#installation)
* [API](#api)
* [Contributors](#contributors)
* [License](#license)


# Changelog

See detailed [Changelog](CHANGELOG.md)

# Installation

```
npm install --save "git+https://github.com/dutu/throttled-queue.git"
```

# Usage

throttled-queue is using @dutu/rate-limiter 

## Constructor

```'js
import { TokenBucketLimiter, RollingWindowLimiter } from '@dutu/rate-limiter'
const rateLimiter = new TokenBucketLimiter({ bucketSize: 10, tokensPerInterval: 1, interval: 'sec'})
const throttledQueue = new ThrottledQueue({ rateLimiter, maxConcurrent: 1, minDelay: 0, timeout: 0 })

```

| Option         | Default | Description |
|----------------|---------|-------------|
| `rateLimiter`  |         | rate limiter for throttling the jobs |
| `maxConcurrent`| `1`     | How many jobs can be executing at the same time. `0` is unlimited  |
| `minDelay`     | `0`     | How long (ms) to wait after launching a job before launching another one |
| `timeout`      | `0`     | The number of milliseconds a job is given to complete. Jobs that execute for longer than `timeout` ms will be failed with an error |


### Methods

###`add()`

Adds a job to the queue

```js
throttledQueue.add({ id : 'id1', priority: 5, timeout: 0 }, async () => {
  // async function/promise
  await new Promise(res => setTimeout(res, 5000))
})
```

| Option     | Default | Description |
|------------|---------|-------------|
| `id`       |         | Job Id |
| `priority` | `5`     | Number from 0 to 9. Jobs with lower priority will always be executed first |
| `timeout`  | `0`     | The number of milliseconds a job is given to complete. Jobs that execute for longer than `timeout` ms will be failed with an error |


###`clear()`
Clears the queue (deletes all queued jobs)

```js
throttledQueue.clear()
```

###`getSize({ priority: 5 })`
Returns queue size (for specified priority)

```js
throttledQueue.clear()
```

## Events

### `enqueue`
```js
throttledQueue.on("enqueue", function (info) {
  // This event is triggered when a job is added to the queue
});
```

### `dequeue`
```js
throttledQueue.on("dequeue", function (info) {
  // This event is triggered when a job is removed from the queue (for execution)
});
```

### `execute`
```js
throttledQueue.on("execute", function (error, jobId) {
  // This will be called when a job starts executing
});
```

### `done`
```js
throttledQueue.on("done", function (error, jobId) {
  // This will be called when a job execution completes successfully
});
```

### `failed`
```js
throttledQueue.on("failed", function (error, jobId) {
  // This will be called when a job fails
});
```
