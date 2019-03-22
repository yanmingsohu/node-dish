
module.exports = function(f) {
  f.set(post);
  f.set(upfile);
};


function upfile(filter_conf) {
  var multiparty = require('multiparty');
  var maxsize = (filter_conf.maxsize || (2 * 1024)) * 1024;


  return function(req, resp, next) {
    var form = new multiparty.Form({
      maxFilesSize : maxsize,
      uploadDir    : filter_conf.savedir,
    });

    form.parse(req, function(err, fields, files) {
      if (err) return next(err);
      for (var n in fields) {
        req.query[n] = fields[n];
      }

      var fs = [];
      for (var n in files) {
        for (var i=0,e=files[n].length; i<e; ++i) {
          fs.push( files[n][i] );
        }
      }

      req.files = fs;
      next();
    });
  };
}


function post(filter_conf) {
  var maxsize = (filter_conf.maxsize * 1024) || (2 * 1024 * 1024);
  var types = {
    'application/x-www-form-urlencoded' : form,
    'application/json'                  : json,
    'application/xml'                   : xml,
    'text/html'                         : xml,
    'text/xml'                          : xml,

    'buf'  : buf,
    'form' : form,
    'json' : json,
    'xml'  : xml,
  };


  return types[ filter_conf.format ] || auto;


  function auto(req, resp, next) {
    var ctype = req.headers['content-type'];
    var fn = types[ ctype ] || buf;
    fn(req, resp, next);
  }


  function form(req, resp, next) {
    var querystring = require('querystring');

    read_body(maxsize, req, function(err, buf) {
      if (err) return next(err);
      try {
        var query = querystring.parse(buf.toString());
        for (var n in query) {
          req.query[n] = query[n];
        }
        next();
      } catch(e) {
        next(e);
      }
    });
  }


  function json(req, resp, next) {
    read_body(maxsize, req, function(err, buf) {
      if (err) return next(err);
      try {
        req.body = JSON.parse(buf.toString());
        next();
      } catch(e) {
        next(e);
      }
    });
  }


  function xml(req, resp, next) {
    var xson = require('xson-lib');

    read_body(maxsize, req, function(err, buf) {
      if (err) return next(err);
      try {
        req.body = xson.toJson(buf.toString());
        next();
      } catch(e) {
        next(e);
      }
    });
  }


  function buf(req, resp, next) {
    read_body(maxsize, req, function(err, buf) {
      if (err) return next(err);
      req.body = buf;
      next();
    });
  }
}


function read_body(maxsize, req, getter) {
  var buffers = [];
  var size = 0;

  req.on('data', function(data) {
    size += data.length;
    if (size > maxsize) {
      req.abort();
      throw new Error('超过缓冲区长度 ' + maxsize + ' bytes');
    }
    buffers.push(data);
  });

  req.on('end', function() {
    var retBuf = Buffer.concat(buffers);
    getter(null, retBuf);
  });

  req.on('error', function(err) {
    getter(err);
  });
}
