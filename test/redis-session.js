//
// 测试 redis session, 需要引入 `cache-redis-lib` / `redis`
//
var http = require('http');
var dish = require('../index');
var logger = require('logger-lib');

var session_pass = 'fewinv9325ug';
var context   = { i:1, bac:'>' };
var container = dish.create('/redis', context);

var cache = require('cache-redis-lib');
var c2 = cache.createClient({
  host: "localhost",
  port: "6379",
  db: 1,
});

var store = dish.session_store.redis(5, c2);


container.service(set0, [
  { type: 'session', pass: session_pass, store: store }
]);
function set0(req, resp, next) {
  if (req.session) {
    if (isNaN(req.session.a0)) {
      req.session.a0 = 0;
    } else {
      req.session.a0 += 1;
    }
    next(null, req.session.a0);
    logger.info(req.session);
  } else {
    next(new Error('session fail'));
    logger.error('fail, no session.');
  }
}

var server = http.createServer(container);
server.listen(88);
logger.log('server at 88');
