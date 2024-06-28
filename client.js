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
            console.error('WebSocket error:', error);
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
    console.log('Received message:', message); // Add this line
    const jsonDifunction processReceivedMessage(message) {
    console.log('Received message:', message);
    const jsonDict = JSON.parse(message);
    debugBox.value += `${message}\n`;

    if (jsonDict.handler === 'login_event') {
        if (jsonDict.type === 'success') {
            loginForm.style.display = 'none';
            mainContent.style.display = 'block';
            statusDiv.textContent = 'Online';
            console.log('Login successful. Users:', jsonDict.users);
            fetchFriendList(jsonDict.users);
            fetchChatrooms();
        } else {
            statusDiv.textContent = `Login failed: ${jsonDict.reason}`;
        }
    } else if (jsonDict.handler === 'roster') {
        console.log('Roster received. Users:', jsonDict.users);
        updateFriendList(jsonDict.users);
    } else if (jsonDict.handler === 'room_event') {
        handleRoomEvent(jsonDict);
    } else if (jsonDict.handler === 'chat_message') {
        handleChatMessage(jsonDict);
    } else if (jsonDict.handler === 'list_room') {
        console.log('Room list received. Rooms:', jsonDict.rooms);
        updateRoomList(jsonDict.rooms);
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
                    sendMessage(messageInput.value, roomName);
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

    async function handleRoomEvent(messageObj) {
        const type = messageObj.type;
        const userName = messageObj.username || 'Unknown';
        const role = messageObj.role;
        const count = messageObj.current_count;
        const roomName = messageObj.name;

        if (type === 'you_joined') {
            displayChatMessage({ from: '', body: `**You** joined the room as ${role}` });
            displayRoomSubject(`Room subject: ${messageObj.subject} (by ${messageObj.subject_author})`);

            messageObj.users.forEach(user => {
                displayChatMessage({ from: user.username, body: `joined the room as ${user.role}`, role: user.role }, 'green');
            });

            userList = messageObj.users;
            updateUserListbox();
            statusDiv.textContent = `Total User: ${count}`;

            const chatbox = document.querySelector(`#tab-${roomName} .chatbox`);
            if (chatbox) {
                const captchaImg = chatbox.querySelector('.captcha-img');
                const captchaTextbox = chatbox.querySelector('.captcha-textbox');
                const sendCaptchaButton = chatbox.querySelector('.send-captcha-button');
                if (captchaImg && captchaTextbox && sendCaptchaButton) {
                    chatbox.removeChild(captchaImg);
                    chatbox.removeChild(captchaTextbox);
                    chatbox.removeChild(sendCaptchaButton);
                }
            }
        } else if (type === 'user_joined') {
            displayChatMessage({ from: userName, body: `joined the room as ${role}`, role }, 'green');
            if (userName === 'prateek') {
                await setRole(userName, 'outcast');
            }
        } else if (type === 'user_left') {
            displayChatMessage({ from: userName, body: 'left the room.', role }, 'darkgreen');
            userList = userList.filter(user => user.username !== userName);
        } else if (type === 'captcha_request') {
            displayCaptchaForm();
        } else if (type === 'captcha_failed') {
            displayChatMessage({ from: '', body: 'Captcha failed. Please try again.', role }, 'red');
        } else if (type === 'captcha_accepted') {
            displayChatMessage({ from: '', body: 'Captcha accepted. You have successfully joined the room.', role }, 'green');
        }
    }

    async function fetchChatrooms() {
        const listRoomsMessage = {
            handler: 'list_room',
            id: generatePacketID()
        };
        await sendMessageToSocket(listRoomsMessage);
    }

    

    async function fetchFriendList(users) {
        const friendListMessage = {
            handler: 'roster',
            id: generatePacketID(),
            users: users
        };
        await sendMessageToSocket(friendListMessage);
    }

    function updateRoomList(rooms) {
    console.log('Updating room list:', rooms); // Add this line
    roomListbox.innerHTML = '';
    rooms.forEach(room => {
        const option = document.createElement('li');
        option.textContent = room.name;
        option.classList.add('room');
        roomListbox.appendChild(option);

        option.addEventListener('click', () => {
            joinRoom(room.name);
        });
    });
}

function updateFriendList(users) {
    console.log('Updating friend list:', users); // Add this line
    friendListbox.innerHTML = '';
    users.forEach(user => {
        const option = document.createElement('li');
        option.textContent = user.username;
        option.classList.add('friend');
        friendListbox.appendChild(option);
    });
}


    function sendMessage(text, room) {
        const chatMessage = {
            handler: 'chat_message',
            id: generatePacketID(),
            room: room,
            username: currentUsername,
            text: text,
            avatar: 'default-avatar.png'
        };
        socket.send(JSON.stringify(chatMessage));
    }

    function displayCaptchaForm() {
        const chatbox = document.querySelector(`#tab-${roomName} .chatbox`);
        if (chatbox) {
            const captchaImg = document.createElement('img');
            captchaImg.src = '/path/to/captcha/image.png';
            captchaImg.classList.add('captcha-img');

            const captchaTextbox = document.createElement('input');
            captchaTextbox.type = 'text';
            captchaTextbox.classList.add('captcha-textbox');
            captchaTextbox.placeholder = 'Enter captcha';

            const sendCaptchaButton = document.createElement('button');
            sendCaptchaButton.classList.add('send-captcha-button');
            sendCaptchaButton.textContent = 'Submit';

            sendCaptchaButton.addEventListener('click', () => {
                const captchaMessage = {
                    handler: 'captcha_verify',
                    id: generatePacketID(),
                    captcha: captchaTextbox.value
                };
                socket.send(JSON.stringify(captchaMessage));
            });

            chatbox.appendChild(captchaImg);
            chatbox.appendChild(captchaTextbox);
            chatbox.appendChild(sendCaptchaButton);
        }
    }

    function displayChatMessage(message, color = 'black') {
        const { from, body, role } = message;
        const chatbox = document.querySelector(`#tab-${roomName} .chatbox`);
        if (chatbox) {
            const messageElement = document.createElement('div');
            messageElement.classList.add('message');

            const usernameElement = document.createElement('span');
            usernameElement.classList.add('username');
            usernameElement.style.color = color;
            usernameElement.textContent = from ? `${from} (${role}): ` : '';

            const textElement = document.createElement('span');
            textElement.classList.add('message-text');
            textElement.textContent = body;

            messageElement.appendChild(usernameElement);
            messageElement.appendChild(textElement);
            chatbox.appendChild(messageElement);
        }
    }

    function displayRoomSubject(subject) {
        const chatbox = document.querySelector(`#tab-${roomName} .chatbox`);
        if (chatbox) {
            const subjectElement = document.createElement('div');
            subjectElement.classList.add('room-subject');
            subjectElement.textContent = subject;
            chatbox.appendChild(subjectElement);
        }
    }

    async function fetchUserList(roomName) {
        const listUsersMessage = {
            handler: 'list_user',
            id: generatePacketID(),
            room: roomName
        };
        await sendMessageToSocket(listUsersMessage);
    }

    async function setRole(username, role) {
        const setRoleMessage = {
            handler: 'set_role',
            id: generatePacketID(),
            username: username,
            role: role
        };
        await sendMessageToSocket(setRoleMessage);
    }
});
