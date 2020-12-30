class Vue {
    constructor (options) {
        this.$el = options.el
        this.$data = options.data
        this.$options = options

        // 开始编译
        if (this.$el) {
            // 数据劫持，添加依赖和观察者
            new Observer(this.$data)

            // 编译模板
            new Compile(this.$el, this)

            // 代理this，在methods方法中，能直接使用this.msg这种方式
            this.proxyData(this.$data)
        }
    }

    proxyData (data) {
        for (let key in data) {
            Object.defineProperty(this, key, {
                get () {
                    return data[key]
                },
                set (newVal) {
                    data[key] = newVal
                }
            })
        }
    }
}