const socket = io.connect('https://chatwithmemopad.onrender.com', {
    reconnect: true,                // 自動再接続を有効にする
    reconnectionAttempts: Infinity, // 無限回再接続を試みる
    reconnectionDelay: 1000,        // 再接続前の待機時間（ミリ秒）
    reconnectionDelayMax: 5000,     // 最大待機時間（ミリ秒）
    timeout: 10000,                 // 接続試行のタイムアウト時間（ミリ秒）
});

// const socket = io.connect('localhost:3000', {
//     reconnect: true,                // 自動再接続を有効にする
//     reconnectionAttempts: Infinity, // 無限回再接続を試みる
//     reconnectionDelay: 1000,        // 再接続前の待機時間（ミリ秒）
//     reconnectionDelayMax: 5000,     // 最大待機時間（ミリ秒）
//     timeout: 10000,                 // 接続試行のタイムアウト時間（ミリ秒）
// });

// html要素の取得
function $(id) {
    if (!id) { console.error('id is not defined'); }
    const element = document.getElementById(id);
    if (!element) { console.error(`Element with id "${id}" not found`); }
    return element;
}

const messageLists = $('messageLists');
const memoPad = $('memoPad');
const memoPadButton = $('memoPadButton');
const hoverButton = $('hoverButton');
// const notification = $('notification');
const form = $('form');
const nameSelect = $('name-select');
const input = $('input');
const formButton = $('formButton');

let dropElement;
let loginName;

// 選択範囲を監視
let count = 0;
const cycle = 10;
memoPad.addEventListener('input', () => { // 字の入力・文章選択などあらゆる変化でinputイベント
    updateButtonPosition();
});

memoPad.addEventListener('change', () => { // テキストエリア外をクリックするとchangeイベント
    updateSaveData();
    console.log('local saved: ', localStorage.getItem('memoPad'));
})

// 選択範囲の変更を検知
memoPad.addEventListener('selectionchange', () => {
    updateButtonPosition();
});

function updateButtonPosition() {
    const start = memoPad.selectionStart;
    const end = memoPad.selectionEnd;
    const middle = (start + end) / 2;
    const selectedText = memoPad.value.substring(start, end);

    if (selectedText) {
        const textareaRect = memoPad.getBoundingClientRect();
        const lineHeight = 14; // テキストの行の高さ (適宜調整)

        console.log(textareaRect.left, textareaRect.top);

        // 選択範囲の位置を計算 (簡易計算)
        const offsetX = textareaRect.right + 10; // 選択の右下にずらす
        const offsetY = textareaRect.top + ((middle / memoPad.cols) * lineHeight); // 選択の上にずらす

        hoverButton.style.left = offsetX + 'px';
        hoverButton.style.top = offsetY + 'px';
        hoverButton.style.display = 'block';
    } else {
        hoverButton.style.display = 'none';
    }
}

memoPadButton.addEventListener('click', () => {
    updateSaveData();
});

function updateSaveData() {
    const text = memoPad.value;
    localStorage.setItem('memoPad', text);
    socket.emit('memo', text);
}

hoverButton.addEventListener('click', () => {
    const start = memoPad.selectionStart;
    const end = memoPad.selectionEnd;
    const selectedText = memoPad.value.substring(start, end);

    const data = { msg: selectedText, chatName: loginName, isMemo: true };
    socket.emit('chat message', data);
    hoverButton.style.display = 'none';
});

copyButton.addEventListener('click', () => {
    const text = memoPad.value;
    navigator.clipboard.writeText(text).then(function () {
        alert("テキストがコピーされました！");
    }).catch(function (error) {
        alert("コピーに失敗しました: " + error);
    });
});

///////////////////////////////////////////////////////////////////
// ログイン
document.addEventListener('DOMContentLoaded', () => {
    loginName = getCookie('userName');

    if (loginName) {
        console.log('loginName: ', loginName);

        const newOption = document.createElement('option');
        newOption.value = loginName;
        newOption.textContent = loginName;
        nameSelect.appendChild(newOption);
    }

    const savedMemo = localStorage.getItem('memoPad');
    if (savedMemo) {
        memoPad.value = savedMemo; // 保存されているメモを表示
    } else {
        memoPad.value = `「メモ公開」機能で挨拶してみて！

文字選択（カーソル・Shiftキー）
→「メモ公開」ボタンをクリック
→メモ公開！（名前は「匿名メモ」だよ！）
        
・おはようございます！  ・こんにちは！
・こんばんは、おやすみなさい！
・お疲れ様です！  ・お誕生日おめでとう！
・よろしくお願いします！

他の機能：
・自分の投稿を別の投稿と重ねる！
・チャットの☆で「いいね」＆メモにコピー！
・メモは公開しない限り他の人に見えないから、自分用メモに専念してもOK!
（実験ログには、匿名でメモ内容だけ保存します。）`;
    }

    const pathname = window.location.pathname;
    const randomString = decodeURIComponent(pathname.split('/')[1]);

    // ログイン情報をサーバに送信
    const loginData = { loginName, randomString };
    socket.emit('sign-up', loginData);
    $('sign-up-name').textContent = loginName + 'さん';
});

function getCookie(name) {
    let match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
    return null;
}

function BackToLogin() {
    location.href = '/';
}

// 同時参加者数
socket.on('onlineUsers', (onlines) => {
    const num = onlines.length;
    let displayMsg;
    if (num > 25) {
        displayMsg = `現在${num}人が参加中。非常に高いアクティビティレベルです！`;
    } else if (num > 12) {
        displayMsg = `活発な会話が進行中！${num}人の意見を聞いてみましょう。`;
    } else if (num > 8) {
        displayMsg = `交流が深まっています。新しい話題を提供するチャンスです！`;
    } else if (num > 4) {
        displayMsg = `会話に加わりませんか？ブックマークや他の機能もおすすめです！`;
    } else if (num > 1) {
        displayMsg = `今が話題を切り出すチャンス！気軽に会話を始めてみましょう。`;
    } else {
        displayMsg = `贅沢なプライベート空間をお楽しみください！`;
    }

    console.log('onlines: ', num);
    $('onlines').textContent = displayMsg;
});

///////////////////////////////////////////////////
// 伏せカードオープン通知
// const openCardStatus = new Map();

// socket.on('notification', (data) => {
//     openCardStatus.set(data, data.nowTime);
// });

// setInterval(updateStatus, 1000);
// function updateStatus() {
//     let name, difference, text;

//     for (let [data, date] of openCardStatus) {
//         const elapsedTime = Date.now() - date;
//         if (elapsedTime > 20000) { openCardStatus.delete(data); } // 60sec passed => delete notification

//         name = data.name;
//         difference = Math.abs(data.difference);
//         const second = Math.round(difference / 1000);
//         text = second < 0 ? '' : `${name}さんが${second}秒前のメモを公開しました`;

//         if (difference > 60000) { // case: released memo was saved more than 60sec ago.
//             const minute = Math.round(difference / 60000);
//             text = `${name}さんが${minute}分前のメモを公開しました`;
//         }
//     }
//     notification.textContent = openCardStatus.size > 0 ? text : '';
// }

// notification.addEventListener('click', () => {
//     GoToTheOpenCard(Array.from(openCardStatus.keys())[0].id);
// });

// function GoToTheOpenCard(targetId) {
//     const targetElement = $(`${targetId}`);
//     if (targetElement) {
//         targetElement.scrollIntoView({
//             behavior: "smooth",
//             block: "center"
//         });
//         targetElement.style.backgroundColor = 'rgba(255, 255, 0, 0.5)';
//         setTimeout(() => {
//             targetElement.style.backgroundColor = '';
//         }, 3000);
//     } else {
//         console.error("指定された要素が見つかりませんでした");
//     }
// }

/////////////////////////////////////////////////////////////////////////

// 過去ログ受信
socket.on('pastLogs', ({ pastLogs, stackLogs }) => {
    handlePastLogs(pastLogs, stackLogs);
    messageLists.scrollTop = messageLists.scrollHeight;
});

// ソケットイベントと対応するハンドラをマッピング
const socketEventHandlers = {
    myChat: handleMyChat,                 // 自分のチャット・アンケート（ドラッグ可能）
    chatLogs: handleChatLogs,             // 他の人のチャット・アンケート

    memoLogs: handleMemoLogs,             // 自分メモ（ドラッグ可能）

    myOpenCard: processMyOpenCard,        // 自分のメモボタン公開（ドラッグ可能）
    downCard: processDownCard,            // 他の人のメモボタン公開

    broadcastDrop: handleBroadcastDrop,       // ドロップ他の人の重ねてオープン

    updateVote: handleUpdateVote,         // 投票を受信
    bookmark: updateBookmark,             // bookmark を受信

    dragstart: handleBroadcastDragStart,           // 他の人が D & D をしている（ドラッグ開始）
    dragend: handleBroadcastDragEnd,               // 他の人が D & D をしている（ドラッグ終了）
};

// ソケットイベントの登録を一括で行う
Object.entries(socketEventHandlers).forEach(([eventName, handler]) => {
    socket.on(eventName, handler);
});

// < アラート
socket.on('alert', (alertMsg) => {
    alert(alertMsg);
});

// < ダイアログ >
socket.on('dialog_to_html', (dialogMsg) => {
    socket.emit('dialog_to_js', confirm(dialogMsg) ? true : false);
});

// ここからハンドラ関数定義

// 過去ログ
function handlePastLogs(pastLogs, stackLogs) {
    pastLogs.forEach((pastElement) => {
        if (pastElement.options) {
            pastElement.childPostIds.length > 0
                ? addAccordionLog(pastElement, stackLogs) // 子分がいる
                : addSimpleLog(pastElement); // 子分がいない
        } else {
            handleMemoLogs(pastElement, false);
        }
    });
}

function addAccordionLog(pastElement, stackLogs) {// 子分がいる過去ログ
    const detailsContainer = createDetailsContainer(stackLogs, pastElement);
    addBeingDraggedListeners(detailsContainer);
    messageLists.appendChild(detailsContainer);
}

function addSimpleLog(pastElement) {// 子分がいない過去ログ
    const item = buildMlElement(pastElement);
    if (pastElement.memoId) { item.classList.add('downCard', 'visible'); }
    pastElement.name === loginName
        ? enableDragAndDrop(item)
        : addBeingDraggedListeners(item);
    appendChildWithIdAndScroll(item, pastElement, true);
}

function createDetailsContainer(stackLogs, pastElement) {
    // <details .ml>
    const detailsContainer = createHTMLelement('details', 'accordion');
    detailsContainer.classList.add('ml');

    // <summary .ml>
    const parentSummary = createParentSummary(pastElement);
    detailsContainer.appendChild(parentSummary);

    // <div .children> <p>child</p> </div>
    const children = createChildrenContainer(stackLogs, pastElement);
    detailsContainer.appendChild(children);

    const kobuns = filterKobuns(stackLogs, pastElement.childPostIds);
    const childCount = kobuns.length;
    detailsContainer.style.borderLeft = `${(childCount - 1) * 2}px solid #EF7D3C`; // 色が付くときと付かない時がある？
    return detailsContainer;
}

function createParentSummary(pastElement) { // <summary .ml>
    const parentSummary = createHTMLelement('summary');
    parentSummary.appendChild(createNameTimeMsg(pastElement));
    createSurveyContainer(pastElement, parentSummary);
    parentSummary.appendChild(createActionButtons(pastElement));

    if (pastElement.isOpenCard) {
        parentSummary.classList.add('downCard', 'visible');
    }
    appendChildWithIdAndScroll(parentSummary, pastElement, false);

    return parentSummary;
}

function filterKobuns(stackLogs, childPostIds) {
    return stackLogs.filter(stackElement => childPostIds.includes(stackElement.id));
}

function createChildrenContainer(stackLogs, pastElement) { // <div .children>
    const children = createHTMLelement('div', 'children');
    const kobuns = filterKobuns(stackLogs, pastElement.childPostIds);

    kobuns.forEach(kobun => {
        const child = createChildElement(kobun); // <p .child>
        children.appendChild(child);
    });

    return children;
}

function createChildElement(kobun) { // <p .child>
    const child = createHTMLelement('p', 'child');
    child.appendChild(createNameTimeMsg(kobun));
    createSurveyContainer(kobun, child);
    child.appendChild(createActionButtons(kobun));
    child.id = kobun.id;
    return child;
}

// 自分のチャット
function handleMyChat(post) { // MyChat ドラッグ可能
    const item = buildMlElement(post);
    enableDragAndDrop(item);
    item.classList.add('myChat');
    appendChildWithIdAndScroll(item, post, true);
}

// 他の人のチャット
function handleChatLogs(post) { // ChatLogs
    const item = buildMlElement(post);
    addBeingDraggedListeners(item);
    appendChildWithIdAndScroll(item, post, true);
}

// 自分のメモ
function handleMemoLogs(memo, shouldScroll = true) { // ドラッグ可能
    const item = buildMlBaseStructure(memo, '[memo]');
    item.classList.add('memo');
    const memoSendContainer = buildMemoSendContainer(memo);
    item.appendChild(memoSendContainer);

    enableDragAndDrop(item);
    appendChildWithIdAndScroll(item, memo, shouldScroll);
}

// 自分のメモボタン公開
function processMyOpenCard(msg) { // ドラッグ可能
    processDownCard(msg, true);
}

// メモボタン公開(共通)
function processDownCard(msg, isMine = false) {
    const opencardCreatedAt = msg.memoCreatedAt;
    const timeSpanArray = document.querySelectorAll("#messageLists div span.time");

    for (let i = 0; i < timeSpanArray.length; i++) {
        const compareCreatedAt = timeSpanArray[i].textContent;
        const isBefore = checkIsBefore(opencardCreatedAt, compareCreatedAt);

        if (isBefore) {// メモ作成時の時間が入る場所がある
            insertDownCard(msg, timeSpanArray, i, false, isMine);
            return;
        }
        if (i === timeSpanArray.length - 1) { // 最新
            insertDownCard(msg, timeSpanArray, i, true, isMine);
            return;
        }
    }
}

function handleBroadcastDrop(data) {
    console.log('handleBroadcastDrop: ', data);
    const draggedElement = $(data.draggedId);
    const dropElement = $(data.dropId);
    const parentDIV = dropElement.closest('.accordion');
    if (parentDIV) {
        addChildElement(parentDIV, draggedElement);

        const childPElements = parentDIV.querySelectorAll('p.child');
        const childPCount = childPElements.length;
        parentDIV.style.borderLeft = `${(childPCount - 1) * 2}px solid #EF7D3C`;

        const parentSummary = parentDIV.querySelector('summary');
        draggedElement.style.visibility = '';
        parentSummary.style.border = "";
        parentSummary.style.color = '';
    } else {
        createKasaneDiv(draggedElement, dropElement);
    }
}

function buildMemoSendContainer(memo) {
    const memoSendContainer = createHTMLelement('div', 'memoSend-container');

    const memoSendButton = createHTMLelement('button', 'memoSendButton', '🚀');
    memoSendButton.addEventListener('click', e => {
        memoSendButton.classList.add("active");
        e.preventDefault();
        socket.emit('revealMemo', memo);
        memoSendButton.disabled = true;
        const memoDiv = memoSendButton.closest('.memo');
        memoDiv.classList.add('translucent');
        memoDiv.classList.remove('draggable');
        memoDiv.attributes.removeNamedItem('draggable');
    });

    memoSendContainer.appendChild(memoSendButton);
    return memoSendContainer;
}


function insertDownCard(msg, timeSpanArray, index, isLatest = false, isMine) {
    const item = buildMlElement(msg);

    isMine ? enableDragAndDrop(item) : addBeingDraggedListeners(item);

    isLatest
        ? appendChildWithIdAndScroll(item, msg, true) // 最新の場合
        : insertItemBeforeParent(timeSpanArray, index, item);

    item.id = msg.id;
    item.classList.add('ml', 'downCard', 'visible');
}

function insertItemBeforeParent(timeSpanArray, index, item) {
    let parentDIV = timeSpanArray[index].closest('.ml');
    if (parentDIV.parentNode.classList.contains('kasane')) {
        parentDIV = parentDIV.parentNode;
    }
    messageLists.insertBefore(item, parentDIV);
}

function handleUpdateVote(voteData) {
    const item = $(voteData.id);
    voteData.voteSums.forEach((voteSum, i) => {
        const surveyNum = item.querySelector(`.survey-num.option${i}`);
        surveyNum.textContent = voteSum;
    });
}

function updateBookmark(data) {
    const item = $(data.id);
    if (item) {
        const countElement = item.querySelector('.bookmark-container span');
        if (countElement) { countElement.textContent = data.count; }
    }
}

function handleBroadcastDragStart(draggedId) {
    updateElementBorder(draggedId, '3px dotted');
}

function handleBroadcastDragEnd(draggedId) {
    updateElementBorder(draggedId, '');
}

function updateElementBorder(elementId, borderStyle) {
    const element = $(elementId);
    if (element) { element.style.border = borderStyle; }
}

// Initialize the dragged element
let draggedElement = null;

function addDragListeners(element) {
    element.addEventListener('dragstart', handleDragStart);
    element.addEventListener('dragend', handleDragEnd);
}

function addBeingDraggedListeners(element) {
    element.addEventListener('dragover', handleDragOver);
    element.addEventListener('dragleave', handleDragLeave);
    element.addEventListener('drop', handleDrop);
}

function handleDragStart(event) {
    event.dataTransfer.effectAllowed = "move";
    draggedElement = event.target;
    setTimeout(() => {
        event.target.style.visibility = 'hidden'; // Hide the element during the drag
    }, 0);
    socket.emit('dragstart', event.target.id);
}

function handleDragEnd(event) {
    event.target.style.visibility = ''; // Restore visibility
    draggedElement = null;
    socket.emit('dragend', event.target.id);
}

function handleDragOver(event) {
    // Restrict drop targets based on classes
    if (event.target.classList.contains("name-time-msg") || event.target.classList.contains("buttons")) {
        event.dataTransfer.dropEffect = "none"; // Disable drop for invalid targets
        return;
    }
    event.preventDefault();
    this.style.backgroundColor = '#F0F8FF';
}

function handleDragLeave(event) {
    this.style.backgroundColor = ''; // Reset visual feedback
    event.preventDefault();
    event.stopPropagation();
}

function handleDrop(event) {
    this.style.backgroundColor = ''; // Reset visual feedback
    event.preventDefault();
    event.stopPropagation();

    const dropElement = event.target.closest('.ml');

    if (!draggedElement) { console.log('no draggedElement'); return; }
    if (!dropElement) { console.log('no dropElement'); return; }

    draggedElement.classList.contains('memo')
        ? console.log('メモを動かしている')
        : overtDrop(dropElement);
}

// chat / opencard を重ねる
function overtDrop(dropElement) {
    const parentDIV = dropElement.closest('.accordion');
    let dropId;
    if (parentDIV) {
        addChildElement(parentDIV, draggedElement);
        const summaryElement = parentDIV.querySelector('summary');
        dropId = summaryElement.id;

        const childPElements = parentDIV.querySelectorAll('p.child');
        const childPCount = childPElements.length;
        parentDIV.style.borderLeft = `${(childPCount - 1) * 2}px solid #EF7D3C`;
    } else {
        createKasaneDiv(draggedElement, dropElement);
        dropId = dropElement.id;
    }
    const twoID = { draggedId: draggedElement.id, dropId: dropId };
    socket.emit('drop', twoID);
}

function changeTagName(oldElement, newTagName) {
    const newElement = document.createElement(newTagName);

    [...oldElement.attributes].forEach(attr => {
        if (attr.name !== 'class' && attr.name !== 'draggable') {
            newElement.setAttribute(attr.name, attr.value);
        }
    });

    // 子ノードをコピー
    while (oldElement.firstChild) {
        newElement.appendChild(oldElement.firstChild);
    }

    // 元の要素を新しい要素で置き換える
    oldElement.parentNode
        ? oldElement.parentNode.replaceChild(newElement, oldElement)
        : console.log('newElement: ', newElement);

    return newElement;
}

// 既に開いているものを重ねる
function createKasaneDiv(draggedElement, dropElement) {
    const detailsContainer = createHTMLelement('details', 'accordion');
    detailsContainer.classList.add('ml');
    addBeingDraggedListeners(detailsContainer);
    messageLists.insertBefore(detailsContainer, dropElement);

    const parentSummary = changeTagName(dropElement, 'summary');
    detailsContainer.appendChild(parentSummary);

    const children = createHTMLelement('div', 'children');

    const child = changeTagName(draggedElement, 'p');
    child.classList.add('child');
    child.style.visibility = '';

    children.appendChild(child);
    detailsContainer.appendChild(children);

    const childCount = detailsContainer.children.length; // 要素ノードの数を取得
    detailsContainer.style.borderLeft = `${(childCount - 1) * 2}px solid #EF7D3C`;

    draggedElement.style.visibility = '';
    parentSummary.style.border = "";
    parentSummary.style.color = '';
}

function addChildElement(parentDIV, draggedElement) {
    const childrenContainer = parentDIV.querySelector('.children');
    const child = changeTagName(draggedElement, 'p');
    child.classList.add('child');
    child.style.visibility = '';
    childrenContainer.appendChild(child);
}

function createHTMLelement(tag, className = '', text = '') {
    try {
        const element = document.createElement(tag);
        if (className) element.classList.add(className);
        if (text) element.textContent = text;
        return element;
    } catch (error) {
        console.error(`Invalid element creation: ${error.message}`);
        return null;  // 要素の作成に失敗した場合、nullを返す
    }
}

function buildMlElement(message) { // chat
    const item = buildMlBaseStructure(message, message.name);
    createSurveyContainer(message, item);
    item.appendChild(createActionButtons(message));
    return item;
}

function createSurveyContainer(message, item) {
    if (message.options) {
        const surveyContainer = makeSurveyContainerElement(message);
        item.appendChild(surveyContainer);
    }
}

function buildMlBaseStructure(msg, nameText) {
    const item = createHTMLelement('div', 'ml');
    const userNameTimeMsg = createNameTimeMsg(msg, nameText);
    item.appendChild(userNameTimeMsg);
    return item;
}

function createNameTimeMsg(message, nameText = message.name) {
    const userNameTimeMsg = createHTMLelement('div', 'userName-time-msg');
    const userName_time = createHTMLelement('div', 'userName-time');
    const userName = createHTMLelement('span', 'userName', nameText);

    const timeData = message.memoCreatedAt ? message.memoCreatedAt : message.createdAt;
    // console.log('timeData: ', message.memoCreatedAt ? 'memoCreatedAt' : 'createdAt');
    const time = createHTMLelement('span', 'time', organizeCreatedAt(timeData));

    userName_time.append(userName, time);
    userNameTimeMsg.appendChild(userName_time);

    const message_div = createHTMLelement('div', 'message-text', message.msg);
    userNameTimeMsg.appendChild(message_div);

    return userNameTimeMsg;
}

function makeSurveyContainerElement(message) {
    const surveyContainer = createHTMLelement('div', 'survey-container');
    for (let i = 0; i < message.options.length; i++) {
        const surveyOption = createHTMLelement('button', 'survey-option', message.options[i] || '');
        surveyOption.addEventListener('click', () => {
            socket.emit('survey', message.id, i);
        });
        const surveyNum = createHTMLelement('span', 'survey-num', `${message.voteSums[i]}`);
        surveyNum.classList.add(`option${i}`);
        surveyContainer.append(surveyOption, surveyNum);
    }
    return surveyContainer;
}
function createActionButtons(message) {
    const buttons = createHTMLelement('div', 'buttons');
    const bookmarkButton = makeBookmarkButton(message);

    if (message.isBookmarked) {
        bookmarkButton.classList.add("active");
        bookmarkButton.textContent = '★';
    }
    buttons.appendChild(bookmarkButton);
    return buttons;
}

function makeBookmarkButton(message) {
    const container = createHTMLelement('div', 'bookmark-container');
    const button = createHTMLelement('button', 'actionButton', '☆');
    const count = createHTMLelement('span', 'bookmark-count', message.bookmarks || 0);

    setupBookmarkClickHandler(button, message);

    container.append(button, count);
    return container;
}

function setupBookmarkClickHandler(button, message) {
    button.addEventListener('click', (event) => {
        event.stopPropagation(); // 親や子への伝播を防ぐ

        button.classList.toggle("active");
        const isActive = button.classList.contains("active");
        if (isActive) {
            button.textContent = '★';
            addToMemoPad(message);
        } else {
            button.textContent = '☆';
        }
        const data = { id: message.id, active: isActive };
        socket.emit('bookmark', data);
    });
}

function addToMemoPad(message) {
    const messageContent = message.msg + '(' + message.name + ')' + '\n';
    memoPad.value += messageContent;
    updateSaveData();
}

function enableDragAndDrop(item) {
    item.setAttribute('draggable', 'true');
    item.classList.add('draggable');
    addDragListeners(item);
    addBeingDraggedListeners(item);
}

function appendChildWithIdAndScroll(item, message = {}, shouldScroll = true) {
    messageLists.appendChild(item);
    message.id ? item.id = message.id : console.log('message.id is not found', message.msg);
    if (shouldScroll) { messageLists.scrollTop = messageLists.scrollHeight; }
}

let chatName = '匿名';
nameSelect.addEventListener('change', () => {
    chatName = nameSelect.value;
    console.log('changeName: ', chatName);
});

form.addEventListener('submit', (event) => {
    event.preventDefault();
    console.log(chatName);
    if (!chatName) {
        alert('名前を選択してください');
        return;
    }
    console.log();
    const data = { msg: input.value, chatName };
    socket.emit('chat message', data);
    input.value = '';
});

function checkIsBefore(target, compareCreatedAt) {
    const targetDate = new Date(target);
    const compareCreatedAtDate = new Date(compareCreatedAt);
    return targetDate < compareCreatedAtDate;
}

function organizeCreatedAt(createdAt) {
    const UTCdate = new Date(createdAt);
    if (isNaN(UTCdate.getTime())) {
        console.error("無効な日時:", createdAt);
        return "Invalid Date";
    }
    return UTCdate.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}