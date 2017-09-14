var ref = require('ref');
var ffi = require('ffi');
var fs = require('fs');
var path = require('path');
var gui = require('nw.gui');
var execPath = process.execPath;
var config = window.config = readConfig.getConfig('config.json');
var keyWords = window.keyWords = readConfig.getConfig('keyWord.json');
var keyWordsMap = window.keyWordsMap = new Map();
window.TTSPlayStatus = true;
window.audioSrc = '';
//tts播报
var tts = ffi.Library('ASYNTTS.dll', {
  'RegStartCallback': ['void', ['pointer']],
  'RegStopCallback': ['void', ['pointer']],
  'TTSPlay': ['void', ['string', 'int']],
  'TTSStop': ['void', []],
  'TTSSetSpeed': ['void', ['int']]
});
var fs$ = require('fs');
var path$ = require('path');
var stopCallback = ffi.Callback('void', [],
  function() {
    $('.sound').removeClass('sound-play');
    window.TTSPlayStatus = true;
  });
var startCallback = ffi.Callback('void', [],
  function() {
    $('.sound').addClass('sound-play');
    window.TTSPlayStatus = true;
  });

var signs = [ ];
var pngBase64Prefix = 'data:image/png;base64,';

// 
var zyjd = [
    //[ '法庭调查', '争议焦点'],
    ['归纳', '争议焦点'],
    ['归纳', '争议问题'],
    ['归纳', '调查重点'],
    ['争议焦点', '如下'],
    ['争议问题', '如下'],
    ['调查重点', '如下'],
    ['争议', '如下'],
    // ['争议焦点', '调查'],
    ['争议焦点', '为'],
    ['争议问题', '为'],
    ['调查重点', '为'],
    ['争议焦点', '归纳', '如下']
];

var regexps = [
    /《.*?》第.*?条第.*?款/mgi,
    /《.*?》.*?条/mgi,
    /《.*?》.*?条第.*?章/mgi,
    /《.*?》第.*?条,第.*?条/mgi,
    /《.*?》第.*?条第.*?项/mgi,
    /《.*?》第.*?条第.*?款，第.*?款/mgi
];
//模糊搜索初始化
var charStr = ref.refType('char');
var searchReplaceLibrary = ffi.Library('fuzzymatchnode', {
    'FuzzyMatchNodeInitialize': ['int', []],
    'FuzzyMatchNodeProcess': [charStr, ['string', 'string']],
    'FuzzyMatchNodeUninitialize': ['int', []]
});
var libSearch = function(findtxt, allText, maxLength, textArray, needSlice, recordPos, fromZero) {
  ret = searchReplaceLibrary.FuzzyMatchNodeInitialize();
  for(var i = 0; i < allText.length; i = i + maxLength) {
    var content = allText.substr(i, maxLength);
    charStr = searchReplaceLibrary.FuzzyMatchNodeProcess(content, findtxt);
    var resultList = JSON.parse(ref.readCString(charStr, 0)).result;
    if(resultList) {
      for(var item of resultList) {
        if (recordPos) {
          textArray.push(item.begin);
          continue ;
        }
        var text = content.substring(item.begin, item.end);
        if(_.indexOf(textArray, text) == -1) {
          textArray.push(
            needSlice ?
              fromZero ? content
                       : content.slice(item.begin)
              : text
          );
        }
      }
    }
  }
  ret = searchReplaceLibrary.FuzzyMatchNodeUninitialize();
};

/* 检索函数 */
var searchAll = function() {
  console.time('总共耗时');

  // 争议焦点查找
  var zyjdMatch = [
    [ '争议焦点', [ '归纳', '如下', '为' ] ],
    [ '调查重点', [ '归纳', '如下', '为' ] ],
    [ '争议', '如下' ]
  ];
  // 法规查找
  // var fgMatch = /《.*?》第.*?条|《.*?》第.*?条第.*?款|《.*?》.*?条|《.*?》.*?条第.*?款|《.*?》第.*?条、第.*?条|《.*?》第.*?条第.*?项|《.*?》第.*?条第.*?款，第.*?款/mgi;
  var fgMatch = /《[^《》]*?》第[^条]*?条第[^款]*?款，第[^款]*?款|《[^《》]*?》第[^条]*?条第[^款]*?款|《[^《》]*?》第[^条]*?条第[^项]*?项|《[^《》]*?》第[^条]*?条、第[^条]*?条|《[^《》]*?》第[^条]*?条|《[^《》]*?》/mgi;

  // 获取所有段落 并 过滤 字数少于 30 个字的段落
  var $paragraphs = editer && [].slice.call(editer.UMeditor.$body.children('p')) || [ ];
  // => filter
  // $paragraphs = $paragraphs.filter($para => $para.outerText.length > 30);
  // 段落文本数组

  var paras = [ ];
  for (var i = 0, len = $paragraphs.length; i !== len; ++i) {
    var outerText = $paragraphs[i] && $paragraphs[i].outerText || '';
    if (outerText.length >= 30) {
      paras.push({ content: outerText });
    }
  }

  // 最后的 match
  var lastMatch = [ ];
  // 检索到的法规集合
  // [ { name: '', main: '' }]
  var laws = [ ];

  // 第一轮模糊匹配的项目
  var firstMatcher = zyjdMatch.map(arr => arr[0]);

  // 第一等级的直接检测到 以及 laws
  // 保存在之前的 matcher 中检测到的结果
  var matches = [ ];
  var matchedLaws = [ ];
  // 记录 paras 的长度累计， O(n)
  // 顺带在这次遍历中做 regexp 匹配
  // 方便记录时间
  console.time('记录段落长度并做正则匹配');
  var paraLenInfo = [ ];
  var prevTotalLen = 0;
  var toMergeCnt = 5;
  var min = toMergeCnt - paras.length % toMergeCnt;
  // 以 5 为倍数
  for (var i = 0; i < min; ++i) {
    paras.push('');
  }
  for (var i = 0, len = paras.length; i !== len; ++i) {
    if (i % 5 === 0) {
      prevTotalLen = 0;
    }
    var content = paras[i].content || '';
    prevTotalLen += content.length;

    paraLenInfo.push(prevTotalLen);

    // 做 laws 匹配
    var tmp = null;
    var laws = [ ];
    while(tmp = fgMatch.exec(content)) {
      laws = laws.concat(tmp);
    }
    // merge
    laws.forEach(match => {
      if (!matchedLaws.some(r => r === match /* r.includes(match) || match.includes(r) */)) {
        matchedLaws.push(match);
      }
    });
    fgMatch.lastIndex = 0;
  }
  console.info('段落长度信息', paraLenInfo);
  console.timeEnd('记录段落长度并做正则匹配');

  console.time('第一次模糊匹配');
  console.info('第一次模糊匹配条数', paras.length / toMergeCnt);
  var prevTotalContent = '';

  // 第一次模糊匹配的结果
  var coreMatches = [ ];

  for (var i = 0, len = paras.length; i < len; ++i) {
    var content = paras[i].content || '';
    prevTotalContent += content;
    if (i && (i + 1) % toMergeCnt === 0 ) {
      // 检测 firstMatcher
      for (var j = 0, jlen = firstMatcher.length; j < jlen; ++j) {
        var matched = [ ];
        // libSearch(firstMatcher[j], prevTotalContent, prevTotalContent.length, matched, false, true);
        libSearch(firstMatcher[j], prevTotalContent, 200, matched, false, true);

        if (!Array.isArray(matches[j])) {
          matches[j] = [ ];
        }

        // matches 先储存位置信息
        matched.forEach(m => {
          matches[j].push(m);
        });

        // 如果 matched 中有值，那就不做下次的检测了
        if (matched.length > 0) {
          // paras[i].matched = true;
          break ;
        }
      }
      // 遍历位置信息，截取相应的 para 信息
      for (var k = 0, l = matches.length; k < l; ++k) {
        if (!Array.isArray(coreMatches[k])) {
          coreMatches[k] = [ ];
        }
        var positions = matches[k];
        if (!positions) {
          continue ;
        }
        var ipara = base = i + 1 - toMergeCnt;
        for (
          var ipos = 0/*, ipara = i + 1 - toMergeCnt*/, lpos = positions.length, lpara = ipara + toMergeCnt;
          ipos < lpos && ipara < lpara;
        ) {
          var pos = positions[ipos];
          var curLen = paraLenInfo[ipara/* - (ipara % toMergeCnt) + ipos*/];
          // 如果 pos 比 curLen 小，那就取 para 中 lpos 的值
          // 然后 ipos 需要自增，lpos 按照道理也需要自增，但是 这时候应该排除还有比 curLen 小的 pos
          // 不排除的话 就有重复的内容
          if (pos < curLen) {
            var deltaStart = ipara % toMergeCnt === 0 ? 0 : paraLenInfo[ipara - 1];
            coreMatches[k].push(paras[ipara/* - (ipara % toMergeCnt) + ipos*/].content.slice(pos - deltaStart));
            while (++ipos < lpos) {
              if (positions[ipos] >= curLen) {
                break ;
              }
            }
            // ipos 符合要求了，此时 ipara 也需要自增
            ++ ipara;
          }
          // 如果 pos 比 curLen 大的话，直接自增 ipara
          else if (pos > curLen) {
            ++ ipara;
          }
          // 如果相等的话，说明应该是从上一句话和下一句话合并导致的
          // 大概不会出现，直接自增 ipara
          else if (pos === curLen) {
            ++ ipara;
          }
        }
      }
      // 用完要复原
      matches = [ ];
      prevTotalContent = '';
    }
  }
  console.info('第一次模糊匹配结果', coreMatches);
  console.timeEnd('第一次模糊匹配');
  // 现在的 matches 已经是所有的满足第一条件的了
  // 且 matchedLaws 也是可行的
  matchedLaws = matchedLaws.map(x => ({ name: x }));
  console.log('内容所匹配条款', matchedLaws);

  console.time('law.txt匹配');

  // 处理 laws 进行匹配
  try {
    var staticLaws = fs.readFileSync(path$.join(nw.process.execPath, '..', 'laws.txt'), 'utf-8');
    if (staticLaws) {
      var lawsAry = staticLaws.split(/\s+/mgi);
      // 原始的 model.laws 中 map 书名号 《》 中间的内容
      matchedLaws.forEach(law => {
        law.main = law.name.slice(1, law.name.indexOf('》'));
      });
      // 需要展示的 laws
      matchedLaws = matchedLaws.filter(law => lawsAry.indexOf(law.main) !== -1);
    }
  } catch(e) {
    console.error(e);
  }

  console.timeEnd('law.txt匹配');

  console.time('第二次模糊匹配');
  console.info('第二次模糊匹配条数', coreMatches.length);
  // secondMatch
  // 从 coreMatches 里面进行二次 match
  for (var i = 0, len = coreMatches.length; i !== len; ++i) {
    var match = coreMatches[i];
    for (var k = 0, klen = match.length; k !== klen; ++k) {
      var content = match[k];

      var matcher = zyjdMatch[i][1];

      if (!Array.isArray(matcher)) {
        matcher = [ matcher ];
      }

      for (var j = 0, jlen = matcher.length; j !== jlen; ++j) {
        var m = matcher[j];
        var matched = [ ];
        // libSearch(m, content, content.length, matched, true, false, true);
        libSearch(m, content, 200, matched, true, false, true);

        if (!Array.isArray(lastMatch[j])) {
          lastMatch[j] = [ ];
        }

        matched.forEach(m => {
          if (!lastMatch[j].some(_ => _.includes(m) || m.includes(_))) {
            lastMatch[j].push(m);
          }
        });

        // 如果 matched 中有值，那就不做下次的检测了
        if (matched.length > 0) {
          // paras[i].matched = true;
          break ;
        }
      }
    }
  };
  console.timeEnd('第二次模糊匹配');

  // lastMatched 和 laws 是对的了
  console.info('最后的焦点', lastMatch);
  console.info('最后匹配完成的条款', matchedLaws);

  var lastFlattenedMatch = [ ];
  lastMatch.forEach(m => lastFlattenedMatch = lastFlattenedMatch.concat(m));

  console.info('flat过后的焦点', lastFlattenedMatch);

  var model = {
    caseName: $('.case-name').text(),
    focuses: lastFlattenedMatch,
    laws: matchedLaws
  };

  dao.wordRate(editer.UMeditor.$body.text(), function(data) {
    model.hotkeys = Object.keys(data);
    dialog({
      content: juicer($('#law').html(), model),
      onclose: function() {
        this.remove();
      },
      onshow: function() {
        this._$('dialog').find('.icon-all.dialog-header-icon').click(evt => this.close().remove());
      }
    }).showModal();
    
    console.timeEnd('总共耗时');
  });
}

/* 在待检索文本中检索 关键词 【模糊匹配】 */
var searchKeywords = function(keywords = '争议焦点', range) {
    if(!(typeof keywords === 'string' || Array.isArray(keywords)) || !typeof range === 'string') {
        return;
    }
    if(typeof keywords === 'string') {
        keywords = [keywords];
    }
    var ret = null;
    for(var i = keywords.length - 1; i >= 0; --i) {
        ret = [];
        var words = keywords[i];
        libSearch(words, range, range.length, ret, true);
        if(ret.length === 0) {
            break;
        }
        // 继续测试下一个
    }
    return ret;
}

tts.RegStartCallback(startCallback);
tts.RegStopCallback(stopCallback);
//是否已经开庭
window.courtOpend = false;
//计时器
var timeSetId = 0;
//开庭持续时间
var lastTime = 0;
//休庭持续时间
var pauseLastTime = 0;
var pauseTime = 0;
var caseName = util.getLocalItem('caseName');
//设置开庭持续时间
var setCourtLastTime = function() {
  timeSetId = setInterval(() => {
    lastTime = new Date().getTime() - util.getLocalItem('openTime') * 1 - pauseLastTime;
    $('.time-tip').html(util.dealTimeBySec(lastTime / 1000));
  }, 1000);
};

//头部工具栏
var toolBar = new ToolBar('庭审笔录', tts);

//左侧麦克风
var mic = new MicList();

//资料列表
var material = new Material();

//全文搜索
var searchReplace = new SearchReplace(UM);

//热词组件
var hotWord;
var hotWordMenu;

//编辑器
var editer, editer2;
//全文转写是否在分页写数据
var isWritting = false;

//摘要页面渲染
var renderAbs = function() {
  $('.time-tip').html("00:00:00");
  $('#myEditor').html('<p> </p>').addClass('content-empty');
};

//页面渲染
var renderPage = function() {
  //如果是异常退出则获取bak进行渲染页面
  $('.case-name').html(caseName).attr('title', caseName);
  $('.records-header-num').html(util.getLocalItem('fileCount'));
  if(config.exportWordType == '2003') {
    $('.text-header').addClass('none');
    $('.text-footer').addClass('none');
  }
  if(isCrash) {
    var caseTime = util.getLocalItem('caseTime');
    fs.readFile(path.join(execPath, '..', 'bak', '摘要笔录-' + caseName + '-' + caseTime + '.html'), 'utf-8', function(err, htmlData) {
      if(err || !htmlData) {
        util.exceptionHandle(err);
        $('#myEditor').html('<p> </p>')
      } else {
        $('#myEditor').html(htmlData);
        $('.trans-icon').remove();
      }
    });
    fs.readFile(path.join(execPath, '..', 'bak', '全文笔录-' + caseName + '-' + caseTime + '.html'), 'utf-8', function(err, htmlData) {
      if(err || !htmlData) {
        util.exceptionHandle(err);
      } else {
        $('#myEditor2').html(htmlData);
        $('.trans-icon').remove();
      }
    });
    //lastTime = new Date().getTime() - util.getLocalItem('openTime')*1;
    //$('.time-tip').html(util.dealTimeBySec(lastTime/1000));
  } else {
    util.setLocalItem('openTime', '');
    util.setLocalItem('caseTime', new Date().getTime());
    renderAbs();
  }
  bindEvent();
};

//绑定事件
var bindEvent = function() {

  //笔录tab切换
  $('.tab-wrapper span').on('click', function() {
    if($(this).hasClass('active')) {
      return;
    }
    $(".tab-wrapper span").removeClass('active');
    $(this).addClass('active');
    var index = $(this).index();

    $(".tab-item").hide();
    $(`.tab-item:eq(${index})`).show();
  });

  //右侧关闭和展开
  $('.right-section-open').on('click', function() {
    $('.right-section, .right-section-open').toggleClass('right-close');
    $('.edui-container').css('width', '100%');
  });

  //右侧关闭和展开
  $('.record-mic-open-icon').on('click', function() {
    $('.record-mic, .record-mic-open').toggleClass('right-close');
    $('.edui-container').css('width', '100%');
  });

  //编辑器大小调整
  win.on('resize', function() {
    $('.edui-container').css('width', '100%');
  });

  //返回首页
  $('.back').on('click', function() {
    if(!$(this).hasClass('disable')) {
      dialogUtil.backToIndexTip('是否返回首页');
      $('.close-court-btn').on('click', () => {
        dao.caseEnd(util.getLocalItem('ajxxId'));
        util.setLocalItem('isCrash', 0);
        history.go(-1);
      })
    }
    // if(courtOpend){
    //     dialogUtil.backToIndexTip('是否结束本次庭审，返回首页');
    //     $('.close-court-btn').on('click',() => {
    //         dao.caseEnd(util.getLocalItem('ajxxId'));
    //         dao.closeCourt((data) => {
    //             dialogUtil.closeCommonDialog();
    //             KafkaConsumer.close();
    //             util.setLocalItem('isCrash',0);
    //             history.go(-1);
    //         },(status) => {
    //             dialogUtil.showTip('闭庭失败',true);
    //             dialogUtil.closeCommonDialog();
    //         }); 
    //     });
    // }else{
    //     dialogUtil.backToIndexTip('是否返回首页');
    //     $('.close-court-btn').on('click',() => {
    //         dao.caseEnd(util.getLocalItem('ajxxId'));
    //         util.setLocalItem('isCrash',0);
    //         history.go(-1);
    //     })
    // }

  });
};

//初始化页面函数
var initPage = function() {

  //显示设置按钮
  EventController.ee.emit('showSetting', true);

  //渲染页面
  renderPage();

  //热词组件
  hotWord = new HotWord(isCrash);
  hotWordMenu = hotWord.createMenu();

  var editerPages = 0;
  if(isCrash) {
    editerPages = JSON.parse(util.getLocalItem('pages')) * 1;
  };

  //全文编辑器
  var um2 = UM.getEditor('myEditor2');
  editer2 = new Editer($('#fulltext'), um2, mic, hotWord, editerPages);

  //全文编辑器只有热词菜单
  var onlyHotWord = true;
  var editer2Menu = editer2.createMenu(onlyHotWord);
  var hotKeyFull = new HotKeyFull(editer2);

  //音频播放器
  var audio = new Audio($('.audio-wrapper'),document.getElementById("audio"),tts);

  var um = UM.getEditor('myEditor');
  $('.edui-container').css('width', '100%');

  //摘要编辑器
  editer = new Editer($('#abstract'), um, mic, hotWord, editerPages, searchReplace, audio);
  // 获取 signs
  setTimeout(function() {
    $signsWrapper = editer.UMeditor.$body.find('.signs-wrapper');
    if ($signsWrapper.length) {
      signs = $signsWrapper.eq(0).find('img').map(function(index, img) {
        return { nm: img.dataset['nm'], base64: img.src };
      });
      signs = [ ].slice.call(signs);
      return ;
    }
    signs = [ ];
  }, 16);
  var editerMenu = editer.createMenu();

  //热键
  var hotKeyAbs = new HotKeyAbs(editer);

  //闭庭时保存全文数据
  EventController.ee.on('closeCourt', function() {
    util.exceptionHandle({
      statusText: '向后台保存文档'
    });
    var caseTime = util.getLocalItem('caseTime');
    dao.saveHtml(caseTime + '_qw', um2.getContent(), (data) => {}, (stauts) => {
      dialogUtil.showTip('保存全文文档失败', true)
    });
    dao.saveHtml(caseTime + '_zy', um.getContent(), (data) => {}, (stauts) => dialogUtil.showTip('保存摘要文档失败', true))
  });

  // 没啥吊用
  // $(document).on('beforeprint', function() {
  //   console.log(1);
  // });
  // editer.UMeditor.$container.find('.edui-dialog-container').on('beforeprint', 'iframe', function() {
  //   console.log(2);
  // });

  // $(document).on('afterprint', function() {
  //   console.log(1);
  // });
  // editer.UMeditor.$container.find('.edui-dialog-container').on('afterprint', 'iframe', function() {
  //   console.log(2);
  // });

  //打印
  $('.print').on('click', function() {
    um.execCommand('print');
  });

  //文件上传

  $('input[name="import-doc"]').on('change', function() {
    var files = this.files;
    if(!files.length) {
      return
    }
    var message = validate.checkDocFiles(files);
    if(message) {
      dialogUtil.showTip(message, true);
      return false;
    }
    var formData = new FormData();
    formData.append('file', files[0]);
    //上传文件
    $('input[name="import-doc"]').val("");
    dao.importWord(formData, (data) => {
      editer.UMeditor.$body.removeClass('content-empty').html(data.replace(/<\/?div[^>]*>/, ''));
    }, (status) => {
      dialogUtil.showTip('模板导入失败', true);
    });
  });

  var appendSignsToEditor = function() {
    signs = signs.filter(function(sign) {
      return !!sign && !!sign.base64;
    });
    var htmlStr = '<div class="signs-wrapper show-in-print">';
    var innerStr = '';
    if (signs.length) {
      // init signs
      // 倒序输出，但是 float: right
      for (var i = signs.length - 1; i >= 0; --i) {
        var sign = signs[i];
        if (sign) {
          innerStr += `<img class="sign-img" data-nm="${sign.nm}" style="width: 20mm; height: 20mm; float: right;" src="${sign.base64}">`;
        }
      }
    }
    var $$body = editer.UMeditor.$body;
    if ($$body.find('.signs-wrapper').length) {
      // $$body.find('.signs-wrapper').eq(0).html(innerStr);
      // return ;
      $$body.find('.signs-wrapper').remove();
    }
    editer.UMeditor.$body.append(htmlStr + innerStr + '</div>');
  }

  $('.sign').click(function() {
    var ws = null;
    var d = dialog({
      content: $('#sign').html(),
      onshow: function() {
        ws = new WebSocket(`ws://localhost:${config.wsport || 12345}/tshen`);
        ws.onopen = function() {
          console.info('ws opened');
        }
        ws.onerror = function() {
          console.error('ws error', arguments);
          try {
            this.close();
          } catch(err) { };
        }
        ws.onclose = function() {
          console.info('ws closed');
        }
        ws.onmessage = function(msg) {
          var data = JSON.parse(msg.data);
          console.log(data);
          if (!(data && 'type' in data)) {
            return ;
          }
          var $active = $body.find('.sign-tab-list .sign-tab-list-item.active');
          var index = $active.index();
          switch (data.type) {
            // clear
            case 0: {
              clearImage();
              signs[index].base64 = '';
              break ;
            }
            // image
            case 1: {
              signs[index] = { nm: $active.find('.nm').text(), base64: pngBase64Prefix + data.value };
              appendImage(signs[index].nm, signs[index].base64);
              break ;
            }
          }
        }
        var that = this;
        var $body = this._$('body');
        var removeDialog = function() {
          that.close().remove();
        }
        var clearImage = function() {
          $body.find('.sign-image-wrapper').empty();
        }
        var appendImage = function(nm, base64) {
          $body.find('.sign-image-wrapper').html(`<img class="sign-img" data-nm="${nm}" src="${base64}">`);
        }
        var getTabItem = function(name, needActive) {
          return $(`<li class="sign-tab-list-item ${needActive ? 'active': ''}"><span class="nm">${name}</span><i class="sign-del">x</i></li>`);
        }
        var addTabItem = function(name, needActive) {
          var $tabList = $body.find('.sign-tab-list');
          $tabList.append(getTabItem(name, needActive));
        }
        if (signs.length) {
          $body.find('.content-wrapper').removeClass('disabled');
          // init signs
          for (var i = 0, len = signs.length; i < len; ++i) {
            addTabItem(signs[i].nm, i === 0);
            appendImage(`签名${i + 1}`, signs[i].base64);
          }
          $body.find('sign-tab-list').children().removeClass('active').first().addClass('active');
        }
        $body.find('.ui-dialog-content .close-modal').click(removeDialog);
        $body.find('.red-button.cfm').click(function() {
          removeDialog();
        });
        // 新建
        $body.find('.sign-opr-list-item').click(function() {
          var $this = $(this);
          var $tabList = $body.find('.sign-tab-list');
          var $tabs = $tabList.children();
          var newIndex = $tabs.length + 1;
          var $tabs = $tabList.children();
          $tabs.removeClass('active');
          var $li = getTabItem(`签名${newIndex}`, true);
          $tabList.append($li);

          clearImage();
          $body.find('.content-wrapper').removeClass('disabled');

          ws.send('initialize');
        });
        $body.find('.sign-tab-list').on('click', '.sign-tab-list-item .nm', function() {
          var $this = $(this);
          $this.parent().addClass('active').siblings().removeClass('active');
          var index = $this.parent().index();
          console.log(index);
          if (signs[index]) {
            appendImage(`签名${index + 1}`, signs[index].base64);
          }
          else {
            clearImage();
          }
        });
        $body.find('.sign-tab-list').on('click', '.sign-tab-list-item .sign-del', function() {
          var $this = $(this);
          var index = $this.parent().index();
          signs.splice(index, 1);
          if ($this.parent().hasClass('active')) {
            clearImage();
          }
          $this.parent().remove();
          var $tabs = $body.find('.sign-tab-list').children();
          if ($tabs.length === 0) {
            return $body.find('.content-wrapper').addClass('disabled').find('.sign-image-wrapper').html('');
          }
          $tabs.first().addClass('active');
          appendImage(signs[0].nm, signs[0].base64);
        });
      },
      onclose: function() {
        ws && typeof ws.close === 'function' && ws.close();
        appendSignsToEditor();
      }
    });
    d.showModal();
  });

  //导出
  $('.export').on('click', function() {
    dao.downloadDoc(um.getContent().replace(/<img.*\/>/ig, ''), toolBar.fontStyle, (data) => {
      gui.Window.open(data.data, {
        show: false,
      });
    }, (stauts) => dialogUtil.showTip('下载文档失败', true))
  });

  //文档上传
  $('.show-setting').on('click', function() {
    if(!util.getLocalItem('openTime')) {
      dialogUtil.showTip('请先进行庭审', true)
      return
    }
    if(!$('.close-court').hasClass('disable')) {
      dialogUtil.showTip('请先闭庭', true)
      return
    }
    dao.uploadAbstractFile(um.getContent().replace(/<img.*\/>/ig, ''), toolBar.fontStyle, (data) => {
      if(data.status !== '0') {
        dialogUtil.showTip(data.message, true)
      } else {
        dialogUtil.showTip('文档上传成功')
      }
    }, (stauts) => dialogUtil.showTip('文档上传失败', true))
  });

  function showKeyWord() {
    // var d = dialogUtil.getCommonDialog();
    // d.content($('#keyword').html());
    // d.showModal();
    var d = dialog({
      content: $('#keyword').html(),
      onclose: function() {
        tts.TTSStop();
        this.remove();
      }
    }).showModal();

    var tpl1 = '{@if caseNo}<p id="case_no"><span>案&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;号：</span>${caseNo}</p>{@/if} {@if caseCause}<p id="case_cause"><span>案&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;由：</span>${caseCause}</p>{@/if} {@if caseParty}<p id="case_party"><span>当&nbsp;&nbsp;&nbsp;事&nbsp;&nbsp;&nbsp;&nbsp;人：</span>${caseParty}</p>{@/if} {@if judge}<p id="judge"><span>审&nbsp;&nbsp;&nbsp;判&nbsp;&nbsp;&nbsp;&nbsp;长：</span>${judge}</p>{@/if} {@if collegiateBenchMember}<p id="collegiate_bench_member"><span>合议庭成员：</span>${collegiateBenchMember}</p>{@/if} {@if clerk}<p id="clerk"><span>书&nbsp;&nbsp;&nbsp;记&nbsp;&nbsp;&nbsp;&nbsp;员：</span>${clerk}</p>{@/if}';
    dao.searchCaseByName(util.getLocalItem('caseName'), data => {
      if(data.length) {
        $('.ui-dialog-content .infor').append(juicer(tpl1, data[0]))
      }
    }, status => {
      dialogUtil.showTip('案件查询失败', true);
    })
    $('.ui-dialog-content #court_time_last').text($('.time-tip').text());
    $('.ui-dialog-content #word_count').html(num + '<em>个字</em>');
    var tpl2 = '<ul class="xin_contect_r_c"> {@each list as item, index} <li class="xin_aa value_${index}"><span>${item.value}</span></li> {@/each} </ul>';
    if(keyWordsMap.get('research')) {
      var keyWords = {
        list: keyWordsMap.get('research')
      };
      $('.ui-dialog-content .xin_contect_r').append('<div class="xin_case research">法庭调查</div>');
      $('.ui-dialog-content .research').after(juicer(tpl2, keyWords));
    }
    if(keyWordsMap.get('debate')) {
      var keyWords = {
        list: keyWordsMap.get('debate')
      };
      $('.ui-dialog-content .xin_contect_r').append('<div class="xin_case debate">法庭辩论</div>');
      $('.ui-dialog-content .debate').after(juicer(tpl2, keyWords));
    }
    if(keyWordsMap.get('state')) {
      var keyWords = {
        list: keyWordsMap.get('state')
      };
      $('.ui-dialog-content .xin_contect_r').append('<div class="xin_case state">最后陈述</div>');
      $('.ui-dialog-content .state').after(juicer(tpl2, keyWords));
    }
    if(keyWordsMap.get('adjudge')) {
      var keyWords = {
        list: keyWordsMap.get('adjudge')
      };
      $('.ui-dialog-content .xin_contect_r').append('<div class="xin_case adjudge">宣判</div>');
      $('.ui-dialog-content .adjudge').after(juicer(tpl2, keyWords));
    }
    var keywordAudio = new Audio($('.ui-dialog-content .keyword-audio-wrapper'), document.getElementById("keyword_audio"), tts);
    keywordAudio.init(audioSrc);
    var clickCount = 0;
    $('.ui-dialog-content .xin_aa').on('click', function(evt) {
      
      var parentObj = $(this).parent('.xin_contect_r_c').prev();
      var name = parentObj[0].classList[1];
      var index = this.classList[1].split('_')[1] * 1;
      var timeList = keyWordsMap.get(name)[index].list;
      if($(this).hasClass('active')) {
        clickCount += 1
        if(clickCount == timeList.length || clickCount > timeList.length) {
          clickCount = 0;
        }
      } else {
        clickCount = 0;
        $('.xin_aa').removeClass('active');
        $(this).addClass('active');
        keywordAudio.renderPlaySection(timeList);
        
      }
      var currentTime = $('.paly-span:eq(' + clickCount + ')').data('bg') / 100;
      keywordAudio.playToTime(currentTime);
    });
    $('.dialog-header i').on('click', function() {
      d.close();
    })
  }
  //闭庭
  $('.close-court').on('click', function() {
   
  
    if($(this).hasClass('disable')) {
      return;
    }
    dialogUtil.closeCourtTip();
    $('.close-court-btn').on('click', () => {
      dialogUtil.showCover();
      dao.caseEnd(util.getLocalItem('ajxxId'));
      // config.dataSource == 1 && searchAll();
      dao.closeCourt((data) => {
        dialogUtil.closeCommonDialog();
        KafkaConsumer.close();
        $('.back').removeClass('disable');
        $('.open-court,.pause-court,.close-court').addClass('disable');
        $('.court-tip').removeClass('pause-tip').removeClass('open-tip').addClass('close-tip').html('当前已闭庭');
        $('.off').click();
        editer2.$.wrapper.find('.trans-icon').remove();
        courtOpend = false;
        clearInterval(timeSetId);
        dao.getAudio((data) => {
          audio.init(data.data);
          audioSrc = data.data;
          util.exceptionHandle({
            statusText: '音频地址：' + data.data
          });
          // 获取音频之后 进入配置中心
          // showKeyWord();
        }, (status) => dialogUtil.showTip('获取音频失败', true));
      }, (status) => {
        dialogUtil.closeCommonDialog();
        dialogUtil.showTip('闭庭失败', true);
      });
    });
  });

  //开庭
  $('.open-court').on('click', function() {
    var icon = $(this);
    if(icon.hasClass('disable')) {
      return;
    }
    dialogUtil.showCover();
    //移除vad背景色
    $('.bg-yellow').removeClass('bg-yellow');
    if(!courtOpend) { //第一次点击开庭按钮
      dao.openCourt((data) => {
        dialogUtil.closeCommonDialog();
        icon.addClass('disable');
        $('.import,.back').addClass('disable');
        $('input[name="import-doc"]').attr('disabled', "disabled");
        $('.pause-court,.close-court').removeClass('disable');
        $('.court-tip').addClass('open-tip').html('当前已开庭');
        util.setLocalItem('deputySid', data.result.deputySid);
        util.setLocalItem('sid', data.result.sid);
        util.setLocalItem('mix_sid', data.result.mix_sid);
        util.setLocalItem('openTime', new Date().getTime());
        if(data.result.msg) {
          dialogUtil.showTip(data.result.msg, true);
        }
        courtOpend = true; //已经开庭
        setCourtLastTime();
        KafkaConsumer.init(editer, editer2);
      }, (status) => {
        dialogUtil.showTip('开庭失败', true);
        dialogUtil.closeCommonDialog();
      });
    } else { //休庭-》开庭
      dao.resumeCourt((data) => {
        dialogUtil.closeCommonDialog();
        icon.addClass('disable');
        $('.pause-court').removeClass('disable');
        $('.court-tip').removeClass('pause-tip').addClass('open-tip').html('当前已开庭');
        pauseLastTime += new Date().getTime() - pauseTime;
        setCourtLastTime();
        util.setLocalItem('deputySid', data.result.deputySid);
        util.setLocalItem('sid', data.result.sid);
        if(data.result.msg) {
          dialogUtil.showTip(data.result.msg, true);
        }
        audio.close();
        KafkaConsumer.resume(editer2);
      }, (status) => {
        dialogUtil.showTip('开庭失败', true);
        dialogUtil.closeCommonDialog();
      });
    }

  });

  //休庭
  $('.pause-court').on('click', function() {
    var icon = $(this);
    if(icon.hasClass('disable')) {
      return;
    }
    dialogUtil.showCover();
    dao.pauseCourt((data) => {
      dialogUtil.closeCommonDialog();
      icon.addClass('disable');
      $('.open-court').removeClass('disable');
      $('.court-tip').addClass('pause-tip').removeClass('open-tip').html('当前休庭中');
      $('.mic-item').removeClass('active');
      KafkaConsumer.pause();
      clearInterval(timeSetId);
      pauseTime = new Date().getTime();
      $('.off').click();
      util.exceptionHandle({
        statusText: '开始获取音频'
      });
      dao.getAudio((data) => {
        audio.init(data.data);
        util.exceptionHandle({
          statusText: '音频地址：' + data.data
        });
      }, (status) => dialogUtil.showTip('获取音频失败', true));
    }, (status) => {
      dialogUtil.showTip('休庭失败', true);
      dialogUtil.closeCommonDialog();
    }, () => {
      dialogUtil.closeCommonDialog();
    });
  });
  //关闭转写功能
  $('.off').on('click', function() {
    editer.$.wrapper.find('.trans-icon').remove();
    editer.transIsStop = true;
    $(this).addClass('active');
    $('.record-anchor').hide();
    $('.on').removeClass('active');
    editer.preLineId = "";
  });

  //开启转写
  $('.on').on('click', function() {
    //闭庭状态
    var range = editer.UMeditor.selection.getRange();
    range.enlargeToBlockElm(true);
    if(range.startContainer.nodeName != "P") { //插入标签不在P处
      dialogUtil.showTip('请选择插入位置', true);
      return;
    }
    editer.startBlockNode = $(range.startContainer);
    range.collapse();
    var brCount = editer.startBlockNode.find('br').length;
    try {
      $(editer.UMeditor.body).find('.trans-icon').remove();
      editer.UMeditor.execCommand('insertHtml', '<img class="trans-icon" src="../images/trans.png"/>');
      if(editer.startBlockNode.find('br').length != brCount) {
        $('.trans-icon').after('<br>');
      }
      var red = $('.trans-icon').parent('font.red');
      if(red.length) { //转写标示在打点中
        $('.trans-icon').remove();
        red.after('<img class="trans-icon" src="../images/trans.png"/>')
      }
      editer.transIsStop = false;
    } catch(e) {
      dialogUtil.showTip('请选择插入位置', true);
      return;
    }
    $('.record-anchor').show();
    $(this).addClass('active');
    $('.off').removeClass('active');
  });

  //热词替换
  $('.right-tab-item.hot-word ul').delegate('.hot-word-item', 'click', function(e) {
    var showEditer = $('.tab-wrapper span.active').index() ? editer2 : editer;
    var txt = showEditer.getText();
    var value = $(this).find('span').text();
    showEditer.UMeditor.execCommand('insertHtml', value);
  });

  //热词菜单
  $('.right-tab-item.hot-word ul')[0].addEventListener('contextmenu', function(ev) {
    var $target = $(ev.target);
    //热词菜单
    if($target.hasClass('hot-word-item') ||
      $target.parent().hasClass('hot-word-item')) {
      ev.preventDefault();
      hotWord.setEventTargetDom($target.hasClass('hot-word-item') ? ev.target : ev.target.parentNode);
      hotWordMenu.popup(ev.x, ev.y);
    }
    return false;
  });

  //插入说话人
  $('.record-mic').delegate('.mic-item i', 'click', function(e) {
    var showEditer = $('.tab-wrapper span.active').index() ? editer2 : editer;
    var name = $(this).next().text();
    showEditer.UMeditor.execCommand('insertHtml', `<strong class="speaker">${name}</strong>：`);
  });

  //设置主标题
  $('.main-title').on('click', function() {
    var text = editer.getText();
    if(!text.length) {
      return;
    }
    if(editer.setStyleIsActive()) {
      var lineHeight = util.getLineRule(toolBar.fontStyle.title.lineRule, toolBar.fontStyle.title.lineSpacing);
      var fontWeight = toolBar.fontStyle.title.overstriking ? 'bold' : 'normal';
      var style = `font-family:${toolBar.fontStyle.title.fontFamily};
                        font-size:${toolBar.fontStyle.title.fontSize}pt;
                        text-align:${toolBar.fontStyle.title.textAlign};
                        line-height:${lineHeight};font-weight:${fontWeight};text-indent:0`;
      editer.setStyle(style);
    } else {
      dialogUtil.showTip('请选择非转写区域设置标题', true)
    }

  })

  //设置副标题
  $('.sub-title').on('click', function() {
    var text = editer.getText();
    if(!text.length) {
      return;
    }
    if(editer.setStyleIsActive()) {
      var lineHeight = util.getLineRule(toolBar.fontStyle.subTitle.lineRule, toolBar.fontStyle.subTitle.lineSpacing);
      var fontWeight = toolBar.fontStyle.subTitle.overstriking ? 'bold' : 'normal';
      var style = `font-family:${toolBar.fontStyle.subTitle.fontFamily};
                        font-size:${toolBar.fontStyle.subTitle.fontSize}pt;
                        text-align:${toolBar.fontStyle.subTitle.textAlign};
                        line-height:${lineHeight};font-weight:${fontWeight};text-indent:0`;
      editer.setStyle(style);
    } else {
      dialogUtil.showTip('请选择非转写区域设置副标题', true)
    }
  })

  //设置署名
  $('.signature').on('click', function() {
    var text = editer.getText();
    if(!text.length) {
      return;
    }
    if(editer.setStyleIsActive()) {
      var lineHeight = util.getLineRule(toolBar.fontStyle.signature.lineRule, toolBar.fontStyle.signature.lineSpacing);
      var style = `font-family:${toolBar.fontStyle.signature.fontFamily};
                font-size:${toolBar.fontStyle.signature.fontSize}pt;
                text-align:${toolBar.fontStyle.signature.textAlign};
                line-height:${lineHeight};text-indent:0`;
      editer.setStyle(style);
    } else {
      dialogUtil.showTip('请选择非转写区域设置署名', true)
    }

  })

  //摘要菜单
  editer.UMeditor.body.addEventListener('contextmenu', function(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    var $target = $(ev.target);
    editer.hotWord.setEventPosition({
      x: ev.pageX,
      y: ev.pageY
    });
    //if($target.parents('#myEditor').length){
    editerMenu.items[0].enabled = editer.markUpIsActive();
    editerMenu.items[1].enabled = editer.insertIsActive();
    editerMenu.items[2].enabled = editer.stopInsertIsActive();
    editerMenu.items[3].enabled = editer.addHotWordIsActive();
    editerMenu.popup(ev.x, ev.y);
    //}
    return false;
  });

  //全文记录菜单
  editer2.UMeditor.body.addEventListener('contextmenu', function(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    var $target = $(ev.target);
    editer2.hotWord.setEventPosition({
      x: ev.pageX,
      y: ev.pageY
    });
    //if($target.parents('#myEditor2').length){
    editer2Menu.items[0].enabled = editer2.addHotWordIsActive();
    editer2Menu.popup(ev.x, ev.y);
    //}
    return false;
  });

  var prevTop = 0,
    currTop = 0;
  //全文记录分页加载页面
  var scrollBody = $('#fulltext .record-top');
  if(window.config.versionType == 'win7') {
    scrollBody = $('#fulltext .record-content');
  }
  scrollBody.on('scroll', function() {
    var that = this;
    currTop = this.scrollTop;
    if(!isWritting && currTop < prevTop && currTop < 500 && editer2.pages > 0) {
      isWritting = true;
      fs.readFile(path.join(execPath, '..', 'bak', `${editer2.pages}.html`), 'utf-8', function(err, htmlData) {
        if(err || !htmlData) {
          util.exceptionHandle(err);
        } else {
          editer2.pages--;
          var height = that.scrollHeight;
          $('#myEditor2').prepend(htmlData);
          that.scrollTop = that.scrollHeight - height + currTop;
          isWritting = false;
        }
      })
    }
    prevTop = currTop;
  });

  //非正常退出为崩溃情况
  util.setLocalItem('isCrash', 1);
};

//初始化页面
//是否崩溃恢复（1为异常崩溃恢复，0位正常）
var isCrash = util.getLocalItem('isCrash') * 1;
initPage();

//替换备份文件，防止备份中途退出丢失备份文件
var changeBak = function(oldFileName, newFileName) {
  if(fs.existsSync(path.join(execPath, '..', 'bak', oldFileName))) {
    if(fs.existsSync(path.join(execPath, '..', 'bak', newFileName))) {
      fs.unlinkSync(path.join(execPath, '..', 'bak', newFileName));
    }
    fs.renameSync(path.join(execPath, '..', 'bak', oldFileName), path.join(execPath, '..', 'bak', newFileName));
  }
};

//定期保存摘要页面
var absSave = function(caseTime) {
  var absRecordData = $('#myEditor').html();
  changeBak('摘要笔录bak-' + caseName + '-' + caseTime + '.html', '摘要笔录-' + caseName + '-' + caseTime + '.html');
  fs.writeFile(path.join(execPath, '..', 'bak', '摘要笔录bak-' + caseName + '-' + caseTime + '.html'), absRecordData, function(err) {
    if(err) {
      util.exceptionHandle(err);
    }
    setTimeout(() => {
      absSave(caseTime);
    }, 10000);
  })
};

//定期保存全文页面
var fullSave = function(caseTime) {
  var fullRecordData = $('#myEditor2').html();
  changeBak('全文笔录bak-' + caseName + '-' + caseTime + '.html', '全文笔录-' + caseName + '-' + caseTime + '.html');
  fs.writeFile(path.join(execPath, '..', 'bak', '全文笔录bak-' + caseName + '-' + caseTime + '.html'), fullRecordData, function(err) {
    if(err) {
      util.exceptionHandle(err);
    }
    util.setLocalItem('pages', editer2.pages);
    setTimeout(() => {
      fullSave(caseTime);
    }, 10000);
  });
};

//定时保存页面数据
setTimeout(function() {
  if(!fs.existsSync(path.join(execPath, '..', 'bak'))) {
    fs.mkdirSync(path.join(execPath, '..', 'bak'));
  }
  var caseTime = util.getLocalItem('caseTime');
  absSave(caseTime);
  fullSave(caseTime);
}, 10000);

$('.law-close').click(function(){
	$('#law').hide();
})
