require('dotenv').config();
import cors from 'cors'
import { on } from 'events';
import express from 'express'
const app = express();
import { MongoClient, ObjectId } from 'mongodb'
import * as mongoose from 'mongoose';

interface User {
  username: string;
  log?: Exercise[];
}

interface Exercise {
  description: string;
  duration: number;
  date?: string;
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

app.post('/api/users' , async (req, res) => {
  const newuser = req.body.username.trim();
  const existingUser = await users.findOne({username: newuser})

  if (!existingUser) {
    console.log('user does not exists, creating a new one...')
    await users.insertOne({username: newuser})
    const addedUser = await users.findOne({username: newuser})
    return res.json(addedUser);
  } else {
    console.log('user already exists! returning it')
    return res.json({_id: existingUser._id, username: existingUser.username})
  }
})

app.get('/api/users' , async (req, res) => {

    const allUsers = await users.find({}).toArray();
    return res.json(allUsers)

})

app.post('/api/users/:_id/exercises', async (req, res) => {
  const id = req.params._id;
  const description = req.body.description;
  let duration = Number(req.body.duration);
  let date = new Date(req.body.date).toDateString();

  if(date === 'Invalid Date') {
    return res.json('invalid date')
  }

  if (!date) {
    date = new Date().toDateString()
  }

  if(isNaN(duration)) {
    duration = 0;
  }

  const userToUpdate = await users.findOne({_id: new ObjectId(id)});

  if (userToUpdate) {

    await users.findOneAndUpdate({_id: userToUpdate._id},{$push:{
      log: {description, duration, date}
    }});

    return res.json({username: userToUpdate.username,
                    description,
                    duration,
                    date,
                    _id: userToUpdate._id})
  } else {
    return res.json('invalid user')
  }

})

const port = process.env.PORT || 3333;
app.listen(port, () => {
  console.log('Your app is listening on port ' + port)
})
