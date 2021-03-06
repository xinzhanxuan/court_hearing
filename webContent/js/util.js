
/**
 * @description 全局工具类
 * @author ttwang3
 *
 */
(function(){
    var fs = require('fs');
    var path = require('path');
    var nwPath = process.cwd();

    function Util(){};

    Util.prototype = {

        //处理时间，time单位为秒，最高小时级别
        dealTimeBySec : function(time){
            var hour = time ? parseInt(time/3600) : 0,
                min = time ? parseInt((time%3600)/60) : 0,
                sec = time ? parseInt((time%3600)%60) : 0;
            if(hour < 10){
                hour = '0' + hour;
            }
            if(min < 10){
                min = '0' + min;
            }
            if(sec < 10){
                sec = '0' + sec;
            }
            return hour+":"+min+":"+sec;
        },

        //获取时间格式，最高分钟级别
        getTime : function(time){
           var min = time ? parseInt(time/60) : 0,
               sec = time ? parseInt(time%60) : 0;
           if(min < 10)
               min = '0' + min;
           if(sec < 10)
               sec = '0' + sec;
           return min + ':' + sec;
        },

        //通过链接获取数据
        getQueryString : function(name){
            var reg = new RegExp("(^|&)"+ name +"=([^&]*)(&|$)");
            var r = window.location.search.substr(1).match(reg);
            if(r!=null){
                return  unescape(r[2]); 
            }
            return null;
        },

        //存储本独数据
        setLocalItem : function(name,value){
            if(window && window.localStorage){
                window.localStorage.setItem(name,value);
            }
        },

        //清除本地数据
        clearLocal : function(name,value){
            if(window && window.localStorage){
                window.localStorage.clear();
            }
        },

        //获取本地数据
        getLocalItem : function(name){
            var value = "";
            if(window && window.localStorage){
                value = window.localStorage.getItem(name);
            }
            return value;
        },

        //将热词转为字符串
        convertHotWordToString : function(data){
            var hotwordString = "";
            for (var value of data) {
                if(hotwordString){
                    hotwordString += `,${value.text}`;
                }else{
                    hotwordString += value.text;
                }
                
            }
            return hotwordString;
        },
        //数字规整
        //含有数数字的换行
        improveText : function(text){
            //数字规整数组
            var numArray = ['一，','二，','三，','四，','五，','六，','七，','八，'];
            if(_.indexOf(numArray,text.substring(0,2))>-1){
                text = `<br>&nbsp; &nbsp;${text}`;
            }
            return text;
        },

        setKeyWords : function(messageMap,keyWords,keyWordsMap){
            for(var object in keyWords){
                for(var word of keyWords[object]){
                    var reg = new RegExp(word,'gi');
                    if(reg.exec(messageMap.text)){
                        if(keyWordsMap.get(object)){
                            var keyWordsArray = keyWordsMap.get(object);
                            var hasInArray = false;
                            for(var w of keyWordsArray){
                                if(w.value == word){
                                    hasInArray = true;
                                    w.count += 1;
                                    w.list.push({bg:messageMap.beginTime,ed:messageMap.endTime});
                                    break
                                }
                            }
                            if(!hasInArray){
                                keyWordsArray.push({
                                    value:word,
                                    count:1,
                                    list:[{bg:messageMap.beginTime,ed:messageMap.endTime}]
                                })
                            }
                        }else{
                            keyWordsMap.set(object,[{
                                value:word,
                                count:1,
                                list:[{bg:messageMap.beginTime,ed:messageMap.endTime}]
                            }])
                        }
                    }
                }
            }
        },

        getLineRule : function(rule,height){
            if(rule == 'one'){
                return '100%';
            }
            if(rule == 'onepointfive'){
                return '150%';
            }
            if(rule == 'two'){
                return '200%';
            }
            if(rule == 'min' 
                || rule =='fixed'){
                return height+'pt';
            }
            if(rule == 'multi'){
                return height * 100+'%';
            }
        },

        setContentStyle : function(style){
            var contentLineHeight = this.getLineRule(style.lineRule,style.lineSpacing);
            var css = `.edui-body-container {font-family:${style.fontFamily};font-size:${style.fontSize}pt;line-height: ${contentLineHeight};}`,
            head = document.getElementsByTagName('head')[0],
            style = document.createElement('style');
            style.type = 'text/css';
            if(style.styleSheet){
                style.styleSheet.cssText = css;
            }else{
                style.appendChild(document.createTextNode(css));
            }
            head.appendChild(style);
        },

        //测试文件书写
        writeTestFile : function(text){
            var _this = this;
            var timestamp = new Date().getTime();
            fs.writeFile(path.join(execPath, '..', 'test.txt'), timestamp + ',' + text + '\r\n', {
                flag: 'a'
            }, function (err) {
                if (err) {
                    _this.exceptionHandle(err);
                    throw err;
                }
            });
        },

        getSocketServer: function(path){
            return path + '/sockjs/court';
        },

        //异常处理
        exceptionHandle : function(e){
            var date = new Date();
            var errText = e.stack ? e.stack : 'ajax:' + e.url +':'+ e.statusText;
            errText = "\r\n## 日期：" + date.toLocaleDateString() + ' ' + date.toLocaleTimeString() 
            + "\r\n##### 错误详情： \r\n```javascript\r\n" + errText + "\r\n```\r\n";
            fs.appendFile(nwPath + '/errorLogs.md', errText, function (err) {
                if (err) {
                    throw err;
                }
            });
        }
    };

    window.util = new Util();

})(window)