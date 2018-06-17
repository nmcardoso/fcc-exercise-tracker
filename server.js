const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const UserModel = require('./models/User');
const ExerciseModel = require('./models/Exercise');

// Based on: https://github.com/gothinkster/node-express-realworld-example-app

mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track');

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/exercise/new-user', (req, res, next) => {
  // Middleware: verify if user is already registered
  const username = req.body.username;
  UserModel.find({ username }).count((err, data) => {
    if (err) {
      res.type('text').send(err);
    }
    
    console.log(data);
    
    if (data > 0) res.type('text').send('User already registered');
    else next();
  });
}, (req, res) => {
  // Insert new user in database
  const username = req.body.username;
  
  const newUser = new UserModel({ username });
  newUser.save((err, data) => {
    if (err) res.type('text').send(err);
    
    res.json({
      username: data.username,
      _id: data._id
    });
  });
});

app.post('/api/exercise/add', (req, res, next) => {
  // Middleware: validate form data
  const done = (err, count) => {
    let errorMessage = null;
    
    if (!req.body.userId) errorMessage = 'Unknow id';
    else if (count == 0) errorMessage = 'Invalid user id';
    else if (!req.body.description) errorMessage = 'Unknow description';
    else if (!req.body.duration) errorMessage = 'Unknow duration';
    else if (isNaN(req.body.duration)) errorMessage = 'Invalid duration';
    else if (req.body.date && isNaN(Date.parse(req.body.date))) errorMessage = 'Invalid date';
    
    if (!errorMessage) next();
    else res.type('text').send(errorMessage);
  };
  
  UserModel.find({ _id: req.body.userId }).count(done);
}, (req, res) => {
  const exercise = new ExerciseModel({
    user: req.body.userId,
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date ? new Date(req.body.date) : new Date()
  });
  
  exercise.save((err, data) => {
    if (err) console.log(err);
    else {
      UserModel.findOne({ _id: data.user }, (err, userData) => {
        res.json({
          username: userData.username,
          description: data.description,
          duration: data.duration,
          _id: data._id,
          date: data.date.toDateString()
        });
      });
    }
  });
});

app.get('/api/exercise/log', (req, res, next) => {
  const done = (err, count) => {
    let errMessage = null;
    
    if (count == 0) errMessage = 'Invalid user ID';
    else if (req.query.limit && isNaN(req.query.limit)) errMessage = 'Invalid limit';
    else if (req.query.to && isNaN(new Date(req.query.to)) ||
             req.query.from && isNaN(new Date(req.query.from)))
      errMessage = 'Invalid date';
    
    if (!errMessage) next();
    else res.type('text').send(errMessage);
  };
  
  UserModel.find({ _id: req.query.userId }).count(done);
}, (req, res) => {
  const query = {
    user: req.query.userId
  };
  
  if (req.query.from || req.query.to) query.date = {};
  if (req.query.from) query.date.$gt = req.query.from;
  if (req.query.to) query.date.$lt = req.query.to;
  
  const done = (err, exercise) => {
    if (err) {
      console.log(err);
      return;
    }
    
    if (exercise.length > 0) {
      const log = [];
      for (let i = 0; i < exercise.length; i++) {
        log.push({
          description: exercise[i].description,
          duration: exercise[i].duration,
          date: exercise[i].date.toDateString()
        });
      }
      
      const r = {
        _id: exercise[0].user._id,
        username: exercise[0].user.username,
        count: exercise.length,
        log: log
      };
      
      res.json(r);
    }
  };
  
  ExerciseModel.find(query)
    .limit(req.query.limit || 0)
    .populate('user')
    .exec(done);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
