var d = require('./lib/dish.js');
var f = require('./lib/filter.js');

//
// 加载默认过滤器
//
require('./lib/f-verify.js')(f);
require('./lib/f-tool.js')(f);
require('./lib/f-post.js')(f);
require('./lib/f-cookie.js')(f);


module.exports = {
  create        : d.create,
  call_stack    : d.call_stack,
  filter        : f.set,
  session_story : require('./lib/session-story.js'),
};