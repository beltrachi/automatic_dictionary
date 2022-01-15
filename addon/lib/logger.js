export const Logger = function (level, writer_fn) {
  var levels = ["debug", "performance", "info", "warn", "error", "fatal"];
  var log_level_idx = levels.indexOf(level);
  var is_current_level = function (curr) {
    return levels.indexOf(curr) >= log_level_idx;
  }
  var filters = [];
  return {
    filters: filters,
    log: function (level, msg) {
      if (is_current_level(level)) {
        if (typeof (msg) == 'function') {
          msg = msg();
        } else if (typeof (msg) === 'undefined') {
          msg = '(undefined)';
        } else {
          msg = JSON.stringify(msg);
        }
        msg = this.filter(msg);
        if (msg) {
          msg = (new Date()).toJSON() + " [" + level + "] " + msg;
          this.write(msg);
        }
      }
    },
    // Writes to output
    write: function (msg, details) {
      writer_fn(msg);
    },
    // Applies current filters to msg
    filter: function (msg) {
      for (var i = 0; i < this.filters.length; i++) {
        msg = this.filters[i](msg);
      }
      return msg;
    },
    addFilter: function (fn) {
      this.filters.push(fn);
    },
    debug: function (msg) {
      this.log("debug", msg);
    },
    performance: function (msg) {
      this.log("performance", msg);
    },
    info: function (msg) {
      this.log("info", msg);
    },
    warn: function (msg) {
      this.log("warn", msg);
    },
    error: function (msg) {
      this.log("error", msg);
    },
    fatal: function (msg) {
      this.log("fatal", msg);
    },
    setLevel: function (level) {
      const new_level_idx = levels.indexOf(level);
      if (new_level_idx === -1) {
        throw "Wrong logger level: " + level;
      }
      log_level_idx = new_level_idx;
    },
    getLevel: function () {
      return levels[log_level_idx];
    }
  };
};
