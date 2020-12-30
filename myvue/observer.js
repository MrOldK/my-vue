class Observer {
    constructor (data) {
        this.observe(data)
    }

    testDep = []

    observe (data) {
        if (!this.utils.isObject(data)) throw Error('data must be a [object Object]')
       
        Object.keys(data).forEach((key) => {
            this.defineReactive(data, key, data[key])

            // 如果key还是对象，递归劫持
            if (this.utils.isObject(data[key])) {
                this.observe(data[key])
            }
        })
        
    }

    // 数据劫持并添加依赖和观察者
    // 重点思考： 何时添加依赖，何时添加观察者，何时通知观察者更新视图以及观察者如何更新视图
    // 还有最重要的一点，如何将依赖收集器和观察者关联起来
    // 到这一步，mok的脑子基本散架， ~~~OMG
    defineReactive (data, key, value) {
        // 依赖收集器，专门收集watcher
        const dep = new Dep()

        Object.defineProperty(data, key, {
            enumerable: true,
            configurable: false,
            get: () => {
                // 初始化时，添加依赖，每一个值都对应一个watcher
                // mok友情提醒，这里只是添加一个watcher，达到数据和watcher一一对应
                Dep.target && dep.addSub(Dep.target)
                // this.testDep.push(Dep.target)
                // console.log(this.testDep)
                return value
            },
            set: (newVal) => {
                if (newVal !== value) {
                    value = newVal
                }

                // 修改的新值，再次进行劫持
                // mok友情提示：这一步很重要，不然重新赋值为另一个对象，无法继续监听
                if (this.utils.isObject(newVal)) {
                    this.observe(newVal)
                }

                // 修改值时，通知观察者更新视图
                // 做到这里，mok思考很长时间，如何把更改后的数据重新渲染到页面上，
                // 也就是watcher如何执行数据更新后的callback，这个callback在哪添加
                dep.notify()
            }
        })
    }

    utils = {
        isObject (data) {
            return Object.prototype.toString.call(data) === '[object Object]'
        }
    }
}