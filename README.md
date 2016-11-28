# Web 服务框架

>   比 express 更简单更快更轻量, 比 native 更多功能,
>   可扩展的, 符合 zr 平台约定的框架


## Install

`npm install --save dish-lib`


## Usage

```js
//
// 引入的 dish 库可以创建多个服务容器
//
var dish = require('dish-lib');
var http = require('http');

//
// [可选的] context 上下文可以在服务函数中用 this 访问,
// 利用这一点可以绑定常用函数和对象
//
var context = { i:1 };

//
// [可选的] nextor 会创建一个回调函数, 服务函数调用 next() 时,
// 即调用这个创建的回调函数
//
var nextor = function(req, resp) {
    return Function(err, data) {};
};

//
// 创建服务容器, `/server` 是路径前缀, 后两个参数可以 null
//
var container = dish.create('/server', context, nextor);


//
// 在容器中注册服务函数, 注意不可使用匿名函数,
// 函数名即服务名, 过滤器列表可以 null;
//
container.service(test, [
  // 这是过滤器列表, type 是过滤器名称, 其他是过滤器参数
  { type: 'string', name: 'user', min:1, max:3 }
]);

//
// 这是实际的服务函数, 结束时调用 next(err, data),
// next 函数默认返回标准的 json 结构, 或在 create(.., nextor) 时修改 nextor 的行为
//
function test(request, response, next) {
  next(null, {message:'成功', i: this.i++});

  // 可以通过 call 方法调用另一个服务
  this.call('service name', function(err, data) {});
}


var server = http.createServer(container);
//
// 启动服务后, 访问 http://localhost:88/server/test?user=jym
//
server.listen(88);
```


### 可用过滤器

* string
    - 参数: [ min: 最小长度, max: 最大长度, name: 在 query 中的参数名 ]
    - 作用: 验证 GET 参数

* integer
    - 参数: [ min: 最小值, max: 最大值, name: 在 query 中的参数名 ]
    - 作用: 验证 GET 参数

* float
    - 参数: [ min: 最小值, max: 最大值, name: 在 query 中的参数名 ]
    - 作用: 验证 GET 参数

* email
    - 参数: [ name: 在 query 中的参数名 ]
    - 作用: 验证 GET 参数

* session
    - 参数: [ story: Object, pass: String, cookieGetter: 见 cookie 的说明, cookieName: 'nsessionid' ]
    - 作用: 在 request 上绑定一个 session 的对象, 该对象上可以绑定属性; story 是一个对象必须导出 set/get 方法用于 session 持久化, 如果 story 为空, 默认使用内存保持 session; pass 用于签名 session, 提供一个持久化但有一个变更策略的签名, 可以在应用重启后保持之前的 session 有效, 又不会让安全性降低, 默认每次重启都会改变 pass, 所有用户都会重新登录; 使用 `nsessionid` 作为 cookie 名称, 通过设置 'cookieName' 参数可以改变 cookie;

* cookie
    - 参数: [ cookieGetter: Function ]
    - 作用: 在 request 上绑定一个 getCookie(name) 方法, 来获取 cookie 的值; 在 resopnse 上绑定 setCookie(name, value, opt) 来设置一个 cookie.
    - opt 属性: maxAge[S], domain[s], path[s], expires[D], httpOnly[b], secure[b], firstPartyOnly[b], (s:string, D:Date, b:boolean, S:秒); 默认的设置, cookie 是不安全的, 只对当前目录及子目录有效, 浏览器关闭后消失;
    - cookieGetter: Function(name, request, response) 可选的，当 cookie 中没有对应键的值，提供一个扩展方法来模拟一个 cookie 的值；

* post
    - 参数: [ format: post-body 的处理方式, maxsize: 缓冲区最大长度千字节, 默认2M ]
    - 作用: 默认自动按照请求中 `content-type` 指定的类型来处理, 如果指定了 format 参数, 则强制按照 format 类型来执行, 两者都无法确定, 则按 buf 处理. 解析的结果默认绑定到 request.body.
      + `form` 按表单来解析, 结果附加在 request.query
      + `json` 按 json 字符串来解析
      + `xml`  解析 xml 转换为 json
      + `buf`  结果是一个 Buffer 对象

* upfile
    - 参数: [ maxsize: 最大文件尺寸千字节, savedir: 保存文件的文件夹, 默认在 temp 中 ]
    - 作用: 当文件接收完成后, 在 request 上绑定一个 files 列表, 每个元素是一个文件,  `content-type` 必须是 `multipart/form-data`
    - files 一个元素的结构:  
      + fieldName : '表单名称',
      + originalFilename :　'原始文件名',
      + path : '临时文件的完成路径',
      + headers : { 与文件相关的信息 },
      + size: 文件尺寸, 字节,

* page
    - 参数: [ path: 完整路径, parm: 参数默认是 'page' ]
    - 作用: 与服务关联一个静态页面, 当参数中出现 page 且非 false 时就会返回 path 指定的静态文件.

* jumpto
    - 参数: [ url: 默认跳转地址, notend: bool, 默认 false ]
    - 作用: 让浏览器跳转到一个新的地址上, 在response 上绑定 jumpto(url) 函数, 如果 url 参数为空, 则跳转到参数指定的地址; notend 如果为 false 则该方法之后不能再往客户端发送任何数据, 否则用户需要自行调用 resp.end();

* debug
    - 参数: 无
    - 作用: 当收到请求后, 把相关参数记入日志

* expense
    - 参数: 无
    - 作用: 在日志中记录请求花费的时间


## 自定义过滤器

  设置一个过滤器, 如果过滤器已经存在, 会替换, 并返回被替换的.
  一旦过滤器设置完成, 即可在注册服务函数时, 在过滤器列表中使用这个过滤器

```js
// 如果没有第二个参数, 则使用函数名作为过滤器类型名
dish.filter(filter_string [, 'filter-type']);

//
// 过滤器创建器
// service_context -- 服务的上下文, 在这个服务上的所有请求都是基于这个上下文
//
function filter_string(filter_conf, service_context) {
  //
  // 返回一个创建好的过滤器函数
  // 这个闭包可以设置该服务上下文使用的变量
  // 外部包的引入也应该放在这里, 可以提升内存使用效率
  //
  return function(req, resp, next) {
    // 过滤器在结束后调用 next() 继续执行
    // 调用 next(err) 会终止执行, 并返回错误
  }
}
```


## session 持久化策略

  session 过滤器的预置 story 可以通过 `dish.session_story.xxx()` 创建, 创建出的实例在声明 session 过滤器时传递给 story 参数; 持久化策略返回的过期数据由框架忽略, 但是过期数据由策略自己清除;
  当前支持如下持久化策略:


* mem(timeout) -- 在内存中保持 session, 重启后 session 消失, timeout 指定超时时间(秒);

* cassandra(timeout, client, table, column_key, column_value) -- `client = new require('cassandra-driver').Client(...);`; table 表名; column_key sessionid 列的名称, 必须是 text 类型; column_value session的数据列名, 必须是 text 类型;

* redis(timeout, client) -- `client = require("redis").createClient(...);`


### 自定义持久化策略

```js
//
// 用户自定义持久化策略, 返回一个对象
//
var user_session_mem = function() {
  // 每次应用启动时, 应该删除已经超时的 session
  // 否则会留下大量垃圾数据

  val = {
    data    : {},     // session 的用户数据
    endtime : Date,   // 过期时间的毫秒
    ucount  : int,    // 访问次数
  };

  return {
    //
    // 返回一个整数, 描述 session 的超时时间, 秒
    //
    timeout : function() { },

    //
    // 获取 session 的内容
    //
    get : function(sid, rcb) {},

    //
    // 设置/更新 session 的内容
    //
    set : function(sid, val, rcb) {},

    //
    // 删除 session 的内容(过期)
    //
    del : function(sid, rcb) {},
  };
};
```
