document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  let userName = prompt("Enter your name to join:");
  let userId;
  let currentReceiverId;
  let replyMessageId = null;
  let replyImageSrc = null;

  const plusIcon = document.getElementById("plus-icon");
  const dropdownMenu = document.getElementById("dropdown-menu");
  const form = document.getElementById("send-container");
  const messageInput = document.getElementById("messageInp");
  const replyContainer = document.getElementById("reply-container");
  const replyText = document.getElementById("reply-text");
  const replyImage = document.getElementById("reply-image");
  const cancelReplyButton = document.getElementById("cancel-reply");
  const fileInput = document.getElementById("imageInput");
  const fileInputText = document.getElementById("fileInp");

  // Toggle dropdown menu
  plusIcon.addEventListener("click", () => {
    dropdownMenu.classList.toggle("hidden");
  });

  // Trigger file input when attach-image is clicked
  document.getElementById("attach-image").addEventListener("click", () => {
    fileInput.click();
  });

  // Trigger file input when attach-file is clicked
  document.getElementById("attach-file").addEventListener("click", () => {
    fileInputText.click();
    console.log("file selected");
  });

  // Handle image file selection
  fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const imageData = reader.result;

        appendMessage(imageData, "right", "image");
        socket.emit("send-image", {
          image: imageData,
          receiverId: currentReceiverId,
          user: userName,
        });
      };
      reader.readAsDataURL(file);
      fileInput.value = ""; // Clear file input after reading
    }
  });

  //Handle file selection
  fileInputText.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const fileData = reader.result;
        appendMessage(fileData, "right", "file");
        socket.emit("send-file", {
          file: fileData,
          receiverId: currentReceiverId,
          user: userName,
        });
      };
      reader.readAsDataURL(file);
      fileInputText.value = ""; // Clear input after reading the file
    }
  });

  // Function to append a message
  function appendMessage(
    message,
    position,
    type = "message",
    reply = null,
    editedMessage = null
  ) {
    if (!message) return;

    const messageElement = document.createElement("div");
    messageElement.classList.add("message", position);
    messageElement.setAttribute("draggable", "true");
    messageElement.setAttribute("data-id", message);

    if (reply) {
      const replyElement = document.createElement("div");
      replyElement.classList.add("reply-message");

      if (reply.startsWith("data:image/")) {
        const img = document.createElement("img");
        img.src = reply;
        img.alt = "Reply Image";
        replyElement.appendChild(img);
      } else {
        replyElement.innerText = `Replying to: ${reply}`;
      }

      messageElement.appendChild(replyElement);
    }

    if (type === "image") {
      const imgElement = document.createElement("img");
      imgElement.src = message;
      imgElement.classList.add("message-image");
      messageElement.appendChild(imgElement);
    } else if (type === "file") {
      const fileLinkElement = document.createElement("a");
      fileLinkElement.href = message;
      fileLinkElement.textContent = "Download File";
      fileLinkElement.classList.add("message-file");
      fileLinkElement.target = "_blank";
      messageElement.appendChild(fileLinkElement);
    } else {
      const textElement = document.createElement("div");
      textElement.classList.add("message-text");
      textElement.innerText = message;
      messageElement.appendChild(textElement);
    }

    const messageContainer = document.querySelector(".container");
    messageContainer.appendChild(messageElement);
    messageContainer.scrollTop = messageContainer.scrollHeight;

    // Drag and drop handling
    messageElement.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData(
        "text/plain",
        messageElement.getAttribute("data-id")
      );
      replyMessageId = messageElement.getAttribute("data-id");

      const imgElement = messageElement.querySelector("img");
      if (imgElement) {
        replyImageSrc = imgElement.src;
        e.dataTransfer.setData("text/plain", replyImageSrc);
      } else {
        replyImageSrc = null;
      }
    });

    messageElement.addEventListener("dragend", () => {
      replyContainer.style.display = "none"; // Fix the display style
    });

    // Context menu handling
    messageElement.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showContextMenu(e, messageElement);
    });

    const messageContent = document.createElement("div");
    if (editedMessage) {
      messageContent.innerHTML = `<span class="edited">${editedMessage}</span>`;
    } else {
      messageContent.textContent = message;
    }
  }

  // Context menu creation
  const contextMenu = document.createElement("div");
  contextMenu.id = "context-menu";
  contextMenu.innerHTML = `
    <div id="delete-option">Delete</div>
    <div id="edit-option">Edit</div>
  `;
  document.body.appendChild(contextMenu);

  // Display the context menu
  function showContextMenu(event, messageElement) {
    event.preventDefault();
    contextMenu.style.display = "block";
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;

    if (messageElement.classList.contains("right")) {
      document.getElementById("edit-option").style.display = "block";
      document.getElementById("delete-option").style.display = "block";
    } else {
      document.getElementById("edit-option").style.display = "none";
      document.getElementById("delete-option").style.display = "block";
    }

    document.getElementById("delete-option").onclick = () => {
      deleteMessage(messageElement);
    };
    document.getElementById("edit-option").onclick = () => {
      editMessage(messageElement);
    };
  }

  // Hide the context menu
  function hideContextMenu() {
    contextMenu.style.display = "none";
  }

  // Delete a message
  function deleteMessage(messageElement) {
    const messageId = messageElement.getAttribute("data-id");
    messageElement.remove();
    socket.emit("delete-message", messageId);
    hideContextMenu();
  }

  function editMessage(messageElement) {
    const messageId = messageElement.getAttribute("data-id");
    console.log("MessageId:", messageId);

    const sendButton = document.querySelector(
      "#send-container .btn[type='submit']"
    );
    const messageInput = document.getElementById("messageInp");

    if (!messageId) {
      console.error("Message ID not found!");
      return;
    }

    console.log("Editing message with ID:", messageId);

    const messageTextElement = messageElement.querySelector(".message-text");
    if (!messageTextElement) {
      console.error("Message text element not found!");
      return;
    }

    // Pre-fill the input field with the current message content
    messageInput.value = messageTextElement.textContent.replace(
      " (edited)",
      ""
    );
    messageInput.focus();

    sendButton.onclick = (e) => {
      e.preventDefault();
      const editedMessage = messageInput.value.trim();
      console.log("Edited message:", editedMessage);

      if (editedMessage) {
        console.log("Sending edited message with ID:", messageId);

        // Emit the edited message event with the messageId to the server
        socket.emit("edit-message", { messageId, editedMessage });

        // Update the message content in the UI
        messageTextElement.textContent = `${editedMessage} (edited)`;

        // Clear the input field after sending
        messageInput.value = "";
      }
    };
  }

  // Client-side event listener to handle edited messages received from the server
  socket.on("message-edited", (data) => {
    const { messageId, editedMessage } = data;

    console.log("Received edited message:", editedMessage);

    // Find the message in the UI using the messageId
    const messageElement = document.querySelector(`[data-id="${messageId}"]`);

    if (messageElement) {
      // Update the message content in the UI
      const messageTextElement = messageElement.querySelector(".message-text");
      messageTextElement.textContent = `${editedMessage} (edited)`;
    } else {
      console.error("Message element not found for ID:", messageId);
    }
  });

  window.backupMessages = function () {
    if (userId) {
      socket.emit("backup-messages", userId);
      closeMenu();
    }
  };

  // Clear all messages
  window.clearallmessage = function () {
    const messageContainer = document.querySelector(".container");
    if (messageContainer) {
      messageContainer.innerHTML = "";
      closeMenu();
    }
  };

  // Close menu
  function closeMenu() {
    const menuContent = document.getElementById("menu-content");
    if (menuContent) {
      menuContent.style.display = "none";
    }
  }

  // Form submission
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    const image = fileInput.files[0]
      ? URL.createObjectURL(fileInput.files[0])
      : null;
    const isReplying = !!replyMessageId || !!replyImageSrc;
    // const editedMessage = messageInput.value.trim();

    if (message || image) {
      socket.emit("send-message", {
        text: message,
        receiverId: currentReceiverId,
        reply: isReplying ? replyMessageId : null,
        user: userName,
        image: image,
        // editedMessage: editedMessage,
      });
      sendMessage(message, image);
      messageInput.value = "";
      fileInput.value = "";
      replyMessageId = null;
      replyImageSrc = null;
      replyContainer.style.display = "none";
    }
  });

  // Handle new user joining
  socket.emit("new-user-joined", userName);

  // Assign user ID
  socket.on("assign-user-id", (id) => {
    userId = id;
    backupMessages();
  });

  // Load messages
  socket.on("load-messages", (messages) => {
    messages.forEach((msg) => {
      if (msg.message || msg.image || msg.editedMessage || msg.file) {
        appendMessage(
          msg.message,
          msg.image,
          msg.position,
          msg.type,
          msg.reply,
          msg.editedMessage,
          msg.file
        );
      }
    });
  });

  socket.on("receive-message", (data) => {
    const { text, position, type, reply, image, editedMessage } = data;
    console.log("Data :", data);
    if (text || image || editedMessage) {
      appendMessage(text, position, type, reply, editedMessage);
    }
  });

  // Handle user joining
  socket.on("user-joined", (user) => {
    appendMessage(`${user} joined the chat`, "center", "system");
  });

  socket.on("receive-image", (data) => {
    if (data.user !== userName) {
      appendMessage(data.image, "left", "image");
    }
  });

  socket.on("receive-file", (data) => {
    if (data.user !== userName) {
      appendMessage(data.file, "left", "file");
    }
  });

  socket.on("chat message", (data) => {
    const { user, message, sender_id, reply, image } = data;
    const isCurrentUser = sender_id === userId;

    if (image) {
      if (reply) {
        appendMessage(message, image, "left", "image", reply);
        displayImage(user, image, new Date(), reply);
      } else {
        appendMessage(
          message,
          image,
          isCurrentUser ? "right" : "left",
          "image",
          reply
        );
        displayImage(user, image, new Date(), reply);
      }
    } else {
      appendMessage(
        `${user}: ${message}`,
        isCurrentUser ? "right" : "left",
        "user-message",
        reply
      );
    }
  });

  function sendMessage(message, image, reply = false) {
    socket.emit("chat message", {
      user: userName,
      message: message,
      sender_id: userId,
      reply: reply,
      image: image,
      //editedMessage: editedMessage,
    });
  }

  function displayImage(user, image, timestamp, reply) {
    const formattedTimestamp = new Date(timestamp).toLocaleString();
    console.log(
      `[${formattedTimestamp}] ${user} sent an image: ${image}${
        reply ? " (Reply: " + reply + ")" : ""
      }`
    );
    console.log(`Displaying image from ${user} at ${timestamp}`, image);

    const imgElement = document.createElement("img");
    imgElement.src = image;
    imgElement.alt = "Image from " + user;
    imgElement.classList.add("chat-image");
    const chatContainer = document.querySelector(".container");
    chatContainer.appendChild(imgElement);
  }

  socket.on("left", (name) => {
    if (name !== userName) {
      appendMessage(`${name} left the chat`, "center", "system-message");
    }
    socket.emit("request-user-list");
  });

  socket.on("user-list", (users) => {
    const userListContainer = document.getElementById("user-list");
    if (userListContainer) {
      userListContainer.innerHTML = "";
      users.forEach((user) => {
        if (user.id !== userId) {
          const userElement = document.createElement("div");
          userElement.innerText = user.name;
          userElement.classList.add("user");
          userElement.addEventListener("click", () => {
            currentReceiverId = user.id;
            appendMessage(
              `You are now chatting with ${user.name}`,
              "center",
              "system-message"
            );
          });
          userListContainer.append(userElement);
        }
      });
    }
  });

  cancelReplyButton.addEventListener("click", () => {
    replyMessageId = null;
    replyContainer.style.display = "none";
  });

  document.getElementById("three-dot-button").addEventListener("click", () => {
    const menuContent = document.getElementById("menu-content");
    menuContent.style.display =
      menuContent.style.display === "none" ? "block" : "none";
  });

  window.addEventListener("load", backupMessages);
  document
    .getElementById("clear-chat-button")
    ?.addEventListener("click", clearallmessage);

  document.addEventListener("click", (event) => {
    if (!contextMenu.contains(event.target)) {
      hideContextMenu();
    }
  });
});
