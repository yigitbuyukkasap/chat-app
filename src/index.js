const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage, generateLocationMessage } = require('./utils/messages');
const {
    addUser,
    removeUser,
    getUser,
    getUserInRoom } = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))


io.on('connection', (socket) => {
    console.log('NEW WEBSOCKET CONNECTION');

    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })
        if (error) {
            callback(error)
        }

        socket.join(user.room)

        socket.emit('msg', generateMessage(user.username, 'Welcome!'))
        socket.broadcast.to(user.room).emit('msg', generateMessage(user.username, `${user.username} has joined`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUserInRoom(user.room)
        })
        console.log(getUserInRoom(user.room));
        callback()
    })

    socket.on('sendMsg', (msg, callback) => {
        const filter = new Filter()

        if (filter.isProfane(msg)) {
            return callback('BAD WORD!')
        }

        const user = getUser(socket.id)
        io.to(user.room).emit('msg', generateMessage(user.username, msg))
        callback()
    })

    socket.on('sendLocation', (coords) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude}, ${coords.longitude}`))
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('msg', generateMessage(user.username, `User has left ${user.username}`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUserInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {

})