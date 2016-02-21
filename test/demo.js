var http = require('http');
var dish = require('../index');

var session_pass = 'fewinv9325ug';
var context   = { i:1, bac:'>' };
var container = dish.create('/server', context);

//
// 打开 http://localhost:88/server/test?page=1 进入测试页
//
container.service(test, [
  { type: 'post', format: 'buf' },
  { type: 'debug' },
  { type: 'page', path: __dirname + '/page.html' },
  { type: 'email', name: 'em' },
  { type: 'string', name: 'user', min:1, max:3 },
  { type: 'float',  name: 'f', min:1, max: 9},
  { type: 'integer', name: 'i', min:1, max: 9},
]);
function test(req, resp, next) {
  next(null, { message:'成功', i: this.i++, query: req.query });
}


container.service(file, [
  { type: 'upfile' },
  { type: 'debug' },
]);
function file(req, resp, next) {
  next(null, 'ok');
}


container.service(set_cookie, [
  { type: 'cookie' },
]);
function set_cookie(req, resp, next) {
  this.bac += '-';
  resp.setCookie('test', ++this.i);
  resp.setCookie('tag', this.bac);
  next(null, this.i);
}


container.service(get_cookie, [
  { type: 'cookie' },
]);
function get_cookie(req, resp, next) {
  next(null, 'cookie: ' + req.getCookie('test') + ', ' + req.getCookie('tag'));
}


container.service(session, [
  { type: 'debug' },
  { type: 'session', pass: session_pass },
]);
function session(req, resp, next) {
  var a = req.query.a;
  var b = req.session.a;
  if (a) {
    req.session.a = a;
  }
  next(null, b);
}


//
// url: http://localhost:88/server/jump
//
container.service(jump, [{ type: 'jumpto', url: '/server/test?page=1' }]);
function jump(req, resp) {
  resp.jumpto();
}


var server = http.createServer(container);
server.listen(88);