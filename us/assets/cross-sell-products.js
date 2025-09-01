/**
 * Cross-sell products functionality
 * Adds selected cross-sell products to cart when the main product is added
 */
class CrossSellProducts {
  constructor() {
    this.init()
  }

  init() {
    // Elements
    this.crossSellCheckboxes = document.querySelectorAll(".cross-sell-products--checkbox")
    this.crossSellItems = document.querySelectorAll(".cross-sell-products--item")
    this.quantitySelectors = document.querySelectorAll(".cross-sell-quantity-selector")
    this.addToCartForms = document.querySelectorAll('form[data-type="add-to-cart-form"]')

    // Store original checkout URL to be able to restore it later
    this.originalCheckoutUrl =
      window.Shopify && window.Shopify.routes ? window.Shopify.routes.root + "checkout" : "/checkout"

    if (this.crossSellCheckboxes.length > 0 && this.addToCartForms.length > 0) {
      this.setupEventListeners()
      this.setupQuantitySelectors()
      this.monitorDynamicCheckoutButtons()
    }
  }

  setupEventListeners() {
    // Initialize global tracking variable
    window.lastBuyNowButtonClickTime = 0

    // Handle all forms and buttons
    this.addToCartForms.forEach((form) => {
      // Regular form submission (Add to Cart button)
      form.addEventListener("submit", this.handleFormSubmit.bind(this))

      // Buy Now button
      const buyNowButton = form.querySelector(".shopify-payment-button__button")
      if (buyNowButton) {
        // Use capture phase to intercept the click before Shopify's event handlers
        buyNowButton.addEventListener(
          "click",
          (e) => {
            // Record the click time for detection in form submit
            window.lastBuyNowButtonClickTime = Date.now()
            this.handleBuyNowClick(e)
          },
          true
        )
      }

      // Also track all other payment buttons that might be dynamically added
      const paymentButtonsContainer = form.querySelector(".shopify-payment-button")
      if (paymentButtonsContainer) {
        paymentButtonsContainer.addEventListener(
          "click",
          (e) => {
            if (
              e.target.classList.contains("shopify-payment-button__button") ||
              e.target.closest(".shopify-payment-button__button")
            ) {
              window.lastBuyNowButtonClickTime = Date.now()
            }
          },
          true
        )
      }

      // Pre-order button (uses the same class as Add to Cart but different text)
      const preOrderButton = form.querySelector(".single-add-to-cart-button")
      if (preOrderButton) {
        // Instead of adding another event listener, we'll handle this in the form submit
        // But we need to note that we have a pre-order button
        if (preOrderButton.textContent.trim().toLowerCase().includes("pre-order")) {
          form.dataset.isPreOrder = "true"
        }
      }
    })

    // Add event listeners to checkboxes for visual selection
    this.crossSellCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", this.handleCheckboxChange.bind(this))
    })

    // Add global event listener to catch all checkout redirects
    document.addEventListener(
      "click",
      (event) => {
        // Look for checkout buttons or links that might bypass our handlers
        const target = event.target.closest('a[href*="checkout"], button[data-checkout]')
        if (target && this.getSelectedProducts().length > 0) {
          event.preventDefault()
          event.stopPropagation()

          // Get the active form
          const activeForm = document.querySelector('form[data-type="add-to-cart-form"]')
          if (!activeForm) return

          const mainProductInput = activeForm.querySelector('input[name="id"]')
          if (!mainProductInput) return

          const mainProductId = mainProductInput.value
          const mainProductQuantity = activeForm.querySelector('input[name="quantity"]')?.value || 1

          // Add products to cart then redirect
          this.addProductsToCartThenRedirect(activeForm, mainProductId, mainProductQuantity, this.getSelectedProducts())
        }
      },
      true
    )
  }

  setupQuantitySelectors() {
    // Set up quantity selectors for each cross-sell item
    this.quantitySelectors.forEach((selector) => {
      const minusButton = selector.querySelector(".minus")
      const plusButton = selector.querySelector(".plus")
      const input = selector.querySelector("input")
      const minValue = parseInt(selector.dataset.min || 1, 10)
      const maxValue = parseInt(selector.dataset.max || 9999, 10)

      // Minus button
      minusButton.addEventListener("click", () => {
        const currentValue = parseInt(input.value, 10)
        if (currentValue > minValue) {
          input.value = currentValue - 1
          this.updateQuantityButtonStates(selector)
        }
      })

      // Plus button
      plusButton.addEventListener("click", () => {
        const currentValue = parseInt(input.value, 10)
        if (currentValue < maxValue) {
          input.value = currentValue + 1
          this.updateQuantityButtonStates(selector)
        }
      })

      // Input change
      input.addEventListener("change", () => {
        let currentValue = parseInt(input.value, 10) || minValue

        // Enforce min/max constraints
        if (currentValue < minValue) currentValue = minValue
        if (currentValue > maxValue) currentValue = maxValue

        input.value = currentValue
        this.updateQuantityButtonStates(selector)
      })

      // Initialize button states
      this.updateQuantityButtonStates(selector)
    })
  }

  updateQuantityButtonStates(selector) {
    const minusButton = selector.querySelector(".minus")
    const plusButton = selector.querySelector(".plus")
    const input = selector.querySelector("input")
    const currentValue = parseInt(input.value, 10)
    const minValue = parseInt(selector.dataset.min || 1, 10)
    const maxValue = parseInt(selector.dataset.max || 9999, 10)

    // Update button disabled states
    minusButton.disabled = currentValue <= minValue
    plusButton.disabled = currentValue >= maxValue
  }

  handleCheckboxChange(event) {
    const checkbox = event.target
    const itemContainer = checkbox.closest(".cross-sell-products--item")

    if (checkbox.checked) {
      itemContainer.classList.add("selected")
    } else {
      itemContainer.classList.remove("selected")
    }
  }

  handleFormSubmit(event) {
    // Check if any cross-sell products are selected
    const selectedProducts = this.getSelectedProducts()

    if (selectedProducts.length === 0) {
      // No cross-sell products selected, let the form submit normally
      return
    }

    // Prevent the default form submission
    event.preventDefault()

    // Get the form that was submitted
    const form = event.target

    // Get the main product ID
    const mainProductInput = form.querySelector('input[name="id"]')
    if (!mainProductInput) return

    const mainProductId = mainProductInput.value
    const mainProductQuantity = form.querySelector('input[name="quantity"]')?.value || 1

    // Check if this is a pre-order form
    const isPreOrder = form.dataset.isPreOrder === "true"

    // Try to detect if the Buy Now button was clicked
    // We use several detection methods for reliability
    let isBuyNow = false

    // Method 1: Check active element
    if (document.activeElement) {
      isBuyNow =
        document.activeElement.classList.contains("shopify-payment-button__button") ||
        document.activeElement.closest(".shopify-payment-button__button") !== null
    }

    // Method 2: Check if the event originated from a buy now button
    if (!isBuyNow && event.submitter) {
      isBuyNow =
        event.submitter.classList.contains("shopify-payment-button__button") ||
        event.submitter.closest(".shopify-payment-button__button") !== null
    }

    // Method 3: Check if the user clicked on a buy now button in the last 100ms
    // This uses a flag that's set in the click handlers for buy now buttons
    if (!isBuyNow) {
      isBuyNow = !!window.lastBuyNowButtonClickTime && Date.now() - window.lastBuyNowButtonClickTime < 100
    }

    // Add the main product and selected cross-sell products to cart
    if (isBuyNow) {
      // If buy now was clicked, add to cart and redirect to checkout
      this.addProductsToCartThenRedirect(form, mainProductId, mainProductQuantity, selectedProducts)
    } else {
      // Otherwise just add to cart (regular add to cart or pre-order)
      this.addProductsToCart(form, mainProductId, mainProductQuantity, selectedProducts)
    }
  }

  handleBuyNowClick(event) {
    // Check if any cross-sell products are selected
    const selectedProducts = this.getSelectedProducts()

    if (selectedProducts.length === 0) {
      // No cross-sell products selected, let the button work normally
      return
    }

    // Prevent the default button click
    event.preventDefault()
    event.stopPropagation()

    // Get the form that contains the clicked button
    const form = event.target.closest("form")
    if (!form) return

    // Get the main product ID
    const mainProductInput = form.querySelector('input[name="id"]')
    if (!mainProductInput) return

    const mainProductId = mainProductInput.value
    const mainProductQuantity = form.querySelector('input[name="quantity"]')?.value || 1

    // Show loading state
    form.classList.add("loading")

    // First add the cross-sell products to cart
    this.addProductsToCartThenRedirect(form, mainProductId, mainProductQuantity, selectedProducts)
  }

  handleDynamicCheckoutClick(event) {
    // Check if any cross-sell products are selected
    const selectedProducts = this.getSelectedProducts()

    if (selectedProducts.length === 0) {
      // No cross-sell products selected, let the button work normally
      return
    }

    // Prevent the default click
    event.preventDefault()
    event.stopPropagation()

    // Get the form
    const form = event.target.closest("form")
    if (!form) return

    // Get the main product ID
    const mainProductInput = form.querySelector('input[name="id"]')
    if (!mainProductInput) return

    const mainProductId = mainProductInput.value
    const mainProductQuantity = form.querySelector('input[name="quantity"]')?.value || 1

    // Show loading state
    form.classList.add("loading")

    // Add to cart and redirect
    this.addProductsToCartThenRedirect(form, mainProductId, mainProductQuantity, selectedProducts)
  }

  getSelectedProducts() {
    const selectedProducts = []

    this.crossSellCheckboxes.forEach((checkbox) => {
      if (checkbox.checked) {
        const variantId = checkbox.value
        // Find the quantity input for this product
        const quantityInput = document.querySelector(
          `.cross-sell-quantity-input[name="cross_sell_quantity[${variantId}]"]`
        )
        const quantity = quantityInput ? parseInt(quantityInput.value, 10) : 1

        selectedProducts.push({
          id: variantId,
          quantity: quantity
        })
      }
    })

    return selectedProducts
  }

  addProductsToCartThenRedirect(form, mainProductId, mainProductQuantity, selectedProducts) {
    // Disable form elements to prevent double submission
    this.setFormLoading(form, true)

    // Create the items array with all products (main + cross-sell)
    const items = [
      {
        id: mainProductId,
        quantity: parseInt(mainProductQuantity, 10)
      },
      ...selectedProducts
    ]

    // Don't clear cart - instead add all items directly
    // Shopify's cart/add.js endpoint will handle duplicates by incrementing quantities
    const cartUrl = "/cart/add.js"

    // Use FormData for more reliable request
    const formData = new FormData()

    // Add items as separate FormData entries in the format Shopify expects
    items.forEach((item, index) => {
      formData.append(`items[${index}][id]`, item.id)
      formData.append(`items[${index}][quantity]`, item.quantity)
    })

    fetch(cartUrl, {
      method: "POST",
      body: formData
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.description || "Error adding items to cart")
          })
        }
        return response.json()
      })
      .then((data) => {
        // Successfully added items to cart, now redirect to checkout
        window.location.href = "/checkout"
      })
      .catch((error) => {
        console.error("Error:", error)
        // Try again with another approach if the first one failed
        this.fallbackAddToCart(items, form)
      })
  }

  fallbackAddToCart(items, form) {
    // Fallback method using AJAX with JSON
    fetch("/cart/clear.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    })
      .then((response) => response.json())
      .then(() => {
        // Now add all products using the JSON format
        return fetch("/cart/add.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ items })
        })
      })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.description || "Error adding items to cart")
          })
        }
        return response.json()
      })
      .then((data) => {
        // Success! Redirect to checkout
        window.location.href = "/checkout"
      })
      .catch((error) => {
        console.error("Fallback failed:", error)
        this.handleErrorMessage(error.message || "Failed to add items to cart. Please try again manually.")
        this.setFormLoading(form, false)
      })
  }

  setFormLoading(form, isLoading) {
    const submitButton = form.querySelector(".single-add-to-cart-button")
    const buyNowButton = form.querySelector(".shopify-payment-button")
    const inputs = form.querySelectorAll("input, select, button")

    if (isLoading) {
      if (submitButton) {
        submitButton.classList.add("loading")
        submitButton.setAttribute("aria-disabled", "true")
      }

      if (buyNowButton) {
        buyNowButton.classList.add("loading")
        buyNowButton.setAttribute("aria-disabled", "true")
      }

      inputs.forEach((input) => {
        if (input !== submitButton) {
          input.setAttribute("disabled", "disabled")
        }
      })
    } else {
      if (submitButton) {
        submitButton.classList.remove("loading")
        submitButton.removeAttribute("aria-disabled")
      }

      if (buyNowButton) {
        buyNowButton.classList.remove("loading")
        buyNowButton.removeAttribute("aria-disabled")
      }

      inputs.forEach((input) => {
        if (input !== submitButton) {
          input.removeAttribute("disabled")
        }
      })
    }
  }

  addProductsToCart(form, mainProductId, mainProductQuantity, selectedProducts) {
    // Create the items array with the main product first
    const items = [
      {
        id: mainProductId,
        quantity: parseInt(mainProductQuantity, 10)
      },
      ...selectedProducts
    ]

    // Set loading state
    this.setFormLoading(form, true)

    // Use FormData for more reliable request
    const formData = new FormData()

    // Add items as separate FormData entries in the format Shopify expects
    items.forEach((item, index) => {
      formData.append(`items[${index}][id]`, item.id)
      formData.append(`items[${index}][quantity]`, item.quantity)
    })

    // Add to cart using the Cart API with FormData
    fetch("/cart/add.js", {
      method: "POST",
      body: formData
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.description || "Error adding items to cart")
          })
        }
        return response.json()
      })
      .then((data) => {
        // Success - update cart UI
        this.updateCartUI(data)
      })
      .catch((error) => {
        console.error("Error:", error)
        this.handleErrorMessage(error.message || "An error occurred. Please try again.")

        // Try the fallback method
        this.fallbackAddToCartRegular(items, form)
      })
      .finally(() => {
        // Reset loading state
        this.setFormLoading(form, false)
      })
  }

  fallbackAddToCartRegular(items, form) {
    // Fallback using JSON format for regular add to cart
    fetch("/cart/add.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ items })
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.description || "Error adding items to cart")
          })
        }
        return response.json()
      })
      .then((data) => {
        // Success - update cart UI
        this.updateCartUI(data)
      })
      .catch((error) => {
        console.error("Fallback failed:", error)
        this.handleErrorMessage("Failed to add items to cart. Please try again manually.")
      })
  }

  updateCartUI(response) {
    // Trigger cart update event
    if (window.Shopify && window.Shopify.theme) {
      document.dispatchEvent(
        new CustomEvent("cart:item-added", {
          bubbles: true,
          detail: { items: Array.isArray(response.items) ? response.items : [response] }
        })
      )
    }

    // Get sections to update
    fetch("/?section_id=cart-notification-button")
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, "text/html")
        const cartButton = document.getElementById("cart-notification-button")
        if (cartButton) {
          const newCartButton = html.getElementById("cart-notification-button")
          if (newCartButton) {
            cartButton.innerHTML = newCartButton.innerHTML
          }
        }
      })
      .catch((e) => console.error(e))
  }

  getSectionsToRender() {
    return [
      {
        id: "cart-icon-bubble",
        section: "cart-icon-bubble",
        selector: ".shopify-section"
      },
      {
        id: "cart-notification-button",
        section: "cart-notification-button",
        selector: ".shopify-section"
      }
    ]
  }

  renderContents(parsedState) {
    this.getSectionsToRender().forEach((section) => {
      const elementToReplace =
        document.getElementById(section.id)?.querySelector(section.selector) || document.getElementById(section.id)

      if (elementToReplace && parsedState.sections && parsedState.sections[section.section]) {
        elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector)
      }
    })
  }

  getSectionInnerHTML(html, selector = ".shopify-section") {
    return new DOMParser().parseFromString(html, "text/html").querySelector(selector)?.innerHTML || ""
  }

  handleErrorMessage(errorMessage) {
    const errorMessageContainer = document.querySelector(".product-form__error-message-wrapper")
    if (!errorMessageContainer) return

    const errorMessageElement = errorMessageContainer.querySelector(".product-form__error-message")
    if (!errorMessageElement) return

    errorMessageElement.textContent = errorMessage
    errorMessageContainer.hidden = false

    setTimeout(() => {
      errorMessageContainer.hidden = true
    }, 5000)
  }

  monitorDynamicCheckoutButtons() {
    // For Shop Pay, PayPal, and other dynamic checkout buttons
    // We need to observe the DOM as these buttons are often injected after page load
    const paymentButtonsContainer = document.querySelector(".shopify-payment-button")
    if (!paymentButtonsContainer) return

    // Create a mutation observer to watch for dynamic checkout buttons
    const observer = new MutationObserver((mutations) => {
      const dynamicButtons = paymentButtonsContainer.querySelectorAll(".shopify-payment-button__button")
      dynamicButtons.forEach((button) => {
        if (!button.dataset.crossSellMonitored) {
          button.dataset.crossSellMonitored = "true"
          button.addEventListener("click", this.handleDynamicCheckoutClick.bind(this), true)
        }
      })
    })

    // Start observing
    observer.observe(paymentButtonsContainer, {
      childList: true,
      subtree: true,
      attributes: true
    })

    // Also apply to any buttons that are already there
    const existingButtons = paymentButtonsContainer.querySelectorAll(".shopify-payment-button__button")
    existingButtons.forEach((button) => {
      if (!button.dataset.crossSellMonitored) {
        button.dataset.crossSellMonitored = "true"
        button.addEventListener("click", this.handleDynamicCheckoutClick.bind(this), true)
      }
    })
  }
}

// Initialize when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new CrossSellProducts()
})
