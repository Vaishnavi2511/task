var express = require('express')
var app = express()
app.set("view engine", "ejs")
app.use(express.static('public'))
var fs = require('fs')
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/newdb', { useNewUrlParser: true });
var session = require('express-session')
var _ = require("lodash")
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const crypto = require('crypto');

var bodyParser = require("body-parser")
// var jsonParser = bodyParser.json()
var urlencodedParser = bodyParser.urlencoded({ extended: false })
const nodemailer = require('nodemailer');


app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 1160000 } }))
const secret = 'abcdefg';
const clogSchema = new Schema({
    heading: String,
    name: String,
    content: String,
    image: String,
    postedBy: ObjectId
});

const clogModel = mongoose.model("Clog", clogSchema)
const regSchema = new Schema({
    name: String,
    email:{
        type: String,
        unique: true,
        required: true
    },
    password: String
});
const regModel = mongoose.model("regr", regSchema)
var multer = require('multer')

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads')
    },
    filename: function (req, file, cb) {
        // should be a very very random string
        let ext = file.originalname.split('.')[1]
        let filename = file.fieldname + '-' + Date.now() + '.' + ext
        cb(null, filename)
    }
})


var singleupload = multer({ storage: storage }).single('file')



app.get('/', (req, res) => {
    clogModel.find({}, (err, docs) => {
        res.render('front', { user: req.session.user, blogs: docs })
    })
})

app.get('/404', (req, res) => {
    res.send("404 error")
})
const checkLogIn = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/')
    }
}
app.get('/login', (req, res) => {
    res.render('login')
})
app.post('/login', urlencodedParser, (req, res) => {
    switch (req.body.action) {
        case 'signup':
            regModel.findOne({ email: req.body.email }, function (err, doc) {
                if (err) {
                    console.log(err, 'error')
                    res.redirect('/')
                    return
                }
                if (_.isEmpty(doc)) {
                    let newreg = new regModel();
                    newreg.name = req.body.name;
                    newreg.email = req.body.email;
                    newreg.password = req.body.password;
                    newreg.save(function (err) {
                        if (err) {
                            console.log(err, 'error')
                            return
                        }
                        res.render('login', { message: "Sign Up Successful. Please log in." })
                    });

                } else {
                    res.render('login', { message: "User already exists" })
                }
            })
            break;
        case 'login':
            regModel.findOne({ email: req.body.email, password: req.body.password }, function (err, doc) {
                if (err) {
                    console.log(err, 'error')
                    res.redirect('/')
                    return
                }
                if (_.isEmpty(doc)) {
                    res.render('login', { message: "Please check email/password" })
                } else {
                    req.session.user = doc
                    res.redirect('/user/dashboard')
                }
            })
            break;
    }
})
app.get('/user/dashboard', checkLogIn, (req, res) => {
    clogModel.find({ postedBy: req.session.user._id }, (err, docs) => {
        res.render('user', { user: req.session.user, blogs: docs })
    })
})

app.post('/user/dashboard', urlencodedParser, singleupload, checkLogIn, (req, res) => {
    let newClog = new clogModel()
    newClog.heading = req.body.heading
    newClog.content = req.body.content
    newClog.name = req.session.user.name
    newClog.image = req.file.filename
    newClog.postedBy = req.session.user._id
    newClog.save(function (err) {
        res.redirect("/user/dashboard")
    })
})


app.get('/edit', (req, res) => {
    res.render('edit')
})
app.post('/edit', urlencodedParser, singleupload,checkLogIn, (req, res) => {
    clogModel.findOne({ heading: req.body.heading }, function (err, doc) {
        if (err) {
            console.log(err, 'error')
            res.redirect('/')
            return
        }
        if (_.isEmpty(doc)) {
            res.render('edit', { message: "Please check heading" })
        }
        else {
            doc.content = req.body.content
            doc.image = req.file.filename
            doc.save()
        }
    })
})
app.get('/delete',(req, res) => {
    res.render('delete')
})
app.post('/delete', urlencodedParser, checkLogIn, (req, res) => {
    clogModel.deleteOne({heading:req.body.heading}, function (err) {
        if (err) {
            console.log(err, 'error')
            return
        }
        res.redirect('/')
    });
})
app.listen(3000)
