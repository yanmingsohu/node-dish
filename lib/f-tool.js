var logger = require('logger-lib')('dish');


module.exports = function(f) {
  f.set(debug);
  f.set(page);
  f.set(jumpto);
  f.set(expense);
};


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
