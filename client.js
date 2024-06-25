document.addEventListener('DOMContentLoaded', () => {
    let socket;
    let isConnected = false;
    let reconnectInterval = 5000;
    let reconnectTimeout;

    const loginButton = document.getElementById('loginButton');
    const statusDiv = document.getElementById('status');
    const roomListbox = document.getElementById('roomListbox');
    const debugBox = document.getElementById('debugBox');
    const loginForm = document.getElementById('loginForm');
    const mainContent = document.getElementById('mainContent');
    const tabButtons = document.querySelectorAll('.tabButton');
    const tabs = document.querySelectorAll('.tab');
    const friendListbox = document.getElementById('friendListbox');
    const chatHistoryList = document.getElementById('chatHistoryList');
    const chatDetail = document.getElementById('chatDetail');
    const chatContent = document.getElementById('chatContent');
    const backToHistoryButton = document.getElementById('backToHistory');

    loginButton.addEventListener('click', async () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        await connectWebSocket(username, password);
    });

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            tabs.forEach(tab => {
                if (tab.id === tabId) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
            if (tabId === 'historyTab') {
                fetchChatHistory();
            }
        });
    });

    backToHistoryButton.addEventListener('click', () => {
        chatDetail.style.display = 'none';
        chatHistoryList.style.display = 'block';
    });

    async function connectWebSocket(username, password) {
        statusDiv.textContent = 'Connecting to server...';
        socket = new WebSocket('wss://chatp.net:5333/server');

        socket.onopen = async () => {
            isConnected = true;
            statusDiv.textContent = 'Connected to server';
            clearTimeout(reconnectTimeout);

            const loginMessage = {
                username: username,
                password: password,
                handler: 'login',
                id: generatePacketID()
            };
            await sendMessageToSocket(loginMessage);
        };

        socket.onmessage = (event) => {
            processReceivedMessage(event.data);
        };

        socket.onclose = () => {
            isConnected = false;
            statusDiv.textContent = 'Disconnected from server';
            attemptReconnect(username, password);
        };

        socket.onerror = (error) => {
            statusDiv.textContent = 'WebSocket error. Check console for details.';
            attemptReconnect(username, password);
        };
    }

    async function attemptReconnect(username, password) {
        if (!isConnected) {
            statusDiv.textContent = 'Attempting to reconnect...';
            reconnectTimeout = setTimeout(() => connectWebSocket(username, password), reconnectInterval);
        }
    }

    async function sendMessageToSocket(message) {
        return new Promise((resolve, reject) => {
            if (isConnected && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(message));
                resolve();
            } else {
                reject(new Error('WebSocket is not connected or not open'));
            }
        });
    }

    function generatePacketID() {
        return `R.U.BULAN©pinoy-2023®#${Math.random().toString(36).substring(7)}`;
    }

    function processReceivedMessage(message) {
        const jsonDict = JSON.parse(message);
        debugBox.value += `${message}\n`;

        if (jsonDict.handler === 'login_event') {
            if (jsonDict.type === 'success') {
                loginForm.style.display = 'none';
                mainContent.style.display = 'block';
                statusDiv.textContent = 'Online';
                fetchFriendList(jsonDict.users);
                fetchChatrooms();
            } else {
                statusDiv.textContent = `Login failed: ${jsonDict.reason}`;
            }
        } else if (jsonDict.handler === 'roster') {
            updateFriendList(jsonDict.users);
        } else if (jsonDict.handler === 'room_info') {
            populateRoomList(jsonDict.rooms);
        } else if (jsonDict.handler === 'chat_message') {
            updateChatHistory(jsonDict.message);
        }
    }

    function updateFriendList(users) {
        if (!users || !Array.isArray(users) || users.length === 0) {
            console.log('No users to fetch.');
            return;
        }

        friendListbox.innerHTML = ''; // Clear previous content

        const onlineUsers = users.filter(user => user.mode === 'online');
        const offlineUsers = users.filter(user => user.mode !== 'online');

        const createUserElement = (user) => {
            const li = document.createElement('li');
            li.classList.add('friend-item');

            const avatar = document.createElement('img');
            avatar.src = user.photo_url || 'default-avatar.png';
            avatar.alt = user.username;
            avatar.classList.add('avatar');

            const statusIndicator = document.createElement('span');
            statusIndicator.classList.add('status-indicator');
            statusIndicator.style.backgroundColor = user.mode === 'online' ? 'green' : 'grey';

            const username = document.createElement('span');
            username.textContent = user.username;
            username.classList.add('username');

            const statusMessage = document.createElement('div');
            statusMessage.innerHTML = user.status || '';
            statusMessage.classList.add('status-message');
            statusMessage.style.display = 'none';

            li.appendChild(avatar);
            li.appendChild(statusIndicator);
            li.appendChild(username);
            li.appendChild(statusMessage);

            li.addEventListener('mouseenter', () => {
                statusMessage.style.display = 'block';
            });

            li.addEventListener('mouseleave', () => {
                statusMessage.style.display = 'none';
            });

            return li;
        };

        const onlineList = document.createElement('ul');
        onlineUsers.forEach(user => {
            onlineList.appendChild(createUserElement(user));
        });

        const offlineList = document.createElement('ul');
        offlineUsers.forEach(user => {
            offlineList.appendChild(createUserElement(user));
        });

        friendListbox.appendChild(onlineList);
        friendListbox.appendChild(offlineList);
    }

    async function fetchFriendList(users) {
        if (!users || !Array.isArray(users) || users.length === 0) {
            console.log('No users to fetch.');
            return;
        }

        updateFriendList(users); // Initial update with the received users
    }

    async function fetchChatrooms() {
        const roomList = [
            { name: 'Room 1', description: 'Description 1', photo_url: 'room1.png' },
            { name: 'Room 2', description: 'Description 2', photo_url: 'room2.png' },
            { name: 'Room 3', description: 'Description 3', photo_url: 'room3.png' }
        ];
        populateRoomList(roomList); // Replace with actual API call or WebSocket message
    }

    function populateRoomList(rooms) {
        if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
            console.log('No rooms to display.');
            return;
        }

        roomListbox.innerHTML = ''; // Clear previous content

        rooms.forEach(room => {
            const li = document.createElement('li');
            li.classList.add('room-item');

            const roomImage = document.createElement('img');
            roomImage.src = room.photo_url || 'default-room.png';
            roomImage.alt = room.name;
            roomImage.classList.add('room-image');

            const roomName = document.createElement('span');
            roomName.textContent = room.name;
            roomName.classList.add('room-name');

            const roomDescription = document.createElement('div');
            roomDescription.textContent = room.description;
            roomDescription.classList.add('room-description');

            li.appendChild(roomImage);
            li.appendChild(roomName);
            li.appendChild(roomDescription);

            roomListbox.appendChild(li);
        });
    }

    async function fetchChatHistory() {
        const chatHistory = [
            { user: 'User 1', message: 'Message 1' },
            { user: 'User 2', message: 'Message 2' },
            { user: 'User 3', message: 'Message 3' }
        ];
        updateChatHistory(chatHistory); // Replace with actual API call or WebSocket message
    }

    function updateChatHistory(messages) {
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            console.log('No chat history to display.');
            return;
        }

        chatHistoryList.innerHTML = ''; // Clear previous content

        messages.forEach(msg => {
            const div = document.createElement('div');
            div.classList.add('chat-history-item');

            const username = document.createElement('span');
            username.textContent = msg.user;
            username.classList.add('chat-user');

            const message = document.createElement('span');
            message.textContent = msg.message;
            message.classList.add('chat-message');

            div.appendChild(username);
            div.appendChild(message);

            div.addEventListener('click', () => {
                displayChatDetail(msg.user, [msg]);
            });

            chatHistoryList.appendChild(div);
        });
    }

    function displayChatDetail(user, messages) {
        chatHistoryList.style.display = 'none';
        chatDetail.style.display = 'block';
        chatContent.innerHTML = ''; // Clear previous content

        messages.forEach(msg => {
            const div = document.createElement('div');
            div.classList.add('chat-message-detail');

            const username = document.createElement('span');
            username.textContent = msg.user;
            username.classList.add('chat-user-detail');

            const message = document.createElement('span');
            message.textContent = msg.message;
            message.classList.add('chat-message-detail-text');

            div.appendChild(username);
            div.appendChild(message);

            chatContent.appendChild(div);
        });
    }
});
