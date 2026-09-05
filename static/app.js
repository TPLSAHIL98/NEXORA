const chat = document.getElementById("chat");
const message = document.getElementById("message");
const send = document.getElementById("send");
const model = document.getElementById("model");

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const closeSidebar = document.getElementById("closeSidebar");

const newChatBtn = document.getElementById("newChat");
const chatHistory = document.getElementById("chatHistory");

let chats = [];
let currentChat = null;


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

        const row = document.createElement("div");

        row.className =
            "history-item" +
            (currentChat?.id === item.id
                ? " active"
                : "");

        const title = document.createElement("span");

        title.textContent =
            item.title || "New Chat";

        const del = document.createElement("button");

        del.textContent = "×";

        del.onclick = event => {

            event.stopPropagation();

            chats = chats.filter(
                c => c.id !== item.id
            );

            if (currentChat?.id === item.id) {

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
   RENDER CHAT
------------------------- */

function renderChat() {

    chat.innerHTML = "";

    if (!currentChat ||
        currentChat.messages.length === 0) {

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

        tag.className = "model-tag";

        tag.textContent =
            modelName;

        box.appendChild(tag);
    }

    const content =
        document.createElement("div");

    content.className =
        "response-content";

    content.textContent =
        text;

    box.appendChild(content);

    chat.appendChild(box);

    return content;
}


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
                data.error
            );
        }

        model.innerHTML = "";

        const groups = {
            GPT: [],
            Claude: [],
            Gemini: []
        };

        for (const item of data.models) {

            if (item.id.startsWith("gpt-")) {
                groups.GPT.push(item);

            } else if (
                item.id.startsWith("claude-")
            ) {
                groups.Claude.push(item);

            } else if (
                item.id.startsWith("gemini-")
            ) {
                groups.Gemini.push(item);
            }
        }

        for (
            const [groupName, items]
            of Object.entries(groups)
        ) {

            if (!items.length) continue;

            const group =
                document.createElement(
                    "optgroup"
                );

            group.label =
                groupName;

            for (const item of items) {

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
            <option>
                Model loading failed
            </option>
        `;

        console.error(error);
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

    if (!text ||
        !selectedModel) {
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

    send.disabled = true;


    try {

        const response =
            await fetch(
                "/api/chat",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        model:
                            selectedModel,

                        messages:
                            currentChat.messages
                    })
                }
            );


        if (!response.ok) {

            const data =
                await response.json();

            throw new Error(
                data.error ||
                "Request failed"
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
            } = await reader.read();


            if (done) break;


            buffer +=
                decoder.decode(
                    value,
                    { stream: true }
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


                try {

                    const data =
                        JSON.parse(raw);


                    if (data.error) {
                        throw new Error(
                            data.error
                        );
                    }


                    if (data.content) {

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


                        thinkingUI
                            .content
                            .textContent =
                            fullResponse;


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

    } catch (error) {

        thinkingUI
            .thinking
            .innerHTML =
            "<span>❌ Generation failed</span>";

        thinkingUI
            .content
            .textContent =
            error.message;
    }


    send.disabled = false;
}


/* -------------------------
   EVENTS
------------------------- */

send.onclick =
    sendMessage;


message.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();
        }
    }
);


newChatBtn.onclick =
    createChat;


menuBtn.onclick = () => {

    sidebar.classList.add(
        "open"
    );
};


closeSidebar.onclick = () => {

    sidebar.classList.remove(
        "open"
    );
};


/* -------------------------
   START
------------------------- */

loadChats();

if (!currentChat &&
    chats.length) {

    currentChat =
        chats[0];
}

loadModels();

renderHistory();

renderChat();


if (stopBtn) {
    stopBtn.addEventListener("click", stopGeneration);
}
