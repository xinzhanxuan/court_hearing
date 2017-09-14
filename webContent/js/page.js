/**
 * @description define the page action.
 *
 * @author ttwang3
 *
 * @constructor page.init
 */

var Page = function (object) {
    this.object = object;
    this.listen(this);
};

Page.prototype = {

    render : function(){
        var html = '<span class="text-button tofirst">首 页</span><span class="text-button prev">上一页</span>';
        if(this.object.page.totalPage <= 5){
            for(var i = 1; i<=this.object.page.totalPage; i++){
                if(i === this.object.page.pageNum){
                    html += '<span class="page-num current">'+i+'</span>'
                }else{
                    html += '<span class="page-num">'+i+'</span>'
                }
                
            }
        }
        else if(this.object.page.pageNum <= 3){
            for(var i = 1; i<=3; i++){
                if(i === this.object.page.pageNum){
                    html += '<span class="page-num current">'+i+'</span>'
                }else{
                    html += '<span class="page-num">'+i+'</span>'
                }
                
            }
            html += '<span class="suspension">...</span>';
            html += '<span class="page-num">'+this.object.page.totalPage+'</span>';
        }else if(this.object.page.totalPage - this.object.page.pageNum <= 2){
            html += '<span class="page-num">1</span>';
            html += '<span class="suspension">...</span>';
            for(var i = this.object.page.totalPage-2; i<=this.object.page.totalPage; i++){
                if(i === this.object.page.pageNum){
                    html += '<span class="page-num current">'+i+'</span>'
                }else{
                    html += '<span class="page-num">'+i+'</span>'
                }
            }
        }else{
            html += '<span class="page-num">1</span>';
            html += '<span class="suspension">...</span>';
            html += '<span class="page-num current">'+this.object.page.pageNum+'</span>';
            html += '<span class="suspension">...</span>';
            html += '<span class="page-num">'+this.object.page.totalPage+'</span>';
        }
        html += '<span class="text-button next">下一页</span><span class="text-button tolast">尾 页</span>';
        this.object.$.pageWrapper.html(html);
    },

    listen: function (that) {
        //第一页
        this.object.$.pageWrapper.delegate('.tofirst','click',() => {
            if(this.object.page.pageNum === 1){
                return
            }else{
                this.object.getPageData(1,this);
            }
            
        });

        //上一页
        this.object.$.pageWrapper.delegate('.prev','click',() => {
            if(this.object.page.pageNum === 1){
                return
            }else{
                var pageNum = this.object.page.pageNum-1;
                this.object.getPageData(pageNum,this);
            }
            
        });

        //下一页
        this.object.$.pageWrapper.delegate('.next','click',() => {

            if(this.object.page.pageNum === this.object.page.totalPage){
                return
            }else{
                var pageNum = this.object.page.pageNum+1;
                this.object.getPageData(pageNum,this);
            }
            
        });

        //最后一页
        this.object.$.pageWrapper.delegate('.tolast','click',() => {
            if(this.object.page.pageNum === this.object.page.totalPage){
                return
            }else{
                this.object.getPageData(this.object.page.totalPage,this);
            }
            
        });

        //点击页码
        this.object.$.pageWrapper.delegate('.page-num','click',function(){
            var pageNum = $(this).text()*1;
            if(that.object.page.pageNum === pageNum){
                return
            }else{
                that.object.getPageData(pageNum,that);
            }
            
        });
    }

}