/**
 * @description define the SearchReplace action.
 *
 * @author ttwang3
 *
 * @constructor SearchReplace.init
 */

var SearchReplace = function (UM) {
    this.$ = {
        domUtils : UM.dom.domUtils,
        dtd : UM.dom.dtd,
        _blockElm : {'table':1,'tbody':1,'tr':1,'ol':1,'ul':1}
    }
}

SearchReplace.prototype = {

    findTextInString : function(textContent,opt,currentIndex){
        var str = opt.searchStr.join('|');
        if(opt.dir == -1){
            textContent = textContent.split('').reverse().join('');
            str = str.split('').reverse().join('');
            currentIndex = textContent.length - currentIndex;

        }
        var reg = new RegExp(str,'g' + (opt.casesensitive ? '' : 'i')),match;
        while(match = reg.exec(textContent)){
            if(match.index >= currentIndex){
                return {
                    index : opt.dir == -1 ? textContent.length - match.index - match[0].length : match.index,
                    text: match[0]
                }
                
            }
        }
        return  {
            index : -1
        }
    },

    findTextBlockElm : function(me,node,currentIndex,opt){
        var textContent,index,text,methodName = opt.all || opt.dir == 1 ? 'getNextDomNode' : 'getPreDomNode';
        if(this.$.domUtils.isBody(node)){
            node = node.firstChild;
        }
        var first = 1;
        while(node){
            textContent = node.nodeType == 3 ? node.nodeValue : node['textContent'];
            index = this.findTextInString(textContent,opt,currentIndex ).index;
            text = this.findTextInString(textContent,opt,currentIndex ).text;
            first = 0;
            if(index!=-1){
                return {
                    'node':node,
                    'index':index,
                    'text':text
                }
            }
            node = this.$.domUtils[methodName](node);
            if(!$(node).parents('.edui-body-container').length){
                node = null
            }
            while(node && this.$._blockElm[node.nodeName.toLowerCase()]){
                node = this.$.domUtils[methodName](node,true);
            }
            if(node){
                currentIndex = opt.dir == -1 ? (node.nodeType == 3 ? node.nodeValue : node['textContent']).length : 0;
            }

        }
    },

    findNTextInBlockElm : function(node,index,str){
        var currentIndex = 0,
            currentNode = node.firstChild,
            currentNodeLength = 0,
            result;
        while(currentNode){
            if(currentNode.nodeType == 3){
                currentNodeLength = currentNode.nodeValue.replace(/(^[\t\r\n]+)|([\t\r\n]+$)/,'').length;
                currentIndex += currentNodeLength;
                if(currentIndex >= index){
                    return {
                        'node':currentNode,
                        'index': currentNodeLength - (currentIndex - index)
                    }
                }
            }else if(!this.$.dtd.$empty[currentNode.tagName]){
                currentNodeLength = currentNode['textContent'].replace(/(^[\t\r\n]+)|([\t\r\n]+$)/,'').length
                currentIndex += currentNodeLength;
                if(currentIndex >= index){
                    result = this.findNTextInBlockElm(currentNode,currentNodeLength - (currentIndex - index),str);
                    if(result){
                        return result;
                    }
                }
            }
            currentNode = this.$.domUtils.getNextDomNode(currentNode);
        }
    },

    searchReplace : function(me,opt){

        var rng = me.selection.getRange(),
            startBlockNode,
            searchStr = opt.searchStr,
            span = me.document.createElement('span');
        span.innerHTML = '$$ueditor_searchreplace_key$$';

        rng.shrinkBoundary(true);

        //判断是不是第一次选中
        if(!rng.collapsed){//不是第一次搜索
            rng.select();
            var rngText = me.selection.getText().replace(/\n/mgi,'');
            if(new RegExp('^' + opt.searchStr.join('|') + '$',(opt.casesensitive ? '' : 'i')).test(rngText)){
                if(opt.replaceStr != undefined){
                    this.replaceText(me,rng,opt.replaceStr);
                    rng.select();
                    return true;
                }else{
                    rng.collapse(opt.dir == -1)
                }

            }
        }else{
            var first = me.body.firstChild;
            if(first && first.nodeType == 1){
                rng.setStart(first,0);
                rng.shrinkBoundary(true);
            }else if(first.nodeType == 3){
                rng.setStartBefore(first)
            }
            rng.collapse(true).select(true);
        }
        rng.insertNode(span);
        rng.enlargeToBlockElm(true);
        startBlockNode = rng.startContainer;
        var currentIndex = startBlockNode['textContent'].indexOf('$$ueditor_searchreplace_key$$');
        rng.setStartBefore(span);
        this.$.domUtils.remove(span);
        var result = this.findTextBlockElm(me,startBlockNode,currentIndex,opt);
        if(result){
            if(/\n/mgi.test(result.node.innerHTML)){
                result.index = result.index-1;
            }
            var rngStart = this.findNTextInBlockElm(result.node,result.index,searchStr);
            var rngEnd = this.findNTextInBlockElm(result.node,result.index + result.text.length,searchStr);
            rng.setStart(rngStart.node,rngStart.index).setEnd(rngEnd.node,rngEnd.index);

            if(opt.replaceStr !== undefined){
                this.replaceText(me,rng,opt.replaceStr)
            }
            rng.select();
            var span1 = me.document.createElement('span');
            rng.insertNode(span1);
            var scrollBody = $(me.body).parents('.record-top');
            if(window.config.versionType == 'win7'){
                scrollBody = $(me.body).parents('.record-content');
            }
            var scHeight = result.node.offsetTop > span1.offsetTop ? result.node.offsetTop + span1.offsetTop : span1.offsetTop;
            scrollBody.animate({scrollTop:scHeight}, 300, '', ()=>{
                this.$.domUtils.remove(span1);
            });
            return true;
        }else{
            rng.setCursor()
        }

    },

    replaceText : function(me,rng,str){
        str = me.document.createTextNode(str);
        rng.deleteContents().insertNode(str);
    },

    extend : function(t, s, b){
        if (s) {
            for (var k in s) {
                if (!b || !t.hasOwnProperty(k)) {
                    t[k] = s[k];
                }
            }
        }
        return t;
    },

    commandSearch : function(opt,me){
        this.extend(opt,{
            all : false,
            casesensitive : false,
            dir : 1
        },true);
        var num = 0;
        if(opt.all){
            var rng = me.selection.getRange(),
                first = me.body.firstChild;
            if(first && first.nodeType == 1){
                rng.setStart(first,0);
                rng.shrinkBoundary(true);
            }else if(first.nodeType == 3){
                rng.setStartBefore(first)
            }
            rng.collapse(true).select(true);
            if(opt.replaceStr !== undefined){
                me.fireEvent('saveScene');
            }
            while(this.searchReplace(me,opt)){
                num++;
            }
            if(num){
                me.fireEvent('saveScene');
            }
        }else{
            if(opt.replaceStr !== undefined){
                me.fireEvent('saveScene');
            }
            if(this.searchReplace(me,opt)){
                num++
            }
            if(num){
                me.fireEvent('saveScene');
            }
        }
        return num;
    }
}