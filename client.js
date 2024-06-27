document.addEventListener('DOMContentLoaded', () => {
    let socket;
    let isConnected = false;
    let reconnectInterval = 5000;
    let reconnectTimeout;
    let currentUsername = '';

    const loginButton = document.getElementById('loginButton');
    const statusDiv = document.getElementById('status');
    const roomListbox = document.getElementById('roomListbox');
    const debugBox = document.getElementById('debugBox');
    const loginForm = document.getElementById('loginForm');
    const mainContent = document.getElementById('mainContent');
    const tabButtons = document.querySelectorAll('.tabButton');
    const tabs = document.querySelectorAll('.tab');
    const friendListbox = document.getElementById('friendListbox');
    const friendListTab = document.getElementById('friendsTab');

    loginButton.addEventListener('click', async () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        currentUsername = username;
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
        });
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
        } else if (jsonDict.handler === 'room_join') {
            handleRoomJoin(jsonDict);
        } else if (jsonDict.handler === 'chat_message') {
            handleChatMessage(jsonDict);
        }
    }

    async function joinRoom(roomName) {
    if (isConnected) {
        const joinMessage = {
            handler: 'room_join',
            id: generatePacketID(),
            name: roomName
        };
        await sendMessageToSocket(joinMessage);
        await fetchUserList(roomName);

        const roomInput = document.getElementById('room');
        roomInput.value = roomName;

        const tabId = `tab-${roomName}`;
        if (!document.getElementById(tabId)) {
            const tabButton = document.createElement('button');
            tabButton.className = 'tabButton';
            tabButton.dataset.tab = tabId;
            tabButton.textContent = roomName;
            document.querySelector('.tab-controls').appendChild(tabButton);

            const tabContent = document.createElement('div');
            tabContent.className = 'tab-content';
            tabContent.id = tabId;
            tabContent.innerHTML = `
                <h3>Chat Room: ${roomName}</h3>
                <div class="chatbox"></div>
                <input type="text" class="messageInput" placeholder="Type a message...">
                <button class="sendMessageButton">Send</button>
            `;
            document.querySelector('.tab-content').appendChild(tabContent);

            tabButton.addEventListener('click', () => {
                document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
                tabContent.classList.add('active');
            });

            const sendMessageButton = tabContent.querySelector('.sendMessageButton');
            const messageInput = tabContent.querySelector('.messageInput');
            const chatbox = tabContent.querySelector('.chatbox');

            sendMessageButton.addEventListener('click', () => {
                sendMessage(messageInput.value);
                messageInput.value = '';
            });

            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            tabContent.classList.add('active');
        }
    } else {
        statusDiv.textContent = 'Not connected to server';
    }
}

function handleChatMessage(message) {
    const { room, username, text, avatar } = message;
    const chatbox = document.querySelector(`#tab-${room} .chatbox`);
    if (chatbox) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        
        const avatarElement = document.createElement('img');
        avatarElement.src = avatar || 'default-avatar.png';
        avatarElement.classList.add('avatar');
        
        const usernameElement = document.createElement('span');
        usernameElement.classList.add('username');
        usernameElement.textContent = username;
        
        const textElement = document.createElement('span');
        textElement.classList.add('message-text');
        textElement.textContent = text;

        messageElement.appendChild(avatarElement);
        messageElement.appendChild(usernameElement);
        messageElement.appendChild(textElement);
        chatbox.appendChild(messageElement);
    }
}

    

    async function sendMessage(message) {
        if (isConnected) {
            const messageData = {
                handler: 'room_message',
                type: 'text',
                id: generatePacketID(),
                body: message,
                room: document.getElementById('room').value,
                url: '',
                length: '0'
            };
            await sendMessageToSocket(messageData);
        } else {
            statusDiv.textContent = 'Not connected to server';
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

        // Automatically expand the friend list tab if there are friends
        if (users.length > 0) {
            friendListTab.classList.add('active');
        }
    }

    async function fetchFriendList(users) {
        if (!users || !Array.isArray(users) || users.length === 0) {
            console.log('No users to fetch.');
            return;
        }

        updateFriendList(users); // Initial update with the received users
    }

    async function fetchChatrooms() {
        const mucType = 'public_rooms';
        try {
            const allRooms = await getAllChatrooms(mucType);
            populateRoomList(allRooms);
        } catch (error) {
            console.error('Error fetching chatrooms:', error);
        }
    }

    async function getAllChatrooms(mucType) {
        let allRooms = [];
        let currentPage = 1;
        let totalPages = 1;

        while (currentPage <= totalPages) {
            try {
                const response = await getChatroomList(mucType, currentPage);
                if (response && response.rooms) {
                    allRooms = allRooms.concat(response.rooms);
                    totalPages = parseInt(response.page, 10) || 1;
                    currentPage++;
                } else {
                    break;
                }
            } catch (error) {
                console.error('Error fetching chatrooms:', error);
                break;
            }
        }

        return allRooms;
    }

    async function getChatroomList(mucType, pageNum) {
        const packetID = generatePacketID();
        const listRequest = {
            handler: 'room_info',
            type: mucType,
            id: packetID,
            page: pageNum.toString()
        };

        return new Promise((resolve, reject) => {
            socket.send(JSON.stringify(listRequest));

            const handleResponse = (event) => {
                try {
                    const response = JSON.parse(event.data);
                    if (response.handler === 'room_info' && response.type === mucType) {
                        socket.removeEventListener('message', handleResponse);
                        resolve(response);
                    }
                } catch (error) {
                    reject(error);
                }
            };

            socket.addEventListener('message', handleResponse);

            socket.onerror = (error) => {
                reject(error);
            };
        });
    }

    function populateRoomList(rooms) {
        if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
            console.log('No rooms to display.');
            return;
        }

        roomListbox.innerHTML = '';

        rooms.forEach(room => {
            const listItem = document.createElement('li');
            const logo = document.createElement('span');
            logo.textContent = room.name.charAt(0);
            logo.classList.add('room-logo');

            listItem.appendChild(logo);
            listItem.appendChild(document.createTextNode(` ${room.name} (${room.users_count} users)`));

            if (room.password_protected === '1') {
                listItem.textContent += ' [Password Protected]';
            } else if (room.members_only === '1') {
                listItem.textContent += ' [Members Only]';
            }

            roomListbox.appendChild(listItem);

            listItem.addEventListener('click', () => {
                joinRoom(room.name);
            });
        });
    }
});
