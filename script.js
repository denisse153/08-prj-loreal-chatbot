// This is a special instruction for the AI. It tells the chatbot how to behave.
const systemPrompt = `You are a knowledgeable L'Oréal beauty consultant. Only respond to questions about L'Oréal products, skincare routines, makeup application, and beauty recommendations. Keep responses helpful and concise. If asked about competitors or unrelated topics, politely say 'I can only help with L'Oréal products and beauty advice.'`;

// Get references to important parts of the web page
const chatForm = document.getElementById("chatForm"); // The form where you type your message
const userInput = document.getElementById("userInput"); // The input box for your question
const chatWindow = document.getElementById("chatWindow"); // The area where messages appear

// Show a welcome message when the page loads
chatWindow.textContent = "👋 Hello! How can I help you today?";

// This array keeps track of the whole conversation (so the AI can remember context)
const conversation = [
  { role: "system", content: systemPrompt }, // The first message sets the AI's behavior
];

// --- Interruptible AI response logic ---
let typewriterTimeout = null;
let isTyping = false;
let abortTyping = false;

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const question = userInput.value;

  // If the AI is still typing, stop it and remove the unfinished AI message
  if (isTyping) {
    abortTyping = true;
    if (typewriterTimeout) clearTimeout(typewriterTimeout);
    // Remove the last AI message from the chat window
    const aiMsgRows = chatWindow.querySelectorAll(".msg-row-ai");
    if (aiMsgRows.length) aiMsgRows[aiMsgRows.length - 1].remove();
    isTyping = false;
  }

  // Add your message to the conversation history
  conversation.push({ role: "user", content: question });

  // Show your message in the chat window (right side)
  chatWindow.innerHTML += `
    <div class="msg-row msg-row-user">
      <div class="msg msg-user-box">${question}</div>
    </div>
  `;

  // Clear the input box after sending
  userInput.value = "";

  // Show a "Thinking..." message from the AI (left side)
  chatWindow.innerHTML += `
    <div class="msg-row msg-row-ai">
      <div class="msg msg-ai-box">Thinking...</div>
    </div>
  `;

  // Send the conversation to the AI and get a response
  getAIResponse();
});

// This function sends the conversation to the AI and shows the response
async function getAIResponse() {
  try {
    // The URL of your Cloudflare Worker (this is where your AI lives)
    const workerUrl = "https://lorealchatbot-worker.villegad.workers.dev/";

    // Turn the conversation history into a string to send to the server
    const body = JSON.stringify({
      messages: conversation,
    });

    // Send the conversation to the server and wait for a response
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });

    // This will be the AI's reply (we'll update it if we get a good response)
    let aiReply = "Sorry, I couldn't get a response.";

    // If the server responded OK, try to read the AI's answer
    if (response.ok) {
      try {
        const data = await response.json(); // Try to read the response as JSON
        // Check for different possible response formats
        if (data.reply) {
          aiReply = data.reply; // Our Worker might use this
        } else if (
          data.choices &&
          data.choices[0] &&
          data.choices[0].message &&
          data.choices[0].message.content
        ) {
          aiReply = data.choices[0].message.content; // OpenAI format
        } else {
          aiReply = JSON.stringify(data); // Just show the raw data if unknown
        }
      } catch (jsonError) {
        aiReply = "Received invalid JSON from server.";
      }
    } else {
      // If the server gave an error (like 500), show that
      aiReply = `Server error: ${response.status} ${response.statusText}`;
    }

    // Add the AI's reply to the conversation history so it remembers
    conversation.push({ role: "assistant", content: aiReply });

    // Remove the "Thinking..." message
    const aiMsgRows = chatWindow.querySelectorAll(".msg-row-ai");
    if (aiMsgRows.length) aiMsgRows[aiMsgRows.length - 1].remove();

    // Typewriter effect for AI reply, now interruptible
    const aiRow = document.createElement("div");
    aiRow.className = "msg-row msg-row-ai";
    const aiBox = document.createElement("div");
    aiBox.className = "msg msg-ai-box";
    aiRow.appendChild(aiBox);
    chatWindow.appendChild(aiRow);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    let i = 0;
    isTyping = true;
    abortTyping = false;
    function typeWriter() {
      if (abortTyping) {
        aiBox.innerHTML = aiReply;
        isTyping = false;
        return;
      }
      if (i <= aiReply.length) {
        aiBox.innerHTML =
          aiReply.slice(0, i) + '<span class="ai-cursor">|</span>';
        i++;
        chatWindow.scrollTop = chatWindow.scrollHeight;
        typewriterTimeout = setTimeout(typeWriter, 18);
      } else {
        aiBox.innerHTML = aiReply;
        isTyping = false;
      }
    }
    typeWriter();
  } catch (error) {
    // If something went wrong (like no internet), show an error message
    const aiMsgRows = chatWindow.querySelectorAll(".msg-row-ai");
    if (aiMsgRows.length) aiMsgRows[aiMsgRows.length - 1].remove();
    chatWindow.innerHTML += `
      <div class="msg-row msg-row-ai">
        <div class="msg msg-ai-box">Error: ${error.message}</div>
      </div>
    `;
  }
}
