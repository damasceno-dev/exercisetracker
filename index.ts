require('dotenv').config();
import cors from 'cors'
import express from 'express'
const app = express();
import { MongoClient, ObjectId } from 'mongodb'

interface User {
  username: string;
  log?: Exercise[];
}
interface UserDocument {
  _id: ObjectId;
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
  let date = req.body.date;

  if (!date) {
    date = new Date().toDateString()
  } else if(new Date(date).toDateString() === 'Invalid Date') {
    return res.json('invalid date')
  } else {
    date = new Date(date).toDateString()
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

app.get('/deprecated/api/users/:_id/logs', async (req, res) => {
  const id = req.params._id;
  const userToReturn = await users.findOne({_id: new ObjectId(id)});
  if (userToReturn) {
    return res.json({count: userToReturn.log?.length, ...userToReturn })
  } else {
    return res.json('invalid user');
  }
})

//route: api/users/:_id/logs?[from][&to][&limit]
app.get('/api/users/:_id/logs', async (req, res) => {
  const id = req.params._id;
  const fromDate = req.query.from?.toString();
  const toDate = req.query.to?.toString();
  const limit = Number(req.query.limit);

  if(fromDate && new Date(fromDate).toDateString() === 'Invalid Date') {
    return res.json('invalid from-date parameter')
  }
  if(toDate && new Date(toDate).toDateString() === 'Invalid Date') {
    return res.json('invalid to-date parameter')
  }
  if(limit && isNaN(limit)) {
    return res.json('invalid limit parameter')
  }

  const userToReturn : UserDocument | null = await users.findOne({_id: new ObjectId(id)});

  if(!userToReturn) {
    return res.json('user not founded')
  }  
  if (!userToReturn.log) {
    return res.json({count: 0, ...userToReturn })
  }

  let filteredLog = userToReturn.log;
  if (fromDate) {
    filteredLog = filteredLog.filter(l => new Date(l.date) >= new Date(fromDate))
  }
  if (toDate) {
    filteredLog = filteredLog.filter(l => new Date(l.date) <= new Date(toDate))
  }
  if (limit) {
    filteredLog = filteredLog.slice(0, limit);
  }

  return res.json({
    username: userToReturn.username,
    count: userToReturn.log.length,
    _id: userToReturn._id,
    log: filteredLog
  })
})

app.get('/api/users/:_id/logs?[from][&to][&limit]', async (req,res) => {
  const id = req.params._id;
  const fromDate = req.query.from?.toString();
  const toDate = req.query.to?.toString();
  const limit = Number(req.query.limit);
  if(!fromDate || new Date(fromDate).toDateString() === 'Invalid Date') {
    return res.json('invalid from-date parameter')
  }
  if(!toDate || new Date(toDate).toDateString() === 'Invalid Date') {
    return res.json('invalid to-date parameter')
  }
  if(isNaN(limit)) {
    return res.json('invalid limit parameter')
  }

  const userToReturn = await users.findOne({_id: new ObjectId(id)});
  
  if(!userToReturn) {
    return res.json('user not founded')
  }
  if (!userToReturn.log) {
    return res.json('user does not have any log')
  }

  const filteredLog = userToReturn.log.filter(l => new Date(l.date) >= new Date(fromDate) && 
                                                    new Date(l.date) <= new Date(toDate))
  return res.json({
    username: userToReturn.username,
    count: userToReturn.log.length,
    _id: userToReturn._id,
    log: filteredLog
  })
  

})

const port = process.env.PORT || 3333;
app.listen(port, () => {
  console.log('Your app is listening on port ' + port)
})
