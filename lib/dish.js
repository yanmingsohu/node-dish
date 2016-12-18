var logger = require('logger-lib')('dish');
var url    = require('url');
var filter = require('./filter.js');


module.exports = {
  create      : create,
  call_stack  : call_stack,
};


//
// 创建一个服务容器
//
// url_base     -- 地址前缀
// app_context  -- 应用上下文, 可以绑定一些常用函数/对象, 在服务中通过 this 引用
// nextor       -- 用于创建服务函数使用的 next 方法, 可以空
//
// return Function Object {
//    path    : String -- 与 url_base 相同
//    service : Function(service_fn, query_arr, body_type) -- 插入一个服务函数
// }
//
function create(url_base, app_context, nextor) {
  if (!url_base) {
    throw new Error('must have url base');
  }

  if (!app_context) {
    app_context = {};
  }

  var _url_base;
  if (url_base[url_base.length-1] != '/') {
    _url_base = url_base + '/';
  } else {
    throw new Error('url base format error');
  }

  if (!nextor) {
    nextor = createDefaultNext;
  }

  var service_map = { };
  var blen        = _url_base.length;
  var ret         = mid;

  ret.path        = url_base;
  ret.service     = service;

  return ret;


  function mid(req, resp) {
    var begin = req.url && (req.url.indexOf(_url_base));
    if (begin !== 0) {
      return resp.end();
    }

    var query   = url.parse(req.url, true);
    var service = query.pathname.substr(blen);
    var handle  = service_map[service];


    if (handle) {
      //
      // 这里绑定了 req 上的特殊属性
      //
      req.query    = query.query;
      req.host     = query.host;
      req.pathname = query.pathname;

      app_context.call = function(_sername, rcb) {
        var h = service_map[_sername];
        if (!h) {
          rcb('not found service ' + _sername);
        } else {
          h.call(app_context, req, resp, rcb);
        }
      };

      handle.call(app_context, req, resp, nextor(req, resp));
    } else {
      resp.end('{"ret":4, "msg":"unknow service"}');
    }
  }


  function createDefaultNext(req, resp) {
    return function(err, obj) {
      if (!resp.headersSent)
        resp.setHeader('content-type', 'application/json; charset=utf-8');

      if (err) {
        logger.debug(err);
        resp.end(JSON.stringify({
          ret  : err.code    || 1,
          msg  : err.message || err,
          data : obj
        }));
      } else {
        var ret;
        if (obj['ret'] && obj['msg']) {
          ret = obj;
        } else {
          ret = {
            ret  : 0,
            msg  : obj && (obj.msg || obj.message || undefined),
            data : obj
          };
        }
        resp.end(JSON.stringify(ret));
      }
    };
  }


  //
  // 注册 web 服务函数, 不可注册匿名函数
  //
  // service_fn  -- 服务函数, Function(request, response, next)
  // filter_conf -- 过滤器类型描述列表, 可以为 null
  //
  function service(service_fn, filter_conf) {
    if (typeof service_fn != 'function') {
      throw new Error('service must function');
    }
    if (!service_fn.name) {
      throw new Error('function object no name.');
    }

    var service_context = {};
    var stack = call_stack(service_fn);

    if (filter_conf) {
      filter_conf.forEach(function(fc) {
        var filter_fn = filter.get(fc, service_context);
        stack.push(filter_fn);
      });
    }

    service_map[service_fn.name] = stack.get();
  }
}


//
// 制作调用链, push 方法顺次压入 f1, f2, f3,
// 则调用顺序是: f1, f2, f3, _last_call, 这些函数的参数应该是相同的
//
function call_stack(_last_call) {
  var first;
  var ret = {
    push : push,
    get  : get,
  };

  function push(_fn) {
    if (first) {
      var f = first;
      first = function(a, b, real_next) {
        var thiz = this;
        f.call(thiz, a, b, function(err, data) {
          if (err) {
            return real_next(err, data);
          }
          _fn.call(thiz, a, b, real_next);
        });
      };
    } else {
      first = _fn;
    }
  }

  function get() {
    if (first) {
      push(_last_call);
      return first;
    } else {
      return _last_call;
    }
  }

  return ret;
}
