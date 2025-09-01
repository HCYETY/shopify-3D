document.addEventListener("DOMContentLoaded", function () {
  var rulesBtn = document.getElementById("rulesBtn")
  var modalMask = document.getElementById("modalMask")
  var modalClose = document.getElementById("modalClose")

  if (rulesBtn && modalMask && modalClose) {
    rulesBtn.onclick = function () {
      modalMask.classList.add("active")
      document.body.classList.add("modal-active")
    }
    modalClose.onclick = function () {
      modalMask.classList.remove("active")
      document.body.classList.remove("modal-active")
    }
    modalMask.onclick = function (e) {
      if (e.target === this) {
        this.classList.remove("active")
        document.body.classList.remove("modal-active")
      }
    }
    // Also allow closing with the inner close button
    var rulesInnerClose = modalMask.querySelector(".promotion-event-signup-close")
    if (rulesInnerClose) {
      rulesInnerClose.onclick = function () {
        modalMask.classList.remove("active")
        document.body.classList.remove("modal-active")
      }
    }
  }

  // 阻止 social-row 区域的 a 标签被图片灯箱等插件劫持，点击只跳转链接
  // 如果 href 不是图片地址，则阻止事件冒泡，防止被灯箱插件劫持
  document.querySelectorAll(".social-row a").forEach(function (link) {
    link.addEventListener("click", function (e) {
      var href = link.getAttribute("href")
      if (!href.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        e.stopPropagation()
      }
    })
  })

  var thankYouMask = document.getElementById("thankYouMask")
  var thankYouClose = document.getElementById("thankYouClose")
  var form = document.querySelector(".input-row")
  var submitBtn = document.querySelector(".singup-button")

  if (thankYouMask && thankYouClose && form && submitBtn) {
    // 监听表单提交事件
    form.addEventListener("submit", function (e) {
      // 这里不阻止默认提交，让 Shopify 处理
      var emailInput = form.querySelector('input[type="email"]')
      if (!form.checkValidity()) {
        form.reportValidity()
        // 阻止提交
        e.preventDefault()
        return
      }
      var email = emailInput ? emailInput.value.trim() : ""
      var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (email && emailPattern.test(email)) {
        // 提交后弹出感谢弹窗（用 setTimeout 让弹窗在页面跳转前短暂显示，或用 location.search 检查提交结果）
        // 这里建议不弹窗，直接让 Shopify 跳转/刷新
        // thankYouMask.classList.add('active');
      }
      // 不阻止默认提交
    })

    // 关闭弹窗逻辑不变
    thankYouClose.onclick = function () {
      thankYouMask.classList.remove("active")
      document.body.classList.remove("modal-active")
    }
    thankYouMask.onclick = function (e) {
      if (e.target === this) {
        this.classList.remove("active")
        document.body.classList.remove("modal-active")
      }
    }
    var innerClose = thankYouMask.querySelector(".promotion-event-signup-close")
    if (innerClose) {
      innerClose.onclick = function () {
        thankYouMask.classList.remove("active")
        document.body.classList.remove("modal-active")
      }
    }
  }

  // 检查URL参数，自动弹出感谢弹窗
  if (thankYouMask) {
    var search = window.location.search
    if (search.indexOf("customer_posted=true") !== -1) {
      thankYouMask.classList.add("active")
      document.body.classList.add("modal-active")
      // 清除URL参数，避免刷新后重复弹窗
      if (window.history.replaceState) {
        var url = window.location.origin + window.location.pathname + window.location.hash
        window.history.replaceState({}, document.title, url)
      }
    }
  }
})
