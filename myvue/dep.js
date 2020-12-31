class Dep {
    constructor () {
        // 依赖收集
        this.subs = []
    }

    // 添加观察者，每一个watcher实例都会对应一个更新函数，用来更新视图
    addSub (watcher) {
        this.subs.push(watcher)
    }

    // 通知观察者，也就是让观察者去更新视图
    notify () {
        // console.log('观察者', this.subs)
        this.subs.forEach((watcher) => {
            watcher.update()
        })
    }
}