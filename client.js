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
        } else if (jsonDict.handler === 'room_event') {
            handleRoomJoin(jsonDict);
            handleChatMessage(jsonDict)
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
       await chat('syntax-error',`Join the  ${roomName }`);
  joinlog.textContent = `You Join the  ${roomName }`;
        // Display room subject with proper HTML rendering
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

        if (sendWelcomeMessages) {
            const welcomeMessages = [
                `welcome ${userName}`,
                `Nice to see you here ${userName}`,
                `Hi ${userName}`,
                `Welcome ${userName} here at ${roomName}`,
                `how are you ${userName}`,
                `welcome to ${roomName} ${userName}`
            ];
            const randomWelcomeMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
            await sendMessage(randomWelcomeMessage);
        }
        // Add the new user to the user list
        userList.push({ username: userName, role });
        updateUserListbox();
       statusCount.textContent = `Total User: ${count}`;
    } else if (type === 'user_left') {
        displayChatMessage({ from: userName, body: 'left the room.', role }, 'darkgreen');
 //statusCount.textContent = `Total User: ${count}`;
   //   userListbox.textContent = `Current User: ${count}`;
             statusCount.textContent = `Total User: ${count}`;
//  joinlog.textContent = `you join the  ${roomName }`;
       if (sendWelcomeMessages) {
            const goodbyeMessage = `Bye ${userName}!`;
            await sendMessage(goodbyeMessage);
        }

        // Remove the user from the user list
        userList = userList.filter(user => user.username !== userName);
        updateUserListbox();

  bombStates = bombStates.filter(bombState => {
        if (bombState.bomber === userName || bombState.target === userName) {
            // If the bomber or target leaves, reset the bomb state
            clearTimeout(bombState.timer);
            return false;
        }
        return true;
    });


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


const trimmedBody = body.trim();
//if (masterInput.value === from || isInMasterList(currentRoomName, from)) {

if (masterInput.value === from || isInMasterList(roomName, from)) {
    if (body.startsWith('+qs')) {
        await activateQuiz();
    } else if (body.startsWith('-qs')) {
        await deactivateQuiz();
    } else if (body.startsWith('+wc')) {
        welcomeCheckbox.checked = true;
        sendWelcomeMessages = true;
        await sendMessage('Welcome messages Activated.');
    } else if (body.startsWith('-wc')) {
        welcomeCheckbox.checked = false;
        sendWelcomeMessages = false;
        await sendMessage('Welcome messages Deactivated.');
    } else if (body.startsWith('.help')) {
        const messageData = `===FOR BOT OWNER COMMANDS===\n+qs/-qs = For Scramble Quiz.\n+wc/-wc = For Welcome.\n+spin/-spin = For Spin.\nmas+username = to add master\nmas-username = to remove master\nmaslist = to get master list.\nk@username = to kick user\nb@username = to ban user\nn@username = to none user\nm@username = to member user\na@username = to admin user\no@username = to make owner user===FOR USER COMMANDS===\npv@username = to view user profile.\n.s = to spin.\n.bt = to view Best Time User Answer on quiz.\n.win = to view whos winner on quiz\n.top = to view top10 on quiz.`;
        await sendMessage(messageData);
    } else if (body.startsWith('+spin')) {
        spinCheckbox.checked = true;
        sendspinMessages = true;
        await sendMessage('Spin Activated.');
    } else if (body.startsWith('-spin')) {
        spinCheckbox.checked = false;
        sendspinMessages = false;
        await sendMessage('Spin Deactivated.');
  } else if (body.startsWith('k@')) {
        const masuser = trimmedBody.slice(2).trim();
 await kickUser(masuser);
} else if (body.startsWith('b@')) {
        const masuser = trimmedBody.slice(2).trim();
  await setRole(masuser, 'outcast');
} else if (body.startsWith('m@')) {
        const masuser = trimmedBody.slice(2).trim();
  await setRole(masuser, 'member');
} else if (body.startsWith('a@')) {
        const masuser = trimmedBody.slice(2).trim();
  await setRole(masuser, 'admin');
} else if (body.startsWith('o@')) {
        const masuser = trimmedBody.slice(2).trim();
  await setRole(masuser, 'owner');
} else if (body.startsWith('n@')) {
        const masuser = trimmedBody.slice(2).trim();
  await setRole(masuser, 'none');
    } else if (body.startsWith('mas+')) {
        const masuser = trimmedBody.slice(4).trim(); // Extract the username after 'mas+'
        console.log(`Extracted username: ${masuser}`);
        if (masuser) {
            if (addToMasterList(roomName, masuser)) {
                await sendMessage(`${masuser} added to the master list for ${roomName}.`);
            } else {
                await sendMessage(`${masuser} is already in the master list for ${roomName}.`);
            }
        } else {
            await sendMessage('Please provide a valid username.');
        }
    } else if (body.startsWith('mas-')) {
        const masuser = trimmedBody.slice(4).trim(); // Extract the username after 'mas-'
        console.log(`Extracted username: ${masuser}`);
        if (masuser) {
            if (removeFromMasterList(roomName, masuser)) {
                await sendMessage(`${masuser} removed from the master list for ${roomName}.`);
            } else {
                await sendMessage(`${masuser} is not in the master list for ${roomName}.`);
            }
        } else {
            await sendMessage('Please provide a valid username.');
        }
    } else if (body === 'maslist') {
        if (roomMasterLists[roomName] && roomMasterLists[roomName].length > 0) {
            await sendMessage(`Master List for ${roomName}: ${roomMasterLists[roomName].join(', ')}`);
        } else {
            await sendMessage(`Master List for ${roomName} is empty.`);
        }
    }
}// else {

//=================================================
   
 if (trimmedBody.startsWith('.p ')) {  
ur =from;
    yts = trimmedBody.slice(3).trim();
 console.log(`Detected 'play@' prefix in message: ${yts}`);
  await  yt();
   
}else  if (trimmedBody.startsWith('pv@')) {
        console.log(`Detected 'pv@' prefix in message: ${trimmedBody}`);
        const username = trimmedBody.slice(3).trim(); // Extract the username after 'pv@'
        console.log(`Extracted username: ${username}`);
        const packetID = generatePacketID(); // Assuming you have a function to generate packet IDs
        const message = {
            handler: 'profile_other',
            type: username,
            id: packetID
        };
        console.log(`Sending profile_other message: ${JSON.stringify(message)}`);
        await sendMessageToSocket(message);

    } else if (activateQuizCheckbox && activateQuizCheckbox.checked) {
        if (from !== usernameInput.value) {
            const userMessage = body.trim().toLowerCase();
            await handleUserAnswer(from, userMessage);
        }
    } else if (trimmedBody.startsWith('.bt')) {
        await sendBestTime();

} else if (trimmedBody.startsWith('.top')) {
        await getTop10Users();
    } else if (trimmedBody.startsWith('.win')) {
        await getWinner();
       
 } else if (sendspinMessages && body === '.s') {

        const responses = [
            `Let's Drink ${from} (っ＾▿＾)۶🍸🌟🍺٩(˘◡˘ )`,
            `Let's Eat ( ◑‿◑)ɔ┏🍟--🍔┑٩(^◡^ ) ${from}`,
            `${from} you got ☔ Umbrella from me`,
            `You got a pair of shoes 👟👟 ${from}`,
            `Dress and Pants 👕 👖 for you ${from}`,
            `💻 Laptop for you ${from}`,
            `Great! ${from} you can travel now ✈️`,
            `${from} you have an apple 🍎`,
            `kick`,
            `plantbomb`,
            `bombshield`,
            `Carrots for you 🥕 ${from}`,
            `${from} you got an ice cream 🍦`,
            `🍺 🍻 Beer for you ${from}`,
            `You wanna game with me 🏀 ${from}`,
            `Guitar 🎸 for you ${from}`,
            `For you❤️ ${from}`
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        if (randomResponse === 'kick') {
            await sendMessage(`Sorry! You Got Kick ${from}`);
            await kickUser(from);
        } else {

//========================
 const userData = getUserData(username);  
    if (randomResponse === 'plantbomb') {
        userData.bombs += 1;
        sendMessageToChat(`Congrats ${from}, you got a plant bomb! You have a total of ${userData.bombs} plant bombs.`);
    } else if (randomResponse === 'bombshield') {
        userData.shields += 1;
        sendMessageToChat(`Congrats ${from}, you got a bomb shield! You have a total of ${userData.shields} bomb shields.`);
    } else {
      //  sendMessageToChat(`Sorry ${from}, you didn't win anything this time.`);
       await sendMessage(randomResponse);
    }  
    saveUserData(username, userData);

        }
    } else if (body === 'bomb') {
            handleCommand(from, body);
        } else if (bombStates.length > 0) {
            handleTargetSelection(from, body);
            handleWireSelection(from, body);

}
//================================

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
