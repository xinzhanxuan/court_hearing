/*
 @name: node-main.js
 @description: 客户端 异常捕获
 */

//var hasSaved = {};//是否已经触发过这个错误

process.on("uncaughtException", function (e) {
    var errText = e.stack;
    if(errText.match(/dns.js|net.js/)!=null){
        return;//网络原因引起的BUG 忽略
    }
    var fs = require('fs');
    var nwPath = process.cwd();
    var date = new Date();
    var errText = "\r\n## 日期：" + date.toLocaleDateString() + ' ' + date.toLocaleTimeString() +
        "\r\n##### 错误详情： \r\n```javascript\r\n" + errText + "\r\n```\r\n";
    fs.appendFile(nwPath + '/errorLogs.md', errText, function (err) {
        if (err) throw err;
    });
});