/**
 * @description define the mic action.
 *
 * @author ttwang3
 *
 * @constructor mic.init
 */

var MicList = function () {
    this.$ = {
        eventTargetDom : '',
        wrapper : $('.record-mic')
    };
    this.micMap = new Map();
    this.tpl = '{@each list as item}<div id="mic_${item.id}" class="mic-item"> <i class="records-icon-style"></i> <span title="${item.name}">${item.name}</span> <input class="mic-item-inp none" maxlength="10"> </div>{@/each}'; 
    this.render();
    this.listen(this);
};

MicList.prototype = {
    //获取麦克风配置
    render : function(){
        var that = this;        
        //麦克风配置
        dao.getChannel((data) => {
            if(data.length < 13){
                this.$.wrapper.addClass('column');
                $('.record-mic-open').addClass('column');
            }else if(data.length > 24){
                dialogUtil.showTip('麦克风配置最多24个，多余配置无效',true)
            }
            data.forEach(function(m,j){
                if(j < 24){
                    that.micMap.set(m.micId,{
                        name:m.micName,
                        isMute:false
                    });
                }
            });
            var micArray = [];
            for(var [key,value] of that.micMap){
                micArray.push({id:key,name:value.name});
            }
            this.$.wrapper.html(juicer(this.tpl,{list:micArray}));
        },(status) => {
            dialogUtil.showTip('获取麦克风配置失败',true)
        });
    },

    //设置当前事件DOM
    setEventTargetDom : function(eventTargetDom) {
        return this.$.eventTargetDom = $(eventTargetDom)
    },

    //修改麦克风名称
    editMic : function(){
        var input = $('.mic-item span.none').next();
        var value = input.val().trim();
        var key = input.parent().attr('id').split('_')[1];
        var message = validate.checkMic(value,this.micMap,key);
        if(message){
            dialogUtil.showTip(message,true);
            input.focus();
            return false;
        }
        input.addClass('none');
        input.prev().text(value).removeClass('none').attr('title',value);
        var isMute = this.micMap.get(key).isMute;
        this.micMap.set(key,{'name':value,'isMute':isMute});
        var channelData = [];
        for(var [key,value] of this.micMap){
            channelData.push({
                "micId":key,
                "micName":value.name,
                "courtId":dao.config.courtId
            });
        }
        dao.setChannel(channelData,(data) => {
        },(status) => dialogUtil.showTip('设置保存失败'))
        return true;
    },

    //设为静音
    muteMic : function(){
        this.$.eventTargetDom.addClass('mute');
        var key = this.$.eventTargetDom.attr('id').split('_')[1];
        this.micMap.get(key).isMute = true;
    },

    //取消静音
    cancelMuteMic : function(){
        this.$.eventTargetDom.removeClass('mute');
        var key = this.$.eventTargetDom.attr('id').split('_')[1];
        this.micMap.get(key).isMute = false;
    },

    //创建菜单
    createMenu : function(){
        var gui = require('nw.gui');
        var win = gui.Window.get();

        var that = this;
        var menu = new gui.Menu();
        var menuItemEditMic = new gui.MenuItem({
            label: '修改麦名称',
            click: () => {
                this.$.eventTargetDom.find('span').trigger('dblclick');
            }
        })
        menu.append(menuItemEditMic);

        return menu;
    },
    //是否已经为静音
    micIsMute : function(item){
        var that = this;
        var isMute = false;
        if(item.hasClass('mute')){
            isMute = true;
        }
        return isMute;
    },

    listen: function (that) {

        //修改麦克风
        that.$.wrapper.delegate('.mic-item span','dblclick',function(){
            if($('.mic-item span.none').length && !that.editMic()){
                return
            }
            $(this).addClass('none');
            $(this).next().removeClass('none').val($(this).text().trim());
            setTimeout(() => $(this).next().focus())
        });

        //保存麦克风名称修改
        $(document).on('click',function(ev) {
            var target = ev.target;
            if(target.tagName !== 'INPUT' 
                && target.className !== 'mic-item-inp' 
                && $('.mic-item span.none').length){
                that.editMic();
            }
        });


        that.$.wrapper.delegate('.mic-item-inp','keydown',function(ev){
            if(ev.keyCode == 13)//全文记录以及摘要记录切换
            {  
                that.editMic();
            }
        });

        var micMenu = that.createMenu();
        //麦克风设置菜单
        that.$.wrapper[0].addEventListener('contextmenu', function (ev) {
            var $target = $(ev.target);
            //麦克风菜单
            if($target.hasClass('mic-item') 
                || $target.parent().hasClass('mic-item')){
                ev.preventDefault();
                that.setEventTargetDom($target.hasClass('mic-item') ? ev.target : ev.target.parentNode);
                var isMute = that.micIsMute(that.$.eventTargetDom);
                var menuItem = new gui.MenuItem({
                    label: '设为静音',
                    click: () => that.muteMic()
                })
                var menuItemCancelMute = new gui.MenuItem({
                    label: '取消静音',
                    click: () => that.cancelMuteMic()
                })
                if(micMenu.items.length == 2){
                    micMenu.removeAt(0) 
                }
                if(isMute){
                    micMenu.insert(menuItemCancelMute, 0)
                }else{
                    micMenu.insert(menuItem, 0)
                }
                micMenu.popup(ev.x, ev.y);
            }
            return false;
        });

    }

}