const compileUtil = {
    toAttray (a) {
        return Array.from(a)
    },

    // 处理person.name这种形式
    getVal (expr, vm) {
        return expr.split('.').reduce((preSum, currentItem) => {
            return preSum[currentItem]
        }, vm.$data)
    },

    text (node, expr, vm) {
        let val = ''
        if (expr.indexOf('{{') > -1) {
            val = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
                return this.getVal(args[1], vm)
            })
        } else {
           val = this.getVal(expr, vm)
        }
        this.updater.updaterText(node, val)
    },

    html (node, expr, vm) {
        const val = this.getVal(expr, vm)
        new Watcher(vm, expr, (newVal) => {
            this.updater.updaterHtml(node, newVal)
        })
        this.updater.updaterHtml(node, val)
    },

    model (node, value, vm) {

    },

    on (node, value, vm, eventName) {
        let fn = vm.$options.methods[value]
        if (fn) {
            node.addEventListener(eventName, fn.bind(vm), false)
        }
    },

    updater: {
        updaterText (node, val) {
            node.textContent = val
        },

        updaterHtml (node, val) {
            node.innerHTML = val
        }
    }
}

// 订阅者
class Watcher {
    constructor (vm, expr, cb) {
        this.vm = vm
        this.expr = expr
        this.cb = cb
        this.oldVal = this.getOldVal()
    }

    getOldVal () {
        Dep.target = this
        const oldVal = compileUtil.getVal(this.expr, this.vm)
        Dep.target = null
        return oldVal
    }

    update () {
        const newVal = compileUtil.getVal(this.expr, this.vm)
        if (newVal !== this.oldVal) {
            this.cb(newVal)
        }
    }
}


// 依赖收集
class Dep {
    constructor () {
        this.subs = []
    }

    // 收集观察者
    addSub (watcher) {
        this.subs.push(watcher)
    }

    // 通知订阅者去更新
    notify () {
        this.subs.forEach((watcher) => {
            watcher.update()
        })
    }
}

class Observer {
    constructor (data) {
        this.observe(data)
    }

    observe (data) {
        if (Object.prototype.toString.call(data) === '[object Object]') {
            Object.keys(data).forEach((key) => {
                this.defineReactive(data, key, data[key])
            })
        }
    }

    defineReactive (obj, key, value) {
        this.observe(value)
        const dep = new Dep()
        Object.defineProperty(obj, key, {
            enumerable: true,
            configureable: false,
            writeable: true,
            get () {
                // 订阅数据变化，往dep中添加订阅者
                Dep.target && dep.addSub(Dep.target)
                return value
            },
            set: (newVal) => {
                this.observe(newVal) // 如果值是一个对象，则从新设置get和set
                if (newVal !== value) {
                    value = newVal
                }
                // 数据更改，依赖收集器通知变化
                dep.notify()
            }
        })
    }
}

class Compile {
    constructor (el, vm) {
        this.el = this.isElementNode(el) ? el : document.querySelector(el)
        this.vm = vm

        const frag = this.nodeToFragment(this.el)
        // 编译fragment
        this.compile(frag)
        // 将fragment添加到根节点中
        this.el.appendChild(frag)
    }

    compile (frag) {
        const childNodes = frag.childNodes
        childNodes.forEach((child) => {
            // 元素节点
            if (this.isElementNode(child)) {
                this.compileElement(child)
            } else {
            // 文本节点
                this.compileText(child)
            }
            // 递归遍历
            if (child.childNodes && child.childNodes.length) {
                this.compile(child)
            }
        })
    }

    compileElement (node) {
        const attrs = node.attributes
        compileUtil.toAttray(attrs).forEach((attr) => {
            const {name, value} = attr
            // 是否是指令 v-text v-html v-model v-on:click @click
            if (this.isDirective(name)) {
                const direct = name.split('-')[1]
                const [dirName, eventName] = direct.split(':') // v-on:click也处理了

                // 数据 => 视图
                compileUtil[dirName](node, value, this.vm, eventName)

                // 删除vue指令
                node.removeAttribute('v-' + direct)
            } else if (this.isEventBind(name)) { // 处理@ 绑定事件
                const [, eventName] = name.split('@') 
                compileUtil['on'](node, value, this.vm, eventName)
            }
        })
    }

    compileText (node) {
        const reg = /\{\{(.+?)\}\}/g
        let content = node.textContent
        if (reg.test(content)) {
            compileUtil['text'](node, content, this.vm)
        }
    }

    isDirective (attrName) {
        return attrName.startsWith('v-')
    }
    
    isEventBind (attrName) {
        return attrName.startsWith('@')
    }

    nodeToFragment (el) {
        const fragment = document.createDocumentFragment()
        Array.from(el.childNodes).forEach((node) => {
            fragment.appendChild(node)
        })
        return fragment
    }

    isElementNode (node) {
        return node.nodeType === 1
    }
}

class Vue {
    constructor (options) {
        this.$el = options.el
        this.$data = options.data
        this.$options = options

        if (this.$el) {
            new Compile(this.$el, this)
            new Observer(this.$data)
        }
    }
}