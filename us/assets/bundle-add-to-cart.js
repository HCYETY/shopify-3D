document.addEventListener('DOMContentLoaded', function() {
  // 获取商品价格并渲染
  const productHandles = [];
  document.querySelectorAll('.bundle-cart-item').forEach(item => {
    productHandles.push(item.getAttribute('data-handle'));
  });

  // 获取每个商品的首个变体价格
  Promise.all(productHandles.map(handle =>
    fetch(`/products/${handle}.js`).then(res => res.json())
  )).then(products => {
    let totalOld = 0, totalNew = 0;
    products.forEach((product, idx) => {
      const variant = product.variants[0];
      const oldPrice = variant.compare_at_price || variant.price;
      const newPrice = variant.price;
      totalOld += oldPrice;
      totalNew += newPrice;
      const oldPriceEl = document.getElementById('old-price-' + (idx+1));
      if (oldPriceEl) {
        oldPriceEl.textContent = oldPrice > newPrice ? `$${(oldPrice/100).toFixed(2)} USD` : '';
      }
      const newPriceEl = document.getElementById('new-price-' + (idx+1));
      if (newPriceEl) {
        newPriceEl.textContent = `$${(newPrice/100).toFixed(2)} USD`;
      }
    });
    const bundleTotalOldEl = document.getElementById('bundle-total-old');
    if (bundleTotalOldEl) {
      bundleTotalOldEl.textContent = totalOld > totalNew ? `$${(totalOld/100).toFixed(2)} USD` : '';
    }
    const bundleTotalNewEl = document.getElementById('bundle-total-new');
    if (bundleTotalNewEl) {
      bundleTotalNewEl.textContent = `$${(totalNew/100).toFixed(2)} USD`;
    }
  });

  // 批量加入购物车
  var btn = document.getElementById('bundle-cart-btn');
  var btnMobile = document.getElementById('bundle-cart-btn-mobile');
  function setLoading(button, loading) {
    if (!button) return;
    if (loading) {
      button.disabled = true;
      button.dataset.originalText = button.innerHTML;
      button.innerHTML = '<span class="bundle-loading-spinner" style="display:inline-block;width:16px;height:16px;border:2px solid #fff;border-top:2px solid #666;border-radius:50%;animation:spin 1s linear infinite;margin-right:6px;vertical-align:middle;"></span>Loading...';
    } else {
      button.disabled = false;
      if (button.dataset.originalText) button.innerHTML = button.dataset.originalText;
    }
  }
  if (btn) {
    btn.addEventListener('click', async function() {
      var variantIds = Array.from(document.querySelectorAll('.bundle-product-card[data-variant-id]'))
        .map(card => card.getAttribute('data-variant-id'))
        .filter(id => id && !isNaN(Number(id)));
      if (variantIds.length === 0) {
        alert('未配置变体ID，无法加购');
        return;
      }
      setLoading(btn, true);
      if (btnMobile) setLoading(btnMobile, true);
      try {
        for (let variantId of variantIds) {
          const res = await fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: variantId, quantity: 1 })
          });
          if (!res.ok) {
            const err = await res.json();
            throw err;
          }
        }
        fetch('/cart.js')
          .then(res => res.json())
          .then(cart => {
            document.dispatchEvent(new CustomEvent('cart:refresh', { detail: cart }));
            var cartDrawer = document.getElementById('Cart-Drawer');
            if (cartDrawer && typeof cartDrawer.open === 'function') {
              cartDrawer.open();
            } else if (window.Shopify && window.Shopify.theme && window.Shopify.theme.js && window.Shopify.theme.js.CartDrawer) {
              window.Shopify.theme.js.CartDrawer.open();
            } else {
              document.dispatchEvent(new CustomEvent('cart-drawer:open'));
              document.dispatchEvent(new CustomEvent('cart:open'));
            }
          });
      } catch (err) {
        alert('加购失败：' + (err && err.description ? err.description : '未知错误'));
      } finally {
        setLoading(btn, false);
        if (btnMobile) setLoading(btnMobile, false);
      }
    });
  }
  if (btnMobile) {
    btnMobile.addEventListener('click', function() {
      if (btn) btn.click();
    });
  }

  /* 加载动画样式 */
  var style = document.createElement('style');
  style.innerHTML = '@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}';
  document.head.appendChild(style);
}); 