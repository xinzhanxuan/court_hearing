/**
 * @description define the material action.
 *
 * @author ttwang3
 *
 * @constructor material.init
 */
var _ = require('lodash');
var MaterialPageObject;
var Material = function () {
    this.$ = {
        icon : $('.material')
    };
    this.itemTpl = '<tr id="file_${item.jzid}"><td class="material-title" title="${item.file}">${item.file}</td><td><i class="icon delete-material single-material"></i></td></tr>';
    this.tpl = '{@each pages as item}' + this.itemTpl + '{@/each}'; 
    this.emptyTpl = '<div class="file-wrapper empty"><span class="empty-tip">案件资料列表为空，请通过点击【新增】按钮，<br>添加本地资源后以继续操作</span></div>';
    this.listen(this);
    this.page = {
        pageNum:1,
        pageSize:10
    };
};

Material.prototype = {

    getPageData : function(pageNum,page){
        dao.searchFileById(pageNum,(data) => {
            if(data.pages.length){
                $('.dialog-content-wrapper.material tbody').html(juicer(this.tpl, data));
                this.page.pageNum = data.pageNumber;
                this.page.totalPage = data.totalPage;
                this.page.totalSize = data.totalSize;
                this.showFileCount(this.page.totalSize);
                page.render();
            }else{
                $('.dialog-content-wrapper.material tbody').html(this.emptyTpl);
            }
        },(status) => {
            dialogUtil.showTip('搜索失败',true);
        });
    },

    showFileCount : function(count){
        util.setLocalItem('fileCount',count);
        $('.material-title .font-grey').html(`(共${count}个文件)`);
        $('.records-header-num').html(`${count}`);
    },

    deleteSingleItem : function(id){
        //如果当前页有数据则渲染当前页
        dao.deleteFile(id,(data) => {
            this.hasChange = true;
            var currentItem = $('.dialog-content-wrapper.material tbody tr').length;
            if(currentItem > 1){
                if(this.page.pageNum == this.page.totalPage){
                    $(`tr#file_${id}`).remove();
                    this.page.totalSize --;
                    this.showFileCount(this.page.totalSize);
                }else{
                    this.getPageData(this.page.pageNum, MaterialPageObject);
                }
            }else if(currentItem == 1 && this.page.pageNum == 1){
                this.showFileCount(0);
                $('.page-wrapper').html('');
                $('.dialog-content-wrapper.material tbody').html(this.emptyTpl);
            }else{
                this.getPageData(this.page.pageNum-1, MaterialPageObject);
            }
        },(status) => {
            dialogUtil.showTip('删除失败',true);
        });
        
    },

    addItems : function(formData){
        dao.uploadFiles(formData,(data) => {
            if(data.success.length){
                this.hasChange = true;
                this.getPageData(1, MaterialPageObject);
            }
            if(data.failed){
                dialogUtil.showTip(data.failed + '上传失败',true);
            }
        },(status) => {
            dialogUtil.showTip('文件上传失败',true);
        });
    },

    listen: function (that) {
        //弹出资料列表
        this.$.icon.on('click',() => {
            var intentTpl = '<div class="dialog-content-wrapper material"> <div class="material-cover none"><div class="patch-tip">资料正在训练中，关闭不影响开庭</div></div><div class="dialog-header"> <span>案件资料</span> <i></i> </div> <div class="dialog-content"><table><thead><tr><th class="material-title">请添加该案件资料后点击【训练】以提高转写识别率</th><th><a class="input-a" href="javascript:;" title=" "><input name="source" type="file" multiple="multiple" accept=".rtf,.docx,application/msword,text/plain,imege/jpg,image/jpeg,image/png,image/bmp"/><i class="icon add-material"></i></a></th></tr></thead><tbody></tbody></table></div> <div class="dialog-footer"><div class="page-wrapper"></div><div><button class="button red-button patch-button">训  练</button></div></div> </div>'; 
            var d = dialogUtil.getCommonDialog(); 
            d.content(intentTpl);
            d.showModal();
            this.$.pageWrapper = $('.dialog-content-wrapper.material .page-wrapper');
            //if(!MaterialPageObject){
                MaterialPageObject = new Page(this);
            //}
            this.getPageData(1,MaterialPageObject);
            
            dao.getTrainResult((data)=>{
                if(data.status == '1'){
                    $('.dialog-content-wrapper.material').addClass('disable');
                    $('.material-cover').removeClass('none');
                }
            },()=>{
                dialogUtil.showTip('训练结果查询失败',true);
            });
            //文件上传
            $('input[name="source"]').on('change',function(){
                var files = this.files;
                var length = files.length;
                if(!length){
                    return;
                }
                var message = validate.checkFiles(files);
                if(message){
                    dialogUtil.showTip(message,true);
                    $('input[name="source"]').val("");
                    return false;
                }
                var formData = new FormData();
                for(var i = 0; i<length; i++){
                    formData.append('files', files[i]);
                }
                //上传文件
                $('input[name="source"]').val("");
                that.addItems(formData);
            });


            //单个删除操作
            $('.dialog-content-wrapper.material').delegate('.delete-material.single-material','click', function() {
                that.deleteSingleItem($(this).parent().parent().attr('id').split('_')[1]);
            });
            
            $('.patch-button').on('click',function(){
                if($('.empty').length){
                    dialogUtil.showTip('请先上传资料',true);
                    return
                }
                dao.trainFile(util.getLocalItem('ajxxId'));
                $('.material-cover').show();
                $('.dialog-content-wrapper.material').addClass('disable');

            })

        });

    }

}