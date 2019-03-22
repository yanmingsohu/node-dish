var FAIL_PARAMETER = 2;


module.exports = function(f) {
  f.set(integer);
  f.set(string);
  f.set(email);
  f.set(regexp);
  f.set(_float, 'float');
  f.set(_set, 'set');
};


function _set(fconf) {
  var name  = fconf.name;
  var names = fconf.set;
  var sets  = new Set();

  if (!name) {
    throw new Error('conf.name 属性指明从 query 中获取变量');
  }
  if (!names) {
    throw new Error('conf.set 属性必须是 set/map/array');
  }

  if (names.constructor === Set) {
    sets = names;
  } else if (names.constructor === Map) {
    names.forEach(function(v, k) {
      sets.add(k);
    });
  } else if (names.constructor === Array) {
    names.forEach(function(i) {
      sets.add(i);
    });
  } else {
    for (var n in names) {
      sets.add(n);
    }
  }

  if (sets.size < 1) {
    throw new Error('conf.set 属性必须有至少一个元素');
  }

  fconf.set = [];
  sets.forEach(function(i) { fconf.set.push(i) });

  return function(req, resp, next) {
    var v = req.query[name];
    if (!v) {
      if (fconf.allow_null) {
        return next();
      }
    } else if (sets.has(v)) {
      return next();
    }
    next({
      code    : FAIL_PARAMETER,
      message : (fconf.desc || fconf.name)
                + ' `' + v + '` 不是有效的选项'
    }, fconf);
  }
}


function regexp(fconf) {
  var reg  = new RegExp(fconf.reg);
  var name = fconf.name;
  var terr  = fconf.err || '格式无效';

  return function(req, resp, next) {
    var em = req.query[fconf.name];
    if (!reg.test(em)) {
      return serr(terr);
    }

    next();

    function serr(msg) {
      next({
        code    : FAIL_PARAMETER,
        message : (fconf.desc || fconf.name) + ' ' + msg
      }, fconf);
    }
  }
}


function email(fconf) {
  var reg = new RegExp('.{3,}@.+\\..+');
  var allow_null = fconf.allow_null;

  return function(req, resp, next) {
    var em = req.query[fconf.name];
    if (!em) {
      if (allow_null) return next();
      return serr('不能为空');
    }
    if (!reg.test(em)) {
      return serr('格式无效');
    }
    next();

    function serr(msg) {
      next({
        code    : FAIL_PARAMETER,
        message : (fconf.desc || fconf.name) + ' ' + msg
      }, fconf);
    }
  }
}


function integer(filter_conf) {
  return function(req, resp, next) {
    var name  = filter_conf.name;
    var value = parseInt( req.query[ name ] );
    req.query[ name ] = value;

    return check(next, filter_conf, value, function() {
      return value > filter_conf.max;
    }, function() {
      return value < filter_conf.min;
    }, function() {
      if (isNaN(value)) return '必须是数字';
      return;
    });
  }
}


function _float(filter_conf) {
  return function(req, resp, next) {
    var name  = filter_conf.name;
    var value = parseFloat( req.query[ name ] );
    req.query[ name ] = value;

    return check(next, filter_conf, value, function() {
      return value > filter_conf.max;
    }, function() {
      return value < filter_conf.min;
    }, function() {
      if (isNaN(value)) return '必须是数字';
      return;
    });
  }
}


function string(filter_conf) {
  return function(req, resp, next) {
    var name  = filter_conf.name;
    var value = req.query[ name ];
		//value = decodeURIComponent(value);

    return check(next, filter_conf, value, function() {
      return value.length > filter_conf.max;
    }, function() {
      return value.length < filter_conf.min;
    }, function() {
      return !value;
    });
  }
}


function check(next, item, value, fmax, fmin, fnull, ftype) {
  var r;

  if (r = fnull(value)) {
    if (item.allow_null) {
      return next();
    }
    if (typeof r != 'string') r = '不能为空';
    return reterr(r);
  }

  if (item.max && fmax(value)) {
    return reterr('不能超过' + item.max);
  }

  if (item.min && fmin(value)) {
    return reterr('不能少于' + item.min);
  }

  next();

  function reterr(msg) {
    next({
      code    : FAIL_PARAMETER,
      message : (item.desc || item.name) + ' ' + msg
    }, item);
  }
}
