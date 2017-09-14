config 文件说明

1.构建时需要将conf文件夹拷贝到nw执行目录中


2.tts.json播报内容配置
	discipline:纪律播报内容
	judge：审判员上庭
	witness：证人上庭

3.config.json IP地址配置以及kafka配置
	httpClient   :控制中心接口配置,
	courtId      :法庭ID,
	courtCode    :法庭号,
	exportWordType :导出文件类型（2003/2007）
	isTest       :是否开启测试输出
	version      :当前版本号
	versionType  :win7/xp

4.fontStyle.json 字体字号配置
	fontFamily   :字体配置,
	fontSizeKey  :字体大小与fontSizeValue对应,
	fontSizeValue:word字号,