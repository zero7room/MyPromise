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
            if (value instanceof Promise) {
                return value.then(resolve, reject)
            }
            if (that.status === 'PENDING') {
                that.status = 'RESOLVED';
                that.value = value;
                that.resolvedCallbacks.map(cb => cb(that.value));
            }
        }
        function reject(value) {
            if (that.status === 'PENDING') {
                that.status = 'REJECTED';
                that.value = value;
                that.rejectedCallbacks.map(cb => cb(that.value));
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