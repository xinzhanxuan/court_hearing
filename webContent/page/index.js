var version = '3.2.0';
var currentVersion = util.getLocalItem('version');
if(currentVersion !== version){
    util.clearLocal();
    util.setLocalItem('version',version);
};
var toolBar = new ToolBar();
var gui = require('nw.gui');
var win = gui.Window.get();

var caseId = "";//案件ID

var innerFunction = {

	//案件查询
	searchCase : function(caseName){
		dao.searchCaseByName(caseName,data =>{
			util.setLocalItem('caseName',caseName);
			$('.infor-wrapper').removeClass('none');
            if ($.isPlainObject(data)) {
                if (data.caseInfoId === '-1') {
                    data = [ ];
                }
                else {
                    data = [ data ];
                }
            }
            if(data.length){
                $('#case_cause').html('') && data[0].caseCause && $('#case_cause').html(`<span>案由：</span>${data[0].caseCause}`);
                $('#case_no').html('') && data[0].caseNo && $('#case_no').html(`<span>案号：</span>${data[0].caseNo}`);
                $('#case_party').html('') && data[0].caseParty && $('#case_party').html(`<span>当事人：</span>${data[0].caseParty}`);
                $('#judge').html('') && data[0].judge && $('#judge').html(`<span>审判长：</span>${data[0].judge}`);
                $('#collegiate_bench_member').html('') && data[0].collegiateBenchMember && $('#collegiate_bench_member').html(`<span>合议庭成员：</span>${data[0].collegiateBenchMember}`);
                $('#clerk').html('') && data[0].clerk && $('#clerk').html(`<span>书记员：</span>${data[0].clerk}`);
            	$('.infor').show();
            	$('.infor-empty-tip').hide();
            	caseId = data[0].caseInfoId;
            	util.setLocalItem('ajxxId',caseId);
            }else{
                //系统没有资料
                caseId = '';
                util.setLocalItem('ajxxId',caseId);
                $('.infor').hide();
            	$('.infor-empty-tip').html('在本系统中未查到“'+ caseName +'”案件信息，</br>请点击“新建开庭”进入庭审').show();
            }
        },status => {
            dialogUtil.showTip('案件查询失败',true);
        })
	},

	//开始审理
	caseHear : function(){

		var caseName = util.getLocalItem('caseName');//案件名称
		var searchParam = caseId ? caseId : caseName;
		var searchType = caseId ? 0 : 1;//1为没有案件

        dao.caseBegin(searchType, searchParam, data => {
            //案件正在审理中
            if(data.status){
                dialogUtil.showTip('案件正在审理中',true);
                return;
            }
            dao.clearHotWord(_ => {
                util.setLocalItem('fileCount',0);
                if(searchType){//没有案件，新生成一个
                	util.setLocalItem('ajxxId',data.caseInfoId);
                    window.location.href = './html/records.html';
                }else{
                	dao.getCaseFileNum(caseId,rep =>{
                        util.setLocalItem('fileCount',rep);
                        window.location.href = './html/records.html';
                    } ,status => {
                        dialogUtil.showTip('案件资料查询失败',true);
                        setTimeout(function(){
                            window.location.href = './html/records.html';
                        },1000);
                    });
                }
            });
            
        },status => {
            dialogUtil.showTip('案件开启失败',true);
            setTimeout(function(){
            	window.location.href = './html/records.html';
            },1000);
            
        })
	}
};

var innerEvent = function(){

    //初始化
    //dao.generateConsumer();
	//查询按钮
	$('.search-case').on('click',function(){
        var searchContent = $('.case-inp').val().trim();
        if(!searchContent.length){
        	dialogUtil.showTip('案件号不能为空',true);
        	return;
        }
        else if(!(/^([^\/\\:*?"<>,#|%;]+)$/.test(searchContent))){
        	
        	dialogUtil.showTip('案件号不能为"\/:*?""<>|%;"特殊符号',true);
        }
        else{
        	innerFunction.searchCase(searchContent);
        }
        	
    })

    $('.case-inp').on('keydown',(ev) => {
        if(ev.keyCode == 13)//全文记录以及摘要记录切换
        {  
            $('.search-case').trigger('click');
        }
    })

	//下一步
    $('.patch-next').on('click',function(){
    	innerFunction.caseHear();
    })
};

innerEvent();

if(window && window.localStorage){
    var isCrash = util.getLocalItem('isCrash')*1;
    if(isCrash){
        dialogUtil.crashRecoverTip();
    }
}

onload = function() {
    win.show();
}

