var logger = require('logger-lib')('dish');
var STOP   = true;


//
// 过滤器框架, 默认只提供了认证功能
//
module.exports = {
  get       : get,
  set       : set,
};


//
// 过滤器创建器函数的签名:
//    Function(filter_conf, service_context)
//    这个创建器返回一个过滤器函数
//
var filter_fn = {
};


//
// 根据参数验证规则, 获取一个验证函数, 返回函数签名
//    Function(reqest, response, next)
// 
// filter_conf 是 query_arr 中每个元素的对象 
//    type : 参数类型
//    name : 参数名
//    desc : 参数的描述
//    max  : 最长/最大 (可选的)
//    min  : 最小 (可选的)
//
function get(filter_conf, service_context) {
  var type = filter_conf.type;
  var vfn = filter_fn[type];
  if (!vfn) {
    throw new Error('无效的过滤器类型: ' + type);
  }

  var filter = vfn(filter_conf, service_context);
  if (!filter) {
    throw new Error('创建过滤器失败: ' + type);
  }
  return filter;
}


//
// 设置一个过滤器创建器
//
function set(f_fn, f_type) {
  var name = f_type || f_fn.name;

  if (!name) {
    throw new Error('argument fail, has no name.');
  }

  var old = filter_fn[name];
  if (old) {
    logger.warn('Filter', name, 'will be overlay.');
  }
  
  filter_fn[name] = f_fn;
  return old;
}
