/* PNavi コントローラー
 *
 *  PNavi コントローラーは、質問と結果の関係性が記述されたデータに基づいてドキュメントの生成を行うためのライブラリです。
 *  このライブラリはKnockoutjsを使用しています。
 * 
 *  MIT ライセンスにより提供されています。ライセンスの詳細についてはプロジェクトルートフォルダーの LICENSE.md を参照してください。
 */

import * as ko from "knockout";

declare global {
  interface Window {
    PNAVI: PNavi;
  }
}

class PNaviAnswer {
  answerText: string = "";
  nextid: string = "";
  selected?: KnockoutObservable<boolean>;
  question?: PNaviQuestionEx | null;
}

class PNaviAnswerEx extends PNaviAnswer {
  selected: KnockoutObservable<boolean> = ko.observable(false);
  question: PNaviQuestionEx | null = null;

  // IE をサポートするため、Object.assign の代わりにコピーコンストラクタを実装
  constructor(a: PNaviAnswer) {
    super();
    this.answerText = a.answerText;
    this.nextid = a.nextid;
    this.selected(a.selected ? a.selected() : false);
    this.question = a.question ? a.question : null;
  }
}

type PNaviItemType = "question" | "result";
class PNaviQuestion {
  public type: PNaviItemType = "question";
  public id: string = "";
  public questionText: string = "";
  public answers: PNaviAnswer[] = [];
}

class PNaviQuestionEx extends PNaviQuestion {
  public order: number = 0;

  // IE をサポートするため、Object.assign の代わりにコピーコンストラクタを実装
  constructor(q?: PNaviQuestion) {
    super();
    if (q) {
      this.type = q.type;
      this.id = q.id;
      this.questionText = q.questionText;
      this.answers = [];
      q.answers.forEach((answer) => {
        this.answers.push(new PNaviAnswerEx(answer));
      });
    }
  }
}

class PNaviResult {
  public type: PNaviItemType = "result";
  public id: string = "";
  public title: string = "";
  public content: string = "";
}

class PNaviBasicInfo {
  public rootId: string = "";
}
class PNaviData {
  public basicInfo: PNaviBasicInfo = new PNaviBasicInfo();
  public questionResult: (PNaviQuestion | PNaviResult)[] = [];
}

class PNaviOptions {
  public generateDefault?: boolean;
  public beforeQuestion?: (q: PNaviQuestionEx) => PNaviQuestionEx;
  public beforeResult?: (r: PNaviResult) => PNaviResult;
}

const PNaviDefaultHtml: string = `
<div class="pnavi-container">
    <div class="pnavi-questions" data-bind="foreach: { data: questions, afterRender: $root.questionAdded}">
        <div class="pnavi-question">
            <div class="pnavi-question-order" data-bind="text: order"></div>
            <div class="pnavi-question-text" data-bind="text: questionText"></div>
            <ul class="pnavi-answers" data-bind="foreach: answers">
                <li class="pnavi-answer" data-bind="css: {selected: selected}, event: { click: $root.answerClicked }">
                    <div class="pnavi-answer-text" data-bind="text: answerText"></div>
                    <div class="pnavi-answer-nextid" data-bind="text: nextid"></div>
                </li>
            </ul>
        </div>
    </div>
    <div class="pnavi-result-container" data-bind="foreach: {data: result, afterRender: $root.resultAdded}">
        <div class="pnavi-result">
            <div class="pnavi-result-content" data-bind="html: content"></div>
        </div>
    </div>
</div>
`;


class PNavi {
  top: HTMLElement | null = null;
  qr: (PNaviQuestion | PNaviResult)[] = [];
  questions: KnockoutObservableArray<PNaviQuestionEx> = ko.observableArray();
  result: KnockoutObservableArray<PNaviResult> = ko.observableArray();
  qrMap: Map<string, (PNaviQuestion | PNaviResult)> = new Map();
  root = "";

  private beforeQuestionCallback: ((q: PNaviQuestionEx) => PNaviQuestionEx) | null = null;
  private beforeResultCallback: ((r: PNaviResult) => PNaviResult) | null = null;

  constructor() {
    this.qrMap = new Map();


  }
  
  // PNavi コントローラーの初期化
  public init(data: PNaviData, top: HTMLElement, option: PNaviOptions): PNavi {
    this.top = top;
    this.qr = data.questionResult;
    this.root = data.basicInfo.rootId;
    this.qrMap = new Map();

    this.qr.forEach((item: PNaviQuestion | PNaviResult) => {
      this.qrMap.set(item.id, item);
    });

    // オプションの処理
    if (option) {
      if (option.generateDefault == undefined || option.generateDefault == true) {
        this.addPNaviHtml(top);
      }
      if (option.beforeQuestion) {
        this.beforeQuestionCallback = option.beforeQuestion;
      }
      if (option.beforeResult) {
        this.beforeResultCallback = option.beforeResult;
      }
    }
    else {
      this.addPNaviHtml(top);
    }
    this.triggerCustomEvent("binding", "");

    let a = this.questions();
    ko.applyBindings(this, top);
    this.triggerCustomEvent("bound", "");
    return this;
  }

  private addPNaviHtml(top: HTMLElement) {
    let navi = document.createElement("div");
    navi.innerHTML = PNaviDefaultHtml;
    top.appendChild(navi);
  }


  private triggerCustomEvent(name: string, value: any) {
    if (this.top) {
      let customEvent;

      if (typeof window.CustomEvent === "function") {
        customEvent = new CustomEvent(name, {
          detail: {
            value: value
          },
          bubbles: true
        });
      } else {
        customEvent = document.createEvent('CustomEvent');
        customEvent.initCustomEvent(name, true, true, {
          detail: {
            value: value
          }
        });
      }
      this.top.dispatchEvent(customEvent);
    }
  }

  // すべての質問及び結果を取得する
  public getQuestions() {
    return this.qr;
  }

  // いままでの質問を取得する（質問スタック内の質問を取得）
  public getSelectedQuestions() {
    return this.questions;
  }

  // 質問スタックに質問を追加する
  public pushQuestion(q: PNaviQuestion) {
  // IE をサポートするため、Object.assign の代わりにコピーコンストラクタを実装
  let qx: PNaviQuestionEx = new PNaviQuestionEx(q);
    qx.order = this.questions().length + 1;
    qx.answers.forEach((answer) => {
      answer.selected = ko.observable(false);
      answer.question = qx;
    });
    if (this.beforeQuestionCallback) {
      this.questions.push(this.beforeQuestionCallback(qx));
    }
    else {
      this.questions.push(qx);
    }
  }

  // 質問スタックから最後の質問を取り除く
  public popQuestion() {
    return this.questions.pop();
  }

  // 質問スタックから最後の質問を取得する
  public lastQuestion() {
    if (this.questions.length > 0) {
      return this.questions()[this.questions.length - 1];
    }
    else {
      return null;
    }
  }

  // ナビを開始する
  public start = () => {
    this.questions.removeAll();
    this.result.removeAll();
    let rootNode = this.qrMap.get(this.root);

    if (rootNode) {
      this.goNext(rootNode);
    }
  }

  private goNext(qr: PNaviQuestion | PNaviResult) {
    if (qr.type === "question") {
      this.pushQuestion(qr as PNaviQuestion);
    }
    else {
      if (this.beforeResultCallback) {
        this.result.push(this.beforeResultCallback(qr as PNaviResult));
      }
      else {
        this.result.push(qr as PNaviResult);
      }
    }
  }

  // 回答のクリックハンドラー
  private answerClicked = (d: PNaviAnswerEx) => {
    let reselect: boolean = false;
    d.question?.answers.forEach((answer) => {
      if ((answer as PNaviAnswerEx).selected()) {
        (answer as PNaviAnswerEx).selected(false);
        reselect = true;
      }
    });
    if (reselect) {
      while (this.questions().length > (d.question as PNaviQuestionEx).order) {
        this.popQuestion();
      }
      this.result.removeAll();
    }
    d.selected(true);
    let next = this.qrMap.get(d.nextid);
    if (next) {
      this.goNext(next);
    }
  }

  // 質問スタックに質問が追加された際に呼ばれる
  private questionAdded = (d: PNaviQuestionEx) => {
    this.triggerCustomEvent("questionadded", "");
  }

  // 質問スタックに結果が追加された際に呼ばれる
  private resultAdded = (d: PNaviQuestionEx) => {
    this.triggerCustomEvent("resultadded", "");
  }
}

export const PNAVI = new PNavi();
window.PNAVI = PNAVI;
