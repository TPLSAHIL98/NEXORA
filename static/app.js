const chat = document.getElementById("chat");
const messageInput = document.getElementById("message");
const chatForm = document.getElementById("chatForm");
const sendButton = document.getElementById("sendButton");
const newChatButton = document.getElementById("newChat");
const selectedModelText = document.getElementById("selectedModel");
const welcome = document.getElementById("welcome");

let selectedProvider = "gpt";

let messages = [];

const modelNames = {
    gpt: "ChatGPT · GPT-6 Astra",
    claude: "Claude · Fable 5",
    gemini: "Gemini · 3.7 Flash"
};


/* MODEL SELECTION */

document.querySelectorAll(".model-card").forEach(button => {

    button.addEventListener("click", () => {

        document
            .querySelectorAll(".model-card")
            .forEach(card => {
                card.classList.remove("active");
            });

        button.classList.add("active");

        selectedProvider =
            button.dataset.model;

        selectedModelText.textContent =
            modelNames[selectedProvider];

    });

});


/* SUGGESTIONS */

document.querySelectorAll(".suggestions button")
    .forEach(button => {

        button.addEventListener("click", () => {

            messageInput.value =
                button.dataset.prompt;

            messageInput.focus();

        });

    });


/* AUTO RESIZE */

messageInput.addEventListener("input", () => {

    messageInput.style.height = "auto";

    messageInput.style.height =
        Math.min(
            messageInput.scrollHeight,
            180
        ) + "px";

});


/* NEW CHAT */

newChatButton.addEventListener("click", () => {

    messages = [];

    chat.innerHTML = "";

    chat.appendChild(
        createWelcome()
    );

});


function createWelcome() {

    const element =
        document.createElement("div");

    element.className = "welcome";

    element.innerHTML = `
        <div class="nexora-logo">N</div>

        <h1>
            What can I help you build?
        </h1>

        <p>
            Ask NEXORA anything.
        </p>
    `;

    return element;
}


/* MESSAGE UI */

function addMessage(role, text) {

    const row =
        document.createElement("div");

    row.className =
        `message ${role}`;

    const avatar =
        document.createElement("div");

    avatar.className = "avatar";

    avatar.textContent =
        role === "user"
            ? "YOU"
            : "N";

    const content =
        document.createElement("div");

    content.className =
        "message-content";

    content.textContent = text;

    row.appendChild(avatar);
    row.appendChild(content);

    chat.appendChild(row);

    chat.scrollTop =
        chat.scrollHeight;

    return content;
}


/* STREAM PARSER */

async function readStream(response, outputElement) {

    const reader =
        response.body.getReader();

    const decoder =
        new TextDecoder();

    let buffer = "";

    while (true) {

        const { value, done } =
            await reader.read();

        if (done) break;

        buffer +=
            decoder.decode(
                value,
                { stream: true }
            );

        const lines =
            buffer.split("\n");

        buffer =
            lines.pop() || "";

        for (const line of lines) {

            const trimmed =
                line.trim();

            if (!trimmed) continue;

            if (!trimmed.startsWith("data:"))
                continue;

            const data =
                trimmed.slice(5).trim();

            if (data === "[DONE]")
                continue;

            try {

                const json =
                    JSON.parse(data);

                const delta =
                    json.choices?.[0]?.delta?.content;

                if (delta) {

                    outputElement.textContent +=
                        delta;

                    chat.scrollTop =
                        chat.scrollHeight;

                }

            } catch {
                // Ignore incomplete SSE JSON.
            }

        }

    }

}


/* SEND */

chatForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        const text =
            messageInput.value.trim();

        if (!text) return;

        messageInput.value = "";
        messageInput.style.height = "auto";

        if (welcome) {
            welcome.remove();
        }

        messages.push({
            role: "user",
            content: text
        });

        addMessage(
            "user",
            text
        );

        sendButton.disabled = true;

        const assistantElement =
            addMessage(
                "assistant",
                ""
            );

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
                            provider:
                                selectedProvider,

                            messages:
                                messages,

                            stream:
                                true
                        })
                    }
                );

            if (!response.ok) {

                let errorText =
                    "API request failed.";

                try {

                    const error =
                        await response.json();

                    if (
                        typeof error.error ===
                        "string"
                    ) {

                        errorText =
                            error.error;

                    }
                    else if (
                        error.error?.message
                    ) {

                        errorText =
                            error.error.message;

                    }
                    else if (
                        typeof error.message ===
                        "string"
                    ) {

                        errorText =
                            error.message;

                    }
                    else {

                        errorText =
                            JSON.stringify(error);

                    }

                } catch {}

                throw new Error(errorText);

            }

            await readStream(
                response,
                assistantElement
            );

            messages.push({
                role: "assistant",
                content:
                    assistantElement.textContent
            });

        } catch (error) {

            assistantElement.textContent =
                "⚠️ " + error.message;

        } finally {

            sendButton.disabled = false;

            messageInput.focus();

        }

    }
);


/* ENTER TO SEND */

messageInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            chatForm.requestSubmit();

        }

    }
);
