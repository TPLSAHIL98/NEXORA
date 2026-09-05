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


/* =========================
   STORAGE
========================= */

function saveChats() {
    try {
        localStorage.setItem(
            "nexora_chats",
            JSON.stringify(chats)
        );
    } catch (error) {
        console.error("Could not save chats:", error);
    }
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
   HISTORY
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
            event => {

                event.stopPropagation();

                if (isGenerating) {
                    return;
                }

                chats =
                    chats.filter(
                        c => c.id !== item.id
                    );

                if (
                    currentChat &&
                    currentChat.id === item.id
                ) {

                    currentChat =
                        chats[0] || null;
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
            () => {

                if (isGenerating) {
                    return;
                }

                currentChat = item;

                renderHistory();
                renderChat();

                if (sidebar) {
                    sidebar.classList.remove("open");
                }
            }
        );


        chatHistory.appendChild(row);
    }
}


/* =========================
   HTML ESCAPE
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

    let source =
        String(text).replace(
            /```([a-zA-Z0-9_+#.-]*)\s*\n?([\s\S]*?)```/g,
            function (_, language, code) {

                const index =
                    codeBlocks.length;

                codeBlocks.push({
                    language:
                        language || "code",

                    code:
                        code.replace(/\n$/, "")
                });

                return `NEXORA_CODE_BLOCK_${index}`;
            }
        );


    source =
        escapeHTML(source);


    /* Inline code */

    source =
        source.replace(
            /`([^`\n]+)`/g,
            "<code>$1</code>"
        );


    /* Headings */

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


    /* Bold */

    source =
        source.replace(
            /\*\*(.+?)\*\*/g,
            "<strong>$1</strong>"
        );


    /* Italic */

    source =
        source.replace(
            /(^|[^\*])\*([^*\n]+)\*(?!\*)/g,
            "$1<em>$2</em>"
        );


    /* Unordered lists */

    source =
        source.replace(
            /^\s*[-*] (.+)$/gm,
            "<li>$1</li>"
        );

    source =
        source.replace(
            /(<li>.*?<\/li>\s*)+/g,
            "<ul>$&</ul>"
        );


    /* Ordered lists */

    source =
        source.replace(
            /^\s*\d+\. (.+)$/gm,
            "<li>$1</li>"
        );


    /* New lines */

    source =
        source.replace(
            /\n/g,
            "<br>"
        );


    /* Restore code blocks */

    codeBlocks.forEach(
        (block, index) => {

            const code =
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
                            data-code="${encodeURIComponent(block.code)}"
                        >
                            Copy
                        </button>

                    </div>

                    <pre><code>${code}</code></pre>

                </div>
            `;

            source =
                source.replace(
                    `NEXORA_CODE_BLOCK_${index}`,
                    codeHTML
                );
        }
    );


    return source;
}


/* =========================
   COPY
========================= */

async function copyText(text) {

    /* Modern clipboard */

    try {

        if (
            navigator.clipboard &&
            window.isSecureContext
        ) {

            await navigator.clipboard.writeText(
                text
            );

            return true;
        }

    } catch (error) {

        console.warn(
            "Clipboard API failed:",
            error
        );
    }


    /* Fallback */

    try {

        const textarea =
            document.createElement("textarea");

        textarea.value = text;

        textarea.setAttribute(
            "readonly",
            ""
        );

        textarea.style.position =
            "fixed";

        textarea.style.left =
            "-9999px";

        textarea.style.top =
            "0";

        document.body.appendChild(
            textarea
        );

        textarea.focus();
        textarea.select();

        const success =
            document.execCommand("copy");

        textarea.remove();

        return success;

    } catch (error) {

        console.error(
            "Copy failed:",
            error
        );

        return false;
    }
}


/* =========================
   COPY BUTTON
   EVENT DELEGATION
========================= */

chat.addEventListener(
    "click",
    async event => {

        const button =
            event.target.closest(
                ".nexora-copy-btn"
            );

        if (!button) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();


        let code = "";


        /* Get code directly from data */

        if (button.dataset.code) {

            try {

                code =
                    decodeURIComponent(
                        button.dataset.code
                    );

            } catch {

                code =
                    button.dataset.code;
            }
        }


        /* Fallback to code element */

        if (!code) {

            const wrapper =
                button.closest(
                    ".nexora-code-wrapper"
                );

            const codeElement =
                wrapper?.querySelector(
                    "pre code"
                );

            if (codeElement) {
                code =
                    codeElement.textContent;
            }
        }


        if (!code) {
            return;
        }


        const originalText =
            button.textContent;


        button.disabled = true;

        const success =
            await copyText(code);


        if (success) {

            button.textContent =
                "Copied ✓";

        } else {

            button.textContent =
                "Copy failed";
        }


        setTimeout(
            () => {

                button.textContent =
                    originalText || "Copy";

                button.disabled = false;

            },
            1500
        );
    }
);


/* =========================
   RENDER CHAT
========================= */

function renderChat() {

    chat.innerHTML = "";


    if (
        !currentChat ||
        !Array.isArray(currentChat.messages) ||
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
        const msg
        of currentChat.messages
    ) {

        if (
            msg.role === "user"
        ) {

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


/* =========================
   MESSAGE UI
========================= */

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

    } else {

        content.textContent =
            text;
    }


    box.appendChild(content);

    chat.appendChild(box);


    return content;
}


/* =========================
   THINKING UI
========================= */

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

        stopBtn.disabled =
            false;
    }


    if (message) {

        message.disabled =
            false;
    }
}


/* =========================
   STOP GENERATION
========================= */

function stopGeneration() {

    if (!isGenerating) {
        return;
    }


    /* Abort browser request */

    if (activeController) {

        try {
            activeController.abort();
        } catch {}
    }


    activeController = null;


    setGeneratingState(false);


    /* Mark current UI */

    const thinking =
        chat.querySelector(
            ".message.ai:last-child .thinking"
        );

    if (thinking) {

        thinking.innerHTML =
            "<span>⏹ Generation stopped</span>";
    }


    saveChats();
}


/* =========================
   STOP BUTTON
========================= */

if (stopBtn) {

    stopBtn.addEventListener(
        "click",
        event => {

            event.preventDefault();

            stopGeneration();
        }
    );
}


/* =========================
   SEND MESSAGE
========================= */

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


    /* User message */

    addMessage(
        "user",
        text
    );


    currentChat.messages.push({
        role: "user",
        content: text
    });


    /* Chat title */

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


    /* Thinking UI */

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


    let fullResponse = "";


    try {

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
                `Request failed: HTTP ${response.status}`
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
            new TextDecoder("utf-8");


        let buffer = "";


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
                buffer.split(/\r?\n/);


            buffer =
                lines.pop() || "";


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
                    !raw ||
                    raw === "[DONE]"
                ) {
                    continue;
                }


                let data;


                try {

                    data =
                        JSON.parse(raw);

                } catch {

                    continue;
                }


                if (data.error) {

                    throw new Error(
                        data.error
                    );
                }


                if (
                    data.content
                ) {

                    fullResponse +=
                        data.content;


                    thinkingUI
                        .thinking
                        .innerHTML =
                        "<span>✨ Generating response…</span>";


                    thinkingUI
                        .content
                        .innerHTML =
                        renderMarkdown(
                            fullResponse
                        );


                    chat.scrollTop =
                        chat.scrollHeight;
                }
            }
        }


        /* Save response */

        if (
            fullResponse.trim()
        ) {

            thinkingUI
                .thinking
                .innerHTML =
                "<span>✓ Response generated</span>";


            currentChat.messages.push({
                role: "assistant",
                content:
                    fullResponse,
                model:
                    modelName
            });


            saveChats();

        } else {

            thinkingUI
                .thinking
                .innerHTML =
                "<span>⚠️ No response received</span>";
        }


    } catch (error) {

        /* User pressed Stop */

        if (
            error.name ===
            "AbortError"
        ) {

            thinkingUI
                .thinking
                .innerHTML =
                "<span>⏹ Generation stopped</span>";


            /*
             * Save partial response if
             * something was already generated.
      
