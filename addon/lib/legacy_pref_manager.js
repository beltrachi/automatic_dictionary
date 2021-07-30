
export const LegacyPrefManager = function (browser, defaults, logger, prefix) {
  var pm = browser.prefs;
  var orDefault = async function (k, func) {
    var full_key = prefix + k;
    try {
      var value = await func();
      if (value == null) {
        logger.debug("key was null and we return defaults " + k);
        value = defaults[full_key];
      }
    } catch (e) {
      value = defaults[full_key];
    }
    return value;
  };
  var getType = function (val, key) {
    if ((typeof val) == "undefined") {
      //Set type to default type
      val = defaults[prefix + key];
    }
    var map = {
      "boolean": "Bool",
      "number": "Int",
      "string": "Char"
    };
    var res = map[(typeof val)] || "Char"; //Char by default
    logger.debug("getType for " + key + " is " + res);
    return res;
  }
  var ifce = {
    instance: pm,
    //Direct and unsecure
    set: async function (key, val) {
      return await pm["set" + getType(val, key) + "Pref"](key, val);
    },
    //We give value to discover type
    get: async function (key, val) {
      logger.info("get char pref");
      logger.info(key);
      logger.info(val);
      val = val || defaults[prefix + key];
      if (typeof (val) == "undefined") {
        return await pm["get" + getType(val, key) + "Pref"](key);
      } else {
        return await pm["get" + getType(val, key) + "Pref"](key, val);
      }
    },
    get_or_raise: async function (key, val) {
      return await pm["get" + getType(val, key) + "Pref"](key);
    },
    //getters with fallback to defaults
    getCharPref: async function (k, v) {
      return await orDefault(k, async function () { return await pm.getCharPref(k, v) });
    },
    getIntPref: async function (k, v) {
      return await orDefault(k, async function () { return await pm.getIntPref(k, v) });
    },
    getBoolPref: async function (k, v) {
      return await orDefault(k, async function () { return await pm.getBoolPref(k, v) });
    },
    setCharPref: async function (k, v) {
      return await pm.setCharPref(k, v);
    },
    setIntPref: async function (k, v) {
      return await pm.setIntPref(k, v)
    },
    setBoolPref: async function (k, v) {
      return await pm.setBoolPref(k, v);
    },
    inc: async function (key, delta) {
      logger.debug("increasing " + key);
      delta = delta || 1;
      var v = await ifce.getIntPref(key);
      v = (1 * (v || 0)) + delta;
      var res = await pm.setIntPref(key, v);
      logger.debug("up to " + v);
      return res;
    }
  };
  return ifce;
}