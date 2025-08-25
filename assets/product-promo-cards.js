function getProductsFromDOM() {
  const list = document.querySelector('.product-promo-list');
  if (!list) return [];
  try {
    return JSON.parse(list.getAttribute('data-products'));
  } catch (e) {
    return [];
  }
}

// 只负责事件绑定，不做任何 DOM 渲染

// 事件委托
function setupProductPromoEvents() {
  var promoList = document.querySelector('.product-promo-list');
  if (!promoList) return;
  promoList.addEventListener('click', function(e) {
    const card = e.target.closest('.product-card');
    if (!card) return;
    // 颜色选择
    if (e.target.classList.contains('color-dot')) {
      card.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('selected'));
      e.target.classList.add('selected');
      // 切换图片
      const variantId = e.target.getAttribute('data-variant-id');
      const variantsJson = card.getAttribute('data-variants-json');
      if (variantsJson) {
        try {
          const variants = JSON.parse(variantsJson);
          const variant = variants.find(v => String(v.id) === String(variantId));
          if (variant && variant.featured_image) {
            const img = card.querySelector('.product-image');
            if (img) {
              // Shopify 7.0+ featured_image 结构
              if (typeof variant.featured_image === 'object' && variant.featured_image.src) {
                img.src = variant.featured_image.src.replace(/(\.[a-z]+)$/i, '_400x$1');
              } else if (typeof variant.featured_image === 'string') {
                img.src = variant.featured_image.replace(/(\.[a-z]+)$/i, '_400x$1');
              }
            }
          }
        } catch (e) {}
      }
      // 切换颜色名称
      const colorLabel = card.querySelector('.color-name');
      if (colorLabel) {
        colorLabel.textContent = 'Color: ' + e.target.getAttribute('data-color-name');
      }
      // 切换颜色后同步最大库存
      // 获取当前变体库存
      let maxQty = null;
      if (variantId) {
        try {
          const variants = JSON.parse(variantsJson);
          const variant = variants.find(v => String(v.id) === String(variantId));
          if (variant && typeof variant.inventory_quantity !== 'undefined') {
            maxQty = parseInt(variant.inventory_quantity, 10);
          }
        } catch (e) {}
      }
      if (!maxQty) {
        maxQty = parseInt(card.getAttribute('data-inventory'), 10) || 9999;
      }
      // 如果当前数量大于库存，自动回落
      const valueEl = card.querySelector('.qty-value');
      let value = parseInt(valueEl.textContent, 10);
      if (value > maxQty) {
        valueEl.textContent = maxQty;
      }
    }
    // 数量加减
    if (e.target.classList.contains('qty-btn')) {
      const valueEl = card.querySelector('.qty-value');
      let value = parseInt(valueEl.textContent, 10);
      // 获取当前变体库存
      let maxQty = null;
      const selectedColor = card.querySelector('.color-dot.selected');
      const variantsJson = card.getAttribute('data-variants-json');
      if (variantsJson) {
        try {
          const variants = JSON.parse(variantsJson);
          let variantId = null;
          if (selectedColor) {
            variantId = selectedColor.getAttribute('data-variant-id');
          } else {
            variantId = card.getAttribute('data-variant-id');
          }
          const variant = variants.find(v => String(v.id) === String(variantId));
          if (variant && typeof variant.inventory_quantity !== 'undefined') {
            maxQty = parseInt(variant.inventory_quantity, 10);
          }
        } catch (e) {}
      }
      if (!maxQty) {
        // 兜底：用主卡片的data-inventory
        maxQty = parseInt(card.getAttribute('data-inventory'), 10) || 9999;
      }
      if (e.target.classList.contains('plus')) {
        if (value < maxQty) {
          value++;
        } else {
          alert('库存不足');
        }
      }
      if (e.target.classList.contains('minus')) value = Math.max(1, value - 1);
      valueEl.textContent = value;
    }
    // 加入购物车
    if (e.target.classList.contains('add-to-cart')) {
      // 获取选中的变体 id
      let variantId = null;
      const selectedColor = card.querySelector('.color-dot.selected');
      if (selectedColor) {
        variantId = selectedColor.getAttribute('data-variant-id');
      }
      // 如果没有颜色选项，默认取第一个变体
      if (!variantId) {
        variantId = card.getAttribute('data-variant-id');
        if (!variantId) {
          // 兼容旧结构，尝试从 product 对象获取
          const productId = card.getAttribute('data-id');
          alert('未找到变体 ID，无法加入购物车');
          return;
        }
      }
      // 获取数量
      const qty = parseInt(card.querySelector('.qty-value').textContent, 10) || 1;
      // 调用 Shopify Cart API
      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ id: variantId, quantity: qty })
      })
      .then(res => res.json())
      .then(data => {
        // 触发购物车弹窗或刷新
        document.dispatchEvent(new CustomEvent('cart:refresh'));
        // 打开购物车弹窗
        var cartDrawer = document.getElementById('Cart-Drawer');
        if (cartDrawer && typeof cartDrawer.open === 'function') {
          cartDrawer.open();
        } else {
          document.dispatchEvent(new CustomEvent('cart-drawer:open'));
          document.dispatchEvent(new CustomEvent('cart:open'));
        }
      })
      .catch(err => {
        alert('加入购物车失败');
      });
    }
  });

  // 默认高亮第一个 color-dot 并显示其名称
  document.querySelectorAll('.product-card').forEach(function(card) {
    const colorDots = card.querySelectorAll('.color-dot');
    const colorName = card.querySelector('.color-name');
    if (colorDots.length && colorName) {
      colorDots.forEach(dot => dot.classList.remove('selected'));
      colorDots[0].classList.add('selected');
      colorName.textContent = 'Color: ' + colorDots[0].getAttribute('data-color-name');
    }
  });
}

// 初始化
window.addEventListener('DOMContentLoaded', function() {
  setupProductPromoEvents();
}); 