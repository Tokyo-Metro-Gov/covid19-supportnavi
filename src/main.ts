/* メインコントローラー
 *
 *  サイトの全体のコントローラーです。
 *
 *  MIT ライセンスにより提供されています。ライセンスの詳細についてはプロジェクトルートフォルダーの LICENSE.md を参照してください。
 */

import "babel-polyfill";

declare var Papa;
declare var $;
declare var PNAVI;

const xhr = (path: string): Promise<XMLHttpRequest> => {
  return new Promise(resolve => {
    const request = new XMLHttpRequest();
    request.open("GET", path, true);
    request.onload = (e) => {
      if (request.readyState === 4) {
        if (request.status === 200) {
          resolve(request);
        }
      }
    };
    request.onerror = (e) => {

    };
    request.send(null);
  });
};

const showLocalNotification = (message: string) => {
  if (IS_LOCAL) {
    alert(message);
  }
};

const createTimeStamp = (date: Date) => {
  if (!date) {
    return "----/--/-- --:--"
  }
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const mainContent = document.getElementById("main-content");
const template = document.getElementById("template");
const IS_LOCAL = location.protocol === "file:";
if (IS_LOCAL) {
  const caption = document.querySelector<HTMLElement>(".caption");
  if (caption) {
    caption.setAttribute("style", "");
  }
}

const getPageName = () => {
  const hash = location.hash;
  if (hash === "#" || hash === "") {
    return "top-page";
  }
  return hash.substring(1);
};

let services: ServiceInfo[] = undefined;
let lastUpdatedDate;
let naviUpdatedDate;
let naviData;

interface SerializedServiceInfo {
  psid: string;
  id: string;
  theme: string;
  "content.abstract": string;
  "content.application_end_date": string;
  "content.application_start_date": string;
  "content.contact": string;
  "content.how_to_apply": string;
  "content.provisions": string;
  "content.target": string;
  "content.url": string;
  name: string;
  provider: string;
  tags: string;
  umid: string;
  updated_date: string;
}

interface ServiceInfo {
  psid: string;
  theme: string[];
  content: {
    abstract: string;
    application_end_date: string;
    application_start_date: string;
    contact: string;
    how_to_apply: string;
    provisions: string;
    target: string;
    url: string;
  }
  name: string;
  provider: string;
  tags: string[];
  id: string;
  updated_date: Date;
}

const deserializeTag = (line: SerializedServiceInfo): string[] => {
  return line.tags.split(/\r\n|\n|\r/);
};

const deserializeServiceInfo = (line: SerializedServiceInfo): ServiceInfo => {
  return {
    psid: line.psid,
    id: line.id,
    theme: line.theme.split(/\r\n|\n|\r/).filter(t => t.length > 0),
    content: {
      abstract: line["content.abstract"],
      application_end_date: line["content.application_end_date"],
      application_start_date: line["content.application_start_date"],
      contact: line["content.contact"],
      how_to_apply: line["content.how_to_apply"],
      provisions: line["content.provisions"],
      target: line["content.target"],
      url: line["content.url"]
    },
    name: line["name"],
    provider: line["provider"],
    tags: deserializeTag(line),
    updated_date: new Date(line["updated_date"])
  };
};

const deserializeServices = (lines: SerializedServiceInfo[]): ServiceInfo[] => {
  const services = [];
  lines.forEach(line => {
    if (line.psid) {
      services.push(deserializeServiceInfo(line));
    }
  });
  return services;
};

const reloadServiceData = () => {
  const servicesFileCache = localStorage.getItem("services-cache");
  if (servicesFileCache) {
    try {
      loadServiceData(servicesFileCache, new Date(JSON.parse(localStorage.getItem("services-cache-date"))));
    } catch (e) {
    }
  }
};

const loadServiceData = (text: string, lastModified: Date) => {
  const parsed = Papa.parse(text, {
    header: true
  });
  const lines = parsed.data as SerializedServiceInfo[];
  services = deserializeServices(lines);
  lastUpdatedDate = lastModified;

};

const zip = (keys: string[], values: string[]): { [keys: string]: string } => {
  const data = {};
  for (let i = 0; i < keys.length; i++) {
    data[keys[i]] = values[i];
  }
  return data;
}

const deserializeNaviData = (data: string[][]) => {
  let mode = "";
  let headers = [] as string[];
  let currentQuestion = null;
  const questionResult = [];
  for (let i = 0; i < data.length; i++) {
    const line = data[i];
    if (line[0] === "質問") {
      mode = "question";
      i++;
      headers = data[i];
      continue;
    }
    if (line[0] === "結果") {
      mode = "result";
      i++;
      headers = data[i];
      continue;
    }
    if (mode === "question") {
      const question = zip(headers, line);
      if (question.ID === undefined) {
        continue;
      }
      if (question.ID !== "") {
        currentQuestion = {
          id: question.ID,
          type: "question",
          questionText: question["質問"],
          answers: []
        }
        questionResult.push(currentQuestion);
        continue;
      }
      if (!currentQuestion) {
        throw new Error("invalid navi data");
      }
      if (question["次"]) {
        currentQuestion.answers.push({
          nextid: question["次"],
          answerText: question["回答"]
        });
      }
    } else if (mode === "result") {
      const result = zip(headers, line);
      if (result.ID === undefined) {
        continue;
      }
      questionResult.push({
        id: result.ID,
        type: "result",
        title: result["タイトル"],
        content: `<ul class="description">\n` + result["制度ID"].split("\n").map(id => {
          try {
            const service = getServiceById(id);
            return `<li><a href="#service/${id}">${service.name}</li>\n`
          }catch(e) {
            return `<li>制度データが読み込まれていないか、制度IDに誤りがあります: ${id}</li>`;
          }
        }).join("") + `</ul>`
      })
    }
  }
  return {
    basicInfo: {
      rootId: "0"
    },
    questionResult
  }
};

const reloadNaviData = () => {
  const naviFileCache = localStorage.getItem("navi-cache");
  if (naviFileCache) {
    try {
      loadNaviData(naviFileCache, new Date(JSON.parse(localStorage.getItem("navi-cache-date"))));
    } catch (e) {
    }
  }
};

const loadNaviData = (text: string, lastModified: Date) => {
  const parsed = Papa.parse(text).data as string[][];
  naviData = deserializeNaviData(parsed);
  naviUpdatedDate = lastModified;
};

const processFile = async (dataTransfer: DataTransfer) => {
  const files = Array.from(dataTransfer.files);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.type === "text/csv" || file.name.endsWith(".csv")) {
      const reader = new FileReader();
      reader.addEventListener("load", event => {
        const text = event.target.result as string;
        const header = text.substr(0, text.indexOf("\n")).split(",");
        const date = new Date(file.lastModified);
        if (header.indexOf("質問") >= 0) {
          localStorage.setItem("navi-cache", text);
          localStorage.setItem("navi-cache-date", JSON.stringify(date));
          loadNaviData(text, date);
          showLocalNotification("ナビデータを読み込みました");
          updatePage();
        } else if (header.indexOf("psid") >= 0) {
          localStorage.setItem("services-cache", text);
          localStorage.setItem("services-cache-date", JSON.stringify(date));
          loadServiceData(text, date);
          reloadNaviData();
          showLocalNotification("制度データを読み込みました");
          updatePage();
        } else {
          showLocalNotification("ファイルの形式が不正です");
        }
      });
      reader.readAsText(file);
    }
  }
};

const setupDataDragDropHandler = () => {
  if (IS_LOCAL) {
    const dropArea = document.body;
    const callbackMap: { [keys: string ]: (e: DragEvent) => void } = {
      dragenter: e => {
        e.preventDefault();
        document.body.classList.add("drag-over");
      },
      dragover: e => {
        e.preventDefault();
      },
      dragleave: e => {
        e.preventDefault();
        document.body.classList.remove("drag-over");
      },
      drop: e => {
        e.preventDefault();
        if (e.dataTransfer.files.length > 0) {
          processFile(e.dataTransfer);
        }
      }
    };
    Object.keys(callbackMap).forEach(eventName => {
      dropArea.addEventListener(eventName, callbackMap[eventName]);
    });
  }
};

setupDataDragDropHandler();

const renderListPage = (services: ServiceInfo[]) => {
  showTemplate("list");
  updateTimeStamp(lastUpdatedDate);
  mainContent.querySelector<HTMLSpanElement>(".service-count").textContent = String(services.length);
  const categoryList = mainContent.querySelector(".category-list");
  const listPage = mainContent.querySelector(".list-page");
  const themeGroupTemplate = mainContent.querySelector(".theme-group");
  const cardTemplate = mainContent.querySelector(".service-card");
  const themeMap = {} as { [keys: string]: ServiceInfo[] };
  services.forEach(s => {
    s.theme.forEach(t => {
      if (!themeMap[t]) {
        themeMap[t] = [];
      }
      themeMap[t].push(s);
    });
  });
  const themes = Object.keys(themeMap);
  for (let i = 0; i < themes.length; i++) {
    const theme = themes[i];
    const ss = themeMap[theme];
    const name = `list/${theme}`;
    const li = document.createElement("li");
    li.innerHTML = `<a href="#${name}">${theme}</a>（${ss.length}件）`;
    categoryList.appendChild(li);
    const group = themeGroupTemplate.cloneNode(true) as HTMLElement;
    const atag = group.querySelector<HTMLAnchorElement>("h2 a");
    atag.textContent = `${theme}（${ss.length}件）`;
    atag.id = name;
    const list = group.querySelector<HTMLElement>(".cardset");
    ss.forEach(service => {
      const card = cardTemplate.cloneNode(true) as HTMLElement;
      const aTag = card.querySelector("a");
      aTag.href = `#service/${service.psid}`;
      aTag.textContent = service.name;
      card.querySelector(".abstract").textContent = service.content.abstract;
      card.querySelector(".service-tag").textContent = service.provider;
      list.appendChild(card);
    });
    listPage.appendChild(group);
  }
};

const loadListPage = async (anchor: string = undefined) => {
  if (IS_LOCAL) {
    document.body.classList.remove("waiting-drop");
    if (services) {
      renderListPage(services);
      return;
    }
    document.body.classList.add("waiting-drop");
    document.getElementById("overlay-message").textContent = "ここに制度データのCSVファイルをドラッグドロップしてください";
  } else {
    const request = await xhr("./resources/services.csv");
    loadServiceData(request.responseText, new Date(request.getResponseHeader("last-modified")));
    renderListPage(services);
  }
  if (anchor) {
    const selector = `a[id='list/${decodeURI(anchor)}']`;
    const a = document.querySelector(selector);
    if (a) {
      a.scrollIntoView();
    }
  }
};

const createServiceTagHTML = (name: string): string => `<span class="service-tag">${name}</span>`

const renderServicePage = (service: ServiceInfo) => {
  showTemplate("service");
  updateTimeStamp(lastUpdatedDate);
  mainContent.querySelector(".service-provider").innerHTML = createServiceTagHTML(service.provider);
  mainContent.querySelector(".service-tags").innerHTML = service.tags.map(t => createServiceTagHTML(t)).join("");
  const getContent = (property: string): HTMLElement => {
    return mainContent.querySelector(`.content-${property}`);
  }

  const setContent = (property: string, data: string | null) => {
    const element = getContent(property);
    if (data) {
      element.querySelector(".data").innerHTML = data;
    } else {
      element.style.display = "none";
    }
  };

  const contentGenerator = (property: string) => {
    if (service.content[property]) {
      return service.content[property].replace("\n", "<br />");
    }
    return null;
  }

  mainContent.querySelector("h1").textContent = service.name;
  ["abstract", "provisions", "target", "how_to_apply", "contact"].forEach(property => {
    setContent(property, contentGenerator(property));
  });
  setContent("application_period", (() => {
    const start = service.content.application_start_date;
    const end = service.content.application_end_date; 
    if (start && end) {
      return `${start}から${end}まで`;
    } else if (start) {
      return `${start}から`;
    } else if (end) {
      return `${end}まで`;
    }
    return null;
  })());
  setContent("url", (() => {
    const url = service.content.url;
    if (url) {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer class="external-link">${url}</a>`;
    }
    return null;
  })());
};

const getServiceById = (id: string) => {
  if (services) for (let i = 0; i < services.length; i++) {
    if (services[i].psid === id) return services[i];
  }
  throw new Error(`service not found: ${id}`);
};

const prepareServiceData = async () => {
  if (!services) {
    const request = await xhr("./resources/services.csv");
    loadServiceData(request.responseText, new Date(request.getResponseHeader("last-modified")));
  }
};

const loadServicePage = async (id: string) => {
  if (IS_LOCAL) {
    document.body.classList.remove("waiting-drop");
    if (services) {
      renderServicePage(getServiceById(id));
      return;
    }
    document.body.classList.add("waiting-drop");
    document.getElementById("overlay-message").textContent = "ここに制度データのCSVファイルをドラッグドロップしてください";
  } else {
    await prepareServiceData();
    renderServicePage(getServiceById(id));
  }
}

function questionAdded(data) {
  if (getPageName() === "navi") {
    $("body, html").animate({ scrollTop: $(document).height() + "px" }, 0);
    $(".main-content").animate({ scrollTop: ($(".main-content").height() + 500).toString() + "px" }, 0);
  }
}

function resultAdded(data) {
  $(".pnavi-result").removeClass("hidden");
  let results = document.querySelectorAll(".pnavi-result");
  if (results) {
    for (let i = 0; i < results.length; i++) {
      let items = results[i].querySelectorAll("li");
      let counter = results[i].querySelectorAll(".result-count");
      for (let j = 0; j < counter.length; j++) {
        counter[j].textContent = items.length.toString();
      }
    }
  }
  const button = mainContent.querySelector(".navi-body").querySelector(".goto-first-btn button");
  if (button) {
    button.addEventListener("click", () => {
      gotoFirstQuestion();
    });
  }
  questionAdded(data);
}

function gotoFirstQuestion() {
  console.log("hey");
  $(".pnavi-result").addClass("hidden");
  pnavi.start();
}

const updateTimeStamp = (date: Date) => {
  const lastUpatedDateElement = Array.from(mainContent.querySelectorAll(".lastUpdatedDate .date"));
  lastUpatedDateElement.forEach(e => {
    e.textContent = createTimeStamp(date);
  });
};

let pnavi;
const renderNavi = (data: any) => {
  updateTimeStamp(naviUpdatedDate);
  const naviBody = mainContent.querySelector(".navi-body");
  naviBody.addEventListener("questionadded", questionAdded);
  naviBody.addEventListener("resultadded", resultAdded);
  naviBody["questionadded"] = questionAdded;
  naviBody["resultadded"] = resultAdded;
  pnavi = PNAVI.init(data, naviBody, { generateDefault: false });
  // mainContent.querySelector(".main-content").classList.remove("mobile-hidden");
  pnavi.start();
};

const loadNaviPage = async () => {
  showTemplate("navi");
  if (IS_LOCAL) {
    document.body.classList.remove("waiting-drop");
    if (naviData) {
      renderNavi(naviData);
      return;
    }
    document.body.classList.add("waiting-drop");
    document.getElementById("overlay-message").textContent = "ここにナビデータのCSVファイルをドラッグドロップしてください";
  } else {
    await prepareServiceData();
    const request = await xhr("./resources/navi.csv");
    loadNaviData(request.responseText, new Date(request.getResponseHeader("last-modified")));
    renderNavi(naviData);
  }
};

const showTemplate = (page: string) => {
  ViewController.closeMobileMenu();
  if (mainContent.scroll) {
    mainContent.scroll(0, 0);
  }
  window.scroll(0, 0);
  document.body.className = page === "top-page" ? "index" : page;
  mainContent.innerHTML = "";
  const node = template.querySelector(`.${page}`);
  if (!node) {
    throw new Error(`テンプレートが見つかりませんでした: ${page}`);
  }
  mainContent.appendChild(node.cloneNode(true));
};

const updatePage = () => {
  const page = getPageName();
  const path = page.split("/");
  if (path[0] === "list") {
    loadListPage(path[1]);
  } else if (path[0] === "service") {
    loadServicePage(path[1]);
  } else if (path[0] === "navi") {
    loadNaviPage();
  } else {
    showTemplate(page);
  }
};

let currentHash = location.hash;
window.addEventListener("hashchange", async (e) => {
  const newHash = location.hash;
  if (currentHash.indexOf("#list") !== 0 || newHash.indexOf("#list") !== 0) {
    updatePage();
  }
  currentHash = newHash;
});

reloadServiceData();
reloadNaviData();

updatePage();

import { ViewController } from './tkoctrl';

class ATBundle {
  constructor() {
    let tkoCtrl = new ViewController();
  }
}

export var ATBUNDLE = new ATBundle();