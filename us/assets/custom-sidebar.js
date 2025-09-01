/**
 *  @class
 *  @function CustomSidebar
 */
if (!customElements.get("custom-sidebar")) {
  class CustomSidebar extends HTMLElement {
    constructor() {
      super()
    }

    connectedCallback() {
      this.buttons = this.querySelectorAll(".custom-sidebar-target")
      this.content = this.querySelectorAll(".custom-sidebar-content")
      this.buttons.forEach((button, i) => {
        button.addEventListener("mouseover", (event) => {
          this.onHover(event, button, i)
        })
      })
      this.images = this.querySelectorAll("img")

      window.addEventListener("load", (event) => {
        this.images.forEach(function (image) {
          lazySizes.loader.unveil(image)
        })
      })
    }

    onHover(event, button, i) {
      this.content.forEach((content, index) => {
        content.classList.remove("active")
        if (i == index) {
          content.classList.add("active")
        }
      })
      this.buttons.forEach((this_button, index) => {
        this_button.classList.remove("active")
      })
      button.classList.add("active")
    }
  }
  customElements.define("custom-sidebar", CustomSidebar)
}
