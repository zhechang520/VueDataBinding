/**
 * Vue构造函数
 */
function Vue(options) {
  this.data = options.data;

  console.log(options)
  // 发布者-订阅者模式的数据绑定实现
  observer(this.data, this);

  // 编译, 插入到DOM
  let el = options.el;
  let dom = nodeToFragment(document.querySelector(el), this);
  document.querySelector(el).appendChild(dom);
}

/**
 * 声明主体对象,该对象作为数据中心, 以"Dep“对象为载体处理数据
 */
let Dep = function () {
  this.subs = [];
  // 添加观察者
  this.addSub = function (sub) {
    this.subs.push(sub);
  }
  // 发送通知更新
  this.notify = function () {
    this.subs.forEach(function (sub) {
      sub.update();
    });
  }
}

/**
 * 遍历处理传入的Data对象,将其转换成Vue的访问器属性
 */
function observer(data, vm) {
  Object.keys(data).forEach(function (key) {
    defineReactive(vm, key, data[key]);
  });
}

/**
 * 设置访问器属性
 */
function defineReactive(obj, key, val) {

  let dep = new Dep();

  // Object.defineProperty([对象],[属性],{value:值}})
  // 这里的值使用的是js原生的get,set函数, 当改变一个对象值的时候，会默认调用set函数,从而达到修改数据的目的
  Object.defineProperty(obj, key, {
    get: function () {
      // Dep.target指针指向watcher，增加订阅者watcher到主体对象Dep
      if (Dep.target) {
        dep.addSub(Dep.target);
      }
      return val;
    },
    // set函数传入一个新值
    set: function (newValue) {
      if (newValue === val) {
        return;
      }
      val = newValue;
      // 通知订阅者列表中的观察者
      dep.notify();
    }
  })
}

/**
 * 监听修改
 */
function watcher(vm,node,name) {
  //让全局变量Dep的target属性的指针指向该watcher实例
  Dep.target = this;
  this.vm = vm;
  this.node = node;
  this.name = name;

  // 执行修改
  this.update();
  Dep.target = null;
}

// 观察者使用update方法，实际上是
watcher.prototype = {
  update: function () {
    this.get();
    this.node.nodeValue = this.value;
  },
  //获取data中的属性值 
  get: function () {
    this.value = this.vm[this.name]; //触发相应属性的get
  }
}

/**
 * 处理文档
*/
function nodeToFragment(node, vm) {
  let flag = document.createDocumentFragment();
  let childElement = null;
  while (childElement = node.firstChild) {
    //先编译所有的子节点，再劫持到文档片段中
    compile(childElement, vm);
    flag.appendChild(childElement);
  }
  return flag;
}

/**
 * 编译节点，初始化绑定
 */
function compile(node, vm) {
  //该正则匹配的是 ：{{任意内容}}
  var reg = /\{\{(.*)\}\}/;
  //节点类型为元素
  if (node.nodeType === 1) {
    var attr = node.attributes;
    //解析属性，不同的属性不用的处理方式，这里只写了v-model属性
    for (var i = 0; i < attr.length; i++) {
      if (attr[i].nodeName == "v-model") {
        //获取节点中v-model属性的值，也就是绑定的属性名
        var name = attr[i].nodeValue;

        node.addEventListener("input", function (e) {
          //当触发input事件时改变vue.data中相应的属性的值，进而触发该属性的set方法
          vm[name] = e.target.value;
        });
        //改变之后，通过属性名取得数据
        node.value = vm.data[name];
        //用完删，所以浏览器中编译之后的节点上没有v-model属性
        node.removeAttribute("v-model");
      }
    }
  }
  //节点类型为text
  if (node.nodeType === 3) {
    //text是否满足文本插值的写法：{{任意内容}}
    if (reg.test(node.nodeValue)) {
      //获取匹配到的字符串：这里的RegExp.$1是RegExp的一个属性
      //该属性表示正则表达式reg中，第一个()里边的内容，也就是
      //{{任意内容}} 中的  文本【任意内容】
      var name = RegExp.$1;
      //去掉前后空格，并将处理后的数据写入节点
      name = name.trim();
      //node.nodeValue = vm.data[name];
      //实例化一个新的订阅者watcher
      new watcher(vm, node, name);
      return;
    }
  }
}