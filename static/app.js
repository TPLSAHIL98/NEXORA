const chat = document.getElementById("chat");
const message = document.getElementById("message");
const send = document.getElementById("send");
const model = document.getElementById("model");

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const closeSidebar = document.getElementById("closeSidebar");
const newChatBtn = document.getElementById("newChat");
const chatHistory = document.getElementById("chatHistory");

const stopBtn = document.getElementById("stopBtn");
const settingsBtn = document.getElementById("settingsBtn");

let chats = [];
let currentChat = null;
let activeController = null;
let isGenerating = false;


/* =========================
   STORAGE
========================= */

function saveChats() {
    localStorage.setItem(
        "nexora_chats",
        JSON.stringify(chats)
    );
}

function loadChats() {
    try {
        chats =
            JSON.parse(
                localStorage.getItem("nexora_chats")
            ) || [];
    } catch {
        chats = [];
    }

    if (chats.length > 0) {
        currentChat = chats[0];
    }

    renderHistory();
    renderChat();
}


/* =========================
   CHAT CREATION
========================= */

function createChat() {
    const newChat = {
        id:
            typeof crypto !== "undefined" &&
            crypto.randomUUID
                ? crypto.randomUUID()
                : Date.now().toString(),

        title: "New Chat",

        messages: []
    };

    chats.unshift(newChat);

    currentChat = newChat;

    saveChats();

    renderHistory();
    renderChat();
}


/* =========================
   CHAT HISTORY
========================= */

function renderHistory() {
    if (!chatHistory) return;

    chatHistory.innerHTML = "";

    for (const item of chats) {
        const row =
            document.createElement("div");

        row.className =
            "history-item" +
            (
                currentChat &&
                currentChat.id === item.id
                    ? " active"
                    : ""
            );

        const title =
            document.createElement("span");

        title.textContent =
            item.title || "New Chat";

        const del =
            document.createElement("button");

        del.type = "button";
        del.textContent = "×";

        del.setAttribute(
            "aria-label",
            "Delete chat"
        );

        del.addEventListener(
            "click",
            function(event) {

                event.stopPropagation();

                chats =
                    chats.filter(
                        c => c.id !== item.id
                    );

                if (
                    currentChat &&
                    currentChat.id === item.id
                ) {
                    currentChat =
                        chats.length
                            ? chats[0]
                            : null;
                }

                saveChats();

                renderHistory();
                renderChat();
            }
        );

        row.appendChild(title);
        row.appendChild(del);

        row.addEventListener(
            "click",
            function() {

                if (isGenerating) {
                    return;
                }

                currentChat = item;

                renderHistory();
                renderChat();

                if (sidebar) {
                    sidebar.classList.remove(
                        "open"
                    );
                }
            }
        );

        chatHistory.appendChild(row);
    }
}


/* =========================
   HTML ESCAPING
========================= */

function escapeHTML(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================
   MARKDOWN
========================= */

function renderMarkdown(text) {

    if (!text) {
        return "";
    }

    const codeBlocks = [];

    let source = String(text);

    source =
        source.replace(
            /```([a-zA-Z0-9_+#.-]*)\n?([\s\S]*?)```/g,
            function(_, language, code) {

                const index =
                    codeBlocks.length;

                codeBlocks.push({
                    language:
                        language || "Code",

                    code:
                        code.replace(
                            /\n$/,
                            ""
                        )
                });

                return (
                    "@@NEXORA_CODE_" +
                    index +
                    "@@"
                );
            }
        );

    source = escapeHTML(source);

    source =
        source.replace(
            /`([^`\n]+)`/g,
            "<code>$1</code>"
        );

    source =
        source.replace(
            /\*\*(.+?)\*\*/g,
            "<strong>$1</strong>"
        );

    source =
        source.replace(
            /(^|[^\*])\*([^*\n]+)\*(?!\*)/g,
            "$1<em>$2</em>"
        );

    source =
        source.replace(
            /^### (.+)$/gm,
            "<h4>$1</h4>"
        );

    source =
        source.replace(
            /^## (.+)$/gm,
            "<h3>$1</h3>"
        );

    source =
        source.replace(
            /^# (.+)$/gm,
            "<h2>$1</h2>"
        );

    source =
        source.replace(
            /^\s*[-*] (.+)$/gm,
            "<li>$1</li>"
        );

    source =
        source.replace(
            /(<li>.*<\/li>(?:<br>)?)+/g,
            "<ul>$&</ul>"
        );

    source =
        source.replace(
            /^\s*\d+\. (.+)$/gm,
            "<li>$1</li>"
        );

    source =
        source.replace(
            /\n/g,
            "<br>"
        );

    codeBlocks.forEach(
        function(block, index) {

            const codeHTML = `
                <div class="nexora-code-wrapper">

                    <div class="nexora-code-header">

                        <span class="nexora-code-language">
                            ${escapeHTML(
                                block.language
                            )}
                        </span>

                        <button
                            class="nexora-copy-btn"
                            type="button"
                            aria-label="Copy code"
                        >
                            Copy
                        </button>

                    </div>

                    <pre><code>${escapeHTML(
                        block.code
                    )}</code></pre>

                </div>
            `;

            source =
                source.replace(
                    "@@NEXORA_CODE_" +
                    index +
                    "@@",
                    codeHTML
                );
        }
    );

    return source;
}


/* =========================
   COPY CODE
========================= */

async function copyCode(
    button,
    code
) {

    try {

        if (
            navigator.clipboard &&
            navigator.clipboard.writeText
        ) {

            await navigator.clipboard.writeText(
                code
            );

        } else {

            throw new Error(
                "Clipboard unavailable"
            );
        }

        button.textContent =
            "Copied ✓";

        setTimeout(
            function() {
                button.textContent =
                    "Copy";
            },
            1500
        );

    } catch {

        try {

            const textarea =
                document.createElement(
                    "textarea"
                );

            textarea.value = code;

            textarea.style.position =
                "fixed";

            textarea.style.left =
                "-9999px";

            document.body.appendChild(
                textarea
            );

            textarea.focus();
            textarea.select();

            document.execCommand(
                "copy"
            );

            textarea.remove();

            button.textContent =
                "Copied ✓";

            setTimeout(
                function() {
                    button.textContent =
                        "Copy";
                },
                1500
            );

        } catch {

            button.textContent =
                "Copy failed";

            setTimeout(
                function() {
                    button.textContent =
                        "Copy";
                },
                1500
            );
        }
    }
}


function attachCopyButtons(
    container
) {

    if (!container) {
        return;
    }

    if (container._nexoraCopyHandler) {

        container.removeEventListener(
            "click",
            container._nexoraCopyHandler
        );
    }

    const handler =
        function(event) {

            const button =
                event.target.closest(
                    ".nexora-copy-btn"
                );

            if (!button) {
                return;
            }

            event.preventDefault();

            const wrapper =
                button.closest(
                    ".nexora-code-wrapper"
                );

            if (!wrapper) {
                return;
            }

            const code =
                wrapper.querySelector(
                    "pre code"
                );

            if (!code) {
                return;
            }

            copyCode(
                button,
                code.textContent
            );
        };

    container.addEventListener(
        "click",
        handler
    );

    container._nexoraCopyHandler =
        handler;
}


/* =========================
   RENDER CHAT
========================= */

function renderChat() {

    if (!chat) {
        return;
    }

    chat.innerHTML = "";

    if (
        !currentChat ||
        !currentChat.messages ||
        currentChat.messages.length === 0
    ) {

        chat.innerHTML = `
            <div class="welcome">

                <div class="big-logo">
                    N
                </div>

                <h2>
                    Welcome to NEXORA
                </h2>

                <p>
                    One interface. Every intelligence.
                </p>

            </div>
        `;

        return;
    }

    for (
        const msg of currentChat.messages
    ) {

        if (msg.role === "user") {

            addMessage(
                "user",
                msg.content
            );

        } else if (
            msg.role === "assistant"
        ) {

            addMessage(
                "ai",
                msg.content,
                msg.model
            );
        }
    }
}


/* =========================
   ADD MESSAGE
========================= */

function addMessage(
    type,
    text = "",
    modelName = ""
) {

    const box =
        document.createElement(
            "div"
        );

    box.className =
        `message ${type}`;

    if (modelName) {

        const tag =
            document.createElement(
                "div"
            );

        tag.className =
            "model-tag";

        tag.textContent =
            modelName;

        box.appendChild(tag);
    }

    const content =
        document.createElement(
            "div"
        );

    content.className =
        "response-content";

    if (type === "ai") {

        content.innerHTML =
            renderMarkdown(text);

        attachCopyButtons(
            content
        );

    } else {

        content.textContent =
            text;
    }

    box.appendChild(content);

    chat.appendChild(box);

    return content;
}


/* =========================
   THINKING MESSAGE
========================= */

function createThinkingMessage(
    modelName
) {

    const box =
        document.createElement(
            "div"
        );

    box.className =
        "message ai";

    const tag =
        document.createElement(
            "div"
        );

    tag.className =
        "model-tag";

    tag.textContent =
        modelName;

    const thinking =
        document.createElement(
            "div"
        );

    thinking.className =
        "thinking";

    thinking.innerHTML = `
        <div class="thinking-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>

        <span>
            Thinking…
        </span>
    `;

    const content =
        document.createElement(
            "div"
        );

    content.className =
        "response-content";

    box.appendChild(tag);
    box.appendChild(thinking);
    box.appendChild(content);

    chat.appendChild(box);

    return {
        box,
        thinking,
        content
    };
}


/* =========================
   GENERATING STATE
========================= */

function setGeneratingState(
    generating
) {

    isGenerating =
        generating;

    if (send) {

        send.disabled =
            generating;

        send.hidden =
            generating;
    }

    if (stopBtn) {

        stopBtn.hidden =
            !generating;
    }
}


/* =========================
   STOP GENERATION
========================= */

function stopGeneration() {

    if (
        !isGenerating ||
        !activeController
    ) {
        return;
    }

    activeController.abort();

    activeController = null;

    setGeneratingState(false);
}


/* =========================
   LOAD MODELS
========================= */

async function loadModels() {

    if (!model) {
        return;
    }

    model.innerHTML =
        "<option>Loading models...</option>";

    try {

        const response =
            await fetch(
                "/api/models",
                {
                    method: "GET",
                    cache: "no-store"
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.error ||
                "HTTP " +
                response.status
            );
        }

        if (
            !Array.isArray(
                data.models
            ) ||
            data.models.length === 0
        ) {

            throw new Error(
                "No models returned by server"
            );
        }

        model.innerHTML = "";

        const groups = {};

        for (
            const item of data.models
        ) {

            if (
                !item ||
                !item.id
            ) {
                continue;
            }

            const provider =
                item.provider ||
                "Other";

            if (!groups[provider]) {
                groups[provider] = [];
            }

            groups[provider].push(
                item
            );
        }

        const providerOrder = [
            "OpenAI",
            "Anthropic",
            "Google",
            "Meta",
            "Mistral",
            "DeepSeek",
            "Qwen",
            "xAI",
            "Other"
        ];

        const providers =
            Object.keys(groups).sort(
                function(a, b) {

                    const ai =
                        providerOrder.indexOf(
                            a
                        );

                    const bi =
                        providerOrder.indexOf(
                            b
                        );

                    if (
                        ai === -1 &&
                        bi === -1
                    ) {
                        return a.localeCompare(
                            b
                        );
                    }

                    if (ai === -1) {
                        return 1;
                    }

                    if (bi === -1) {
                        return -1;
                    }

                    return ai - bi;
                }
            );

        for (
            const provider of providers
        ) {

            const group =
                document.createElement(
                    "optgroup"
                );

            group.label =
                provider;

            groups[provider].sort(
                function(a, b) {

                    return String(
                        a.name ||
                        a.id
                    ).localeCompare(
                        String(
                            b.name ||
                            b.id
                        )
                    );
                }
            );

            for (
                const item of groups[
                    provider
                ]
            ) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    item.id;

                option.textContent =
                    item.name ||
                    item.id;

                option.dataset.provider =
                    provider;

                option.dataset.type =
                    item.type ||
                    "chat";

                group.appendChild(
                    option
                );
            }

            model.appendChild(
                group
            );
        }

        const savedModel =
            localStorage.getItem(
                "nexora_model"
            );

        const savedExists =
            savedModel &&
            Array.from(
                model.options
            ).some(
                option =>
                    option.value ===
                    savedModel
            );

        if (savedExists) {

            model.value =
                savedModel;

        } else if (
            model.options.length > 0
        ) {

            model.selectedIndex = 0;
        }

        console.log(
            "NEXORA: Loaded " +
            data.models.length +
            " models."
        );

    } catch (error) {

        console.error(
            "NEXORA model error:",
            error
        );

        model.innerHTML =
            "<option>Model error: " +
            escapeHTML(
                error.message
            ) +
            "</option>";
    }
}


/* =========================
   SEND MESSAGE
========================= */

async function sendMessage() {

    const text =
        message
            ? message.value.trim()
            : "";

    const selectedModel =
        model
            ? model.value
            : "";

    if (
        !text ||
        !selectedModel ||
        isGenerating
    ) {
        return;
    }

    if (!currentChat) {
        createChat();
    }

    const welcome =
        document.querySelector(
            ".welcome"
        );

    if (welcome) {
        welcome.remove();
    }

    const selectedOption =
        model.options[
            model.selectedIndex
        ];

    const modelName =
        selectedOption
            ? selectedOption.textContent
            : selectedModel;

    addMessage(
        "user",
        text
    );

    currentChat.messages.push({
        role: "user",
        content: text
    });

    if (
        currentChat.title ===
        "New Chat"
    ) {

        currentChat.title =
            text.length > 32
                ? text.substring(
                    0,
                    32
                ) + "…"
                : text;

        renderHistory();
    }

    saveChats();

    const thinkingUI =
        createThinkingMessage(
            modelName
        );

    message.value = "";

    message.style.height =
        "auto";

    setGeneratingState(true);

    activeController =
        new AbortController();

    try {

        const apiMessages 
