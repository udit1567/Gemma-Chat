const threadId = crypto.randomUUID();

const chatWindow =
    document.getElementById("chat-window");

const inputBox =
    document.getElementById("message");

const sendButton =
    document.getElementById("send-btn");

function scrollToBottom() {

    chatWindow.scrollTop =
        chatWindow.scrollHeight;
}

function removeWelcomeScreen() {

    const welcome =
        document.querySelector(".welcome-screen");

    if (welcome) {
        welcome.remove();
    }
}

function addMessage(content, role) {

    const div =
        document.createElement("div");

    div.classList.add(
        "message",
        role
    );

    if (role === "assistant") {
        div.innerHTML = content;
    }
    else {
        div.textContent = content;
    }

    chatWindow.appendChild(div);

    scrollToBottom();

    return div;
}

async function sendMessage() {

    const text =
        inputBox.value.trim();

    if (!text) return;

    removeWelcomeScreen();

    addMessage(text, "user");

    inputBox.value = "";

    inputBox.style.height = "auto";

    const assistantDiv =
        addMessage(
            "<span class='typing'>Thinking...</span>",
            "assistant"
        );

    let assistantText = "";

    try {

        const response =
            await fetch(
                "/chat",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        message: text,
                        thread_id: threadId
                    })
                }
            );

        const reader =
            response.body.getReader();

        const decoder =
            new TextDecoder();

        while (true) {

            const {
                done,
                value
            } = await reader.read();

            if (done) break;

            const chunk =
                decoder.decode(value);

            const lines =
                chunk.split("\n");

            for (const line of lines) {

                if (
                    !line.startsWith(
                        "data: "
                    )
                ) {
                    continue;
                }

                const data =
                    line.slice(6);

                if (
                    data === "[DONE]"
                ) {
                    continue;
                }

                try {

                    const token =
                        JSON.parse(
                            data
                        );

                    assistantText +=
                        token;

                    assistantDiv.innerHTML =
                        marked.parse(
                            assistantText
                        );

                    document
                        .querySelectorAll(
                            "pre code"
                        )
                        .forEach((el) => {

                            hljs.highlightElement(
                                el
                            );

                        });

                    scrollToBottom();

                }
                catch (err) {

                    console.error(
                        err
                    );
                }
            }
        }

    }
    catch (err) {

        assistantDiv.innerHTML =
            `<p>Error: ${err.message}</p>`;

        console.error(err);
    }
}

sendButton.addEventListener(
    "click",
    sendMessage
);

inputBox.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();
        }
    }
);

inputBox.addEventListener(
    "input",
    () => {

        inputBox.style.height =
            "auto";

        inputBox.style.height =
            inputBox.scrollHeight +
            "px";
    }
);