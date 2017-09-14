/**
 * @description dialog 工具类
 *
 * @author ttwang3
 *
 */
(function(){

    var DialogUtil = function () {
        this.type = "";
        this.listen(this);
    };

    DialogUtil.prototype = {

        getCommonDialog : function(){ 
            // 获取系统统一的dialog
            var commonDialog = dialog.get('commondailog');        
            // 如果dialog不存在
            if(!commonDialog) {
                commonDialog = dialog({id:'commondailog'});
            }
            return commonDialog;
        },

        closeCommonDialog : function(){
            // 获取系统统一的dialog
            var commonDialog = dialog.get('commondailog');
            // 如果dialog 存在
            if(commonDialog) {
                //commonDialog.close().remove();
                commonDialog.close();
            }
            this.type = '';
            
        },
        
        //提示框
        showTip : function(content,isError){
            if($('.tip').length && tipId){
                clearTimeout(tipId);
                $('.tip').remove();
            }
            if(isError){
                $('body').prepend(`<div class="tip"> <i class="error"></i> <span>${content}</span> </div>`);
            }else{
                $('body').prepend(`<div class="tip"> <i></i> <span>${content}</span> </div>`);
            }
            var tipId = setTimeout(function(){
                $('.tip').remove();
            },3000);
            
        },

        //退出提示
        showQuitTip : function(){
            if($('.quit-tip-cover:not(none)').length && quitTipId){
                clearTimeout(quitTipId);
                $('.quit-tip-cover').addClass('none');
            }
            $('.quit-tip-cover').removeClass('none');
            
            var quitTipId = setTimeout(function(){
                $('.quit-tip-cover').addClass('none');
            },1000);
        },

        //闭庭提示框
        closeCourtTip : function(){
            var that = this;
            var d = that.getCommonDialog();
            d.content('<div class="dialog-content-wrapper close-court-dialog"> <div class="dialog-content"> 是否结束本次庭审 </div> <div class="dialog-footer"> <button class="button red-button close-court-btn">是</button> <button class="button red-button cancel-close-btn">否</button> </div> </div>'); 
            d.showModal();

            $('.cancel-close-btn').on('click',function(){
                //如果是有弹框是关闭
                if(that.type){
                    if(that.type == 'selectCaseCover'){
                        that[that.type](that.data,that.callback);
                    }else{
                        that[that.type](that.callback);
                    }
                }else{
                    that.closeCommonDialog();
                }
                
            })
        },

        //退出提示框
        closeAppTip : function(){
            var that = this;
            var d = that.getCommonDialog();
            d.content('<div class="dialog-content-wrapper close-court-dialog"> <div class="dialog-content"> 是否退出本系统 </div> <div class="dialog-footer"> <button class="button red-button close-court-btn">是</button> <button class="button red-button cancel-close-btn">否</button> </div> </div>'); 
            d.showModal();
            $('.cancel-close-btn').on('click',function(){
                that.closeCommonDialog();
                
            })
        },

        //异常恢复提示框
        crashRecoverTip : function(){
            var that = this;
            var d = that.getCommonDialog();
            d.content('<div class="dialog-content-wrapper close-court-dialog"> <div class="dialog-content" style="font-size: 14px;"> 系统检测到上次异常退出，是否恢复 </div> <div class="dialog-footer"> <a class="button red-button close-court-btn" href="html/records.html">是</a> <button class="button red-button cancel-close-btn">否</button> </div> </div>'); 
            d.showModal();

            $('.cancel-close-btn').on('click',function(){
                util.setLocalItem('isCrash',0);
                //结束上一次庭审
                if(util.getLocalItem('ajxxId')){
                    dao.caseEnd(util.getLocalItem('ajxxId'));
                }
                that.closeCommonDialog();
            });
        },

        backToIndexTip : function(showContent){
            var that = this;
            var d = that.getCommonDialog();
            d.content('<div class="dialog-content-wrapper close-court-dialog"> <div class="dialog-content" style="font-size: 14px;"> '+ showContent +' </div> <div class="dialog-footer"> <button class="button red-button close-court-btn">是</button> <button class="button red-button cancel-close-btn">否</button> </div> </div>'); 
            d.showModal();

            $('.cancel-close-btn').on('click',function(){
                that.closeCommonDialog();
            });
        },


        //加载提示
        showCover : function(){
            var that = this;
            var d = that.getCommonDialog();
            d.content('<div style="background: transparent;"><img src="../images/load.gif"></div>'); 
            d.showModal();
        },

        //上传文件加载提示
        showUploadCover : function(){
            var that = this;
            var d = that.getCommonDialog();
            d.content('<div class="upload-tip"> <i></i> <span>正在导入中，请稍等...</span> </div>'); 
            d.showModal();
        },

        listen: function (that) {
            //提示框头部点击关闭
            $('body').delegate('.dialog-header i','click', function(e){
                that.closeCommonDialog();
            });

            //首页弹出框，点击取消确定，弹出框关闭
            $('body').delegate('.sure-button','click', function(e){
                that.closeCommonDialog();
            });
            $('body').delegate('.cancel-button','click', function(e){
                that.closeCommonDialog();
            });

        }

    };

    window.dialogUtil = new DialogUtil();
})(window)