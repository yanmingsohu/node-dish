var logger = require('logger-lib')('dish');
var DEF_TIMEOUT = 15 * 60;


module.exports = function(f) {
  f.set(cookie);
  f.set(session);
};


function cookie(fconf) {
  var cookie = require('cookie');
  var getter = fconf.cookieGetter;

  return function(req, resp, next) {
    var ck = null;
    var setck = [];

    function parseCookie() {
      try {
        ck = cookie.parse(req.headers.cookie);
      } catch(e) {
        ck = {};
      }
    }

    req.getCookie = function(name) {
      if (null === ck) parseCookie();
      return ck[name] || (getter && getter(name, req, resp));
    };

    resp.setCookie = function(name, value, opt) {
      var hdr = cookie.serialize(name, value, opt);
      setck.push(hdr);
      resp.setHeader('Set-cookie', setck);
    };

    next();
  }
}


//
// 单例的, 全局实例
//
var mem_session_ins;
var CK_NAME = 'nsessionid';

function getMemStory() {
  if (!mem_session_ins) {
    var sstory = require('./session-story.js');
    mem_session_ins = sstory.mem(DEF_TIMEOUT);
  }
  return mem_session_ins;
}


function session(fconf) {
  var A_MONTH_T  = 30 * 24 * 60 * 60;
  var signlib    = require('cookie-signature');
  var sign       = signlib.sign;
  var unsign     = signlib.unsign;
  var uid        = require('uid-safe').sync;

  var sess_mem   = fconf.story || fconf.store || getMemStory();
  var timeout    = sess_mem.timeout();
  var ck         = cookie(fconf);
  var pass       = fconf.pass;
  var cookieName = fconf.cookieName || CK_NAME;

  if (!pass) throw new Error('must set pass');


  return function(req, resp, next) {
    ck(req, resp, function(err) {
      if (err) return next(err);

      var ssid;
      var sid = req.getCookie(cookieName);

      if (!sid) {
        sid  = uid(24);
        ssid = sign(sid, pass);
      } else {
        ssid = sid;
        sid  = unsign(ssid, pass);
      }

      if (sid) {
        sess_mem.get(sid, when_get_session);
      } else {
        // 签名验证失败 sid 为空, 则重新建立新的 sid
        sid  = uid(24);
        ssid = sign(sid, pass);
        when_get_session();
      }


      function when_get_session(err, sess) {
        if (err) logger.error('session', err);

        if (!sess) {
          _new();
        } else if (sess.endtime < Date.now()) {
          sess_mem.del(sid, function(err) {
            if (err) logger.error('session', err);
            _new();
          });
        } else {
          sess.endtime = Date.now() + (timeout * 1000);
          sess.ucount++;
        }

        resp.setCookie(cookieName, ssid, { maxAge: A_MONTH_T, path: '/', httpOnly: true });
        req.session = sess.data;
        resp.on('finish', save);

        next();

        function save() {
          sess_mem.set(sid, sess, function(err) {
            if (err) logger.error('session', err);
          });
        }

        function _new() {
          sess = {
            data    : {},
            endtime : Date.now() + (timeout * 1000),
            ucount  : 0,
          };
          save();
        }
      } // [when_get_session]
    }); // [call ck]
  } // [return]
}
