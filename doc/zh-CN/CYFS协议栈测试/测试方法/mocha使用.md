# mocha基础知识
## 一、mocha安装

安装nodejs后使用npm命令安装mocha

npm install -g mocha

## 二、mocha test demo

``` Javascrip
var assert = require("assert");
describe('a mocha test demo', function(){
	describe('test suit1', function(){
  		it('a simple testcase user assert', function(){
        	assert.equal(-1, [1,2,3].indexOf(5));
		    assert.equal(-1, [1,2,3].indexOf(0));
		})
	})
});
```  

- **describe (moduleName, testDetails)** 由上述代码可看出，describe是可以嵌套的，比如上述代码嵌套的两个describe就可以理解成测试人员希望测试Array模块下的#indexOf() 子模块。module_name 是可以随便取的，关键是要让人读明白就好。

- **it (info, function)** 具体的测试语句会放在it的回调函数里，一般来说info字符串会写期望的正确输出的简要一句话文字说明。当该it block内的test failed的时候控制台就会把详细信息打印出来。一般是从最外层的describe的module_name开始输出（可以理解成沿着路径或者递归链或者回调链），最后输出info，表示该期望的info内容没有被满足。一个it对应一个实际的test case

 
## 三、异步调用Asynchronous
``` Javascrip
fs = require('fs');
describe('File', function(){
	describe('#readFile()', function(){
    	it('should read test.ls without error', function(done){
	    	fs.readFile('test.ls', function(err){
				if (err) throw err;
				done();
			});
		})
	})
})
```
- **done ()** 按照瀑布流编程习惯，取名done是表示你回调的最深处，也就是结束写嵌套回调函数。但对于回调链来说done实际上意味着告诉mocha从此处开始测试，一层层回调回去。

``` Javascrip
async function funA(){
    console.info("Run funA")
}
async function funB(){
    console.info("Run funB")
}
describe('测试多个异步函数', function(){
	describe('test suit', function(){
    	it('test case run funA and funB',async function(){
	    	await funA();
	    	await funB();
		})
	})
})
```
- 实际测试过程中大部分函数都是异步函数，it()函数的回调函数可以使用async定义为异步函数，这样可以使用await调用需要测试的函数，加了await异步函数会顺序执行，避免异步出现的问题

## 四、常用的一些方法: only、skip、beforeEach、afterEach、before、after
- **only**如果所有测试用例集合it()中带有only标签的，只会执行带only的测试用例，only适合用来调试单个测试用例

``` Javascrip
describe('only的使用', function(){
	describe('test suit', function(){
    	it.only('test case run only',async function(){
	    	console.info("只会运行it.only类型的测试用例")
		})
		it('test case run common',async function(){
	    	console.info("如果有it.only,普通的测试用例不会执行")
		})
	})
})
```

- **skip**测试用例集合it()中带有skip标签，用例执行时会跳过该部分案例，skip适合用来跳过需要测试的用例
``` Javascrip
describe('skip的使用', function(){
	describe('test suit', function(){
    	it.skip('test case run skip',async function(){
	    	console.info("it.skip类型的测试用例不会执行")
		})
		it('test case run common',async function(){
	    	console.info("普通的测试用例正常执行")
		})
	})
})
```
- **beforeEach()**在该describe()下每一个it()执行前都会执行一次beforeEach()
- **afterEach()**在该describe()下每一个it()执行后都会执行一次afterEach()
- **before()**在该describe()执行it()前，会执行一次before()
- **after()***在该describe()执行it()后，会执行一次after()


## 参考文献：
https://cnodejs.org/topic/516526766d38277306c7d277
