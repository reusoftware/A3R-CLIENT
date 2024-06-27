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
        } else if (jsonDict.handler === 'room_event') {
            handleRoomEvent(jsonDict);
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
        } else if (type === 'text') {
            displayChatMessage({
                from: messageObj.from,
                body: messageObj.body,
                role: messageObj.role,
                avatar: messageObj.avatar_url
            });
        } else if (type === 'image') {
            displayChatMessage({
                from: messageObj.from,
                bodyurl: messageObj.url,
                role: messageObj.role,
                avatar: messageObj.avatar_url
            });
        } else if (type === 'error') {
            displayChatMessage({ from: '', body: `**ERROR**: ${messageObj.body}`, role }, 'red');
        } else if (type === 'captcha') {
            const chatbox = document.querySelector(`#tab-${roomName} .chatbox`);
            if (chatbox) {
                const captchaImg = document.createElement('img');
                captchaImg.src = messageObj.url;
                captchaImg.alt = 'Captcha';
                captchaImg.className = 'captcha-img';

                const captchaTextbox = document.createElement('input');
                captchaTextbox.type = 'text';
                captchaTextbox.className = 'captcha-textbox';

                const sendCaptchaButton = document.createElement('button');
                sendCaptchaButton.textContent = 'Submit Captcha';
                sendCaptchaButton.className = 'send-captcha-button';

                chatbox.appendChild(captchaImg);
                chatbox.appendChild(captchaTextbox);
                chatbox.appendChild(sendCaptchaButton);

                sendCaptchaButton.addEventListener('click', async () => {
                    const captchaResponse = captchaTextbox.value;
                    const captchaMessage = {
                        handler: 'captcha_response',
                        room: roomName,
                        response: captchaResponse
                    };
                    await sendMessageToSocket(captchaMessage);
                });
            }
        } else if (type === 'subject') {
            displayChatMessage({
                from: messageObj.from,
                body: `Subject is now ${messageObj.subject} (by ${messageObj.subject_author})`,
                role: messageObj.role,
                avatar: messageObj.avatar_url
            });
        }

        updateUserListbox();
    }

    async function fetchFriendList(users) {
        if (isConnected) {
            friendListbox.innerHTML = '';
            users.forEach(user => {
                const listItem = document.createElement('li');
                listItem.className = 'list-item';
                listItem.dataset.username = user.username;
                listItem.textContent = user.username;
                friendListbox.appendChild(listItem);
            });
        } else {
            statusDiv.textContent = 'Not connected to server';
        }
    }

    async function fetchChatrooms() {
        if (isConnected) {
            const listRoom = {
                handler: 'list_room',
                id: generatePacketID()
            };
            await sendMessageToSocket(listRoom);
        } else {
            statusDiv.textContent = 'Not connected to server';
        }
    }

    async function fetchUserList(roomName) {
        if (isConnected) {
            const listUser = {
                handler: 'list_user',
                id: generatePacketID(),
                room: roomName
            };
            await sendMessageToSocket(listUser);
        } else {
            statusDiv.textContent = 'Not connected to server';
        }
    }

    function updateFriendList(users) {
        friendListbox.innerHTML = '';
        users.forEach(user => {
            const listItem = document.createElement('li');
            listItem.className = 'list-item';
            listItem.dataset.username = user.username;
            listItem.textContent = user.username;
            friendListbox.appendChild(listItem);
        });
    }

    function displayChatMessage(message, color = 'black') {
        const { from, body, bodyurl, role, avatar } = message;
        const roomName = document.getElementById('room').value;

        const chatbox = document.querySelector(`#tab-${roomName} .chatbox`);
        if (chatbox) {
            const messageElement = document.createElement('div');
            messageElement.classList.add('message');
            messageElement.style.color = color;

            if (avatar) {
                const avatarElement = document.createElement('img');
                avatarElement.src = avatar;
                avatarElement.classList.add('avatar');
                messageElement.appendChild(avatarElement);
            }

            const fromElement = document.createElement('span');
            fromElement.classList.add('username');
            fromElement.textContent = from ? `${from}: ` : '';
            messageElement.appendChild(fromElement);

            const textElement = document.createElement('span');
            textElement.classList.add('message-text');
            textElement.textContent = body;
            if (bodyurl) {
                const imgElement = document.createElement('img');
                imgElement.src = bodyurl;
                textElement.appendChild(imgElement);
            }
            messageElement.appendChild(textElement);

            chatbox.appendChild(messageElement);
        }
    }

    async function sendMessage(message, roomName) {
        const messagePacket = {
            handler: 'chat_message',
            id: generatePacketID(),
            room: roomName,
            message: message
        };
        await sendMessageToSocket(messagePacket);
    }

    function displayRoomSubject(subject) {
        const roomName = document.getElementById('room').value;
        const tabId = `tab-${roomName}`;
        const tabContent = document.getElementById(tabId);
        if (tabContent) {
            const subjectElement = tabContent.querySelector('.room-subject');
            if (subjectElement) {
                subjectElement.textContent = subject;
            } else {
                const newSubjectElement = document.createElement('div');
                newSubjectElement.className = 'room-subject';
                newSubjectElement.textContent = subject;
                tabContent.insertBefore(newSubjectElement, tabContent.firstChild);
            }
        }
    }

    async function setRole(username, role) {
        if (isConnected) {
            const setRoleMessage = {
                handler: 'set_role',
                id: generatePacketID(),
                username: username,
                role: role
            };
            await sendMessageToSocket(setRoleMessage);
        } else {
            statusDiv.textContent = 'Not connected to server';
        }
    }
});
