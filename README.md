
# Promise/A+ 规范，源码分析

Promise是前端大厂面试的一道常考题，掌握Promise用法及其相关原理，对你的面试一定有很大帮助。这篇文章主要讲解Promise源码实现，如果你还没有掌握Promise的功能和API，推荐你先去学习一下Promise的概念和使用API，学习知识就要脚踏实地，先把基础搞好才能深刻理解源码的实现。  
这里推荐阮一峰老师的文章  

[ES6入门-Promise对象](http://es6.ruanyifeng.com/#docs/promise)  

如果你已经掌握了Promise的基本用法，我们进行下一步  

### Promise/A+规范
说到Promise/A+规范，很多同学可能很不理解这是一个什么东西，下面给出两个地址，不了解的同学需要先了解一下，对我们后续理解源码很有帮助，先看两遍，有些地方看不懂也没关系，后续我们可以通过源码来回头再理解，想把一个知识真的学会，就要反复琢磨，从【肯定->否定->再肯定】不断地深入理解，直到完全掌握。  

[Promise/A+规范英文地址](https://promisesaplus.com/)  
[Promise/A+规范中文翻译](https://juejin.im/post/5b6161e6f265da0f8145fb72)   

如果你看过了Promise/A+规范，我们继续，我会带着大家按照规范要求，一步一步的来实现源码  
### Promise/A+ 【2.1】
#### 2.1Promise状态  
一个promise必须处于三种状态之一： 请求态（pending）， 完成态（fulfilled），拒绝态（rejected）
##### 2.1.1 当promise处于请求状态（pending）时
- 2.1.1.1 promise可以转为fulfilled或rejected状态

##### 2.1.2 当promise处于完成状态（fulfilled）时

- 2.1.2.1 promise不能转为任何其他状态
2.1.2.2 必须有一个值，且此值不能改变

#####  2.1.3 当promise处于拒绝状态（rejected）时

- 2.1.3.1 promise不能转为任何其他状态
- 2.1.3.2 必须有一个原因（reason），且此原因不能改变


我们先找需求来完成这一部分代码，一个简单的小架子

```
    // 2.1 状态常量
    const PENDING = 'penfing';
    const RESOLVED = 'resolved';
    const REJECTED = 'rejected';
    
    // Promise构造函数
    function MyPromise(fn) {
    	const that = this;
    	this.state = PENDING;
    	this.value = null;
    	this.resolvedCallbacks = [];
    	this.rejectedCallbacks = [];
    	function resolve() {
    		if (that.state === PENDING) {
    
    		}
    	}
    	function reject() {
    		if (that.state === PENDING) {
    			
    		}
    	}
    }
```


上面这段代码完成了Promise构造函数的初步搭建，包含：

- 三个状态的常量声明【请求态、完成态、拒绝态】
- this.state保管状态、this.value保存唯一值
- resolvedCallbacks 和 rejectedCallbacks 用于保存 then 中的回调，因为当执行完 Promise 时状态可能还是等待中，这时候应该把 then 中的回调保存起来用于状态改变时使用
- 给fn的回调函数 reslove、reject
- resolve、reject确保只有'pedding'状态才可以改变状态

下面我们来完成resolve和reject


```
    function resolve(value) {
        if (that.state === PENDING) {
            that.state = RESOLVED
            that.value = value
            that.resolvedCallbacks.map(cb => cb(that.value))
        }
    }

    function reject(value) {
        if (that.state === PENDING) {
            that.state = REJECTED
            that.value = value
            that.rejectedCallbacks.map(cb => cb(that.value))
        }
    }
    
```

- 更改this.state的状态
- 给this.value赋值
- 遍历回调数组并执行，传入this.value

记下来我们需要来执行新建Promise传入的函数体
```
    	try {
    		fn(resolve, reject);
    	} catch (e){
    		reject(e)
    	}
```

在执行过程中可能会遇到错误，需要捕获错误传给reject

### Promise/A+ 【2.2】
#### 2.2 then方法
promise必须提供then方法来存取它当前或最终的值或者原因。  
promise的then方法接收两个参数：

```
    promise.then(onFulfilled, onRejected)
```
##### 2.2.1 onFulfilled和onRejected都是可选的参数：

- 2.2.1.1 如果 onFulfilled不是函数，必须忽略
- 2.2.1.1 如果 onRejected不是函数，必须忽略

##### 2.2.2 如果onFulfilled是函数:

- 2.2.2.1 此函数必须在promise 完成(fulfilled)后被调用,并把promise 的值作为它的第一个参数
- 2.2.2.2 此函数在promise完成(fulfilled)之前绝对不能被调用
- 2.2.2.2 此函数绝对不能被调用超过一次

##### 2.2.3 如果onRejected是函数:
- 2.2.3.1 此函数必须在promise rejected后被调用,并把promise 的reason作为它的第一个参数
- 2.2.3.2 此函数在promise rejected之前绝对不能被调用
- 2.2.3.2 此函数绝对不能被调用超过一次

现根据这些要求我们先实现个简单的then函数：


```
    MyPromise.prototype.then = function (onFulfilled, onRejected) {
        const that = this
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : v => v
        onRejected =
            typeof onRejected === 'function'
                ? onRejected
                : r => {
                    throw r
                }
        if (that.state === PENDING) {
            that.resolvedCallbacks.push(onFulfilled)
            that.rejectedCallbacks.push(onRejected)
        }
        if (that.state === RESOLVED) {
            onFulfilled(that.value)
        }
        if (that.state === REJECTED) {
            onRejected(that.value)
        }
    }
```

- 首先判断了传进来的onFulfilled和onRejected是不是一个函数类型，如果不是就创建一个透传数据的函数
- 判断状态，如果是'pending'就把函数追加到对应的队列中，如果不是'pending',直接执行对应状态的函数【resolves => onFulfilled, rejected => onRejected】

如上我们就完成了一个简易版的promise，但是还不能完全满足Promise/A+规范，接下来我们继续完善  

##### 2.2.4 在执行上下文堆栈（execution context）仅包含平台代码之前，不得调用 onFulfilled和onRejected
##### 2.2.5 onFulfilled and onRejected must be called as functions (i.e. with no this value)
##### 2.2.6 then可以在同一个promise里被多次调用
— 2.2.6.1 如果/当 promise 完成执行（fulfilled）,各个相应的onFulfilled回调 必须根据最原始的then 顺序来调用
— 2.2.6.2 如果/当 promise 被拒绝（rejected）,各个相应的onRejected回调 必须根据最原始的then 顺序来调用

##### 2.2.7 then必须返回一个promise

```
promise2 = promise1.then(onFulfilled, onRejected);
```
- 2.2.7.1 如果onFulfilled或onRejected返回一个值x, 运行 Promise Resolution Procedure [[Resolve]](promise2, x)
- 2.2.7.2 如果onFulfilled或onRejected抛出一个异常e,promise2 必须被拒绝（rejected）并把e当作原因
- 2.2.7.3 如果onFulfilled不是一个方法，并且promise1已经完成（fulfilled）, promise2必须使用与promise1相同的值来完成（fulfiled）
- 2.2.7.4 如果onRejected不是一个方法，并且promise1已经被拒绝（rejected）, promise2必须使用与promise1相同的原因来拒绝（rejected）

首先我们先把resolve和rejected完善一下

```
    function resolve(value) {
        if (value instanceof MyPromise) {
            return value.then(resolve, reject)
        }
        setTimeout(() => {
            if (that.state === PENDING) {
                that.state = RESOLVED
                that.value = value
                that.resolvedCallbacks.map(cb => cb(that.value))
            }
        }, 0)
    }
    function reject(value) {
        setTimeout(() => {
            if (that.state === PENDING) {
                that.state = REJECTED
                that.value = value
                that.rejectedCallbacks.map(cb => cb(that.value))
            }
        }, 0)
    }
```

参考2.2.2和2.2.3
- 对于 resolve 函数来说，首先需要判断传入的值是否为 Promise 类型
- 为了保证函数执行顺序，需要将两个函数体代码使用 setTimeout 包裹起来

接下来根据规范需求继续完善then函数里的代码：

```
    if (that.state === PENDING) {
    
        return (promise2 = new MyPromise((resolve, reject) => {
            that.resolvedCallbacks.push(() => {
                try {
                    const x = onFulfilled(that.value);
                    resoluteProcedure(promise2, x, resolve, reject)
                } catch (r) {
                    reject(r);
                }
            });
            that.rejectedCallbacks.push(() => {
                try {
                    const x = onRejected(that.value);
                    resoluteProcedure(promise2, x, resolve, reject)
                } catch {
                    reject(r)
                }
            })
        }));
        that.reolvedCallbacks.push(onFulfilled);
        that.rejectedCallbacks.push(onRejeted);
    }
    if (that.state === RESOLVED) {
        return (promise2 = new MyPromise((resolve, reject) => {
            setTimeout(() => {
                try {
                    const x = onFulfilled(that.value)
                    resolutionProcedure(promise2, x, resolve, reject)
                } catch (reason) {
                    reject(reason)
                }
            })
        }))
    }
    if (that.state === REJECTED) {
        return (promise2 = new MyPromise((resolve, reject) => {
            setTimeout(() => {
                try {
                    const x = onRejected(that.value)
                    resolutionProcedure(promise2, x, resolve, reject)
                } catch (reason) {
                    reject(reason)
                }
            })
        }))
    }
```

- 首先我们返回了一个新的 Promise 对象，并在 Promise 中传入了一个函数
- 函数的基本逻辑还是和之前一样，往回调数组中 push 函数
- 同样，在执行函数的过程中可能会遇到错误，所以使用了 try...catch 包裹
- 规范规定，执行 onFulfilled 或者 onRejected 函数时会返回一个 x，并且执行 Promise 解决过程，这是为了不同的 Promise 都可以兼容使用，比如 JQuery 的 Promise 能兼容 ES6 的 Promise

### Promise/A+ 【2.3】
#### 2.3 Promise解决程序
##### 2.3.1 如果promise和x引用同一个对象，则用TypeError作为原因拒绝（reject）promise。
##### 2.3.2 如果x是一个promise,采用promise的状态
- 2.3.2.1 如果x是请求状态(pending),promise必须保持pending直到xfulfilled或rejected
- 2.3.2.2 如果x是完成态(fulfilled)，用相同的值完成fulfillpromise
- 2.3.2.2 如果x是拒绝态(rejected)，用相同的原因rejectpromise

##### 2.3.3另外，如果x是个对象或者方法
- 2.3.3.1 让x作为x.then
- 2.3.3.2 如果取回的x.then属性的结果为一个异常e,用e作为原因reject promise
- 2.3.3.3 如果then是一个方法，把x当作this来调用它， 第一个参数为 resolvePromise，第二个参数为rejectPromise,其中:
    - 2.3.3.3.1 如果/当 resolvePromise被一个值y调用，运行 [[Resolve]](promise, y)
    - 2.3.3.3.2 如果/当 rejectPromise被一个原因r调用，用r拒绝（reject）promise
    - 2.3.3.3.3 如果resolvePromise和 rejectPromise都被调用，或者对同一个参数进行多次调用，第一次调用执行，任何进一步的调用都被忽略
    - 2.3.3.3.4 如果调用then抛出一个异常e,
        - 2.3.3.3.4.1 如果resolvePromise或 rejectPromise已被调用，忽略。
        - 2.3.3.3.4.2 或者， 用e作为reason拒绝（reject）promise
- 2.3.3.4 如果then不是一个函数，用x完成(fulfill)promise

##### 2.3.4 如果 x既不是对象也不是函数，用x完成(fulfill)promise
如果一个promise被一个thenable resolve,并且这个thenable参与了循环的thenable环，
[[Resolve]](promise, thenable)的递归特性最终会引起[[Resolve]](promise, thenable)再次被调用。
遵循上述算法会导致无限递归，鼓励（但不是必须）实现检测这种递归并用包含信息的TypeError作为reason拒绝（reject）   
这部分规范主要描述了resolutionProcedure函数的规范，下面我们来实现resolutionProcedure这个函数，我先我么你关注2.3.4下面那段话，简单的来说规定了x不能与promise2相等，这样会发生循环引用的问题，如下栗子：

```
    let p = new MyPromise((resolve, reject) => {
        resolve(1)
    })
    let p1 = p.then(value => {
        return p1
    })
```

所以我们需要先进行检测，代码如下：

```
    function resolutionProcedure(promise2, x, resolve, reject) {
        if (promise2 === x) {
            return reject(new TypeError('Error'))
        }
    }
```

接下来我们判断x的类型

```
    if (x instanceof MyPromise) {
        x.then(function (value) {
            resolutionProcedure(promise2, value, resolve, reject)
        }, reject)
    }
```
如果 x 为 Promise 的话，需要判断以下几个情况：

- 如果 x 处于等待态，Promise 需保持为等待态直至 x 被执行或拒绝
- 如果 x 处于其他状态，则用相同的值处理 Promise

最后我们来完成剩余的代码：

```
    let called = false
    if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
        try {
            let then = x.then
            if (typeof then === 'function') {
                then.call(
                    x,
                    y => {
                        if (called) return
                        called = true
                        resolutionProcedure(promise2, y, resolve, reject)
                    },
                    e => {
                        if (called) return
                        called = true
                        reject(e)
                    }
                )
            } else {
                resolve(x)
            }
        } catch (e) {
            if (called) return
            called = true
            reject(e)
        }
    } else {
        resolve(x)
    }
```

- 首先创建一个变量 called 用于判断是否已经调用过函数   
- 然后判断 x 是否为对象或者函数，如果都不是的话，将 x 传入 resolve 中    
- 如果 x 是对象或者函数的话，先把 x.then 赋值给 then，然后判断 then 的类型，如果不是函数类型的话，就将 x 传入 resolve 中   
- 如果 then 是函数类型的话，就将 x 作为函数的作用域 this 调用之，并且传递两个回调函数作为参数，第一个参数叫做 resolvePromise ，第二个参数叫做 rejectPromise，两个回调函数都需要判断是否已经执行过函数，然后进行相应的逻辑   
- 以上代码在执行的过程中如果抛错了，将错误传入 reject 函数中

### 测试Promise

有专门的测试脚本可以测试所编写的代码是否符合PromiseA+的规范
首先，在promise实现的代码中，增加以下代码:   

```
    Promise.defer = Promise.deferred = function () {
        let dfd = {};
        dfd.promise = new Promise((resolve, reject) => {
            dfd.resolve = resolve;
            dfd.reject = reject;
        });
        return dfd;
    }
```
安装测试脚本:

```
npm install -g promises-aplus-tests
```
如果当前的promise源码的文件名为promise.js

那么在对应的目录执行以下命令:

```
promises-aplus-tests promise.js

```

共有872条测试用例，可以完美通过


### 符合Promise/A+规范完整代码
这样我们就完成了符合Promise/A+规范的源码，下面是整个代码：

```
    const PENDING = 'pending';
    const RESOLVED = 'resolve';
    const REJECTED = 'rejected';
    function Promise(fn) {
        let that = this;
        that.status = 'PENDING';
        that.value = undefined;
        that.resolvedCallbacks = [];
        that.rejectedCallbacks = [];
        function resolve(value) {
            if (that.status === 'PENDING') {
                that.status = 'RESOLVED';
                that.value = value;
                that.resolvedCallbacks.forEach(function (fn) {
                    fn();
                })
            }
        }
        function reject(value) {
            if (that.status === 'PENDING') {
                that.status = 'REJECTED';
                that.value = value;
                that.rejectedCallbacks.forEach(function (fn) {
                    fn();
                })
            }
        }
        try {
            fn(resolve, reject);
        } catch (e) {
            reject(e);
        }
    }

    function resolutionProcedure(promise2, x, resolve, reject) {
        //有可能这里返回的x是别人的promise 要尽可能允许其他人乱写 
        if (promise2 === x) {//这里应该报一个循环引用的类型错误
            return reject(new TypeError('循环引用'));
        }
        //看x是不是一个promise promise应该是一个对象
        let called;  //表示是否调用过成功或者失败
        if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
            //可能是promise 看这个对象中是否有then 如果有 姑且作为promise 用try catch防止报错
            try {
                let then = x.then;
                if (typeof then === 'function') {
                    //成功
                    then.call(x, function (y) {
                        if (called) return        //避免别人写的promise中既走resolve又走reject的情况
                        called = true;
                        resolutionProcedure(promise2, y, resolve, reject)
                    }, function (err) {
                        if (called) return
                        called = true;
                        reject(err);
                    })
                } else {
                    resolve(x)             //如果then不是函数 则把x作为返回值.
                }
            } catch (e) {
                if (called) return
                called = true;
                reject(e)
            }

        } else {  //普通值
            return resolve(x)
        }

    }

    Promise.prototype.then = function (onFulfilled, onRejected) {
        //成功和失败默认不传给一个函数
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : function (value) {
            return value;
        }
        onRejected = typeof onRejected === 'function' ? onRejected : function (err) {
            throw err;
        }
        let that = this;
        let promise2;  //新增: 返回的promise
        if (that.status === 'RESOLVED') {
            promise2 = new Promise(function (resolve, reject) {
                setTimeout(function () {                          //用setTimeOut实现异步
                    try {
                        let x = onFulfilled(that.value);        //x可能是普通值 也可能是一个promise, 还可能是别人的promise                               
                        resolutionProcedure(promise2, x, resolve, reject)  //写一个方法统一处理 
                    } catch (e) {
                        reject(e);
                    }

                })
            })
        }
        if (that.status === 'REJECTED') {
            promise2 = new Promise(function (resolve, reject) {
                setTimeout(function () {
                    try {
                        let x = onRejected(that.value);
                        resolutionProcedure(promise2, x, resolve, reject)
                    } catch (e) {
                        reject(e);
                    }
                })
            })
        }

        if (that.status === 'PENDING') {
            promise2 = new Promise(function (resolve, reject) {
                that.resolvedCallbacks.push(function () {
                    setTimeout(function () {
                        try {
                            let x = onFulfilled(that.value);
                            resolutionProcedure(promise2, x, resolve, reject)
                        } catch (e) {
                            reject(e);
                        }
                    })
                });
                that.rejectedCallbacks.push(function () {
                    setTimeout(function () {
                        try {
                            let x = onRejected(that.value);
                            resolutionProcedure(promise2, x, resolve, reject)
                        } catch (e) {
                            reject(e);
                        }
                    })
                });
            })
        }
        return promise2;
    }
    Promise.defer = Promise.deferred = function () {
        let dfd = {};
        dfd.promise = new Promise((resolve, reject) => {
            dfd.resolve = resolve;
            dfd.reject = reject;
        });
        return dfd;
    }
    module.exports = Promise;
```

以上就是符合Promise/A+规范的源码，ES6的Promise其实并不是向我们这样通过js来实现，而是在底层实现，并且还扩展了很多新的方法：
- Promise.prototype.catch() 
- Promise.prototype.finally()
- Promise.all()
- Promise.race()
- Promise.allSettled()
- Promise.any()
- Promise.resolve()
- Promise.reject()
- Promise.try()

### 总结

这里就不一一介绍啦，大家可以参考阮一峰老师的文章 [ES6入门-Promise对象](http://es6.ruanyifeng.com/#docs/promise)  
这篇文章给大家讲解的Promise/A+规范的源码，希望大家能多读多写，深刻的体会一下源码的思想，对以后的开发也很有帮助。  
感谢大家的阅读，觉得还不错，辛苦点一下Star，以后还不不断更新高质量内容。 
非常感谢！   

![搬砖皮卡丘](https://github.com/zero7room/MyPromise/blob/master/img/pk.jpg)   

