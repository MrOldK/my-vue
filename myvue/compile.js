// 双大括号正则表达式
const bigExprRegExp = /\{\{(.+?)\}\}/g

const compileUtils = {
    // expr: msg, person.name
    getVal (expr, vm) {
        return expr.split('.').reduce((preSum, currentItem) => {
            return preSum[currentItem]
        }, vm.$data)
    },

    // 双向数据绑定,input输入框修改值
    setVal (expr, vm, val) {
        expr.split('.').reduce((preSum, currentItem) => {
            preSum[currentItem] = val
        }, vm.$data)
    },

    //expr: {{msg}}, {{person.name}}--{{person.age}}
    getContentVal (expr, vm) {
        return expr.replace(bigExprRegExp, (...args) => {
            return this.getVal(args[1], vm)
        })
    },

    // 判断出是哪种指令后，再调用指令对应的更新视图方法，最后更新视图
    text (node, expr, vm) {
        let val = ''
        // 处理双大括号
        if (expr.indexOf('{{') > -1) {
            // {{person.name}}--{{person.age}} => value--value
            val = expr.replace(bigExprRegExp, (...args) => {
                // text内部添加watcher有两个坑点
                // 1. watcher内部需要的是person.name这种形式，而不是{{person.name}}这种带大括号的形式
                // 2. 传入的newVal，应该是基于{{person.name}}这种形式重新计算获取的值
                new Watcher(args[1], vm, () => {
                    this.updater.textUpdater(node, this.getContentVal(expr, vm))
                })
                return this.getVal(args[1], vm)
            })
        }

        // 处理 msg, person.name
        else {
            new Watcher(expr, vm, () => {
                this.updater.textUpdater(node, this.getVal(expr, vm))
            })
            val = this.getVal(expr, vm)
        }
        
        this.updater.textUpdater(node, val)
    },

    html (node, expr, vm) {
        const val = this.getVal(expr, vm)
        new Watcher(expr, vm, (newVal) => {
            this.updater.htmlUpdater(node, newVal)
        })
        this.updater.htmlUpdater(node, val)
    },

    model (node, expr, vm) {
        const val = this.getVal(expr, vm)
        // 视图 => 数据
        node.addEventListener('input', (e) => {
            this.setVal(expr, vm, e.target.value)
        }, false)

        // 视图 => 数据 => 视图
        new Watcher(expr, vm, (newVal) => {
            this.updater.modelUpdater(node, newVal)
        })

        this.updater.modelUpdater(node, val)
    },

    on (node, expr, vm, eventName) {
        // 绑定事件
        const fn = vm.$options.methods[expr]
        node.addEventListener(eventName, fn.bind(vm), false)
    },

    updater: {
        textUpdater (node, value) {
            node.textContent = value
        },

        htmlUpdater (node, value) {
            node.innerHTML = value
        },

        modelUpdater (node, value) {
            node.value = value
        }
    }
}

/*
编译这一步，太伤脑了，尤其是细节的处理，太多了。mok总结重点=>
1. 将根节点的所有子节点都添加到文档碎片中
2. 文档碎片中的子节点编译完，再添加到根节点中。
3. 对元素的处理，如何拿到指令，根据什么拿到指令，指令对应的值，如何获取值
4. 对v-on:click,@click的特殊处理
5. 对文本节点的特殊处理，{{msg}}, {{person.name}} {{person.name}}--{{person.age}}
6. 对其他节点类型的处理：
    nodeType=1 => 元素类型 (Element)
    nodeType=2 => attr类型（这个肯定不用处理）(attr)
    nodeType=3 => 文本节点 (text)
    nodeType=8 => 注释节点 (comment)
    nodeType=9 => 文档根节点 (Document)
7. 处理完成以后，删除指令属性
*/
class Compile {
    constructor (el, vm) {
        this.el = el
        this.vm = vm

        // 如果传入的el是一个element元素，则直接用，如果是一个选择器，则找到对应的元素
        this.el = this.utils.isElementNode(this.el) ? el : document.querySelector(el)
        
        // 生成一个文档碎片，所有的dom操作都是在fragment这里完成，减少重绘和重排
        const fragment = this.nodesToFragment(this.el)

        // 开始编译
        this.compile(fragment)

        // 将fragment添加到根节点el
        this.el.appendChild(fragment)
    }

    // 将nodes转换成fragment
    nodesToFragment (node) {
        const childs = node.childNodes
        const f = document.createDocumentFragment()

        // 将根节点的所有子节点添加到fragment中，并返回fragment
        this.utils.toArray(childs).forEach((child) => {
            f.appendChild(child)
        })

        return f
    }

    // 编译元素节点指令 v-text v-html v-model v-on:click @click v-bind:class :class
    compileElement (node) {
        const attrs = node.attributes

        this.utils.toArray(attrs).forEach((attr) => {
            // 例：{v-text, msg}
            const {name, value} = attr

            // v-指令形式
            if (this.utils.isDirective(name, 'v-')) {
                // 例：v-text v-on:click
                const [,directive] = name.split('v-')
                // 例：[on, click]
                const [dirName, eventName] = directive.split(':')

                // 数据 => 视图
                compileUtils[dirName](node, value, this.vm, eventName)

                // 删除v-指令
                node.removeAttribute(`v-${directive}`)
            }
            
            // @指令形式
            else if (this.utils.isDirective(name, '@')) {
                // 例：@click
                const [,eventName] = name.split('@')

                // 直接调用on函数，进行事件监听
                compileUtils['on'](node, value, this.vm, eventName)

                // 删除@指令
                node.removeAttribute(`@${eventName}`)
            }

            // :开头指令形式
            else if (this.utils.isDirective(name, ':')) {
                // 处理绑定数据
            }
        })
    }

    // 编译文本节点，三种形式：{{msg}} {{person.name}} {{person.name}}--{{person.age}}
    compileText (node) {
        const textContent = node.textContent
        if (this.utils.isBigExpr(textContent)) {
            compileUtils['text'](node, textContent, this.vm)
        }
    }

    // 编译函数
    compile (fragment) {
        const childNodes = fragment.childNodes

        this.utils.toArray(childNodes).forEach((child) => {
            // 元素节点
            if (this.utils.isElementNode(child)) {
                this.compileElement(child)
            } 

            // 文本节点
            else if (this.utils.isTextNode(child)) {
                this.compileText(child)
            }

            // 其他节点
            else {
                fragment.removeChild(child)
            }

            // 递归遍历child的childNodes
            if (child.childNodes && childNodes.length) {
                this.compile(child)
            }
            
        })
    }

    // 工具类
    utils = {
        // 是否是Comment 注释节点
        isComment (node) {
            return node.nodeType === 8
        },

        // 是否是元素节点
        isElementNode (node) {
            return node.nodeType === 1
        },

        // 是否是文本节点
        isTextNode (node) {
            return node.nodeType === 3
        },

        // 将节点转换成数组
        toArray (nodes) {
            return Array.from(nodes)
        },

        // 属性是否是指令 v-或者@或者:开头
        isDirective (attr, directive) {
            return attr.startsWith(directive)
        },

        // 是否是双大括号表达式
        isBigExpr (content) {
            return bigExprRegExp.test(content)
        }
    }
}