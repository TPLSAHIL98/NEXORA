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

let chats = [];
let currentChat = null;
let activeController = null;
let isGenerating = false;


/* -------------------------
   STORAGE
------------------------- */

function saveChats() {
    localStorage.setItem(
        "nexora_chats",
        JSON.stringify(chats)
    );
}


function loadChats() {
    try {
        chats = JSON.parse(
            localStorage.getItem("nexora_chats")
        ) || [];
    } catch {
        chats = [];
    }

    renderHistory();
}


/* -------------------------
   CHAT CREATION
------------------------- */

function createChat() {

    const newChat = {
        id: crypto.randomUUID(),
        title: "New Chat",
        messages: []
    };

    chats.unshift(newChat);

    currentChat = newChat;

    saveChats();

    renderHistory();

    renderChat();
}


/* -------------------------
   HISTORY
------------------------- */

function renderHistory() {

    chatHistory.innerHTML = "";

    for (const item of chats) {

        const row =
            document.createElement("div");

        row.className =
            "history-item" +
            (currentChat?.id === item.id
                ? " active"
                : "");

        const title =
            document.createElement("span");

        title.textContent =
            item.title || "New Chat";

        const del =
            document.createElement("button");

        del.textContent = "×";

        del.onclick = event => {

            event.stopPropagation();

            chats = chats.filter(
                c => c.id !== item.id
            );

            if (
                currentChat?.id ===
                item.id
            ) {
                currentChat =
                    chats[0] || null;
            }

            saveChats();

            renderHistory();
            renderChat();
        };

        row.appendChild(title);
        row.appendChild(del);

        row.onclick = () => {

            if (isGenerating) {
                return;
            }

            currentChat = item;

            renderHistory();
            renderChat();

            sidebar.classList.remove(
                "open"
            );
        };

        chatHistory.appendChild(row);
    }
}


/* -------------------------
   HTML ESCAPE
------------------------- */

function escapeHTML(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* -------------------------
   MARKDOWN RENDERER
------------------------- */

function renderMarkdown(text) {

    if (!text) {
        return "";
    }

    const codeBlocks = [];

    // Protect fenced code blocks first
    let source = String(text).replace(
        /```([a-zA-Z0-9_+#.-]*)\n?([\s\S]*?)```/g,
        function (_, language, code) {

            const id =
                `nexora-code-${codeBlocks.length}`;

            codeBlocks.push({
                id,
                language:
                    language || "Code",
                code: code.replace(/\n$/, "")
            });

            return `@@CODEBLOCK_${codeBlocks.length - 1}@@`;
        }
    );

    source = escapeHTML(source);

    // Inline code
    source = source.replace(
        /`([^`\n]+)`/g,
        "<code>$1</code>"
    );

    // Bold
    source = source.replace(
        /\*\*(.+?)\*\*/g,
        "<strong>$1</strong>"
    );

    // Italic
    source = source.replace(
        /(^|[^\*])\*([^*\n]+)\*(?!\*)/g,
        "$1<em>$2</em>"
    );

    // Headings
    source = source.replace(
        /^### (.+)$/gm,
        "<h4>$1</h4>"
    );

    source = source.replace(
        /^## (.+)$/gm,
        "<h3>$1</h3>"
    );

    source = source.replace(
        /^# (.+)$/gm,
        "<h2>$1</h2>"
    );

    // Unordered lists
    source = source.replace(
        /^\s*[-*] (.+)$/gm,
        "<li>$1</li>"
    );

    source = source.replace(
        /(<li>.*<\/li>\n?)+/g,
        "<ul>$&</ul>"
    );

    // Ordered lists
    source = source.replace(
        /^\s*\d+\. (.+)$/gm,
        "<li>$1</li>"
    );

    // Line breaks
    source = source.replace(
        /\n/g,
        "<br>"
    );

    // Restore code blocks
    codeBlocks.forEach(
        (block, index) => {

            const escapedCode =
                escapeHTML(block.code);

            const codeHTML = `
                <div class="nexora-code-wrapper">
                    <div class="nexora-code-header">
                        <span class="nexora-code-language">
                            ${escapeHTML(block.language)}
                        </span>

                        <button
                            class="nexora-copy-btn"
                            type="button"
                            data-code-index="${index}"
                        >
                            Copy
                        </button>
                    </div>

                    <pre><code>${escapedCode}</code></pre>
                </div>
            `;

            source =
                source.replace(
                    `@@CODEBLOCK_${index}@@`,
                    codeHTML
                );
        }
    );

    return source;
}


/* -------------------------
   COPY CODE
------------------------- */

async function copyCode(button, code) {

    try {

        await navigator.clipboard.writeText(
            code
        );

        button.textContent =
            "Copied ✓";

        setTimeout(() => {
            button.textContent =
                "Copy";
        }, 1500);

    } catch {

        const textarea =
            document.createElement("textarea");

        textarea.value = code;

        textarea.style.position =
            "fixed";

        textarea.style.opacity = "0";

        document.body.appendChild(
            textarea
        );

        textarea.select();

        document.execCommand("copy");

        textarea.remove();

        button.textContent =
            "Copied ✓";

        setTimeout(() => {
            button.textContent =
                "Copy";
        }, 1500);
    }
}


/* -------------------------
   CODE BUTTON EVENTS
------------------------- */

function attachCopyButtons(container) {

    const buttons =
        container.querySelectorAll(
            ".nexora-copy-btn"
        );

    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const wrapper =
                    button.closest(
                        ".nexora-code-wrapper"
                    );

                const code =
                    wrapper.querySelector(
                        "code"
                    );

                if (!code) {
                    return;
                }

                copyCode(
                    button,
                    code.textContent
                );
            }
        );
    });
}


/* -------------------------
   RENDER CHAT
------------------------- */

function renderChat() {

    chat.innerHTML = "";

    if (
        !currentChat ||
        currentChat.messages.length === 0
    ) {

        chat.innerHTML = `
            <div class="welcome">
                <div class="big-logo">N</div>
                <h2>Welcome to NEXORA</h2>
                <p>One interface. Every intelligence.</p>
            </div>
        `;

        return;
    }

    for (const msg of currentChat.messages) {

        if (msg.role === "user") {

            addMessage(
                "user",
                msg.content
            );

        } else {

            addMessage(
                "ai",
                msg.content,
                msg.model
            );
        }
    }
}


/* -------------------------
   MESSAGE UI
------------------------- */

function addMessage(
    type,
    text = "",
    modelName = ""
) {

    const box =
        document.createElement("div");

    box.className =
        `message ${type}`;

    if (modelName) {

        const tag =
            document.createElement("div");

        tag.className =
            "model-tag";

        tag.textContent =
            modelName;

        box.appendChild(tag);
    }

    const content =
        document.createElement("div");

    content.className =
        "response-content";

    if (type === "ai") {

        content.innerHTML =
            renderMarkdown(text);

        attachCopyButtons(content);

    } else {

        content.textContent =
            text;
    }

    box.appendChild(content);

    chat.appendChild(box);

    return content;
}


/* -------------------------
   THINKING MESSAGE
------------------------- */

function createThinkingMessage(
    modelName
) {

    const box =
        document.createElement("div");

    box.className =
        "message ai";

    const tag =
        document.createElement("div");

    tag.className =
        "model-tag";

    tag.textContent =
        modelName;

    const thinking =
        document.createElement("div");

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
        document.createElement("div");

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


/* -------------------------
   STOP GENERATION
------------------------- */

function stopGeneration() {

    if (
        isGenerating &&
        activeController
    ) {

        activeController.abort();

        activeController = null;

        isGenerating = false;

        if (send) {
            send.disabled = false;
            send.hidden = false;
        }

        if (stopBtn) {
            stopBtn.hidden = true;
        }
    }
}


/* -------------------------
   BUTTON STATE
------------------------- */

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


/* -------------------------
   MODELS
------------------------- */

async function loadModels() {

    try {

        const response =
            await fetch("/api/models");

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.error ||
                "Failed to load models"
            );
        }

        model.innerHTML = "";

        const groups = {
            GPT: [],
            Claude: [],
            Gemini: []
        };

        for (
            const item
            of data.models
        ) {

            if (
                item.id.startsWith(
                    "gpt-"
                )
            ) {

                groups.GPT.push(item);

            } else if (
                item.id.startsWith(
                    "claude-"
                )
            ) {

                groups.Claude.push(item);

            } else if (
                item.id.startsWith(
                    "gemini-"
                )
            ) {

                groups.Gemini.push(item);
            }
        }

        for (
            const [groupName, items]
            of Object.entries(groups)
        ) {

            if (!items.length) {
                continue;
            }

            const group =
                document.createElement(
                    "optgroup"
                );

            group.label =
                groupName;

            for (
                const item
                of items
            ) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    item.id;

                option.textContent =
                    item.id;

                group.appendChild(
                    option
                );
            }

            model.appendChild(
                group
            );
        }

    } catch (error) {

        model.innerHTML = `
            <option value="">
                Model loading failed
            </option>
        `;

        console.error(
            "NEXORA model loading error:",
            error
        );
    }
}


/* -------------------------
   SEND
------------------------- */

async function sendMessage() {

    const text =
        message.value.trim();

    const selectedModel =
        model.value;

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

    const modelName =
        model.options[
            model.selectedIndex
        ]?.text ||
        selectedModel;

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
                ? text.substring(0, 32) + "…"
                : text;

        renderHistory();
    }

    saveChats();

    const thinkingUI =
        createThinkingMessage(
            modelName
        );

    message.value = "";

    setGeneratingState(true);

    activeController =
        new AbortController();

    try {

        /*
         * IMPORTANT:
         * Only send role + content
         * to the backend.
         *
         * The UI's "model" property
         * stays local.
         */

        const apiMessages =
            currentChat.messages.map(
                msg => ({
                    role: msg.role,
                    content: msg.content
                })
            );

        const response =
            await fetch(
                "/api/chat",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            model:
                                selectedModel,

                            messages:
                                apiMessages
                        }),

                    signal:
                        activeController.signal
                }
            );

        if (!response.ok) {

            let data = {};

            try {
                data =
                    await response.json();
            } catch {}

            throw new Error(
                data.error ||
                "Request failed"
            );
        }

        if (!response.body) {

            throw new Error(
                "The server returned no response stream."
            );
        }

        const reader =
            response.body.getReader();

        const decoder =
            new TextDecoder();

        let buffer = "";
        let fullResponse = "";

        while (true) {

            const {
                value,
                done
            } =
                await reader.read();

            if (done) {
                break;
            }

            buffer +=
                decoder.decode(
                    value,
                    {
                        stream: true
                    }
                );

            const lines =
                buffer.split("\n");

            buffer =
                lines.pop();

            for (
                const line
                of lines
            ) {

                if (
                    !line.startsWith(
                        "data:"
                    )
                ) {
                    continue;
                }

                const raw =
                    line
                        .slice(5)
                        .trim();

                if (
                    raw ===
                    "[DONE]"
                ) {
                    continue;
                }

                if (!raw) {
                    continue;
                }

                try {

                    const data =
                        JSON.parse(raw);

                    if (data.error) {

                        throw new Error(
                            data.error
                        );
                    }

                    if (
                        data.content
                    ) {

                        if (
                            !fullResponse
                        ) {

                            thinkingUI
                                .thinking
                                .innerHTML =
                                "<span>✨ Generating response…</span>";
                        }

                        fullResponse +=
                            data.content;

                        /*
                         * Render Markdown live.
                         * This means code blocks become
                         * real code blocks as the response
                         * arrives.
                         */

                        thinkingUI
                            .content
                            .innerHTML =
                            renderMarkdown(
                                fullResponse
                            );

                        attachCopyButtons(
                            thinkingUI.content
                        );

                        window.scrollTo({
                            top:
                                document.body
                                    .scrollHeight,

                            behavior:
                                "smooth"
                        });
                    }

                } catch (error) {

                    if (
                        error.message !==
                        "Unexpected end of JSON input"
                    ) {

                        throw error;
                    }
                }
            }
        }

        /*
         * If the AI returned nothing,
         * don't save an empty assistant message.
         */

        if (fullResponse.trim()) {

            thinkingUI
                .thinking
                .innerHTML =
                "<span>✓ Response generated</span>";

            currentChat.messages.push({
                role: "assistant",
                content: fullResponse,
                model: modelName
            });

            saveChats();

        } else {

            thinkingUI
                .thinking
                .innerHTML =
                "<span>⚠️ No response received</span>";
        }

    } catch (error) {

        if (
            error.name ===
            "AbortError"
        ) {

            thinkingUI
                .thinking
                .innerHTML =
                "<span>⏹ Generation stopped</span>";

         
