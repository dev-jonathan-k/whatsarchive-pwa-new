document.addEventListener('DOMContentLoaded', () => {
  const messagesContainer = document.getElementById('messages');
  const fileInput = document.getElementById('fileInput');
  const searchInput = document.getElementById('searchInput');
  const statusDiv = document.getElementById('status');
  let messages = [];

  // Load starred IDs from localStorage
  function loadStarred() {
    try {
      const stored = localStorage.getItem('starredMessages');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  // Save starred IDs back to localStorage
  function saveStarred(ids) {
    try {
      localStorage.setItem('starredMessages', JSON.stringify(ids));
    } catch (e) {
      // ignore storage errors
    }
  }

  // Escape HTML to prevent injection
  function escapeHtml(text) {
    return String(text || '').replace(/[&<>"']/g, function(match) {
      const escapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return escapes[match];
    });
  }

  // Render a list of messages to the DOM
  function displayMessages(msgs = messages) {
    messagesContainer.innerHTML = '';
    const starredIds = loadStarred();
    msgs.forEach(msg => {
      const msgDiv = document.createElement('div');
      msgDiv.classList.add('message');
      if (starredIds.includes(msg.id)) {
        msgDiv.classList.add('starred');
      }
      const textDiv = document.createElement('div');
      textDiv.classList.add('text');
      textDiv.innerHTML = '<strong>' + escapeHtml(msg.sender) + '</strong>: ' + escapeHtml(msg.text);
      msgDiv.appendChild(textDiv);
      const btn = document.createElement('button');
      btn.textContent = starredIds.includes(msg.id) ? 'Unstar' : 'Star';
      btn.addEventListener('click', () => toggleStar(msg.id));
      msgDiv.appendChild(btn);
      messagesContainer.appendChild(msgDiv);
    });
  }

  // Refresh display based on search query
  function refreshDisplay() {
    const query = searchInput.value.toLowerCase();
    if (!query) {
      displayMessages(messages);
      return;
    }
    const filtered = messages.filter(msg =>
      msg.text.toLowerCase().includes(query) ||
      msg.sender.toLowerCase().includes(query)
    );
    displayMessages(filtered);
  }

  // Toggle star status for a given message ID
  function toggleStar(id) {
    let starred = loadStarred();
    if (starred.includes(id)) {
      starred = starred.filter(item => item !== id);
    } else {
      starred.push(id);
    }
    saveStarred(starred);
    refreshDisplay();
  }

  // Parse WhatsApp chat export
  function parseChat(chatText) {
    const lines = chatText.split(/\r?\n/);
    const parsed = [];
    const regex = /^([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}),\s([0-9]{1,2}:[0-9]{2})(?:\s?(AM|PM|am|pm))?\s-\s([^:]+):\s(.*)$/;
    let currentMessage = null;
    lines.forEach(line => {
      const match = line.match(regex);
      if (match) {
        if (currentMessage) {
          parsed.push(currentMessage);
        }
        const date = match[1];
        const time = match[2] + (match[3] ? ' ' + match[3] : '');
        const sender = match[4];
        let text = match[5];
        // Mark media messages generically
        if (/^(?:IMG-|VID-|PTT-)/i.test(text) || /<attached/.test(text)) {
          text = '[Media omitted]';
        }
        currentMessage = { date, time, sender, text };
      } else if (currentMessage) {
        // Continuation of previous message
        currentMessage.text += '\n' + line;
      }
    });
    if (currentMessage) {
      parsed.push(currentMessage);
    }
    return parsed;
  }

  // Handle file input change
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      statusDiv.textContent = 'Chat loading…';
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          messages = parseChat(ev.target.result);
          messages.forEach((msg, idx) => {
            msg.id = idx + 1;
          });
          refreshDisplay();
          statusDiv.textContent = 'Chat uploaded.';
        } catch (err) {
          console.error(err);
          statusDiv.textContent = 'Upload failed.';
        }
      };
      reader.onerror = () => {
        statusDiv.textContent = 'Upload failed.';
      };
      reader.readAsText(file);
    });
  }

  // Attach search listener
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      refreshDisplay();
    });
  }

  // Initial display
  refreshDisplay();
});