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



    async function handleRoomEvent(messageObj) {
    const type = messageObj.type;
    const userName = messageObj.username || 'Unknown';
    const role = messageObj.role;
    const count = messageObj.current_count;
    const roomName = messageObj.name;
  
    if (type === 'you_joined') {
        displayChatMessage({ from: '', body: `**You** joined the room as ${role}` });
    displayRoomSubject(`Room subject: ${messageObj.subject} (by ${messageObj.subject_author})`);

        // Display list of users with roles
        messageObj.users.forEach(user => {
            displayChatMessage({ from: user.username, body: `joined the room as ${user.role}`, role: user.role }, 'green');
        });

        // Update the user list
        userList = messageObj.users;
        updateUserListbox();
statusCount.textContent = `Total User: ${count}`;

 chatbox.removeChild(captchaImg);
      chatbox.removeChild(captchaTextbox);
      chatbox.removeChild(sendCaptchaButton);

    } else if (type === 'user_joined') {
        displayChatMessage({ from: userName, body: `joined the room as ${role}`, role }, 'green');
            
  
       if (userName === 'prateek') {
            await setRole(userName, 'outcast');
        }
   } else if (type === 'user_left') {
        displayChatMessage({ from: userName, body: 'left the room.', role }, 'darkgreen');
        userList = userList.filter(user => user.username !== userName);
        
 
    } else if (type === 'text') {
    const body = messageObj.body;
    const from = messageObj.from;
    const avatar = messageObj.avatar_url;
const roomName = messageObj.room
    displayChatMessage({
        from: messageObj.from,
        body: messageObj.body,
        role: messageObj.role,
        avatar: messageObj.avatar_url
    });


    } else if (type === 'image') {
        const bodyurl = messageObj.url;
        const from = messageObj.from;
        const avatar = messageObj.avatar_url;

        displayChatMessage({
            from: messageObj.from,
            bodyurl: messageObj.url,
            role: messageObj.role,
            avatar: messageObj.avatar_url
        });
    } else if (type === 'audio') {
    const bodyurl = messageObj.url;
    const from = messageObj.from;
    const avatar = messageObj.avatar_url;

    displayChatMessage({
        from: from,
        bodyurl: bodyurl,
        role: messageObj.role,
        avatar: avatar,
        type: type // Ensure the type is passed along
    });
}
else  if (type === 'gift') {
    const toRoom = messageObj.to_room;
    const gift = messageObj.gift;
    const to = messageObj.to;
    const from = messageObj.from;
;

    displayChatMessage({
        body: `${from} of ${toRoom} sent a ${gift} to ${to}`,
    }, 'green');
}

 else      if (type === 'room_needs_captcha') {
    
 handleCaptcha(messageObj);
    } else if (type === 'role_changed') {
        const oldRole = messageObj.old_role;
        const newRole = messageObj.new_role;
        const user = messageObj.t_username;
        const actor = messageObj.actor;
        const color = getRoleChangeColor(newRole);
        displayChatMessage({ from: '', body: `${user} ${newRole} by ${actor}` }, color);

        // Update the user's role in the user list
        const userObj = userList.find(user => user.username === user);
        if (userObj) {
            userObj.role = newRole;
            updateUserListbox();
        }
    } else if (type === 'room_create') {
        if (messageObj.result === 'success') {
            await joinRoom(messageObj.name);
        } else if (messageObj.result === 'room_exists') {
            statusDiv.textContent = `Room ${messageObj.name} already exists.`;
        } else if (messageObj.result === 'empty_balance') {
            statusDiv.textContent = 'Cannot create room: empty balance.';
        } else {
            statusDiv.textContent = 'Error creating room.';
        }

} else if (type === 'room_needs_password') {
  const room = document.getElementById('room').value;
  displayChatMessage({
        from: room,
        body: 'Room is locked!',
        color: 'red'
    });

    }

}



    function displayChatMessage(messageObj, color = 'black') {
    const { from, body, bodyurl, role, avatar, type } = messageObj;
    const newMessage = document.createElement('div');
    newMessage.style.display = 'flex';
    newMessage.style.alignItems = 'center';
    newMessage.style.marginBottom = '10px';

    // Add avatar if available
    if (avatar) {
        const avatarContainer = document.createElement('div');
        avatarContainer.className = 'avatar-container';

        const avatarImg = document.createElement('img');
        avatarImg.src = avatar;
        avatarImg.alt = `${from}'s avatar`;
        avatarImg.style.width = '40px';
        avatarImg.style.height = '40px';
        avatarImg.style.borderRadius = '50%';
        avatarImg.style.marginRight = '10px';
        avatarContainer.appendChild(avatarImg);

        const starColor = getRoleColor(role);
        if (starColor) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.color = starColor;
            avatarContainer.appendChild(star);
        }

        newMessage.appendChild(avatarContainer);
    }

    // Add the sender's name with role-based color if available
    if (from) {
        const coloredFrom = document.createElement('span');
        coloredFrom.textContent = `${from}: `;
        coloredFrom.style.color = getRoleColor(role) || 'black';
        coloredFrom.style.fontWeight = 'bold';
        newMessage.appendChild(coloredFrom);
    }

    // Handle different message types
    if (type === 'gift') {
        // Construct the gift message display
        const giftMessage = document.createElement('span');
        giftMessage.innerHTML = `
            Gift from ${messageObj.from} to ${messageObj.to} in ${messageObj.toRoom}<br>
            Gift: ${messageObj.gift}<br>
            Resources: ${messageObj.resources}<br>
            Repeats: ${messageObj.repeats}<br>
            Animation: ${messageObj.animation}<br>
            Room: ${messageObj.room}<br>
            User ID: ${messageObj.userId}<br>
            Timestamp: ${new Date(parseInt(messageObj.timestamp)).toLocaleString()}<br>
            ID: ${messageObj.id}
        `;
        giftMessage.style.color = color;
        newMessage.appendChild(giftMessage);
    } else {
        // Check if the bodyurl is an audio file by checking the file extension
        if (type === 'audio' && bodyurl) {
            const audioElement = document.createElement('audio');
            audioElement.src = bodyurl;
            audioElement.controls = true; // Enable built-in controls for the audio player
            newMessage.appendChild(audioElement);
        } 
        // If the bodyurl is an image URL
        else if (bodyurl && bodyurl.match(/\.(jpeg|jpg|gif|png)$/i)) {
            const imageElement = document.createElement('img');
            imageElement.src = bodyurl;
            imageElement.style.maxWidth = '140px'; // Set maximum width for the image
            newMessage.appendChild(imageElement);
        } 
        // For regular text messages
        else {
            const messageBody = document.createElement('span');
            messageBody.textContent = body;
            messageBody.style.color = color;
            newMessage.appendChild(messageBody);
        }
    }

    // Append the new message to the chatbox and scroll to the bottom
    const chatbox = document.getElementById('chatbox');
    chatbox.appendChild(newMessage);
    chatbox.scrollTop = chatbox.scrollHeight;
}

//=======================

function displayRoomSubject(subject) {
    const newMessage = document.createElement('div');
    newMessage.innerHTML = subject;
    chatbox.appendChild(newMessage);
    chatbox.scrollTop = chatbox.scrollHeight;
}

function getRoleColor(role) {
    switch (role) {
        case 'creator':
            return 'orange';
        case 'owner':
            return 'red';
        case 'admin':
            return 'blue';
        case 'member':
            return 'green';
        default:
            return 'grey';
    }
}


function getRoleChangeColor(newRole) {
    switch (newRole) {
        case 'kick':
            return 'red';
        case 'outcast':
            return 'orange';
        case 'member':
        case 'admin':
        case 'owner':
            return 'blue';
        default:
            return 'black';
    }
}

   
async function setRole(username, role) {
        const obj2 = {
            handler: 'room_admin',
            type: 'change_role',
            id: generatePacketID(),
             room: document.getElementById('room').value, 
            t_username: username,
            t_role: role
        };
        await sendMessageToSocket(obj2);  
}

    async function kickUser(username) {
        const kickMessage = {
            handler: "room_admin",
            type: "kick",
            id: generatePacketID(),
            room: document.getElementById('room').value,
            t_username: username,
            t_role: "none"
        };
        await sendMessageToSocket(kickMessage);
    }

 function updateUserListbox() {
 function updateUserListbox() {
    userListbox.innerHTML = '';

    const sortedUsers = userList.sort((a, b) => {
        const roles = ['creator', 'owner', 'admin', 'member', 'none'];
        return roles.indexOf(a.role) - roles.indexOf(b.role);
    });

    sortedUsers.forEach(user => {
        // Create and append the avatar image
        const avatarImg = document.createElement('img');
        avatarImg.src = user.avatar; // Set the src attribute to the user's avatar URL
        avatarImg.alt = `${user.username}'s avatar`;
        avatarImg.style.width = '20px'; // Adjust the width of the avatar as needed
        avatarImg.style.height = '20px'; // Adjust the height of the avatar as needed

        // Create and append the option element
        const option = document.createElement('option');
        option.appendChild(avatarImg); // Append the avatar image
        option.appendChild(document.createTextNode(`${user.username} (${user.role})`)); // Append the username and role
        option.style.color = getRoleColor(user.role);  // Apply color based on role

        userListbox.appendChild(option);
    });
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
