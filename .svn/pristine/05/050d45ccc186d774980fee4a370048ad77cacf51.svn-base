/**
 * @description juicer filter
 *
 * @author ttwang3
 *
 */

//替换\n为br
var dealBr = function(data) {
    return data.replace(/<br>|\n/g,'</p><p>');
};

var transToString = function(item){
	return item.join('，');
};

juicer.register('dealBr', dealBr); 
juicer.register('transToString', transToString); 