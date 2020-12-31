
/**
 * watcher的核心功能就是对比数据的差异，然后再去更新视图。
 * 所以，得有一个方法去获取修改之前的数据，然后跟修改后的数据进行比较。
 * 之前的数据从哪里获得呢？？从vm中获取，所以，constructor中得传入一个vm以及数据对应的key
 * 这里思考一下，修改后的值怎么获取？修改之前的值是在new Watcher的时候，直接在constructor中用getVal获取的。
 * 而修改后的值应该在调用update的时候，更新视图之前获取。
 * 更新视图的方法就是在new Watcher的时候，传进来的，更新视图就是调用这个方法，其实也就是compile.js中更新视图的方法
 */
class Watcher {
    constructor (expr, vm, cb) {
        this.expr = expr // 数据对应的key
        this.vm = vm // Vue实例，用于获取数据
        this.cb = cb // 数据更新的回调，也就是调用compile.js中更新视图的方法
        
        this.oldVal = this.getOldVal(this.expr, this.vm)
    }

    // 对比数据差异，更新视图
    update () {
        const newVal = this.getNewVal(this.expr, this.vm)
        console.log('===')
        console.log(newVal)
        console.log(this.oldVal)
        if (newVal !== this.oldVal) {
            this.cb(newVal)
        }
    }

    // 获取修改之前的数据，这个方法就是compile.js中的getVal方法
    getOldVal (expr, vm) {
        /**
         * Dep.target = this
         * 这一步非常非常重要，将依赖收集器和观察者关联了起来。
         */ 
        Dep.target = this
        const oldVal = expr.split('.').reduce((preSum, currentItem) => {
            return preSum[currentItem]
        }, vm.$data)
        Dep.target = null
        return oldVal
    }

    getNewVal (expr, vm) {
        const oldVal = expr.split('.').reduce((preSum, currentItem) => {
            return preSum[currentItem]
        }, vm.$data)
        return oldVal
    }
}