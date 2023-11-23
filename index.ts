require('dotenv').config();
import cors from 'cors'
import express from 'express'
const app = express();
import { MongoClient } from 'mongodb'
import * as mongoose from 'mongoose';

interface User {
  username: string;
  log?: Exercise[];
}

interface Exercise {
  description: string;
  duration: number;
  date: string;
}

const mongoURI = process.env.MONGO_URI
if (!mongoURI) {
  throw new Error('Mongo URI is not defined')
}
const client = new MongoClient(mongoURI);

const db = client.db('exerciseTracker')
const users = db.collection<User>('users')

//for getting values from form using req.body
app.use(express.json());
app.use(express.urlencoded({ extended: true }))

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

let resUserObject = {};
let hasPosted = false;
app.all('/api/users', async (req, res) => {
  if(req.method === 'POST') {
    const newuser = req.body.username.trim();
    const existingUser = await users.findOne({username: newuser})

    if (!existingUser) {
      console.log('user does not exists, creating a new one...')
      await users.insertOne({username: newuser})
      const addedUser = await users.findOne({username: newuser})
      resUserObject = addedUser!
    } else {
      console.log('user alread exists! returning it')
      resUserObject = {_id: existingUser._id, username: existingUser.username}
    }
    hasPosted = true;
    res.redirect('/api/users')
  } else if (req.method === 'GET') {
    if (!hasPosted) {
      const allUsers = await users.find({}).toArray();
      console.log(allUsers.map(x => {x._id, x.username}))
      hasPosted = false;
      return res.json(allUsers)
    } else {
      return res.json(resUserObject)
    }
  }
})

const port = process.env.PORT || 3333;
app.listen(port, () => {
  console.log('Your app is listening on port ' + port)
})
