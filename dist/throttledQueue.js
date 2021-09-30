"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _eventemitter = _interopRequireDefault(require("eventemitter3"));

var _debug = _interopRequireDefault(require("debug"));

var _rateLimiter = _interopRequireDefault(require("@dutu/rate-limiter"));

var _priorityQueue = _interopRequireDefault(require("./priorityQueue"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const dbg_exec = (0, _debug.default)('tq:exec');

class ThrottledQueue extends _eventemitter.default {
  constructor({
    rateLimiter,
    maxConcurrent = 1,
    minDelay = 0,
    timeout = 0
  }) {
    super();

    if (!(rateLimiter instanceof _rateLimiter.default)) {
      throw new Error('rateLimiter must be instanceof RateLimiter');
    }

    this._pauseUntil = 0;
    this._running = 0;
    this._options = {
      maxConcurrent,
      minDelay,
      timeout
    };
    this._timeoutId = null;
    this._limiter = rateLimiter;
    this._lastExecuted = 0;
    this._priorityQueue = new _priorityQueue.default();

    this._priorityQueue.on('enqueue', (element, priority) => this.emit('enqueue', element.options.id, priority));

    this._priorityQueue.on('dequeue', (element, priority) => this.emit('dequeue', element.options.id, priority));
  }

  async next() {
    if (this._pauseUntil === null) {
      clearTimeout(this._timeoutId);
      return;
    }

    if (this._pauseUntil > 0) {
      clearTimeout(this._timeoutId);
      this._timeoutId = setTimeout(this.start.bind(this), Math.max(0, this._pauseUntil - Date.now()));
      return;
    }

    if (this._options.minDelay && this._lastExecuted && Date.now() - this._lastExecuted < this._options.minDelay) {
      clearTimeout(this._timeoutId);
      this._timeoutId = setTimeout(this.next.bind(this), Date.now() - this._lastExecuted - this._options.minDelay);
      return;
    }

    if (this._priorityQueue.size > 0) {
      if (this._running < this._options.maxConcurrent) {
        if (this._limiter.tryRemoveTokens(1)) {
          this._running += 1;

          const job = this._priorityQueue.dequeue();

          const options = Object.assign({}, this._options, job.options);

          if (options.timeout) {
            job.timeoutId = setTimeout(() => {
              const reject = job.reject;
              delete job.resolve;
              delete job.reject;
              const error = new Error(`timeout after ${options.timeout} ms`);
              this.emit('failed', error, job.options.id);
              reject(error);
              this._running -= 1;
              this.next();
            }, options.timeout);
          }

          this.emit('execute', job.options.id);
          this._lastExecuted = Date.now();
          dbg_exec(job.options.id);
          job.func().then(result => {
            if (job.timeoutId) clearTimeout(job.timeoutId);

            if (job.resolve) {
              this.emit('done', result, job.options.id);
              job.resolve(result);
            }
          }).catch(err => {
            if (job.timeoutId) clearTimeout(job.timeoutId);

            if (job.reject) {
              this.emit('failed', err, job.options.id);
              job.reject(err);
            }
          }).finally(() => {
            if (job.resolve) {
              this._running -= 1;
              this.next();
            }
          });
          this.next();
        } else {
          const delayMS = this._limiter.getDelayForTokens(1);

          clearTimeout(this._timeoutId);
          this._timeoutId = setTimeout(this.next.bind(this), delayMS);
        }
      }
    }
  }

  async add({
    id,
    priority = 5,
    timeout
  } = {}, func) {
    return new Promise((resolve, reject) => {
      const newJob = {
        options: {
          id
        },
        func,
        resolve,
        reject
      };

      if (timeout) {
        newJob.options.timeout = timeout;
      }

      this._priorityQueue.enqueue(newJob, priority);

      if (this._priorityQueue.size === 1) {
        this.next();
      }
    });
  }

  pause(durationMs) {
    if (durationMs === null) {
      this._pauseUntil = null;
    } else {
      this._pauseUntil = Date.now() + durationMs;
    }
  }

  start() {
    this._pauseUntil = 0;
    clearTimeout(this._timeoutId);
    this._timeoutId = setTimeout(this.next.bind(this), 0);
  }

  getSize(priority = undefined) {
    return this._priorityQueue.getSize(priority);
  }

  clear() {
    this._priorityQueue.clear();
  }

}

exports.default = ThrottledQueue;
module.exports = exports.default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy90aHJvdHRsZWRRdWV1ZS5tanMiXSwibmFtZXMiOlsiZGJnX2V4ZWMiLCJUaHJvdHRsZWRRdWV1ZSIsIkV2ZW50RW1pdHRlciIsImNvbnN0cnVjdG9yIiwicmF0ZUxpbWl0ZXIiLCJtYXhDb25jdXJyZW50IiwibWluRGVsYXkiLCJ0aW1lb3V0IiwiUmF0ZUxpbWl0ZXIiLCJFcnJvciIsIl9wYXVzZVVudGlsIiwiX3J1bm5pbmciLCJfb3B0aW9ucyIsIl90aW1lb3V0SWQiLCJfbGltaXRlciIsIl9sYXN0RXhlY3V0ZWQiLCJfcHJpb3JpdHlRdWV1ZSIsIlByaW9yaXR5UXVldWUiLCJvbiIsImVsZW1lbnQiLCJwcmlvcml0eSIsImVtaXQiLCJvcHRpb25zIiwiaWQiLCJuZXh0IiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsInN0YXJ0IiwiYmluZCIsIk1hdGgiLCJtYXgiLCJEYXRlIiwibm93Iiwic2l6ZSIsInRyeVJlbW92ZVRva2VucyIsImpvYiIsImRlcXVldWUiLCJPYmplY3QiLCJhc3NpZ24iLCJ0aW1lb3V0SWQiLCJyZWplY3QiLCJyZXNvbHZlIiwiZXJyb3IiLCJmdW5jIiwidGhlbiIsInJlc3VsdCIsImNhdGNoIiwiZXJyIiwiZmluYWxseSIsImRlbGF5TVMiLCJnZXREZWxheUZvclRva2VucyIsImFkZCIsIlByb21pc2UiLCJuZXdKb2IiLCJlbnF1ZXVlIiwicGF1c2UiLCJkdXJhdGlvbk1zIiwiZ2V0U2l6ZSIsInVuZGVmaW5lZCIsImNsZWFyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7QUFFQSxNQUFNQSxRQUFRLEdBQUcsb0JBQU0sU0FBTixDQUFqQjs7QUFFZSxNQUFNQyxjQUFOLFNBQTZCQyxxQkFBN0IsQ0FBMEM7QUFDdkRDLEVBQUFBLFdBQVcsQ0FBQztBQUFFQyxJQUFBQSxXQUFGO0FBQWVDLElBQUFBLGFBQWEsR0FBRyxDQUEvQjtBQUFrQ0MsSUFBQUEsUUFBUSxHQUFHLENBQTdDO0FBQWdEQyxJQUFBQSxPQUFPLEdBQUc7QUFBMUQsR0FBRCxFQUFnRTtBQUN6RTs7QUFDQSxRQUFJLEVBQUVILFdBQVcsWUFBWUksb0JBQXpCLENBQUosRUFBMkM7QUFDekMsWUFBTSxJQUFJQyxLQUFKLENBQVUsNENBQVYsQ0FBTjtBQUNEOztBQUVELFNBQUtDLFdBQUwsR0FBbUIsQ0FBbkI7QUFDQSxTQUFLQyxRQUFMLEdBQWdCLENBQWhCO0FBQ0EsU0FBS0MsUUFBTCxHQUFnQjtBQUNkUCxNQUFBQSxhQURjO0FBRWRDLE1BQUFBLFFBRmM7QUFHZEMsTUFBQUE7QUFIYyxLQUFoQjtBQU9BLFNBQUtNLFVBQUwsR0FBa0IsSUFBbEI7QUFDQSxTQUFLQyxRQUFMLEdBQWdCVixXQUFoQjtBQUNBLFNBQUtXLGFBQUwsR0FBcUIsQ0FBckI7QUFDQSxTQUFLQyxjQUFMLEdBQXNCLElBQUlDLHNCQUFKLEVBQXRCOztBQUNBLFNBQUtELGNBQUwsQ0FBb0JFLEVBQXBCLENBQXVCLFNBQXZCLEVBQWtDLENBQUNDLE9BQUQsRUFBVUMsUUFBVixLQUF1QixLQUFLQyxJQUFMLENBQVUsU0FBVixFQUFxQkYsT0FBTyxDQUFDRyxPQUFSLENBQWdCQyxFQUFyQyxFQUF5Q0gsUUFBekMsQ0FBekQ7O0FBQ0EsU0FBS0osY0FBTCxDQUFvQkUsRUFBcEIsQ0FBdUIsU0FBdkIsRUFBa0MsQ0FBQ0MsT0FBRCxFQUFVQyxRQUFWLEtBQXVCLEtBQUtDLElBQUwsQ0FBVSxTQUFWLEVBQXFCRixPQUFPLENBQUNHLE9BQVIsQ0FBZ0JDLEVBQXJDLEVBQXlDSCxRQUF6QyxDQUF6RDtBQUNEOztBQUVTLFFBQUpJLElBQUksR0FBRztBQUNYLFFBQUksS0FBS2QsV0FBTCxLQUFxQixJQUF6QixFQUErQjtBQUM3QmUsTUFBQUEsWUFBWSxDQUFDLEtBQUtaLFVBQU4sQ0FBWjtBQUNBO0FBQ0Q7O0FBRUQsUUFBSSxLQUFLSCxXQUFMLEdBQW1CLENBQXZCLEVBQTBCO0FBQ3hCZSxNQUFBQSxZQUFZLENBQUMsS0FBS1osVUFBTixDQUFaO0FBQ0EsV0FBS0EsVUFBTCxHQUFrQmEsVUFBVSxDQUFDLEtBQUtDLEtBQUwsQ0FBV0MsSUFBWCxDQUFnQixJQUFoQixDQUFELEVBQXdCQyxJQUFJLENBQUNDLEdBQUwsQ0FBUyxDQUFULEVBQVksS0FBS3BCLFdBQUwsR0FBbUJxQixJQUFJLENBQUNDLEdBQUwsRUFBL0IsQ0FBeEIsQ0FBNUI7QUFDQTtBQUNEOztBQUVELFFBQUksS0FBS3BCLFFBQUwsQ0FBY04sUUFBZCxJQUEwQixLQUFLUyxhQUEvQixJQUFpRGdCLElBQUksQ0FBQ0MsR0FBTCxLQUFhLEtBQUtqQixhQUFsQixHQUFrQyxLQUFLSCxRQUFMLENBQWNOLFFBQXJHLEVBQWdIO0FBQzlHbUIsTUFBQUEsWUFBWSxDQUFDLEtBQUtaLFVBQU4sQ0FBWjtBQUNBLFdBQUtBLFVBQUwsR0FBa0JhLFVBQVUsQ0FBQyxLQUFLRixJQUFMLENBQVVJLElBQVYsQ0FBZSxJQUFmLENBQUQsRUFBdUJHLElBQUksQ0FBQ0MsR0FBTCxLQUFhLEtBQUtqQixhQUFsQixHQUFrQyxLQUFLSCxRQUFMLENBQWNOLFFBQXZFLENBQTVCO0FBQ0E7QUFDRDs7QUFFRCxRQUFJLEtBQUtVLGNBQUwsQ0FBb0JpQixJQUFwQixHQUEyQixDQUEvQixFQUFrQztBQUNoQyxVQUFJLEtBQUt0QixRQUFMLEdBQWdCLEtBQUtDLFFBQUwsQ0FBY1AsYUFBbEMsRUFBaUQ7QUFDL0MsWUFBSSxLQUFLUyxRQUFMLENBQWNvQixlQUFkLENBQThCLENBQTlCLENBQUosRUFBc0M7QUFDcEMsZUFBS3ZCLFFBQUwsSUFBaUIsQ0FBakI7O0FBQ0EsZ0JBQU13QixHQUFHLEdBQUcsS0FBS25CLGNBQUwsQ0FBb0JvQixPQUFwQixFQUFaOztBQUNBLGdCQUFNZCxPQUFPLEdBQUdlLE1BQU0sQ0FBQ0MsTUFBUCxDQUFjLEVBQWQsRUFBa0IsS0FBSzFCLFFBQXZCLEVBQWlDdUIsR0FBRyxDQUFDYixPQUFyQyxDQUFoQjs7QUFDQSxjQUFJQSxPQUFPLENBQUNmLE9BQVosRUFBcUI7QUFDbkI0QixZQUFBQSxHQUFHLENBQUNJLFNBQUosR0FBZ0JiLFVBQVUsQ0FBQyxNQUFNO0FBQy9CLG9CQUFNYyxNQUFNLEdBQUdMLEdBQUcsQ0FBQ0ssTUFBbkI7QUFDQSxxQkFBT0wsR0FBRyxDQUFDTSxPQUFYO0FBQ0EscUJBQU9OLEdBQUcsQ0FBQ0ssTUFBWDtBQUNBLG9CQUFNRSxLQUFLLEdBQUcsSUFBSWpDLEtBQUosQ0FBVyxpQkFBZ0JhLE9BQU8sQ0FBQ2YsT0FBUSxLQUEzQyxDQUFkO0FBQ0EsbUJBQUtjLElBQUwsQ0FBVSxRQUFWLEVBQW9CcUIsS0FBcEIsRUFBMkJQLEdBQUcsQ0FBQ2IsT0FBSixDQUFZQyxFQUF2QztBQUNBaUIsY0FBQUEsTUFBTSxDQUFDRSxLQUFELENBQU47QUFDQSxtQkFBSy9CLFFBQUwsSUFBaUIsQ0FBakI7QUFDQSxtQkFBS2EsSUFBTDtBQUNELGFBVHlCLEVBU3ZCRixPQUFPLENBQUNmLE9BVGUsQ0FBMUI7QUFVRDs7QUFFRCxlQUFLYyxJQUFMLENBQVUsU0FBVixFQUFxQmMsR0FBRyxDQUFDYixPQUFKLENBQVlDLEVBQWpDO0FBQ0EsZUFBS1IsYUFBTCxHQUFxQmdCLElBQUksQ0FBQ0MsR0FBTCxFQUFyQjtBQUNBaEMsVUFBQUEsUUFBUSxDQUFDbUMsR0FBRyxDQUFDYixPQUFKLENBQVlDLEVBQWIsQ0FBUjtBQUNBWSxVQUFBQSxHQUFHLENBQUNRLElBQUosR0FDR0MsSUFESCxDQUNTQyxNQUFELElBQVk7QUFDaEIsZ0JBQUlWLEdBQUcsQ0FBQ0ksU0FBUixFQUFtQmQsWUFBWSxDQUFDVSxHQUFHLENBQUNJLFNBQUwsQ0FBWjs7QUFDbkIsZ0JBQUlKLEdBQUcsQ0FBQ00sT0FBUixFQUFnQjtBQUNkLG1CQUFLcEIsSUFBTCxDQUFVLE1BQVYsRUFBa0J3QixNQUFsQixFQUEwQlYsR0FBRyxDQUFDYixPQUFKLENBQVlDLEVBQXRDO0FBQ0FZLGNBQUFBLEdBQUcsQ0FBQ00sT0FBSixDQUFZSSxNQUFaO0FBQ0Q7QUFDRixXQVBILEVBUUdDLEtBUkgsQ0FRVUMsR0FBRCxJQUFTO0FBQ2QsZ0JBQUlaLEdBQUcsQ0FBQ0ksU0FBUixFQUFtQmQsWUFBWSxDQUFDVSxHQUFHLENBQUNJLFNBQUwsQ0FBWjs7QUFDbkIsZ0JBQUlKLEdBQUcsQ0FBQ0ssTUFBUixFQUFnQjtBQUNkLG1CQUFLbkIsSUFBTCxDQUFVLFFBQVYsRUFBb0IwQixHQUFwQixFQUF5QlosR0FBRyxDQUFDYixPQUFKLENBQVlDLEVBQXJDO0FBQ0FZLGNBQUFBLEdBQUcsQ0FBQ0ssTUFBSixDQUFXTyxHQUFYO0FBQ0Q7QUFDRixXQWRILEVBZUdDLE9BZkgsQ0FlVyxNQUFNO0FBQ2IsZ0JBQUliLEdBQUcsQ0FBQ00sT0FBUixFQUFpQjtBQUNmLG1CQUFLOUIsUUFBTCxJQUFpQixDQUFqQjtBQUNBLG1CQUFLYSxJQUFMO0FBQ0Q7QUFDRixXQXBCSDtBQXNCQSxlQUFLQSxJQUFMO0FBQ0QsU0EzQ0QsTUEyQ087QUFDTCxnQkFBTXlCLE9BQU8sR0FBRyxLQUFLbkMsUUFBTCxDQUFjb0MsaUJBQWQsQ0FBZ0MsQ0FBaEMsQ0FBaEI7O0FBQ0F6QixVQUFBQSxZQUFZLENBQUMsS0FBS1osVUFBTixDQUFaO0FBQ0EsZUFBS0EsVUFBTCxHQUFrQmEsVUFBVSxDQUFDLEtBQUtGLElBQUwsQ0FBVUksSUFBVixDQUFlLElBQWYsQ0FBRCxFQUF1QnFCLE9BQXZCLENBQTVCO0FBQ0Q7QUFDRjtBQUNGO0FBQ0Y7O0FBRVEsUUFBSEUsR0FBRyxDQUFDO0FBQUU1QixJQUFBQSxFQUFGO0FBQU1ILElBQUFBLFFBQVEsR0FBRyxDQUFqQjtBQUFvQmIsSUFBQUE7QUFBcEIsTUFBZ0MsRUFBakMsRUFBcUNvQyxJQUFyQyxFQUEyQztBQUNsRCxXQUFPLElBQUlTLE9BQUosQ0FBWSxDQUFDWCxPQUFELEVBQVVELE1BQVYsS0FBcUI7QUFDdEMsWUFBTWEsTUFBTSxHQUFHO0FBQ2IvQixRQUFBQSxPQUFPLEVBQUc7QUFBRUMsVUFBQUE7QUFBRixTQURHO0FBRWJvQixRQUFBQSxJQUZhO0FBR2JGLFFBQUFBLE9BSGE7QUFJYkQsUUFBQUE7QUFKYSxPQUFmOztBQU9BLFVBQUlqQyxPQUFKLEVBQWE7QUFDWDhDLFFBQUFBLE1BQU0sQ0FBQy9CLE9BQVAsQ0FBZWYsT0FBZixHQUF5QkEsT0FBekI7QUFDRDs7QUFFRCxXQUFLUyxjQUFMLENBQW9Cc0MsT0FBcEIsQ0FBNEJELE1BQTVCLEVBQW9DakMsUUFBcEM7O0FBQ0EsVUFBSSxLQUFLSixjQUFMLENBQW9CaUIsSUFBcEIsS0FBNkIsQ0FBakMsRUFBb0M7QUFDbEMsYUFBS1QsSUFBTDtBQUNEO0FBQ0YsS0FoQk0sQ0FBUDtBQWlCRDs7QUFFRCtCLEVBQUFBLEtBQUssQ0FBQ0MsVUFBRCxFQUFhO0FBQ2hCLFFBQUlBLFVBQVUsS0FBSyxJQUFuQixFQUF5QjtBQUN2QixXQUFLOUMsV0FBTCxHQUFtQixJQUFuQjtBQUNELEtBRkQsTUFFTztBQUNMLFdBQUtBLFdBQUwsR0FBbUJxQixJQUFJLENBQUNDLEdBQUwsS0FBYXdCLFVBQWhDO0FBQ0Q7QUFDRjs7QUFFRDdCLEVBQUFBLEtBQUssR0FBRztBQUNOLFNBQUtqQixXQUFMLEdBQW1CLENBQW5CO0FBQ0FlLElBQUFBLFlBQVksQ0FBQyxLQUFLWixVQUFOLENBQVo7QUFDQSxTQUFLQSxVQUFMLEdBQWtCYSxVQUFVLENBQUMsS0FBS0YsSUFBTCxDQUFVSSxJQUFWLENBQWUsSUFBZixDQUFELEVBQXVCLENBQXZCLENBQTVCO0FBQ0Q7O0FBRUQ2QixFQUFBQSxPQUFPLENBQUNyQyxRQUFRLEdBQUdzQyxTQUFaLEVBQXVCO0FBQzVCLFdBQU8sS0FBSzFDLGNBQUwsQ0FBb0J5QyxPQUFwQixDQUE0QnJDLFFBQTVCLENBQVA7QUFDRDs7QUFFRHVDLEVBQUFBLEtBQUssR0FBRztBQUNOLFNBQUszQyxjQUFMLENBQW9CMkMsS0FBcEI7QUFDRDs7QUF4SXNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICdldmVudGVtaXR0ZXIzJ1xyXG5pbXBvcnQgRGVidWcgZnJvbSAnZGVidWcnXHJcbmltcG9ydCBSYXRlTGltaXRlciBmcm9tICdAZHV0dS9yYXRlLWxpbWl0ZXInXHJcbmltcG9ydCBQcmlvcml0eVF1ZXVlIGZyb20gJy4vcHJpb3JpdHlRdWV1ZSdcclxuXHJcbmNvbnN0IGRiZ19leGVjID0gRGVidWcoJ3RxOmV4ZWMnKVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGhyb3R0bGVkUXVldWUgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xyXG4gIGNvbnN0cnVjdG9yKHsgcmF0ZUxpbWl0ZXIsIG1heENvbmN1cnJlbnQgPSAxLCBtaW5EZWxheSA9IDAsIHRpbWVvdXQgPSAwIH0pIHtcclxuICAgIHN1cGVyKClcclxuICAgIGlmICghKHJhdGVMaW1pdGVyIGluc3RhbmNlb2YgUmF0ZUxpbWl0ZXIpKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcigncmF0ZUxpbWl0ZXIgbXVzdCBiZSBpbnN0YW5jZW9mIFJhdGVMaW1pdGVyJylcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLl9wYXVzZVVudGlsID0gMFxyXG4gICAgdGhpcy5fcnVubmluZyA9IDBcclxuICAgIHRoaXMuX29wdGlvbnMgPSB7XHJcbiAgICAgIG1heENvbmN1cnJlbnQsXHJcbiAgICAgIG1pbkRlbGF5LFxyXG4gICAgICB0aW1lb3V0LFxyXG4gICAgfVxyXG5cclxuXHJcbiAgICB0aGlzLl90aW1lb3V0SWQgPSBudWxsXHJcbiAgICB0aGlzLl9saW1pdGVyID0gcmF0ZUxpbWl0ZXJcclxuICAgIHRoaXMuX2xhc3RFeGVjdXRlZCA9IDBcclxuICAgIHRoaXMuX3ByaW9yaXR5UXVldWUgPSBuZXcgUHJpb3JpdHlRdWV1ZSgpXHJcbiAgICB0aGlzLl9wcmlvcml0eVF1ZXVlLm9uKCdlbnF1ZXVlJywgKGVsZW1lbnQsIHByaW9yaXR5KSA9PiB0aGlzLmVtaXQoJ2VucXVldWUnLCBlbGVtZW50Lm9wdGlvbnMuaWQsIHByaW9yaXR5KSlcclxuICAgIHRoaXMuX3ByaW9yaXR5UXVldWUub24oJ2RlcXVldWUnLCAoZWxlbWVudCwgcHJpb3JpdHkpID0+IHRoaXMuZW1pdCgnZGVxdWV1ZScsIGVsZW1lbnQub3B0aW9ucy5pZCwgcHJpb3JpdHkpKVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgbmV4dCgpIHtcclxuICAgIGlmICh0aGlzLl9wYXVzZVVudGlsID09PSBudWxsKSB7XHJcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLl90aW1lb3V0SWQpXHJcbiAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLl9wYXVzZVVudGlsID4gMCkge1xyXG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5fdGltZW91dElkKVxyXG4gICAgICB0aGlzLl90aW1lb3V0SWQgPSBzZXRUaW1lb3V0KHRoaXMuc3RhcnQuYmluZCh0aGlzKSwgTWF0aC5tYXgoMCwgdGhpcy5fcGF1c2VVbnRpbCAtIERhdGUubm93KCkpKVxyXG4gICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5fb3B0aW9ucy5taW5EZWxheSAmJiB0aGlzLl9sYXN0RXhlY3V0ZWQgJiYgKERhdGUubm93KCkgLSB0aGlzLl9sYXN0RXhlY3V0ZWQgPCB0aGlzLl9vcHRpb25zLm1pbkRlbGF5KSkge1xyXG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5fdGltZW91dElkKVxyXG4gICAgICB0aGlzLl90aW1lb3V0SWQgPSBzZXRUaW1lb3V0KHRoaXMubmV4dC5iaW5kKHRoaXMpLCBEYXRlLm5vdygpIC0gdGhpcy5fbGFzdEV4ZWN1dGVkIC0gdGhpcy5fb3B0aW9ucy5taW5EZWxheSlcclxuICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMuX3ByaW9yaXR5UXVldWUuc2l6ZSA+IDApIHtcclxuICAgICAgaWYgKHRoaXMuX3J1bm5pbmcgPCB0aGlzLl9vcHRpb25zLm1heENvbmN1cnJlbnQpIHtcclxuICAgICAgICBpZiAodGhpcy5fbGltaXRlci50cnlSZW1vdmVUb2tlbnMoMSkpIHtcclxuICAgICAgICAgIHRoaXMuX3J1bm5pbmcgKz0gMVxyXG4gICAgICAgICAgY29uc3Qgam9iID0gdGhpcy5fcHJpb3JpdHlRdWV1ZS5kZXF1ZXVlKClcclxuICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLl9vcHRpb25zLCBqb2Iub3B0aW9ucylcclxuICAgICAgICAgIGlmIChvcHRpb25zLnRpbWVvdXQpIHtcclxuICAgICAgICAgICAgam9iLnRpbWVvdXRJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgIGNvbnN0IHJlamVjdCA9IGpvYi5yZWplY3RcclxuICAgICAgICAgICAgICBkZWxldGUgam9iLnJlc29sdmVcclxuICAgICAgICAgICAgICBkZWxldGUgam9iLnJlamVjdFxyXG4gICAgICAgICAgICAgIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGB0aW1lb3V0IGFmdGVyICR7b3B0aW9ucy50aW1lb3V0fSBtc2ApXHJcbiAgICAgICAgICAgICAgdGhpcy5lbWl0KCdmYWlsZWQnLCBlcnJvciwgam9iLm9wdGlvbnMuaWQpXHJcbiAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKVxyXG4gICAgICAgICAgICAgIHRoaXMuX3J1bm5pbmcgLT0gMVxyXG4gICAgICAgICAgICAgIHRoaXMubmV4dCgpXHJcbiAgICAgICAgICAgIH0sIG9wdGlvbnMudGltZW91dClcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICB0aGlzLmVtaXQoJ2V4ZWN1dGUnLCBqb2Iub3B0aW9ucy5pZClcclxuICAgICAgICAgIHRoaXMuX2xhc3RFeGVjdXRlZCA9IERhdGUubm93KClcclxuICAgICAgICAgIGRiZ19leGVjKGpvYi5vcHRpb25zLmlkKVxyXG4gICAgICAgICAgam9iLmZ1bmMoKVxyXG4gICAgICAgICAgICAudGhlbigocmVzdWx0KSA9PiB7XHJcbiAgICAgICAgICAgICAgaWYgKGpvYi50aW1lb3V0SWQpIGNsZWFyVGltZW91dChqb2IudGltZW91dElkKVxyXG4gICAgICAgICAgICAgIGlmIChqb2IucmVzb2x2ZSl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ2RvbmUnLCByZXN1bHQsIGpvYi5vcHRpb25zLmlkKVxyXG4gICAgICAgICAgICAgICAgam9iLnJlc29sdmUocmVzdWx0KVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmNhdGNoKChlcnIpID0+IHtcclxuICAgICAgICAgICAgICBpZiAoam9iLnRpbWVvdXRJZCkgY2xlYXJUaW1lb3V0KGpvYi50aW1lb3V0SWQpXHJcbiAgICAgICAgICAgICAgaWYgKGpvYi5yZWplY3QpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZW1pdCgnZmFpbGVkJywgZXJyLCBqb2Iub3B0aW9ucy5pZClcclxuICAgICAgICAgICAgICAgIGpvYi5yZWplY3QoZXJyKVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmZpbmFsbHkoKCkgPT4ge1xyXG4gICAgICAgICAgICAgIGlmIChqb2IucmVzb2x2ZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fcnVubmluZyAtPSAxXHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHQoKVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICB0aGlzLm5leHQoKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBjb25zdCBkZWxheU1TID0gdGhpcy5fbGltaXRlci5nZXREZWxheUZvclRva2VucygxKVxyXG4gICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX3RpbWVvdXRJZClcclxuICAgICAgICAgIHRoaXMuX3RpbWVvdXRJZCA9IHNldFRpbWVvdXQodGhpcy5uZXh0LmJpbmQodGhpcyksIGRlbGF5TVMpXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhc3luYyBhZGQoeyBpZCwgcHJpb3JpdHkgPSA1LCB0aW1lb3V0IH0gPSB7fSwgZnVuYykge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgY29uc3QgbmV3Sm9iID0ge1xyXG4gICAgICAgIG9wdGlvbnMgOiB7IGlkIH0sXHJcbiAgICAgICAgZnVuYyxcclxuICAgICAgICByZXNvbHZlLFxyXG4gICAgICAgIHJlamVjdFxyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAodGltZW91dCkge1xyXG4gICAgICAgIG5ld0pvYi5vcHRpb25zLnRpbWVvdXQgPSB0aW1lb3V0XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMuX3ByaW9yaXR5UXVldWUuZW5xdWV1ZShuZXdKb2IsIHByaW9yaXR5KVxyXG4gICAgICBpZiAodGhpcy5fcHJpb3JpdHlRdWV1ZS5zaXplID09PSAxKSB7XHJcbiAgICAgICAgdGhpcy5uZXh0KClcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIHBhdXNlKGR1cmF0aW9uTXMpIHtcclxuICAgIGlmIChkdXJhdGlvbk1zID09PSBudWxsKSB7XHJcbiAgICAgIHRoaXMuX3BhdXNlVW50aWwgPSBudWxsXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLl9wYXVzZVVudGlsID0gRGF0ZS5ub3coKSArIGR1cmF0aW9uTXNcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHN0YXJ0KCkge1xyXG4gICAgdGhpcy5fcGF1c2VVbnRpbCA9IDBcclxuICAgIGNsZWFyVGltZW91dCh0aGlzLl90aW1lb3V0SWQpXHJcbiAgICB0aGlzLl90aW1lb3V0SWQgPSBzZXRUaW1lb3V0KHRoaXMubmV4dC5iaW5kKHRoaXMpLCAwKVxyXG4gIH1cclxuXHJcbiAgZ2V0U2l6ZShwcmlvcml0eSA9IHVuZGVmaW5lZCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX3ByaW9yaXR5UXVldWUuZ2V0U2l6ZShwcmlvcml0eSlcclxuICB9XHJcblxyXG4gIGNsZWFyKCkge1xyXG4gICAgdGhpcy5fcHJpb3JpdHlRdWV1ZS5jbGVhcigpXHJcbiAgfVxyXG59XHJcbiJdfQ==