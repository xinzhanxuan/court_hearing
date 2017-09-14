/**
 * @description define the hotWord action.
 *
 * @author ttwang3
 *
 * @constructor hotWord.init
 */

var HotKeyFull = function (editer) {
    this.editor = editer;
    this.listen(this);
};

HotKeyFull.prototype = new HotKey();

HotKeyFull.prototype.editorClick = function(){
    var a = window.event.keyCode;
    if(a > 111 && a < 124)//热词
    {
        var index = a-112;
        $(`.hot-word-item:eq(${index})`).click();
        window.event.returnValue= false; 
    }
};

HotKeyFull.prototype.listen =  function (that) {

    $(that.editor.UMeditor.body).on('keydown',() => {
        that.editorClick();
    })

};
