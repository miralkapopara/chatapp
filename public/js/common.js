const fileInputText = document.getElementById("fileInp");
document.getElementById("attach-file").addEventListener("click", () => {
  fileInputText.click();
  console.log("file selected");
});
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
    fileInputText.value = "";
  }
});
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
    } else {
      const textElement = document.createElement("div");
      textElement.classList.add("message-text");
      textElement.innerText = message;
      messageElement.appendChild(textElement);
    }

    if (type === "file") {
      const fileElement = document.createElement("file");
      fileElement.src = message;
      fileElement.classList.add("message-file");
      messageElement.appendChild(fileElement);
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