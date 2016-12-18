var logger = require('logger-lib')('dish');


module.exports = {
  mem       : mem_session,
  redis     : redis,
  cassandra : cassandra,
};


//
// 基于内存的 session; 存储策略必须自行清除过期的条目;
// 可以返回过期的条目, 框架会予以忽略;
//
function mem_session(timeout) {
  var mem = {};
  var tid;

  var os = require('os');
  var fs = require('fs');
  var savefile = os.tmpdir() + '/node-dish-session.json';

  try {
    var db = fs.readFileSync(savefile, 'utf8');
    mem = JSON.parse(db);
    logger.info('Load Session from file', savefile);
  } catch(err) {
    logger.error(err);
  }

  process.on('exit', save_file);
  process.on('SIGINT', save_file);
  process.on('SIGINT', function() { process.exit(789) });


  function save_file(e) {
    if (e === 789) return;
    fs.writeFileSync(savefile, JSON.stringify(mem));
    logger.info('save session');
  }

  //
  // 必须导出的对象结构
  //
  return {
    timeout : function() {
      return timeout;
    },
    get : function(sid, rcb) {
      rcb(null, mem[sid]);
    },
    set : function(sid, val, rcb) {
      mem[sid] = val;
      rcb();
    },
    del : function(sid, rcb) {
      delete mem[sid];
      rcb();
    }
  };
}


//
// 依赖 `redis` / 'cache-redis-lib' 库
//
function redis(timeout, client) {
  var trans = json_trans();

  return {
    timeout : function() {
      return timeout;
    },
    get : function(sid, rcb) {
      client.GET(sid, trans.get(rcb));
    },
    set : function(sid, val, rcb) {
      client
        .multi()
        .SET(sid, trans.set(val))
        .EXPIRE(sid, timeout)
        .exec(function(err) {
          if (err) logger.error('redis fail set:', err);
        });
    },
    del : function(sid, rcb) {
      client.DEL(sid, rcb);
    },
  }
}


//
// 依赖 `cassandra-driver` 库
//
function cassandra(timeout, client, table, column_key, column_value) {
  var cql_select = cql('SELECT', column_value, 'FROM',
                    table, 'WHERE', column_key, '= ?');

  var cql_insert = cql('INSERT INTO', table, '(', column_key, ',', column_value,
                    ') VALUES (?, ?) USING TTL', timeout);

  var cql_update = cql('UPDATE', table, 'USING TTL', timeout,
                    'SET', column_value, '=? WHERE', column_key, '= ?');
                    
  var cql_delete = cql('DELETE FROM', table, 'WHERE', column_key, '= ?');

  var check_timeout = 24 * 60 * 60 * 1000;
  var opt = { prepare: true };
  var trans = json_trans();


  return {
    timeout : function() {
      return timeout;
    },
    get : function(sid, rcb) {
      client.execute(cql_select, [sid], opt, function(err, result) {
        if (err) return rcb(cerr(err));
        if (result.rows.length < 1) {
          rcb();
        } else {
          trans.get(rcb)(null, result.rows[0][column_value]);
        }
      });
    },
    set : function(sid, val, rcb) {
      // if (val.ucount) {
      //   client.execute(cql_update, [trans.set(val), sid], opt, rcb);
      // } else {
        client.execute(cql_insert, [sid, trans.set(val)], opt, rcb);
      // }
    },
    del : function(sid, rcb) {
      client.execute(cql_delete, [sid], opt, rcb);
    },
  }
}


function cerr(err)  {
  if (err) {
    logger.error(err.info, '[', err.coordinator,
      "]\n\t", err.message, '-', err.code, "\n\t", err.query);
    return err;
  }
}


function cql() {
  var ret = [];
  for (var i=0, e=arguments.length; i<e; ++i) {
    ret[i] = arguments[i];
  }
  return ret.join(' ');
}


function json_trans() {
  return {
    get : function(rcb) {
      return function(err, data) {
        if (err) rcb(err);
        else {
          try {
            rcb(null, JSON.parse(data));
          } catch(err) {
            rcb(err);
          }
        }
      };
    },
    set : function(d) {
      return JSON.stringify(d);
    },
  }
}
