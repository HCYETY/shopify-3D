document.addEventListener('DOMContentLoaded', function() {

  // 事件委托绑定点击事件
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.bestseller-add-to-cart');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    var variantId = btn.getAttribute('data-variant-id');
    if (!variantId) {
      alert('未配置变体ID');
      return;
    }
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity: 1 })
    })
    .then(function(res) {
      if (!res.ok) return res.json().then(err => { throw err; });
      return res.json();
    })
    .then(function(data) {
      // 加购成功后强制刷新cart-drawer section内容
      var sections = 'cart-drawer,cart-bubble';
      fetch(window.location.pathname + '?sections=' + sections)
        .then(res => res.text())
        .then(state => {
          var parsedState = JSON.parse(state);
          var cartDrawer = document.getElementById('Cart-Drawer');
          if (cartDrawer) {
            var drawerSection = cartDrawer.querySelector('.cart-drawer') || cartDrawer;
            if (parsedState['cart-drawer']) {
              drawerSection.innerHTML = new DOMParser().parseFromString(parsedState['cart-drawer'], 'text/html').querySelector('.cart-drawer').innerHTML;
            }
            if (typeof cartDrawer.removeProductEvent === 'function') {
              cartDrawer.removeProductEvent();
            }
            if (typeof cartDrawer.open === 'function') {
              cartDrawer.open();
            } else {
              document.dispatchEvent(new CustomEvent('cart-drawer:open'));
            }
          } else {
            document.dispatchEvent(new CustomEvent('cart-drawer:open'));
          }
        });
    })
    .catch(function(err) {
      alert('加购失败：' + (err && err.description ? err.description : '未知错误'));
    });
  }, true);
}); 