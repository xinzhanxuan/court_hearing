/**
 * @description 定义dao
 *
 * @author ttwang3
 *
 */
(function(){
    var Dao = function (config) {

        this.config = config;

        this.ajax = (url,data,method,success,error) => {
            $.ajax({ 
                url: `${this.config.httpClient}${url}`,
                type: method,
                dataType:'json',
                data: data,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Content-type", "application/json;charset=UTF-8");
                }
            })
            .complete(data => {
                if(data.status == 200){
                    if(!success){
                        return;
                    }
                    if(typeof(data.responseJSON) !== "undefined"){
                        success(data.responseJSON);
                    }else if(data.responseText !== ""){
                        var re = {
                            data:data.responseText
                        };
                        success(re);
                    }else{
                        success();
                    }
                }else{
                    data.url = `${this.config.httpClient}${url}`;
                    util.exceptionHandle(data);
                    if(error){
                        error(data);
                    }
                }
            })
        }
    };
    
    Dao.prototype = {

        //开庭
        openCourt : function(success,error) {
            var caseno = util.getLocalItem('ajxxId');
            var requestData = {
                appid:"court200",
                caseno:`${caseno}`,
                courtId:`${this.config.courtId}`,
                courtCode:`${this.config.courtCode}`,
                deputySid: "",
                sid:""
            };
            var url = `/trialMix/begin`;
            this.ajax(url,JSON.stringify(requestData),'POST',success,error);
        },

        //闭庭
        closeCourt : function(success,error){
            var url = `/trialMix/end`;
            var caseno = util.getLocalItem('ajxxId');
            var requestData = {
                appid:"court200",
                caseno:`${caseno}`,
                courtId:`${this.config.courtId}`,
                courtCode:`${this.config.courtCode}`,
                deputySid: util.getLocalItem('mix_sid'),
                sid:util.getLocalItem('sid')
            };
            this.ajax(url,JSON.stringify(requestData),'PUT',success,error);
        },

        //休庭接口
        pauseCourt : function(success,error){
            var url = `/trialMix/suspend`;
            var caseno = util.getLocalItem('ajxxId');
            var requestData = {
                appid:"court200",
                caseno:`${caseno}`,
                courtId:`${this.config.courtId}`,
                courtCode:`${this.config.courtCode}`,
                deputySid: util.getLocalItem('mix_sid'),
                sid:util.getLocalItem('sid')
            };
            this.ajax(url,JSON.stringify(requestData),'PUT',success,error);
        },

        //恢复开庭接口
        resumeCourt : function(success,error){
            var url = `/trialMix/recovery`;
            var caseno = util.getLocalItem('ajxxId');
            var requestData = {
                appid:"court200",
                caseno:`${caseno}`,
                courtId:`${this.config.courtId}`,
                courtCode:`${this.config.courtCode}`,
                deputySid: util.getLocalItem('mix_sid'),
                sid:util.getLocalItem('sid')
            };
            this.ajax(url,JSON.stringify(requestData),'PUT',success,error);
        },

        //获取音频
        getAudio : function(success,error){
            var param = {
                "sessionId":util.getLocalItem('mix_sid'),
                "courtId":this.config.courtId
            };
            var url = `/voices/search`;
            var log = `${this.config.httpClient}${url}/${param.sessionId}/${this.config.courtId}`;
            util.exceptionHandle({statusText:'获取音频接口地址：' + log});
            this.ajax(url,param,'GET',success,error);
        },

        //获取麦克风配置信息
        getChannel : function(success, error){
            var url = `/mic/${this.config.courtId}`;
            this.ajax(url,'','GET',success,error); 
        },
        //获取标准版或者定制版信息
//      getDoubleVersion : function(success,error){
//      	var requestData = {
//      		doubleVersion:"this.config.doubleVersion"
//      	};
//      	this.ajax(url,JSON.stringify(requestData.doubleVersion),'PUT',success,error);
//      }

        //设置麦克风配置
        setChannel : function(data,success,error){
            var url = `/mic/batch/${this.config.courtId}`;
            this.ajax(url,JSON.stringify(data),'PUT',success,error); 
        },

        //文档下载
        downloadDoc : function(htmlContent,fontStyle,success,error){
            var param = {
                "htmlContent":new Buffer(htmlContent).toString('base64'),
                "textStyle":fontStyle.content,
                "docName":util.getLocalItem('caseName'),
                "needHtml":"0",
                "wordFlag":this.config.exportWordType == '2003' ? 0 :1
            };
            if(param.wordFlag && fontStyle.header.select){
                param.header = fontStyle.header;
            }
            if(param.wordFlag && fontStyle.footer.select){
                param.footer = fontStyle.footer;
            }
            var url = `/htmlWordConvert/htmlToWord`;
            this.ajax(url,JSON.stringify(param),'POST',success,error); 
        },

        //文档上传
        uploadAbstractFile : function(htmlContent,fontStyle,success,error){
            var param = {
                "htmlContent":new Buffer(htmlContent).toString('base64'),
                "textStyle":fontStyle.content,
                "docName":util.getLocalItem('caseName'),
                "needHtml":"0",
                "wordFlag":this.config.exportWordType == '2003' ? 0 :1,
                "caseNumber":util.getLocalItem('caseName'),
                "startTime":util.getLocalItem('openTime'),
                "endTime":new Date().getTime().toString()
            };
            var url = `/cases/kdTdh/saveContent`;
            this.ajax(url,JSON.stringify(param),'POST',success,error);
        },

        //热词更新接口
        updateHotWord : function(data,success,error) {
            var param = {
                "appid":"court200",
                "courtId":this.config.courtId,
                "subcmd":"update",
                "data":data
            };
            var url = `/trialMix/hotWord`;
            this.ajax(url,JSON.stringify(param),'POST',success,error);
        },

        // 清空热词
        clearHotWord: function(success, error) {
            var param = {
                appid: "court200",
                courtId: this.config.courtId,
                subcmd: "clear",
                data: ''
            };
            var url = `/trialMix/hotWord`;
            this.ajax(url, JSON.stringify(param), 'POST', success, error);
        },

        //热词更新接口
        generateConsumer : function() {
            var param = {
                "courtId":this.config.courtId
            };
            var url = `/ocx/generateConsumer`;
            this.ajax(url,JSON.stringify(param),'POST');
        },


        //文档保存接口
        saveHtml : function(sessionId,data,success,error) {
            var param = {
                "sessionId":sessionId,
                "courtId":this.config.courtId,
                "data":data,
                "courtCode":this.config.courtCode
            };
            var url = `/file/store`;
            this.ajax(url,JSON.stringify(param),'POST',success,error);
        },

        // 搜索案件接口
        // 标准接口为 0
        // 通达海接口为 1
        searchCaseByName : function(name,success,error) {
            if (config.dataSource === 1) {
                return this.ajax(`/cases/kdTdh/${name}`, null, 'GET', success, error);
            }
            var url = `/cases/accurate`;
            var param = {
                "caseNumber" : `${name}`
            };
            this.ajax(url,JSON.stringify(param),'POST',success,error);
        },

        //根据案件ID获取资料
        searchFileById : function(pageNum,success,error){
            var ajxxId = util.getLocalItem('ajxxId');
            var url = `/dossierMaterial/${ajxxId}/${pageNum}/10`;
            this.ajax(url,{},'GET',success,error);
        },

        //判断案件是否在审理
        caseBegin : function(type,ajxxId,success,error){
            var url = `/cases/beginTrial/${type}/${ajxxId}`;
            this.ajax(url,{},'POST',success,error);
        },

        //案件结束审理
        caseEnd : function(ajxxId,success,error){
            var url = `/cases/endTrial/${ajxxId}`;
            this.ajax(url,{},'POST',success,error);
        },

        //获取案件资源数目
        getCaseFileNum : function(ajxxId,success,error){
            var url = `/dossierMaterial/loadFromWenshu/${ajxxId}`;
            this.ajax(url,{},'POST',success,error);
        },

        //文件上传接口
        uploadFiles : function(formData,success,error) {
            //var ah = util.getLocalItem('caseName');
            var ajxxId = util.getLocalItem('ajxxId');
            $.ajax({
                url: `${config.httpClient}/dossierMaterial/upload/${ajxxId}`,
                type: 'POST',
                cache: false,
                data: formData,
                processData: false,
                contentType: false
            }).complete(data => {
                if(data.status == 200){
                    success(data.responseJSON);
                }else{
                    util.exceptionHandle(data);
                    error(data);
                }
            })
        },

        //文件删除接口
        deleteFile : function(jzids,success,error) {           
            var url = `/dossierMaterial/${jzids}`;
            this.ajax(url,{},'DELETE',success,error);
        },

        //训练接口
        trainFile : function(ajxxId,success,error) {
            var url = `/dossierMaterial/patchTest/${ajxxId}`;
            this.ajax(url,{},'POST',success,error);
        },

        //训练结果查询
        getTrainResult : function(success,error){
            var ajxxId = util.getLocalItem('ajxxId');
            var url = `/dossierMaterial/patchStatus/${ajxxId}`;
            this.ajax(url,{},'POST',success,error);
        },

        importWord : function(formData,success,error){
            $.ajax({
                url: `${config.httpClient}/htmlWordConvert/wordToHtml`,
                type: 'POST',
                cache: false,
                data: formData,
                processData: false,
                contentType: false
            }).complete(data => {
                if(data.status == 200){
                    success(data.responseText);
                }else{
                    util.exceptionHandle(data);
                    error(data);
                }
            })
        },

        // 分词结果
        wordRate : function(content, success, error) {
            var data = { content: content, limit: config.limit || 3, top: config.top || 20 };
            $.ajax({
                type: 'POST',
                data: JSON.stringify(data),
                cache: false,
                url: `${config.httpClient}/wordRate/getWordRate`,
                processData: false,
                contentType: 'application/json;charset=UTF-8'
            }).complete(data => {
                if(data.status == 200 || data.status === 304){
                    typeof success === 'function' && success(data.responseJSON);
                }else{
                    util.exceptionHandle(data);
                    typeof error === 'function' && error(data);
                }
            })
        }
    };
    //配置文件
    var config = readConfig.getConfig('config.json');

    window.dao = new Dao(config);
})(window)