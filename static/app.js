const messageInput = document.getElementById("message");
const sendButton = document.getElementById("send");

const chat = document.getElementById("chat");
const welcome = document.getElementById("welcome");

const menuBtn = document.getElementById("menuBtn");
const closeSidebar = document.getElementById("closeSidebar");

const sidebar = document.getElementById("sidebar");
const newChat = document.getElementById("newChat");

let messages = [];


/* =========================
   SEND MESSAGE
========================= */

async function sendMessage() {

    const text = messageInput.value.trim();

    if (!text) {
        return;
    }

    // Hide welcome screen
    if (welcome) {
        welcome.style.display = "none";
    }

    // Show user message
    addMessage("user", text);

    // Add to conversation
    messages.push({
        role: "user",
        content: text
    });

    // Clear input
    messageInput.value = "";

    resizeTextarea();

    // Disable button
    sendButton.disabled = true;

    // Loading message
    const loading = addMessage("assistant", "Thinking...");

    try {

        const response = await fetch("/api/chat", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                messages: messages
            })

        });


        const data = await response.json();


        // Remove loading message
        loading.remove();


        if (!response.ok) {

            const errorText =
                data.error ||
                "Something went wrong.";

            addMessage(
                "assistant",
                "❌ " + errorText
            );

            if (data.details) {
                console.error("API DETAILS:", data.details);
            }

            return;
        }


        const reply = data.reply || "No response received.";

        addMessage("assistant", reply);


        // Save assistant message
        messages.push({
            role: "assistant",
            content: reply
        });


    } catch (error) {

        loading.remove();

        console.error(error);

        addMessage(
            "assistant",
            "❌ Connection error. Please try again."
        );

    } finally {

        sendButton.disabled = false;

        messageInput.focus();

    }
}


/* =========================
   ADD MESSAGE
========================= */

function addMessage(role, text) {

    const wrapper = document.createElement("div");

    wrapper.className = "message " + role;


    const bubble = document.createElement("div");

    bubble.className = "bubble";

    bubble.textContent = text;


    wrapper.appendChild(bubble);

    chat.appendChild(wrapper);


    // Scroll to bottom
    chat.scrollTop = chat.scrollHeight;


    return wrapper;
}


/* =========================
   ENTER TO SEND
========================= */

messageInput.addEventListener("keydown", function(event) {

    if (event.key === "Enter" && !event.shiftKey) {

        event.preventDefault();

        sendMessage();

    }

});


/* =========================
   SEND BUTTON
========================= */

sendButton.addEventListener("click", sendMessage);


/* =========================
   AUTO RESIZE TEXTAREA
========================= */

function resizeTextarea() {

    messageInput.style.height = "auto";

    messageInput.style.height =
        Math.min(messageInput.scrollHeight, 160) + "px";

}


messageInput.addEventListener(
    "input",
    resizeTextarea
);


/* =========================
   SIDEBAR
========================= */

menuBtn.addEventListener("click", function() {

    sidebar.classList.add("open");

});


closeSidebar.addEventListener("click", function() {

    sidebar.classList.remove("open");

});


/* =========================
   NEW CHAT
========================= */

newChat.addEventListener("click", function() {

    messages = [];

    chat.innerHTML = `
        <div id="welcome" class="welcome">

            <div class="welcome-logo">
                N
            </div>

            <h1>
                Welcome to NEXORA
            </h1>

            <p>
                Your simple AI assistant.
            </p>

        </div>
    `;

    sidebar.classList.remove("open");

    messageInput.focus();

});
