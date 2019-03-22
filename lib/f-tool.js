var logger = require('logger-lib')('dish');


module.exports = function(f) {
  f.set(debug);
  f.set(page);
  f.set(jumpto);
  f.set(expense);
  f.set(json);
  f.set(meta);
};


function json(filter_conf) {
  return function(req, resp, next) {
    if (!resp.json) {
      resp.json = function json(obj) {
        sendJson(resp, obj);
      };
    }
    return next();
  }
}


//
// 如果请求中有 meta 参数则返回 meta, 否则正常执行服务.
// conf : { desc: '服务描述',
//         query: {
//             参数名: { type:'类型', scope: '参数范围', notnull:true } }}
//
function meta(conf, context) {
  var _meta_ = {
    ret  : 0,
    meta : conf,
  };

  return function(req, resp, next) {
    if (req.query.meta !== undefined) {
      sendJson(resp, _meta_);
    } else {
      next();
    }
  }
}


function sendJson(resp, data) {
  resp.setHeader('content-type', 'application/json; charset=utf-8');
  var json;
  try {
    json = JSON.stringify(data);
  } catch(e) {
    json = { ret: 95, msg: e.message, stack: e.stack };
  }
  resp.end(json);
}


function debug(filter_conf) {
  return function(req, resp, next) {
    logger.info('HOST:  ', req.client.remoteAddress);
    logger.info('URL:   ', req.url);
    logger.info('HEADER:', req.headers);

    req.query && logger.info('QUERY: ', req.query);
    req.body  && logger.info('BODY:  ', req.body);
    req.files && logger.info('Files: ', req.files);

    console.log('    --------------------------------------------------------`><----------');
    next();
  }
}


function expense(fconf) {
  return function(req, resp, next) {
    var begin = Date.now();

    resp.on('finish', function() {
      var use = Date.now() - begin;
      var unit = 'ms';

      do {
        if (use < 1000) break;
        use = use / 1000;
        if (use < 60) {
          unit = 'sec';
          break;
        }
        use /= 60;
        unit = 'min';
      } while(false);

      logger.info('Use', use, unit, ', on `' + req.url + '`');
    });

    next();
  }
}


function page(fconf) {
  var fs   = require('fs');
  var path = fconf.path;
  var parm = fconf.parm || 'page';

  return function(req, resp, next) {
    if (req.query[parm]) {
      var reader = fs.createReadStream(path);
      reader.pipe(resp);
    } else {
      next();
    }
  }
}


function jumpto(fconf) {
  var default_url = fconf.url;
  var ended = !fconf.notend;
  var err = new Error('jump to where ?');

  return function(req, resp, next) {
    resp.jumpto = function(_url) {
      var where = _url || default_url;
      if (!where) {
        throw err;
      }

      resp.statusCode = 302;
      resp.setHeader('Location', where);

      if (ended) {
        resp.end();
      }
    };
    next();
  }
}
