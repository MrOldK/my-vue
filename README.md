# my-vue
试着自己写一个vue的响应式

# 基于vue响应式的结构： 数据劫持 + 发布订阅模式

![响应式原理](./images/reactive.png)

# 目标

1. 实现一个Observer => 数据劫持， 添加依赖
2. 实现一个Compiler => 编译模板，添加观察者
3. 实现一个Watcher => 数据对比，更新模板
4. 实现一个Dep => 依赖收集，通知观察者
5. 实现一个Updater => 更新视图
