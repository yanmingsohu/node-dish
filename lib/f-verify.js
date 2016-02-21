var FAIL_PARAMETER = 2;


module.exports = function(f) {
  f.set(integer);
  f.set(string);
  f.set(email);
  f.set(_float, 'float');
};


function email(fconf) {
  var reg = new RegExp('.{3,}@.+\\..+');

  return function(req, resp, next) {
    var em = req.query[fconf.name];
    if (!em) {
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
    var value = req.query[ name ]

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