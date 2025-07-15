/* System prompt for chatbot behavior */
const systemPrompt = `You are a knowledgeable L'Oréal beauty consultant. Only respond to questions about L'Oréal products, skincare routines, makeup application, and beauty recommendations. Keep responses helpful and concise. If asked about competitors or unrelated topics, politely say 'I can only help with L'Oréal products and beauty advice.'`;

/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Set initial message
chatWindow.textContent = "👋 Hello! How can I help you today?";

/* Handle form submit */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // Get user's question
  const question = userInput.value;

  // Show user's message in chat window
  chatWindow.innerHTML += `<div class="msg user">${question}</div>`;

  // Show loading message
  chatWindow.innerHTML += `<div class="msg ai">Thinking...</div>`;

  // Call Cloudflare Worker
  getAIResponse(question);
});

/**
 * Fetches AI response from Cloudflare Worker
 * @param {string} userMessage - The user's question
 */
async function getAIResponse(userMessage) {
  try {
    // Use the provided Cloudflare Worker URL
    const workerUrl = "https://lorealchatbot-worker.villegad.workers.dev/";

    // Prepare request body with message array (OpenAI format)
    const body = JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    // Make POST request
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });

    let aiReply = "Sorry, I couldn't get a response.";
    if (response.ok) {
      try {
        const data = await response.json();
        // Try OpenAI format first
        if (data.reply) {
          aiReply = data.reply;
        } else if (
          data.choices &&
          data.choices[0] &&
          data.choices[0].message &&
          data.choices[0].message.content
        ) {
          aiReply = data.choices[0].message.content;
        } else {
          aiReply = JSON.stringify(data);
        }
      } catch (jsonError) {
        aiReply = "Received invalid JSON from server.";
      }
    } else {
      aiReply = `Server error: ${response.status} ${response.statusText}`;
    }

    // Remove loading message and show AI reply
    const msgs = chatWindow.querySelectorAll(".msg.ai");
    if (msgs.length) msgs[msgs.length - 1].remove();
    chatWindow.innerHTML += `<div class="msg ai">${aiReply}</div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (error) {
    // Remove loading message and show error
    const msgs = chatWindow.querySelectorAll(".msg.ai");
    if (msgs.length) msgs[msgs.length - 1].remove();
    chatWindow.innerHTML += `<div class="msg ai">Error: ${error.message}</div>`;
  }
}
