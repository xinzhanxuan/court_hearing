/**
 * @description define the hotWord action.
 *
 * @author ttwang3
 *
 * @constructor hotWord.init
 */

var HotKeyAbs = function (editer) {
    this.editor = editer;
    this.listen(this);
};

HotKeyAbs.prototype = new HotKey();

HotKeyAbs.prototype.editorClick = function(){
    var a = window.event.keyCode;
    if((a == 13)&&(event.ctrlKey)){//打点
        if(this.editor.markUpIsActive()){
            this.editor.markUp();
        }
        window.event.returnValue= false;
    }
    if((a == 45)&&(event.ctrlKey))//添加转写结果
    {   
        if(this.editor.insertIsActive()){
            $('.on').click();
        }
        else{
            $('.off').click();
        }
        window.event.returnValue= false; 
    }
    if(a > 111 && a < 124)//热词
    {
        var index = a-112;
        $(`.hot-word-item:eq(${index})`).click();
        window.event.returnValue= false; 
    }
    if((a == 80) && (event.ctrlKey))//加粗
    {
        this.editor.blod();
        window.event.returnValue= false; 
    } 
    
};

HotKeyAbs.prototype.documentClick = function(){
    var a = window.event.keyCode;  
    if((a == 9)&&(event.ctrlKey))//全文记录以及摘要记录切换
    {  
        $('.tab-wrapper span:not(.active)').click();
        window.event.returnValue= false; 
    }
    /*if((a == 79)&&(event.ctrlKey))//开庭
    {
        $('.open-court:not(.end)').click();
        window.event.returnValue= false; 
    }
    if((a == 69)&&(event.ctrlKey))//闭庭
    {
        $('.open-court.end').click();
        window.event.returnValue= false; 
    }*/
    if((a == 70)&&(event.ctrlKey))//搜索
    {
        $('.open').click();
        window.event.returnValue= false; 
    }
    if((a == 83)&&(event.ctrlKey))//导出
    {
        $('.export').click();
        window.event.returnValue= false; 
    } 
    /*if((a == 83)&&(event.ctrlKey))//播报停止
    {
        $('.sound').click();
        window.event.returnValue= false; 
    }*/
    if(a == 8 
    && event.srcElement.tagName != "INPUT" 
    && event.srcElement.tagName != "TEXTAREA" 
    && event.srcElement.className.indexOf('edui-body-container') == -1
    && event.srcElement.type != "text")//禁止backspace回到上一个页面
    { 
        window.event.returnValue= false; 
    }

};

HotKeyAbs.prototype.listen = function (that) {

    $(that.editor.UMeditor.body).on('keydown',() => {
        that.editorClick();
    })

    $(document).on('keydown',() => {
        that.documentClick();
    })

}

