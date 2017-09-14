/**
 * @description Kafka Consumer
 *
 * @author ttwang3
 *
 */

var KafkaConsumer = _KafkaConsumer();
var _ = require('lodash');

function _KafkaConsumer() {

    var KafkaConsumer = {};

    KafkaConsumer.init = init;
    KafkaConsumer.pause = pause;
    KafkaConsumer.resume = resume;
    KafkaConsumer.close = close;
    
    var id = "";
    var isPause = false;//是否已经休庭，kafka在暂停是不会立即停止转写
    window.num = 0;
    function init(editer1,editer2) {
        var kafka = require('kafka-node');
        var Consumer = kafka.Consumer;
        var Offset = kafka.Offset;
        var Client = kafka.Client;
        var argv = require('optimist').argv;
        var _ = require('lodash');
        var config = readConfig.getConfig('config.json');
        var topic = argv.topic || config.courtId;
        var fs = require('fs');
        var path = require('path');
        var gui = require('nw.gui');
        var execPath = process.execPath;

        var client = new Client(config.kafkaClient);
        
        var offset = new Offset(client);
        offset.fetch([{ topic: topic, partition: 0, time: -1 }], 
            function (err, data) {
                var latestOffset = data[topic]['0'][0];
                var topics = [{
                        topic: topic,
                        partition: 0,
                        offset:latestOffset
                    }],
                    options = {
                        autoCommit: false,
                        fetchMaxWaitMs: 1000,
                        fetchMaxBytes: 1024 * 1024,
                        fromOffset:true,
                        encoding: 'utf8'
                    };

                var consumer = new Consumer(client, topics, options);
                KafkaConsumer.consumer = consumer;

                var soundEnergy = 0;
                var preLineId = "";

                //全文转写出现位置
                if($(editer2.UMeditor.body).find('.trans-icon').length == 0){
                    editer2.startBlockNode = $(editer2.UMeditor.body).children('p:last-child');
                    var html = editer2.startBlockNode.html();
                    if(!html.replace(/<br>/g,"")){
                        editer2.startBlockNode.html("");
                    }
                    editer2.startBlockNode.append('<img class="trans-icon" src="../images/trans.png"/> ');
                }
                consumer.on('message', function(message) {
                    if(!isPause){
                        try {
                            var message = JSON.parse(message.value);
                            $('.no-sound').hide();
                            $('.sound-value').show();
                            //说话人提示
                            var name = editer1.mic.micMap.get(message.messageMap.lineId) ? editer1.mic.micMap.get(message.messageMap.lineId).name : '待定';
                            var n = name;
                            if(n.length>4){
                                n = n.substring(0,4)+'...';
                            }
                            $('.sound-header span').html(`【${n}】`);

                            if(message.messageType == 'VoiceEnergy'){

                                var soundEnergyNew = Math.ceil(message.messageMap.energy*1/10);

                                soundEnergyNew = soundEnergyNew > 10 ? 10 : soundEnergyNew;

                                if(soundEnergyNew > soundEnergy){
                                    $('.sound-value-item').each(function(index,item){
                                        if(index+1 > soundEnergy && index+1 <= soundEnergyNew){
                                            $(item).addClass('red');
                                        }
                                    });
                                }
                                if(soundEnergyNew < soundEnergy){
                                    $('.sound-value-item').each(function(index,item){
                                        if(index+1 > soundEnergyNew && index+1 <= soundEnergy){
                                            $(item).removeClass('red');
                                        }
                                    });
                                }
                                if(soundEnergyNew < 4){
                                    $('.sound-tip').addClass('show');
                                }else{
                                    $('.sound-tip').removeClass('show');
                                }
                                soundEnergy = soundEnergyNew;

                            }else if(message.messageMap.text){
                                //获取关键词
                                util.setKeyWords(message.messageMap,keyWords,keyWordsMap);
                                num += message.messageMap.text.length;
                                //存储获取到的记录
                                if(config.isTest){
                                    var timestamp = new Date().getTime();
                                    fs.writeFile(path.join(execPath, '..', 'test.txt'), timestamp + ',' + message.messageMap.text + ',' + num + '\r\n', {
                                        flag: 'a'
                                    }, function(err){
                                        if(err) {
                                            util.exceptionHandle(err);
                                            throw err;
                                        }
                                    });
                                }
                                if(preLineId && preLineId == message.messageMap.lineId){
                                    $('.sound-content').append(message.messageMap.text);
                                    $('.sound-content').animate({scrollTop:$('.sound-content')[0].scrollHeight}, 500);
                                }else{
                                    $('.mic-item').removeClass('active');
                                    $('.sound-content').html(message.messageMap.text);
                                }
                                $(`#mic_${message.messageMap.lineId}`).addClass('active');
                                preLineId = message.messageMap.lineId;
                                //数字规整
                                message.messageMap.text = util.improveText(message.messageMap.text);
                                //摘要笔录转写
                                if($('.on').hasClass('active') && !editer1.transIsStop){
                                    if($(editer1.UMeditor.body).find('.trans-icon').length == 0){
                                        var range = editer1.UMeditor.selection.getRange();
                                        range.enlargeToBlockElm(true);
                                        editer1.startBlockNode = $(range.startContainer);
                                        range.collapse();
                                        try{
                                            editer1.UMeditor.execCommand('insertHtml', '<img class="trans-icon" src="../images/trans.png"/>');
                                        }catch(error){
                                            util.exceptionHandle(error);
                                        }
                                        
                                    }
                                    var isMute = editer1.mic.micMap.get(message.messageMap.lineId) ? editer1.mic.micMap.get(message.messageMap.lineId).isMute : false;
                                    if(isMute){
                                        editer1.appendTransContentMute(message.messageMap);
                                    }else{
                                        editer1.appendTransContent(message.messageMap);
                                    }
                                }
                                //全文笔录转写
                                if(!editer2.transIsStop){
                                    if($(editer2.UMeditor.body).find('.trans-icon').length == 0){
                                        var lastP = $(editer2.UMeditor.body).children('p:last-child');
                                        if(lastP.length){
                                            editer2.startBlockNode = lastP;
                                        }else{
                                            $(editer2.UMeditor.body).append('<p></p>');
                                            editer2.startBlockNode = $(editer2.UMeditor.body).children('p:last-child');
                                        }
                                        editer2.startBlockNode.append('<img class="trans-icon" src="../images/trans.png"/> ');
                                    }
                                    editer2.appendTransContent(message.messageMap);
                                    if(!$('.tab-wrapper span.active').index() && !isWritting
                                        && $(editer2.UMeditor.body).find('p').length > 200){
                                        editer2.pages ++ ;
                                        var pageData = '';
                                        $(editer2.UMeditor.body).find('p').slice(0, 99).each(function(index,item){
                                            pageData += $(item).prop("outerHTML");
                                            $(item).remove();
                                        });
                                        //保存分页数据
                                        var caseNo = util.getLocalItem('ajxxId');
                                        dao.saveHtml(`qw_${caseNo}_${editer2.pages}`,pageData,(data) => {
                                        },(stauts) => {dialogUtil.showTip('保存全文文档失败',true)});
                                        fs.writeFile(path.join(execPath, '..', 'bak', `${editer2.pages}.html`), pageData, function (err) {
                                            if (err) {
                                                editer2.pages --;
                                                util.exceptionHandle(err);
                                            }
                                        })
                                    }
                                }
                            }
                        } catch (e) {
                            util.exceptionHandle(e);
                        }
                        
                    }
                    
                });

                consumer.on('error', function(err) {
                    util.exceptionHandle(err);
                });

                /*
                 * If consumer get `offsetOutOfRange` event, fetch data from the smallest(oldest) offset
                 */
                consumer.on('offsetOutOfRange', function(topic) {
                    topic.maxNum = 2;
                    offset.fetch([topic], function(err, offsets) {
                        if (err) {
                            util.exceptionHandle(err);
                            return;
                        }
                        var min = Math.min(offsets[topic.topic][topic.partition]);
                        consumer.setOffset(topic.topic, topic.partition, min);
                    });
                });
            }
        );

        
    }

    function pause(){
        isPause = true;
        KafkaConsumer.consumer.pause();
        $('.trans-icon').remove();
        $('.sound-value').hide();
        $('.no-sound').show();
        $('.sound-tip').removeClass('show');
    }

    function resume(editer2){
        if($(editer2.UMeditor.body).find('.trans-icon').length == 0){
            var lastP = $(editer2.UMeditor.body).children('p:last-child');
            if(lastP.length){
                editer2.startBlockNode = lastP;
            }else{
                $(editer2.UMeditor.body).append('<p></p>');
                editer2.startBlockNode = $(editer2.UMeditor.body).children('p:last-child');
            }
            editer2.startBlockNode.append('<img class="trans-icon" src="../images/trans.png"/> ');
            editer2.transIsStop = false;
        }
        editer2.preLineId = "";
        KafkaConsumer.consumer.resume();
        isPause = false;
    }

    function close(){
        if(KafkaConsumer.consumer){
            KafkaConsumer.consumer.close();
        }
    }

    return KafkaConsumer;
}

