'use strict';

var SocketClient = _SocketClient();

function _SocketClient() {

    var SocketClient = {};

    SocketClient.init = init;
    SocketClient.pause = pause;
    SocketClient.resume = resume;
    SocketClient.close = close;

    var id = "";
    var isPause = false; //是否已经休庭
    var config = readConfig.getConfig('config.json');
    var socket = "";
    var socketServer = util.getSocketServer(config.httpClient);

    function init(editer1, editer2) {

        //关闭重试重连
        id && clearInterval(id);
        
        socket = new SockJS(socketServer);

        SocketClient.socket = socket;

        var soundEnergy = 0;
        var preLineId = "";

        //启动监听
        socket.onopen = function (event) {

            // 发送一个初始化消息
            socket.send(JSON.stringify({ courtId: config.courtId }));
            //全文转写出现位置
            if ($(editer2.UMeditor.body).find('.trans-icon').length == 0) {
                editer2.startBlockNode = $(editer2.UMeditor.body).children('p:last-child');
                var html = editer2.startBlockNode.html();
                if (!html.replace(/<br>/g, "")) {
                    editer2.startBlockNode.html("");
                }
                editer2.startBlockNode.append('<img class="trans-icon" src="../images/trans.png"/> ');
            }
        };

        // 监听消息
        socket.onmessage = function (event) {
            if(isPause) {
                return;
            }
            var message = JSON.parse(event.data);
            $('.no-sound').hide();
            $('.sound-value').show();
            //说话人提示
            var name = editer1.mic.micMap.get(message.messageMap.lineId) ? editer1.mic.micMap.get(message.messageMap.lineId).name : '待定';
            var n = name;
            if (n.length > 4) {
                n = n.substring(0, 4) + '...';
            }
            $('.sound-header span').html('\u3010' + n + '\u3011');

            if (message.messageType == 'VoiceEnergy') {

                var soundEnergyNew = Math.ceil(message.messageMap.energy * 1 / 10);

                soundEnergyNew = soundEnergyNew > 10 ? 10 : soundEnergyNew;

                if (soundEnergyNew > soundEnergy) {
                    $('.sound-value-item').each(function (index, item) {
                        if (index + 1 > soundEnergy && index + 1 <= soundEnergyNew) {
                            $(item).addClass('red');
                        }
                    });
                }
                if (soundEnergyNew < soundEnergy) {
                    $('.sound-value-item').each(function (index, item) {
                        if (index + 1 > soundEnergyNew && index + 1 <= soundEnergy) {
                            $(item).removeClass('red');
                        }
                    });
                }
                if (soundEnergyNew < 4) {
                    $('.sound-tip').addClass('show');
                } else {
                    $('.sound-tip').removeClass('show');
                }
                soundEnergy = soundEnergyNew;
            } else if (message.messageMap.text) {
                //存储获取到的记录
                if (config.isTest) {
                    util.writeTestFile(message.messageMap.text);       
                }
                if (preLineId && preLineId == message.messageMap.lineId) {
                    $('.sound-content').append(message.messageMap.text);
                    $('.sound-content').animate({ scrollTop: $('.sound-content')[0].scrollHeight }, 500);
                } else {
                    $('.mic-item').removeClass('active');
                    $('.sound-content').html(message.messageMap.text);
                }
                $('#mic_' + message.messageMap.lineId).addClass('active');
                preLineId = message.messageMap.lineId;
                //数字规整
                message.messageMap.text = util.improveText(message.messageMap.text);
                //摘要笔录转写
                if ($('.on').hasClass('active') && !editer1.transIsStop) {
                    if ($(editer1.UMeditor.body).find('.trans-icon').length == 0) {
                        var range = editer1.UMeditor.selection.getRange();
                        range.enlargeToBlockElm(true);
                        editer1.startBlockNode = $(range.startContainer);
                        range.collapse();
                        try {
                            editer1.UMeditor.execCommand('insertHtml', '<img class="trans-icon" src="../images/trans.png"/>');
                        } catch (error) {
                            util.exceptionHandle(error);
                        }
                    }
                    var isMute = editer1.mic.micMap.get(message.messageMap.lineId) ? editer1.mic.micMap.get(message.messageMap.lineId).isMute : false;
                    if (isMute) {
                        editer1.appendTransContentMute(message.messageMap);
                    } else {
                        editer1.appendTransContent(message.messageMap);
                    }
                }
                //全文笔录转写
                if (!editer2.transIsStop) {
                    if ($(editer2.UMeditor.body).find('.trans-icon').length == 0) {
                        var lastP = $(editer2.UMeditor.body).children('p:last-child');
                        if (lastP.length) {
                            editer2.startBlockNode = lastP;
                        } else {
                            $(editer2.UMeditor.body).append('<p></p>');
                            editer2.startBlockNode = $(editer2.UMeditor.body).children('p:last-child');
                        }
                        editer2.startBlockNode.append('<img class="trans-icon" src="../images/trans.png"/> ');
                    }
                    editer2.appendTransContent(message.messageMap);
                    if (!$('.tab-wrapper span.active').index() && !isWritting && $(editer2.UMeditor.body).find('p').length > 200) {
                        editer2.pages++;
                        var pageData = '';
                        $(editer2.UMeditor.body).find('p').slice(0, 99).each(function (index, item) {
                            pageData += $(item).prop("outerHTML");
                            $(item).remove();
                        });
                        //保存分页数据
                        var caseNo = util.getLocalItem('ajxxId');
                        dao.saveHtml('qw_' + caseNo + '_' + editer2.pages, pageData, function (data) {}, function (stauts) {
                            dialogUtil.showTip('保存全文文档失败', true);
                        });
                        fs.writeFile(path.join(execPath, '..', 'bak', editer2.pages + '.html'), pageData, function (err) {
                            if (err) {
                                editer2.pages--;
                                util.exceptionHandle(err);
                            }
                        });
                    }
                }
            }
        };

        // 监听Socket的关闭
        socket.onclose = function (event) {
            util.exceptionHandle({
                stack:JSON.stringify(event)
            });
            id && clearInterval(id);
            //正常关闭不重连
            if(event.code !== 1000){
                id = setInterval(function () {
                    socket.close();
                    SocketClient.init(editer1, editer2);
                }, 1000);
            }
        };

        // 监听Socket的erroe
        socket.onerror = function (event) {
            util.exceptionHandle({
                stack:JSON.stringify(event)
            });
        };
    }

    function pause() {
        isPause = true;
        $('.trans-icon').remove();
        $('.sound-value').hide();
        $('.no-sound').show();
        $('.sound-tip').removeClass('show');
    }

    function resume(editer2) {
        if ($(editer2.UMeditor.body).find('.trans-icon').length == 0) {
            var lastP = $(editer2.UMeditor.body).children('p:last-child');
            if (lastP.length) {
                editer2.startBlockNode = lastP;
            } else {
                $(editer2.UMeditor.body).append('<p></p>');
                editer2.startBlockNode = $(editer2.UMeditor.body).children('p:last-child');
            }
            editer2.startBlockNode.append('<img class="trans-icon" src="../images/trans.png"/> ');
            editer2.transIsStop = false;
        }
        editer2.preLineId = "";
        isPause = false;
    }

    function close() {
        if (SocketClient.socket) {
            SocketClient.socket.close();
        }
    }

    return SocketClient;
}