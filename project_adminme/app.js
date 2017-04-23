const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const expressValidator = require('express-validator');
const mongojs = require('mongojs');
const db = mongojs('moviesDB', ['movies']);
const fs = require('fs');
const dateFormat = require('dateformat');

var app = express();

//View Wngine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname,'views'));
//Body Parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// Set static Path
app.use(express.static(path.join(__dirname, 'public')));

//Global vars
app.use(function(req, res, next){
	res.locals.errors = null;
	res.locals.yes_aded = 0;
	next();
})
;
//Epress Validaor Midleware
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

// Home page
app.get('/', function(req, res){
	db.movies.find(function (err, docs) {
		var mov = [];
		docs.forEach(function(docs){
			console.log(docs);
			var rating_aux = 0;
			if(docs.rating_num > 0){
				rating_aux = docs.rating_tot / docs.rating_num;
			}
			mov.push({
				id: docs._id,
				filename: docs.file_name,
				title: docs.title,
				description: docs.desc,
				realise: docs.realise.substring(0,10),
				rating: rating_aux.toString().substring(0,4)
			})
		});
		res.render('index',{
			movies: mov
		});	
	})
})

//Show movie
app.get('/showMovie/', function(req, res){
	db.movies.findOne({_id: mongojs.ObjectId(req.query.id)}, function(err, doc) {
		if(err){
			console.log(err);
		}
		var rating_aux = 0;
		if(doc.rating_num > 0){
				rating_aux = doc.rating_tot / doc.rating_num;
		}
		var movieData ={
			id: doc._id,
			title : doc.title,
			desc: doc.desc,
			realise: doc.realise.substring(0,10),
			rating: rating_aux.toString().substring(0,4),
			filename: doc.file_name 
		}
		res.render('showMovie',{
			movieData: movieData
		});
	});
})

// Page to add movie
app.get('/addMovie', function(req, res){
	res.render('addMovie');
})

//Add a movie
app.post('/upload',multer({ dest: './public/uploads/'}).single('upl'), function(req, res){

	req.checkBody('title', 'Title is required').notEmpty();
	req.checkBody('description', 'Description is required').notEmpty();

	// Because I don't finde a solution to check file, I made in this way
	var delete_file = '1';
	var movie_size = 1024 * 1024 * 50;
    if(req.file == undefined){
    	// Force add error
    	req.checkBody('', 'Selet a file').notEmpty();
    	delete_file = '0';
    } else if(req.file.mimetype != 'video/mp4') {
    	// Force add error
    	req.checkBody('', 'File type error. File shoulde be video/mp4').notEmpty();
    } else if(req.file.size > movie_size){
    	// Force add error
    	req.checkBody('', 'File is too big. Max size = 50 Mb').notEmpty();
    }

	var errors = req.validationErrors();

	if(errors){
		res.render('addMovie',{
			errors: errors
		});
		if(delete_file == '1') {
			console.log('Deleting file on path: ' + req.file.path);
			fs.unlink(req.file.path)
		}
		

	} else {
		res.locals.yes_aded = 1;
		res.render('addMovie');
    	console.log('Movie Aded');
    	res.status(204).end();

    	var newMovie = 
		{
			title: req.body.title,
			desc: req.body.description,
			rating_tot: 0,
			rating_num: 0,
			realise: dateFormat(Date(),"yyyy/mm/dd HH:mm:ss"),
			file_name: req.file.filename
		}
		db.movies.insert(newMovie, function(err, result){
			if(err){
				console.log(err);
				res.locals.yes_aded = 0;
				if(delete_file == '1') {
					console.log('Deleting file on path: ' + req.file.path);
					fs.unlink(req.file.path)
				}
			}
		});
	}    
});

app.get('/editMovie/', function(req, res){
	db.movies.findOne({_id: mongojs.ObjectId(req.query.id)}, function(err, doc){
		if(err){
			console.log(err)
		} else {
			res.locals.yes_aded = 0
			var movieEdit = {
				id: doc._id,
				title: doc.title,
				desc: doc.desc
			}
			res.render('editMovie',{
				movieEdit: movieEdit
			})
		}
	})
});

//Edit a movie
app.post('/edit',function(req, res){
	db.movies.findOne({_id: mongojs.ObjectId(req.body.id)}, function(err, doc) {
		if(err){
			console.log(err);
		} else {
			req.checkBody('title', 'Title is required').notEmpty();
			req.checkBody('description', 'Description is required').notEmpty();

			var errors = req.validationErrors();

			if(errors){
			var movieEdit = {
				id: doc._id,
				title: doc.title,
				desc: doc.desc
				}
			res.render('editMovie',{
				errors: errors,
				movieEdit: movieEdit
			});
			} else {
				db.movies.update({_id: mongojs.ObjectId(req.body.id)},{
					title: req.body.title,
					desc: req.body.description,
					rating_tot: doc.rating_tot,
					rating_num: doc.rating_num,
					realise: doc.realise,
					file_name: doc.file_name
					})
				var movieEdit = {
					id: doc._id,
					title: req.body.title,
					desc: req.body.description
					}
				res.locals.yes_aded = 1;
				res.render('editMovie',{
					movieEdit: movieEdit
				});
    			console.log('Movie Edited');
    			res.status(204).end();
				}
			}
	})
});

//Delete movie
app.delete('/delete/:id', function(req, res){
	var filename = '';
	db.movies.findOne({_id: mongojs.ObjectId(req.params.id)}, function(err, doc) {
					filename = doc.file_name;
				})
	db.movies.remove({_id: mongojs.ObjectId(req.params.id)}, function(err, result){
		if(err){
			console.log(err);
		} else {
			fs.unlink('./public/uploads/'+filename);
		}
	});
});

//Rate Movie
app.post('/vote',function(req, res){
	console.log(req.body);
	if(req.body.vote != ''){
		db.movies.findOne({_id: mongojs.ObjectId(req.body.id)}, function(err, doc) {
			if(err){
				console.log(err);
			} else {
				db.movies.update({_id: mongojs.ObjectId(req.body.id)},{
					title: doc.title,
					desc: doc.desc,
					rating_tot: parseInt(doc.rating_tot) + parseInt(req.body.vote),
					rating_num: doc.rating_num + 1,
					realise: doc.realise,
					file_name: doc.file_name
				})
				var rating_aux = (parseInt(doc.rating_tot) + parseInt(req.body.vote)) / (doc.rating_num + 1);
				var movieData ={
					id: doc._id,
					title : doc.title,
					desc: doc.desc,
					realise: doc.realise.substring(0,10),
					rating: rating_aux.toString().substring(0,4),
					filename: doc.file_name 
				}
				res.render("showMovie",{
					movieData: movieData
				})
			}
		});
	}
});


app.listen(3000, function() {
	console.log('Server Started on Port 3000...');
})