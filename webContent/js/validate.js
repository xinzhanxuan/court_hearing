/**
 * @description 提供一些输入验证函数
 *  
 * @author ttwang3
 *
 */

(function(){
    
    const TEXT_FILTER = new RegExp("[`~@#$%^&*()=|{}\\[\\]<>/~！@#￥……&*（）——【】‘；：”“'。，、？]");

    const HOTWORD = `热词`;
    const HOTWORD_MAX_LENGTH = 20;
    const HOTWORD_MAX_COUNT = 100;
    const HOTWORD_MAX_TIP = `${HOTWORD}过长，建议分词建多个热词`;
    const HOTWORD_NULL_TIP = `${HOTWORD}不能为空`;
    const HOTWORD_DUP_TIP = `${HOTWORD}重复`;
    const HOTWORD_SPE_TIP = `${HOTWORD}不能包含特殊符号`;
    const HOTWORD_MAX_COUNT_TIP = `${HOTWORD}已经超过上限${HOTWORD_MAX_COUNT}个`;

    const FILE = `资源文件`;
    const FILE_MAX_LENGTH = 30;
    const FILE_MAX_SIZE = 10;
    const FILE_NULL_TIP = `${FILE}不能为空`;
    const FILE_MAX_LENGTH_TIP = `${FILE}不能超过${FILE_MAX_LENGTH}个`;
    const FILE_MAX_SIZE_TIP = `${FILE}不能超过${FILE_MAX_SIZE}M`;

    const DOC = `模板文件`;
    const DOC_MAX_SIZE = 5;
    const DOC_MAX_SIZE_TIP = `${DOC}不能超过${DOC_MAX_SIZE}M`;

    const MIC = `麦克风名称`;
    const MIC_NULL_TIP = `${MIC}不能为空`;
    const MIC_DUP_TIP = `${MIC}重复`;

    const SEARCHWORD = `搜索文本`;
    const SEARCHWORD_MAX_LENGTH = 20;
    const SEARCHWORD_MAX_TIP = `${SEARCHWORD}过长，请选取关键字进行搜索`;
    const SEARCHWORD_NULL_TIP = `${SEARCHWORD}不能为空`;
    const SEARCHWORD_SPE_TIP = `${SEARCHWORD}不能包含特殊符号`;

    var Validate = function () {};

    Validate.prototype = {

        checkHotword: function(name,list,index){
            var message = "";
            if(!name.length){
                message = HOTWORD_NULL_TIP;
            }else if(TEXT_FILTER.test(name) || /\\/g.test(name)){
                message = HOTWORD_SPE_TIP;
            }else if(name.length > HOTWORD_MAX_LENGTH){
                message = HOTWORD_MAX_TIP;
            }else if(_.findIndex(list, 'text', name) > -1 && _.findIndex(list, 'text', name) != index){
                message = HOTWORD_DUP_TIP;
            }else if(index === -1 && list.length >= HOTWORD_MAX_COUNT){
                message = HOTWORD_MAX_COUNT_TIP;
            }
            return message;
        },

        checkSearchword: function(text){
            var message = "";
            if(!text.length){
                message = SEARCHWORD_NULL_TIP;
            }else if(TEXT_FILTER.test(text) || /\\/g.test(text)){
                message = SEARCHWORD_SPE_TIP;
            }else if(text.length > SEARCHWORD_MAX_LENGTH){
                message = SEARCHWORD_MAX_TIP;
            }
            return message;
        },

        //上传文件验证
        checkFiles: function(files){
            var message = "";
            var totalSize = 0;
            var length = files.length;
            if(length > FILE_MAX_LENGTH){
                message = FILE_MAX_LENGTH_TIP;
            }else{
                for(var i = 0; i<length; i++){
                    var file = files[i];
                    if(file.size > 1024*1024*FILE_MAX_SIZE){
                        message = FILE_MAX_SIZE_TIP;
                        break;
                    }else{
                        totalSize += file.size;
                        if(totalSize > 1024*1024*FILE_MAX_SIZE){
                            message = FILE_MAX_SIZE_TIP;
                            break;
                        }
                    }
                }
            }
            return message;
        },

        //上传文件验证
        checkDocFiles: function(files){
            var message = "";
            var file  =  files[0];
            if(file.size > 1024*1024*DOC_MAX_SIZE){
                message = DOC_MAX_SIZE_TIP;
            }
            return message;
        },

        //麦克风名称验证
        checkMic : function(name,map,oldKey){
            var message = "";
            if(!name.length){
                message = MIC_NULL_TIP;
            }else{
                for(var [key,value] of map){
                    if(name == value.name && key !== oldKey){
                        message = MIC_DUP_TIP;
                        break
                    }
                }
                
            }
            return message;
        }

    };

    window.validate = new Validate();
})(window)