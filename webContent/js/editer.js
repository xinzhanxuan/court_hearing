/**
 * @description define the editer action.
 *
 * @author ttwang3
 *
 * @constructor editer.init
 */
var gui = require('nw.gui');
var win = gui.Window.get();
var ref = require('ref');
var ffi = require('ffi');
var _ = require('lodash');

//模糊搜索初始化
var charStr = ref.refType('char');
var searchReplaceLibrary = ffi.Library('fuzzymatchnode', {
    'FuzzyMatchNodeInitialize': ['int', []],
    'FuzzyMatchNodeProcess': [charStr, ['string', 'string']],
    'FuzzyMatchNodeUninitialize': ['int', []]
});
var ret = -1;

var transIconTpl = '<img class="trans-icon" src="../images/trans.png">'; //转写标签

var Editer = function(wrapper, um, mic, hotWord, editerPages, searchReplace, audio) {
    this.$ = {
        wrapper: wrapper
    }
    this.pages = editerPages; //页数
    this.searchReplace = searchReplace;
    this.audio = audio;
    this.UMeditor = um;
    this.mic = mic;
    this.id = ""; //上一次插入的位置
    this.markUpSize = this.UMeditor.$body.find('font.red').length;
    this.startBlockNode = ""; //上次插入的block节点
    this.hotWord = hotWord;
    this.preLineId = ""; //为了手动删除说话人，不换行
    this.markUpNode = ""; //当前标记的点
    this.transIsStop = false;
    this.listen(this);
}

var punc = ['，', '。', '？', '！'];

Editer.prototype = {

    //插入转写
    appendTransContent: function(data) {
        var that = this;
        var timestamp = new Date().getTime();

        //麦克风配置，说话人名称
        var name = this.mic.micMap.get(data.lineId) ? this.mic.micMap.get(data.lineId).name : '';
        //移除vad底色
        this.UMeditor.$body.find('.bg-orign').removeClass('bg-orign');
        //转写标签
        var transIcon = this.UMeditor.$body.find('.trans-icon');
        transIcon.prev(':not(br,.speaker)').addClass('bg-orign');
        //ctrl+z重置当前段落,禁止span插入
        if(transIcon.length) {
            this.startBlockNode = transIcon.parents('p');
            if(!this.startBlockNode.length) {
                this.resetStartBlockNode(transIcon);
                transIcon = this.UMeditor.$body.find('.trans-icon');
            }
        };
        //判断当前段落是否有数据
        var html = this.startBlockNode.html();
        var text = html.replace(/<img class="trans-icon" src="..\/images\/trans.png"( style="text-indent: 2em;")*>|&nbsp;/g, "").trim();
        var textLast = text.charAt(text.length - 1);

        //上一段落
        var prev = this.startBlockNode.prev();
        //上一段落说话人
        var prevName = this.getSpeaker(prev);
        //当前段落说话人
        var presentName = this.getSpeaker(this.startBlockNode);
        // 符号处理
        data.text = _.isString(data.text) ? data.text : '';
        // mod by bqliu
        var dealWithPunc = function(text, isLast) {
                var mtd = _.first,
                    start = 1,
                    end = Number.Infinity;
                if(isLast) {
                    mtd = _.last;
                    start = 0;
                    end = -1;
                }

                var pChar = mtd.call(_, data.text);
                return _.indexOf(punc, pChar) !== -1 ? text.slice(start, end) : text;
            }
            // 当前段落没有数据
        if(!text.replace(/<br>/g, "")) {
            // 与上一段落说话人不同，当前段落添加说话人
            if(prevName !== name || !prev.length) {
                // 去除前面的符号
                data.text = dealWithPunc(data.text);
            } else {
                // 这种情况不确定
            }
        }
        // 当前段落有数据，说话人不变不换行 
        else if(that.preLineId == data.lineId || presentName == name) {
            // 这种情况不改变符号
        }
        // 换说话人并且当前段落有数据换行
        else {
            // 先去除第一个符号
            data.text = dealWithPunc(data.text);
            // 这种情况在下面处理
        }

        //待插入的字符串
        var newSpan = `<span class="bg-orign" data-bg="${data.beginTime}" data-ed="${data.endTime}" id="${timestamp}">${data.text}</span>`;
        //待插入说话人
        var newSpeaker = name ? `<strong class="speaker">${name}</strong>：` : `<strong class="speaker">待定</strong>：`;

        //当前段落没有数据
        if(!text.replace(/<br>/g, "")) {
            //与上一段落说话人不同，当前段落添加说话人
            if(prevName !== name || (prevName == name && prevName == '')) {
                transIcon.before(`${newSpeaker}${newSpan}`);
            } else { //与上一段落说话人相同,接着上一段落转写
                this.startBlockNode.remove();
                transIcon.remove();
                this.startBlockNode = prev;
                this.startBlockNode.append(newSpan);
                this.startBlockNode.append(transIconTpl);
            }
            if(this.esc) {
                this.scrollEditer(this.startBlockNode.offset().top);
            }
        } //当前段落有数据，说话人不变不换行 
        else if(that.preLineId == data.lineId || (presentName == name && presentName != '')) {
            transIcon.before(newSpan);
            if(this.esc) {
                this.scrollEditer(transIcon.offset().top);
            }
        } else { //换说话人并且当前段落有数据换行
            this.UMeditor.$body.find('.trans-icon').remove();
            // if(_.startsWith(data.text, '，') || _.startsWith(data.text, '。')){
            //     data.text = data.text.slice(1);
            // }
            var prevText = this.startBlockNode.text().trim();
            // 句号问号感叹号不需要添加标点，其它情况均改为。
            if(!_.endsWith(prevText, '。') &&
                !_.endsWith(prevText, '，') &&
                !_.endsWith(prevText, '？')
                // && !_.endsWith(prevText, '：')
                &&
                !_.endsWith(prevText, '！')) {
                var $lastSpan = this.startBlockNode.find('span').last();
                $lastSpan.text($lastSpan.text() + '。');
                // this.startBlockNode.append('。');
            } else if(_.endsWith(prevText, '，')) {
                var $lastSpan = this.startBlockNode.find('span').last();
                $lastSpan.text($lastSpan.text().slice(0, -1) + '。');
            }
            //当前段落后另起段落
            this.startBlockNode.after(`<p>${newSpeaker}${newSpan}${transIconTpl}</p>`);
            this.startBlockNode = this.startBlockNode.next();
            if(this.esc) {
                this.scrollEditer(this.startBlockNode.offset().top);
            }
        }
        //特殊情况（出现两个转写标签移除一个）
        if(this.UMeditor.$body.find('.trans-icon').length > 1) {
            this.UMeditor.$body.find('.trans-icon:first').remove();
        }
        this.UMeditor.fireEvent('saveScene');
        this.id = timestamp;
        //设置上一次说话人
        this.preLineId = data.lineId;
    },

    //静音时只出现说话人
    appendTransContentMute: function(data) {
        var that = this;

        //麦克风配置，说话人名称
        var name = this.mic.micMap.get(data.lineId) ? this.mic.micMap.get(data.lineId).name : '';
        //转写标签
        var transIcon = this.UMeditor.$body.find('.trans-icon');
        //ctrl+z重置当前段落,禁止span插入
        if(transIcon.length) {
            this.startBlockNode = transIcon.parents('p');
            if(!this.startBlockNode.length) {
                this.resetStartBlockNode(transIcon);
                transIcon = this.UMeditor.$body.find('.trans-icon');
            }
        };
        //判断当前段落是否有数据
        var html = this.startBlockNode.html();
        var text = html.replace(/<img class="trans-icon" src="..\/images\/trans.png"( style="text-indent: 2em;")*>|&nbsp;/g, "").trim();
        //上一段落
        var prev = this.startBlockNode.prev();
        //上一段落说话人
        var prevName = this.getSpeaker(prev);
        //当前段落说话人
        var presentName = this.getSpeaker(this.startBlockNode);
        //待插入说话人
        var newSpeaker = name ? `<strong class="speaker">${name}</strong>：` : `<strong class="speaker">待定</strong>：`;
        //当前段落没有数据
        if(!text.replace(/<br>/g, "")) {
            //与上一段落说话人不同，当前段落添加说话人
            if(prevName !== name || (prevName == name && prevName == '')) {
                transIcon.before(`${newSpeaker}&nbsp;&nbsp;`);
            }
        } //当前段落有数据，换说话人并且当前段落有数据换行
        else if(that.preLineId != data.lineId && presentName !== name) {
            this.UMeditor.$body.find('.trans-icon').remove();
            //当前段落后另起段落
            this.startBlockNode.after(`<p>${newSpeaker}&nbsp;&nbsp;${transIconTpl}</p>`);
            this.startBlockNode = this.startBlockNode.next();
        }
        //特殊情况（出现两个转写标签移除一个）
        if(this.UMeditor.$body.find('.trans-icon').length > 1) {
            this.UMeditor.$body.find('.trans-icon:first').remove();
        }
        this.UMeditor.fireEvent('saveScene');
        //设置上一次说话人
        this.preLineId = data.lineId;
    },

    //编辑器滚动
    scrollEditer: function(height) {
        if(height === 400) {
            return
        }
        var scrollBody = $(this.UMeditor.body).parents('.record-top');
        if(window.config.versionType == 'win7') {
            scrollBody = $(this.UMeditor.body).parents('.record-content');
        }
        var st = scrollBody.scrollTop();
        this.esc = false;
        scrollBody.animate({
            scrollTop: st + height - 400
        }, 800, () => {
            this.esc = true;
        });
    },

    //判断含有说话人
    hasSpeakerInP: function(p) {
        var hasSpeaker = false;
        if(p.find('strong.speaker').length) {
            hasSpeaker = true
        } else {
            var b = p.find('b')[0];
            if(b && b.nextSibling && b.nextSibling.data && b.nextSibling.data.indexOf('：') == 0) {
                hasSpeaker = true
            }
        }
        return hasSpeaker;
    },

    //判断节点是否是说话人
    isSpeaker: function(node) {
        var isSpeaker = false;
        if((node.nodeName == 'STRONG' &&
                node.className &&
                node.className.indexOf('speaker') > -1) ||
            (node.nodeName == 'B' &&
                node.nextSibling &&
                node.nextSibling.data &&
                node.nextSibling.data.indexOf('：') == 0)) {
            isSpeaker = true;
        }
        return isSpeaker;
    },

    //获取段落的说话人
    getSpeaker: function(node) {
        var nameWrap = node.find('strong.speaker');
        var b = node.find('b')[0];
        var speakerName = nameWrap.length ? nameWrap[0].innerText : "";
        if(!speakerName && b) {
            if(b.nextSibling && b.nextSibling.data && b.nextSibling.data.indexOf('：') == 0) {
                speakerName = b.innerText;
            }
        }
        return speakerName;
    },

    //因为当前插入位置不在P标签内部,重置插入段落
    resetStartBlockNode: function(transIcon) {
        transIcon.before('<p></p>');
        var beforeP = transIcon.prev();
        transIcon.remove();
        beforeP.append(transIconTpl);
        this.startBlockNode = beforeP;
    },

    //获取当前range的text
    getText: function() {
        var rng = this.UMeditor.selection.getRange();
        rng.select();
        var txt = this.UMeditor.selection.getText();
        if(rng.endContainer === rng.startContainer && rng.startContainer.data && !rng.startContainer.data.replace(/\u200B/g, "").length) {
            rng.startContainer.parentNode.removeChild(rng.startContainer);
        }
        return txt;
    },

    //选中标记
    markUp: function() {
        var that = this;
        var rng = that.UMeditor.selection.getRange();
        var p = rng.startContainer;
        rng.setStart(rng.startContainer, rng.startOffset - 1);
        rng.setEnd(rng.startContainer, rng.startOffset + 2);
        rng.select();
        var txt = that.UMeditor.selection.getText();
        rng.deleteContents();
        var bg = $(that.markUpNode).data('bg');
        var ed = $(that.markUpNode).data('ed');
        var value = `<font class="red" data-bg="${bg}" data-ed="${ed}">${txt}</font>`;
        that.UMeditor.execCommand('insertHtml', value);
        that.markUpSize++;
    },

    //添加到热词
    addHotWord: function() {
        var isfromEditer = true;
        this.hotWord.addHotWord(this.getText(), this.hotWord, isfromEditer);
    },
    //黑体 
    blod: function() {
        var that = this;
        var txt = that.getText();
        var value = `<strong class="speaker">${txt}</strong>`;
        that.UMeditor.execCommand('insertHtml', value);
    },

    //是否可以打点
    markUpIsActive: function() {
        var that = this;
        var isActive = false;
        //开庭可以打点
        if($('.open-court').hasClass('disable') &&
            !$('.close-court').hasClass('disable')) {
            var rng = that.UMeditor.selection.getRange();
            rng.collapse(true);
            var p = rng.startContainer.parentNode;
            if(that.isSpeaker(p)) {
                return isActive;
            }
            if(p.nodeName == 'SPAN' && $(p).data('bg')) {
                isActive = true;
                that.markUpNode = p;
            } else {
                $(p).parents('span').each(function(index, item) {
                    if($(item).data('bg')) {
                        isActive = true;
                        that.markUpNode = item;
                    }
                });
            }
        }
        return isActive;
    },

    //是否可以设置样式
    setStyleIsActive: function() {
        var unActive = false;
        var rng = this.UMeditor.selection.getRange();
        var node = rng.getCommonAncestor();
        if(rng.endContainer.nextElementSibling && rng.endContainer.nextElementSibling.nodeName == 'BR') {
            UM.dom.domUtils.remove(rng.endContainer.nextElementSibling);
        }
        if(node.nodeName == '#text') {
            node = node.parentNode;
        }
        if(node.nodeName == 'DIV') {
            rng.traversal((node) => {
                unActive = unActive || this.hasTransText(node);
            });
        } else {
            unActive = this.hasTransText(node);
        }
        return !unActive;
    },

    //选中文本中是否有转写文本
    hasTransText: function(node) {
        var hasTransText = false;
        //段落
        if(node.nodeName == 'P') {
            if(node.className.indexOf('grey-bg') !== -1) {
                return true;
            } else {
                $(node).find('span').each(function(index, item) {
                    if($(item).data('bg')) {
                        hasTransText = true;
                    }
                });
            }
        } else if(this.isSpeaker(node)) { //说话人
            return true;
        } else if(node.nodeName == 'SPAN' && $(node).data('bg')) { //转写文本
            return true;
        } else {
            $(node).parents('span').each(function(index, item) { //插入文办或打点
                if($(item).data('bg')) {
                    hasTransText = true;
                }
            });
        }
        return hasTransText;
    },

    //是否可以转写
    insertIsActive: function() {
        var that = this;
        var isActive = false;
        if($('.open-court').hasClass('disable') &&
            !$('.close-court').hasClass('disable') &&
            ($('.off').hasClass('active') ||
                ($('.on').hasClass('active') && this.transIsStop))) {
            isActive = true;
        }
        return isActive;
    },

    //是否可以停止转写
    stopInsertIsActive: function() {
        var isActive = false;
        if($('.open-court').hasClass('disable') &&
            $('.on').hasClass('active')) {
            isActive = true;
        }
        return isActive;
    },

    //是否可以添加热词
    addHotWordIsActive: function() {
        var isActive = false;
        if(this.getText()) {
            isActive = true;
        }
        return isActive;
    },

    createNewParagraph: function() {
        this.UMeditor.execCommand('insertHtml', `<p></p>`);
    },

    createMenu: function(type) {
        var that = this;
        var menu = new gui.Menu();
        var menuItem1 = new gui.MenuItem({
            label: '标记打点',
            click: function() {
                that.markUp();
            },
            key: 'Enter',
            modifiers: 'ctrl'
        });
        var menuItem2 = new gui.MenuItem({
            label: '插入转写结果',
            click: function() {
                $('.on').click();
            },
            key: 'Insert',
            modifiers: 'ctrl'
        });
        var menuItem3 = new gui.MenuItem({
            label: '停止插入转写',
            click: function() {
                $('.off').click();
            },
            key: 'Insert',
            modifiers: 'ctrl'
        });
        var menuItem4 = new gui.MenuItem({
            label: '添加到热词',
            click: function() {
                that.addHotWord();
            }
        });
        var menuItem5 = new gui.MenuItem({
            label: '复制',
            click: function() {
                document.execCommand("Copy");
            },
            key: 'c',
            modifiers: 'ctrl'
        });
        var menuItem6 = new gui.MenuItem({
            label: '剪切',
            click: function() {
                document.execCommand("cut");
            },
            key: 'x',
            modifiers: 'ctrl'
        });
        var menuItem7 = new gui.MenuItem({
            label: '粘贴',
            click: function() {
                document.execCommand("Paste");
            },
            key: 'v',
            modifiers: 'ctrl'
        });
        var menuItem8 = new gui.MenuItem({
            label: '插入新段落',
            click: function() {
                that.createNewParagraph();
            }
        });
        if(!type) {
            menu.append(menuItem1);
            menu.append(menuItem2);
            menu.append(menuItem3);
        }
        menu.append(menuItem4);
        menu.append(menuItem5);
        menu.append(menuItem6);
        menu.append(menuItem7);
        //menu.append(menuItem8);
        return menu;
    },

    //快速定位
    anchor: function() {
        if(!this.esc) {
            var icon = $(this.UMeditor.body).find('.trans-icon');
            if(icon.length) {
                this.scrollEditer(icon.offset().top);
            }
        }

    },
    //设置样式
    setStyle: function(style) {
        var rng = this.UMeditor.selection.getRange();
        rng.select().select().select();
        var fragment = rng.cloneContents();
        if(fragment) {
            var node = document.createElement("div");
            node.appendChild(fragment);
            var text = node.innerHTML.replace(/style|class\s*=(['\"\s]?)[^'\"]*?\1/gi, '');
            if(!text.length) {
                return;
            }
            var value = '';
            if(text.match(/<p *>/gi)) {
                value = text.replace(/<p *>/gi, `<p class="clear-empty" style="${style}">`);
            } else {
                value = `<p class="clear-empty" style="${style}">${text}</p>`;
            }
            this.UMeditor.execCommand('insertHtml', value);
            if($('.clear-empty').length) {
                $('.clear-empty').each(function(index, item) {
                    var prevText = $(item).prev().text().replace(/\s+/g, "").replace(/\u200B/g, "");
                    if(!prevText.length) {
                        $(item).prev().remove()
                    }
                    var nextText = $(item).next().text().replace(/\s+/g, "").replace(/\u200B/g, "");
                    if(!nextText.length) {
                        $(item).next().remove()
                    }
                })
            }
            $('.clear-empty').removeAttr('class');
        } else {
            dialogUtil.showTip('内容获取失败，请重新操作', true)
        }
    },

    listen: function(that) {

        //搜索展开收起
        that.$.wrapper.delegate('.open', 'click', function() {
            var $this = $(this);
            if($this.hasClass('up')) {
                $this.parent().prev().removeClass('up');
                setTimeout(function() {
                    $this.removeClass('up');
                    $this.parent().removeClass('up');
                }, 200);

            } else {
                $this.addClass('up');
                $this.parent().addClass('up');
                setTimeout(function() {
                    $this.parent().prev().addClass('up');
                }, 200);
            }
        });

        //查找
        var searchWord = "";
        var lastSearchTime = 0;
        var lastSearchArray = [];
        var oprationType = {
            search: 'search',
            replace: 'replace'
        }; //操作类型
        var lastOprationType = '';

        //把文本切成不同的大小进行搜索，防止被搜索文字正好被切开
        var libSearch = function(findtxt, allText, maxLength, textArray) {
            ret = searchReplaceLibrary.FuzzyMatchNodeInitialize();
            for(var i = 0; i < allText.length; i = i + maxLength) {
                var content = allText.substr(i, maxLength);
                charStr = searchReplaceLibrary.FuzzyMatchNodeProcess(content, findtxt);
                var resultList = JSON.parse(ref.readCString(charStr, 0)).result;
                if(resultList) {
                    for(var item of resultList) {
                        var text = content.substring(item.begin, item.end);
                        if(_.indexOf(textArray, text) == -1) {
                            textArray.push(text);
                        }
                    }
                }
            }
            ret = searchReplaceLibrary.FuzzyMatchNodeUninitialize();
        };

        //获取带搜索数组
        var getSearchArray = function(findtxt, oprationType) {
            var textArray = [];
            var newSearchTime = new Date().getTime();
            if(lastSearchTime != 0 &&
                newSearchTime - lastSearchTime < 60000 &&
                searchWord === findtxt &&
                lastOprationType === oprationType) {
                textArray = lastSearchArray;
            } else {
                var allText = that.UMeditor.getContentTxt();
                libSearch(findtxt, allText, 200, textArray);
                libSearch(findtxt, allText, 175, textArray);
            }
            searchWord = findtxt;
            lastSearchTime = newSearchTime;
            lastSearchArray = textArray;
            lastOprationType = oprationType;
            return textArray;
        };
        
        that.$.wrapper.delegate(".search", 'click', function() {

            var findtxt = $(this).prev().val().replace(/^\s|\s$/g, "");

            var message = validate.checkSearchword(findtxt);
            if(message) {
                dialogUtil.showTip(message, true);
                return;
            }
            var textArray = getSearchArray(findtxt, oprationType.search);
            if(!textArray.length) {
                dialogUtil.showTip('已经搜索到文章末尾', true);
                return false;
            }
            var obj = {
                searchStr: textArray,
                dir: 1,
                casesensitive: false
            };
            if(!that.searchReplace.commandSearch(obj, that.UMeditor)) {
                dialogUtil.showTip('已经搜索到文章末尾', true);
            }
        });

        //替换
        that.$.wrapper.delegate(".replace", 'click', function() {
            var findtxt = $(this).prev().prev().val().replace(/^\s|\s$/g, "");
            var message = validate.checkSearchword(findtxt);
            if(message) {
                dialogUtil.showTip(message, true);
                return;
            }
            var textArray = getSearchArray(findtxt, oprationType.replace);
            var findtxtArray = textArray.filter(
                function(value) {
                    return value !== findtxt && (value.toLowerCase() !== findtxt.toLowerCase());
                }
            );

            if(!findtxtArray.length) {
                //dialogUtil.showTip('已经搜索到文章末尾',true);
                return false;
            }
            var obj = {
                searchStr: findtxtArray,
                dir: 1,
                casesensitive: false,
                replaceStr: findtxt
            };
            that.searchReplace.commandSearch(obj, that.UMeditor);
        });

        //发言人选中
        that.$.wrapper.delegate('p', 'click', function() {
            if($(this).hasClass('grey-bg')) {
                return
            }
            if(that.hasSpeakerInP($(this))) {
                that.$.wrapper.find('.grey-bg').removeClass('grey-bg');
                that.$.wrapper.find('.delete-section').remove();
                that.$.wrapper.find('.play-section').remove();
                $(this).addClass('grey-bg');
                //整段删除
                if((courtOpend && $('.pause-court').hasClass('disable')) ||
                    ($('.open-court').hasClass('disable') && $('.pause-court').hasClass('disable') && $('.close-court').hasClass('disable')) &&
                    that.$.wrapper.attr('id') == 'abstract') {
                    that.$.wrapper.find('.grey-bg').prepend('<em class="delete-section"></em><em class="play-section"></em>');
                } else {
                    that.$.wrapper.find('.grey-bg').prepend('<em class="delete-section"></em>');
                }

            }
        });

        //整段删除
        that.$.wrapper.delegate('.grey-bg .delete-section', 'click', function() {
            var greyBg = $(this).parent('.grey-bg');
            var pre = greyBg.prev();
            var next = greyBg.next();
            var preSpeaker = that.getSpeaker(pre);
            var nextSpeaker = that.getSpeaker(next);
            //前后说话人合并
            if(preSpeaker && (preSpeaker == nextSpeaker)) {
                var nextSibling;
                if(next.find('strong.speaker')[0]) {
                    nextSibling = next.find('strong.speaker')[0].nextSibling;
                } else {
                    nextSibling = next.find('b')[0].nextSibling;
                }
                if(nextSibling &&
                    nextSibling.nodeValue &&
                    _.startsWith(nextSibling.nodeValue, '：')) {
                    nextSibling.nodeValue = nextSibling.nodeValue.substring(1);
                }
                if(next.find('strong.speaker')[0]) {
                    $(next.find('strong.speaker')[0]).remove();
                } else {
                    $(next.find('b')[0]).remove();
                }
                pre.append('<span id="markspan"></span>');
                pre.append(next.html());
                var range = that.UMeditor.selection.getRange();
                range.selectNode($("#markspan")[0]);
                range.setEndAtLast(pre[0]);
                range.select();
                $("#markspan").remove();
                next.remove();
            }
            if(that.$.wrapper.find('.grey-bg .trans-icon').length) {
                that.$.wrapper.find('.grey-bg .trans-icon').remove();
                if(that.transIsStop) {
                    greyBg.before(`<p><img class="trans-icon stop" src="../images/trans.png"/></p>`);
                } else {
                    greyBg.before(`<p>${transIconTpl}</p>`);
                }
                that.startBlockNode = greyBg.prev();
            }
            greyBg.remove();
            if(!that.UMeditor.$body.find('p').length) {
                that.UMeditor.$body.append(`<p> </p>`);
            }
            that.UMeditor.fireEvent('saveScene');
            that.UMeditor.fireEvent('contentChange');
        });

        //整段测听
        that.$.wrapper.delegate('.grey-bg .play-section', 'click', function() {
            var bg = -1;
            var greyBg = $(this).parent('.grey-bg');
            for(var i = 0, l = greyBg.find('span').length; i < l; i++) {
                var span = greyBg.find('span')[i];
                if($(span).data('bg')) {
                    bg = $(span).data('bg') / 100;
                    break;
                }
            }
            if(bg > -1) {
                that.audio.playToTime(bg);
            }

        });

        //整句选中
        /*that.$.wrapper.delegate('span','dblclick',function(event){
            event.stopPropagation();
            var rng = that.UMeditor.selection.getRange();
            rng.setStartAtFirst($(this)[0]);
            rng.setEndAtLast($(this)[0]);
            rng.select();
        });*/

        //标记点击
        that.$.wrapper.delegate('font.red', 'click', function(event) {
            event.stopPropagation();
            var index = that.$.wrapper.find('font.red').index(this);
            $(`.play-mark:eq(${index})`).click();
        });

        //删除文本内容时
        that.UMeditor.addListener('contentChange', function() {
            if(that.$.wrapper.find('font.red').length < that.markUpSize) {
                //删除打点记录
                //              that.audio.renderPlayMark();
            }
            if(that.$.wrapper.find('.grey-bg').length > 1) {
                $(that.$.wrapper.find('.grey-bg')[1]).removeClass('grey-bg');
            }
        });

        //回车换行为br不是p
        $(this.UMeditor.body).on('keydown', () => {
            if(window.event.keyCode == 13 && !event.ctrlKey) //如果在段落结尾换行则为新段落，否则加br
            {
                var isBr = true;
                var rng = this.UMeditor.selection.getRange();
                var endContainer = rng.endContainer;
                var node = '';
                if(endContainer.nodeName == 'P' && endContainer.className == 'grey-bg') {
                    node = endContainer.childNodes[rng.endOffset];
                } else {
                    node = endContainer.nextSibling;
                }
                if(node && this.isSpeaker(node)) {
                    isBr = false;
                }
                if(isBr) {
                    window.event.preventDefault();
                    this.UMeditor.execCommand('insertHtml', '&nbsp;<br>&nbsp;');
                    setTimeout(() => {
                        var rng = this.UMeditor.selection.getRange();
                        var endContainer = rng.endContainer;
                        rng.setStart(endContainer, rng.endOffset - 1);
                        rng.select();
                        rng.deleteContents();
                        rng.setCursor();
                    }, 1)
                    window.event.returnValue = false;
                }
            }

        });

        //esc追随
        $(document).on('keydown', () => {
            if(window.event.keyCode == 27) //ESC追随
            {
                this.anchor();
            } else {
                this.esc = false;
            }
        });

        //esc追随
        that.$.wrapper.delegate('.record-anchor', 'click', () => {
            this.anchor();
        });
        // 移除 为空样式
        var removeContentEmpty = function() {
            this.UMeditor.$body.hasClass('content-empty') && this.UMeditor.$body.removeClass('content-empty');
        }

        this.UMeditor.$body.on('click', _ => {
            that.esc = false;
            removeContentEmpty.call(that);
        });

        // 右击的话也隐藏掉
        this.UMeditor.$body.on('contextmenu', _ => {
            removeContentEmpty.call(that);
        });

        this.UMeditor.$body.on('keyup', () => {
            if(($('.on').hasClass('active') && $(that.UMeditor.body).parents('#abstract').length) ||
                $('.open-court').hasClass('end') && $(that.UMeditor.body).parents('#fulltext').length) {
                if(!$(that.UMeditor.body).find('.trans-icon').length) {
                    that.UMeditor.selection.getRange().collapse().select();
                    if(that.transIsStop) {
                        that.UMeditor.execCommand('insertHtml', '<img class="trans-icon stop" src="../images/trans.png"/>');
                    } else {
                        that.UMeditor.execCommand('insertHtml', '<img class="trans-icon" src="../images/trans.png"/>');
                    }
                    that.UMeditor.fireEvent('saveScene');
                }
            }
        });

        //转写标志点击停止和开启转写
        that.$.wrapper.delegate('.trans-icon', 'click', function(event) {
            event.stopPropagation();
            $(this).toggleClass('stop');
            that.transIsStop = !that.transIsStop;
        });

        //转写标志不可复制粘贴
        that.$.wrapper.on('paste', (ev) => {
            var ct = ev.originalEvent.clipboardData.getData('text/html');
            if(ct.indexOf('class="trans-icon') > -1) {
                dialogUtil.showTip('转写标志不可复制粘贴', true);
                return false;
            }

        });

        //转写标志不可移动
        that.$.wrapper.on('dragstart', (ev) => {
            var ct = ev.originalEvent.dataTransfer.getData('text/html');
            if(ct.indexOf('class="trans-icon') > -1) {
                dialogUtil.showTip('转写标志不可移动', true);
                return false;
            }
        });

        //文本拖拽不显示底色
        that.$.wrapper.on('drop', (ev) => {
            setTimeout(() => {
                this.UMeditor.execCommand('removeformat', '', 'background-color', '');
            })
        });
    }

}