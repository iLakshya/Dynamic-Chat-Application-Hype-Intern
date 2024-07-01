require('dotenv').config();

const { default: mongoose } = require('mongoose');
var moongose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/dynamic-chat-app');

const app = require('express')();
const http = require('http').Server(app);

const  userRoute = require('./routes/userRouter');
const User = require('./models/userModel');
const Chat = require('./models/chatModel');

app.use('/', userRoute);

const io = require('socket.io')(http);
var usp = io.of('/user-namespace');

usp.on('connection', async function(socket){
    console.log("User Connected");

    // console.log(socket.handshake.auth.token);
    var userId = socket.handshake.auth.token;

    await User.findByIdAndUpdate({ _id: userId }, { $set: { is_online: '1' }});

    // User online broadcast status
    socket.broadcast.emit('getOnlineUser', { user_id: userId });

    socket.on('disconnect', async function(){
        console.log("User Disconnected");

        var userId = socket.handshake.auth.token;
        await User.findByIdAndUpdate({ _id: userId }, { $set: { is_online: '0' }});

        // User broadcasr offline status
        socket.broadcast.emit('getOfflineUser', { user_id: userId });

    });

    // chat implementation
    socket.on('newChat', function(data){
        // console.log(data);
        socket.broadcast.emit('loadNewChat', data);
    });

    // load older chats
    socket.on('existsChat', async function(data){
        var chats = await Chat.find({ $or:[
            { sender_id: data.sender_id, receiver_id: data.receiver_id },
            { sender_id: data.receiver_id, receiver_id: data.sender_id }
        ]});

        socket.emit('loadChats', { chats: chats });

    });

});

http.listen(3000, function(){
    console.log('Server is running');
});