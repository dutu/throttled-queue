@dutu/throttled-queue
====

**throttled-queue** is a promise Task Scheduler and Rate Limiter for Node.js


### Contents
* [Changelog](#changelog)
* [Installation](#installation)


# Changelog

#### 1.2.0
* added methods `pause` and `start`

#### 1.3.1
* added support to `require` the module as CommonJS module. See note below for required dependencies to be installed as well  

# Installation

```
npm install --save "git+https://github.com/dutu/throttled-queue.git"
```
> Note: when not using ES6 you should install the two packages below (which will emulate ES environment)
>```
>npm install --save core-js
>npm install --save regenerator-runtime 
>```
>and use the following at the top of your main js file:
>```js
>require("core-js/stable")
>require("regenerator-runtime/runtime")
>```

# Usage

throttled-queue is using [@dutu/rate-limiter](https://github.com/dutu/rate-limiter)

## Constructor

```js
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

### `add()`

Adds a job to the queue

```js
throttledQueue.add({ id : 'someId', priority: 5, timeout: 0 }, async () => {
  // async function/promise
  await delay(5000)
})
```

| Option     | Default | Description |
|------------|---------|-------------|
| `id`       |         | Job Id |
| `priority` | `5`     | Number from 0 to 9. Jobs with lower priority will always be executed first |
| `timeout`  | `0`     | The number of milliseconds a job is given to complete. Jobs that execute for longer than `timeout` ms will be failed with an error. `0` means no timeout. |


### `pause(durationMs)`
Pauses job execution for specified number of milliseconds.
If `null` is passed, job execution is paused indefinitely.

```js
throttledQueue.pause(500)
throttledQueue.pause(null)
```

### `start()`
Starts job execution (if it was paused with `pause()`)


```js
throttledQueue.start()
```

### `clear()`
Clears the queue (deletes all queued jobs)

```js
throttledQueue.clear()
```

### `getSize()`
Returns queue size (for specified priority)

```js
throttledQueue.getSize()
throttledQueue.getSize({ priority: 5 })
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
