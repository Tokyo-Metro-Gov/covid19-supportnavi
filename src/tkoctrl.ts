/* ビューコントローラー
 *
 *  サイトのイベントハンドラなどビューのコントローラーです。
 *
 *  MIT ライセンスにより提供されています。ライセンスの詳細についてはプロジェクトルートフォルダーの LICENSE.md を参照してください。
 */

import cssVars from "css-vars-ponyfill";
export class ViewController {
  static changeColor(css: string) {
    let head = document.querySelector("head");
    if (head) {
      let pathEl: HTMLElement = head.querySelector("meta[data-path]");
      let path: string = pathEl ? pathEl.dataset.path : ".";
      let colorDefs = head.querySelectorAll("link[data-color-def]");
      for (let i = 0; i < colorDefs.length; i++) {
        head.removeChild(colorDefs[i]);
      }
      let el = document.createElement("link");
      el.setAttribute("rel", "stylesheet");
      el.setAttribute("href", path + "/styles/" + css);
      el.setAttribute("data-color-def", "0");
      head.appendChild(el);
      localStorage.setItem("tkoctrl-color-1", css);
    }
    cssVars();
  }

  static changeColorHandler(event: MouseEvent) {
    let el: HTMLElement = event.target as HTMLElement;

    let css = el.dataset.css;
    if (css) {
      ViewController.changeColor(css);
    }
  }

  static applyDefaultColor() {
    let css = localStorage.getItem("tkoctrl-color-1");
    if (css) {
      ViewController.changeColor(css);
    }
    else {
      cssVars();
    }
  }

  static changeCharSize(size: number) {
    document.querySelector("html").style.fontSize = size.toString() + "rem";
  }

  static applyDefaultCharSize() {
    let charSize = localStorage.getItem("tkoctrl-charsize");
    if (charSize) {
      let cs: number = parseFloat(charSize);
      if (!isNaN(cs)) {
        ViewController.changeCharSize(cs);
      }
    }
    else {
      charSize = "1.0";
    }

  }

  static increaseCharSize() {
    let charSize = localStorage.getItem("tkoctrl-charsize");
    if (charSize) {
      let cs: number = parseFloat(charSize);
      if (!isNaN(cs)) {
        cs += 0.1;
        ViewController.changeCharSize(cs);
        localStorage.setItem("tkoctrl-charsize", cs.toString());
      }
    }
    else {
      ViewController.changeCharSize(1.1);
      localStorage.setItem("tkoctrl-charsize", "1.0");
    }
  }

  static decreaseCharSize() {
    let charSize = localStorage.getItem("tkoctrl-charsize");
    if (charSize) {
      let cs: number = parseFloat(charSize);
      if (!isNaN(cs)) {
        cs -= 0.1;
        ViewController.changeCharSize(cs);
        localStorage.setItem("tkoctrl-charsize", cs.toString());
      }
    }
    else {
      ViewController.changeCharSize(0.8);
      localStorage.setItem("tkoctrl-charsize", "0.9");
    }
  }

  static defaultCharSize() {
    document.querySelector("html").style.fontSize = "1.0rem";
    localStorage.setItem("tkoctrl-charsize", "1.0");
  }
  static openMobileMenu() {
    let mc: HTMLElement = document.querySelector(".main-content");
    mc.classList.add("mobile-no-scroll");
    mc.classList.add("mobile-hidden");
    let sb: HTMLElement = document.querySelector(".sidebar");
    sb.style.display = "block";
    let sbc: HTMLElement = document.querySelector(".sidebar-content");
    sbc.scrollTo(0, 0);

  }
  static closeMobileMenu() {
    let mc: HTMLElement = document.querySelector(".main-content");
    mc.classList.remove("mobile-no-scroll");
    mc.classList.remove("mobile-hidden");
    let sb: HTMLElement = document.querySelector(".sidebar");
    sb.style.display = "";
  }
  static mobileHeaderSearch() {
    let mobileHeader = document.querySelector(".mobile-header");
    mobileHeader ? mobileHeader.classList.add("search-mode") : "";
    (document.querySelector(".search-text") as HTMLElement).focus();
  }
  static mobileHeaderSearchClose() {
    let mobileHeader = document.querySelector(".mobile-header");
    mobileHeader ? mobileHeader.classList.remove("search-mode") : "";
  }
}

const changeColorBtn = document.querySelectorAll(".color-selector-btn");
for (let i = 0; i < changeColorBtn.length; i++) {
  changeColorBtn[i].removeEventListener("click", ViewController.changeColorHandler);
  changeColorBtn[i].addEventListener("click", ViewController.changeColorHandler);
}

const increaseCharsizeBtn = document.querySelectorAll(".increase-charsize-btn");
for (let i = 0; i < increaseCharsizeBtn.length; i++) {
  increaseCharsizeBtn[i].removeEventListener("click", ViewController.increaseCharSize);
  increaseCharsizeBtn[i].addEventListener("click", ViewController.increaseCharSize);
}

const decreaseCharsizeBtn = document.querySelectorAll(".decrease-charsize-btn");
for (let i = 0; i < decreaseCharsizeBtn.length; i++) {
  decreaseCharsizeBtn[i].removeEventListener("click", ViewController.decreaseCharSize);
  decreaseCharsizeBtn[i].addEventListener("click", ViewController.decreaseCharSize);
}

const defaultCharsizeBtn = document.querySelectorAll(".default-charsize-btn");
for (let i = 0; i < defaultCharsizeBtn.length; i++) {
  defaultCharsizeBtn[i].removeEventListener("click", ViewController.defaultCharSize);
  defaultCharsizeBtn[i].addEventListener("click", ViewController.defaultCharSize);
}

const menuBtn = document.querySelectorAll(".menu-btn");
for (let i = 0; i < menuBtn.length; i++) {
  menuBtn[i].removeEventListener("click", ViewController.openMobileMenu);
  menuBtn[i].addEventListener("click", ViewController.openMobileMenu);
}

const searchBtn = document.querySelectorAll(".mobile-search-btn");
for (let i = 0; i < searchBtn.length; i++) {
  searchBtn[i].removeEventListener("click", ViewController.mobileHeaderSearch);
  searchBtn[i].addEventListener("click", ViewController.mobileHeaderSearch);
}

const searchCloseBtn = document.querySelectorAll(".mobile-search-close-btn");
for (let i = 0; i < searchCloseBtn.length; i++) {
  searchCloseBtn[i].removeEventListener("click", ViewController.mobileHeaderSearchClose);
  searchCloseBtn[i].addEventListener("click", ViewController.mobileHeaderSearchClose);
}

const menuCloseBtn = document.querySelectorAll(".menu-close-btn");
for (let i = 0; i < menuCloseBtn.length; i++) {
  menuCloseBtn[i].removeEventListener("click", ViewController.closeMobileMenu);
  menuCloseBtn[i].addEventListener("click", ViewController.closeMobileMenu);
}

ViewController.applyDefaultColor();
ViewController.applyDefaultCharSize();

if (location.search === "?embed=true") {
  document.body.classList.add("class", "embed");
}