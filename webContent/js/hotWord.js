/**
 * @description define the hotWord action.
 *
 * @author ttwang3
 *
 * @constructor hotWord.init
 */
var gui = require('nw.gui');
var win = gui.Window.get();

var HotWord = function (isCrash) {
    this.$ = {
        eventTargetDom : '',
        wrapper : $('.right-tab-item.hot-word ul'),
        inputComfire : $('.hot-word-inp-icon'),
        input : $('.hot-word-inp')
    };
    this.itemTpl = '<li class="hot-word-item"> <span title="${item.text}">${item.text}</span> <input class="hot-word-item-inp none">{@if item.key}<i>${item.key}</i>{@/if}</li>';
    this.tpl = '{@each list as item}' + this.itemTpl + '{@/each}'; 
    this.eventPosition = {};
    this.data = {
        list:[]
    };
    this.defaultWords = keyWords.research.concat(keyWords.debate,keyWords.state,keyWords.adjudge);
    this.addDefaultWords = this.defaultWords.slice(0);
    if(isCrash){
        this.data = JSON.parse(util.getLocalItem('hotWord'));
        this.addDefaultWords = JSON.parse(util.getLocalItem('addDefaultWords'));
        var s = this.addDefaultWords.join(',') + ',' + util.convertHotWordToString(this.data.list);
        dao.updateHotWord(s, _ => { }, _ => { });
    }else{
        dao.updateHotWord(this.defaultWords.join(','), _ =>{ }, _ => { });
    }
    this.render();
    this.listen(this);
};

HotWord.prototype = {

    render : function(){
        this.data.list = this.data.list.map(function(item,index){
            if(index < 12){
                var i = index+1;
                item.key = 'F'+i;
            }
            return item;
        });
        this.$.wrapper.html(juicer(this.tpl, this.data));
        //保证异常恢复
        util.setLocalItem('hotWord',JSON.stringify(this.data));
        util.setLocalItem('addDefaultWords',JSON.stringify(this.addDefaultWords));
    },

    //设置当前事件DOM
    setEventTargetDom : function(eventTargetDom) {
        return this.$.eventTargetDom = $(eventTargetDom)
    },
    //设置当前事件DOM
    setEventPosition : function(position) {
        return this.eventPosition = position;
    },

    //isfromEditer 是否来自编辑器添加
    addHotWord : function(text,hotword,isfromEditer){
        var message = validate.checkHotword(text.trim(),this.data.list,-1);
        if(message){
            dialogUtil.showTip(message,true);
            return;
        }
        if(text.trim()){
            var updateData = this.data.list.slice(0);
            updateData.push({
                text:text,
            });
            var index = this.addDefaultWords.indexOf(text);
            if(index > -1){
                this.addDefaultWords.splice(index,1);
            }

            var s = this.addDefaultWords.join(',')  + ',' + util.convertHotWordToString(updateData);

            dao.updateHotWord(s,(result)=>{
                this.data.list = updateData;
                //获取结束点坐标
                if(isfromEditer){
                    var endOffset = $('.right-tab-item.hot-word').offset();
                    if($('.hot-word-item:last-child').length){
                        endOffset = $('.hot-word-item:last-child').offset();
                        var inputOffset = $('.hot-word-inp').offset();
                        if(inputOffset.top < endOffset.top){
                            endOffset.top = inputOffset.top-20;
                        }
                    }
                    var flyer = $('<div class="u-flyer"></div>');
                    flyer.fly({
                        start: {
                            left: this.eventPosition.x,
                            top: this.eventPosition.y
                        },
                        end: {
                            left: endOffset.left+20,
                            top: endOffset.top+33,
                            width: 15,
                            height: 15
                        },
                        onEnd: function(){
                            this.destroy();
                            hotword.render();
                            $('.hot-word-item:last-child').addClass('active');
                            setTimeout(() => {
                                $('.hot-word-item:last-child').removeClass('active');
                            },200)
                        }
                    });
                }else{
                    this.render();
                }
            },(status)=>dialogUtil.showTip(status,true));
        }
        this.$.input.val('');
    },

    deleteHotWord : function(){
        var updateData = this.data.list.slice(0);
        var index = $(".hot-word-item").index(this.$.eventTargetDom);
        var indexOfDefault = this.defaultWords.indexOf(updateData[index].text);
        if(indexOfDefault > -1){
            this.addDefaultWords.push(updateData[index].text);
        };
        updateData.splice(index,1);
        var s = this.addDefaultWords.join(',') + ',' + util.convertHotWordToString(updateData);
        dao.updateHotWord(s,(result)=>{
            this.$.eventTargetDom.remove();
            this.data.list = updateData;
            this.render();
        },(status)=>dialogUtil.showTip(status,true));
    },

    //热词编辑
    editHotWord : function(value){
        var index = $(".hot-word-item ").index($('.hot-word-item-inp:not(.none)').parent());
        var message = validate.checkHotword(value.trim(),this.data.list,index);
        if(message){
            dialogUtil.showTip(message,true);
            return;
        }
        var indexOfDefault = this.defaultWords.indexOf(this.data.list[index].text);
        if(indexOfDefault > -1){
            this.addDefaultWords.push(this.data.list[index].text);
        }
        var indexOfAddDefaultWords = this.addDefaultWords.indexOf(value);
        if(indexOfAddDefaultWords > -1){
            this.addDefaultWords.splice(indexOfAddDefaultWords,1);
        }
        var updateData = this.data.list.slice(0);
        updateData[index].text = value;
        var s = this.addDefaultWords.join(',') + ',' +util.convertHotWordToString(updateData);
        dao.updateHotWord(s,(result)=>{
            this.data.list = updateData;
            this.render();
        },(status)=>dialogUtil.showTip(status,true));
    },

    //创建菜单
    createMenu : function(){
        var that = this;
        var menu = new gui.Menu();
        var menuItem = new gui.MenuItem({
            label: '删除',
            click: () => this.deleteHotWord()
        })
        var menuItemEdit = new gui.MenuItem({
            label: '编辑',
            click: () => {
                if($('.hot-word-item-inp:not(.none)').length){
                    dialogUtil.showTip('请完成热词编辑',true);
                    return
                }
                var span = this.$.eventTargetDom.find('span');
                var inp = span.next();
                span.hide();
                inp.removeClass('none').val(span.text());
            }
        })
        menu.append(menuItemEdit);
        menu.append(menuItem);

        return menu;
    },

    listen: function (that) {
        //输入确定
        that.$.inputComfire.on('click',function(){
            var value = that.$.input.val();
            that.addHotWord(value);
        });

        $(document).on('keydown',(ev) => {
            var a = window.event.keyCode;
            if(a == 13 && ev.target.className == 'hot-word-inp'){
                var value = that.$.input.val();
                that.addHotWord(value);
            }
            if(a == 13 && ev.target.className == 'hot-word-item-inp'){
                var value = $(ev.target).val();
                that.editHotWord(value);
            }
        });

        $(document).on('click',(ev) => {
            if(ev.target != $('.hot-word-item-inp:not(.none)')[0]
                && $('.hot-word-item-inp:not(.none)').length){
                var value = $('.hot-word-item-inp:not(.none)').val().trim();
                if(!value.length){
                    $('.hot-word-item-inp:not(.none)').focus();
                }else{
                    that.editHotWord(value);
                }
            }
        })

        //输入框停止冒泡
        $('.right-tab-item.hot-word ul').delegate('.hot-word-item-inp','click', function(e){
            e.stopPropagation();
        });

    }

}