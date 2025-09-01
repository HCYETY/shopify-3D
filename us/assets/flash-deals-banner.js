document.addEventListener("DOMContentLoaded", function () {
  // 读取配置的起止时间
  var banner = document.querySelector(".flash-deals-banner")
  var startStr = banner.getAttribute("data-countdown-start")
  var endStr = banner.getAttribute("data-countdown-end")
  var autoSlideHours = parseInt(banner.getAttribute("data-auto-slide-hours")) || 6
  // 解析为 Date
  var startDate = new Date(startStr.replace(/-/g, "/"))
  var endDate = new Date(endStr.replace(/-/g, "/"))
  var totalMs = endDate - startDate
  var totalHours = totalMs / (1000 * 60 * 60)

  function updateCountdown() {
    var now = new Date()
    // 进度条百分比
    var elapsedMs = now - startDate
    if (elapsedMs < 0) elapsedMs = 0
    if (elapsedMs > totalMs) elapsedMs = totalMs
    var percent = (elapsedMs / totalMs) * 100

    // 设置真实的进度条宽度（带动画）
    var bar = document.getElementById("fd-bar")
    if (bar) {
      animateProgressBar(bar, percent)
    } else {
      console.error("进度条元素未找到")
    }

    // 根据进度条百分比更新dot的active状态在动画中处理

    // 倒计时
    var distance = endDate - now
    if (distance < 0) distance = 0
    var days = Math.floor(distance / (1000 * 60 * 60 * 24))
    var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
    var seconds = Math.floor((distance % (1000 * 60)) / 1000)
    document.getElementById("fd-days").textContent = String(days).padStart(2, "0")
    document.getElementById("fd-hours").textContent = String(hours).padStart(2, "0")
    document.getElementById("fd-minutes").textContent = String(minutes).padStart(2, "0")
    document.getElementById("fd-seconds").textContent = String(seconds).padStart(2, "0")
  }

  // 先初始化必要的变量
  var dots = document.querySelectorAll(".fd-progress-dot")
  var labels = document.querySelectorAll(".fd-step-label")
  var dates = document.querySelectorAll(".fd-step-date")
  var stages = dots.length

  var currentProgressWidth = null // 记录当前进度条宽度，null表示首次加载
  var isAnimating = false // 标记是否正在执行动画

  // 立即执行一次更新，确保进度条正确显示
  updateCountdown()
  // 设置定时器持续更新
  setInterval(updateCountdown, 1000)

  function updateActiveDots(progressPercent) {
    // 根据进度百分比计算经过了哪些dot
    for (var i = 0; i < stages; i++) {
      var dotPosition = (i * 100) / (stages - 1) // dot的位置百分比
      var hasPassed = progressPercent >= dotPosition

      // 设置dot的active状态
      dots[i].classList.toggle("fd-progress-dot-active", hasPassed)
      // 设置label和date的active状态
      labels[i].classList.toggle("active", hasPassed)
      dates[i].classList.toggle("active", hasPassed)
    }
  }

  function animateProgressBar(bar, targetPercent) {
    // 确保目标百分比是有效数值
    if (isNaN(targetPercent) || targetPercent < 0) {
      targetPercent = 0
    }
    if (targetPercent > 100) {
      targetPercent = 100
    }

    var startWidth = currentProgressWidth
    var targetWidth = targetPercent

    // 如果是首次加载，从0开始动画到目标位置
    if (currentProgressWidth === null) {
      startWidth = 0
      bar.style.width = "0%"
      // 重置所有dot状态
      updateActiveDots(0)
      console.log("首次加载，从0%动画到:", targetPercent + "%")
    }

    // 如果目标宽度和当前宽度相同，或者正在动画中，不需要新动画
    if ((startWidth !== null && Math.abs(targetWidth - startWidth) < 0.01) || isAnimating) {
      // 即使不需要动画，也要确保dot状态正确
      if (startWidth !== null) {
        updateActiveDots(targetWidth)
      }
      return
    }

    isAnimating = true // 开始动画
    var startTime = Date.now()
    var duration = currentProgressWidth === null ? 2000 : 800 // 首次加载2秒，后续更新0.8秒

    function animate() {
      var elapsed = Date.now() - startTime
      var progress = Math.min(elapsed / duration, 1)

      // 使用缓动函数（ease-out）
      var easeProgress = 1 - Math.pow(1 - progress, 3)

      var currentWidth = startWidth + (targetWidth - startWidth) * easeProgress
      bar.style.width = currentWidth + "%"
      currentProgressWidth = currentWidth

      // 在动画过程中实时更新dot的active状态
      updateActiveDots(currentWidth)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        // 动画完成，确保最终值正确
        currentProgressWidth = targetWidth
        isAnimating = false // 动画结束
        // 确保最终状态正确
        updateActiveDots(targetWidth)
      }
    }

    animate()
  }
})
